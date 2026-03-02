"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getTokenEstimateSummary, optimizePromptForTokens, type PromptOptimizationResult } from "@/lib/token-count";
import {
  Check,
  Copy,
  Download,
  FileText,
  GitBranch,
  Loader2,
  Sparkles,
  BookOpen,
  Code,
  Database,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

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

type ExtractionStatus = "pending" | "loading" | "success" | "error" | "no-data" | "disabled";

export default function WorkflowIssuePage() {
  const params = useParams();
  const issueKey = typeof params?.issueKey === "string" ? params.issueKey : null;
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FileCategory>("prompt");
  const extractionStartedRef = useRef(false);

  const [extractionStatus, setExtractionStatus] = useState<{
    jira: ExtractionStatus;
    bitbucket: ExtractionStatus;
    confluence: ExtractionStatus;
    zephyr: ExtractionStatus;
    attachments: ExtractionStatus;
  }>({
    jira: "pending",
    bitbucket: "pending",
    confluence: "pending",
    zephyr: "pending",
    attachments: "pending",
  });

  const [selectedSections, setSelectedSections] = useState({
    jira: true,
    bitbucket: true,
    confluence: true,
    zephyr: true,
  });
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [extractionErrorDetails, setExtractionErrorDetails] = useState<{
    bitbucket?: { tokenExpired?: boolean };
    confluence?: { tokenExpired?: boolean };
  }>({});
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizedPromptResult, setOptimizedPromptResult] = useState<PromptOptimizationResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const loadOutputFiles = useCallback(async (key: string) => {
    try {
      const response = await fetch(
        `/api/workflow/files?issueKey=${encodeURIComponent(key)}`
      );
      if (!response.ok) throw new Error("Failed to load output files");
      const data = await response.json();
      const files = data.files || [];
      setOutputFiles(files);
    } catch (err) {
      console.error("Failed to load output files:", err);
    }
  }, []);

  const handleExtract = useCallback(
    async (key: string) => {
      if (!config) {
        toast.error("Please configure your settings first");
        return;
      }

      setIsExtracting(true);
      setOutputFiles([]);
      setExtractionStatus({
        jira: "pending",
        bitbucket: "pending",
        confluence: "pending",
        zephyr: "pending",
        attachments: "pending",
      });
      setExtractionErrorDetails({});

      const c = config as {
        jira?: { baseUrl?: string };
        bitbucket?: { workspace?: string; repo?: string };
        confluence?: { baseUrl?: string };
        zephyr?: { projectKey?: string };
      };
      const hasJira = !!c.jira?.baseUrl;
      const hasBitbucket = !!c.bitbucket?.workspace && !!c.bitbucket?.repo;
      const hasConfluence = !!c.confluence?.baseUrl;
      const hasZephyr = !!c.zephyr?.projectKey;

      if (!hasJira) setExtractionStatus((p) => ({ ...p, jira: "disabled" }));
      if (!hasBitbucket) setExtractionStatus((p) => ({ ...p, bitbucket: "disabled" }));
      if (!hasConfluence) setExtractionStatus((p) => ({ ...p, confluence: "disabled" }));
      if (!hasZephyr) setExtractionStatus((p) => ({ ...p, zephyr: "disabled" }));

      const fetchPromises: Promise<void>[] = [];

      if (hasJira) {
        setExtractionStatus((p) => ({ ...p, jira: "loading" }));
        fetchPromises.push(
          fetch("/api/workflow/extract/jira", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config, issueKey: key }),
          })
            .then(async (res) => {
              if (res.ok) setExtractionStatus((p) => ({ ...p, jira: "success" }));
              else setExtractionStatus((p) => ({ ...p, jira: "error" }));
            })
            .catch(() => setExtractionStatus((p) => ({ ...p, jira: "error" })))
        );
      }

      if (hasBitbucket) {
        setExtractionStatus((p) => ({ ...p, bitbucket: "loading" }));
        fetchPromises.push(
          fetch("/api/workflow/extract/bitbucket", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config, issueKey: key }),
          })
            .then(async (res) => {
              const data = await res.json().catch(() => ({}));
              if (res.ok) {
                if (data.success === false) {
                  setExtractionStatus((p) => ({ ...p, bitbucket: "error" }));
                  setExtractionErrorDetails((p) => ({
                    ...p,
                    bitbucket: { tokenExpired: data.tokenExpired === true },
                  }));
                  if (data.error && !data.tokenExpired) toast.error(`Bitbucket: ${data.error}`);
                } else {
                  setExtractionStatus((p) => ({
                    ...p,
                    bitbucket: data.hasData ? "success" : "no-data",
                  }));
                  setExtractionErrorDetails((p) => ({ ...p, bitbucket: undefined }));
                }
              } else {
                setExtractionStatus((p) => ({ ...p, bitbucket: "error" }));
                setExtractionErrorDetails((p) => ({
                  ...p,
                  bitbucket: { tokenExpired: data.tokenExpired === true },
                }));
              }
            })
            .catch(() => setExtractionStatus((p) => ({ ...p, bitbucket: "error" })))
        );
      }

      if (hasConfluence) {
        setExtractionStatus((p) => ({ ...p, confluence: "loading" }));
        fetchPromises.push(
          fetch("/api/workflow/extract/confluence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config, issueKey: key }),
          })
            .then(async (res) => {
              const data = await res.json().catch(() => ({}));
              if (res.ok) {
                if (data.success === false) {
                  setExtractionStatus((p) => ({ ...p, confluence: "error" }));
                  setExtractionErrorDetails((p) => ({
                    ...p,
                    confluence: { tokenExpired: data.tokenExpired === true },
                  }));
                  if (data.error && !data.tokenExpired) toast.error(`Confluence: ${data.error}`);
                } else {
                  setExtractionStatus((p) => ({
                    ...p,
                    confluence: data.hasData ? "success" : "no-data",
                  }));
                  setExtractionErrorDetails((p) => ({ ...p, confluence: undefined }));
                }
              } else {
                setExtractionStatus((p) => ({ ...p, confluence: "error" }));
                setExtractionErrorDetails((p) => ({
                  ...p,
                  confluence: { tokenExpired: data.tokenExpired === true },
                }));
              }
            })
            .catch(() => setExtractionStatus((p) => ({ ...p, confluence: "error" })))
        );
      }

      if (hasZephyr) {
        setExtractionStatus((p) => ({ ...p, zephyr: "loading" }));
        fetchPromises.push(
          fetch("/api/workflow/extract/zephyr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config, issueKey: key }),
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                setExtractionStatus((p) => ({
                  ...p,
                  zephyr: data.hasData ? "success" : "no-data",
                }));
              } else setExtractionStatus((p) => ({ ...p, zephyr: "no-data" }));
            })
            .catch(() => setExtractionStatus((p) => ({ ...p, zephyr: "no-data" })))
        );
      }

      setExtractionStatus((p) => ({ ...p, attachments: "loading" }));
      fetchPromises.push(
        (async () => {
          try {
            const response = await fetch("/api/jira/attachments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ config, issueKey: key }),
            });
            if (response.ok) {
              const data = await response.json();
              const attachments = data.attachments || [];
              setImageAttachments(attachments);
              setExtractionStatus((p) => ({
                ...p,
                attachments: attachments.length > 0 ? "success" : "no-data",
              }));
            } else setExtractionStatus((p) => ({ ...p, attachments: "no-data" }));
          } catch {
            setExtractionStatus((p) => ({ ...p, attachments: "no-data" }));
          }
        })()
      );

      await Promise.all(fetchPromises);

      try {
        const response = await fetch("/api/workflow/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, issueKey: key }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to extract issue data");
        }
        toast.success("Data extraction completed");
        await loadOutputFiles(key);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to extract issue data");
      } finally {
        setIsExtracting(false);
      }
    },
    [config, loadOutputFiles]
  );

  useEffect(() => {
    if (!issueKey || !config || extractionStartedRef.current) return;
    extractionStartedRef.current = true;
    handleExtract(issueKey);
  }, [issueKey, config, handleExtract]);

  const handleGenerate = useCallback(async () => {
    if (!issueKey || !config) {
      toast.error("Configuration or issue missing");
      return;
    }
    const hasSelection = Object.values(selectedSections).some(Boolean);
    if (!hasSelection) {
      toast.error("Please select at least one section to include in the prompt");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          issueKey,
          selectedSections,
          includeAttachments,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate prompt");
      }
      toast.success("LLM prompt generated successfully");
      await loadOutputFiles(issueKey);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate prompt");
    } finally {
      setIsGenerating(false);
    }
  }, [config, issueKey, selectedSections, includeAttachments, loadOutputFiles]);

  const categorizeFiles = useCallback((files: OutputFile[]): CategorizedFiles => {
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
      if (name.includes("llm-prompt") || name.includes("prompt")) categorized.prompt.push(file);
      else if (path.includes("jira") || name.includes("jira") || name === "jira-issue-description.txt")
        categorized.jira.push(file);
      else if (path.includes("bitbucket") || path.includes("pr") || name.includes("pr") || name.includes("branch") || name.includes("pullrequest"))
        categorized.bitbucket.push(file);
      else if (path.includes("confluence") || name.includes("confluence") || name.startsWith("page-"))
        categorized.confluence.push(file);
      else if (path.includes("zephyr") || name.includes("zephyr")) categorized.zephyr.push(file);
      else categorized.other.push(file);
    });
    return categorized;
  }, []);

  const handleCopy = useCallback(async (content: string, path: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPath(path);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const handleDownload = useCallback((file: OutputFile) => {
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
  }, []);

  const renderFileCard = useCallback(
    (file: OutputFile) => (
      <Card key={file.path}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <CardTitle className="text-base">{file.name}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleCopy(file.content, file.path)}>
                {copiedPath === file.path ? <><Check className="mr-2 h-3 w-3" />Copied</> : <><Copy className="mr-2 h-3 w-3" />Copy</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownload(file)}>
                <Download className="mr-2 h-3 w-3" />Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4">
            <pre className="max-h-96 overflow-auto text-sm"><code>{file.content}</code></pre>
          </div>
        </CardContent>
      </Card>
    ),
    [copiedPath, handleCopy, handleDownload]
  );

  if (!issueKey) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/workflow" className="text-muted-foreground hover:text-foreground">← Back to Workflow</Link>
          <p className="mt-4 text-muted-foreground">Invalid issue key.</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/workflow" className="text-muted-foreground hover:text-foreground">← Back to Workflow</Link>
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Please configure your settings first.</p>
              <Link href="/config"><Button>Go to Configuration</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const categorized = outputFiles.length > 0 ? categorizeFiles(outputFiles) : null;
  const hasPrompt = categorized && categorized.prompt.length > 0;
  const availableTabs: FileCategory[] = [];
  if (categorized) {
    if (categorized.jira.length > 0) availableTabs.push("jira");
    if (categorized.bitbucket.length > 0) availableTabs.push("bitbucket");
    if (categorized.confluence.length > 0) availableTabs.push("confluence");
    if (categorized.zephyr.length > 0) availableTabs.push("zephyr");
    if (categorized.other.length > 0) availableTabs.push("other");
  }
  const effectiveTab =
    availableTabs.length > 0 && availableTabs.includes(activeTab)
      ? activeTab
      : (availableTabs[0] ?? "prompt");

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link href="/workflow" className="text-muted-foreground hover:text-foreground">← Back to Workflow</Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight font-mono">{issueKey}</h1>
          <p className="mt-2 text-muted-foreground">Extract data and generate E2E test prompt for this issue</p>
        </div>

        {imageAttachments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" /> Image Attachments
              </CardTitle>
              <CardDescription>Images attached to issue <span className="font-mono font-medium">{issueKey}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {imageAttachments.map((att) => (
                  <div key={att.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-muted flex items-center justify-center relative group">
                      <img
                        src={`/api/jira/attachments/${issueKey}/${encodeURIComponent(att.filename)}`}
                        alt={att.filename}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          if (!t.src.includes(att.contentUrl)) t.src = att.contentUrl;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <a href={`/api/jira/attachments/${issueKey}/${encodeURIComponent(att.filename)}`} target="_blank" rel="noopener noreferrer" className="text-white bg-black/50 px-3 py-1 rounded text-sm hover:bg-black/70" onClick={(ev) => ev.stopPropagation()}>View Full Size</a>
                      </div>
                    </div>
                    <div className="p-3 border-t">
                      <p className="text-sm font-medium truncate" title={att.filename}>{att.filename}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(att.size / 1024).toFixed(2)} KB • {att.mimeType}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Extract Data</CardTitle>
              <CardDescription>Fetching data from all configured sources for issue <span className="font-mono font-medium">{issueKey}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="shrink-0">
                      {extractionStatus.jira === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {extractionStatus.jira === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {extractionStatus.jira === "error" && <X className="h-5 w-5 text-red-500" />}
                      {extractionStatus.jira === "no-data" && <Circle className="h-5 w-5 text-muted-foreground" />}
                      {extractionStatus.jira === "disabled" && <Circle className="h-5 w-5 text-muted-foreground opacity-50" />}
                      {extractionStatus.jira === "pending" && <Circle className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Jira Issue</div>
                      <div className="text-sm text-muted-foreground">
                        {extractionStatus.jira === "loading" && "Fetching issue data..."}
                        {extractionStatus.jira === "success" && "Issue data fetched successfully"}
                        {extractionStatus.jira === "error" && "Failed to fetch issue data"}
                        {extractionStatus.jira === "no-data" && "No data found"}
                        {extractionStatus.jira === "disabled" && "Not configured"}
                        {extractionStatus.jira === "pending" && "Waiting..."}
                      </div>
                    </div>
                  </div>
                  <Checkbox checked={selectedSections.jira} onChange={(e) => setSelectedSections((p) => ({ ...p, jira: e.target.checked }))} disabled={extractionStatus.jira === "disabled" || extractionStatus.jira === "pending"} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="shrink-0">
                        {extractionStatus.bitbucket === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        {extractionStatus.bitbucket === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        {extractionStatus.bitbucket === "no-data" && <Circle className="h-5 w-5 text-muted-foreground" />}
                        {extractionStatus.bitbucket === "error" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {extractionStatus.bitbucket === "disabled" && <Circle className="h-5 w-5 text-muted-foreground opacity-50" />}
                        {extractionStatus.bitbucket === "pending" && <Circle className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Bitbucket (Branch/PR)</div>
                        <div className="text-sm text-muted-foreground">
                          {extractionStatus.bitbucket === "loading" && "Searching for branch/PR..."}
                          {extractionStatus.bitbucket === "success" && "Branch/PR found"}
                          {extractionStatus.bitbucket === "no-data" && "No branch or PR found"}
                          {extractionStatus.bitbucket === "error" && (extractionErrorDetails.bitbucket?.tokenExpired ? "Token expired or access denied" : "Failed to fetch")}
                          {extractionStatus.bitbucket === "disabled" && "Not configured"}
                          {extractionStatus.bitbucket === "pending" && "Waiting..."}
                        </div>
                      </div>
                    </div>
                    <Checkbox checked={selectedSections.bitbucket} onChange={(e) => setSelectedSections((p) => ({ ...p, bitbucket: e.target.checked }))} disabled={extractionStatus.bitbucket === "disabled" || extractionStatus.bitbucket === "pending"} />
                  </div>
                  {extractionStatus.bitbucket === "error" && extractionErrorDetails.bitbucket?.tokenExpired && (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Token expired. Update your Bitbucket credentials in configuration.</span>
                      <Link href="/config" className="ml-auto shrink-0">
                        <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"><Settings className="mr-2 h-3 w-3" />Go to Configuration</Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="shrink-0">
                        {extractionStatus.confluence === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        {extractionStatus.confluence === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        {extractionStatus.confluence === "no-data" && <Circle className="h-5 w-5 text-muted-foreground" />}
                        {extractionStatus.confluence === "error" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {extractionStatus.confluence === "disabled" && <Circle className="h-5 w-5 text-muted-foreground opacity-50" />}
                        {extractionStatus.confluence === "pending" && <Circle className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Confluence Pages</div>
                        <div className="text-sm text-muted-foreground">
                          {extractionStatus.confluence === "loading" && "Fetching linked pages..."}
                          {extractionStatus.confluence === "success" && "Pages found"}
                          {extractionStatus.confluence === "no-data" && "No linked pages found"}
                          {extractionStatus.confluence === "error" && (extractionErrorDetails.confluence?.tokenExpired ? "Token expired or access denied" : "Failed to fetch")}
                          {extractionStatus.confluence === "disabled" && "Not configured"}
                          {extractionStatus.confluence === "pending" && "Waiting..."}
                        </div>
                      </div>
                    </div>
                    <Checkbox checked={selectedSections.confluence} onChange={(e) => setSelectedSections((p) => ({ ...p, confluence: e.target.checked }))} disabled={extractionStatus.confluence === "disabled" || extractionStatus.confluence === "pending"} />
                  </div>
                  {extractionStatus.confluence === "error" && extractionErrorDetails.confluence?.tokenExpired && (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Token expired. Update your Confluence (or Jira) credentials in configuration.</span>
                      <Link href="/config" className="ml-auto shrink-0">
                        <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"><Settings className="mr-2 h-3 w-3" />Go to Configuration</Button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="shrink-0">
                      {extractionStatus.zephyr === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {extractionStatus.zephyr === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {extractionStatus.zephyr === "no-data" && <Circle className="h-5 w-5 text-muted-foreground" />}
                      {extractionStatus.zephyr === "disabled" && <Circle className="h-5 w-5 text-muted-foreground opacity-50" />}
                      {extractionStatus.zephyr === "pending" && <Circle className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Zephyr Test Cases</div>
                      <div className="text-sm text-muted-foreground">
                        {extractionStatus.zephyr === "loading" && "Fetching test cases..."}
                        {extractionStatus.zephyr === "success" && "Test cases found"}
                        {extractionStatus.zephyr === "no-data" && "No test cases found"}
                        {extractionStatus.zephyr === "disabled" && "Not configured"}
                        {extractionStatus.zephyr === "pending" && "Waiting..."}
                      </div>
                    </div>
                  </div>
                  <Checkbox checked={selectedSections.zephyr} onChange={(e) => setSelectedSections((p) => ({ ...p, zephyr: e.target.checked }))} disabled={extractionStatus.zephyr === "disabled" || extractionStatus.zephyr === "pending"} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="shrink-0">
                      {extractionStatus.attachments === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {extractionStatus.attachments === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {extractionStatus.attachments === "no-data" && <Circle className="h-5 w-5 text-muted-foreground" />}
                      {extractionStatus.attachments === "pending" && <Circle className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Image Attachments</div>
                      <div className="text-sm text-muted-foreground">
                        {extractionStatus.attachments === "loading" && "Fetching attachments..."}
                        {extractionStatus.attachments === "success" && `${imageAttachments.length} image(s) found`}
                        {extractionStatus.attachments === "no-data" && "No images found"}
                        {extractionStatus.attachments === "pending" && "Waiting..."}
                      </div>
                    </div>
                  </div>
                  <Checkbox checked={includeAttachments} onChange={(e) => setIncludeAttachments(e.target.checked)} disabled={extractionStatus.attachments === "pending" || extractionStatus.attachments === "no-data"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Generate LLM Prompt</CardTitle>
              <CardDescription>Generate a prompt using the selected data sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerate} disabled={isGenerating || isExtracting} className="w-full mb-4">
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate LLM Prompt</>}
              </Button>
              {hasPrompt && categorized && (
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">LLM Prompt (Ready to Copy)</h3>
                      <span className="text-sm text-muted-foreground" title="Approximate token count for GPT-style models">
                        ~{getTokenEstimateSummary(categorized.prompt[0]?.content ?? "").tokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const content = categorized.prompt[0]?.content ?? "";
                          setOptimizedPromptResult(optimizePromptForTokens(content));
                          setOptimizeDialogOpen(true);
                        }}
                        aria-label="Optimize prompt for fewer tokens"
                      >
                        <Zap className="mr-2 h-3 w-3" />Optimize
                      </Button>
                      <Button size="sm" onClick={() => { const f = categorized.prompt[0]; if (f) handleCopy(f.content, f.path); }}>
                        {copiedPath === categorized.prompt[0]?.path ? <><Check className="mr-2 h-3 w-3" />Copied</> : <><Copy className="mr-2 h-3 w-3" />Copy Prompt</>}
                      </Button>
                    </div>
                  </div>
                  {categorized.prompt.map((file) => <div key={file.path} className="mb-4">{renderFileCard(file)}</div>)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {optimizedPromptResult && (
          <Dialog open={optimizeDialogOpen} onOpenChange={setOptimizeDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Optimized prompt (fewer tokens)</DialogTitle>
                <DialogDescription>
                  Original: ~{optimizedPromptResult.originalTokens.toLocaleString()} tokens → Optimized: ~{optimizedPromptResult.optimizedTokens.toLocaleString()} tokens
                  {optimizedPromptResult.suggestions.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-left">
                      {optimizedPromptResult.suggestions.map((s, i) => (
                        <li key={`suggestion-${i}-${s.slice(0, 20)}`}>{s}</li>
                      ))}
                    </ul>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md bg-muted p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
                <pre className="text-sm overflow-auto flex-1 max-h-96"><code>{optimizedPromptResult.optimizedText}</code></pre>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => {
                    if (optimizedPromptResult) {
                      handleCopy(optimizedPromptResult.optimizedText, "llm-prompt-optimized.md");
                      setOptimizeDialogOpen(false);
                    }
                  }}
                >
                  <Copy className="mr-2 h-3 w-3" />Copy optimized prompt
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {categorized && availableTabs.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 4: Output Files</CardTitle>
              <CardDescription>View, copy, or download the generated files organized by category</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" className="w-full">
                <AccordionItem value="output-files">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>View Output Files</span></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as FileCategory)}>
                      <TabsList className={cn("grid w-full mb-4", availableTabs.length === 1 && "grid-cols-1", availableTabs.length === 2 && "grid-cols-2", availableTabs.length === 3 && "grid-cols-3", availableTabs.length === 4 && "grid-cols-4", availableTabs.length === 5 && "grid-cols-5")}>
                        {categorized.jira.length > 0 && <TabsTrigger value="jira" className="flex items-center gap-2"><FileText className="h-4 w-4" />Jira</TabsTrigger>}
                        {categorized.bitbucket.length > 0 && <TabsTrigger value="bitbucket" className="flex items-center gap-2"><GitBranch className="h-4 w-4" />Bitbucket</TabsTrigger>}
                        {categorized.confluence.length > 0 && <TabsTrigger value="confluence" className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Confluence</TabsTrigger>}
                        {categorized.zephyr.length > 0 && <TabsTrigger value="zephyr" className="flex items-center gap-2"><Database className="h-4 w-4" />Zephyr</TabsTrigger>}
                        {categorized.other.length > 0 && <TabsTrigger value="other" className="flex items-center gap-2"><Code className="h-4 w-4" />Other</TabsTrigger>}
                      </TabsList>
                      {categorized.jira.length > 0 && <TabsContent value="jira"><div className="space-y-4">{categorized.jira.map((file) => renderFileCard(file))}</div></TabsContent>}
                      {categorized.bitbucket.length > 0 && <TabsContent value="bitbucket"><div className="space-y-4">{categorized.bitbucket.map((file) => renderFileCard(file))}</div></TabsContent>}
                      {categorized.confluence.length > 0 && <TabsContent value="confluence"><div className="space-y-4">{categorized.confluence.map((file) => renderFileCard(file))}</div></TabsContent>}
                      {categorized.zephyr.length > 0 && <TabsContent value="zephyr"><div className="space-y-4">{categorized.zephyr.map((file) => renderFileCard(file))}</div></TabsContent>}
                      {categorized.other.length > 0 && <TabsContent value="other"><div className="space-y-4">{categorized.other.map((file) => renderFileCard(file))}</div></TabsContent>}
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
