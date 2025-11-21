import { getEnvVars } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const configSchema = z.object({
  bitbucket: z
    .object({
      workspace: z.string(),
      repo: z.string(),
    })
    .optional(),
  jira: z.object({
    baseUrl: z.string().url(),
    boardId: z.number().optional(),
    assignee: z.string().optional(),
    statuses: z.array(z.string()).optional(),
  }),
  confluence: z
    .object({
      baseUrl: z.string().url(),
    })
    .optional(),
});

const requestSchema = z.object({
  config: configSchema,
  issueKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, issueKey } = requestSchema.parse(body);

    // Get CLI path - resolve from admin app to monorepo root
    const workspaceRoot = process.cwd(); // This is apps/admin
    const monorepoRoot = join(workspaceRoot, "..", "..");
    const cliDir = join(monorepoRoot, "apps", "cli");
    
    // Try dist first (production), then src (development)
    const cliPath = join(cliDir, "dist", "index.js");
    const cliPathSrc = join(cliDir, "src", "index.ts");
    
    const cliScript = existsSync(cliPath) ? cliPath : cliPathSrc;

    if (!existsSync(cliScript)) {
      return NextResponse.json(
        { 
          error: "CLI script not found. Please build the CLI first.",
          details: `Looked for: ${cliPath} and ${cliPathSrc}`
        },
        { status: 500 }
      );
    }

    // Get environment variables
    const envVars = await getEnvVars();
    const env = {
      ...process.env,
      JIRA_EMAIL: envVars.JIRA_EMAIL,
      JIRA_API_TOKEN: envVars.JIRA_API_TOKEN,
      BITBUCKET_EMAIL: envVars.BITBUCKET_EMAIL,
      BITBUCKET_API_TOKEN: envVars.BITBUCKET_API_TOKEN,
      CONFLUENCE_EMAIL: envVars.CONFLUENCE_EMAIL,
      CONFLUENCE_API_TOKEN: envVars.CONFLUENCE_API_TOKEN,
    };

    // Create config file in .testflow directory (monorepo root)
    const testflowDir = join(monorepoRoot, ".testflow");
    const configPath = join(testflowDir, "config.json");
    
    // Ensure directory exists
    const { mkdirSync } = await import("node:fs");
    mkdirSync(testflowDir, { recursive: true });
    
    // Write config
    const { writeFileSync } = await import("node:fs");
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // Run CLI extract command - run from monorepo root so CLI can find its files
    return new Promise<NextResponse>((resolve) => {
      const child = spawn("bun", [cliScript, "extract", issueKey], {
        env,
        cwd: monorepoRoot, // Run from monorepo root
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              {
                error: "Failed to extract issue data",
                details: stderr || stdout,
              },
              { status: 500 }
            )
          );
        } else {
          resolve(
            NextResponse.json({
              success: true,
              message: "Issue data extracted successfully",
            })
          );
        }
      });

      child.on("error", (error) => {
        resolve(
          NextResponse.json(
            {
              error: "Failed to run CLI command",
              details: error.message,
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    console.error("Error extracting issue data:", error);
    return NextResponse.json(
      {
        error: "Failed to extract issue data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

