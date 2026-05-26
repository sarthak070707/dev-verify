"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

export default function DevVerifyDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const activeClaim = claims.find((c) => c.id === activeClaimId) || null;

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
        // If no user found, seed the database
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
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "PENDING":
        return <Clock className="h-3.5 w-3.5" />;
      case "FAILED":
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "PENDING":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "FAILED":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <motion.div
              className="absolute -inset-2 rounded-2xl border border-indigo-500/30"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Initializing DevVerify</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight tracking-tight">
                DevVerify
              </span>
              <span className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">
                Code Evidence Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-slate-700 text-slate-400 bg-slate-900/50 gap-1.5 text-xs"
            >
              <Activity className="h-3 w-3 text-emerald-400" />
              {claims.filter((c) => c.status === "VERIFIED").length} Verified
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 gap-1.5 text-xs"
              onClick={seedAndLoad}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Reset Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-full">
          {/* Left Column - Portfolio Hub */}
          <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4 sm:gap-5">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                {/* Gradient glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/8 to-transparent rounded-tr-full" />

                <div className="relative flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-indigo-500/20">
                    {user?.name?.charAt(0) || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg leading-tight truncate">
                      {user?.name || "Sarthak Arya"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Full-Stack Developer
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Github className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-500 text-xs font-mono truncate">
                        {user?.email || "sarthak@devverify.io"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4 bg-slate-800" />

                <div className="grid grid-cols-3 gap-3 relative">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {claims.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                      Claims
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-emerald-400">
                      {claims.filter((c) => c.status === "VERIFIED").length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                      Verified
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-400">
                      {claims.filter((c) => c.status === "PENDING").length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                      Pending
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Claims List Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-300">
                  Resume Claims
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-600">
                {claims.length} total
              </span>
            </div>

            {/* Claims List */}
            <ScrollArea className="flex-1 max-h-[calc(100vh-22rem)] lg:max-h-[calc(100vh-22rem)]">
              <div className="flex flex-col gap-2.5 pr-1">
                <AnimatePresence mode="popLayout">
                  {claims.map((claim, index) => (
                    <motion.div
                      key={claim.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: index * 0.05 }}
                    >
                      <button
                        onClick={() => setActiveClaimId(claim.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all duration-200 group ${
                          activeClaimId === claim.id
                            ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5"
                            : "bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              activeClaimId === claim.id
                                ? "bg-indigo-500/20"
                                : "bg-slate-800"
                            }`}
                          >
                            <FileCode2
                              className={`h-4 w-4 ${
                                activeClaimId === claim.id
                                  ? "text-indigo-400"
                                  : "text-slate-500"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug line-clamp-2 ${
                                activeClaimId === claim.id
                                  ? "text-white"
                                  : "text-slate-300"
                              }`}
                            >
                              {claim.bulletText}
                            </p>
                            <div className="flex items-center gap-2 mt-2.5">
                              <div className="flex items-center gap-1 text-slate-500">
                                <GitBranch className="h-3 w-3" />
                                <span className="text-[11px] font-mono truncate max-w-[120px]">
                                  {claim.githubRepo}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2.5">
                              <span className="text-[11px] font-mono text-slate-600 truncate max-w-[160px]">
                                {claim.filePath}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 gap-0.5 ${getStatusBadgeClass(claim.status)}`}
                              >
                                {getStatusIcon(claim.status)}
                                {claim.status}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 mt-2 shrink-0 transition-colors ${
                              activeClaimId === claim.id
                                ? "text-indigo-400"
                                : "text-slate-700 group-hover:text-slate-500"
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

          {/* Right Column - Live Evidence Canvas */}
          <div className="lg:col-span-8 xl:col-span-8">
            <AnimatePresence mode="wait">
              {!activeClaim ? (
                /* Empty State */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="h-full min-h-[60vh] lg:min-h-[calc(100vh-8rem)] bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8"
                >
                  <div className="relative">
                    <div className="h-24 w-24 rounded-2xl bg-slate-800/80 flex items-center justify-center">
                      <Code2 className="h-12 w-12 text-slate-600" />
                    </div>
                    <motion.div
                      className="absolute -inset-3 rounded-2xl border border-slate-700/30"
                      animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  </div>
                  <h3 className="text-slate-300 font-semibold text-lg mt-6">
                    Select a Claim to Inspect
                  </h3>
                  <p className="text-slate-500 text-sm mt-2 text-center max-w-sm">
                    Click on any resume claim from the left panel to view its
                    code evidence, metrics, and verification status.
                  </p>
                  <div className="flex items-center gap-2 mt-6 text-slate-600 text-xs">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Pick a claim to begin</span>
                  </div>
                </motion.div>
              ) : (
                /* Active Claim Detail */
                <motion.div
                  key={activeClaim.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 sm:gap-5"
                >
                  {/* Claim Header */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 ${getStatusBadgeClass(activeClaim.status)}`}
                          >
                            {getStatusIcon(activeClaim.status)}
                            {activeClaim.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-400 bg-slate-800/50 text-xs gap-1"
                          >
                            <GitBranch className="h-3 w-3" />
                            {activeClaim.githubRepo}
                          </Badge>
                        </div>
                        <p className="text-white text-sm sm:text-base leading-relaxed">
                          {activeClaim.bulletText}
                        </p>
                      </div>
                      {activeClaim.status === "PENDING" && (
                        <Button
                          onClick={() => handleVerify(activeClaim.id)}
                          disabled={isVerifying}
                          className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white border-0 shadow-lg shadow-indigo-500/20 gap-2 shrink-0"
                          size="sm"
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                          {isVerifying ? "Verifying..." : "Verify Claim"}
                        </Button>
                      )}
                      {activeClaim.status === "VERIFIED" && (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics & Code Area */}
                  {activeClaim.analysisResult ? (
                    <div className="flex flex-col gap-4 sm:gap-5">
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Hash className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Lines
                            </span>
                          </div>
                          <div className="text-white font-bold text-lg">
                            {activeClaim.analysisResult.linesOfCode}
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Complexity
                            </span>
                          </div>
                          <div
                            className={`font-bold text-lg ${getComplexityColor(activeClaim.analysisResult.complexity)}`}
                          >
                            {activeClaim.analysisResult.complexity}
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Braces className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Language
                            </span>
                          </div>
                          <div className="text-white font-bold text-sm leading-tight">
                            {activeClaim.analysisResult.language}
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Functions
                            </span>
                          </div>
                          <div className="text-white font-bold text-lg">
                            {activeClaim.analysisResult.metrics.functions}
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Code2 className="h-3.5 w-3.5 text-violet-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Imports
                            </span>
                          </div>
                          <div className="text-white font-bold text-lg">
                            {activeClaim.analysisResult.metrics.imports}
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Error Handling
                            </span>
                          </div>
                          <div className="text-white font-bold text-lg">
                            {activeClaim.analysisResult.metrics.errorHandling}
                          </div>
                        </motion.div>
                      </div>

                      {/* IDE Code Viewer */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden"
                      >
                        {/* Window Chrome */}
                        <div className="flex items-center justify-between px-4 h-11 bg-slate-900 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="h-3 w-3 rounded-full bg-red-500/80" />
                              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <Separator
                              orientation="vertical"
                              className="h-5 mx-2 bg-slate-700"
                            />
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <FileCode2 className="h-3.5 w-3.5" />
                              <span className="text-xs font-mono">
                                {activeClaim.filePath}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[9px] h-5 px-1.5 gap-0.5 ${getStatusBadgeClass(activeClaim.status)}`}
                            >
                              {getStatusIcon(activeClaim.status)}
                              {activeClaim.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Code Content */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/3 via-transparent to-emerald-500/3 pointer-events-none" />
                          <ScrollArea className="max-h-[calc(100vh-30rem)] min-h-[300px]">
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
                                padding: "1.25rem",
                                fontSize: "0.75rem",
                                lineHeight: "1.65",
                              }}
                              showLineNumbers
                              lineNumberStyle={{
                                minWidth: "2.5em",
                                paddingRight: "1em",
                                color: "rgb(71 85 105)",
                                userSelect: "none",
                              }}
                              wrapLines
                              lineProps={() => ({
                                style: {
                                  display: "block",
                                },
                              })}
                            >
                              {activeClaim.analysisResult.codeSnippet}
                            </SyntaxHighlighter>
                          </ScrollArea>
                        </div>

                        {/* Footer Bar */}
                        <div className="flex items-center justify-between px-4 h-8 bg-slate-900 border-t border-slate-800">
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <span className="font-mono">
                              {activeClaim.analysisResult.language}
                            </span>
                            <span>UTF-8</span>
                            <span>
                              {activeClaim.analysisResult.linesOfCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            Verified at{" "}
                            {new Date(
                              activeClaim.analysisResult.verifiedAt
                            ).toLocaleTimeString()}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    /* Unverified State - IDE Skeleton */
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden"
                    >
                      {/* Window Chrome */}
                      <div className="flex items-center justify-between px-4 h-11 bg-slate-900 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full bg-red-500/80" />
                            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                          </div>
                          <Separator
                            orientation="vertical"
                            className="h-5 mx-2 bg-slate-700"
                          />
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <FileCode2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-mono">
                              {activeClaim.filePath}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] h-5 px-1.5 gap-0.5 ${getStatusBadgeClass(activeClaim.status)}`}
                        >
                          {getStatusIcon(activeClaim.status)}
                          {activeClaim.status}
                        </Badge>
                      </div>

                      {/* Pending Content */}
                      <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-8">
                        <div className="h-16 w-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-5">
                          <Terminal className="h-8 w-8 text-slate-600" />
                        </div>
                        <h3 className="text-slate-300 font-semibold text-base">
                          Awaiting Verification
                        </h3>
                        <p className="text-slate-500 text-sm mt-2 text-center max-w-sm">
                          Click the &quot;Verify Claim&quot; button to analyze
                          the code and generate evidence for this resume claim.
                        </p>
                        <Button
                          onClick={() => handleVerify(activeClaim.id)}
                          disabled={isVerifying}
                          className="mt-6 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white border-0 shadow-lg shadow-indigo-500/20 gap-2"
                          size="sm"
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                          {isVerifying ? "Analyzing..." : "Verify Now"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>DevVerify</span>
            <span className="text-slate-700">·</span>
            <span>Code Evidence Platform</span>
          </div>
          <div className="text-slate-700 text-xs">
            Built with Next.js + Prisma
          </div>
        </div>
      </footer>
    </div>
  );
}
