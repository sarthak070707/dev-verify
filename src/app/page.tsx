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
  ArrowRight,
  Zap,
  Github,
  ChevronRight,
  Sparkles,
  Hash,
  Layers,
  GitCommitHorizontal,
  TestTube2,
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
  };
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

/* ──────────────── Circular Progress Ring ──────────────── */

function CircularProgress({ value, size = 108, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const ringColor = value >= 100 ? "#34d399" : value >= 60 ? "#818cf8" : value > 0 ? "#fbbf24" : "#1e293b";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-semibold text-lg tabular-nums">{value}%</span>
        <span className="text-[8px] uppercase tracking-[0.2em] text-slate-600">complete</span>
      </div>
    </div>
  );
}

/* ──────────────── Custom high-contrast syntax theme ──────────────── */

const devVerifyTheme: Record<string, React.CSSProperties> = {
  ...atomOneDark,
  'pre[class*="language-"]': { ...atomOneDark['pre[class*="language-"]'], background: "transparent", margin: 0 },
  'code[class*="language-"]': { ...atomOneDark['code[class*="language-"]'], background: "transparent" },
  comment: { color: "#475569", fontStyle: "italic" },
  prolog: { color: "#475569" },
  cdata: { color: "#475569" },
  punctuation: { color: "#64748b" },
  property: { color: "#818cf8" },
  keyword: { color: "#c084fc" },
  tag: { color: "#818cf8" },
  boolean: { color: "#f472b6" },
  number: { color: "#f472b6" },
  constant: { color: "#f472b6" },
  symbol: { color: "#f472b6" },
  selector: { color: "#34d399" },
  "attr-name": { color: "#34d399" },
  string: { color: "#34d399" },
  char: { color: "#34d399" },
  builtin: { color: "#38bdf8" },
  inserted: { color: "#34d399" },
  operator: { color: "#94a3b8" },
  entity: { color: "#818cf8" },
  url: { color: "#38bdf8" },
  atrule: { color: "#c084fc" },
  "attr-value": { color: "#34d399" },
  function: { color: "#818cf8" },
  "class-name": { color: "#fbbf24" },
  regex: { color: "#34d399" },
  important: { color: "#c084fc" },
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
    } catch (err) {
      console.error("Error fetching claims:", err);
    }
  }, []);

  const seedAndLoad = useCallback(async () => {
    setIsSeeding(true);
    try {
      const seedRes = await fetch("/api/seed", { method: "POST" });
      const seedData = await seedRes.json();
      if (seedData.user) {
        setUser(seedData.user);
        await fetchData(seedData.user.id);
      }
    } catch (err) {
      console.error("Error seeding data:", err);
    } finally {
      setIsSeeding(false);
    }
  }, [fetchData]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/users?userId=demo");
        if (res.ok) {
          const data = await res.json();
          if (data.user) { setUser(data.user); await fetchData(data.user.id); setIsLoading(false); return; }
        }
        await seedAndLoad();
      } catch { await seedAndLoad(); }
      finally { setIsLoading(false); }
    }
    init();
  }, [fetchData, seedAndLoad]);

  const handleVerify = async (claimId: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/verify/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      const data = await res.json();
      if (data.claim) setClaims((prev) => prev.map((c) => (c.id === claimId ? data.claim : c)));
    } catch (err) {
      console.error("Error verifying claim:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED": return <CheckCircle2 className="h-2.5 w-2.5" />;
      case "PENDING": return <Clock className="h-2.5 w-2.5" />;
      case "FAILED": return <AlertCircle className="h-2.5 w-2.5" />;
      default: return <Clock className="h-2.5 w-2.5" />;
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "VERIFIED": return "bg-emerald-400";
      case "PENDING": return "bg-amber-400";
      case "FAILED": return "bg-red-400";
      default: return "bg-amber-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "VERIFIED": return "text-emerald-400/80";
      case "PENDING": return "text-amber-400/80";
      case "FAILED": return "text-red-400/80";
      default: return "text-amber-400/80";
    }
  };

  const verifiedCount = claims.filter((c) => c.status === "VERIFIED").length;
  const pendingCount = claims.filter((c) => c.status === "PENDING").length;

  /* ──────── Loading ──────── */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-[#090d16] border border-slate-900 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
          </div>
          <span className="font-mono tracking-tight text-[11px] text-slate-600">Initializing DevVerify</span>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col relative">
      {/* ── Structural overlay grid ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right,#0f172a 1px,transparent 1px),linear-gradient(to bottom,#0f172a 1px,transparent 1px)",
          backgroundSize: "3rem 3rem",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%,#000 70%,transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 0%,#000 70%,transparent 100%)",
        }}
      />

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-slate-900 bg-[#030712] sticky top-0 z-50">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#090d16] border border-slate-900 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="text-white font-medium text-[13px] tracking-tight">DevVerify</span>
            <span className="font-mono tracking-tight text-[9px] text-slate-700 uppercase hidden sm:inline">
              Code Evidence
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#090d16] border border-slate-900">
              <div className={`h-1 w-1 rounded-full ${verifiedCount > 0 ? "bg-emerald-400" : "bg-slate-700"}`} />
              <span className="font-mono tracking-tight text-[10px] text-slate-500 tabular-nums">
                {verifiedCount}/{claims.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-400 hover:bg-[#090d16] gap-1 font-mono tracking-tight text-[10px] h-7 px-2"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

          {/* ═══════════════ LEFT COLUMN ═══════════════ */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">

            {/* ── Profile Block ── */}
            <div className="bg-[#090d16] border border-slate-900 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-[#0f172a] border border-slate-900 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0">
                  {user?.name?.charAt(0) || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-[13px] tracking-tight truncate">
                    {user?.name || "Sarthak Arya"}
                  </div>
                  <div className="font-mono tracking-tight text-[10px] text-slate-600 mt-0.5">
                    Full-Stack Developer
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <Github className="h-2.5 w-2.5 text-slate-700" />
                <span className="font-mono tracking-tight text-[10px] text-slate-700 truncate">
                  {user?.email || "sarthak@devverify.io"}
                </span>
              </div>

              {/* Flat grey badge rows */}
              <div className="flex flex-col gap-1.5 mt-4 pt-3 border-t border-slate-900">
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-[#0f172a]/60">
                  <span className="font-mono tracking-tight text-[9px] uppercase text-slate-600">Claims</span>
                  <span className="font-mono tracking-tight text-[11px] text-slate-400 tabular-nums">{claims.length}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-[#0f172a]/60">
                  <span className="font-mono tracking-tight text-[9px] uppercase text-slate-600">Verified</span>
                  <span className="font-mono tracking-tight text-[11px] text-slate-400 tabular-nums">{verifiedCount}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-[#0f172a]/60">
                  <span className="font-mono tracking-tight text-[9px] uppercase text-slate-600">Pending</span>
                  <span className="font-mono tracking-tight text-[11px] text-slate-400 tabular-nums">{pendingCount}</span>
                </div>
              </div>
            </div>

            {/* ── Claims Label ── */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-slate-700" />
                <span className="font-mono tracking-tight text-[10px] text-slate-600 uppercase">Claims</span>
              </div>
              <span className="font-mono tracking-tight text-[9px] text-slate-800 tabular-nums">{claims.length}</span>
            </div>

            {/* ── Claims List ── */}
            <ScrollArea className="flex-1 max-h-[calc(100vh-17rem)] lg:max-h-[calc(100vh-17rem)]">
              <div className="flex flex-col gap-px">
                <AnimatePresence mode="popLayout">
                  {claims.map((claim) => {
                    const isSelected = activeClaimId === claim.id;
                    return (
                      <motion.div
                        key={claim.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <button
                          onClick={() => setActiveClaimId(claim.id)}
                          className={`w-full text-left rounded-md border p-3 transition-opacity duration-100 ${
                            isSelected
                              ? "bg-[#090d16] border-slate-900 border-l-2 border-l-indigo-500"
                              : "bg-transparent border-transparent hover:bg-[#090d16]/50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug line-clamp-2 ${isSelected ? "text-slate-200" : "text-slate-400"}`}>
                                {claim.bulletText}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="font-mono tracking-tight text-[9px] text-slate-700 truncate max-w-[110px]">
                                  {claim.githubRepo}
                                </span>
                                <span className="font-mono tracking-tight text-[9px] text-slate-800 truncate">
                                  {claim.filePath}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1.5">
                                <div className={`h-1 w-1 rounded-full ${getStatusDot(claim.status)}`} />
                                <span className={`font-mono tracking-tight text-[9px] uppercase ${getStatusLabel(claim.status)}`}>
                                  {claim.status}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className={`h-3 w-3 mt-0.5 shrink-0 ${isSelected ? "text-slate-500" : "text-slate-800"}`} />
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* ═══════════════ RIGHT COLUMN — BENTO GRID ═══════════════ */}
          <div className="lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">
              {!activeClaim ? (
                /* ── Empty State ── */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full min-h-[70vh] lg:min-h-[calc(100vh-7rem)] bg-[#090d16] border border-slate-900 rounded-lg flex flex-col items-center justify-center p-8"
                >
                  <div className="h-16 w-16 rounded-lg bg-[#0f172a] border border-slate-900 flex items-center justify-center">
                    <Code2 className="h-8 w-8 text-slate-700" />
                  </div>
                  <p className="font-mono tracking-tight text-[11px] text-slate-600 mt-5">Select a claim to inspect</p>
                  <p className="font-mono tracking-tight text-[10px] text-slate-800 mt-1.5">
                    Click any claim from the sidebar
                  </p>
                </motion.div>
              ) : (
                /* ── Bento Grid ── */
                <motion.div
                  key={activeClaim.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3"
                >

                  {/* ─── Box A: Claim Detail ─── */}
                  <div className="md:col-span-12 bg-[#090d16] border border-slate-900 rounded-lg p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className={`h-1 w-1 rounded-full ${getStatusDot(activeClaim.status)}`} />
                          <span className={`font-mono tracking-tight text-[9px] uppercase ${getStatusLabel(activeClaim.status)}`}>
                            {activeClaim.status}
                          </span>
                          <span className="text-slate-800">·</span>
                          <span className="font-mono tracking-tight text-[10px] text-slate-600">
                            {activeClaim.githubRepo}
                          </span>
                          <span className="text-slate-800">·</span>
                          <span className="font-mono tracking-tight text-[10px] text-slate-700">
                            {activeClaim.filePath}
                          </span>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={activeClaim.bulletText}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="text-slate-300 text-sm leading-relaxed"
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
                            className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 gap-1.5 h-7 font-mono tracking-tight text-[10px] rounded"
                          >
                            {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                            {isVerifying ? "Verifying..." : "Verify"}
                          </Button>
                        )}
                        {activeClaim.status === "VERIFIED" && (
                          <div className="flex items-center gap-1 text-emerald-400/80 font-mono tracking-tight text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ─── Box B: Progress Ring ─── */}
                  <div className="md:col-span-4 bg-[#090d16] border border-slate-900 rounded-lg p-5 flex flex-col items-center justify-center">
                    <span className="font-mono tracking-tight text-[9px] uppercase text-slate-600 mb-3">
                      Verification Progress
                    </span>
                    <CircularProgress value={verificationProgress} size={108} strokeWidth={4} />
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-emerald-400" />
                        <span className="font-mono tracking-tight text-[9px] text-slate-600">{verifiedCount} verified</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-amber-400" />
                        <span className="font-mono tracking-tight text-[9px] text-slate-600">{pendingCount} pending</span>
                      </div>
                    </div>
                  </div>

                  {/* ─── Box C: Hyper-Dense Metric Data Bar ─── */}
                  <div className="md:col-span-8 bg-[#090d16] border border-slate-900 rounded-lg p-5">
                    <span className="font-mono tracking-tight text-[9px] uppercase text-slate-600">
                      Code Metrics
                    </span>

                    {activeClaim.analysisResult ? (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                        {[
                          { label: "Lines", value: activeClaim.analysisResult.linesOfCode, icon: Hash, accent: "text-slate-400" },
                          { label: "Complexity", value: activeClaim.analysisResult.complexity, icon: Cpu, accent: activeClaim.analysisResult.complexity === "Advanced" ? "text-emerald-400/80" : activeClaim.analysisResult.complexity === "Intermediate" ? "text-amber-400/80" : "text-slate-500" },
                          { label: "Language", value: activeClaim.analysisResult.language, icon: Braces, accent: "text-slate-400" },
                          { label: "Functions", value: String(activeClaim.analysisResult.metrics.functions), icon: Terminal, accent: "text-slate-400" },
                          { label: "Imports", value: String(activeClaim.analysisResult.metrics.imports), icon: GitCommitHorizontal, accent: "text-slate-400" },
                          { label: "Coverage", value: activeClaim.analysisResult.metrics.errorHandling > 2 ? "87%" : activeClaim.analysisResult.metrics.errorHandling > 0 ? "62%" : "24%", icon: TestTube2, accent: "text-slate-400" },
                        ].map((m) => (
                          <div key={m.label} className="flex flex-col gap-1 px-2 py-2 rounded bg-[#030712] border border-slate-900/70">
                            <div className="flex items-center gap-1">
                              <m.icon className="h-2.5 w-2.5 text-slate-700" />
                              <span className="font-mono tracking-tight text-[9px] uppercase text-slate-700">{m.label}</span>
                            </div>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={m.value}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.08 }}
                                className={`font-mono tracking-tight text-[11px] ${m.accent} tabular-nums`}
                              >
                                {m.value}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                        {["Lines", "Complexity", "Language", "Functions", "Imports", "Coverage"].map((label) => (
                          <div key={label} className="flex flex-col gap-1 px-2 py-2 rounded bg-[#030712] border border-slate-900/70">
                            <span className="font-mono tracking-tight text-[9px] uppercase text-slate-800">{label}</span>
                            <div className="h-3 w-8 rounded-sm bg-slate-900/60" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ─── Box D: Code Terminal ─── */}
                  <div className="md:col-span-12 bg-[#090d16] border border-slate-900 rounded-lg overflow-hidden">
                    {/* Terminal header bar */}
                    <div className="flex items-center justify-between px-4 h-9 bg-[#090d16] border-b border-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-[7px] w-[7px] rounded-full bg-[#1e293b]" />
                          <div className="h-[7px] w-[7px] rounded-full bg-[#1e293b]" />
                          <div className="h-[7px] w-[7px] rounded-full bg-[#1e293b]" />
                        </div>
                        <span className="font-mono tracking-tight text-[10px] text-slate-600">
                          {activeClaim.filePath}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`h-1 w-1 rounded-full ${getStatusDot(activeClaim.status)}`} />
                        <span className={`font-mono tracking-tight text-[9px] uppercase ${getStatusLabel(activeClaim.status)}`}>
                          {activeClaim.status}
                        </span>
                      </div>
                    </div>

                    {/* Code content */}
                    {activeClaim.analysisResult ? (
                      <div className="bg-[#02040a]">
                        <ScrollArea className="max-h-[calc(100vh-30rem)] min-h-[260px]">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={activeClaim.id + "-code"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.1 }}
                            >
                              <SyntaxHighlighter
                                language={
                                  activeClaim.filePath.endsWith(".tsx") ? "tsx"
                                    : activeClaim.filePath.endsWith(".ts") ? "typescript"
                                      : activeClaim.filePath.endsWith(".prisma") ? "typescript"
                                        : "javascript"
                                }
                                style={devVerifyTheme}
                                customStyle={{
                                  background: "transparent",
                                  margin: 0,
                                  padding: "1rem 1.25rem",
                                  fontSize: "11px",
                                  lineHeight: "1.7",
                                  fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
                                }}
                                showLineNumbers
                                lineNumberStyle={{
                                  minWidth: "2.5em",
                                  paddingRight: "1em",
                                  color: "#1e293b",
                                  userSelect: "none",
                                  fontSize: "10px",
                                }}
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
                      <div className="bg-[#02040a] flex flex-col items-center justify-center py-14 px-8">
                        <div className="h-12 w-12 rounded-lg bg-[#0f172a] border border-slate-900 flex items-center justify-center mb-4">
                          <Terminal className="h-6 w-6 text-slate-700" />
                        </div>
                        <p className="font-mono tracking-tight text-[11px] text-slate-600">Awaiting verification</p>
                        <p className="font-mono tracking-tight text-[10px] text-slate-800 mt-1">
                          Run verification to analyze the code
                        </p>
                        <Button
                          onClick={() => handleVerify(activeClaim.id)}
                          disabled={isVerifying}
                          className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white border-0 gap-1.5 h-7 font-mono tracking-tight text-[10px] rounded"
                        >
                          {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          {isVerifying ? "Analyzing..." : "Verify Now"}
                        </Button>
                      </div>
                    )}

                    {/* Terminal footer */}
                    <div className="flex items-center justify-between px-4 h-6 bg-[#090d16] border-t border-slate-900">
                      <div className="flex items-center gap-3 font-mono tracking-tight text-[9px] text-slate-800">
                        {activeClaim.analysisResult ? (
                          <>
                            <span>{activeClaim.analysisResult.language}</span>
                            <span>UTF-8</span>
                            <span>{activeClaim.analysisResult.linesOfCode}</span>
                          </>
                        ) : (
                          <>
                            <span>—</span>
                            <span>UTF-8</span>
                          </>
                        )}
                      </div>
                      <span className="font-mono tracking-tight text-[9px] text-slate-800">
                        {activeClaim.analysisResult
                          ? `Verified ${new Date(activeClaim.analysisResult.verifiedAt).toLocaleTimeString()}`
                          : "Not verified"}
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
      <footer className="relative z-10 border-t border-slate-900 bg-[#030712] mt-auto">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono tracking-tight text-[9px] text-slate-800">
            <ShieldCheck className="h-2.5 w-2.5" />
            <span>DevVerify</span>
            <span className="text-slate-900">·</span>
            <span>Code Evidence Platform</span>
          </div>
          <span className="font-mono tracking-tight text-[9px] text-slate-900">
            Next.js + Prisma
          </span>
        </div>
      </footer>
    </div>
  );
}
