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
  query: z.string().min(1),
});

interface CompactIssue {
  key: string;
  title: string;
  status: string;
  prOpen: "Y" | "N";
  branchName?: string;
  branchUrl?: string;
  confluencePages?: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, query } = requestSchema.parse(body);

    const envVars = await getEnvVars();
    const JIRA_EMAIL = envVars.JIRA_EMAIL;
    const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;
    const BITBUCKET_EMAIL = envVars.BITBUCKET_EMAIL;
    const BITBUCKET_API_TOKEN = envVars.BITBUCKET_API_TOKEN;
    const CONFLUENCE_EMAIL = envVars.CONFLUENCE_EMAIL;
    const CONFLUENCE_API_TOKEN = envVars.CONFLUENCE_API_TOKEN;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json(
        { error: "JIRA_EMAIL and JIRA_API_TOKEN are required" },
        { status: 400 }
      );
    }

    // Create Jira auth
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
      "base64"
    );
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    };

    let normalizedBaseUrl = config.jira.baseUrl.trim().replace(/\/+$/, "");
    normalizedBaseUrl = normalizedBaseUrl.replace(/\/rest\/api\/[23]$/, "");

    // Normalize query: accept full Jira URL or issue key
    const extractedKeyFromUrl = query.match(
      /(?:browse|issues)\/([A-Z][A-Z0-9]*-\d+)/i
    )?.[1];
    const normalizedQuery = extractedKeyFromUrl
      ? extractedKeyFromUrl.toUpperCase()
      : query.trim();

    // Build JQL query - search by key or text
    let jql: string;
    if (/^[A-Z][A-Z0-9]*-\d+$/i.test(normalizedQuery)) {
      // Exact key match (from key or extracted from URL)
      jql = `key = "${normalizedQuery.toUpperCase()}"`;
    } else {
      // Text search
      jql = `text ~ "${normalizedQuery.replace(/"/g, '\\"')}" ORDER BY updated DESC`;
    }

    const issues: CompactIssue[] = [];

    // Fetch issues
    const searchUrl = `${normalizedBaseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(
      jql
    )}&startAt=0&maxResults=20&fields=key,summary,status`;

    const response = await axios.get(searchUrl, { headers });
    const data = response.data as {
      issues?: Array<{
        key?: string;
        fields?: {
          summary?: string;
          status?: { name?: string };
        };
      }>;
    };

    if (!data.issues || data.issues.length === 0) {
      return NextResponse.json({ issues: [] });
    }

    // Process issues
    for (const issue of data.issues) {
      const key = issue.key || "";
      const title = issue.fields?.summary || "";
      const status = issue.fields?.status?.name || "";

      const issueData: CompactIssue = {
        key,
        title,
        status,
        prOpen: "N",
      };

      // Check for open PR
      if (config.bitbucket && BITBUCKET_EMAIL && BITBUCKET_API_TOKEN) {
        try {
          const BITBUCKET_BASE_URL = "https://api.bitbucket.org/2.0";
          const bbAuth = Buffer.from(
            `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}`
          ).toString("base64");
          const bbHeaders = {
            Authorization: `Basic ${bbAuth}`,
            Accept: "application/json",
          };

          const ticketPattern = new RegExp(
            key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );

          const prsUrl = `${BITBUCKET_BASE_URL}/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}/pullrequests?state=OPEN&pagelen=50`;
          const prsResponse = await axios.get(prsUrl, { headers: bbHeaders });
          const prsData = prsResponse.data as {
            values?: Array<{
              title?: string;
              description?: string;
              source?: { branch?: { name?: string } };
            }>;
          };

          let hasOpenPR = false;
          if (prsData.values) {
            for (const pr of prsData.values) {
              const titleMatch = pr.title && ticketPattern.test(pr.title);
              const descMatch =
                pr.description && ticketPattern.test(pr.description);
              const branchMatch =
                pr.source?.branch?.name &&
                ticketPattern.test(pr.source.branch.name);

              if (titleMatch || descMatch || branchMatch) {
                hasOpenPR = true;
                if (pr.source?.branch?.name) {
                  issueData.branchName = pr.source.branch.name;
                }
                break;
              }
            }
          }

          issueData.prOpen = hasOpenPR ? "Y" : "N";

          // Try to get branch from branches API
          if (!issueData.branchName) {
            try {
              const branchesUrl = `${BITBUCKET_BASE_URL}/repositories/${config.bitbucket.workspace}/${config.bitbucket.repo}/refs/branches?pagelen=100`;
              const branchesResponse = await axios.get(branchesUrl, {
                headers: bbHeaders,
              });
              const branchesData = branchesResponse.data as {
                values?: Array<{
                  name?: string;
                  links?: { html?: { href?: string } };
                }>;
              };

              if (branchesData.values) {
                for (const branch of branchesData.values) {
                  if (branch.name && ticketPattern.test(branch.name)) {
                    issueData.branchName = branch.name;
                    issueData.branchUrl = branch.links?.html?.href;
                    break;
                  }
                }
              }
            } catch {
              // Ignore branch fetch errors
            }
          }
        } catch {
          // Ignore Bitbucket errors
        }
      }

      // Fetch Confluence pages if configured
      if (config.confluence && CONFLUENCE_EMAIL && CONFLUENCE_API_TOKEN) {
        try {
          const confAuth = Buffer.from(
            `${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`
          ).toString("base64");
          const confHeaders = {
            Authorization: `Basic ${confAuth}`,
            Accept: "application/json",
          };

          // Get remote links from Jira
          const remoteLinksUrl = `${normalizedBaseUrl}/rest/api/3/issue/${key}/remotelink`;
          const remoteLinksResponse = await axios.get(remoteLinksUrl, {
            headers,
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
                // Extract page ID from URL
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
                  // Try alternative URL format
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

          issueData.confluencePages = confluencePages;
        } catch {
          // Ignore Confluence errors
        }
      }

      issues.push(issueData);
    }

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("Error searching Jira issues:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Failed to search Jira issues",
          details: error.response?.data || error.message,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to search Jira issues" },
      { status: 500 }
    );
  }
}

