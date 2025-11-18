import axios from "axios";
import chalk from "chalk";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import ora from "ora";
import { loadConfigSync } from "../config.js";
import { loadEnvWithWarnings } from "../env.js";

const config = loadConfigSync();
const { baseUrl: confluenceBaseUrl } = config.confluence || {};

// Load and validate environment variables (shows warnings instead of errors)
const env = loadEnvWithWarnings(["CONFLUENCE_EMAIL", "CONFLUENCE_API_TOKEN"]);

const { CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN } = env;

const logError = (error: unknown, context: string) => {
  const testflowDir = join(process.cwd(), ".testflow");
  mkdirSync(testflowDir, { recursive: true });
  const logPath = join(testflowDir, "testflow.log");
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    context,
    error:
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : String(error),
    axiosError: axios.isAxiosError(error)
      ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          },
        }
      : undefined,
  };

  const logEntry = `\n[${timestamp}] ${context}\n${JSON.stringify(
    errorDetails,
    null,
    2
  )}\n`;
  appendFileSync(logPath, logEntry, "utf-8");
};

interface ConfluencePageParams {
  pageId: string;
}

interface ConfluencePageData {
  page?: unknown;
  textContent?: string;
  errors?: Array<{ endpoint: string; message: string }>;
}

/**
 * Fetch a Confluence page by ID and extract text content
 */
