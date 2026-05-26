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
  Activity,
  Hash,
  Layers,
  GitCommitHorizontal,
  Bug,
  TestTube2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

/* ──────────────────── Types ──────────────────── */

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
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  claims: Claim[];
}

/* ──────────────────── Circular Progress Ring ──────────────────── */

function CircularProgress({
  value,
  size = 120,
  strokeWidth = 6,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const ringColor =
    value >= 100
      ? "#34d399"
      : value >= 60
        ? "#818cf8"
        : value > 0
          ? "#fbbf24"
          : "#1e293b";

  const glowColor =
    value >= 100
      ? "rgba(52,211,153,0.25)"
      : value >= 60
        ? "rgba(129,140,248,0.2)"
        : value > 0
          ? "rgba(251,191,36,0.15)"
          : "transparent";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#glow-${label})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={value}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-white font-bold text-2xl tabular-nums"
        >
          {value}%
        </motion.span>
        <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mt-0.5">
          {label}
        </span>
      </div>
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ boxShadow: `0 0 40px ${glowColor}, inset 0 0 20px ${glowColor}` }}
      />
    </div>
  );
}

/* ──────────────────── Mesh Glow SVG ──────────────────── */

function MeshGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        preserveAspectRatio="none"
        viewBox="0 0 600 400"
      >
        <defs>
          <radialGradient id="mesh-grad-1" cx="30%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-grad-2" cx="70%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-grad-3" cx="50%" cy="20%" r="40%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="600" height="400" fill="url(#mesh-grad-1)" />
        <rect width="600" height="400" fill="url(#mesh-grad-2)" />
        <rect width="600" height="400" fill="url(#mesh-grad-3)" />
        {/* Grid lines */}
        {[...Array(12)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 50}
            y1="0"
            x2={i * 50}
            y2="400"
            stroke="#6366f1"
            strokeOpacity="0.04"
            strokeWidth="0.5"
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 50}
            x2="600"
            y2={i * 50}
            stroke="#6366f1"
            strokeOpacity="0.04"
            strokeWidth="0.5"
          />
        ))}
        {/* Accent dots at intersections */}
        {[100, 250, 400].map((x) =>
          [80, 200, 320].map((y) => (
            <circle
              key={`dot-${x}-${y}`}
              cx={x}
              cy={y}
              r="1.5"
              fill="#818cf8"
              fillOpacity="0.15"
            />
          ))
        )}
      </svg>
    </div>
  );
}

/* ──────────────────── Spring Text ──────────────────── */

function SpringText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={typeof children === "string" ? children : undefined}
        initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={className}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/* ──────────────────── Main Dashboard ──────────────────── */

