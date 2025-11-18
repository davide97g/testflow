import { ExternalLink } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Docs = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-lg text-muted-foreground">
            Complete reference for all Sonarflow commands and features
          </p>
        </div>

        <Tabs defaultValue="commands" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="output">Output Files</TabsTrigger>
            <TabsTrigger value="integration">AI Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="commands" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <code className="text-lg font-mono">fetch</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Fetches SonarQube issues from your pull requests on GitHub or Bitbucket.
                </p>
                <CodeBlock code="npx @bitrockteam/sonarflow fetch" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Options:</p>
                  <CodeBlock
                    code={`--platform   Platform to use (github or bitbucket)
--pr         Pull request number
--repo       Repository name
--owner      Repository owner`}
                    language="text"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <code className="text-lg font-mono">scan</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Runs a local SonarQube scan on your codebase without requiring a SonarQube server.
                </p>
                <CodeBlock code="npx @bitrockteam/sonarflow scan" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Options:</p>
                  <CodeBlock
                    code={`--project    Project key for SonarQube
--sources    Source directories to scan
--exclusions File patterns to exclude`}
                    language="text"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <code className="text-lg font-mono">init</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Interactive CLI wizard to set up Sonarflow configuration and environment
                  variables.
                </p>
                <CodeBlock code="npx @bitrockteam/sonarflow init" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <code className="text-lg font-mono">update</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Checks for and installs the latest version of Sonarflow.
                </p>
                <CodeBlock code="npx @bitrockteam/sonarflow update" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="output" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">.sonar/issues.json</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Contains all SonarQube issues fetched from pull requests. Each issue includes:
                </p>
                <CodeBlock
                  code={`{
  "issues": [
    {
      "key": "issue-key",
      "rule": "rule-identifier",
      "severity": "MAJOR",
      "message": "Issue description",
      "component": "file-path",
      "line": 42,
      "status": "OPEN",
      "type": "BUG"
    }
  ]
}`}
                  language="json"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">.sonar/scanner-report.json</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Generated by the local scan command. Contains detailed analysis results:
                </p>
                <CodeBlock
                  code={`{
  "projectKey": "your-project",
  "timestamp": "2025-01-01T12:00:00Z",
  "issues": [...],
  "metrics": {
    "lines": 1000,
    "coverage": "85.5%",
    "bugs": 2,
    "vulnerabilities": 0,
    "code_smells": 15
  }
}`}
                  language="json"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Editor Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Sonarflow seamlessly integrates with AI-powered editors to provide intelligent
                  code insights.
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Cursor</h3>
                    <p className="text-muted-foreground mb-3">
                      Configure Cursor to read SonarQube issues:
                    </p>
                    <CodeBlock
                      code={`// Add to Cursor settings
{
  "sonarflow.enabled": true,
  "sonarflow.issuesPath": ".sonar/issues.json"
}`}
                      language="json"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">VSCode</h3>
                    <p className="text-muted-foreground mb-3">
                      Use the Sonarflow extension for VSCode:
                    </p>
                    <CodeBlock code="code --install-extension bitrockteam.sonarflow" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Windsurf</h3>
                    <p className="text-muted-foreground mb-3">
                      Windsurf automatically detects{" "}
                      <code className="px-1 py-0.5 bg-muted rounded">.sonar</code> directories and
                      provides inline suggestions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Additional Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    <a
                      href="https://docs.sonarqube.org/latest/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground underline"
                    >
                      Official SonarQube Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.sonarqube.org/latest/extend/web-api/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground underline"
                    >
                      SonarQube Web API Reference
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Docs;
