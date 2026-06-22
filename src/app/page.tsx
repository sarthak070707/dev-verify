"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  ShieldCheck,
  GitBranch,
  FileCode2,
  Loader2,
  CheckCircle2,
  Zap,
  Github,
  ChevronRight,
  Plus,
  Terminal,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ──────────────── Types ──────────────── */

interface AnalysisResult {
  linesOfCode: string;
  complexity: string;
  language: string;
  codeSnippet: string;
  verifiedAt: string;
  metrics: {
    functions: number;
    imports: number;
    errorHandling: number;
    reliabilityScore?: number;
    breakdown?: { documentation: number; errorHandling: number; modularity: number; formatting: number };
  };
  claimMatch?: { matches: boolean; confidence: number; reasoning: string; skipped: boolean };
}

interface Claim {
  id: string;
  userId: string;
  bulletText: string;
  githubRepo: string;
  filePath: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  analysisResult: AnalysisResult | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  claims: Claim[];
}

/* ──────────────── Design tokens ────────────────
   Warm "notary / audit" palette. Gold is the single signature accent,
   used only for the brand mark, primary actions, and the authenticity stamp.
   Everything else stays quiet: warm ink surfaces, hairline borders, mono labels. */

const PANEL = "bg-[#1A1611] border border-[#2C2519] rounded-lg";
const LABEL = "font-mono text-[10px] uppercase tracking-[0.18em] text-[#8C8475]";

/* ──────────────── Progress ring (flat, no glow) ──────────────── */

