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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Download,
  FileText,
  GitBranch,
  Loader2,
  Search,
  Sparkles,
  BookOpen,
  Code,
  Database,
  Image as ImageIcon,
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

interface ImageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentUrl: string;
  thumbnailUrl?: string;
}

interface OutputFile {
  path: string;
  content: string;
  name: string;
}

type FileCategory = "prompt" | "jira" | "bitbucket" | "confluence" | "zephyr" | "other";

interface CategorizedFiles {
  prompt: OutputFile[];
  jira: OutputFile[];
  bitbucket: OutputFile[];
  confluence: OutputFile[];
  zephyr: OutputFile[];
  other: OutputFile[];
}

const CONFIG_STORAGE_KEY = "testflow_config";

export default function WorkflowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<FileCategory>("prompt");

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

  const handleSearch = async () => {
    if (!config) {
      toast.error("Please configure your settings first");
      return;
    }

    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setIssues([]);

    try {
      const response = await fetch("/api/workflow/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, query: searchQuery.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to search issues");
      }

      const data = await response.json();
      setIssues(data.issues || []);
      
      if (data.issues && data.issues.length === 0) {
        toast.info("No issues found");
      } else {
        toast.success(`Found ${data.issues?.length || 0} issue(s)`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to search issues"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const loadAttachments = async (issueKey: string) => {
    if (!config) return;

    setIsLoadingAttachments(true);
    try {
      const response = await fetch("/api/jira/attachments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, issueKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setImageAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error("Failed to load attachments:", error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const handleExtract = async (issue: JiraIssue) => {
    if (!config) {
      toast.error("Please configure your settings first");
      return;
    }

    setIsExtracting(true);
    setSelectedIssue(issue);
    setOutputFiles([]);
    // Load attachments when issue is selected
    await loadAttachments(issue.key);

    try {
      const response = await fetch("/api/workflow/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, issueKey: issue.key }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract issue data");
      }

      const data = await response.json();
      toast.success("Issue data extracted successfully");
      
      // Load output files
      await loadOutputFiles(issue.key);
      // Reload attachments after extraction
      await loadAttachments(issue.key);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to extract issue data"
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedIssue) {
      toast.error("Please select an issue first");
      return;
    }

    if (!config) {
      toast.error("Please configure your settings first");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config,
          issueKey: selectedIssue.key,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate prompt");
      }

      const data = await response.json();
      toast.success("LLM prompt generated successfully");
      
      // Reload output files
      await loadOutputFiles(selectedIssue.key);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate prompt"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const loadOutputFiles = async (issueKey: string) => {
    try {
      const response = await fetch(
        `/api/workflow/files?issueKey=${encodeURIComponent(issueKey)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load output files");
      }

      const data = await response.json();
      const files = data.files || [];
      setOutputFiles(files);

      // Initialize active tab based on available files
      if (files.length > 0) {
        const categorized = categorizeFiles(files);
        const availableTabs: FileCategory[] = [];
        if (categorized.jira.length > 0) availableTabs.push("jira");
        if (categorized.bitbucket.length > 0) availableTabs.push("bitbucket");
        if (categorized.confluence.length > 0) availableTabs.push("confluence");
        if (categorized.zephyr.length > 0) availableTabs.push("zephyr");
        if (categorized.other.length > 0) availableTabs.push("other");

        // Set to first available tab if current tab is not available
        if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
          setActiveTab(availableTabs[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load output files:", error);
    }
  };

  const categorizeFiles = (files: OutputFile[]): CategorizedFiles => {
    const categorized: CategorizedFiles = {
      prompt: [],
      jira: [],
      bitbucket: [],
      confluence: [],
      zephyr: [],
      other: [],
    };

    files.forEach((file) => {
      const path = file.path.toLowerCase();
      const name = file.name.toLowerCase();

      if (name.includes("llm-prompt") || name.includes("prompt")) {
        categorized.prompt.push(file);
      } else if (
        path.includes("jira") ||
        name.includes("jira") ||
        name === "jira-issue-description.txt"
      ) {
        categorized.jira.push(file);
      } else if (
        path.includes("bitbucket") ||
        path.includes("pr") ||
        name.includes("pr") ||
        name.includes("branch") ||
        name.includes("pullrequest")
      ) {
        categorized.bitbucket.push(file);
      } else if (
        path.includes("confluence") ||
        name.includes("confluence") ||
        name.startsWith("page-")
      ) {
        categorized.confluence.push(file);
      } else if (path.includes("zephyr") || name.includes("zephyr")) {
        categorized.zephyr.push(file);
      } else {
        categorized.other.push(file);
      }
    });

    return categorized;
  };

  const handleCopy = async (content: string, path: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPath(path);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = (file: OutputFile) => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${file.name}`);
  };

  const renderFileCard = (file: OutputFile) => (
    <Card key={file.path}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <CardTitle className="text-base">{file.name}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(file.content, file.path)}
            >
              {copiedPath === file.path ? (
                <>
                  <Check className="mr-2 h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(file)}
            >
              <Download className="mr-2 h-3 w-3" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-muted p-4">
          <pre className="max-h-96 overflow-auto text-sm">
            <code>{file.content}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );

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

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Search Jira Issue</CardTitle>
            <CardDescription>
              Search for a Jira issue by key or title
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Jira issue key (e.g., PROJ-123) or search query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {issues.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Select an issue to extract data and generate tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PR</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Confluence</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow
                      key={issue.key}
                      className={
                        selectedIssue?.key === issue.key
                          ? "bg-muted"
                          : undefined
                      }
                    >
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
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleExtract(issue)}
                          disabled={isExtracting}
                        >
                          {isExtracting &&
                          selectedIssue?.key === issue.key ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Extracting...
                            </>
                          ) : (
                            "Extract"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Image Attachments Section */}
        {selectedIssue && imageAttachments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Image Attachments
              </CardTitle>
              <CardDescription>
                Images attached to issue{" "}
                <span className="font-mono font-medium">
                  {selectedIssue.key}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAttachments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Loading attachments...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video bg-muted flex items-center justify-center relative group">
                        <img
                          src={`/api/jira/attachments/${selectedIssue.key}/${encodeURIComponent(attachment.filename)}`}
                          alt={attachment.filename}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to content URL if local image fails
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes(attachment.contentUrl)) {
                              target.src = attachment.contentUrl;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <a
                            href={`/api/jira/attachments/${selectedIssue.key}/${encodeURIComponent(attachment.filename)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white bg-black/50 px-3 py-1 rounded text-sm hover:bg-black/70"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Full Size
                          </a>
                        </div>
                      </div>
                      <div className="p-3 border-t">
                        <p className="text-sm font-medium truncate" title={attachment.filename}>
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(attachment.size / 1024).toFixed(2)} KB • {attachment.mimeType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generate Prompt Section */}
        {selectedIssue && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 2: Generate LLM Prompt</CardTitle>
              <CardDescription>
                Generate a prompt for LLM to create E2E tests for{" "}
                <span className="font-mono font-medium">
                  {selectedIssue.key}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate LLM Prompt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Output Files Section */}
        {outputFiles.length > 0 && (() => {
          const categorized = categorizeFiles(outputFiles);
          const hasPrompt = categorized.prompt.length > 0;
          const hasJira = categorized.jira.length > 0;
          const hasBitbucket = categorized.bitbucket.length > 0;
          const hasConfluence = categorized.confluence.length > 0;
          const hasZephyr = categorized.zephyr.length > 0;
          const hasOther = categorized.other.length > 0;

          // Determine available tabs
          const availableTabs: FileCategory[] = [];
          if (hasJira) availableTabs.push("jira");
          if (hasBitbucket) availableTabs.push("bitbucket");
          if (hasConfluence) availableTabs.push("confluence");
          if (hasZephyr) availableTabs.push("zephyr");
          if (hasOther) availableTabs.push("other");

          // Set initial tab if current tab is not available
          if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
            setActiveTab(availableTabs[0]);
          }

          return (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Output Files</CardTitle>
                <CardDescription>
                  View, copy, or download the generated files organized by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Prompt Section - Always shown first if available */}
                {hasPrompt && (
                  <div className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">LLM Prompt (Ready to Copy)</h3>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const promptFile = categorized.prompt[0];
                          if (promptFile) {
                            handleCopy(promptFile.content, promptFile.path);
                          }
                        }}
                      >
                        {copiedPath === categorized.prompt[0]?.path ? (
                          <>
                            <Check className="mr-2 h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-3 w-3" />
                            Copy Prompt
                          </>
                        )}
                      </Button>
                    </div>
                    {categorized.prompt.map((file) => (
                      <div key={file.path} className="mb-4">
                        {renderFileCard(file)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabs for other categories */}
                {availableTabs.length > 0 && (
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as FileCategory)}
                  >
                    <TabsList
                      className={cn(
                        "grid w-full",
                        availableTabs.length === 1 && "grid-cols-1",
                        availableTabs.length === 2 && "grid-cols-2",
                        availableTabs.length === 3 && "grid-cols-3",
                        availableTabs.length === 4 && "grid-cols-4",
                        availableTabs.length === 5 && "grid-cols-5"
                      )}
                    >
                      {hasJira && (
                        <TabsTrigger value="jira" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Jira
                        </TabsTrigger>
                      )}
                      {hasBitbucket && (
                        <TabsTrigger value="bitbucket" className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Bitbucket
                        </TabsTrigger>
                      )}
                      {hasConfluence && (
                        <TabsTrigger value="confluence" className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Confluence
                        </TabsTrigger>
                      )}
                      {hasZephyr && (
                        <TabsTrigger value="zephyr" className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Zephyr
                        </TabsTrigger>
                      )}
                      {hasOther && (
                        <TabsTrigger value="other" className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Other
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {hasJira && (
                      <TabsContent value="jira">
                        <div className="space-y-4 mt-4">
                          {categorized.jira.map((file) => renderFileCard(file))}
                        </div>
                      </TabsContent>
                    )}

                    {hasBitbucket && (
                      <TabsContent value="bitbucket">
                        <div className="space-y-4 mt-4">
                          {categorized.bitbucket.map((file) => renderFileCard(file))}
                        </div>
                      </TabsContent>
                    )}

                    {hasConfluence && (
                      <TabsContent value="confluence">
                        <div className="space-y-4 mt-4">
                          {categorized.confluence.map((file) => renderFileCard(file))}
                        </div>
                      </TabsContent>
                    )}

                    {hasZephyr && (
                      <TabsContent value="zephyr">
                        <div className="space-y-4 mt-4">
                          {categorized.zephyr.map((file) => renderFileCard(file))}
                        </div>
                      </TabsContent>
                    )}

                    {hasOther && (
                      <TabsContent value="other">
                        <div className="space-y-4 mt-4">
                          {categorized.other.map((file) => renderFileCard(file))}
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}

