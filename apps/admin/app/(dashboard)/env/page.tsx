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
import { CheckCircle2, Circle, Upload, Save, Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ENV_SECTIONS,
  isEnvValueValid,
  isSectionFullyConfigured,
  ALL_ENV_KEYS,
  type EnvSectionSpec,
  type EnvKeySpec,
} from "@/lib/env-schema";

function getInitialValues(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  keys.forEach((key) => {
    out[key] = "";
  });
  return out;
}

export default function EnvPage() {
  const [values, setValues] = useState<Record<string, string>>(() =>
    getInitialValues(ALL_ENV_KEYS)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEnv, setIsLoadingEnv] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadEnv = async () => {
      try {
        const response = await fetch("/api/env");
        if (!response.ok) return;
        const data = (await response.json()) as Record<string, string>;
        setValues((prev) => {
          const next = { ...prev };
          ALL_ENV_KEYS.forEach((key) => {
            if (data[key] !== undefined) {
              next[key] = data[key] ?? "";
            }
          });
          return next;
        });
      } catch {
        // ignore
      } finally {
        setIsLoadingEnv(false);
      }
    };
    loadEnv();
  }, []);

  const handleUpdate = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleToggleVisible = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const parsePastedEnv = useCallback((text: string): Record<string, string> => {
    const out: Record<string, string> = {};
    const lines = text.split("\n").filter((line) => line.trim());
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        out[key] = value;
      }
    });
    return out;
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const parsed = parsePastedEnv(pastedText);
      const keys = Object.keys(parsed);
      if (keys.length === 0) return;
      setValues((prev) => ({ ...prev, ...parsed }));
      toast.success(`Pasted ${keys.length} environment variable(s)`);
    },
    [parsePastedEnv]
  );

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = (event.target?.result as string) ?? "";
          const parsed = parsePastedEnv(text);
          const keys = Object.keys(parsed);
          if (keys.length === 0) {
            toast.error("No valid environment variables found in file");
            return;
          }
          setValues((prev) => ({ ...prev, ...parsed }));
          toast.success(`Imported ${keys.length} environment variable(s)`);
        } catch {
          toast.error("Failed to read file");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [parsePastedEnv]
  );

  const handleSave = async () => {
    const jiraSection = ENV_SECTIONS.find((s) => s.id === "jira");
    if (jiraSection && !isSectionFullyConfigured(jiraSection, values)) {
      toast.error("Jira email and API token are required");
      return;
    }

    setIsSaving(true);
    try {
      const envObject: Record<string, string> = {};
      ALL_ENV_KEYS.forEach((key) => {
        const v = values[key]?.trim();
        if (v !== undefined && v !== "") envObject[key] = values[key];
      });

      const response = await fetch("/api/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envObject),
      });

      if (!response.ok) throw new Error("Failed to save");
      toast.success("Environment variables saved successfully");
    } catch {
      toast.error("Failed to save environment variables");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
            tabIndex={0}
            aria-label="Back to home"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Environment Variables
          </h1>
          <p className="mt-2 text-muted-foreground">
            Configure API credentials by section. Fill the values and save.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Label htmlFor="import-file" className="cursor-pointer">
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 hover:bg-muted/50">
              <Upload className="h-4 w-4" aria-hidden />
              <span className="text-sm">Import .env file</span>
            </div>
          </Label>
          <input
            id="import-file"
            type="file"
            accept=".env,.txt"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Import .env file"
          />
          <span className="text-sm text-muted-foreground">
            or paste .env contents in the text area below
          </span>
        </div>

        {isLoadingEnv ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Loading environment variables...
          </div>
        ) : (
          <div className="space-y-8">
            {ENV_SECTIONS.map((section) => (
              <EnvSectionCard
                key={section.id}
                section={section}
                values={values}
                visibleKeys={visibleKeys}
                onUpdate={handleUpdate}
                onToggleVisible={handleToggleVisible}
                isSectionOk={isSectionFullyConfigured(section, values)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-lg border bg-muted/50 p-4">
          <Label htmlFor="paste-env" className="text-muted-foreground text-sm">
            Paste .env format here (KEY=VALUE on each line)
          </Label>
          <textarea
            id="paste-env"
            className="mt-2 w-full resize-none border-none bg-transparent p-2 text-sm focus:outline-none"
            placeholder="JIRA_EMAIL=you@company.com&#10;JIRA_API_TOKEN=..."
            onPaste={handlePaste}
            rows={4}
            aria-label="Paste .env contents"
          />
        </div>

        <div className="mt-8 flex gap-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
            aria-label={isSaving ? "Saving..." : "Save environment variables"}
          >
            <Save className="mr-2 h-4 w-4" aria-hidden />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Link href="/jira" className="flex-1">
            <Button variant="outline" className="w-full">
              Next: View Jira Issues
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

interface EnvSectionCardProps {
  section: EnvSectionSpec;
  values: Record<string, string>;
  visibleKeys: Set<string>;
  onUpdate: (key: string, value: string) => void;
  onToggleVisible: (key: string) => void;
  isSectionOk: boolean;
}

function EnvSectionCard({
  section,
  values,
  visibleKeys,
  onUpdate,
  onToggleVisible,
  isSectionOk,
}: EnvSectionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {isSectionOk ? (
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-green-600"
              aria-label="Section configured"
            />
          ) : (
            <Circle
              className="h-5 w-5 shrink-0 text-muted-foreground/50"
              aria-label="Section not configured"
            />
          )}
          <div>
            <CardTitle className="text-lg">
              {section.title}
              {section.required && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (required)
                </span>
              )}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {section.keys.map((keySpec) => (
          <EnvKeyRow
            key={keySpec.key}
            keySpec={keySpec}
            value={values[keySpec.key] ?? ""}
            isVisible={visibleKeys.has(keySpec.key)}
            onUpdate={(value) => onUpdate(keySpec.key, value)}
            onToggleVisible={() => onToggleVisible(keySpec.key)}
            isValid={isEnvValueValid(values[keySpec.key] ?? "", keySpec.type)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface EnvKeyRowProps {
  keySpec: EnvKeySpec;
  value: string;
  isVisible: boolean;
  onUpdate: (value: string) => void;
  onToggleVisible: () => void;
  isValid: boolean;
}

function EnvKeyRow({
  keySpec,
  value,
  isVisible,
  onUpdate,
  onToggleVisible,
  isValid,
}: EnvKeyRowProps) {
  const isPassword = keySpec.type === "token";
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-center">
      <div className="flex items-center gap-2">
        {isValid ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-green-600"
            aria-label="Configured"
          />
        ) : (
          <Circle
            className="h-4 w-4 shrink-0 text-muted-foreground/40"
            aria-label="Not configured"
          />
        )}
        <Label htmlFor={`env-${keySpec.key}`} className="text-sm font-medium">
          {keySpec.label}
        </Label>
      </div>
      <div className="relative">
        <Input
          id={`env-${keySpec.key}`}
          type={isPassword && !isVisible ? "password" : "text"}
          placeholder={keySpec.placeholder}
          value={value}
          onChange={(e) => onUpdate(e.target.value)}
          className="pr-10"
          aria-label={`${keySpec.label} (${keySpec.key})`}
          aria-invalid={value.trim() !== "" && !isValid}
        />
        {isPassword && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={isVisible ? "Hide value" : "Show value"}
            tabIndex={0}
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      <span className="text-muted-foreground text-xs sm:col-span-2 sm:col-start-2">
        {keySpec.key}
      </span>
    </div>
  );
}
