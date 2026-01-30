import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Calendar, Cpu, Database, ExternalLink, ChevronLeft, ChevronRight, Loader2, LogsIcon } from "lucide-react";
import {
  fetchSession,
  normalizeValidationResultsPayload,
  type ApiValidationCategory,
} from "../utils/dataHandlerAPI";

const ARTICLES_PER_PAGE = 5;
const HIGH_CONFIDENCE_THRESHOLD = 0.65;

const findingBadgeThemes: Record<string, string> = {
  Consistent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Some Conflict": "border-amber-200 bg-amber-50 text-amber-700",
  Inconsistent: "border-rose-200 bg-rose-50 text-rose-700",
};

const resolveFindingBadgeClass = (label: string): string => {
  return findingBadgeThemes[label] ?? "border-border bg-muted text-muted-foreground";
};

const normalizeScore = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const formatScore = (value: unknown): string => {
  const normalized = normalizeScore(value);
  return normalized !== null ? (normalized * 10).toFixed(2) : "—";
};

const resolveFindingLabel = (averageScore: number): string => {
  const scaled = averageScore * 10;
  if (scaled >= 6.5) {
    return "Consistent";
  }
  if (scaled >= 5) {
    return "Some Conflict";
  }
  if (scaled < 5) {
    return "Inconsistent";
  }
  return "Some Conflict";
};

const makeCategoryKey = (sessionId: string, category: string) => `${sessionId}::${category}`;
const makeEvidenceKey = (sessionId: string, category: string, subIndex: number) => `${sessionId}::${category}::${subIndex}`;

interface Session {
  id: string;
  hypothesis: string;
  modelProvider: string;
  model: string;
  timestamp: Date;
  resultsCount: number;
  categories?: ApiValidationCategory[];
}

interface UserSessionHistoryDialogProps {
  userName: string;
  sessions: Session[];
  onClose: () => void;
  onShowExplanation?: (
    sessionId: string,
    explanation: string,
    paperNo: number,
    paperTitle?: string,
    hypothesis?: string
  ) => void;
  openSessionId?: string | null;
  openPaperNo?: number | null;
}

