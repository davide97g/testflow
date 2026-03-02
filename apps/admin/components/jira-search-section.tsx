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
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface ConfluencePage {
  id: string;
  title: string;
  url: string;
}

export interface JiraIssue {
  key: string;
  title: string;
  status: string;
  prOpen: "Y" | "N";
  branchName?: string;
  branchUrl?: string;
  confluencePages?: ConfluencePage[];
}

interface JiraSearchSectionProps {
  config: Record<string, unknown> | null;
  title: string;
  description?: string;
  showExtractColumn?: boolean;
  emptyMessage?: string;
}

export function JiraSearchSection({
  config,
  title,
  description,
  showExtractColumn = false,
  emptyMessage = "No issues found. Check board, assignee and statuses in config.",
}: JiraSearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [filterDescription, setFilterDescription] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = useCallback(
    async (query: string) => {
      if (!config) {
        toast.error("Please configure your settings first");
        return;
      }
      setIsLoading(true);
      setIssues([]);
      try {
        const maxResults = query.trim() ? 50 : 100;
        const response = await fetch("/api/workflow/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            query: query.trim(),
            maxResults,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error || "Search failed"
          );
        }
        const data = (await response.json()) as {
          issues?: JiraIssue[];
          filterDescription?: string;
        };
        setIssues(data.issues ?? []);
        setFilterDescription(data.filterDescription ?? null);
        if (query.trim()) {
          toast.success(
            `Found ${(data.issues ?? []).length} issue${(data.issues ?? []).length !== 1 ? "s" : ""}`
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to search Jira"
        );
        setFilterDescription(null);
      } finally {
        setIsLoading(false);
      }
    },
    [config]
  );

  useEffect(() => {
    if (config) {
      runSearch("");
    }
  }, [config, runSearch]);

  const handleSearchSubmit = useCallback(() => {
    runSearch(searchQuery);
  }, [runSearch, searchQuery]);

  if (!config) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
            {filterDescription ? (
              <span className="mt-2 block rounded-md bg-muted px-2 py-1.5 text-sm font-medium text-muted-foreground">
                Active filter: {filterDescription}
              </span>
            ) : null}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by issue key (e.g. BAT-3000), full Jira URL, or text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            className="max-w-md"
            aria-label="Search Jira by key, URL, or text"
          />
          <Button
            onClick={handleSearchSubmit}
            disabled={isLoading}
            size="default"
            variant="secondary"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              setSearchQuery("");
              runSearch("");
            }}
            disabled={isLoading}
            size="default"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Show all"
            )}
          </Button>
        </div>

        {isLoading && issues.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PR</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Confluence</TableHead>
                {showExtractColumn ? (
                  <TableHead className="text-right">Action</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
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
                        <span
                          className="truncate max-w-[140px]"
                          title={issue.branchName}
                        >
                          {issue.branchName}
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {issue.confluencePages &&
                    issue.confluencePages.length > 0 ? (
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
                            <span
                              className="truncate"
                              title={page.title}
                            >
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
                  {showExtractColumn ? (
                    <TableCell className="text-right">
                      <Link href={`/workflow/${issue.key}`}>
                        <Button size="sm">Extract</Button>
                      </Link>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
