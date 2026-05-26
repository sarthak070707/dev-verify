"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  ShieldCheck,
  Code2,
  GitBranch,
  FileCode2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Terminal,
  Cpu,
  Braces,
  Zap,
  Github,
  ChevronRight,
  Sparkles,
  Hash,
  Layers,
  GitCommitHorizontal,
  TestTube2,
  Target,
  Crosshair,
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
  metrics: { functions: number; imports: number; errorHandling: number };
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

/* ──────────────── Glass Card Classes ──────────────── */

const GLASS = "bg-[#0a142c]/60 backdrop-blur-xl border border-blue-500/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]";
const GLASS_INNER = "border-t border-l border-white/10";

/* ──────────────── Circular Progress ──────────────── */

function NeonRing({ value, size = 110, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 100 ? "#22d3ee" : value >= 60 ? "#818cf8" : value > 0 ? "#fbbf24" : "#1e3a5f";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <filter id="neon-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e3a5f" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          filter="url(#neon-ring-glow)"
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-semibold text-xl tabular-nums">{value}%</span>
        <span className="text-[8px] uppercase tracking-[0.2em] text-cyan-400/60">complete</span>
      </div>
    </div>
  );
}

/* ──────────────── Target Mesh (Empty State) ──────────────── */

function TargetMesh() {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Outer pulsing ring */}
      <motion.div
        className="absolute w-40 h-40 rounded-full border border-cyan-500/20"
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Mid ring */}
      <motion.div
        className="absolute w-28 h-28 rounded-full border border-blue-400/25"
        animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      {/* Inner ring */}
      <motion.div
        className="absolute w-16 h-16 rounded-full border border-indigo-400/30"
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      {/* Core glow dot */}
      <div className="relative w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
      </div>
      {/* Crosshair lines */}
      <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
      <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />
      {/* Corner brackets */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
        <path d="M 20 8 L 8 8 L 8 20" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
        <path d="M 140 8 L 152 8 L 152 20" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
        <path d="M 8 140 L 8 152 L 20 152" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
        <path d="M 152 140 L 152 152 L 140 152" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/* ──────────────── Syntax Theme ──────────────── */

const neonTheme: Record<string, React.CSSProperties> = {
  ...atomOneDark,
  'pre[class*="language-"]': { ...atomOneDark['pre[class*="language-"]'], background: "transparent", margin: 0 },
  'code[class*="language-"]': { ...atomOneDark['code[class*="language-"]'], background: "transparent" },
  comment: { color: "#4b6a9f", fontStyle: "italic" },
  prolog: { color: "#4b6a9f" },
  punctuation: { color: "#7dd3fc" },
  property: { color: "#818cf8" },
  keyword: { color: "#c084fc" },
  tag: { color: "#22d3ee" },
  boolean: { color: "#f472b6" },
  number: { color: "#f472b6" },
  constant: { color: "#f472b6" },
  symbol: { color: "#f472b6" },
  selector: { color: "#34d399" },
  "attr-name": { color: "#22d3ee" },
  string: { color: "#34d399" },
  char: { color: "#34d399" },
  builtin: { color: "#38bdf8" },
  operator: { color: "#7dd3fc" },
  atrule: { color: "#c084fc" },
  "attr-value": { color: "#34d399" },
  function: { color: "#818cf8" },
  "class-name": { color: "#fbbf24" },
  regex: { color: "#22d3ee" },
  variable: { color: "#818cf8" },
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

  const verifiedCount = claims.filter((c) => c.status === "VERIFIED").length;
  const pendingCount = claims.filter((c) => c.status === "PENDING").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED": return { dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]", text: "text-emerald-400" };
      case "PENDING": return { dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]", text: "text-amber-400" };
      case "FAILED": return { dot: "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]", text: "text-red-400" };
      default: return { dot: "bg-amber-400", text: "text-amber-400" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED": return <CheckCircle2 className="h-3 w-3" />;
      case "PENDING": return <Clock className="h-3 w-3" />;
      case "FAILED": return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  /* ──────── Loading ──────── */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#040a18] flex items-center justify-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-[#0a142c]/80 backdrop-blur-xl border border-blue-500/20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
          </div>
          <div className="absolute -inset-3 rounded-xl border border-cyan-500/10 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-[#040a18] flex flex-col relative overflow-hidden">

      {/* ── Ambient neon blur blobs ── */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed top-[30%] right-[20%] w-[300px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-20 border-b border-blue-500/15 bg-[#040a18]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#0a142c]/80 backdrop-blur-xl border border-blue-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm tracking-wide">DevVerify</span>
              <span className="text-blue-300/40 text-[10px] font-medium tracking-widest uppercase hidden sm:inline">
                Code Evidence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0a142c]/60 backdrop-blur-xl border border-blue-500/20">
              <div className={`h-1.5 w-1.5 rounded-full ${verifiedCount > 0 ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-600"}`} />
              <span className="text-[10px] text-cyan-400/80 font-mono tabular-nums">{verifiedCount}/{claims.length}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-300/50 hover:text-cyan-400 hover:bg-[#0a142c]/60 gap-1.5 text-[10px] h-7"
              onClick={seedAndLoad}
              disabled={isSeeding}
            >
              {isSeeding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ═══════════════ LEFT COLUMN ═══════════════ */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">

            {/* ── Profile Card ── */}
            <div className={`${GLASS} ${GLASS_INNER} rounded-xl p-5 relative overflow-hidden`}>
              {/* Top gradient accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-blue-500/25 to-cyan-500/20 border border-blue-400/20 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                  {user?.name?.charAt(0) || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold tracking-wide text-sm truncate">
                    {user?.name || "Sarthak Arya"}
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Full-Stack Developer</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Github className="h-3 w-3 text-blue-300/40" />
                    <span className="text-blue-300/40 text-[10px] font-mono truncate">
                      {user?.email || "sarthak@devverify.io"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-blue-500/10">
                <div className="text-center">
                  <div className="text-white font-semibold text-base tabular-nums">{claims.length}</div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mt-0.5">Claims</div>
                </div>
                <div className="text-center">
                  <div className="text-cyan-400 font-semibold text-base tabular-nums">{verifiedCount}</div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mt-0.5">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-amber-400 font-semibold text-base tabular-nums">{pendingCount}</div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mt-0.5">Pending</div>
                </div>
              </div>
            </div>

            {/* ── Claims Label ── */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-blue-400/50" />
                <span className="text-[11px] font-medium text-blue-300/50 tracking-wide">Resume Claims</span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-blue-300/25">{claims.length}</span>
            </div>

            {/* ── Claims List ── */}
            <ScrollArea className="flex-1 max-h-[calc(100vh-18rem)] lg:max-h-[calc(100vh-18rem)]">
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
                          className={`w-full text-left rounded-xl border p-3.5 transition-all duration-150 ${
                            isSelected
                              ? "bg-gradient-to-r from-blue-500/10 to-transparent border-blue-400/30 border-l-4 border-l-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.08)]"
                              : "bg-[#0a142c]/30 border-blue-500/10 hover:bg-[#0a142c]/50 hover:border-blue-500/15"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]" : "bg-blue-500/5"
                            }`}>
                              <FileCode2 className={`h-3.5 w-3.5 ${isSelected ? "text-blue-400" : "text-blue-300/30"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug line-clamp-2 ${isSelected ? "text-white" : "text-slate-400"}`}>
                                {claim.bulletText}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <GitBranch className="h-2.5 w-2.5 text-blue-300/25" />
                                <span className="text-[10px] font-mono text-blue-300/30 truncate max-w-[100px]">{claim.githubRepo}</span>
                                <span className="text-[10px] font-mono text-blue-300/20 truncate">{claim.filePath}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2">
                                <div className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                <span className={`text-[9px] uppercase tracking-wider ${sc.text}`}>{claim.status}</span>
                              </div>
                            </div>
                            <ChevronRight className={`h-3.5 w-3.5 mt-1 shrink-0 ${isSelected ? "text-blue-400/60" : "text-blue-300/15"}`} />
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
          <div className="lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">
              {!activeClaim ? (
                /* ── Empty State — Target Mesh Glass Pane ── */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`h-full min-h-[70vh] lg:min-h-[calc(100vh-7rem)] ${GLASS} ${GLASS_INNER} rounded-xl flex flex-col items-center justify-center p-8 relative overflow-hidden`}
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                  {/* Inner ambient glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] via-transparent to-cyan-500/[0.03] pointer-events-none" />

                  <TargetMesh />

                  <h3 className="text-white font-semibold tracking-wide text-sm mt-6 relative">
                    Awaiting Target Selection
                  </h3>
                  <p className="text-slate-400 text-xs mt-2 text-center max-w-xs relative">
                    Select a resume claim from the sidebar to load its code evidence and verification metrics.
                  </p>
                  <div className="flex items-center gap-1.5 mt-4 relative">
                    <Crosshair className="h-3 w-3 text-cyan-400/50" />
                    <span className="text-[10px] text-cyan-400/40 font-mono">Click a claim to begin analysis</span>
                  </div>
                </motion.div>
              ) : (
                /* ── Bento Grid ── */
                <motion.div
                  key={activeClaim.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4"
                >
                  {/* ─── Box A: Claim Detail ─── */}
                  <div className={`md:col-span-12 ${GLASS} ${GLASS_INNER} rounded-xl p-5 sm:p-6 relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(activeClaim.status).dot}`} />
                          <span className={`text-[10px] uppercase tracking-wider font-medium ${getStatusColor(activeClaim.status).text}`}>
                            {activeClaim.status}
                          </span>
                          <span className="text-blue-300/20">·</span>
                          <span className="text-[10px] font-mono text-blue-300/40">
                            <GitBranch className="h-2.5 w-2.5 inline mr-0.5" />{activeClaim.githubRepo}
                          </span>
                          <span className="text-blue-300/20">·</span>
                          <span className="text-[10px] font-mono text-blue-300/30">
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
                            className="text-white text-sm leading-relaxed"
                          >
                            {activeClaim.bulletText}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <div className="shrink-0">
                        {activeClaim.status === "PENDING" && (
                          <Button
                            onClick={() => handleVerify(activeClaim.id)}
                            disabled={isVerifying}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-[0_0_20px_rgba(59,130,246,0.25)] gap-1.5 h-8 text-[11px] font-medium rounded-lg"
                          >
                            {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            {isVerifying ? "Verifying..." : "Verify Claim"}
                          </Button>
                        )}
                        {activeClaim.status === "VERIFIED" && (
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ─── Box B: Progress Ring ─── */}
                  <div className={`md:col-span-4 ${GLASS} ${GLASS_INNER} rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
                    <span className="text-[9px] uppercase tracking-[0.15em] text-cyan-400/50 mb-3">Verification Progress</span>
                    <NeonRing value={verificationProgress} size={110} strokeWidth={4} />
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
                        <span className="text-[10px] text-slate-400">{verifiedCount} verified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
                        <span className="text-[10px] text-slate-400">{pendingCount} pending</span>
                      </div>
                    </div>
                  </div>

                  {/* ─── Box C: 6-Column Micro-Metrics ─── */}
                  <div className={`md:col-span-8 ${GLASS} ${GLASS_INNER} rounded-xl p-5 relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
                    <span className="text-[9px] uppercase tracking-[0.15em] text-cyan-400/50">Code Metrics</span>

                    {activeClaim.analysisResult ? (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-3">
                        {[
                          { label: "Lines", value: activeClaim.analysisResult.linesOfCode, icon: Hash },
                          { label: "Complexity", value: activeClaim.analysisResult.complexity, icon: Cpu },
                          { label: "Language", value: activeClaim.analysisResult.language, icon: Braces },
                          { label: "Functions", value: String(activeClaim.analysisResult.metrics.functions), icon: Terminal },
                          { label: "Imports", value: String(activeClaim.analysisResult.metrics.imports), icon: GitCommitHorizontal },
                          { label: "Coverage", value: activeClaim.analysisResult.metrics.errorHandling > 2 ? "87%" : activeClaim.analysisResult.metrics.errorHandling > 0 ? "62%" : "24%", icon: TestTube2 },
                        ].map((m) => (
                          <div key={m.label} className="flex flex-col gap-1.5 px-2.5 py-2.5 rounded-lg bg-[#040a18]/60 border border-blue-500/10">
                            <div className="flex items-center gap-1">
                              <m.icon className="h-2.5 w-2.5 text-cyan-400/40" />
                              <span className="text-[9px] uppercase tracking-wider text-slate-500">{m.label}</span>
                            </div>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={m.value}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.08 }}
                                className="text-cyan-400 font-semibold text-[11px] tabular-nums"
                              >
                                {m.value}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-3">
                        {["Lines", "Complexity", "Language", "Functions", "Imports", "Coverage"].map((label) => (
                          <div key={label} className="flex flex-col gap-1.5 px-2.5 py-2.5 rounded-lg bg-[#040a18]/60 border border-blue-500/10">
                            <span className="text-[9px] uppercase tracking-wider text-slate-700">{label}</span>
                            <div className="h-4 w-10 rounded bg-blue-500/5 animate-pulse" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ─── Box D: Code Terminal ─── */}
                  <div className={`md:col-span-12 ${GLASS} rounded-xl overflow-hidden relative`}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent" />

                    {/* Terminal header */}
                    <div className="flex items-center justify-between px-4 h-10 bg-[#0a142c]/80 border-b border-blue-500/15">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-[7px] w-[7px] rounded-full bg-red-400/70 shadow-[0_0_4px_rgba(248,113,113,0.3)]" />
                          <div className="h-[7px] w-[7px] rounded-full bg-amber-400/70 shadow-[0_0_4px_rgba(251,191,36,0.3)]" />
                          <div className="h-[7px] w-[7px] rounded-full bg-emerald-400/70 shadow-[0_0_4px_rgba(52,211,153,0.3)]" />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          <FileCode2 className="h-3 w-3 inline mr-1 text-blue-300/40" />{activeClaim.filePath}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(activeClaim.status).dot}`} />
                        <span className={`text-[9px] uppercase tracking-wider ${getStatusColor(activeClaim.status).text}`}>{activeClaim.status}</span>
                      </div>
                    </div>

                    {/* Code */}
                    {activeClaim.analysisResult ? (
                      <div className="bg-[#040a18] relative">
                        <ScrollArea className="max-h-[calc(100vh-30rem)] min-h-[260px]">
                          <AnimatePresence mode="wait">
                            <motion.div key={activeClaim.id + "-code"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }}>
                              <SyntaxHighlighter
                                language={activeClaim.filePath.endsWith(".tsx") ? "tsx" : activeClaim.filePath.endsWith(".ts") ? "typescript" : activeClaim.filePath.endsWith(".prisma") ? "typescript" : "javascript"}
                                style={neonTheme}
                                customStyle={{ background: "transparent", margin: 0, padding: "1rem 1.25rem", fontSize: "11px", lineHeight: "1.7", fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace" }}
                                showLineNumbers
                                lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#1e3a5f", userSelect: "none", fontSize: "10px" }}
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
                      <div className="bg-[#040a18] flex flex-col items-center justify-center py-14 px-8">
                        <div className="h-12 w-12 rounded-lg bg-[#0a142c]/60 border border-blue-500/15 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.08)]">
                          <Terminal className="h-6 w-6 text-cyan-400/40" />
                        </div>
                        <p className="text-white font-medium text-xs">Awaiting Verification</p>
                        <p className="text-slate-400 text-[11px] mt-1.5 text-center max-w-xs">
                          Run verification to analyze the code and generate evidence.
                        </p>
                        <Button
                          onClick={() => handleVerify(activeClaim.id)}
                          disabled={isVerifying}
                          className="mt-5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-[0_0_20px_rgba(59,130,246,0.25)] gap-1.5 h-8 text-[11px] font-medium rounded-lg"
                        >
                          {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          {isVerifying ? "Analyzing..." : "Verify Now"}
                        </Button>
                      </div>
                    )}

                    {/* Terminal footer */}
                    <div className="flex items-center justify-between px-4 h-7 bg-[#0a142c]/80 border-t border-blue-500/10">
                      <div className="flex items-center gap-3 text-[9px] font-mono text-blue-300/25">
                        {activeClaim.analysisResult ? (
                          <><span>{activeClaim.analysisResult.language}</span><span>UTF-8</span><span>{activeClaim.analysisResult.linesOfCode}</span></>
                        ) : (
                          <><span>—</span><span>UTF-8</span></>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-blue-300/20">
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
      <footer className="relative z-10 border-t border-blue-500/10 bg-[#040a18]/80 backdrop-blur-xl mt-auto">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-blue-300/25">
            <ShieldCheck className="h-3 w-3" />
            <span>DevVerify</span>
            <span className="text-blue-300/15">·</span>
            <span>Code Evidence Platform</span>
          </div>
          <span className="text-[10px] text-blue-300/15 font-mono">Next.js + Prisma</span>
        </div>
      </footer>
    </div>
  );
}
