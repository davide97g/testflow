"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload, FileText, Save, Eye, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export default function EnvPage() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { id: "1", key: "", value: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());

  const handleAddRow = () => {
    setEnvVars([
      ...envVars,
      { id: Date.now().toString(), key: "", value: "" },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (envVars.length > 1) {
      setEnvVars(envVars.filter((v) => v.id !== id));
    } else {
      toast.error("At least one row is required");
    }
  };

  const handleUpdate = (id: string, field: "key" | "value", value: string) => {
    setEnvVars(
      envVars.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const lines = pastedText.split("\n").filter((line) => line.trim());

      const newVars: EnvVar[] = [];
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Handle .env format: KEY=VALUE or KEY="VALUE"
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          newVars.push({
            id: `pasted-${Date.now()}-${index}`,
            key,
            value,
          });
        } else {
          // If no = sign, treat as key only
          newVars.push({
            id: `pasted-${Date.now()}-${index}`,
            key: trimmed,
            value: "",
          });
        }
      });

      if (newVars.length > 0) {
        // Remove empty rows and add new ones
        const nonEmpty = envVars.filter((v) => v.key || v.value);
        setEnvVars([...nonEmpty, ...newVars]);
        toast.success(`Pasted ${newVars.length} environment variable(s)`);
      }
    },
    [envVars]
  );

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        const newVars: EnvVar[] = [];
        lines.forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return; // Skip comments

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
            newVars.push({
              id: `imported-${Date.now()}-${index}`,
              key,
              value,
            });
          }
        });

        if (newVars.length > 0) {
          const nonEmpty = envVars.filter((v) => v.key || v.value);
          setEnvVars([...nonEmpty, ...newVars]);
          toast.success(`Imported ${newVars.length} environment variable(s)`);
        } else {
          toast.error("No valid environment variables found in file");
        }
      } catch (error) {
        toast.error("Failed to read file");
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    // Filter out empty rows
    const validVars = envVars.filter((v) => v.key.trim());
    
    if (validVars.length === 0) {
      toast.error("Please add at least one environment variable");
      return;
    }

    // Check for duplicate keys
    const keys = validVars.map((v) => v.key.trim());
    const duplicates = keys.filter(
      (key, index) => keys.indexOf(key) !== index
    );
    if (duplicates.length > 0) {
      toast.error(`Duplicate keys found: ${duplicates.join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      const envObject: Record<string, string> = {};
      validVars.forEach((v) => {
        envObject[v.key.trim()] = v.value;
      });

      const response = await fetch("/api/env", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(envObject),
      });

      if (!response.ok) {
        throw new Error("Failed to save environment variables");
      }

      toast.success("Environment variables saved successfully");
    } catch (error) {
      toast.error("Failed to save environment variables");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Environment Variables
          </h1>
          <p className="mt-2 text-muted-foreground">
            Configure your API tokens and credentials
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              Add your environment variables. You can paste .env format or import
              a file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="import-file" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Import .env</span>
                  </div>
                </Label>
                <input
                  id="import-file"
                  type="file"
                  accept=".env,.txt"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                or paste the .env contents above
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
                <div>Key</div>
                <div>Value</div>
                <div className="w-10"></div>
              </div>

              {envVars.map((envVar) => (
                <div
                  key={envVar.id}
                  className="grid grid-cols-[1fr_1fr_auto] gap-4"
                >
                  <Input
                    placeholder="CLIENT_KEY..."
                    value={envVar.key}
                    onChange={(e) =>
                      handleUpdate(envVar.id, "key", e.target.value)
                    }
                  />
                  <div className="relative">
                    <Input
                      type={visibleValues.has(envVar.id) ? "text" : "password"}
                      placeholder="Enter value"
                      value={envVar.value}
                      onChange={(e) =>
                        handleUpdate(envVar.id, "value", e.target.value)
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVisible = new Set(visibleValues);
                        if (newVisible.has(envVar.id)) {
                          newVisible.delete(envVar.id);
                        } else {
                          newVisible.add(envVar.id);
                        }
                        setVisibleValues(newVisible);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {visibleValues.has(envVar.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRow(envVar.id)}
                    disabled={envVars.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={handleAddRow}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another
            </Button>

            <div className="rounded-lg border bg-muted/50 p-4">
              <textarea
                className="w-full resize-none border-none bg-transparent p-2 text-sm focus:outline-none"
                placeholder="Paste .env format here (KEY=VALUE on each line)..."
                onPaste={handlePaste}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Link href="/jira" className="flex-1">
                <Button variant="outline" className="w-full">
                  Next: View Jira Issues
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