export function UserSessionHistoryDialog({
  userName,
  sessions,
  onClose,
  onShowExplanation,
  openSessionId = null,
  openPaperNo = null,
}: UserSessionHistoryDialogProps) {
  const [sessionResults, setSessionResults] = useState<Record<string, ApiValidationCategory[]>>({});
  const [loadingSessions, setLoadingSessions] = useState<Record<string, boolean>>({});
  const [categoryIndexMap, setCategoryIndexMap] = useState<Record<string, number>>({});
  const [evidencePageMap, setEvidencePageMap] = useState<Record<string, number>>({});
  const [openAccordionValue, setOpenAccordionValue] = useState<string | undefined>(undefined);
  const [autoFiredFor, setAutoFiredFor] = useState<string | null>(null);

  const initializeSessionState = useCallback((sessionId: string, categories: ApiValidationCategory[]) => {
    setCategoryIndexMap((prev) => {
      const next = { ...prev };
      for (const category of categories) {
        const key = makeCategoryKey(sessionId, category.category);
        if (!(key in next)) {
          next[key] = 0;
        }
      }
      return next;
    });

    setEvidencePageMap((prev) => {
      const next = { ...prev };
      for (const category of categories) {
        category.subHypothesisList.forEach((_, idx) => {
          const key = makeEvidenceKey(sessionId, category.category, idx);
          if (!(key in next)) {
            next[key] = 0;
          }
        });
      }
      return next;
    });
  }, []);

  const ensureSessionLoaded = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      return;
    }
    if (sessionResults[sessionId] || loadingSessions[sessionId]) {
      return;
    }

    setLoadingSessions((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const fetched = await fetchSession(String(sessionId));
      const normalized = normalizeValidationResultsPayload(fetched.results ?? null);
      setSessionResults((prev) => ({ ...prev, [sessionId]: normalized }));
      initializeSessionState(sessionId, normalized);
    } catch (_error) {
      setSessionResults((prev) => ({ ...prev, [sessionId]: [] }));
    } finally {
      setLoadingSessions((prev) => {
        const { [sessionId]: _omit, ...rest } = prev;
        return rest;
      });
    }
  }, [initializeSessionState, loadingSessions, sessionResults]);

  useEffect(() => {
    const seeds: Record<string, ApiValidationCategory[]> = {};
    for (const session of sessions) {
      if (session.categories && session.categories.length > 0 && !sessionResults[session.id]) {
        seeds[session.id] = session.categories;
      }
    }
    const ids = Object.keys(seeds);
    if (ids.length === 0) {
      return;
    }
    setSessionResults((prev) => ({ ...prev, ...seeds }));
    for (const id of ids) {
      initializeSessionState(id, seeds[id]);
    }
  }, [sessions, sessionResults, initializeSessionState]);

  useEffect(() => {
    if (!openSessionId) {
      return;
    }
    const value = `session-${openSessionId}`;
    setOpenAccordionValue(value);
    ensureSessionLoaded(String(openSessionId));
  }, [openSessionId, ensureSessionLoaded]);

  useEffect(() => {
    if (!openSessionId || openPaperNo == null || !onShowExplanation) {
      return;
    }
    const categories = sessionResults[String(openSessionId)];
    if (!categories || categories.length === 0) {
      return;
    }
    const firedKey = `${openSessionId}:${openPaperNo}`;
    if (autoFiredFor === firedKey) {
      return;
    }

    for (const category of categories) {
      for (const sub of category.subHypothesisList) {
        const match = sub.scoredArticles.find((article) => article.no === openPaperNo);
        if (match) {
          const session = sessions.find((s) => String(s.id) === String(openSessionId));
          onShowExplanation(
            String(openSessionId),
            match.explanation,
            match.no,
            match.title,
            session?.hypothesis
          );
          setAutoFiredFor(firedKey);
          return;
        }
      }
    }
  }, [openSessionId, openPaperNo, sessionResults, onShowExplanation, sessions, autoFiredFor]);

  const handleAccordionChange = (value: string | undefined) => {
    setOpenAccordionValue(value || undefined);
    if (!value) {
      return;
    }
    const match = value.match(/^session-(.+)$/);
    if (match?.[1]) {
      ensureSessionLoaded(match[1]);
    }
  };

  const handleCategoryNavigate = useCallback((sessionId: string, category: string, direction: number, total: number) => {
    if (total <= 0) {
      return;
    }
    const key = makeCategoryKey(sessionId, category);
    setCategoryIndexMap((prev) => {
      const next = { ...prev };
      const current = next[key] ?? 0;
      const wrapped = ((current + direction) % total + total) % total;
      next[key] = wrapped;
      return next;
    });
  }, []);

  const handleEvidencePageChange = useCallback((sessionId: string, category: string, subIndex: number, direction: number, totalPages: number) => {
    if (totalPages <= 0) {
      return;
    }
    const key = makeEvidenceKey(sessionId, category, subIndex);
    setEvidencePageMap((prev) => {
      const next = { ...prev };
      const current = next[key] ?? 0;
      let target = current + direction;
      if (target < 0) {
        target = totalPages - 1;
      } else if (target >= totalPages) {
        target = 0;
      }
      next[key] = target;
      return next;
    });
  }, []);

  const renderAnalysisResults = useCallback((session: Session, categories: ApiValidationCategory[]) => {
    if (!categories || categories.length === 0) {
      return (
        <Card className="border border-dashed border-border/70 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground md:text-lg">Analysis Results</CardTitle>
            <CardDescription>No validation results are available for this session.</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return categories.map((category) => {
      const totalSubHypotheses = category.subHypothesisList.length;
      if (totalSubHypotheses === 0) {
        return (
          <Card
            key={`${session.id}-${category.category}-empty`}
            className="border border-dashed border-border/70 bg-white/80 shadow-sm backdrop-blur"
          >
            <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-white/70">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-foreground md:text-lg">{category.category}</CardTitle>
                <CardDescription>No sub-hypotheses selected for this category.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        );
      }

      const categoryKey = makeCategoryKey(session.id, category.category);
      const activeIndexRaw = categoryIndexMap[categoryKey] ?? 0;
      const activeIndex = Math.min(Math.max(activeIndexRaw, 0), totalSubHypotheses - 1);
      const activeSubHypothesis = category.subHypothesisList[activeIndex];

      const evidenceKey = makeEvidenceKey(session.id, category.category, activeIndex);
      const totalPages = Math.max(1, Math.ceil(activeSubHypothesis.scoredArticles.length / ARTICLES_PER_PAGE));
      const currentPageRaw = evidencePageMap[evidenceKey] ?? 0;
      const currentPage = Math.min(Math.max(currentPageRaw, 0), totalPages - 1);
      const start = currentPage * ARTICLES_PER_PAGE;
      const paginatedArticles = activeSubHypothesis.scoredArticles.slice(start, start + ARTICLES_PER_PAGE);

      const maxEvidenceCount = Math.max(
        ...category.subHypothesisList.map((sub) => sub.scoredArticles.length),
        0
      );
      const evidenceHeaders = Array.from({ length: maxEvidenceCount }, (_, idx) => `Evidence ${idx + 1}`);
      const isMolecularCategory = /molecular/i.test(category.category);
      const trimmedGraphSvg = typeof category.graphSvg === "string" ? category.graphSvg.trim() : "";
      const hasGraphSvg = isMolecularCategory && trimmedGraphSvg.length > 0;

      const normalizedAverage = normalizeScore(activeSubHypothesis.averageScore) ?? 0;
      const averageScoreDisplay = formatScore(activeSubHypothesis.averageScore);
      const findingLabel = resolveFindingLabel(normalizedAverage);
      const findingBadgeClass = resolveFindingBadgeClass(findingLabel);
      const totalEvidence = activeSubHypothesis.scoredArticles.length;
      const highConfidenceCount = activeSubHypothesis.scoredArticles.filter((article) => {
        const score = normalizeScore(article.score);
        return score !== null && score >= HIGH_CONFIDENCE_THRESHOLD;
      }).length;
      const highConfidenceShare = totalEvidence > 0 ? Math.round((highConfidenceCount / totalEvidence) * 100) : 0;

      return (
        <Card
          key={`${session.id}-${category.category}`}
          className="overflow-hidden border border-border/60 bg-white/90 shadow-xl backdrop-blur-sm mt-4"
        >
          <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-white/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-foreground md:text-lg">{category.category} Level Sub-Hypothesis Results</CardTitle>
                <CardDescription>
                  Reviewing {totalSubHypotheses} sub-hypothesis
                  {totalSubHypotheses === 1 ? "" : "es"} with {totalEvidence} evidence item
                  {totalEvidence === 1 ? "" : "s"} in focus.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary/80">
                  Article {activeIndex + 1} / {totalSubHypotheses}
                </Badge>
                {totalSubHypotheses > 1 && (
                  <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/70 p-1 shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      onClick={() => handleCategoryNavigate(session.id, category.category, -1, totalSubHypotheses)}
                      aria-label="Previous sub-hypothesis"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                      onClick={() => handleCategoryNavigate(session.id, category.category, 1, totalSubHypotheses)}
                      aria-label="Next sub-hypothesis"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-10 pt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Average Confidence</p>
                <p className="mt-2 text-3xl font-semibold text-primary">{averageScoreDisplay}</p>
                <p className="text-xs text-primary/70">Weighted 0-10 score for the active sub-hypothesis.</p>
              </div>
              <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Evidence Coverage</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-secondary">{totalEvidence}</span>
                  <span className="text-sm text-secondary/80">items</span>
                </div>
                <p className="text-xs text-secondary/70">{highConfidenceShare}% rated &gt;= 6.5 / 10</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/90 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Finding Classification</p>
                <Badge variant="outline" className={`mt-2 px-3 py-1 text-sm font-semibold ${findingBadgeClass}`}>
                  {findingLabel}
                </Badge>
                <p className="mt-2 text-xs text-muted-foreground">
                  {findingLabel === "Consistent"
                    ? "Evidence aligns strongly with the hypothesis."
                    : findingLabel === "Inconsistent"
                      ? "Evidence challenges the current hypothesis direction."
                      : "Mixed evidence observed across the available literature."}
                </p>
              </div>
            </div>

            <Card className="border border-border/60 bg-white/95 shadow-sm">
              <CardHeader className="rounded-t-xl border-b border-border/60 bg-background/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-base font-semibold text-foreground md:text-lg">
                      {activeSubHypothesis.subHypothesisTitle}
                    </CardTitle>
                    {activeSubHypothesis.rationale && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {activeSubHypothesis.rationale}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary/80">
                    {totalEvidence} Evidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="overflow-hidden rounded-xl border border-border/50 shadow-sm">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted/60 uppercase text-xs font-semibold tracking-wide text-muted-foreground">
                        <TableHead className="w-16">No.</TableHead>
                        <TableHead className="min-w-[280px]">Paper Title</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Relevance</TableHead>
                        <TableHead>Plausibility</TableHead>
                        <TableHead>Novelty</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead>Main Finding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedArticles.length > 0 ? (
                        paginatedArticles.map((article) => (
                          <TableRow
                            key={`${session.id}-${category.category}-${article.id}-${article.no}`}
                            className="transition-colors hover:bg-primary/5"
                          >
                            <TableCell className="font-medium text-muted-foreground">{article.no}</TableCell>
                            <TableCell className="font-medium text-foreground">{article.title}</TableCell>
                            <TableCell className="text-muted-foreground">{article.year}</TableCell>
                            <TableCell>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-primary">
                                    {formatScore(article.quality)}
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-72 text-sm">
                                  <div className="space-y-3">
                                    <div>
                                      <p className="font-semibold text-foreground">Quality Breakdown</p>
                                      <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Design Type: {article.designType}</span>
                                          <span className="font-medium">{formatScore(article.design)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Sample Size: {article.sampleSize}</span>
                                          <span className="font-medium">{formatScore(article.sample)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Recency (Year): {article.year}</span>
                                          <span className="font-medium">{formatScore(article.recency)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Citation Count: {article.citationCount}</span>
                                          <span className="font-medium">{formatScore(article.citation)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <pre className="max-w-2xl whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-xs font-mono leading-relaxed text-muted-foreground">
                                      {article.qualityExplanation}
                                    </pre>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-md bg-secondary/10 px-2 py-1 text-secondary">
                                {formatScore(article.relevance)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-1 text-accent">
                                {formatScore(article.plausibility)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-primary">
                                {formatScore(article.novelty)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-md bg-gradient-to-r from-primary to-accent px-2 py-1 text-white">
                                {formatScore(article.score)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <a
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary transition-colors hover:text-primary/80"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() =>
                                  onShowExplanation?.(
                                    String(session.id),
                                    article.explanation,
                                    article.no,
                                    article.title,
                                    session.hypothesis
                                  )
                                }
                                variant="outline"
                                size="sm"
                                className="border-primary/50 text-primary transition-colors hover:bg-primary/5"
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="py-6 text-center text-sm text-muted-foreground">
                            No evidence found for this sub-hypothesis.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleEvidencePageChange(session.id, category.category, activeIndex, -1, totalPages)
                      }
                      aria-label="Previous evidence page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleEvidencePageChange(session.id, category.category, activeIndex, 1, totalPages)
                      }
                      aria-label="Next evidence page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-white/95 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-background/60">
                <CardTitle className="text-base font-semibold text-foreground md:text-lg">
                  {category.category} Level Sub-Hypothesis Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-hidden rounded-xl border border-border/50 shadow-sm">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted/60 uppercase text-xs font-semibold tracking-wide text-muted-foreground">
                        <TableHead className="min-w-[220px]">Sub-Hypothesis</TableHead>
                        {evidenceHeaders.map((label) => (
                          <TableHead key={`${session.id}-${category.category}-${label}`}>{label}</TableHead>
                        ))}
                        <TableHead>Average Score</TableHead>
                        <TableHead>Finding</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.subHypothesisList.map((sub, subIndex) => {
                        const subAverage = normalizeScore(sub.averageScore) ?? 0;
                        const subLabel = resolveFindingLabel(subAverage);
                        const subBadgeClass = resolveFindingBadgeClass(subLabel);
                        return (
                          <TableRow
                            key={`${session.id}-${category.category}-${sub.subHypothesisTitle}`}
                            className="transition-colors hover:bg-muted/40"
                          >
                            <TableCell className="font-medium text-foreground">{sub.subHypothesisTitle}</TableCell>
                            {evidenceHeaders.map((_, idx) => {
                              const article = sub.scoredArticles[idx];
                              return (
                                <TableCell key={`${session.id}-${category.category}-${subIndex}-evidence-${idx}`}>
                                  {article ? formatScore(article.score) : "—"}
                                </TableCell>
                              );
                            })}
                            <TableCell>
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 px-2 py-0.5 text-primary/80">
                                {formatScore(sub.averageScore)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {sub.finding ? (
                                sub.finding
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${subBadgeClass}`}
                                >
                                  {subLabel}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[220px] text-muted-foreground">
                              {sub.description ? sub.description : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {hasGraphSvg && (
              <Card className="border border-border/60 bg-white/95 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-background/60">
                  <CardTitle className="text-base font-semibold text-foreground md:text-lg">
                    Molecular Sub-Hypothesis Interaction Graph
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pt-4">
                  <div className="w-full overflow-auto">
                    <img
                      src={`${trimmedGraphSvg}`}
                      alt="Molecular sub-hypothesis graph"
                      className="mx-auto h-auto w-full max-w-full"
                      loading="lazy"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      );
    });
  }, [categoryIndexMap, evidencePageMap, handleCategoryNavigate, handleEvidencePageChange, onShowExplanation]);

  const renderedSessions = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    return sessions.map((session) => {
      const categories = sessionResults[session.id] ?? session.categories ?? [];
      const isLoading = Boolean(loadingSessions[session.id]) && categories.length === 0;

      return (
        <AccordionItem
          key={session.id}
          value={`session-${session.id}`}
          className="border-2 rounded-lg mb-3 px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-start justify-between gap-4 flex-1 text-left">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Session #{session.id}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {session.timestamp.toLocaleDateString()} {session.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm mt-2">{session.hypothesis}</p>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <div className="text-xs">
                  <p className="text-muted-foreground">Provider</p>
                  <p className="capitalize">{session.modelProvider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-secondary" />
                <div className="text-xs">
                  <p className="text-muted-foreground">Model</p>
                  <p className="uppercase">{session.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" />
                <div className="text-xs">
                  <p className="text-muted-foreground">Results</p>
                  <p>{session.resultsCount} papers</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Analysis Results
              </h4>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-white/80 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading session results…
                </div>
              ) : (
                renderAnalysisResults(session, categories)
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    });
  }, [sessions, sessionResults, loadingSessions, renderAnalysisResults]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session History - {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No sessions found for this user</div>
          ) : (
            <Accordion
              type="single"
              collapsible
              className="w-full"
              value={openAccordionValue}
              onValueChange={handleAccordionChange}
            >
              {renderedSessions}
            </Accordion>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
