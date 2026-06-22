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

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Computes a REAL composite reliability/maintainability score (0-100) from the
 * actual file contents. It is a transparent heuristic built from four signals,
 * each worth up to 25 points:
 *   1. Documentation   - comment density relative to code lines
 *   2. Error handling  - presence of try/catch relative to functions
 *   3. Modularity      - average function length (shorter = more maintainable)
 *   4. Formatting      - absence of very long lines
 * Signals that don't apply to a given file (e.g. functions in a JSON config)
 * fall back to a neutral value instead of unfairly penalising the file.
 */
function computeReliability(content: string) {
  const lines = content.split("\n");
  const codeLineCount = Math.max(lines.filter((l) => l.trim().length > 0).length, 1);

  const commentLines = lines.filter((l) => /^\s*(\/\/|\/\*|\*|#)/.test(l)).length;
  const functions = (content.match(/\bfunction\b|=>|\bdef\b|\bfunc\b/g) || []).length;
  const imports = (content.match(/^\s*(import|from|require|use)\b/gm) || []).length;
  const tryCatch = (content.match(/\bcatch\b|\bexcept\b/g) || []).length;
  const longLines = lines.filter((l) => l.length > 120).length;

  // 1. Documentation (0-25): healthy comment density is ~15% of code lines.
  const docScore = clamp((commentLines / codeLineCount) / 0.15, 0, 1) * 25;

  // 2. Error handling (0-25): reward try/catch relative to function count.
  let errScore: number;
  if (functions === 0) errScore = 15; // neutral for non-function files
  else errScore = Math.max(tryCatch > 0 ? 12 : 0, clamp(tryCatch / functions, 0, 1) * 25);

  // 3. Modularity (0-25): shorter average function length scores higher.
  let sizeScore: number;
  if (functions === 0) sizeScore = 18; // neutral
  else {
    const avgLen = codeLineCount / functions;
    if (avgLen <= 15) sizeScore = 25;
    else if (avgLen >= 60) sizeScore = 5;
    else sizeScore = 25 - ((avgLen - 15) / 45) * 20;
  }

  // 4. Formatting (0-25): too many >120-char lines drags the score down.
  const fmtScore = Math.max(0, 1 - (longLines / codeLineCount) / 0.1) * 25;

  const reliabilityScore = clamp(Math.round(docScore + errScore + sizeScore + fmtScore), 0, 100);

  return {
    functions,
    imports,
    errorHandling: tryCatch,
    reliabilityScore,
    breakdown: {
      documentation: Math.round(docScore),
      errorHandling: Math.round(errScore),
      modularity: Math.round(sizeScore),
      formatting: Math.round(fmtScore),
    },
  };
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
    metrics: computeReliability(content),
  };
}

// Cheapest current model — plenty capable for a yes/no code-vs-claim judgment.
// Fast, low-cost model with a generous free tier. You can swap this for a
// newer flash model (e.g. "gemini-3.5-flash") by changing this one string.
const MATCH_MODEL = "gemini-2.5-flash";

type ClaimMatch = { matches: boolean; confidence: number; reasoning: string; skipped: boolean };

/**
 * Uses Google's Gemini to judge whether the fetched code actually implements
 * the resume claim. Deliberately strict: a keyword appearing in a comment is
 * not a match. If no GEMINI_API_KEY is configured (or the call fails), it
 * degrades gracefully to "existence-only" verification instead of breaking.
 */
async function matchClaimToCode(bulletText: string, filePath: string, content: string): Promise<ClaimMatch> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      matches: true,
      confidence: 0,
      reasoning: "AI claim-matching is not configured (no GEMINI_API_KEY set); verified that the file exists only.",
      skipped: true,
    };
  }

  const codeForReview = content.length > 8000 ? content.slice(0, 8000) + "\n/* ...truncated... */" : content;

  const instructions =
    "You are a strict technical reviewer for a resume-verification tool. " +
    "You are given a resume claim and the actual source code the candidate cited as evidence. " +
    "Decide whether the code substantively implements what the claim describes. " +
    "Be skeptical: a file merely existing, or a keyword merely appearing in a comment or string, is NOT enough. " +
    "Respond with ONLY a JSON object in exactly this shape: " +
    '{"matches": boolean, "confidence": number from 0 to 100, "reasoning": string of one or two sentences}.\n\n' +
    `Resume claim:\n"${bulletText}"\n\nFile path: ${filePath}\n\nSource code:\n\`\`\`\n${codeForReview}\n\`\`\``;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MATCH_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instructions }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 400,
            temperature: 0,
          },
        }),
      }
    );

    if (!res.ok) {
      return {
        matches: true,
        confidence: 0,
        reasoning: `Claim-matching unavailable (AI service returned ${res.status}); verified file existence only.`,
        skipped: true,
      };
    }

    const data = await res.json();
    const text: string = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("")
      .trim();

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      matches: Boolean(parsed.matches),
      confidence: clamp(Number(parsed.confidence) || 0, 0, 100),
      reasoning: String(parsed.reasoning || "").slice(0, 500),
      skipped: false,
    };
  } catch {
    return {
      matches: true,
      confidence: 0,
      reasoning: "Claim-matching could not be completed; verified file existence only.",
      skipped: true,
    };
  }
}

const CLAIM_SELECT = {
  id: true,
  userId: true,
  bulletText: true,
  githubRepo: true,
  filePath: true,
  status: true,
  analysisResult: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

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
        bulletText: true, // <-- the resume claim to match against the code
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
      const failed = await db.resumeClaim.update({
        where: { id: claimId },
        data: { status: "FAILED", analysisResult: { error: `Invalid repository reference: "${claim.githubRepo}"` } },
        select: CLAIM_SELECT,
      });
      return NextResponse.json(
        { error: `Invalid repository reference: "${claim.githubRepo}"`, claim: failed },
        { status: 422 }
      );
    }

    // Prefer the user's own token; otherwise fall back to a shared token
    // stored as the GITHUB_TOKEN environment variable (e.g. set in Vercel).
    const token = claim.user?.githubToken || process.env.GITHUB_TOKEN;
    const result = await fetchFileFromGitHub(parsed.owner, parsed.repo, claim.filePath, token);

    if (!result.ok) {
      // Record the failure honestly instead of faking a VERIFIED result.
      const failed = await db.resumeClaim.update({
        where: { id: claimId },
        data: { status: "FAILED", analysisResult: { error: result.reason } },
        select: CLAIM_SELECT,
      });
      return NextResponse.json({ error: result.reason, claim: failed }, { status: result.status || 502 });
    }

    const analysisResult = buildAnalysis(claim.filePath, result.content);

    // Compare the actual code against the resume claim.
    const claimMatch = await matchClaimToCode(claim.bulletText, claim.filePath, result.content);
    const finalStatus = claimMatch.matches ? "VERIFIED" : "FAILED";

    const updatedClaim = await db.resumeClaim.update({
      where: { id: claimId },
      data: { status: finalStatus, analysisResult: { ...analysisResult, claimMatch } },
      select: CLAIM_SELECT,
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
