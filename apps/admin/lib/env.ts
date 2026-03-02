import { cookies } from "next/headers";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getCentralEnvPath, getTestflowDir } from "@/lib/testflow-path";

const envStore = new Map<string, Record<string, string>>();

export const getSessionId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get("testflow_session_id")?.value || null;
};

/**
 * Central source of truth for environment variables.
 * Reads from .testflow/env.json at monorepo root so that config test, Zephyr, Jira, etc. all see the same data saved from the Env page.
 */
export const getEnvVars = async (): Promise<Record<string, string>> => {
  const centralPath = getCentralEnvPath();
  if (existsSync(centralPath)) {
    try {
      const content = readFileSync(centralPath, "utf-8");
      const parsed = JSON.parse(content) as Record<string, string>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  const sessionId = await getSessionId();
  if (!sessionId) return {};

  let envVars = envStore.get(sessionId);
  if (!envVars) {
    const adminDir = join(getTestflowDir(), "admin");
    const envFilePath = join(adminDir, `${sessionId}.env.json`);
    if (existsSync(envFilePath)) {
      try {
        const fileContent = readFileSync(envFilePath, "utf-8");
        const parsed = JSON.parse(fileContent) as Record<string, string>;
        envVars = parsed;
        envStore.set(sessionId, parsed);
      } catch {
        return {};
      }
    }
  }

  return envVars ?? {};
};
