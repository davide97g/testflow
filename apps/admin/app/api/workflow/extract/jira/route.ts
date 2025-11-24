import { getEnvVars } from "@/lib/env";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const configSchema = z.object({
  jira: z.object({
    baseUrl: z.string().url(),
  }),
});

const requestSchema = z.object({
  config: configSchema,
  issueKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, issueKey } = requestSchema.parse(body);

    const envVars = await getEnvVars();
    const JIRA_EMAIL = envVars.JIRA_EMAIL;
    const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json(
        { error: "JIRA_EMAIL and JIRA_API_TOKEN are required" },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
      "base64"
    );
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    };

    let normalizedBaseUrl = config.jira.baseUrl.trim().replace(/\/+$/, "");
    normalizedBaseUrl = normalizedBaseUrl.replace(/\/rest\/api\/[23]$/, "");

    const issueUrl = `${normalizedBaseUrl}/rest/api/3/issue/${issueKey}?fields=*all`;
    const issueResponse = await axios.get(issueUrl, { headers });

    return NextResponse.json({
      success: true,
      data: issueResponse.data,
    });
  } catch (error) {
    console.error("Error fetching Jira data:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Failed to fetch Jira data",
          details: error.response?.data || error.message,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch Jira data" },
      { status: 500 }
    );
  }
}
