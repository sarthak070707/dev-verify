import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Parse a stored githubRepo value into { owner, repo }.
 * Accepts:
 *   - "owner/repo"
 *   - "https://github.com/owner/repo"
 *   - "https://github.com/owner/repo.git"
 *   - "git@github.com:owner/repo.git"
 * Returns null if it can't be parsed.
 */
function parseRepo(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  let s = input.trim();

  // Strip protocol + host variants
  s = s
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/g, "");

  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

/**
 * A GitHub token is only attached if it looks like a real one.
 * This avoids sending obvious placeholders (e.g. seed/demo tokens),
 * which would make GitHub reject every request with 401.
 */
function isPlausibleToken(token?: string | null): token is string {
  if (!token) return false;
  return /^(ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})$/.test(token.trim());
}

function detectLanguage(filePath: string): string {
  if (filePath.endsWith(".tsx")) return "TypeScript React";
  if (filePath.endsWith(".ts")) return "TypeScript";
  if (filePath.endsWith(".jsx")) return "JavaScript React";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "JavaScript";
  if (filePath.endsWith(".prisma")) return "Prisma Schema";
  if (filePath.endsWith(".py")) return "Python";
  if (filePath.endsWith(".go")) return "Go";
  if (filePath.endsWith(".rs")) return "Rust";
  if (filePath.endsWith(".java")) return "Java";
  if (filePath.endsWith(".json")) return "JSON";
  if (filePath.endsWith(".css")) return "CSS";
  return "Plain Text";
}

const MAX_SNIPPET_CHARS = 20_000; // keep the UI/highlighter responsive on big files

async function fetchFileFromGitHub(
  owner: string,
  repo: string,
  filePath: string,
  token?: string | null
): Promise<{ ok: true; content: string } | { ok: false; status: number; reason: string }> {
  const cleanPath = filePath.replace(/^\/+/, "");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    // GitHub requires a User-Agent on all API requests.
    "User-Agent": "DevVerify",
  };
  if (isPlausibleToken(token)) headers.Authorization = `Bearer ${token.trim()}`;

  let res: Response;
  try {
    res = await fetch(url, { headers, cache: "no-store" });
  } catch {
    return { ok: false, status: 0, reason: "Could not reach GitHub. Check your network connection." };
  }

  if (res.status === 404) {
    return { ok: false, status: 404, reason: `File not found: ${owner}/${repo}/${cleanPath}. Check the repo name, file path, and that the repo is public (or provide a token).` };
  }
  if (res.status === 401) {
    return { ok: false, status: 401, reason: "GitHub rejected the token. The stored githubToken is invalid or expired." };
  }
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      return { ok: false, status: 403, reason: "GitHub API rate limit exceeded. Add a personal access token to raise the limit." };
    }
    return { ok: false, status: 403, reason: "Access forbidden. The repo may be private — add a token with repo access." };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, reason: `GitHub returned an unexpected status (${res.status}).` };
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return { ok: false, status: 422, reason: "The path points to a directory, not a file. Specify a file path." };
  }
  if (data.type !== "file") {
    return { ok: false, status: 422, reason: `Expected a file but got "${data.type}".` };
  }

  // Files <= 1MB come back base64-encoded inline. Larger files have empty
  // content and must be pulled from download_url.
  let content = "";
  if (data.content && data.encoding === "base64") {
    content = Buffer.from(data.content, "base64").toString("utf-8");
  } else if (data.download_url) {
    try {
      const raw = await fetch(data.download_url, { headers: { "User-Agent": "DevVerify" }, cache: "no-store" });
      if (!raw.ok) return { ok: false, status: raw.status, reason: "Failed to download the file contents." };
      content = await raw.text();
    } catch {
      return { ok: false, status: 0, reason: "Failed to download the file contents." };
    }
  } else {
    return { ok: false, status: 422, reason: "File has no readable content." };
  }

  return { ok: true, content };
}

function buildAnalysis(filePath: string, content: string) {
  const lineCount = content.split("\n").length;
  const snippet = content.length > MAX_SNIPPET_CHARS
    ? content.slice(0, MAX_SNIPPET_CHARS) + "\n\n/* ...truncated for display... */"
    : content;

  return {
    linesOfCode: `${lineCount} lines`,
    complexity: lineCount > 200 ? "Advanced" : lineCount > 60 ? "Intermediate" : "Basic",
    language: detectLanguage(filePath),
    codeSnippet: snippet,
    verifiedAt: new Date().toISOString(),
    metrics: {
      functions: (content.match(/\bfunction\b|=>|\bdef\b|\bfunc\b/g) || []).length,
      imports: (content.match(/^\s*(import|from|require|use)\b/gm) || []).length,
      errorHandling: (content.match(/\btry\b|\bcatch\b|\bexcept\b|Error|err\b/g) || []).length,
    },
  };
}

export async function POST(request: NextRequest) {
  let claimId: string | undefined;
  try {
    const body = await request.json();
    claimId = body.claimId;

    if (!claimId) {
      return NextResponse.json({ error: "Missing required field: claimId" }, { status: 400 });
    }

    const claim = await db.resumeClaim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        status: true,
        filePath: true,
        githubRepo: true, // <-- now actually used
        user: { select: { githubToken: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    if (claim.status === "VERIFIED") {
      return NextResponse.json({ error: "Claim is already verified" }, { status: 409 });
    }

    const parsed = parseRepo(claim.githubRepo);
    if (!parsed) {
      await db.resumeClaim.update({
        where: { id: claimId },
        data: { status: "FAILED", analysisResult: { error: `Invalid repository reference: "${claim.githubRepo}"` } },
      });
      return NextResponse.json(
        { error: `Invalid repository reference: "${claim.githubRepo}"` },
        { status: 422 }
      );
    }

    // Prefer the user's own token; otherwise fall back to a shared token
    // stored as the GITHUB_TOKEN environment variable (e.g. set in Vercel).
    const token = claim.user?.githubToken || process.env.GITHUB_TOKEN;
    const result = await fetchFileFromGitHub(parsed.owner, parsed.repo, claim.filePath, token);

    if (!result.ok) {
      // Record the failure honestly instead of faking a VERIFIED result.
      await db.resumeClaim.update({
        where: { id: claimId },
        data: { status: "FAILED", analysisResult: { error: result.reason } },
      });
      return NextResponse.json({ error: result.reason }, { status: result.status || 502 });
    }

    const analysisResult = buildAnalysis(claim.filePath, result.content);

    const updatedClaim = await db.resumeClaim.update({
      where: { id: claimId },
      data: { status: "VERIFIED", analysisResult },
      select: {
        id: true,
        userId: true,
        bulletText: true,
        githubRepo: true,
        filePath: true,
        status: true,
        analysisResult: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ claim: updatedClaim });
  } catch (error) {
    console.error("Error processing verification:", error);
    if (claimId) {
      try {
        await db.resumeClaim.update({
          where: { id: claimId },
          data: { status: "FAILED", analysisResult: { error: "Internal server error during verification." } },
        });
      } catch { /* ignore secondary failure */ }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
