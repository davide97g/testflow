"use client";

import { JiraSearchSection } from "@/components/jira-search-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

const CONFIG_STORAGE_KEY = "testflow_config";

export default function WorkflowPage() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

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
            Search Jira issues (by board and filters), extract data, and generate
            E2E test prompts
          </p>
        </div>

        <JiraSearchSection
          config={config}
          title="Step 1: Search Jira Issue"
          description="Search runs on Jira with your board ID and config filters (assignee, statuses). Use key, full URL, or text."
          showExtractColumn
          emptyMessage="No issues found. Check board, assignee and statuses in config, then run Search or Show all."
        />
      </div>
    </div>
  );
}
