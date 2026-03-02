import { getEnvVars } from "@/lib/env";
import axios from "axios";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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
  }),
  confluence: z
    .object({
      baseUrl: z.string().url(),
    })
    .optional(),
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
});

export type ConfigTestResult = {
  jira: { configured: true; success: boolean; error?: string };
  bitbucket: { configured: boolean; success?: boolean; error?: string };
  confluence: { configured: boolean; success?: boolean; error?: string };
  zephyr: { configured: boolean; success?: boolean; error?: string };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = requestSchema.parse(body);
    const envVars = await getEnvVars();

    const result: ConfigTestResult = {
      jira: { configured: true, success: false },
      bitbucket: { configured: false },
      confluence: { configured: false },
      zephyr: { configured: false },
    };

    // Test Jira (always configured - required)
    const JIRA_EMAIL = envVars.JIRA_EMAIL;
    const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;
    if (JIRA_EMAIL && JIRA_API_TOKEN) {
      try {
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
        let baseUrl = config.jira.baseUrl.trim().replace(/\/+$/, "");
        baseUrl = baseUrl.replace(/\/rest\/api\/[23]$/, "");
        const url = `${baseUrl}/rest/api/3/myself`;
        await axios.get(url, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
        });
        result.jira.success = true;
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        result.jira.error =
          status === 401 || status === 403
            ? "Token expired or access denied"
            : axios.isAxiosError(err)
              ? (err.response?.data?.errorMessages?.[0] as string) || err.message
              : "Request failed";
      }
    } else {
      result.jira.error = "JIRA_EMAIL and JIRA_API_TOKEN are required";
    }

    // Test Bitbucket
    if (config.bitbucket?.workspace && config.bitbucket?.repo) {
      result.bitbucket.configured = true;
      const BITBUCKET_EMAIL = envVars.BITBUCKET_EMAIL;
      const BITBUCKET_API_TOKEN = envVars.BITBUCKET_API_TOKEN;
      if (BITBUCKET_EMAIL && BITBUCKET_API_TOKEN) {
        try {
          const auth = Buffer.from(`${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`).toString("base64");
          const url = `https://api.bitbucket.org/2.0/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}`;
          await axios.get(url, {
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
            },
          });
          result.bitbucket.success = true;
        } catch (err) {
          result.bitbucket.success = false;
          result.bitbucket.error = axios.isAxiosError(err)
            ? (err.response?.status === 401 || err.response?.status === 403
                ? "Token expired or access denied"
                : err.message)
            : "Request failed";
        }
      } else {
        result.bitbucket.success = false;
        result.bitbucket.error = "BITBUCKET_EMAIL and BITBUCKET_API_TOKEN are required";
      }
    }

    // Test Confluence (base URL + credentials)
    if (config.confluence?.baseUrl) {
      result.confluence.configured = true;
      const CONFLUENCE_EMAIL = envVars.CONFLUENCE_EMAIL;
      const CONFLUENCE_API_TOKEN = envVars.CONFLUENCE_API_TOKEN;
      if (CONFLUENCE_EMAIL && CONFLUENCE_API_TOKEN) {
        try {
          const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString("base64");
          const baseUrl = config.confluence.baseUrl.trim().replace(/\/+$/, "");
          const url = baseUrl.includes("/wiki")
            ? `${baseUrl}/rest/api/user/current`
            : `${baseUrl}/wiki/rest/api/user/current`;
          await axios.get(url, {
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
            },
          });
          result.confluence.success = true;
        } catch (err) {
          result.confluence.success = false;
          result.confluence.error = axios.isAxiosError(err)
            ? (err.response?.status === 401 || err.response?.status === 403
                ? "Token expired or access denied"
                : err.message)
            : "Request failed";
        }
      } else {
        result.confluence.success = false;
        result.confluence.error = "CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN are required";
      }
    }

    // Test Zephyr
    if (config.zephyr?.projectKey) {
      result.zephyr.configured = true;
      const ZEPHYR_BASE_URL = envVars.ZEPHYR_BASE_URL;
      const ZEPHYR_ACCESS_TOKEN = envVars.ZEPHYR_ACCESS_TOKEN;
      if (ZEPHYR_BASE_URL && ZEPHYR_ACCESS_TOKEN) {
        try {
          const base = ZEPHYR_BASE_URL.trim().replace(/\/+$/, "");
          const normalizedBaseUrl = base.endsWith("/v2") ? base : `${base}/v2`;
          const url = `${normalizedBaseUrl}/testcases?projectKey=${encodeURIComponent(config.zephyr.projectKey)}&maxResults=1`;
          await axios.get(url, {
            headers: {
              Authorization: `Bearer ${ZEPHYR_ACCESS_TOKEN}`,
              Accept: "application/json",
            },
          });
          result.zephyr.success = true;
        } catch (err) {
          result.zephyr.success = false;
          result.zephyr.error = axios.isAxiosError(err)
            ? (err.response?.status === 401 || err.response?.status === 403
                ? "Token expired or access denied"
                : err.message)
            : "Request failed";
        }
      } else {
        result.zephyr.success = false;
        result.zephyr.error = "ZEPHYR_BASE_URL and ZEPHYR_ACCESS_TOKEN are required";
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Config test error:", error);
    return NextResponse.json(
      { error: "Invalid request or configuration" },
      { status: 400 }
    );
  }
}
