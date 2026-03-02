"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, XCircle, Pencil, Loader2, AlertTriangle, MinusCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

type ConfigTestResult = {
  jira: { configured: true; success: boolean; error?: string };
  bitbucket: { configured: boolean; success?: boolean; error?: string };
  confluence: { configured: boolean; success?: boolean; error?: string };
  zephyr: { configured: boolean; success?: boolean; error?: string };
};

interface Config {
  bitbucket?: {
    workspace: string;
    repo: string;
  };
  jira: {
    baseUrl: string;
    boardId?: number;
    assignee?: string;
    statuses?: string[];
  };
  confluence?: {
    baseUrl: string;
  };
  zephyr?: {
    projectKey: string;
    projectId?: string | number;
    folderId?: string;
  };
}

const CONFIG_STORAGE_KEY = "testflow_config";

const validateConfig = (data: unknown): data is Config => {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  // Check required jira field
  if (!obj.jira || typeof obj.jira !== "object") return false;
  const jira = obj.jira as Record<string, unknown>;
  if (typeof jira.baseUrl !== "string" || !jira.baseUrl) return false;

  // Validate optional fields
  if (obj.bitbucket) {
    if (typeof obj.bitbucket !== "object") return false;
    const bb = obj.bitbucket as Record<string, unknown>;
    if (typeof bb.workspace !== "string" || typeof bb.repo !== "string") {
      return false;
    }
  }

  if (obj.confluence) {
    if (typeof obj.confluence !== "object") return false;
    const conf = obj.confluence as Record<string, unknown>;
    if (typeof conf.baseUrl !== "string") return false;
  }

  if (obj.zephyr) {
    if (typeof obj.zephyr !== "object") return false;
    const zeph = obj.zephyr as Record<string, unknown>;
    if (typeof zeph.projectKey !== "string") return false;
  }

  return true;
};

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [testResult, setTestResult] = useState<ConfigTestResult | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [editForm, setEditForm] = useState({
    jiraBaseUrl: "",
    jiraBoardId: "",
    jiraAssignee: "",
    jiraStatuses: "",
    confluenceBaseUrl: "",
    confluenceEnabled: false,
    zephyrProjectKey: "",
    zephyrProjectId: "",
    zephyrFolderId: "",
    zephyrEnabled: false,
    bitbucketWorkspace: "",
    bitbucketRepo: "",
    bitbucketEnabled: false,
  });

  // Load config from localStorage on mount and sync edit form
  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
        setIsValid(true);
        setEditForm({
          jiraBaseUrl: parsed.jira?.baseUrl ?? "",
          jiraBoardId: parsed.jira?.boardId != null ? String(parsed.jira.boardId) : "",
          jiraAssignee: parsed.jira?.assignee ?? "",
          jiraStatuses: Array.isArray(parsed.jira?.statuses)
            ? parsed.jira.statuses.join(", ")
            : "",
          confluenceBaseUrl: parsed.confluence?.baseUrl ?? "",
          confluenceEnabled: Boolean(parsed.confluence?.baseUrl),
          zephyrProjectKey: parsed.zephyr?.projectKey ?? "",
          zephyrProjectId:
            parsed.zephyr?.projectId != null ? String(parsed.zephyr.projectId) : "",
          zephyrFolderId: parsed.zephyr?.folderId ?? "",
          zephyrEnabled: Boolean(parsed.zephyr?.projectKey),
          bitbucketWorkspace: parsed.bitbucket?.workspace ?? "",
          bitbucketRepo: parsed.bitbucket?.repo ?? "",
          bitbucketEnabled: Boolean(parsed.bitbucket?.workspace && parsed.bitbucket?.repo),
        });
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (validateConfig(parsed)) {
          setConfig(parsed);
          setIsValid(true);
          setEditForm({
            jiraBaseUrl: parsed.jira?.baseUrl ?? "",
            jiraBoardId: parsed.jira?.boardId != null ? String(parsed.jira.boardId) : "",
            jiraAssignee: parsed.jira?.assignee ?? "",
            jiraStatuses: Array.isArray(parsed.jira?.statuses)
              ? parsed.jira.statuses.join(", ")
              : "",
            confluenceBaseUrl: parsed.confluence?.baseUrl ?? "",
            confluenceEnabled: Boolean(parsed.confluence?.baseUrl),
            zephyrProjectKey: parsed.zephyr?.projectKey ?? "",
            zephyrProjectId:
              parsed.zephyr?.projectId != null ? String(parsed.zephyr.projectId) : "",
            zephyrFolderId: parsed.zephyr?.folderId ?? "",
            zephyrEnabled: Boolean(parsed.zephyr?.projectKey),
            bitbucketWorkspace: parsed.bitbucket?.workspace ?? "",
            bitbucketRepo: parsed.bitbucket?.repo ?? "",
            bitbucketEnabled: Boolean(parsed.bitbucket?.workspace && parsed.bitbucket?.repo),
          });
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
          toast.success("Configuration loaded successfully");
        } else {
          setIsValid(false);
          toast.error("Invalid configuration file format");
        }
      } catch {
        setIsValid(false);
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/json") {
        handleFile(file);
      } else {
        toast.error("Please upload a JSON file");
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClear = () => {
    setConfig(null);
    setIsValid(null);
    setEditMode(false);
    setTestResult(null);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    toast.success("Configuration cleared");
  };

  const runEndpointTest = useCallback(async () => {
    if (!config) return;
    setIsLoadingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        const data = (await res.json()) as ConfigTestResult;
        setTestResult(data);
      }
    } catch {
      toast.error("Failed to run endpoint test");
    } finally {
      setIsLoadingTest(false);
    }
  }, [config]);

  useEffect(() => {
    if (config && !editMode) {
      runEndpointTest();
    }
  }, [config, editMode, runEndpointTest]);

  const handleSaveEdit = () => {
    const baseUrl = editForm.jiraBaseUrl.trim();
    if (!baseUrl) {
      toast.error("Jira base URL is required");
      return;
    }
    try {
      new URL(baseUrl);
    } catch {
      toast.error("Jira base URL must be a valid URL");
      return;
    }
    const boardIdNum = editForm.jiraBoardId.trim()
      ? parseInt(editForm.jiraBoardId, 10)
      : undefined;
    const statusesParsed = editForm.jiraStatuses
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const newConfig: Config = {
      jira: {
        baseUrl,
        ...(boardIdNum !== undefined && !Number.isNaN(boardIdNum) ? { boardId: boardIdNum } : {}),
        ...(editForm.jiraAssignee.trim() ? { assignee: editForm.jiraAssignee.trim() } : {}),
        ...(statusesParsed.length > 0 ? { statuses: statusesParsed } : {}),
      },
      ...(editForm.confluenceEnabled && editForm.confluenceBaseUrl.trim()
        ? { confluence: { baseUrl: editForm.confluenceBaseUrl.trim() } }
        : {}),
      ...(editForm.zephyrEnabled && editForm.zephyrProjectKey.trim()
        ? {
            zephyr: {
              projectKey: editForm.zephyrProjectKey.trim(),
              ...(editForm.zephyrProjectId.trim()
                ? { projectId: editForm.zephyrProjectId.trim() }
                : {}),
              ...(editForm.zephyrFolderId.trim() ? { folderId: editForm.zephyrFolderId.trim() } : {}),
            },
          }
        : {}),
      ...(editForm.bitbucketEnabled &&
      editForm.bitbucketWorkspace.trim() &&
      editForm.bitbucketRepo.trim()
        ? {
            bitbucket: {
              workspace: editForm.bitbucketWorkspace.trim(),
              repo: editForm.bitbucketRepo.trim(),
            },
          }
        : {}),
    };
    setConfig(newConfig);
    setIsValid(true);
    setEditMode(false);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    toast.success("Configuration saved");
    runEndpointTest();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Configuration</h1>
          <p className="mt-2 text-muted-foreground">
            Upload your testflow configuration file (config.json)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Configuration File</CardTitle>
            <CardDescription>
              Drag and drop your config.json file or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <button
              type="button"
              className={`relative flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById("config-file-input")?.click()}
              aria-label="Upload configuration file"
            >
              <input
                id="config-file-input"
                type="file"
                accept=".json"
                onChange={handleFileInput}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">
                Drag and drop your config.json file here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </button>

            {config && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">Configuration Status</span>
                  </div>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setEditMode(true)}
                          aria-label="Edit configuration"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit configuration
                        </Button>
                        <Button variant="outline" onClick={handleClear}>
                          Clear
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>Save</Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Endpoint test checklist */}
                {!editMode && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Endpoint check</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={runEndpointTest}
                        disabled={isLoadingTest}
                        aria-label="Re-run endpoint test"
                      >
                        {isLoadingTest ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Re-check"
                        )}
                      </Button>
                    </div>
                    {isLoadingTest && !testResult ? (
                      <div className="flex items-center gap-2 py-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Testing endpoints...</span>
                      </div>
                    ) : testResult ? (
                      <div className="space-y-0 divide-y divide-border/50">
                        <div className="flex items-center gap-2 py-2">
                          {!testResult.jira.success ? (
                            testResult.jira.error ? (
                              <>
                                <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                                <span>Jira</span>
                                <span className="text-xs text-yellow-600 dark:text-yellow-500 truncate" title={testResult.jira.error}>
                                  {testResult.jira.error}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                                <span>Jira</span>
                              </>
                            )
                          ) : (
                            <>
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                              <span>Jira</span>
                              <span className="text-xs text-muted-foreground">Connected</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 py-2">
                          {!testResult.bitbucket.configured ? (
                            <>
                              <MinusCircle className="h-5 w-5 shrink-0 text-muted-foreground opacity-50" />
                              <span>Bitbucket</span>
                              <span className="text-xs text-muted-foreground">Not configured</span>
                            </>
                          ) : testResult.bitbucket.success ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                              <span>Bitbucket</span>
                              <span className="text-xs text-muted-foreground">Connected</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                              <span>Bitbucket</span>
                              <span className="text-xs text-yellow-600 dark:text-yellow-500 truncate" title={testResult.bitbucket.error}>
                                {testResult.bitbucket.error}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 py-2">
                          {!testResult.confluence.configured ? (
                            <>
                              <MinusCircle className="h-5 w-5 shrink-0 text-muted-foreground opacity-50" />
                              <span>Confluence</span>
                              <span className="text-xs text-muted-foreground">Not configured</span>
                            </>
                          ) : testResult.confluence.success ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                              <span>Confluence</span>
                              <span className="text-xs text-muted-foreground">Connected</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                              <span>Confluence</span>
                              <span className="text-xs text-yellow-600 dark:text-yellow-500 truncate" title={testResult.confluence.error}>
                                {testResult.confluence.error}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 py-2">
                          {!testResult.zephyr.configured ? (
                            <>
                              <MinusCircle className="h-5 w-5 shrink-0 text-muted-foreground opacity-50" />
                              <span>Zephyr</span>
                              <span className="text-xs text-muted-foreground">Not configured</span>
                            </>
                          ) : testResult.zephyr.success ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                              <span>Zephyr</span>
                              <span className="text-xs text-muted-foreground">Connected</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                              <span>Zephyr</span>
                              <span className="text-xs text-yellow-600 dark:text-yellow-500 truncate" title={testResult.zephyr.error}>
                                {testResult.zephyr.error}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {editMode ? (
                  <div className="space-y-6 rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-jira-baseUrl">Jira base URL</Label>
                      <Input
                        id="edit-jira-baseUrl"
                        type="url"
                        value={editForm.jiraBaseUrl}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, jiraBaseUrl: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-jira-boardId">Board ID (optional)</Label>
                      <Input
                        id="edit-jira-boardId"
                        type="text"
                        value={editForm.jiraBoardId}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, jiraBoardId: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-jira-assignee">Assignee (optional)</Label>
                      <Input
                        id="edit-jira-assignee"
                        type="text"
                        value={editForm.jiraAssignee}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, jiraAssignee: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-jira-statuses">Statuses (optional, comma-separated)</Label>
                      <Input
                        id="edit-jira-statuses"
                        type="text"
                        value={editForm.jiraStatuses}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, jiraStatuses: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-confluence-enabled"
                        checked={editForm.confluenceEnabled}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, confluenceEnabled: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="edit-confluence-enabled">Enable Confluence</Label>
                    </div>
                    {editForm.confluenceEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-confluence-baseUrl">Confluence base URL</Label>
                        <Input
                          id="edit-confluence-baseUrl"
                          type="url"
                          value={editForm.confluenceBaseUrl}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, confluenceBaseUrl: e.target.value }))
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-zephyr-enabled"
                        checked={editForm.zephyrEnabled}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, zephyrEnabled: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="edit-zephyr-enabled">Enable Zephyr</Label>
                    </div>
                    {editForm.zephyrEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="edit-zephyr-projectKey">Zephyr project key</Label>
                          <Input
                            id="edit-zephyr-projectKey"
                            type="text"
                            value={editForm.zephyrProjectKey}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, zephyrProjectKey: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-zephyr-projectId">Zephyr project ID (optional)</Label>
                          <Input
                            id="edit-zephyr-projectId"
                            type="text"
                            value={editForm.zephyrProjectId}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, zephyrProjectId: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-zephyr-folderId">Zephyr folder ID (optional)</Label>
                          <Input
                            id="edit-zephyr-folderId"
                            type="text"
                            value={editForm.zephyrFolderId}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, zephyrFolderId: e.target.value }))
                            }
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-bitbucket-enabled"
                        checked={editForm.bitbucketEnabled}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, bitbucketEnabled: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="edit-bitbucket-enabled">Enable Bitbucket</Label>
                    </div>
                    {editForm.bitbucketEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="edit-bitbucket-workspace">Bitbucket workspace</Label>
                          <Input
                            id="edit-bitbucket-workspace"
                            type="text"
                            value={editForm.bitbucketWorkspace}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                bitbucketWorkspace: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-bitbucket-repo">Bitbucket repository</Label>
                          <Input
                            id="edit-bitbucket-repo"
                            type="text"
                            value={editForm.bitbucketRepo}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, bitbucketRepo: e.target.value }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Jira Base URL:</span>{" "}
                        <span className="text-muted-foreground">
                          {config.jira.baseUrl}
                        </span>
                      </div>
                      {config.bitbucket && (
                        <div>
                          <span className="font-medium">Bitbucket:</span>{" "}
                          <span className="text-muted-foreground">
                            {config.bitbucket.workspace}/{config.bitbucket.repo}
                          </span>
                        </div>
                      )}
                      {config.confluence && (
                        <div>
                          <span className="font-medium">Confluence Base URL:</span>{" "}
                          <span className="text-muted-foreground">
                            {config.confluence.baseUrl}
                          </span>
                        </div>
                      )}
                      {config.zephyr && (
                        <div>
                          <span className="font-medium">Zephyr Project:</span>{" "}
                          <span className="text-muted-foreground">
                            {config.zephyr.projectKey}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Link href="/env" className="flex-1">
                <Button className="w-full">Next: Environment Variables</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

