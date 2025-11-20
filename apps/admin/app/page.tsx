"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Key, List, TestTube } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Testflow Admin</h1>
          <p className="mt-2 text-muted-foreground">
            Configure and manage your Testflow integration
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                <CardTitle>Configuration</CardTitle>
              </div>
              <CardDescription>
                Upload your testflow configuration file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/config">
                <Button className="w-full">Configure</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                <CardTitle>Environment Variables</CardTitle>
              </div>
              <CardDescription>
                Set up your API tokens and credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/env">
                <Button className="w-full">Set Environment Variables</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <List className="h-5 w-5" />
                <CardTitle>Jira Issues</CardTitle>
              </div>
              <CardDescription>
                View Jira issues with Confluence pages and branches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/jira">
                <Button className="w-full">View Issues</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                <CardTitle>Zephyr Test Cases</CardTitle>
              </div>
              <CardDescription>
                View test cases from your Zephyr folder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/zephyr">
                <Button className="w-full">View Test Cases</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
