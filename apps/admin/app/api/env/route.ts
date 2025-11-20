import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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
    const body = await request.json();
    const sessionId = getSessionId(request);

    // Store in memory
    envStore.set(sessionId, body);

    // Also store in file system for persistence
    const testflowDir = join(process.cwd(), ".testflow", "admin");
    mkdirSync(testflowDir, { recursive: true });
    const envFilePath = join(testflowDir, `${sessionId}.env.json`);
    writeFileSync(envFilePath, JSON.stringify(body, null, 2), "utf-8");

    const response = NextResponse.json({ success: true });
    
    // Set cookie if not exists
    if (!request.cookies.get("testflow_session_id")) {
      response.cookies.set("testflow_session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
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
    const sessionId = getSessionId(request);

    // Try to load from memory first
    let envVars = envStore.get(sessionId);

    // If not in memory, try to load from file
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
          // File exists but couldn't be parsed, ignore
        }
      }
    }

    return NextResponse.json(envVars || {});
  } catch (error) {
    console.error("Error loading env vars:", error);
    return NextResponse.json(
      { error: "Failed to load environment variables" },
      { status: 500 }
    );
  }
}

