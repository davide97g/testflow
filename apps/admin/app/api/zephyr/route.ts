import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getEnvVars } from "@/lib/env";
import { z } from "zod";

const configSchema = z.object({
  zephyr: z.object({
    projectKey: z.string(),
    projectId: z.union([z.string(), z.number()]).optional(),
    folderId: z.string().optional(),
  }),
});

interface ZephyrTestCase {
  id?: number;
  key?: string;
  title?: string;
  name?: string;
  description?: string;
  preconditions?: string;
  status?: {
    id?: number;
    name?: string;
  };
  priority?: {
    id?: number;
    name?: string;
  };
  type?: {
    id?: number;
    name?: string;
  };
  createdOn?: string;
  updatedOn?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = configSchema.parse(body.config);

    const envVars = await getEnvVars();
    const ZEPHYR_BASE_URL = envVars.ZEPHYR_BASE_URL;
    const ZEPHYR_ACCESS_TOKEN = envVars.ZEPHYR_ACCESS_TOKEN;
    const ZEPHYR_PROJECT_ID = envVars.ZEPHYR_PROJECT_ID;

    if (!ZEPHYR_BASE_URL || !ZEPHYR_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error:
            "ZEPHYR_BASE_URL and ZEPHYR_ACCESS_TOKEN are required. Set them in Environment Variables (/env) and save.",
        },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
      Accept: "application/json",
    };

    let normalizedBaseUrl = ZEPHYR_BASE_URL.trim().replace(/\/+$/, "");
    normalizedBaseUrl = normalizedBaseUrl.replace(/\/v2$/, "");
    if (!normalizedBaseUrl.endsWith("/v2")) {
      normalizedBaseUrl = `${normalizedBaseUrl}/v2`;
    }

    const allTestCases: ZephyrTestCase[] = [];
    let startAt = 0;
    const maxResults = 50;
    let hasMore = true;

    while (hasMore) {
      let url = `${normalizedBaseUrl}/testcases?projectKey=${encodeURIComponent(
        config.zephyr.projectKey
      )}&startAt=${startAt}&maxResults=${maxResults}`;

      if (config.zephyr.folderId) {
        url += `&folderId=${encodeURIComponent(config.zephyr.folderId)}`;
      }

      const projectId = ZEPHYR_PROJECT_ID || config.zephyr.projectId;
      if (projectId) {
        url += `&projectId=${encodeURIComponent(projectId.toString())}`;
      }

      const response = await axios.get<{
        values?: ZephyrTestCase[];
        isLast?: boolean;
        total?: number;
      }>(url, { headers });

      const data = response.data;

      if (data.values && data.values.length > 0) {
        allTestCases.push(...data.values);
      }

      if (data.isLast || !data.values || data.values.length < maxResults) {
        hasMore = false;
      } else {
        startAt += maxResults;
      }
    }

    return NextResponse.json({ testCases: allTestCases });
  } catch (error) {
    console.error("Error fetching Zephyr test cases:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Failed to fetch Zephyr test cases",
          details: error.response?.data || error.message,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch Zephyr test cases" },
      { status: 500 }
    );
  }
}

