"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

interface ZephyrTestCase {
  id?: number;
  key?: string;
  title?: string;
  name?: string;
  description?: string;
  preconditions?: string;
  status?: {
    id?: number;
    name?: string;
  };
  priority?: {
    id?: number;
    name?: string;
  };
  type?: {
    id?: number;
    name?: string;
  };
  createdOn?: string;
  updatedOn?: string;
}

const CONFIG_STORAGE_KEY = "testflow_config";

export default function ZephyrPage() {
  const [testCases, setTestCases] = useState<ZephyrTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    // Load config from localStorage
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig(parsed);
      } catch {
        // Invalid JSON
      }
    }
  }, []);

  const fetchTestCases = async () => {
    if (!config?.zephyr) {
      toast.error("Please configure Zephyr settings first");
      return;
    }

    setEnvError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/zephyr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = (data as { error?: string } | undefined)?.error ?? "Failed to fetch test cases";
        if (typeof message === "string" && message.includes("Environment Variables")) {
          setEnvError(message);
          toast.error("Set Zephyr credentials in Environment Variables");
          return;
        }
        throw new Error(message);
      }

      setTestCases(data.testCases || []);
      toast.success(`Fetched ${data.testCases?.length || 0} test cases`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch test cases"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (config?.zephyr) {
      fetchTestCases();
    }
  }, []);

  if (!config?.zephyr) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              ← Back to Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">
              Zephyr Test Cases
            </h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Please configure Zephyr settings first
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
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Zephyr Test Cases
              </h1>
              <p className="mt-2 text-muted-foreground">
                View test cases from your Zephyr folder
              </p>
            </div>
            <Button onClick={fetchTestCases} disabled={isLoading}>
              {isLoading ? (
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Cases</CardTitle>
            <CardDescription>
              {testCases.length} test case{testCases.length !== 1 ? "s" : ""}{" "}
              found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {envError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  {envError}
                </p>
                <Link href="/env">
                  <Button variant="outline" size="sm">
                    Go to Environment Variables
                  </Button>
                </Link>
              </div>
            ) : null}
            {isLoading && testCases.length === 0 && !envError ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : testCases.length === 0 && !envError ? (
              <div className="py-12 text-center text-muted-foreground">
                No test cases found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase) => (
                    <TableRow key={testCase.key || testCase.id}>
                      <TableCell className="font-mono font-medium">
                        {testCase.key || `ID: ${testCase.id}`}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {testCase.title || testCase.name || "Untitled"}
                          </div>
                          {testCase.description && (
                            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {testCase.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {testCase.status?.name ? (
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {testCase.status.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {testCase.priority?.name ? (
                          <span className="text-sm">
                            {testCase.priority.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {testCase.type?.name ? (
                          <span className="text-sm">{testCase.type.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {testCase.createdOn ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(testCase.createdOn).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

