import { NextRequest, NextResponse } from "next/server";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const issueKey = searchParams.get("issueKey");

    if (!issueKey) {
      return NextResponse.json(
        { error: "issueKey parameter is required" },
        { status: 400 }
      );
    }

    // Output directory is in the monorepo root, not in admin app
    const workspaceRoot = process.cwd(); // This is apps/admin
    const monorepoRoot = join(workspaceRoot, "..", "..");
    const outputDir = join(monorepoRoot, ".testflow", "output", issueKey);

    if (!existsSync(outputDir)) {
      return NextResponse.json({ files: [] });
    }

    const files: Array<{ path: string; content: string; name: string }> = [];

    // Function to recursively read files
    const readFilesRecursively = (dir: string, basePath: string = "") => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = join(basePath, entry.name);

        if (entry.isDirectory()) {
          readFilesRecursively(fullPath, relativePath);
        } else if (entry.isFile()) {
          // Only include text-based files
          const ext = entry.name.split(".").pop()?.toLowerCase();
          const textExtensions = [
            "txt",
            "md",
            "json",
            "ts",
            "tsx",
            "js",
            "jsx",
            "patch",
            "diff",
          ];

          if (textExtensions.includes(ext || "")) {
            try {
              const content = readFileSync(fullPath, "utf-8");
              files.push({
                path: relativePath,
                content,
                name: entry.name,
              });
            } catch (error) {
              // Skip files that can't be read
              console.error(`Failed to read file ${fullPath}:`, error);
            }
          }
        }
      }
    };

    readFilesRecursively(outputDir);

    // Sort files by name
    files.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error reading output files:", error);
    return NextResponse.json(
      {
        error: "Failed to read output files",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

