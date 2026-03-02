import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getCentralEnvPath, getTestflowDir } from "@/lib/testflow-path";

// In-memory store for env vars (keyed by session ID)
const envStore = new Map<string, Record<string, string>>();

const getSessionId = (request: NextRequest): string => {
  let sessionId = request.cookies.get("testflow_session_id")?.value;
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  return sessionId;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, string>;
    const sessionId = getSessionId(request);

    envStore.set(sessionId, body);

    const testflowDir = getTestflowDir();
    mkdirSync(testflowDir, { recursive: true });
    const centralPath = getCentralEnvPath();
    writeFileSync(centralPath, JSON.stringify(body, null, 2), "utf-8");

    const response = NextResponse.json({ success: true });

    if (!request.cookies.get("testflow_session_id")) {
      response.cookies.set("testflow_session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    console.error("Error saving env vars:", error);
    return NextResponse.json(
      { error: "Failed to save environment variables" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const centralPath = getCentralEnvPath();
    if (existsSync(centralPath)) {
      const content = readFileSync(centralPath, "utf-8");
      const parsed = JSON.parse(content) as Record<string, string>;
      return NextResponse.json(parsed ?? {});
    }

    const sessionId = getSessionId(request);
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
          mkdirSync(getTestflowDir(), { recursive: true });
          writeFileSync(centralPath, JSON.stringify(parsed, null, 2), "utf-8");
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json(envVars ?? {});
  } catch (error) {
    console.error("Error loading env vars:", error);
    return NextResponse.json(
      { error: "Failed to load environment variables" },
      { status: 500 }
    );
  }
}

