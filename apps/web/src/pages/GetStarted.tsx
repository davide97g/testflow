import { AlertCircle } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GetStarted = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Get Started</h1>
          <p className="text-lg text-muted-foreground">
            Follow these steps to install and configure testflow in your project
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Configure npm for GitHub Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                testflow is published to GitHub Packages. Configure npm to use GitHub Packages:
              </p>
              <CodeBlock code={`echo "@davide97g:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc`} />
              <div className="flex gap-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm">
                  You'll need a GitHub personal access token with{" "}
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">read:packages</code> scope
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Install testflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Install testflow using bun (recommended) or npm:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Using bun:</p>
                  <CodeBlock code="bun add @davide97g/testflow" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Using npm:</p>
                  <CodeBlock code="npm install @davide97g/testflow" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Initialize Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Run the interactive CLI to set up your configuration:
              </p>
              <CodeBlock code="testflow init" />
              <p className="text-sm text-muted-foreground">
                This command will guide you through setting up Bitbucket, Jira, and Confluence integrations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 4: Configure Environment Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create a <code className="px-1 py-0.5 bg-muted rounded">.env</code> file with the
                required tokens:
              </p>
              <CodeBlock
                code={`# Required: Jira credentials
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token

# Optional: Bitbucket integration
BITBUCKET_EMAIL=your-email@example.com
BITBUCKET_API_TOKEN=your_bitbucket_api_token

# Optional: Confluence integration
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your_confluence_api_token`}
                language="bash"
              />
              <div className="flex gap-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium">Creating API Tokens:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Jira: Required - Create at Atlassian Account Settings</li>
                    <li>Bitbucket: Optional - Create app password with PR read permissions</li>
                    <li>Confluence: Optional - Uses same token as Jira if same domain</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardHeader>
              <CardTitle>You're All Set!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Now you can start using testflow to extract Jira issues and PR changes:
              </p>
              <div className="space-y-3">
                <CodeBlock code="testflow extract" />
                <CodeBlock code="testflow extract BAT-123" />
                <CodeBlock code="testflow extract:pr 123" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