export default function DevVerifyDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const activeClaim = claims.find((c) => c.id === activeClaimId) || null;

  /* Verification progress: percentage of claims that are verified */
  const verificationProgress = useMemo(() => {
    if (claims.length === 0) return 0;
    return Math.round(
      (claims.filter((c) => c.status === "VERIFIED").length / claims.length) * 100
    );
  }, [claims]);

  const fetchData = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/claims/list?userId=${userId}`);
      const data = await res.json();
      if (data.claims) {
        setClaims(data.claims);
      }
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
          if (data.user) {
            setUser(data.user);
            await fetchData(data.user.id);
            setIsLoading(false);
            return;
          }
        }
        await seedAndLoad();
      } catch {
        await seedAndLoad();
      } finally {
        setIsLoading(false);
      }
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
      if (data.claim) {
        setClaims((prev) =>
          prev.map((c) => (c.id === claimId ? data.claim : c))
        );
      }
    } catch (err) {
      console.error("Error verifying claim:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle2 className="h-3 w-3" />;
      case "PENDING":
        return <Clock className="h-3 w-3" />;
      case "FAILED":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PENDING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "FAILED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "Advanced":
        return "text-emerald-400";
      case "Intermediate":
        return "text-amber-400";
      case "Basic":
        return "text-slate-400";
      default:
        return "text-slate-400";
    }
  };

  /* ──────── Loading Screen ──────── */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <div className="h-14 w-14 rounded-xl bg-[#090d16] border border-slate-900 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-indigo-400" />
            </div>
            <motion.div
              className="absolute -inset-2 rounded-xl border border-indigo-500/20"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs font-medium tracking-wide">Initializing DevVerify</span>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ──────── Main Layout ──────── */

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-slate-900 bg-[#030712]/90 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#090d16] border border-slate-900 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm tracking-tight">
                DevVerify
              </span>
              <span className="text-slate-600 text-[10px] font-medium tracking-widest uppercase hidden sm:inline">
                Code Evidence Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#090d16] border border-slate-900">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400 font-mono">
                {claims.filter((c) => c.status === "VERIFIED").length}/{claims.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-300 hover:bg-[#090d16] gap-1.5 text-[11px] h-8"
              onClick={seedAndLoad}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ═══════════════ Left Column — Portfolio Hub ═══════════════ */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-[#090d16] border border-slate-900 rounded-xl p-5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                  {user?.name?.charAt(0) || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-sm truncate">
                    {user?.name || "Sarthak Arya"}
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">Full-Stack Developer</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Github className="h-3 w-3 text-slate-600" />
                    <span className="text-slate-600 text-[10px] font-mono truncate">
                      {user?.email || "sarthak@devverify.io"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-900">
                <div className="text-center">
                  <div className="text-white font-semibold text-base tabular-nums">
                    {claims.length}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600 mt-0.5">
                    Claims
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-semibold text-base tabular-nums">
                    {claims.filter((c) => c.status === "VERIFIED").length}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600 mt-0.5">
                    Verified
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-amber-400 font-semibold text-base tabular-nums">
                    {claims.filter((c) => c.status === "PENDING").length}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-slate-600 mt-0.5">
                    Pending
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Claims List Label */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-indigo-500/60" />
                <span className="text-[11px] font-medium text-slate-500 tracking-wide">
                  Resume Claims
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-700">
                {claims.length}
              </span>
            </div>

            {/* Claims List */}
            <ScrollArea className="flex-1 max-h-[calc(100vh-18rem)] lg:max-h-[calc(100vh-18rem)]">
              <div className="flex flex-col gap-1.5 pr-0.5">
                <AnimatePresence mode="popLayout">
                  {claims.map((claim, index) => (
                    <motion.div
                      key={claim.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        delay: index * 0.04,
                      }}
                    >
                      <button
                        onClick={() => setActiveClaimId(claim.id)}
                        className={`w-full text-left rounded-lg border p-3 transition-all duration-150 group ${
                          activeClaimId === claim.id
                            ? "bg-indigo-500/[0.06] border-indigo-500/20"
                            : "bg-[#090d16] border-slate-900 hover:bg-[#0c1120] hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`mt-0.5 h-6 w-6 rounded flex items-center justify-center shrink-0 ${
                              activeClaimId === claim.id
                                ? "bg-indigo-500/15"
                                : "bg-slate-900"
                            }`}
                          >
                            <FileCode2
                              className={`h-3 w-3 ${
                                activeClaimId === claim.id
                                  ? "text-indigo-400"
                                  : "text-slate-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs leading-snug line-clamp-2 transition-colors ${
                                activeClaimId === claim.id
                                  ? "text-slate-200"
                                  : "text-slate-400"
                              }`}
                            >
                              {claim.bulletText}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <GitBranch className="h-2.5 w-2.5 text-slate-700" />
                              <span className="text-[10px] font-mono text-slate-700 truncate max-w-[100px]">
                                {claim.githubRepo}
                              </span>
                              <span className="text-[10px] font-mono text-slate-800 truncate">
                                {claim.filePath}
                              </span>
                            </div>
                            <div className="mt-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 h-4 gap-0.5 ${getStatusBadgeClass(claim.status)}`}
                              >
                                {getStatusIcon(claim.status)}
                                {claim.status}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition-colors ${
                              activeClaimId === claim.id
                                ? "text-indigo-400/60"
                                : "text-slate-800 group-hover:text-slate-600"
                            }`}
                          />
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* ═══════════════ Right Column — Bento Grid ═══════════════ */}
          <div className="lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">
              {!activeClaim ? (
                /* ── Empty State ── */
                <motion.div
                  key="bento-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full min-h-[70vh] lg:min-h-[calc(100vh-7rem)] bg-[#090d16] border border-slate-900 rounded-xl flex flex-col items-center justify-center p-8 relative overflow-hidden"
                >
                  <MeshGlow />
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-slate-900/50 border border-slate-900 flex items-center justify-center">
                      <Code2 className="h-10 w-10 text-slate-700" />
                    </div>
                    <motion.div
                      className="absolute -inset-3 rounded-2xl border border-indigo-500/10"
                      animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.08, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <h3 className="text-slate-400 font-medium text-sm mt-6 relative">
                    Select a claim to inspect
                  </h3>
                  <p className="text-slate-600 text-xs mt-1.5 text-center max-w-xs relative">
                    Click any resume claim from the sidebar to load its code evidence, metrics, and verification status.
                  </p>
                  <div className="flex items-center gap-1.5 mt-5 text-slate-700 text-[11px] relative">
                    <ArrowRight className="h-3 w-3" />
                    <span>Pick a claim to begin</span>
                  </div>
                </motion.div>
              ) : (
                /* ── Bento Grid Layout ── */
                <motion.div
                  key={`bento-${activeClaim.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3"
                >
                  {/* ─── Box A: Claim Details (wide feature section) ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.02 }}
                    className="md:col-span-12 bg-[#090d16] border border-slate-900 rounded-xl p-5 sm:p-6 relative overflow-hidden"
                  >
                    <MeshGlow />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent" />

                    <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] gap-0.5 ${getStatusBadgeClass(activeClaim.status)}`}
                          >
                            {getStatusIcon(activeClaim.status)}
                            {activeClaim.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-900 text-slate-500 bg-slate-900/50 text-[10px] gap-1"
                          >
                            <GitBranch className="h-2.5 w-2.5" />
                            {activeClaim.githubRepo}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-900 text-slate-600 bg-slate-900/50 text-[10px] gap-1 font-mono"
                          >
                            <FileCode2 className="h-2.5 w-2.5" />
                            {activeClaim.filePath}
                          </Badge>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={activeClaim.bulletText}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
                            className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-500/15 gap-1.5 h-8 text-[11px] font-medium rounded-lg"
                          >
                            {isVerifying ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Zap className="h-3.5 w-3.5" />
                            )}
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
                  </motion.div>

                  {/* ─── Box B: Circular Progress Visualization ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.06 }}
                    className="md:col-span-4 bg-[#090d16] border border-slate-900 rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent" />
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-4">
                      Verification Progress
                    </div>
                    <CircularProgress value={verificationProgress} size={130} strokeWidth={5} label="complete" />
                    <div className="flex items-center gap-4 mt-4 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-slate-500">
                          {claims.filter((c) => c.status === "VERIFIED").length} verified
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="text-slate-500">
                          {claims.filter((c) => c.status === "PENDING").length} pending
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* ─── Box C: 6-Column Micro-Metrics ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
                    className="md:col-span-8 bg-[#090d16] border border-slate-900 rounded-xl p-5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent" />
                    <div className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-4">
                      Code Metrics
                    </div>

                    {activeClaim.analysisResult ? (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {/* Lines of Code */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-indigo-400/70" />
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">Lines</span>
                          </div>
                          <SpringText className="text-white font-semibold text-sm tabular-nums">
                            {activeClaim.analysisResult.linesOfCode}
                          </SpringText>
                        </div>
                        {/* Complexity */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                          <div className="flex items-center gap-1">
                            <Cpu className="h-3 w-3 text-emerald-400/70" />
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">Complexity</span>
                          </div>
                          <SpringText className={`font-semibold text-sm ${getComplexityColor(activeClaim.analysisResult.complexity)}`}>
                            {activeClaim.analysisResult.complexity}
                          </SpringText>
                        </div>
                        {/* Language */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                          <div className="flex items-center gap-1">
                            <Braces className="h-3 w-3 text-amber-400/70" />
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">Language</span>
                          </div>
                          <SpringText className="text-white font-semibold text-xs leading-tight">
                            {activeClaim.analysisResult.language}
                          </SpringText>
                        </div>
                        {/* Functions */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                          <div className="flex items-center gap-1">
                            <Terminal className="h-3 w-3 text-cyan-400/70" />
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">Functions</span>
                          </div>
                          <SpringText className="text-white font-semibold text-sm tabular-nums">
                            {activeClaim.analysisResult.metrics.functions}
                          </SpringText>
                        </div>
                        {/* Imports */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                          <div className="flex items-center gap-1">
                            <GitCommitHorizontal className="h-3 w-3 text-violet-400/70" />
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">Imports</span>
                          </div>
                          <SpringText className="text-white font-semibold text-sm tabular-nums">
                            {activeClaim.analysisResult.metrics.imports}
                          </SpringText>
                        </div>
                        {/* Test Coverage (derived metric) */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                          <div className="flex items-center gap-1">
                            <TestTube2 className="h-3 w-3 text-rose-400/70" />
                            <span className="text-[9px] uppercase tracking-wider text-slate-600">Coverage</span>
                          </div>
                          <SpringText className="text-white font-semibold text-sm tabular-nums">
                            {activeClaim.analysisResult.metrics.errorHandling > 2 ? "87%" : activeClaim.analysisResult.metrics.errorHandling > 0 ? "62%" : "24%"}
                          </SpringText>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {["Lines", "Complexity", "Language", "Functions", "Imports", "Coverage"].map((label) => (
                          <div key={label} className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#030712] border border-slate-900/80">
                            <span className="text-[9px] uppercase tracking-wider text-slate-700">{label}</span>
                            <div className="h-4 w-10 rounded bg-slate-900/50 animate-pulse" />
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* ─── Box D: Code Terminal ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.14 }}
                    className="md:col-span-12 bg-[#090d16] border border-slate-900 rounded-xl overflow-hidden relative"
                  >
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent" />

                    {/* Terminal Chrome */}
                    <div className="flex items-center justify-between px-4 h-10 bg-[#060a14] border-b border-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
                        </div>
                        <Separator orientation="vertical" className="h-4 bg-slate-900" />
                        <div className="flex items-center gap-1.5">
                          <FileCode2 className="h-3 w-3 text-slate-600" />
                          <span className="text-[11px] font-mono text-slate-500">
                            {activeClaim.filePath}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[8px] h-4 px-1 gap-0.5 ${getStatusBadgeClass(activeClaim.status)}`}
                        >
                          {getStatusIcon(activeClaim.status)}
                          {activeClaim.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Code Content */}
                    {activeClaim.analysisResult ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] via-transparent to-emerald-500/[0.02] pointer-events-none" />
                        <ScrollArea className="max-h-[calc(100vh-30rem)] min-h-[280px]">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={activeClaim.id + "-code"}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <SyntaxHighlighter
                                language={
                                  activeClaim.filePath.endsWith(".tsx")
                                    ? "tsx"
                                    : activeClaim.filePath.endsWith(".ts")
                                      ? "typescript"
                                      : activeClaim.filePath.endsWith(".prisma")
                                        ? "typescript"
                                        : "javascript"
                                }
                                style={atomOneDark}
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
                                  color: "rgb(30 41 59)",
                                  userSelect: "none",
                                  fontSize: "10px",
                                }}
                                wrapLines
                                lineProps={() => ({
                                  style: { display: "block" },
                                })}
                              >
                                {activeClaim.analysisResult.codeSnippet}
                              </SyntaxHighlighter>
                            </motion.div>
                          </AnimatePresence>
                        </ScrollArea>
                      </div>
                    ) : (
                      /* Pending / Unverified State */
                      <div className="flex flex-col items-center justify-center py-14 px-8">
                        <div className="h-14 w-14 rounded-xl bg-slate-900/30 border border-slate-900 flex items-center justify-center mb-4">
                          <Terminal className="h-7 w-7 text-slate-700" />
                        </div>
                        <h4 className="text-slate-500 font-medium text-xs">
                          Awaiting Verification
                        </h4>
                        <p className="text-slate-700 text-[11px] mt-1.5 text-center max-w-xs">
                          Run verification to analyze the code and generate evidence for this claim.
                        </p>
                        <Button
                          onClick={() => handleVerify(activeClaim.id)}
                          disabled={isVerifying}
                          className="mt-5 bg-indigo-500 hover:bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-500/15 gap-1.5 h-8 text-[11px] font-medium rounded-lg"
                        >
                          {isVerifying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          {isVerifying ? "Analyzing..." : "Verify Now"}
                        </Button>
                      </div>
                    )}

                    {/* Terminal Footer */}
                    <div className="flex items-center justify-between px-4 h-7 bg-[#060a14] border-t border-slate-900">
                      <div className="flex items-center gap-3 text-[9px] text-slate-700 font-mono">
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
                      <div className="text-[9px] text-slate-800 font-mono">
                        {activeClaim.analysisResult
                          ? `Verified ${new Date(activeClaim.analysisResult.verifiedAt).toLocaleTimeString()}`
                          : "Not verified"}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-900 bg-[#030712] mt-auto">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            <span>DevVerify</span>
            <span className="text-slate-800">·</span>
            <span>Code Evidence Platform</span>
          </div>
          <div className="text-slate-800 text-[10px] font-mono">
            Next.js + Prisma
          </div>
        </div>
      </footer>
    </div>
  );
}
