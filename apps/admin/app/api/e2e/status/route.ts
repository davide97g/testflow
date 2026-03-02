import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const E2E_RUN_FILE_PREFIX = "e2e-run-";

const getMonorepoRoot = (): string => {
  const workspaceRoot = process.cwd();
  return join(workspaceRoot, "..", "..");
};

const getRunFilePath = (jobId: string): string => {
  const root = getMonorepoRoot();
  return join(root, ".testflow", `${E2E_RUN_FILE_PREFIX}${jobId}.json`);
};

interface RunResponse {
  jobId: string;
  status: "running" | "passed" | "failed";
  exitCode?: number;
  startedAt?: string;
  finishedAt?: string;
  results?: {
    tests: Array<{
      title: string;
      status: string;
      steps: Array<{ title: string; outcome: string }>;
    }>;
  };
}

function readRun(jobId: string): RunResponse | null {
  const path = getRunFilePath(jobId);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as RunResponse;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const jobIdsParam = searchParams.get("jobIds");

    const ids: string[] = [];
    if (jobIdsParam) {
      ids.push(...jobIdsParam.split(",").map((s) => s.trim()).filter(Boolean));
    } else if (jobId) {
      ids.push(jobId);
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Provide jobId or jobIds query parameter" },
        { status: 400 }
      );
    }

    const runs: RunResponse[] = [];
    for (const id of ids) {
      const run = readRun(id);
      if (run) {
        runs.push(run);
      } else {
        runs.push({
          jobId: id,
          status: "running",
          startedAt: undefined,
          finishedAt: undefined,
        });
      }
    }

    if (ids.length === 1) {
      return NextResponse.json(runs[0]);
    }

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("E2E status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get E2E status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
