"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  GitBranch,
  Loader2,
  Search,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

export default function WorkflowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allIssues, setAllIssues] = useState<JiraIssue[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        // Invalid JSON
      }
    }
  }, []);

  const fetchIssuesFromStream = useCallback(async () => {
    if (!config) {
      toast.error("Please configure your settings first");
      return;
    }

    setIsLoadingIssues(true);
    setAllIssues([]);
    setStreamProgress(null);

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
                setStreamProgress({ current: 0, total: data.total });
              } else if (data.type === "issue") {
                setAllIssues((prev) => {
                  const exists = prev.some((i) => i.key === data.issue.key);
                  if (exists) return prev;
                  return [...prev, data.issue];
                });
                setStreamProgress({
                  current: data.progress,
                  total: data.total,
                });
              } else if (data.type === "done") {
                setIsLoadingIssues(false);
                toast.success(`Loaded ${data.total} issues`);
              } else if (data.type === "error") {
                throw new Error(data.error || "Failed to fetch issues");
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (error) {
      setIsLoadingIssues(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch issues"
      );
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      fetchIssuesFromStream();
    }
  }, [config, fetchIssuesFromStream]);

  const issues = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allIssues;
    return allIssues.filter(
      (issue) =>
        issue.key.toLowerCase().includes(q) ||
        issue.title.toLowerCase().includes(q)
    );
  })();

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
              E2E Test Generation Workflow
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
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            E2E Test Generation Workflow
          </h1>
          <p className="mt-2 text-muted-foreground">
            Search Jira issues, extract data, and generate E2E test prompts
          </p>
        </div>

        {/* Search Section with Results - same as /jira: full list + text filter */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Step 1: Search Jira Issue</CardTitle>
                <CardDescription>
                  {streamProgress
                    ? `${streamProgress.current}/${streamProgress.total} Jira issues`
                    : allIssues.length > 0
                    ? searchQuery.trim()
                      ? `${issues.length} of ${allIssues.length} issue${issues.length !== 1 ? "s" : ""} (filtered)`
                      : `${allIssues.length} issue${allIssues.length !== 1 ? "s" : ""} assigned to you`
                    : "Load issues from Jira (assignee + statuses from config)"}
                </CardDescription>
              </div>
              <Button
                onClick={fetchIssuesFromStream}
                disabled={isLoadingIssues}
                size="sm"
                variant="outline"
              >
                {isLoadingIssues ? (
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
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Filter by key or title (e.g. PROJ-123 or tab)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="max-w-md"
                aria-label="Filter Jira issues by key or title"
              />
              <span className="flex items-center text-muted-foreground text-sm">
                <Search className="h-4 w-4 mr-1" />
                Filter
              </span>
            </div>

            {isLoadingIssues && allIssues.length === 0 && !streamProgress ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allIssues.length === 0 && !isLoadingIssues ? (
              <div className="py-12 text-center text-muted-foreground">
                No issues found. Check config (assignee and statuses) and click Refresh.
              </div>
            ) : (
              <>
                {isLoadingIssues && streamProgress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Fetching issues...</span>
                      <span>
                        {streamProgress.current} / {streamProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(streamProgress.current / streamProgress.total) * 100}%`,
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
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No issues match &quot;{searchQuery.trim()}&quot;
                        </TableCell>
                      </TableRow>
                    ) : (
                      issues.map((issue) => (
                        <TableRow key={issue.key}>
                          <TableCell className="font-mono font-medium whitespace-nowrap">
                            {issue.key}
                          </TableCell>
                          <TableCell className="min-w-[200px] max-w-md">
                            <span className="line-clamp-2" title={issue.title}>
                              {issue.title}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="rounded-full bg-muted px-2 py-1 text-xs whitespace-nowrap">
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
                                <GitBranch className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[140px]" title={issue.branchName}>
                                  {issue.branchName}
                                </span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {issue.confluencePages && issue.confluencePages.length > 0 ? (
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                {issue.confluencePages.map((page) => (
                                  <a
                                    key={page.id}
                                    href={page.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                                  >
                                    <FileText className="h-3 w-3 shrink-0" />
                                    <span className="truncate" title={page.title}>
                                      {page.title}
                                    </span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/workflow/${issue.key}`}>
                              <Button size="sm">Extract</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
