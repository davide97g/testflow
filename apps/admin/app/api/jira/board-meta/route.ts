import { getEnvVars } from "@/lib/env";
import axios from "axios";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const configSchema = z.object({
  jira: z.object({
    baseUrl: z.string().url(),
    boardId: z.union([z.number(), z.string()]).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = z.object({ config: configSchema }).parse(body);

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

    let baseUrl = config.jira.baseUrl.trim().replace(/\/+$/, "");
    baseUrl = baseUrl.replace(/\/rest\/api\/[23]$/, "");

    const boardId =
      typeof config.jira.boardId === "number"
        ? config.jira.boardId
        : typeof config.jira.boardId === "string" && /^\d+$/.test(config.jira.boardId)
          ? parseInt(config.jira.boardId, 10)
          : null;

    const assignees: Array<{ accountId: string; displayName: string; emailAddress?: string }> = [];
    const statuses: Array<{ id: string; name: string }> = [];
    const labels: string[] = [];
    let projectKey: string | null = null;

    if (boardId != null) {
      try {
        const boardRes = await axios.get(
          `${baseUrl}/rest/agile/1.0/board/${boardId}`,
          { headers }
        );
        const boardData = boardRes.data as {
          location?: { key?: string };
          filter?: { id?: string };
        };
        projectKey = boardData.location?.key ?? null;

        const configRes = await axios.get(
          `${baseUrl}/rest/agile/1.0/board/${boardId}/configuration`,
          { headers }
        );
        const configData = configRes.data as {
          columnConfig?: {
            columns?: Array<{
              statuses?: Array<{ id?: string }>;
            }>;
          };
        };
        const statusIds = new Set<string>();
        for (const col of configData.columnConfig?.columns ?? []) {
          for (const s of col.statuses ?? []) {
            if (s.id) statusIds.add(s.id);
          }
        }

        const allStatusesRes = await axios.get(`${baseUrl}/rest/api/3/status`, {
          headers,
        });
        const allStatuses = allStatusesRes.data as Array<{
          id?: string;
          name?: string;
        }>;
        for (const s of allStatuses) {
          if (s.id && statusIds.has(s.id) && s.name) {
            statuses.push({ id: s.id, name: s.name });
          }
        }
        statuses.sort((a, b) => a.name.localeCompare(b.name));

        if (projectKey) {
          try {
            const usersRes = await axios.get(
              `${baseUrl}/rest/api/3/user/assignable/multiProjectSearch`,
              {
                headers,
                params: { projectKeys: projectKey, maxResults: 100 },
              }
            );
            const users = usersRes.data as Array<{
              accountId?: string;
              displayName?: string;
              emailAddress?: string;
            }>;
            for (const u of users) {
              if (u.accountId && u.displayName) {
                assignees.push({
                  accountId: u.accountId,
                  displayName: u.displayName,
                  emailAddress: u.emailAddress,
                });
              }
            }
            assignees.sort((a, b) =>
              a.displayName.localeCompare(b.displayName)
            );
          } catch {
            // Assignable search may fail for some setups
          }
        }

        const filterId = (boardRes.data as { filter?: { id?: string } }).filter?.id;
        if (filterId) {
          try {
            const issuesRes = await axios.get(
              `${baseUrl}/rest/api/3/search`,
              {
                headers,
                params: {
                  jql: `filter = ${filterId}`,
                  maxResults: 100,
                  fields: "labels",
                },
              }
            );
            const labelSet = new Set<string>();
            const issues = (issuesRes.data as { issues?: Array<{ fields?: { labels?: string[] } }> }).issues ?? [];
            for (const issue of issues) {
              for (const label of issue.fields?.labels ?? []) {
                labelSet.add(label);
              }
            }
            labels.push(...Array.from(labelSet).sort());
          } catch {
            // Labels from issues optional
          }
        }
      } catch (err) {
        console.error("Board meta fetch error:", err);
        return NextResponse.json(
          { error: "Failed to fetch board metadata", assignees: [], statuses: [], labels: [] },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      assignees,
      statuses,
      labels,
      projectKey,
    });
  } catch (error) {
    console.error("Board meta error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
