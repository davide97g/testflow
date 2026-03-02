"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Key, List, Sparkles, TestTube, Play, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CONFIG_STORAGE_KEY = "testflow_config";

const hasValidConfig = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!stored) return false;
  try {
    const parsed = JSON.parse(stored);
    return Boolean(parsed?.jira?.baseUrl);
  } catch {
    return false;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!hasValidConfig()) {
      router.replace("/setup");
    }
  }, [mounted, router]);

  if (!mounted || !hasValidConfig()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Follow the steps below to configure, view data, generate, and run E2E tests.
          </p>
        </div>

        <div className="space-y-10">
          {/* Step 1 — Settings */}
          <section aria-labelledby="step-settings">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-sm font-medium tabular-nums text-muted-foreground">01</span>
              <h2 id="step-settings" className="text-xl font-semibold tracking-tight">
                Settings
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Configure and secure your integration.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" aria-hidden />
                    <CardTitle className="text-base">Configuration</CardTitle>
                  </div>
                  <CardDescription>Upload your testflow configuration file</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/config">
                    <Button className="w-full" variant="default">
                      Configure
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" aria-hidden />
                    <CardTitle className="text-base">Environment Variables</CardTitle>
                  </div>
                  <CardDescription>Set up your API tokens and credentials</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/env">
                    <Button className="w-full" variant="default">
                      Set Environment Variables
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Step 2 — Data */}
          <section aria-labelledby="step-data">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-sm font-medium tabular-nums text-muted-foreground">02</span>
              <h2 id="step-data" className="text-xl font-semibold tracking-tight">
                Data
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              View issues and test cases from Jira and Zephyr.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <List className="h-5 w-5" aria-hidden />
                    <CardTitle className="text-base">Jira Issues</CardTitle>
                  </div>
                  <CardDescription>
                    View Jira issues with Confluence pages and branches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/jira">
                    <Button className="w-full" variant="default">
                      View Issues
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" aria-hidden />
                    <CardTitle className="text-base">Zephyr Test Cases</CardTitle>
                  </div>
                  <CardDescription>View test cases from your Zephyr folder</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/zephyr">
                    <Button className="w-full" variant="default">
                      View Test Cases
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Step 3 — Generate */}
          <section aria-labelledby="step-generate">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-sm font-medium tabular-nums text-muted-foreground">03</span>
              <h2 id="step-generate" className="text-xl font-semibold tracking-tight">
                Generate
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Generate E2E tests from Jira issues.
            </p>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" aria-hidden />
                  <CardTitle className="text-base">E2E Test Generation</CardTitle>
                </div>
                <CardDescription>Generate E2E tests from Jira issues</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/workflow">
                  <Button className="w-full" variant="default">
                    Start Workflow
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Step 4 — Run */}
          <section aria-labelledby="step-run">
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-sm font-medium tabular-nums text-muted-foreground">04</span>
              <h2 id="step-run" className="text-xl font-semibold tracking-tight">
                Run
              </h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Run Playwright tests in the background.
            </p>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5" aria-hidden />
                  <CardTitle className="text-base">E2E Run (headless)</CardTitle>
                </div>
                <CardDescription>Run example Playwright tests in the background</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/e2e">
                  <Button className="w-full" variant="default">
                    Run E2E Tests
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
