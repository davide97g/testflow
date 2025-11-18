import { Code, Plug, Server, Shield } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MCP = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <div className="mb-12 text-center">
          <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            Model Context Protocol
          </div>
          <h1 className="text-4xl font-bold mb-4">MCP Server Integration</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Sonarflow includes an MCP server that provides SonarQube and Bitbucket tools to AI
            assistants like Cursor, Claude Desktop, and other MCP-compatible clients.
          </p>
        </div>

        <div className="space-y-8">
          {/* Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Server className="h-5 w-5 text-primary" />
                Installation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The MCP server is included when you install the package. You can use it with{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">npx</code> or{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">bunx</code>:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Using npx:</p>
                  <CodeBlock code="npx @bitrockteam/sonarflow mcp" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Using bunx:</p>
                  <CodeBlock code="bunx @bitrockteam/sonarflow mcp" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Plug className="h-5 w-5 text-primary" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Add the MCP server to your MCP client configuration. For Cursor, create or update{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">.cursor/mcp.json</code>:
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">With npx (recommended):</p>
                  <CodeBlock
                    code={`{
  "mcpServers": {
    "sonarflow": {
      "command": "npx",
      "args": ["@bitrockteam/sonarflow", "mcp"]
    }
  }
}`}
                    language="json"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">With local/global installation:</p>
                  <CodeBlock
                    code={`{
  "mcpServers": {
    "sonarflow": {
      "command": "sonarflow",
      "args": ["mcp"]
    }
  }
}`}
                    language="json"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Code className="h-5 w-5 text-primary" />
                Available Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">bitbucket.getRepoInfo</h4>
                    <p className="text-sm text-muted-foreground">
                      Fetches repository metadata from Bitbucket REST API
                    </p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium mb-1">Parameters:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">owner</code>
                        </li>
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">repo</code>
                        </li>
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">token</code> (optional)
                        </li>
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">email</code> (optional)
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">sonar.getQualityGateStatus</h4>
                    <p className="text-sm text-muted-foreground">
                      Fetches quality gate status from SonarQube API
                    </p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium mb-1">Parameters:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">projectKey</code>
                        </li>
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">sonarToken</code>{" "}
                          (optional)
                        </li>
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">sonarBaseUrl</code>{" "}
                          (optional)
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Available Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                Available Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">code_review</h4>
                    <p className="text-sm text-muted-foreground">
                      Expert code review prompt focused on code quality, bugs, and best practices
                    </p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium mb-1">Parameters:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">code</code>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-semibold text-lg">security_scan</h4>
                    <p className="text-sm text-muted-foreground">
                      Security expert prompt for scanning code for vulnerabilities and security
                      issues
                    </p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium mb-1">Parameters:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>
                          <code className="px-1 py-0.5 bg-muted rounded">code</code>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MCP;