function ProgressRing({ value, size = 104, stroke = 5 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 100 ? "#74A36B" : value > 0 ? "#D9A441" : "#3A3122";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#241F16" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[#ECE6D8] font-semibold text-xl tabular-nums">{value}%</span>
        <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-[#8C8475] mt-0.5">verified</span>
      </div>
    </div>
  );
}

/* ──────────────── Authenticity stamp (the signature element) ──────────────── */

function Stamp() {
  return (
    <div className="-rotate-[7deg] select-none border-[1.5px] border-dashed border-[#D9A441] text-[#D9A441] rounded-md px-3 py-1.5 flex items-center gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Authentic</span>
    </div>
  );
}

/* ──────────────── Empty-state seal ──────────────── */

function VerificationSeal() {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-dashed border-[#D9A441]/30" />
      <div className="absolute inset-3 rounded-full border border-[#2C2519]" />
      <ShieldCheck className="h-9 w-9 text-[#D9A441]/70" strokeWidth={1.5} />
    </div>
  );
}

/* ──────────────── Syntax theme (warm) ──────────────── */

const codeTheme: Record<string, React.CSSProperties> = {
  ...atomOneDark,
  'pre[class*="language-"]': { ...atomOneDark['pre[class*="language-"]'], background: "transparent", margin: 0 },
  'code[class*="language-"]': { ...atomOneDark['code[class*="language-"]'], background: "transparent" },
  comment: { color: "#6E675B", fontStyle: "italic" },
  prolog: { color: "#6E675B" },
  punctuation: { color: "#9A9183" },
  property: { color: "#C99A4E" },
  keyword: { color: "#C99A4E" },
  tag: { color: "#C99A4E" },
  boolean: { color: "#C56B4F" },
  number: { color: "#C56B4F" },
  constant: { color: "#C56B4F" },
  symbol: { color: "#C56B4F" },
  selector: { color: "#9CA36B" },
  "attr-name": { color: "#C99A4E" },
  string: { color: "#9CA36B" },
  char: { color: "#9CA36B" },
  builtin: { color: "#C99A4E" },
  operator: { color: "#9A9183" },
  atrule: { color: "#C99A4E" },
  "attr-value": { color: "#9CA36B" },
  function: { color: "#D9A441" },
  "class-name": { color: "#D9A441" },
  regex: { color: "#9CA36B" },
  variable: { color: "#ECE6D8" },
};

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */

export default function DevVerifyDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBulletText, setNewBulletText] = useState("");
  const [newGithubRepo, setNewGithubRepo] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeClaim = claims.find((c) => c.id === activeClaimId) || null;

  const verificationProgress = useMemo(() => {
    if (claims.length === 0) return 0;
    return Math.round((claims.filter((c) => c.status === "VERIFIED").length / claims.length) * 100);
  }, [claims]);

  const fetchData = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/claims/list?userId=${userId}`);
      const data = await res.json();
      if (data.claims) setClaims(data.claims);
    } catch (err) { console.error("Error fetching claims:", err); }
  }, []);

  const seedAndLoad = useCallback(async () => {
    setIsSeeding(true);
    try {
      const seedRes = await fetch("/api/seed", { method: "POST" });
      const seedData = await seedRes.json();
      if (seedData.user) { setUser(seedData.user); await fetchData(seedData.user.id); }
    } catch (err) { console.error("Error seeding data:", err); }
    finally { setIsSeeding(false); }
  }, [fetchData]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/users?userId=demo");
        if (res.ok) { const data = await res.json(); if (data.user) { setUser(data.user); await fetchData(data.user.id); setIsLoading(false); return; } }
        await seedAndLoad();
      } catch { await seedAndLoad(); }
      finally { setIsLoading(false); }
    }
    init();
  }, [fetchData, seedAndLoad]);

  const handleVerify = async (claimId: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/verify/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimId }) });
      const data = await res.json();
      if (data.claim) setClaims((prev) => prev.map((c) => (c.id === claimId ? data.claim : c)));
    } catch (err) { console.error("Error verifying claim:", err); }
    finally { setIsVerifying(false); }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBulletText || !newGithubRepo || !newFilePath) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/claims/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          bulletText: newBulletText,
          githubRepo: newGithubRepo,
          filePath: newFilePath,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.claim) {
          setClaims((prev) => [data.claim, ...prev]);
          setActiveClaimId(data.claim.id);
          setIsAddOpen(false);
          setNewBulletText("");
          setNewGithubRepo("");
          setNewFilePath("");
        }
      } else {
        console.error("Failed to add claim");
      }
    } catch (err) {
      console.error("Error creating claim:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiedCount = claims.filter((c) => c.status === "VERIFIED").length;
  const pendingCount = claims.filter((c) => c.status === "PENDING").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED": return { dot: "bg-[#74A36B]", text: "text-[#74A36B]" };
      case "PENDING": return { dot: "bg-[#C99A4E]", text: "text-[#C99A4E]" };
      case "FAILED": return { dot: "bg-[#C56B4F]", text: "text-[#C56B4F]" };
      default: return { dot: "bg-[#C99A4E]", text: "text-[#C99A4E]" };
    }
  };

  /* ──────── Loading ──────── */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#100D0A] flex items-center justify-center">
        <div className="h-12 w-12 rounded-lg bg-[#1A1611] border border-[#2C2519] flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-[#D9A441] animate-spin" />
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-[#100D0A] flex flex-col text-[#ECE6D8]">

      {/* ── Header ── */}
      <header className="border-b border-[#2C2519] bg-[#100D0A] sticky top-0 z-50">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#1A1611] border border-[#3A3122] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[#D9A441]" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[#ECE6D8] font-semibold text-sm tracking-[0.02em]">DevVerify</span>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#8C8475] hidden sm:inline">
                Code Evidence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1A1611] border border-[#2C2519]">
              <div className={`h-1.5 w-1.5 rounded-full ${verifiedCount > 0 ? "bg-[#74A36B]" : "bg-[#3A3122]"}`} />
              <span className="font-mono text-[11px] text-[#9A9183] tabular-nums">{verifiedCount}/{claims.length}</span>
            </div>
            <Button
              size="sm"
              className="bg-[#D9A441] text-[#1A1611] hover:bg-[#E4B254] border-0 gap-1.5 text-[11px] h-7 font-medium rounded-md"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Add claim
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#3A3122] bg-transparent text-[#9A9183] hover:bg-[#1A1611] hover:text-[#ECE6D8] gap-1.5 text-[11px] h-7 rounded-md"
              onClick={seedAndLoad}
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">

          {/* ═══════════════ LEFT COLUMN ═══════════════ */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3 lg:h-[calc(100vh-8rem)]">

            {/* ── Profile Card ── */}
            <div className={`flex-none ${PANEL} p-5`}>
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-md bg-[#241F16] border border-[#3A3122] flex items-center justify-center text-[#D9A441] font-semibold text-sm shrink-0">
                  {user?.name?.charAt(0) || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[#ECE6D8] font-semibold text-sm truncate">
                    {user?.name || "Sarthak Arya"}
                  </h2>
                  <p className="text-[#9A9183] text-xs mt-0.5">Full-Stack Developer</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Github className="h-3 w-3 text-[#6E675B]" />
                    <span className="text-[#8C8475] text-[10px] font-mono truncate">
                      {user?.email || "sarthak@devverify.io"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#2C2519]">
                <div>
                  <div className="text-[#ECE6D8] font-semibold text-base tabular-nums">{claims.length}</div>
                  <div className={`${LABEL} mt-0.5`}>Claims</div>
                </div>
                <div>
                  <div className="text-[#74A36B] font-semibold text-base tabular-nums">{verifiedCount}</div>
                  <div className={`${LABEL} mt-0.5`}>Verified</div>
                </div>
                <div>
                  <div className="text-[#C99A4E] font-semibold text-base tabular-nums">{pendingCount}</div>
                  <div className={`${LABEL} mt-0.5`}>Pending</div>
                </div>
              </div>
            </div>

            {/* ── Claims Label ── */}
            <div className="flex-none flex items-center justify-between px-1 pt-1">
              <span className={LABEL}>Resume claims</span>
              <span className="font-mono text-[10px] text-[#6E675B] tabular-nums">{claims.length}</span>
            </div>

            {/* ── Claims List ── */}
            <ScrollArea className="flex-grow min-h-0">
              <div className="flex flex-col gap-2 pr-0.5">
                <AnimatePresence mode="popLayout">
                  {claims.map((claim) => {
                    const isSelected = activeClaimId === claim.id;
                    const sc = getStatusColor(claim.status);
                    return (
                      <motion.div
                        key={claim.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
                        <button
                          onClick={() => setActiveClaimId(claim.id)}
                          className={`w-full text-left rounded-lg border p-3.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D9A441]/50 ${isSelected
                            ? "bg-[#1F1A12] border-[#3A3122] border-l-2 border-l-[#D9A441]"
                            : "bg-[#161310] border-[#2C2519] hover:bg-[#1A1611]"
                            }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug line-clamp-2 ${isSelected ? "text-[#ECE6D8]" : "text-[#9A9183]"}`}>
                                {claim.bulletText}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <GitBranch className="h-2.5 w-2.5 text-[#6E675B]" />
                                <span className="text-[10px] font-mono text-[#8C8475] truncate max-w-[100px]">{claim.githubRepo}</span>
                                <span className="text-[10px] font-mono text-[#6E675B] truncate">{claim.filePath}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2">
                                <div className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                <span className={`font-mono text-[9px] uppercase tracking-[0.15em] ${sc.text}`}>{claim.status}</span>
                              </div>
                            </div>
                            <ChevronRight className={`h-3.5 w-3.5 mt-1 shrink-0 ${isSelected ? "text-[#D9A441]" : "text-[#3A3122]"}`} />
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
          <div className="lg:col-span-8 xl:col-span-9 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <AnimatePresence mode="wait">
              {!activeClaim ? (
                /* ── Empty State ── */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`h-full min-h-[70vh] lg:min-h-[calc(100vh-8rem)] ${PANEL} flex flex-col items-center justify-center p-8`}
                >
                  <VerificationSeal />
                  <h3 className="text-[#ECE6D8] font-semibold text-sm mt-6">
                    Select a claim to verify
                  </h3>
                  <p className="text-[#9A9183] text-xs mt-2 text-center max-w-xs leading-relaxed">
                    Choose a resume claim from the left to fetch its code and check whether the evidence holds up.
                  </p>
                </motion.div>
              ) : (
                /* ── Detail Grid ── */
                <motion.div
                  key={activeClaim.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4"
                >
                  {/* ─── Box A: Claim Detail ─── */}
                  <div className={`md:col-span-12 ${PANEL} p-5 sm:p-6 relative overflow-hidden`}>
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#D9A441]" />
                    <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(activeClaim.status).dot}`} />
                            <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${getStatusColor(activeClaim.status).text}`}>
                              {activeClaim.status}
                            </span>
                          </div>
                          <span className="text-[#3A3122]">/</span>
                          <span className="text-[10px] font-mono text-[#8C8475]">
                            <GitBranch className="h-2.5 w-2.5 inline mr-0.5" />{activeClaim.githubRepo}
                          </span>
                          <span className="text-[#3A3122]">/</span>
                          <span className="text-[10px] font-mono text-[#6E675B]">
                            <FileCode2 className="h-2.5 w-2.5 inline mr-0.5" />{activeClaim.filePath}
                          </span>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={activeClaim.bulletText}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="text-[#ECE6D8] text-[15px] leading-relaxed font-medium"
                          >
                            {activeClaim.bulletText}
                          </motion.p>
                        </AnimatePresence>
                        {activeClaim.analysisResult?.claimMatch && (
                          <div className={`mt-4 rounded-md px-3.5 py-2.5 text-[11px] leading-relaxed border ${
                            activeClaim.analysisResult.claimMatch.skipped
                              ? "border-[#2C2519] bg-[#14110D] text-[#9A9183]"
                              : activeClaim.analysisResult.claimMatch.matches
                                ? "border-[#74A36B]/30 bg-[#74A36B]/10 text-[#A9C79F]"
                                : "border-[#C56B4F]/30 bg-[#C56B4F]/10 text-[#E0A88F]"
                          }`}>
                            <span className="font-mono uppercase tracking-[0.15em] text-[10px] mr-2">
                              {activeClaim.analysisResult.claimMatch.skipped
                                ? "Claim match · skipped"
                                : activeClaim.analysisResult.claimMatch.matches
                                  ? `Claim match · ${activeClaim.analysisResult.claimMatch.confidence}%`
                                  : `No match · ${activeClaim.analysisResult.claimMatch.confidence}%`}
                            </span>
                            {activeClaim.analysisResult.claimMatch.reasoning}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {(activeClaim.status === "PENDING" || activeClaim.status === "FAILED") && (
                          <Button
                            onClick={() => handleVerify(activeClaim.id)}
                            disabled={isVerifying}
                            className="bg-[#D9A441] text-[#1A1611] hover:bg-[#E4B254] border-0 gap-1.5 h-8 text-[11px] font-medium rounded-md"
                          >
                            {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            {isVerifying ? "Verifying…" : activeClaim.status === "FAILED" ? "Retry" : "Verify claim"}
                          </Button>
                        )}
                        {activeClaim.status === "VERIFIED" && <Stamp />}
                      </div>
                    </div>
                  </div>

                  {/* ─── Box B: Progress Ring ─── */}
                  <div className={`md:col-span-4 ${PANEL} p-5 flex flex-col items-center justify-center`}>
                    <span className={`${LABEL} mb-4`}>Overall progress</span>
                    <ProgressRing value={verificationProgress} />
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#74A36B]" />
                        <span className="font-mono text-[10px] text-[#9A9183]">{verifiedCount} verified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#C99A4E]" />
                        <span className="font-mono text-[10px] text-[#9A9183]">{pendingCount} pending</span>
                      </div>
                    </div>
                  </div>

                  {/* ─── Box C: Metrics ─── */}
                  <div className={`md:col-span-8 ${PANEL} p-5`}>
                    <span className={LABEL}>Code metrics</span>
                    {activeClaim.analysisResult ? (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-4">
                        {[
                          { label: "Lines", value: activeClaim.analysisResult.linesOfCode },
                          { label: "Complexity", value: activeClaim.analysisResult.complexity },
                          { label: "Language", value: activeClaim.analysisResult.language },
                          { label: "Functions", value: String(activeClaim.analysisResult.metrics.functions) },
                          { label: "Imports", value: String(activeClaim.analysisResult.metrics.imports) },
                          { label: "Reliability", value: activeClaim.analysisResult.metrics.reliabilityScore != null ? `${activeClaim.analysisResult.metrics.reliabilityScore}%` : "—" },
                        ].map((m) => (
                          <div key={m.label} className="flex flex-col gap-2 px-3 py-3 rounded-md bg-[#14110D] border border-[#2C2519]">
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8C8475] whitespace-nowrap">{m.label}</span>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={m.value}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.08 }}
                                className="text-[#ECE6D8] font-semibold text-[13px] tabular-nums"
                              >
                                {m.value}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-4">
                        {["Lines", "Complexity", "Language", "Functions", "Imports", "Reliability"].map((label) => (
                          <div key={label} className="flex flex-col gap-2 px-3 py-3 rounded-md bg-[#14110D] border border-[#2C2519]">
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#4A4438] whitespace-nowrap">{label}</span>
                            <div className="h-4 w-10 rounded bg-[#241F16] animate-pulse" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ─── Box D: Code ─── */}
                  <div className={`md:col-span-12 ${PANEL} overflow-hidden flex flex-col flex-grow`}>
                    {/* header */}
                    <div className="flex items-center justify-between px-4 h-10 bg-[#14110D] border-b border-[#2C2519] flex-none">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-[7px] w-[7px] rounded-full bg-[#C56B4F]/60" />
                          <div className="h-[7px] w-[7px] rounded-full bg-[#C99A4E]/60" />
                          <div className="h-[7px] w-[7px] rounded-full bg-[#74A36B]/60" />
                        </div>
                        <span className="text-[11px] font-mono text-[#9A9183]">
                          <FileCode2 className="h-3 w-3 inline mr-1 text-[#6E675B]" />{activeClaim.filePath}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(activeClaim.status).dot}`} />
                        <span className={`font-mono text-[9px] uppercase tracking-[0.15em] ${getStatusColor(activeClaim.status).text}`}>{activeClaim.status}</span>
                      </div>
                    </div>
                    {/* code */}
                    {activeClaim.analysisResult ? (
                      <div className="bg-[#14110D] relative flex-grow min-h-0">
                        <ScrollArea className="h-full">
                          <AnimatePresence mode="wait">
                            <motion.div key={activeClaim.id + "-code"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }}>
                              <SyntaxHighlighter
                                language={activeClaim.filePath.endsWith(".tsx") ? "tsx" : activeClaim.filePath.endsWith(".ts") ? "typescript" : activeClaim.filePath.endsWith(".prisma") ? "typescript" : "javascript"}
                                style={codeTheme}
                                customStyle={{ background: "transparent", margin: 0, padding: "1rem 1.25rem", fontSize: "11px", lineHeight: "1.7", fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace" }}
                                showLineNumbers
                                lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#4A4438", userSelect: "none", fontSize: "10px" }}
                                wrapLines
                                lineProps={() => ({ style: { display: "block" } })}
                              >
                                {activeClaim.analysisResult.codeSnippet}
                              </SyntaxHighlighter>
                            </motion.div>
                          </AnimatePresence>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="bg-[#14110D] flex flex-col items-center justify-center py-14 px-8 flex-grow">
                        <div className="h-12 w-12 rounded-md bg-[#1A1611] border border-[#2C2519] flex items-center justify-center mb-4">
                          <Terminal className="h-6 w-6 text-[#6E675B]" />
                        </div>
                        <p className="text-[#ECE6D8] font-medium text-xs">Not verified yet</p>
                        <p className="text-[#9A9183] text-[11px] mt-1.5 text-center max-w-xs leading-relaxed">
                          Run verification to fetch the file and check it against the claim.
                        </p>
                        <Button
                          onClick={() => handleVerify(activeClaim.id)}
                          disabled={isVerifying}
                          className="mt-5 bg-[#D9A441] text-[#1A1611] hover:bg-[#E4B254] border-0 gap-1.5 h-8 text-[11px] font-medium rounded-md"
                        >
                          {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          {isVerifying ? "Analyzing…" : "Verify now"}
                        </Button>
                      </div>
                    )}
                    {/* footer */}
                    <div className="flex items-center justify-between px-4 h-7 bg-[#14110D] border-t border-[#2C2519] flex-none">
                      <div className="flex items-center gap-3 font-mono text-[9px] text-[#6E675B]">
                        {activeClaim.analysisResult ? (
                          <><span>{activeClaim.analysisResult.language}</span><span>UTF-8</span><span>{activeClaim.analysisResult.linesOfCode}</span></>
                        ) : (
                          <><span>—</span><span>UTF-8</span></>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-[#6E675B]">
                        {activeClaim.analysisResult ? `Verified ${new Date(activeClaim.analysisResult.verifiedAt).toLocaleTimeString()}` : "Not verified"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#2C2519] bg-[#100D0A]">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#6E675B]">
            <ShieldCheck className="h-3 w-3 text-[#8C8475]" />
            <span>DevVerify</span>
            <span className="text-[#3A3122]">·</span>
            <span>Code evidence platform</span>
          </div>
          <span className="font-mono text-[10px] text-[#4A4438]">Next.js · Prisma</span>
        </div>
      </footer>

      {/* ── Add Claim Modal ── */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/70"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={`w-full max-w-md ${PANEL} p-6 relative z-10`}
            >
              <h3 className="text-[#ECE6D8] font-semibold text-base mb-1 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#D9A441]" />
                Add resume claim
              </h3>
              <p className="text-[#9A9183] text-xs mb-5">Point a claim at a real file and we&apos;ll check the evidence.</p>
              <form onSubmit={handleCreateClaim} className="space-y-4">
                <div>
                  <label className={`block ${LABEL} mb-1.5`}>Claim text</label>
                  <textarea
                    required
                    value={newBulletText}
                    onChange={(e) => setNewBulletText(e.target.value)}
                    placeholder="e.g. Built a GitHub file-verification API that fetches files and computes metrics"
                    rows={3}
                    className="w-full rounded-md border border-[#2C2519] bg-[#14110D] px-3 py-2 text-xs text-[#ECE6D8] placeholder-[#6E675B] focus:outline-none focus:border-[#D9A441]/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block ${LABEL} mb-1.5`}>GitHub repo</label>
                    <input
                      type="text"
                      required
                      value={newGithubRepo}
                      onChange={(e) => setNewGithubRepo(e.target.value)}
                      placeholder="user/repo"
                      className="w-full rounded-md border border-[#2C2519] bg-[#14110D] px-3 py-2 text-xs text-[#ECE6D8] placeholder-[#6E675B] focus:outline-none focus:border-[#D9A441]/60 font-mono"
                    />
                  </div>
                  <div>
                    <label className={`block ${LABEL} mb-1.5`}>File path</label>
                    <input
                      type="text"
                      required
                      value={newFilePath}
                      onChange={(e) => setNewFilePath(e.target.value)}
                      placeholder="src/index.ts"
                      className="w-full rounded-md border border-[#2C2519] bg-[#14110D] px-3 py-2 text-xs text-[#ECE6D8] placeholder-[#6E675B] focus:outline-none focus:border-[#D9A441]/60 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddOpen(false)}
                    className="text-[#9A9183] hover:text-[#ECE6D8] hover:bg-[#241F16] text-[11px] h-8 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#D9A441] text-[#1A1611] hover:bg-[#E4B254] border-0 text-[11px] h-8 px-4 font-medium rounded-md flex items-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add claim
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
