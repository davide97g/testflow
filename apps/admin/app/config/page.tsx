"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileJson, CheckCircle2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

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

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
        setIsValid(true);
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

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

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (validateConfig(parsed)) {
          setConfig(parsed);
          setIsValid(true);
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
          toast.success("Configuration loaded successfully");
        } else {
          setIsValid(false);
          toast.error("Invalid configuration file format");
        }
      } catch (error) {
        setIsValid(false);
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
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

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
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
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    toast.success("Configuration cleared");
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
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input
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
            </div>

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
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                </div>

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

