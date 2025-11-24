import { getEnvVars } from "@/lib/env";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET(
  request: NextRequest,
  { params }: { params: { issueKey: string; filename: string } }
) {
  try {
    const { issueKey, filename } = params;

    const envVars = await getEnvVars();
    const JIRA_EMAIL = envVars.JIRA_EMAIL;
    const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json(
        { error: "Jira credentials not configured" },
        { status: 500 }
      );
    }

    // Get attachment metadata to find the content URL
    const workspaceRoot = process.cwd();
    const monorepoRoot = join(workspaceRoot, "..", "..");
    const testflowDir = join(monorepoRoot, ".testflow");
    const outputDir = join(testflowDir, "output", issueKey);
    const attachmentsMetadataPath = join(
      outputDir,
      "attachments-metadata.json"
    );

    if (!existsSync(attachmentsMetadataPath)) {
      return NextResponse.json(
        {
          error:
            "Attachment metadata not found. Please extract the issue first.",
        },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(
      readFileSync(attachmentsMetadataPath, "utf-8")
    ) as Array<{
      filename: string;
      contentUrl: string;
      mimeType: string;
    }>;

    const attachment = metadata.find((a) => a.filename === filename);
    if (!attachment?.contentUrl) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Fetch image from Jira on-demand with authentication
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
      "base64"
    );
    const headers = {
      Authorization: `Basic ${auth}`,
    };

    const imageResponse = await axios.get(attachment.contentUrl, {
      headers,
      responseType: "arraybuffer",
    });

    // Determine content type from metadata or filename
    const contentType =
      attachment.mimeType ||
      (() => {
        const ext = filename.toLowerCase().split(".").pop();
        const contentTypeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          bmp: "image/bmp",
          tiff: "image/tiff",
        };
        return contentTypeMap[ext || ""] || "image/jpeg";
      })();

    return new NextResponse(Buffer.from(imageResponse.data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: "Failed to fetch image from Jira",
          details:
            error.response?.status === 404 ? "Image not found" : error.message,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
