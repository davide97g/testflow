import { getEnvVars } from "@/lib/env";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const configSchema = z.object({
  zephyr: z
    .object({
      projectKey: z.string(),
      projectId: z.union([z.string(), z.number()]).optional(),
      folderId: z.string().optional(),
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

    if (!config.zephyr) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          hasData: false,
          error: "Zephyr not configured",
        },
        { status: 200 }
      );
    }

    const envVars = await getEnvVars();
    const ZEPHYR_BASE_URL = envVars.ZEPHYR_BASE_URL;
    const ZEPHYR_ACCESS_TOKEN = envVars.ZEPHYR_ACCESS_TOKEN;

    if (!ZEPHYR_BASE_URL || !ZEPHYR_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          hasData: false,
          error: "Zephyr credentials not configured",
        },
        { status: 200 }
      );
    }

    let normalizedBaseUrl = ZEPHYR_BASE_URL.trim().replace(/\/+$/, "");
    normalizedBaseUrl = normalizedBaseUrl.replace(/\/v2$/, "");
    if (!normalizedBaseUrl.endsWith("/v2")) {
      normalizedBaseUrl = `${normalizedBaseUrl}/v2`;
    }

    const headers = {
      Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
      Accept: "application/json",
    };

    // Fetch test cases linked to the Jira issue
    // Note: This is a simplified version - you may need to adjust based on your Zephyr setup
    let testCasesUrl = `${normalizedBaseUrl}/testcases?projectKey=${encodeURIComponent(
      config.zephyr.projectKey
    )}&startAt=0&maxResults=50`;

    if (config.zephyr.folderId) {
      testCasesUrl += `&folderId=${encodeURIComponent(config.zephyr.folderId)}`;
    }

    const testCasesResponse = await axios.get(testCasesUrl, { headers });
    const testCases = testCasesResponse.data?.values || [];

    // Filter test cases that might be linked to this issue
    // This is a simplified approach - you may need to check actual links
    const linkedTestCases = testCases.filter(
      (tc: { key?: string; name?: string; summary?: string }) => {
        // Check if test case key or name contains the issue key
        return (
          tc.key?.includes(issueKey) ||
          tc.name?.includes(issueKey) ||
          tc.summary?.includes(issueKey)
        );
      }
    );

    return NextResponse.json({
      success: true,
      data: linkedTestCases,
      hasData: linkedTestCases.length > 0,
    });
  } catch (error) {
    console.error("Error fetching Zephyr data:", error);
    return NextResponse.json(
      {
        success: true,
        data: [],
        hasData: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
