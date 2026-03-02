import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const E2E_RUN_FILE_PREFIX = "e2e-run-";

interface E2EStepResult {
  title: string;
  outcome: "passed" | "failed" | "skipped" | "unexpected" | "timedOut";
}

interface E2ETestResult {
  title: string;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  steps: E2EStepResult[];
}

interface E2ERunData {
  jobId: string;
  status: "running" | "passed" | "failed";
  pid?: number;
  exitCode?: number;
  startedAt: string;
  finishedAt?: string;
  results?: { tests: E2ETestResult[] };
}

const getMonorepoRoot = (): string => {
  const workspaceRoot = process.cwd();
  return join(workspaceRoot, "..", "..");
};

const getRunFilePath = (jobId: string): string => {
  const root = getMonorepoRoot();
  return join(root, ".testflow", `${E2E_RUN_FILE_PREFIX}${jobId}.json`);
};

function parseJsonReport(resultPath: string): E2ETestResult[] {
  if (!existsSync(resultPath)) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resultPath, "utf-8"));
  } catch {
    return [];
  }
  const report = raw as {
    suites?: Array<{
      suites?: unknown[];
      specs?: Array<{
        title?: string;
        tests?: Array<{
          title?: string;
          results?: Array<{
            status?: string;
            steps?: Array<{
              title?: string;
              outcome?: string;
              result?: string;
              duration?: number;
            }>;
          }>;
        }>;
      }>;
    }>;
  };
  const tests: E2ETestResult[] = [];

  function visitSuites(suites: typeof report.suites) {
    if (!Array.isArray(suites)) return;
    for (const suite of suites) {
      if (suite.specs && Array.isArray(suite.specs)) {
        for (const spec of suite.specs) {
          if (spec.tests && Array.isArray(spec.tests)) {
            for (const test of spec.tests) {
              const lastResult = test.results?.[test.results.length - 1];
              const status = (lastResult?.status ?? "failed") as E2ETestResult["status"];
              const steps: E2EStepResult[] = [];
              if (Array.isArray(lastResult?.steps)) {
                for (const s of lastResult.steps) {
                  const rawOutcome = s.outcome ?? (s as { result?: string }).result ?? "passed";
                  const stepOutcome: E2EStepResult["outcome"] =
                    rawOutcome === "expected" ? "passed"
                    : rawOutcome === "unexpected" ? "failed"
                    : (rawOutcome as E2EStepResult["outcome"]);
                  steps.push({
                    title: s.title ?? "(step)",
                    outcome: stepOutcome,
                  });
                }
              }
              tests.push({
                title: test.title ?? "(unnamed)",
                status,
                steps,
              });
            }
          }
        }
      }
      if (suite.suites && Array.isArray(suite.suites)) {
        visitSuites(suite.suites as typeof report.suites);
      }
    }
  }

  visitSuites(report.suites);
  return tests;
}

const getResultPath = (jobId: string): string => {
  const root = getMonorepoRoot();
  return join(root, ".testflow", `e2e-result-${jobId}.json`);
};

const writeRunStatus = (lastRunPath: string, data: E2ERunData): void => {
  const dir = join(lastRunPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(lastRunPath, JSON.stringify(data, null, 2), "utf-8");
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { testFile = "e2e/examples.spec.ts", testNamePattern } = body as {
      testFile?: string;
      testNamePattern?: string;
    };

    const monorepoRoot = getMonorepoRoot();
    const packageJsonPath = join(monorepoRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
      return NextResponse.json(
        { error: "Monorepo root not found" },
        { status: 500 }
      );
    }

    const jobId = randomUUID();
    const runFilePath = getRunFilePath(jobId);

    writeRunStatus(runFilePath, {
      jobId,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const args = ["run", "e2e", "--", testFile];
    if (testNamePattern && String(testNamePattern).trim()) {
      args.push("-g", String(testNamePattern).trim());
    }

    const child = spawn("bun", args, {
      cwd: monorepoRoot,
      env: { ...process.env, CI: undefined, E2E_JOB_ID: jobId },
      stdio: "ignore",
    });

    writeRunStatus(runFilePath, {
      jobId,
      status: "running",
      pid: child.pid,
      startedAt: new Date().toISOString(),
    });

    const finishRun = (status: "passed" | "failed", exitCode?: number) => {
      let startedAt = new Date().toISOString();
      try {
        if (existsSync(runFilePath)) {
          const current = JSON.parse(
            readFileSync(runFilePath, "utf-8")
          ) as E2ERunData;
          if (current.startedAt) startedAt = current.startedAt;
        }
      } catch {
        // keep default
      }
      const resultPath = getResultPath(jobId);
      const tests = parseJsonReport(resultPath);
      const data: E2ERunData = {
        jobId,
        status,
        pid: child.pid,
        exitCode,
        startedAt,
        finishedAt: new Date().toISOString(),
        results: tests.length > 0 ? { tests } : undefined,
      };
      writeRunStatus(runFilePath, data);
    };

    child.on("exit", (code) => {
      const status = code === 0 ? "passed" : "failed";
      finishRun(status, code ?? undefined);
    });

    child.on("error", () => {
      finishRun("failed", 1);
    });

    return NextResponse.json(
      {
        jobId,
        message: "E2E test started in background",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("E2E run error:", error);
    return NextResponse.json(
      {
        error: "Failed to start E2E test",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
