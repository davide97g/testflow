"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  MoreHorizontal,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const INITIAL_PAGE_SIZE = 10;
const LOAD_MORE_PAGE_SIZE = 10;

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

interface BoardMeta {
  assignees: Array<{
    accountId: string;
    displayName: string;
    emailAddress?: string;
  }>;
  statuses: Array<{ id: string; name: string }>;
  labels: string[];
}

interface JiraSearchSectionProps {
  config: Record<string, unknown> | null;
  title: string;
  description?: string;
  showExtractColumn?: boolean;
  emptyMessage?: string;
}

function getJiraConfig(config: Record<string, unknown>) {
  const jira = config?.jira as
    | {
      boardId?: number | string;
      assignee?: string;
      statuses?: string[];
    }
    | undefined;
  return jira;
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
  const [total, setTotal] = useState(0);
  const [filterDescription, setFilterDescription] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [boardMeta, setBoardMeta] = useState<BoardMeta | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [useAssignee, setUseAssignee] = useState(true);
  const [assignee, setAssignee] = useState<string>("");
  const [useStatuses, setUseStatuses] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [useLabels, setUseLabels] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const fetchBoardMeta = useCallback(async () => {
    if (!config) return;
    try {
      const res = await fetch("/api/jira/board-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as BoardMeta & { error?: string };
      if (data.error && !data.assignees?.length && !data.statuses?.length) return;
      setBoardMeta({
        assignees: data.assignees ?? [],
        statuses: data.statuses ?? [],
        labels: data.labels ?? [],
      });
      const jira = getJiraConfig(config);
      if (jira?.assignee && data.assignees?.length) {
        const match =
          data.assignees.find(
            (a) =>
              a.emailAddress === jira.assignee || a.accountId === jira.assignee
          ) ?? data.assignees.find((a) => a.displayName === jira.assignee);
        if (match) setAssignee(match.accountId);
      } else if (data.assignees?.length) {
        setAssignee((prev) => (prev ? prev : data.assignees[0].accountId));
      }
      if (data.statuses?.length) {
        setSelectedStatuses((prev) => {
          if (prev.length > 0) return prev;
          const fromConfig = jira?.statuses?.length
            ? jira.statuses.filter((s) =>
              data.statuses.some((st) => st.name === s)
            )
            : data.statuses.map((s) => s.name);
          return fromConfig.length ? fromConfig : data.statuses.map((s) => s.name);
        });
      }
    } catch {
      // ignore
    }
  }, [config]);

  useEffect(() => {
    if (config) fetchBoardMeta();
  }, [config, fetchBoardMeta]);

  const buildFilterOverrides = useCallback(() => {
    if (!config) return {};
    const jira = getJiraConfig(config);
    const statusList =
      selectedStatuses.length > 0
        ? selectedStatuses
        : (boardMeta?.statuses.map((s) => s.name) ?? jira?.statuses ?? []);
    return {
      useAssignee,
      assignee: useAssignee ? assignee || null : null,
      useStatuses,
      statuses: useStatuses ? statusList : [],
      useLabels,
      labels: useLabels ? selectedLabels : [],
    };
  }, [
    config,
    useAssignee,
    assignee,
    useStatuses,
    selectedStatuses,
    useLabels,
    selectedLabels,
    boardMeta,
  ]);

  const runSearch = useCallback(
    async (query: string, startAt: number, append: boolean) => {
      if (!config) {
        toast.error("Please configure your settings first");
        return;
      }
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        if (startAt === 0) setIssues([]);
      }
      try {
        const maxResults = startAt === 0 ? INITIAL_PAGE_SIZE : LOAD_MORE_PAGE_SIZE;
        const response = await fetch("/api/workflow/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            query: query.trim(),
            maxResults,
            startAt,
            filterOverrides: buildFilterOverrides(),
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
          total?: number;
        };
        const newIssues = data.issues ?? [];
        if (append) {
          setIssues((prev) => [...prev, ...newIssues]);
        } else {
          setIssues(newIssues);
        }
        setTotal(data.total ?? newIssues.length);
        setFilterDescription(data.filterDescription ?? null);
        if (!append && query.trim()) {
          toast.success(
            `Found ${data.total ?? newIssues.length} issue${(data.total ?? newIssues.length) !== 1 ? "s" : ""}`
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to search Jira"
        );
        if (!append) setFilterDescription(null);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [config, buildFilterOverrides]
  );

  useEffect(() => {
    if (!config) return;
    const jira = getJiraConfig(config);
    const hasBoard = jira?.boardId != null && String(jira.boardId).trim() !== "";
    if (!hasBoard || boardMeta) {
      runSearch("", 0, false);
    }
  }, [config, boardMeta, runSearch]);

  const handleSearchSubmit = useCallback(() => {
    runSearch(searchQuery, 0, false);
  }, [runSearch, searchQuery]);

  const handleLoadMore = useCallback(() => {
    runSearch(searchQuery, issues.length, true);
  }, [runSearch, searchQuery, issues.length]);

  const toggleStatus = useCallback((name: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }, []);

  const toggleLabel = useCallback((label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }, []);

  if (!config) {
    return null;
  }

  const statusOptions = boardMeta?.statuses ?? [];
  const assigneeOptions = boardMeta?.assignees ?? [];
  const labelOptions = boardMeta?.labels ?? [];
  const hasMore = issues.length < total && total > 0;

  return (
    <Card className="mb-6 overflow-hidden border-0 bg-linear-to-b from-muted/20 to-transparent shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground/90">
            {description}
          </CardDescription>
        )}
        {filterDescription && (
          <p
            className="mt-2 text-xs text-muted-foreground/80 rounded-md bg-muted/50 px-2.5 py-1.5 max-w-2xl"
            title={filterDescription}
          >
            <span className="font-medium">Active:</span>{" "}
            <span className="truncate block">{filterDescription}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Filters: compact, collapsible */}
        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-transparent py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/30"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-label="Toggle filters"
          >
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
            <MoreHorizontal className="h-4 w-4 shrink-0" />
            <span>Filters</span>
          </button>

          {filtersOpen && (
            <section
              className="grid gap-5 rounded-xl border bg-background/80 p-4 shadow-sm sm:grid-cols-1 md:grid-cols-3"
              aria-label="Search filters"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-assignee"
                    checked={useAssignee}
                    onChange={(e) => setUseAssignee(e.target.checked)}
                    aria-label="Filter by assignee"
                  />
                  <Label
                    htmlFor="filter-assignee"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Assignee
                  </Label>
                </div>
                {assigneeOptions.length > 0 ? (
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    disabled={!useAssignee}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                    aria-label="Select assignee"
                  >
                    <option value="">Any</option>
                    {assigneeOptions.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {a.displayName}
                        {a.emailAddress ? ` (${a.emailAddress})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Set board in config and refresh to load assignees.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-statuses"
                    checked={useStatuses}
                    onChange={(e) => setUseStatuses(e.target.checked)}
                    aria-label="Filter by statuses"
                  />
                  <Label
                    id="filter-statuses-label"
                    htmlFor="filter-statuses"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Statuses
                  </Label>
                </div>
                {statusOptions.length > 0 ? (
                  <fieldset
                    className="max-h-28 overflow-y-auto rounded-lg border border-input bg-background p-2"
                    aria-labelledby="filter-statuses-label"
                  >
                    {statusOptions.map((s) => (
                      <label
                        key={s.id}
                        htmlFor={`status-${s.id}`}
                        className="flex cursor-pointer items-center gap-2 py-0.5 text-sm"
                      >
                        <Checkbox
                          id={`status-${s.id}`}
                          checked={
                            useStatuses && selectedStatuses.includes(s.name)
                          }
                          onChange={() => toggleStatus(s.name)}
                          disabled={!useStatuses}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Set board in config to load statuses.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-labels"
                    checked={useLabels}
                    onChange={(e) => setUseLabels(e.target.checked)}
                    aria-label="Filter by labels"
                  />
                  <Label
                    id="filter-labels-label"
                    htmlFor="filter-labels"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Labels
                  </Label>
                </div>
                {labelOptions.length > 0 ? (
                  <fieldset
                    className="max-h-28 overflow-y-auto rounded-lg border border-input bg-background p-2"
                    aria-labelledby="filter-labels-label"
                  >
                    {labelOptions.map((l) => (
                      <label
                        key={l}
                        htmlFor={`label-${l}`}
                        className="flex cursor-pointer items-center gap-2 py-0.5 text-sm"
                      >
                        <Checkbox
                          id={`label-${l}`}
                          checked={useLabels && selectedLabels.includes(l)}
                          onChange={() => toggleLabel(l)}
                          disabled={!useLabels}
                        />
                        <span>{l}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No labels from board issues.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Search bar: prominent, single row */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Issue key, Jira URL, or text…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              className="max-w-sm flex-1 min-w-[200px] rounded-lg border-input bg-background shadow-sm transition-shadow focus-visible:ring-2"
              aria-label="Search Jira by key, URL, or text"
            />
            <Button
              onClick={handleSearchSubmit}
              disabled={isLoading}
              size="default"
              className="rounded-lg shadow-sm"
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
                runSearch("", 0, false);
              }}
              disabled={isLoading}
              size="default"
              variant="outline"
              className="rounded-lg"
            >
              Show all
            </Button>
          </div>
        </div>

        {/* Results */}
        {isLoading && issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <span className="text-sm">Loading issues…</span>
          </div>
        ) : issues.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center text-muted-foreground">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b bg-muted/30">
                    <TableHead className="w-[100px]">Key</TableHead>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[60px]">PR</TableHead>
                    <TableHead className="w-[140px]">Branch</TableHead>
                    <TableHead className="min-w-[160px]">Confluence</TableHead>
                    <TableHead className="w-[80px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue, index) => (
                    <TableRow
                      key={issue.key}
                      className="transition-colors hover:bg-muted/40 border-b border-border/50"
                      style={{
                        animationDelay: `${Math.min(index * 20, 200)}ms`,
                      }}
                    >
                      <TableCell className="font-mono text-sm font-medium text-foreground/90">
                        {issue.key}
                      </TableCell>
                      <TableCell className="min-w-[200px] max-w-md">
                        <span
                          className="line-clamp-2 text-sm"
                          title={issue.title}
                        >
                          {issue.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-muted/80 px-2 py-0.5 text-xs font-medium text-foreground/90 whitespace-nowrap">
                          {issue.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {issue.prOpen === "Y" ? (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        {issue.branchName ? (
                          <a
                            href={issue.branchUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 truncate text-sm text-primary hover:underline"
                          >
                            <GitBranch className="h-3 w-3 shrink-0" />
                            <span className="truncate" title={issue.branchName}>
                              {issue.branchName}
                            </span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {issue.confluencePages &&
                          issue.confluencePages.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {issue.confluencePages.slice(0, 2).map((page) => (
                              <a
                                key={page.id}
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 truncate text-xs text-primary hover:underline"
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate" title={page.title}>
                                  {page.title}
                                </span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ))}
                            {issue.confluencePages.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{issue.confluencePages.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/workflow/${issue.key}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            title="Create test case"
                            aria-label={`Create test case for ${issue.key}`}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Link>
                          {showExtractColumn && (
                            <Link href={`/workflow/${issue.key}`}>
                              <Button size="sm" variant="ghost" className="h-8 text-xs">
                                Extract
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  size="default"
                  className="rounded-lg min-w-[140px]"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Load more (${issues.length} / ${total})`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
