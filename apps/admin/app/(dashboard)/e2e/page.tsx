"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Play,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 1500;

type RunStatus = "idle" | "running" | "passed" | "failed";

interface StepSpec {
  title: string;
  assertion: string;
}

interface TestCaseSpec {
  id: string;
  name: string;
  testNamePattern: string;
  description: string;
  steps: StepSpec[];
  expectedFail?: boolean;
}

const EXAMPLE_TESTS: TestCaseSpec[] = [
  {
    id: "1",
    name: "Homepage loads",
    testNamePattern: "example 1: homepage loads",
    description: "Navigates to / and checks that app content is visible.",
    steps: [
      { title: "Navigate to /", assertion: "page.goto('/')" },
      { title: "Page shows app content", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "2",
    name: "Config page loads",
    testNamePattern: "example 2: config page loads",
    description: "Navigates to /config and checks config content.",
    steps: [
      { title: "Navigate to /config", assertion: "page.goto('/config')" },
      { title: "Config content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "3",
    name: "Workflow page loads",
    testNamePattern: "example 3: workflow page loads",
    description: "Navigates to /workflow and checks workflow content.",
    steps: [
      { title: "Navigate to /workflow", assertion: "page.goto('/workflow')" },
      { title: "Workflow content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "4",
    name: "Jira page loads",
    testNamePattern: "example 4: jira page loads",
    description: "Navigates to /jira and checks Jira content.",
    steps: [
      { title: "Navigate to /jira", assertion: "page.goto('/jira')" },
      { title: "Jira content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "5",
    name: "Zephyr page loads",
    testNamePattern: "example 5: zephyr page loads",
    description: "Navigates to /zephyr and checks Zephyr content.",
    steps: [
      { title: "Navigate to /zephyr", assertion: "page.goto('/zephyr')" },
      { title: "Zephyr content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "6",
    name: "Env page loads",
    testNamePattern: "example 6: env page loads",
    description: "Navigates to /env and checks environment variables content.",
    steps: [
      { title: "Navigate to /env", assertion: "page.goto('/env')" },
      { title: "Env content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "7",
    name: "Setup page loads",
    testNamePattern: "example 7: setup page loads",
    description: "Navigates to /setup and checks setup content.",
    steps: [
      { title: "Navigate to /setup", assertion: "page.goto('/setup')" },
      { title: "Setup content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "8",
    name: "E2E page loads",
    testNamePattern: "example 8: E2E page loads",
    description: "Navigates to /e2e and checks E2E content.",
    steps: [
      { title: "Navigate to /e2e", assertion: "page.goto('/e2e')" },
      { title: "E2E content is visible", assertion: "expect(...).toBeVisible()" },
    ],
  },
  {
    id: "9",
    name: "Non-existent heading (expected to fail)",
    testNamePattern: "example 9: non-existent heading",
    description: "Expects a heading that does not exist. This test is intended to fail.",
    steps: [
      { title: "Navigate to /", assertion: "page.goto('/')" },
      { title: "Expect heading that does not exist", assertion: "expect(...).toBeVisible()" },
    ],
    expectedFail: true,
  },
  {
    id: "10",
    name: "Wrong URL assertion (expected to fail)",
    testNamePattern: "example 10: wrong URL assertion",
    description: "Asserts URL is /workflow while on /config. This test is intended to fail.",
    steps: [
      { title: "Navigate to /config", assertion: "page.goto('/config')" },
      { title: "Expect URL to be /workflow", assertion: "expect(page).toHaveURL(/workflow/)" },
    ],
    expectedFail: true,
  },
];

interface StepResult {
  title: string;
  outcome: string;
}

interface TestResult {
  title: string;
  status: string;
  steps: StepResult[];
}

interface RunHistoryEntry {
  jobId: string;
  label: string;
  testNamePattern?: string;
}

interface RunDetail {
  status: RunStatus;
  exitCode: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  results: { tests: TestResult[] } | null;
}

function fullTextMatch(test: TestCaseSpec, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const name = test.name.toLowerCase();
  const desc = test.description.toLowerCase();
  const pattern = test.testNamePattern.toLowerCase();
  if (name.includes(q) || desc.includes(q) || pattern.includes(q)) return true;
  for (const step of test.steps) {
    if (
      step.title.toLowerCase().includes(q) ||
      step.assertion.toLowerCase().includes(q)
    ) {
      return true;
    }
  }
  return false;
}

export default function E2EPage() {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [runDetails, setRunDetails] = useState<Record<string, RunDetail>>({});
  const [runningJobIds, setRunningJobIds] = useState<Set<string>>(new Set());
  const runningJobIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredTests = useMemo(
    () => EXAMPLE_TESTS.filter((t) => fullTextMatch(t, searchQuery)),
    [searchQuery]
  );

  const selectedTest = useMemo(
    () => (selectedTestId ? EXAMPLE_TESTS.find((t) => t.id === selectedTestId) ?? null : null),
    [selectedTestId]
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollAllRunning = useCallback(async () => {
    const ids = Array.from(runningJobIdsRef.current);
    if (ids.length === 0) {
      stopPolling();
      return;
    }
    try {
      const res = await fetch(
        `/api/e2e/status?jobIds=${ids.map((id) => encodeURIComponent(id)).join(",")}`
      );
      if (!res.ok) {
        if (res.status === 404) return;
        throw new Error("Failed to fetch status");
      }
      const data = await res.json();
      const runs: RunDetail[] = data.runs
        ? (data.runs as Array<{ jobId?: string; status: string; exitCode?: number; startedAt?: string; finishedAt?: string; results?: { tests: TestResult[] } }>).map((r) => ({
            status: r.status as RunStatus,
            exitCode: r.exitCode ?? null,
            startedAt: r.startedAt ?? null,
            finishedAt: r.finishedAt ?? null,
            results: r.results ?? null,
          }))
        : [
            {
              status: data.status as RunStatus,
              exitCode: data.exitCode ?? null,
              startedAt: data.startedAt ?? null,
              finishedAt: data.finishedAt ?? null,
              results: data.results ?? null,
            },
          ];
      const jobIdList = data.runs
        ? (data.runs as Array<{ jobId?: string }>).map((r) => r.jobId ?? "")
        : data.jobId
          ? [data.jobId]
          : ids;
      setRunDetails((prev) => {
        const next = { ...prev };
        jobIdList.forEach((id: string, i: number) => {
          const run = runs[i] ?? runs[0];
          if (!run) return;
          next[id] = run;
        });
        return next;
      });
      const stillRunning = new Set<string>();
      jobIdList.forEach((id: string, i: number) => {
        const run = runs[i] ?? runs[0];
        if (run?.status === "running" && id) stillRunning.add(id);
        else if (id) runningJobIdsRef.current.delete(id);
      });
      runningJobIdsRef.current = stillRunning;
      setRunningJobIds(stillRunning);
      if (stillRunning.size === 0) {
        stopPolling();
        const anyPassed = runs.some((r) => r.status === "passed");
        const anyFailed = runs.some((r) => r.status === "failed");
        if (anyPassed && !anyFailed) toast.success("E2E run passed");
        else if (anyFailed) toast.error("E2E run failed");
      }
    } catch {
      stopPolling();
      toast.error("Failed to get E2E run status");
    }
  }, [stopPolling]);

  const startRun = useCallback(
    (label: string, testNamePattern?: string) => {
      fetch("/api/e2e/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testFile: "e2e/examples.spec.ts",
          ...(testNamePattern ? { testNamePattern } : {}),
        }),
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            jobId?: string;
            error?: string;
          };
          if (!res.ok) {
            toast.error(data.error ?? "Failed to start E2E test");
            return;
          }
          if (res.status === 202 && data.jobId) {
            const jobId = data.jobId;
            runningJobIdsRef.current.add(jobId);
            setRunHistory((prev) => [
              { jobId, label, testNamePattern },
              ...prev,
            ]);
            setRunDetails((prev) => ({
              ...prev,
              [jobId]: {
                status: "running",
                exitCode: null,
                startedAt: new Date().toISOString(),
                finishedAt: null,
                results: null,
              },
            }));
            setRunningJobIds(new Set(runningJobIdsRef.current));
            toast.info("E2E test started in background");
            if (!pollRef.current) {
              pollAllRunning();
              pollRef.current = setInterval(
                pollAllRunning,
                POLL_INTERVAL_MS
              );
            }
          }
        })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to start"
          );
        });
    },
    [pollAllRunning]
  );

  const handleRunAll = useCallback(() => {
    startRun("Run all (10 tests)");
  }, [startRun]);

  const handleRunSelected = useCallback(() => {
    if (!selectedTest) return;
    startRun(selectedTest.name, selectedTest.testNamePattern);
  }, [selectedTest, startRun]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back to home"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              E2E Run (headless)
            </h1>
            <p className="text-sm text-muted-foreground">
              Run Playwright tests. Target:{" "}
              <code className="rounded bg-muted px-1">localhost:3000</code>
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left: test list + search */}
        <aside className="flex w-[360px] shrink-0 flex-col border-r bg-muted/30">
          <div className="border-b p-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search by name or step…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search tests by name or step"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""}
            </p>
          </div>
          <nav className="flex-1 overflow-auto p-2" aria-label="Test list">
            <ul className="space-y-0.5">
              {filteredTests.map((test) => {
                const isSelected = selectedTestId === test.id;
                return (
                  <li key={test.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTestId(test.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      aria-label={`Select ${test.name}`}
                      aria-current={isSelected ? "true" : undefined}
                    >
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${isSelected ? "opacity-90" : "text-muted-foreground"}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {test.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filteredTests.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No tests match &quot;{searchQuery}&quot;
              </p>
            )}
          </nav>
        </aside>

        {/* Right: runner + run history */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 min-h-0 flex-col gap-4 p-6 overflow-auto">
            {/* Selected test detail + run */}
            <Card className="shrink-0">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle>Runner</CardTitle>
                  <CardDescription>
                    {selectedTest
                      ? `Run "${selectedTest.name}" or run all 10 example tests.`
                      : "Select a test on the left to run it, or run all below."}
                    {runningJobIds.size > 0 && (
                      <span className="mt-1 block text-amber-600 dark:text-amber-500">
                        {runningJobIds.size} run{runningJobIds.size !== 1 ? "s" : ""} in progress
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    onClick={handleRunAll}
                    aria-label="Run all E2E tests headless"
                  >
                    <Play className="mr-2 h-4 w-4" aria-hidden />
                    Run all
                  </Button>
                  {selectedTest && (
                    <Button
                      variant="secondary"
                      onClick={handleRunSelected}
                      aria-label={`Run ${selectedTest.name} headless`}
                    >
                      <Play className="mr-2 h-4 w-4" aria-hidden />
                      Run selected
                    </Button>
                  )}
                </div>
              </CardHeader>
              {selectedTest && (
                <CardContent className="border-t pt-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">{selectedTest.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTest.description}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Steps & assertions
                      </div>
                      <ul className="space-y-1.5">
                        {selectedTest.steps.map((step, stepIndex) => (
                          <li
                            key={`${selectedTest.id}-${stepIndex}`}
                            className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs"
                          >
                            <span className="font-medium text-foreground">
                              {step.title}
                            </span>
                            <div className="mt-0.5 text-muted-foreground">
                              {step.assertion}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Run history */}
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader>
                <CardTitle>Run history</CardTitle>
                <CardDescription>
                  Expand each run to see steps and assertions. New runs appear at
                  the top.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-auto">
                {runHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                    <Circle className="mb-2 h-8 w-8" aria-hidden />
                    <p>No runs yet. Run a test or &quot;Run all&quot; above.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {runHistory.map((entry) => {
                      const detail = runDetails[entry.jobId];
                      const status = detail?.status ?? "idle";
                      const isRunning = status === "running";

                      return (
                        <AccordionItem
                          key={entry.jobId}
                          value={entry.jobId}
                          className="rounded-lg border bg-card"
                        >
                          <AccordionTrigger className="flex items-center gap-2 p-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                            <span className="flex-1 text-left font-medium">
                              {entry.label}
                            </span>
                            {isRunning && (
                              <Loader2
                                className="h-5 w-5 shrink-0 animate-spin text-muted-foreground"
                                aria-label="Running"
                              />
                            )}
                            {status === "passed" && (
                              <CheckCircle2
                                className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500"
                                aria-label="Passed"
                              />
                            )}
                            {status === "failed" && (
                              <XCircle
                                className="h-5 w-5 shrink-0 text-destructive"
                                aria-label="Failed"
                              />
                            )}
                            {!detail && (
                              <Circle
                                className="h-5 w-5 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                            )}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="border-t px-4 pb-4 pt-2">
                              {detail && (
                                <>
                                  <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    {detail.startedAt && (
                                      <span>
                                        Started:{" "}
                                        {new Date(
                                          detail.startedAt
                                        ).toLocaleString()}
                                      </span>
                                    )}
                                    {detail.finishedAt && (
                                      <span>
                                        Finished:{" "}
                                        {new Date(
                                          detail.finishedAt
                                        ).toLocaleString()}
                                      </span>
                                    )}
                                    {detail.exitCode != null && (
                                      <span>
                                        Exit code: {detail.exitCode}
                                      </span>
                                    )}
                                  </div>
                                  {detail.results?.tests &&
                                    detail.results.tests.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                          Tests & steps
                                        </div>
                                        {detail.results.tests.map((testResult) => (
                                            <div
                                              key={testResult.title}
                                              className="rounded-md bg-muted/40 p-3 text-sm"
                                            >
                                              <div className="mb-2 flex items-center gap-2 font-medium">
                                                {testResult.status ===
                                                "passed" ? (
                                                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                                                ) : (
                                                  <XCircle className="h-4 w-4 text-destructive" />
                                                )}
                                                {testResult.title}
                                              </div>
                                              <ul className="space-y-1 pl-6">
                                                {testResult.steps.map(
                                                  (step, stepIndex) => {
                                                    const outcome =
                                                      step.outcome;
                                                    const passed =
                                                      outcome === "passed" ||
                                                      outcome === "expected";
                                                    const failed =
                                                      outcome === "failed" ||
                                                      outcome === "unexpected" ||
                                                      outcome === "timedOut";
                                                    return (
                                                      <li
                                                        key={`${step.title}-${stepIndex}`}
                                                        className="flex items-start gap-2 font-mono text-xs"
                                                      >
                                                        <span
                                                          className="shrink-0 mt-0.5"
                                                          aria-hidden
                                                        >
                                                          {passed && (
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                                                          )}
                                                          {failed && (
                                                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                                                          )}
                                                          {!passed &&
                                                            !failed && (
                                                              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                                                            )}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                          {step.title}
                                                        </span>
                                                      </li>
                                                    );
                                                  }
                                                )}
                                              </ul>
                                            </div>
                                        ))}
                                      </div>
                                    )}
                                </>
                              )}
                              {!detail?.results?.tests?.length &&
                                !isRunning && (
                                  <p className="text-sm text-muted-foreground">
                                    No result details for this run.
                                  </p>
                                )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
