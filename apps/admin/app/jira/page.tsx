"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ConfluencePage {
  id: string;
  title: string;
  url: string;
}

interface JiraIssue {
  key: string;
  title: string;
  status: string;
  prOpen: "Y" | "N";
  branchName?: string;
  branchUrl?: string;
  confluencePages?: ConfluencePage[];
}

const CONFIG_STORAGE_KEY = "testflow_config";

export default function JiraPage() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    // Load config from localStorage
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        // Invalid JSON
      }
    }
  }, []);

  const fetchIssues = async () => {
    if (!config) {
      toast.error("Please configure your settings first");
      return;
    }

    setIsLoading(true);
    setIssues([]);
    setProgress(null);

    try {
      const response = await fetch("/api/jira/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error("Failed to start fetching issues");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "total") {
                setProgress({ current: 0, total: data.total });
              } else if (data.type === "issue") {
                setIssues((prev) => {
                  // Deduplicate by key
                  const exists = prev.some((i) => i.key === data.issue.key);
                  if (exists) {
                    return prev;
                  }
                  return [...prev, data.issue];
                });
                setProgress({
                  current: data.progress,
                  total: data.total,
                });
              } else if (data.type === "done") {
                setIsLoading(false);
                toast.success(`Fetched ${data.total} issues`);
              } else if (data.type === "error") {
                throw new Error(data.error || "Failed to fetch issues");
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch issues"
      );
    }
  };

  useEffect(() => {
    if (config) {
      fetchIssues();
    }
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">
              Jira Issues
            </h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Please configure your settings first
              </p>
              <Link href="/config">
                <Button>Go to Configuration</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Home
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Jira Issues</h1>
              <p className="mt-2 text-muted-foreground">
                View Jira issues with linked Confluence pages and branches
              </p>
            </div>
            <Button onClick={fetchIssues} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Issues</CardTitle>
                <CardDescription>
                  {progress
                    ? `${progress.current}/${progress.total} Jira issues`
                    : issues.length > 0
                    ? `${issues.length} issue${
                        issues.length !== 1 ? "s" : ""
                      } found`
                    : "No issues found"}
                </CardDescription>
              </div>
              {progress && (
                <div className="text-sm text-muted-foreground">
                  {Math.round((progress.current / progress.total) * 100)}%
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && issues.length === 0 && !progress ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : issues.length === 0 && !isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                No issues found
              </div>
            ) : (
              <>
                {isLoading && progress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Fetching issues...</span>
                      <span>
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (progress.current / progress.total) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PR</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Confluence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.key}>
                        <TableCell className="font-mono font-medium">
                          {issue.key}
                        </TableCell>
                        <TableCell>{issue.title}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {issue.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {issue.prOpen === "Y" ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {issue.branchName ? (
                            <a
                              href={issue.branchUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <GitBranch className="h-3 w-3" />
                              {issue.branchName}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {issue.confluencePages &&
                          issue.confluencePages.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {issue.confluencePages.map((page) => (
                                <a
                                  key={page.id}
                                  href={page.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  {page.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
