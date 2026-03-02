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
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, BookOpen, List, TestTube, GitBranch, Sparkles, Upload, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const CONFIG_STORAGE_KEY = "testflow_config";

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "jira", title: "Jira", icon: List },
  { id: "confluence", title: "Confluence", icon: BookOpen },
  { id: "zephyr", title: "Zephyr", icon: TestTube },
  { id: "bitbucket", title: "Bitbucket", icon: GitBranch },
  { id: "done", title: "Done", icon: Check },
] as const;

interface SetupConfig {
  jira: {
    baseUrl: string;
    boardId: string;
    assignee: string;
    statuses: string;
  };
  confluence: {
    enabled: boolean;
    baseUrl: string;
  };
  zephyr: {
    enabled: boolean;
    projectKey: string;
    projectId: string;
    folderId: string;
  };
  bitbucket: {
    enabled: boolean;
    workspace: string;
    repo: string;
  };
}

interface SetupEnv {
  JIRA_EMAIL: string;
  JIRA_API_TOKEN: string;
  CONFLUENCE_EMAIL: string;
  CONFLUENCE_API_TOKEN: string;
  ZEPHYR_BASE_URL: string;
  ZEPHYR_ACCESS_TOKEN: string;
  ZEPHYR_PROJECT_ID: string;
  BITBUCKET_EMAIL: string;
  BITBUCKET_API_TOKEN: string;
}

const defaultConfig: SetupConfig = {
  jira: {
    baseUrl: "https://your-domain.atlassian.net",
    boardId: "",
    assignee: "",
    statuses: "To Do, In Progress, Pull Requested",
  },
  confluence: { enabled: false, baseUrl: "" },
  zephyr: { enabled: false, projectKey: "", projectId: "", folderId: "" },
  bitbucket: { enabled: false, workspace: "", repo: "" },
};

const defaultEnv: SetupEnv = {
  JIRA_EMAIL: "",
  JIRA_API_TOKEN: "",
  CONFLUENCE_EMAIL: "",
  CONFLUENCE_API_TOKEN: "",
  ZEPHYR_BASE_URL: "",
  ZEPHYR_ACCESS_TOKEN: "",
  ZEPHYR_PROJECT_ID: "",
  BITBUCKET_EMAIL: "",
  BITBUCKET_API_TOKEN: "",
};

const TOKEN_LINKS = {
  atlassianApiTokens: "https://id.atlassian.com/manage-profile/security/api-tokens",
  zephyrApiTokensDocs:
    "https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html",
} as const;

interface ImportedConfig {
  jira?: { baseUrl?: string; boardId?: number; assignee?: string; statuses?: string[] };
  confluence?: { baseUrl?: string };
  zephyr?: { projectKey?: string; projectId?: string | number; folderId?: string };
  bitbucket?: { workspace?: string; repo?: string };
}

const parseConfigFile = (data: unknown): SetupConfig | null => {
  const raw = data as ImportedConfig;
  if (!raw?.jira?.baseUrl) return null;
  return {
    jira: {
      baseUrl: raw.jira.baseUrl ?? defaultConfig.jira.baseUrl,
      boardId: raw.jira.boardId != null ? String(raw.jira.boardId) : "",
      assignee: raw.jira.assignee ?? "",
      statuses: Array.isArray(raw.jira.statuses)
        ? raw.jira.statuses.join(", ")
        : defaultConfig.jira.statuses,
    },
    confluence: {
      enabled: Boolean(raw.confluence?.baseUrl),
      baseUrl: raw.confluence?.baseUrl ?? "",
    },
    zephyr: {
      enabled: Boolean(raw.zephyr?.projectKey),
      projectKey: raw.zephyr?.projectKey ?? "",
      projectId: raw.zephyr?.projectId != null ? String(raw.zephyr.projectId) : "",
      folderId: raw.zephyr?.folderId ?? "",
    },
    bitbucket: {
      enabled: Boolean(raw.bitbucket?.workspace && raw.bitbucket?.repo),
      workspace: raw.bitbucket?.workspace ?? "",
      repo: raw.bitbucket?.repo ?? "",
    },
  };
};

