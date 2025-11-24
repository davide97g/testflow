import { getEnvVars } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  issueKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, issueKey } = requestSchema.parse(body);

    // Get paths - resolve from admin app to monorepo root
    const workspaceRoot = process.cwd(); // This is apps/admin
    const monorepoRoot = join(workspaceRoot, "..", "..");
    const cliDir = join(monorepoRoot, "apps", "cli");

    // Get environment variables
    const envVars = await getEnvVars();
    const env = {
      ...process.env,
      JIRA_EMAIL: envVars.JIRA_EMAIL,
      JIRA_API_TOKEN: envVars.JIRA_API_TOKEN,
      BITBUCKET_EMAIL: envVars.BITBUCKET_EMAIL,
      BITBUCKET_API_TOKEN: envVars.BITBUCKET_API_TOKEN,
      CONFLUENCE_EMAIL: envVars.CONFLUENCE_EMAIL,
      CONFLUENCE_API_TOKEN: envVars.CONFLUENCE_API_TOKEN,
    };

    // Ensure config exists in monorepo root
    const testflowDir = join(monorepoRoot, ".testflow");
    const configPath = join(testflowDir, "config.json");
    
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(testflowDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // Read the LLM prompt template
    const promptPath = join(cliDir, "prompts", "llm-prompt.md");

    if (!existsSync(promptPath)) {
      return NextResponse.json(
        { error: "LLM prompt template not found" },
        { status: 500 }
      );
    }

    const promptTemplate = readFileSync(promptPath, "utf-8");

    // Read extracted issue data
    const outputDir = join(testflowDir, "output", issueKey);
    const issueDescriptionPath = join(outputDir, "jira-issue-description.txt");
    const prPatchPath = join(outputDir, "pr.patch");
    const confluenceDir = join(outputDir, "confluence");
    const attachmentsMetadataPath = join(outputDir, "attachments-metadata.json");

    let issueDescription = "";
    let prPatch = "";
    let confluenceContent = "";
    let imageAttachmentsSection = "";

    if (existsSync(issueDescriptionPath)) {
      issueDescription = readFileSync(issueDescriptionPath, "utf-8");
    }

    if (existsSync(prPatchPath)) {
      prPatch = readFileSync(prPatchPath, "utf-8");
    }

    // Read Confluence pages
    if (existsSync(confluenceDir)) {
      const { readdirSync } = await import("node:fs");
      const files = readdirSync(confluenceDir);
      const textFiles = files.filter((f) => f.endsWith(".txt"));
      
      for (const file of textFiles) {
        const filePath = join(confluenceDir, file);
        const content = readFileSync(filePath, "utf-8");
        confluenceContent += `\n\n--- Confluence Page: ${file} ---\n${content}`;
      }
    }

    // Read image attachments metadata
    if (existsSync(attachmentsMetadataPath)) {
      try {
        const attachmentsMetadata = JSON.parse(
          readFileSync(attachmentsMetadataPath, "utf-8")
        ) as Array<{
          id: string;
          filename: string;
          mimeType: string;
          size: number;
          contentUrl: string;
          thumbnailUrl?: string;
        }>;

        if (attachmentsMetadata.length > 0) {
          imageAttachmentsSection = "\n\n### Image Attachments\n\n";
          imageAttachmentsSection +=
            "The following images are attached to this Jira issue. ";
          imageAttachmentsSection +=
            "These images may contain important visual information for understanding the requirements:\n\n";

          for (const attachment of attachmentsMetadata) {
            imageAttachmentsSection += `- **${attachment.filename}**\n`;
            imageAttachmentsSection += `  - Type: ${attachment.mimeType}\n`;
            imageAttachmentsSection += `  - Size: ${(attachment.size / 1024).toFixed(2)} KB\n`;
            imageAttachmentsSection += `  - Direct URL: ${attachment.contentUrl}\n`;
            imageAttachmentsSection += `  - Proxy URL: /api/jira/attachments/${issueKey}/${encodeURIComponent(attachment.filename)}\n`;
            if (attachment.thumbnailUrl) {
              imageAttachmentsSection += `  - Thumbnail: ${attachment.thumbnailUrl}\n`;
            }
            imageAttachmentsSection += "\n";
          }

          imageAttachmentsSection +=
            "\n**Note:** Images are fetched on-demand from Jira. ";
          imageAttachmentsSection +=
            "You can use the proxy URLs (which handle authentication) or the direct Jira URLs to access the images.\n";
        }
      } catch (error) {
        console.error("Error reading attachments metadata:", error);
      }
    }

    // Generate the prompt
    const generatedPrompt = `# E2E Test Generation Prompt for ${issueKey}

${promptTemplate}

---

## Input Data

### Jira Issue Description
\`\`\`
${issueDescription}
\`\`\`

${prPatch ? `### PR Patch
\`\`\`patch
${prPatch}
\`\`\`
` : ""}

${confluenceContent ? `### Confluence Pages
${confluenceContent}
` : ""}

${imageAttachmentsSection}

---

Please generate the E2E test based on the above information.
`;

    // Save the generated prompt
    const promptOutputPath = join(outputDir, "llm-prompt.md");
    writeFileSync(promptOutputPath, generatedPrompt, "utf-8");

    return NextResponse.json({
      success: true,
      message: "LLM prompt generated successfully",
      promptPath: promptOutputPath,
    });
  } catch (error) {
    console.error("Error generating prompt:", error);
    return NextResponse.json(
      {
        error: "Failed to generate prompt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

