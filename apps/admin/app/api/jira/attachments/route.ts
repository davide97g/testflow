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

interface ImageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentUrl: string;
  thumbnailUrl?: string;
}

// Common image MIME types
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];

// Common image file extensions
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
];

const isImageFile = (filename: string, mimeType?: string): boolean => {
  // Check by MIME type first
  if (mimeType && IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return true;
  }

  // Check by file extension
  const lowerFilename = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
};

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

    // Fetch issue with attachments field
    const issueUrl = `${normalizedBaseUrl}/rest/api/3/issue/${issueKey}?fields=attachment`;
    const issueResponse = await axios.get(issueUrl, { headers });
    const issueData = issueResponse.data as {
      fields?: {
        attachment?: Array<{
          id?: string;
          filename?: string;
          mimeType?: string;
          size?: number;
          content?: string;
          thumbnail?: string;
        }>;
      };
    };

    const attachments: ImageAttachment[] = [];
    const attachmentList = issueData.fields?.attachment || [];

    for (const attachment of attachmentList) {
      const filename = attachment.filename || "";
      const mimeType = attachment.mimeType || "";

      if (isImageFile(filename, mimeType)) {
        attachments.push({
          id: attachment.id || "",
          filename,
          mimeType,
          size: attachment.size || 0,
          contentUrl: attachment.content || "",
          thumbnailUrl: attachment.thumbnail,
        });
      }
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("Error fetching Jira attachments:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Failed to fetch Jira attachments",
          details: error.response?.data || error.message,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch Jira attachments" },
      { status: 500 }
    );
  }
}