export default function SetupPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [config, setConfig] = useState<SetupConfig>(defaultConfig);
  const [env, setEnv] = useState<SetupEnv>(defaultEnv);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepId = STEPS[stepIndex].id;

  const updateConfig = (path: keyof SetupConfig, value: SetupConfig[keyof SetupConfig]) => {
    setConfig((prev) => ({ ...prev, [path]: value }));
  };

  const updateEnv = (key: keyof SetupEnv, value: string) => {
    setEnv((prev) => ({ ...prev, [key]: value }));
  };

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as unknown;
        const next = parseConfigFile(parsed);
        if (next) {
          setConfig(next);
          toast.success("Configuration imported. You can continue with the steps to add credentials.");
        } else {
          toast.error("Invalid config file: must contain jira.baseUrl. Use a config.json from .testflow/.");
        }
      } catch {
        toast.error("Failed to parse JSON. Use a valid config.json file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const validateJira = (): boolean => {
    const baseUrl = config.jira.baseUrl.trim();
    if (!baseUrl) {
      toast.error("Jira base URL is required");
      return false;
    }
    try {
      new URL(baseUrl);
    } catch {
      toast.error("Jira base URL must be a valid URL");
      return false;
    }
    if (!env.JIRA_EMAIL.trim()) {
      toast.error("Jira email is required");
      return false;
    }
    if (!env.JIRA_API_TOKEN.trim()) {
      toast.error("Jira API token is required");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (stepId === "jira" && !validateJira()) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const buildFinalConfig = () => {
    const jiraBaseUrl = config.jira.baseUrl.trim();
    const boardIdNum = config.jira.boardId.trim()
      ? parseInt(config.jira.boardId, 10)
      : undefined;
    const statusesParsed = config.jira.statuses
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      jira: {
        baseUrl: jiraBaseUrl,
        ...(Number.isNaN(boardIdNum) ? {} : { boardId: boardIdNum }),
        ...(config.jira.assignee.trim() ? { assignee: config.jira.assignee.trim() } : {}),
        ...(statusesParsed.length > 0 ? { statuses: statusesParsed } : {}),
      },
      ...(config.confluence.enabled && config.confluence.baseUrl.trim()
        ? { confluence: { baseUrl: config.confluence.baseUrl.trim() } }
        : {}),
      ...(config.zephyr.enabled && config.zephyr.projectKey.trim()
        ? {
            zephyr: {
              projectKey: config.zephyr.projectKey.trim(),
              ...(config.zephyr.projectId.trim()
                ? { projectId: config.zephyr.projectId.trim() }
                : {}),
              ...(config.zephyr.folderId.trim() ? { folderId: config.zephyr.folderId.trim() } : {}),
            },
          }
        : {}),
      ...(config.bitbucket.enabled &&
      config.bitbucket.workspace.trim() &&
      config.bitbucket.repo.trim()
        ? {
            bitbucket: {
              workspace: config.bitbucket.workspace.trim(),
              repo: config.bitbucket.repo.trim(),
            },
          }
        : {}),
    };
  };

  const buildFinalEnv = (): Record<string, string> => {
    const out: Record<string, string> = {};
    if (env.JIRA_EMAIL.trim()) out.JIRA_EMAIL = env.JIRA_EMAIL.trim();
    if (env.JIRA_API_TOKEN.trim()) out.JIRA_API_TOKEN = env.JIRA_API_TOKEN.trim();
    if (config.confluence.enabled) {
      if (env.CONFLUENCE_EMAIL.trim()) out.CONFLUENCE_EMAIL = env.CONFLUENCE_EMAIL.trim();
      if (env.CONFLUENCE_API_TOKEN.trim())
        out.CONFLUENCE_API_TOKEN = env.CONFLUENCE_API_TOKEN.trim();
    }
    if (config.zephyr.enabled) {
      if (env.ZEPHYR_BASE_URL.trim()) out.ZEPHYR_BASE_URL = env.ZEPHYR_BASE_URL.trim();
      if (env.ZEPHYR_ACCESS_TOKEN.trim())
        out.ZEPHYR_ACCESS_TOKEN = env.ZEPHYR_ACCESS_TOKEN.trim();
      if (env.ZEPHYR_PROJECT_ID.trim()) out.ZEPHYR_PROJECT_ID = env.ZEPHYR_PROJECT_ID.trim();
    }
    if (config.bitbucket.enabled) {
      if (env.BITBUCKET_EMAIL.trim()) out.BITBUCKET_EMAIL = env.BITBUCKET_EMAIL.trim();
      if (env.BITBUCKET_API_TOKEN.trim())
        out.BITBUCKET_API_TOKEN = env.BITBUCKET_API_TOKEN.trim();
    }
    return out;
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const finalConfig = buildFinalConfig();
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(finalConfig));
      const envObject = buildFinalEnv();
      const response = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envObject),
      });
      if (!response.ok) throw new Error("Failed to save environment variables");
      toast.success("Configuration saved");
      router.replace("/");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Testflow Setup</h1>
          <p className="mt-2 text-muted-foreground">
            Configure your integrations step by step. Jira is required; the rest are optional.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex shrink-0 items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                  i <= stepIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {i < stepIndex ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  i <= stepIndex ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[stepIndex].title}</CardTitle>
            <CardDescription>
              {stepId === "welcome" &&
                "Welcome to Testflow. Click Start to configure Jira first, then optionally Confluence, Zephyr, and Bitbucket."}
              {stepId === "jira" && "Jira is required. Enter your base URL and credentials."}
              {stepId === "confluence" && "Optionally connect Confluence (e.g. same Atlassian cloud)."}
              {stepId === "zephyr" && "Optionally connect Zephyr for test cases."}
              {stepId === "bitbucket" && "Optionally connect Bitbucket for branches and PRs."}
              {stepId === "done" && "Review and save your configuration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stepId === "welcome" && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                  <p className="font-medium">About API tokens</p>
                  <p className="mt-1 text-muted-foreground">
                    <strong>Jira, Confluence, and Bitbucket Cloud</strong> all use your Atlassian
                    account. You can create one API token at the Atlassian security page and use the
                    <strong> same token</strong> for all three if you use the same email for each
                    service. Zephyr uses a <strong>separate token</strong> that you generate from
                    Jira (Profile → Zephyr API keys).
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Import from existing config</p>
                  <p className="text-muted-foreground text-sm">
                    If you have a <code className="rounded bg-muted px-1 py-0.5">config.json</code>{" "}
                    (e.g. from <code className="rounded bg-muted px-1 py-0.5">.testflow/config.json</code>
                    ), upload it to pre-fill URLs and integration settings. You will still go through
                    the steps to add credentials (emails and tokens).
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 transition-colors hover:bg-muted/50">
                    <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">Choose config.json</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportFile}
                      className="sr-only"
                      aria-label="Import configuration from JSON file"
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleNext}>
                    Start configuration
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {stepId === "jira" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="font-medium">How to get your Jira API token</p>
                  <ol className="mt-1 list-inside list-decimal space-y-0.5 text-muted-foreground">
                    <li>Go to your Atlassian account security page (link below).</li>
                    <li>Click &quot;Create API token&quot;, give it a label, then Create.</li>
                    <li>Copy the token and paste it here. Use the same email as your Jira login.</li>
                  </ol>
                  <a
                    href={TOKEN_LINKS.atlassianApiTokens}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Atlassian API tokens
                  </a>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-baseUrl">Jira base URL</Label>
                  <Input
                    id="jira-baseUrl"
                    type="url"
                    placeholder="https://your-domain.atlassian.net"
                    value={config.jira.baseUrl}
                    onChange={(e) =>
                      updateConfig("jira", { ...config.jira, baseUrl: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-boardId">Board ID (optional)</Label>
                  <Input
                    id="jira-boardId"
                    type="text"
                    placeholder="123"
                    value={config.jira.boardId}
                    onChange={(e) =>
                      updateConfig("jira", { ...config.jira, boardId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-assignee">Assignee (optional)</Label>
                  <Input
                    id="jira-assignee"
                    type="text"
                    placeholder="user@example.com"
                    value={config.jira.assignee}
                    onChange={(e) =>
                      updateConfig("jira", { ...config.jira, assignee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-statuses">Statuses (optional, comma-separated)</Label>
                  <Input
                    id="jira-statuses"
                    type="text"
                    placeholder="To Do, In Progress, Done"
                    value={config.jira.statuses}
                    onChange={(e) =>
                      updateConfig("jira", { ...config.jira, statuses: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-email">Jira email</Label>
                  <Input
                    id="jira-email"
                    type="email"
                    placeholder="you@example.com"
                    value={env.JIRA_EMAIL}
                    onChange={(e) => updateEnv("JIRA_EMAIL", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-token">Jira API token</Label>
                  <Input
                    id="jira-token"
                    type="password"
                    placeholder="Your Jira API token"
                    value={env.JIRA_API_TOKEN}
                    onChange={(e) => updateEnv("JIRA_API_TOKEN", e.target.value)}
                  />
                </div>
              </div>
            )}

            {stepId === "confluence" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="font-medium">Confluence API token</p>
                  <p className="mt-1 text-muted-foreground">
                    Confluence uses the same Atlassian account as Jira. You can use the{" "}
                    <strong>same API token</strong> as Jira: create or copy it from the link below,
                    and use the same email as for Jira.
                  </p>
                  <a
                    href={TOKEN_LINKS.atlassianApiTokens}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Atlassian API tokens
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confluence-enabled"
                    checked={config.confluence.enabled}
                    onChange={(e) =>
                      updateConfig("confluence", { ...config.confluence, enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="confluence-enabled">Enable Confluence integration</Label>
                </div>
                {config.confluence.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="confluence-baseUrl">Confluence base URL</Label>
                      <Input
                        id="confluence-baseUrl"
                        type="url"
                        placeholder="https://your-domain.atlassian.net/wiki"
                        value={config.confluence.baseUrl}
                        onChange={(e) =>
                          updateConfig("confluence", {
                            ...config.confluence,
                            baseUrl: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confluence-email">Confluence email</Label>
                      <Input
                        id="confluence-email"
                        type="email"
                        placeholder="you@example.com"
                        value={env.CONFLUENCE_EMAIL}
                        onChange={(e) => updateEnv("CONFLUENCE_EMAIL", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confluence-token">Confluence API token</Label>
                      <Input
                        id="confluence-token"
                        type="password"
                        placeholder="Your Confluence API token"
                        value={env.CONFLUENCE_API_TOKEN}
                        onChange={(e) => updateEnv("CONFLUENCE_API_TOKEN", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {stepId === "zephyr" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="font-medium">How to get your Zephyr access token</p>
                  <ol className="mt-1 list-inside list-decimal space-y-0.5 text-muted-foreground">
                    <li>Log in to Jira where Zephyr Scale is installed.</li>
                    <li>Click your <strong>profile picture</strong> at the bottom left.</li>
                    <li>Choose <strong>&quot;Zephyr API keys&quot;</strong> and generate a new key.</li>
                    <li>Copy the token and paste it here (it is shown only once).</li>
                  </ol>
                  <a
                    href={TOKEN_LINKS.zephyrApiTokensDocs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Zephyr API tokens documentation
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="zephyr-enabled"
                    checked={config.zephyr.enabled}
                    onChange={(e) =>
                      updateConfig("zephyr", { ...config.zephyr, enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="zephyr-enabled">Enable Zephyr integration</Label>
                </div>
                {config.zephyr.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="zephyr-projectKey">Zephyr project key</Label>
                      <Input
                        id="zephyr-projectKey"
                        type="text"
                        placeholder="MYPROJ"
                        value={config.zephyr.projectKey}
                        onChange={(e) =>
                          updateConfig("zephyr", { ...config.zephyr, projectKey: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zephyr-projectId">Zephyr project ID (optional)</Label>
                      <Input
                        id="zephyr-projectId"
                        type="text"
                        placeholder="12345"
                        value={config.zephyr.projectId}
                        onChange={(e) =>
                          updateConfig("zephyr", { ...config.zephyr, projectId: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zephyr-folderId">Zephyr folder ID (optional)</Label>
                      <Input
                        id="zephyr-folderId"
                        type="text"
                        placeholder=""
                        value={config.zephyr.folderId}
                        onChange={(e) =>
                          updateConfig("zephyr", { ...config.zephyr, folderId: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zephyr-baseUrl">Zephyr base URL</Label>
                      <Input
                        id="zephyr-baseUrl"
                        type="url"
                        placeholder="https://api.zephyrscale.smartbear.com/v2"
                        value={env.ZEPHYR_BASE_URL}
                        onChange={(e) => updateEnv("ZEPHYR_BASE_URL", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zephyr-token">Zephyr access token</Label>
                      <Input
                        id="zephyr-token"
                        type="password"
                        placeholder="Your Zephyr access token"
                        value={env.ZEPHYR_ACCESS_TOKEN}
                        onChange={(e) => updateEnv("ZEPHYR_ACCESS_TOKEN", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zephyr-projectId-env">Zephyr project ID env (optional)</Label>
                      <Input
                        id="zephyr-projectId-env"
                        type="text"
                        placeholder=""
                        value={env.ZEPHYR_PROJECT_ID}
                        onChange={(e) => updateEnv("ZEPHYR_PROJECT_ID", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {stepId === "bitbucket" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="font-medium">Bitbucket API token</p>
                  <p className="mt-1 text-muted-foreground">
                    Bitbucket Cloud uses your Atlassian account. You can use the{" "}
                    <strong>same API token</strong> as Jira and Confluence if you use the same
                    Atlassian email. Create or copy it from the link below.
                  </p>
                  <a
                    href={TOKEN_LINKS.atlassianApiTokens}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Atlassian API tokens
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bitbucket-enabled"
                    checked={config.bitbucket.enabled}
                    onChange={(e) =>
                      updateConfig("bitbucket", { ...config.bitbucket, enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="bitbucket-enabled">Enable Bitbucket integration</Label>
                </div>
                {config.bitbucket.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bitbucket-workspace">Bitbucket workspace</Label>
                      <Input
                        id="bitbucket-workspace"
                        type="text"
                        placeholder="my-workspace"
                        value={config.bitbucket.workspace}
                        onChange={(e) =>
                          updateConfig("bitbucket", {
                            ...config.bitbucket,
                            workspace: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bitbucket-repo">Bitbucket repository</Label>
                      <Input
                        id="bitbucket-repo"
                        type="text"
                        placeholder="my-repo"
                        value={config.bitbucket.repo}
                        onChange={(e) =>
                          updateConfig("bitbucket", { ...config.bitbucket, repo: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bitbucket-email">Bitbucket email</Label>
                      <Input
                        id="bitbucket-email"
                        type="email"
                        placeholder="you@example.com"
                        value={env.BITBUCKET_EMAIL}
                        onChange={(e) => updateEnv("BITBUCKET_EMAIL", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bitbucket-token">Bitbucket API token</Label>
                      <Input
                        id="bitbucket-token"
                        type="password"
                        placeholder="Your Bitbucket API token"
                        value={env.BITBUCKET_API_TOKEN}
                        onChange={(e) => updateEnv("BITBUCKET_API_TOKEN", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {stepId === "done" && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                  <p className="font-medium">Summary</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Jira: {config.jira.baseUrl || "—"}</li>
                    {config.confluence.enabled && (
                      <li>Confluence: {config.confluence.baseUrl || "—"}</li>
                    )}
                    {config.zephyr.enabled && (
                      <li>Zephyr: {config.zephyr.projectKey || "—"}</li>
                    )}
                    {config.bitbucket.enabled && (
                      <li>
                        Bitbucket: {config.bitbucket.workspace}/{config.bitbucket.repo}
                      </li>
                    )}
                  </ul>
                </div>
                <p className="text-muted-foreground text-sm">
                  Configuration will be saved in this browser and reused when you return. You can
                  change anything later from the dashboard (Configuration and Environment Variables).
                </p>
              </div>
            )}

            {stepId !== "welcome" && stepId !== "done" && (
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack} disabled={stepIndex === 0}>
                  Back
                </Button>
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {stepId === "done" && (
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleFinish} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Finish"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
