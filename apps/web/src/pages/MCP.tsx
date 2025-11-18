import { Code, FileText, Plug } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MCP = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <div className="mb-12 text-center">
          <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            AI Editor Integration
          </div>
          <h1 className="text-4xl font-bold mb-4">AI Editor Integration</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            testflow seamlessly integrates with AI-powered editors by creating rule files and providing structured output that AI assistants can easily consume.
          </p>
        </div>

        <div className="space-y-8">
          {/* Editor Rule Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                Editor Rule Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                When you run <code className="px-1.5 py-0.5 bg-muted rounded text-sm">testflow init</code>, it automatically creates rule files for your AI editor:
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">Cursor</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates <code className="px-1 py-0.5 bg-muted rounded text-xs">.cursorrules</code> file in your project root
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">GitHub Copilot</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates <code className="px-1 py-0.5 bg-muted rounded text-xs">.github/copilot-instructions.md</code> file
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">Codeium</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates <code className="px-1 py-0.5 bg-muted rounded text-xs">.codeium/instructions.md</code> file
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Structured Output */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Code className="h-5 w-5 text-primary" />
                Structured Output
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                testflow extracts Jira issues and PR changes into a structured format that AI editors can easily read:
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Human-readable summaries:</p>
                  <CodeBlock code=".testflow/output/{ISSUE-KEY}/jira-issue-description.txt" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">JSON data:</p>
                  <CodeBlock code=".testflow/output/{ISSUE-KEY}/raw/jira-issue.json" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">PR patches:</p>
                  <CodeBlock code=".testflow/output/{ISSUE-KEY}/pr.patch" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Plug className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                AI editors can access the extracted data from <code className="px-1.5 py-0.5 bg-muted rounded text-sm">.testflow/output/</code> directories:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                <li>Run <code className="px-1 py-0.5 bg-muted rounded text-xs">testflow init</code> to create editor rule files</li>
                <li>Run <code className="px-1 py-0.5 bg-muted rounded text-xs">testflow extract</code> to extract Jira issues and PR changes</li>
                <li>AI editors read the structured output from <code className="px-1 py-0.5 bg-muted rounded text-xs">.testflow/output/</code></li>
                <li>AI assistants use this context to provide better code suggestions and insights</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MCP;
