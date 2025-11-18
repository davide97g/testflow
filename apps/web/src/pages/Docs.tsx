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
            Complete reference for all testflow commands and features
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
                  <code className="text-lg font-mono">init</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Interactive CLI wizard to set up testflow configuration. Configures Bitbucket, Jira, and Confluence integrations, and creates AI editor rule files.
                </p>
                <CodeBlock code="testflow init" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">What it does:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                    <li>Configures Bitbucket integration (optional)</li>
                    <li>Configures Jira integration (required)</li>
                    <li>Configures Confluence integration (optional)</li>
                    <li>Creates configuration files in .testflow/</li>
                    <li>Sets up AI editor rules (Cursor, GitHub Copilot, Codeium)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <code className="text-lg font-mono">extract</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Extract Jira issue data, linked resources, and PR changes. Can be used interactively or with a specific issue key.
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Interactive mode:</p>
                    <CodeBlock code="testflow extract" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">With specific issue:</p>
                    <CodeBlock code="testflow extract BAT-123" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">What it does:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                    <li>Fetches Jira issue details</li>
                    <li>Extracts linked resources (other Jira issues and Confluence pages)</li>
                    <li>Fetches Confluence page content (if configured)</li>
                    <li>Searches for associated Bitbucket branches and PRs (if configured)</li>
                    <li>Downloads PR changes and patches (if PR is found)</li>
                    <li>Saves all data to .testflow/output/{`{ISSUE-KEY}`}/</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <code className="text-lg font-mono">extract:pr</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Extract PR changes directly by PR ID.
                </p>
                <CodeBlock code="testflow extract:pr 123" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Arguments:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                    <li>
                      <code className="px-1 py-0.5 bg-muted rounded">prId</code> - Pull request ID (required)
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="output" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">.testflow/output/{`{ISSUE-KEY}`}/</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The output directory structure contains all extracted data:
                </p>
                <CodeBlock
                  code={`.testflow/output/{ISSUE-KEY}/
├── jira-issue-description.txt    # Human-readable issue summary
├── pr.patch                       # PR code changes (if PR found)
├── raw/
│   ├── jira-issue.json           # Full Jira issue data
│   ├── linked-resources.json     # List of linked resources
│   ├── bitbucket-branch.json     # Branch info (if found)
│   └── bitbucket-pullrequests.json # PR data (if found)
└── confluence/                    # Confluence pages (if found)
    ├── page-{ID}.json
    └── page-{ID}.txt`}
                  language="text"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">jira-issue-description.txt</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Human-readable summary of the Jira issue, formatted for easy consumption by AI editors.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">raw/jira-issue.json</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Complete Jira issue data in JSON format, including all fields, custom fields, and metadata.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">raw/linked-resources.json</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  List of all linked Jira issues and Confluence pages associated with the main issue.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <code className="text-lg font-mono">pr.patch</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Git patch file containing all code changes from the associated pull request (if found).
                </p>
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
                  testflow seamlessly integrates with AI-powered editors to provide intelligent
                  context about Jira issues and PR changes.
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Cursor</h3>
                    <p className="text-muted-foreground mb-3">
                      The init command automatically creates a <code className="px-1 py-0.5 bg-muted rounded">.cursorrules</code> file with testflow instructions. AI assistants can read the extracted data from <code className="px-1 py-0.5 bg-muted rounded">.testflow/output/</code> directories.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">GitHub Copilot</h3>
                    <p className="text-muted-foreground mb-3">
                      The init command creates a <code className="px-1 py-0.5 bg-muted rounded">.github/copilot-instructions.md</code> file. GitHub Copilot can reference the extracted issue data for better context.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Codeium</h3>
                    <p className="text-muted-foreground mb-3">
                      The init command creates a <code className="px-1 py-0.5 bg-muted rounded">.codeium/instructions.md</code> file. Codeium can access the structured output in <code className="px-1 py-0.5 bg-muted rounded">.testflow/output/</code>.
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
                      href="https://github.com/davide97g/testflow"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground underline"
                    >
                      testflow GitHub Repository
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://developer.atlassian.com/cloud/jira/platform/rest/v3/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground underline"
                    >
                      Jira REST API Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://developer.atlassian.com/cloud/bitbucket/rest/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground underline"
                    >
                      Bitbucket REST API Documentation
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