export const getConfluencePage = async ({
  pageId,
}: ConfluencePageParams): Promise<ConfluencePageData> => {
  if (!confluenceBaseUrl || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
    return {
      errors: [
        {
          endpoint: "confluence",
          message: "Confluence configuration or credentials missing",
        },
      ],
    };
  }

  // Create Basic Auth header
  // Confluence uses email:apiToken format for Basic Auth
  const auth = Buffer.from(
    `${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  // Normalize base URL - remove trailing slashes
  let normalizedBaseUrl = confluenceBaseUrl.trim().replace(/\/+$/, "");
  // Remove any existing /wiki/rest/api path if present
  normalizedBaseUrl = normalizedBaseUrl.replace(/\/wiki\/rest\/api\/?$/, "");
  normalizedBaseUrl = normalizedBaseUrl.replace(/\/wiki\/?$/, "");

  const pageData: ConfluencePageData = {};

  // Get page content using Confluence REST API
  // GET /wiki/rest/api/content/{id}?expand=body.view,body.storage,version
  // Reference: https://developer.atlassian.com/cloud/confluence/rest/api-group-content/#api-wiki-rest-api-content-id-get
  // The API path should be /wiki/rest/api/content/{id}
  const pageUrl = `${normalizedBaseUrl}/wiki/rest/api/content/${pageId}?expand=body.view,body.storage,version,space`;

  const pageSpinner = ora({
    text: `Fetching Confluence page ${pageId}`,
    color: "white",
  }).start();

  try {
    const pageResponse = await axios.get(pageUrl, { headers });
    pageData.page = pageResponse.data;

    // Extract text content from the page
    const page = pageResponse.data as {
      title?: string;
      body?: {
        view?: { value?: string };
        storage?: { value?: string };
      };
      space?: { key?: string; name?: string };
      version?: { number?: number };
    };

    // Try to extract text from body.view (HTML) or body.storage (storage format)
    let textContent = "";
    if (page.body?.view?.value) {
      // Convert HTML to plain text (simple approach)
      textContent = convertHtmlToText(page.body.view.value);
    } else if (page.body?.storage?.value) {
      // Convert storage format to plain text
      textContent = convertStorageToText(page.body.storage.value);
    }

    // Add metadata
    const metadata: string[] = [];
    if (page.title) {
      metadata.push(`Title: ${page.title}`);
    }
    if (page.space?.name) {
      metadata.push(`Space: ${page.space.name}`);
    }
    if (page.space?.key) {
      metadata.push(`Space Key: ${page.space.key}`);
    }
    if (page.version?.number) {
      metadata.push(`Version: ${page.version.number}`);
    }

    if (metadata.length > 0) {
      pageData.textContent = `${metadata.join("\n")}\n\n${textContent}`;
    } else {
      pageData.textContent = textContent;
    }

    pageSpinner.succeed(`Fetched Confluence page ${pageId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        logError(error, `Authentication failed for Confluence page ${pageId}`);
        pageSpinner.fail(chalk.red("Authentication failed"));
        pageData.errors = [
          {
            endpoint: "confluence",
            message: "Authentication failed",
          },
        ];
      } else if (error.response?.status === 403) {
        logError(error, `Access forbidden for Confluence page ${pageId}`);
        pageSpinner.fail(chalk.red("Access forbidden"));
        pageData.errors = [
          {
            endpoint: "confluence",
            message: "Access forbidden",
          },
        ];
      } else if (error.response?.status === 404) {
        logError(error, `Confluence page ${pageId} not found`);
        pageSpinner.fail(chalk.yellow(`Page ${pageId} not found`));
        pageData.errors = [
          {
            endpoint: "confluence",
            message: `Page ${pageId} not found`,
          },
        ];
      } else {
        logError(error, `Failed to fetch Confluence page ${pageId}`);
        pageSpinner.fail(
          chalk.red(`Failed to fetch Confluence page ${pageId}`)
        );
        pageData.errors = [
          {
            endpoint: "confluence",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        ];
      }
    } else {
      logError(error, `Failed to fetch Confluence page ${pageId}`);
      pageSpinner.fail(chalk.red(`Failed to fetch Confluence page ${pageId}`));
      pageData.errors = [
        {
          endpoint: "confluence",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      ];
    }
  }

  return pageData;
};

/**
 * Convert HTML content to plain text (simple implementation)
 */
const convertHtmlToText = (html: string): string => {
  // Remove script and style tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Convert common HTML elements to text
  text = text.replace(/<h[1-6][^>]*>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");
  text = text.replace(/<p[^>]*>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<br[^>]*>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "\n- ");
  text = text.replace(/<\/li>/gi, "");
  text = text.replace(/<ul[^>]*>/gi, "\n");
  text = text.replace(/<\/ul>/gi, "\n");
  text = text.replace(/<ol[^>]*>/gi, "\n");
  text = text.replace(/<\/ol>/gi, "\n");
  text = text.replace(/<strong[^>]*>/gi, "**");
  text = text.replace(/<\/strong>/gi, "**");
  text = text.replace(/<em[^>]*>/gi, "*");
  text = text.replace(/<\/em>/gi, "*");
  text = text.replace(/<code[^>]*>/gi, "`");
  text = text.replace(/<\/code>/gi, "`");
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)");
  text = text.replace(/<[^>]+>/g, ""); // Remove remaining HTML tags

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.trim();

  return text;
};

/**
 * Convert Confluence storage format (Atlassian Document Format) to plain text
 */
const convertStorageToText = (storage: string): string => {
  try {
    // Try to parse as JSON (ADF format)
    const parsed = JSON.parse(storage);
    if (parsed && typeof parsed === "object") {
      return extractTextFromADF(parsed);
    }
  } catch {
    // Not JSON, might be HTML or plain text
    if (storage.includes("<")) {
      return convertHtmlToText(storage);
    }
    return storage;
  }
  return storage;
};

/**
 * Extract text from Atlassian Document Format (ADF)
 */
const extractTextFromADF = (node: unknown): string => {
  if (!node || typeof node !== "object") {
    return "";
  }

  const nodeObj = node as {
    type?: string;
    text?: string;
    content?: unknown[];
    attrs?: Record<string, unknown>;
  };

  let text = "";

  // Extract text from text nodes
  if (nodeObj.text) {
    text += nodeObj.text;
  }

  // Extract text from content array
  if (Array.isArray(nodeObj.content)) {
    const contentText = nodeObj.content
      .map((child) => extractTextFromADF(child))
      .filter(Boolean)
      .join("");

    // Add formatting based on node type
    if (nodeObj.type === "heading") {
      const level = (nodeObj.attrs?.level as number) || 1;
      const prefix = "#".repeat(level);
      text = `${prefix} ${contentText}\n\n`;
    } else if (nodeObj.type === "paragraph") {
      text = `${contentText}\n\n`;
    } else if (nodeObj.type === "bulletList") {
      text = `${contentText}\n`;
    } else if (nodeObj.type === "listItem") {
      text = `- ${contentText}\n`;
    } else if (nodeObj.type === "orderedList") {
      text = `${contentText}\n`;
    } else if (nodeObj.type === "codeBlock") {
      text = `\`\`\`\n${contentText}\n\`\`\`\n\n`;
    } else if (nodeObj.type === "blockquote") {
      text = `> ${contentText.replace(/\n/g, "\n> ")}\n\n`;
    } else if (nodeObj.type === "strong") {
      text = `**${contentText}**`;
    } else if (nodeObj.type === "em") {
      text = `*${contentText}*`;
    } else if (nodeObj.type === "code") {
      text = `\`${contentText}\``;
    } else if (nodeObj.type === "link") {
      const href = (nodeObj.attrs?.href as string) || "";
      text = contentText + (href ? ` (${href})` : "");
    } else {
      text = contentText;
    }
  }

  return text;
};

/**
 * Extract linked resources from a Jira issue
 * Returns issue links and Confluence page links
 */
export interface LinkedResource {
  type: "jira_issue" | "confluence_page";
  id: string;
  title?: string;
  url?: string;
}

export const extractLinkedResources = (issueData: {
  issue?: unknown;
}): LinkedResource[] => {
  const resources: LinkedResource[] = [];

  const issue = issueData.issue as {
    key?: string;
    fields?: {
      issuelinks?: Array<{
        type?: { name?: string; inward?: string; outward?: string };
        inwardIssue?: { key?: string; fields?: { summary?: string } };
        outwardIssue?: { key?: string; fields?: { summary?: string } };
      }>;
    };
    _links?: {
      remoteLinks?: string;
    };
  };

  // Extract issue links
  if (issue.fields?.issuelinks) {
    for (const link of issue.fields.issuelinks) {
      if (link.inwardIssue?.key) {
        resources.push({
          type: "jira_issue",
          id: link.inwardIssue.key,
          title: link.inwardIssue.fields?.summary,
        });
      }
      if (link.outwardIssue?.key) {
        resources.push({
          type: "jira_issue",
          id: link.outwardIssue.key,
          title: link.outwardIssue.fields?.summary,
        });
      }
    }
  }

  // Extract remote links (including Confluence pages)
  // Note: Remote links might need to be fetched separately using the remoteLinks endpoint
  // For now, we'll check if there's a remoteLinks field in the issue data
  // The actual remote links might be in a separate API call

  return resources;
};

/**
 * Extract Confluence page IDs from remote links
 * This function should be called with the remote links data from Jira
 */
export const extractConfluencePageIds = (
  remoteLinks: Array<{
    globalId?: string;
    application?: { type?: string; name?: string };
    object?: { url?: string; title?: string };
  }>
): string[] => {
  const pageIds: string[] = [];

  for (const link of remoteLinks) {
    // Check if it's a Confluence link
    if (
      link.application?.type === "com.atlassian.confluence" ||
      link.application?.name?.toLowerCase().includes("confluence")
    ) {
      // Extract page ID from globalId
      // Format: appId=<applicationId>&pageId=<pageId>
      if (link.globalId) {
        const pageIdMatch = link.globalId.match(/pageId=([^&]+)/);
        if (pageIdMatch?.[1]) {
          pageIds.push(pageIdMatch[1]);
        }
      }

      // Also try to extract from URL if available
      if (link.object?.url) {
        const urlMatch = link.object.url.match(
          /\/pages\/viewpage\.action\?pageId=(\d+)/
        );
        if (urlMatch?.[1]) {
          pageIds.push(urlMatch[1]);
        }
      }
    }
  }

  return [...new Set(pageIds)]; // Remove duplicates
};

/**
 * Fetch remote links from a Jira issue
 */
export const getJiraRemoteLinks = async (
  issueIdOrKey: string,
  jiraBaseUrl: string,
  jiraEmail: string,
  jiraApiToken: string
): Promise<
  Array<{
    globalId?: string;
    application?: { type?: string; name?: string };
    object?: { url?: string; title?: string };
  }>
> => {
  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };

  let normalizedBaseUrl = jiraBaseUrl.trim().replace(/\/+$/, "");
  normalizedBaseUrl = normalizedBaseUrl.replace(/\/rest\/api\/[23]$/, "");

  try {
    // GET /rest/api/3/issue/{issueIdOrKey}/remotelink
    // Reference: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-remote-links/#api-rest-api-3-issue-issueidorkey-remotelink-get
    const remoteLinksUrl = `${normalizedBaseUrl}/rest/api/3/issue/${issueIdOrKey}/remotelink`;
    const response = await axios.get(remoteLinksUrl, { headers });
    return response.data as Array<{
      globalId?: string;
      application?: { type?: string; name?: string };
      object?: { url?: string; title?: string };
    }>;
  } catch (error) {
    logError(
      error,
      `Failed to fetch remote links for Jira issue ${issueIdOrKey}`
    );
    return [];
  }
};
