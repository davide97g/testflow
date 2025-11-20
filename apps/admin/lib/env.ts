import { cookies } from "next/headers";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// In-memory store (same as in API route)
const envStore = new Map<string, Record<string, string>>();

export const getSessionId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get("testflow_session_id")?.value || null;
};

export const getEnvVars = async (): Promise<Record<string, string>> => {
  const sessionId = await getSessionId();
  if (!sessionId) return {};

  // Try memory first
  let envVars = envStore.get(sessionId);

  // Try file system
  if (!envVars) {
    const testflowDir = join(process.cwd(), ".testflow", "admin");
    const envFilePath = join(testflowDir, `${sessionId}.env.json`);
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

  return envVars || {};
};

