import { getEnvVars } from "@/lib/env";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const configSchema = z.object({
  jira: z.object({
    baseUrl: z.string().url(),
  }),
  confluence: z.object({
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
    const CONFLUENCE_EMAIL = envVars.CONFLUENCE_EMAIL;
    const CONFLUENCE_API_TOKEN = envVars.CONFLUENCE_API_TOKEN;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json(
        { error: "JIRA_EMAIL and JIRA_API_TOKEN are required" },
        { status: 400 }
      );
    }

    if (!CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          hasData: false,
          error: "Confluence credentials not configured",
        },
        { status: 200 }
      );
    }

    const jiraAuth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
      "base64"
    );
    const jiraHeaders = {
      Authorization: `Basic ${jiraAuth}`,
      Accept: "application/json",
    };

    let normalizedJiraUrl = config.jira.baseUrl.trim().replace(/\/+$/, "");
    normalizedJiraUrl = normalizedJiraUrl.replace(/\/rest\/api\/[23]$/, "");

    // Get remote links from Jira
    const remoteLinksUrl = `${normalizedJiraUrl}/rest/api/3/issue/${issueKey}/remotelink`;
    const remoteLinksResponse = await axios.get(remoteLinksUrl, {
      headers: jiraHeaders,
    });
    const remoteLinks = remoteLinksResponse.data as Array<{
      object?: {
        url?: string;
        title?: string;
      };
    }>;

    const confluencePages: Array<{
      id: string;
      title: string;
      url: string;
    }> = [];

    if (remoteLinks) {
      for (const link of remoteLinks) {
        const url = link.object?.url || "";
        if (url.includes("confluence") || url.includes("wiki")) {
          const pageIdMatch = url.match(
            /\/pages\/viewpage\.action\?pageId=(\d+)/
          );
          if (pageIdMatch) {
            confluencePages.push({
              id: pageIdMatch[1],
              title: link.object?.title || "Untitled",
              url,
            });
          } else {
            const altMatch = url.match(/\/spaces\/[^/]+\/pages\/(\d+)/);
            if (altMatch) {
              confluencePages.push({
                id: altMatch[1],
                title: link.object?.title || "Untitled",
                url,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: confluencePages,
      hasData: confluencePages.length > 0,
    });
  } catch (error) {
    console.error("Error fetching Confluence data:", error);
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
