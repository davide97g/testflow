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
            Follow these steps to install and configure Sonarflow in your project
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Authenticate to GitHub Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Sonarflow is published to GitHub Packages. You need to authenticate with a personal
                access token.
              </p>
              <CodeBlock code="npm login --registry=https://npm.pkg.github.com --scope=@bitrockteam" />
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
              <CardTitle>Step 2: Configure Project .npmrc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create or update your project's{" "}
                <code className="px-1 py-0.5 bg-muted rounded">.npmrc</code> file:
              </p>
              <CodeBlock
                code={`@bitrockteam:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN`}
                language="text"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Install Sonarflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Install Sonarflow globally or as a dev dependency:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Global Installation:</p>
                  <CodeBlock code="npm install -g @bitrockteam/sonarflow" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Local Installation:</p>
                  <CodeBlock code="npm install --save-dev @bitrockteam/sonarflow" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 4: Initialize Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Run the interactive CLI to set up your configuration:
              </p>
              <CodeBlock code="npx @bitrockteam/sonarflow init" />
              <p className="text-sm text-muted-foreground">
                This command will guide you through setting up the required environment variables
                and configuration files.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 5: Configure Environment Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create a <code className="px-1 py-0.5 bg-muted rounded">.env</code> file with the
                required tokens:
              </p>
              <CodeBlock
                code={`# GitHub Token
GITHUB_TOKEN=your_github_token

# Bitbucket Credentials (if using Bitbucket)
BITBUCKET_USERNAME=your_username
BITBUCKET_APP_PASSWORD=your_app_password

# SonarQube Configuration
SONAR_TOKEN=your_sonar_token
SONAR_HOST_URL=https://your-sonarqube-instance.com`}
                language="bash"
              />
              <div className="flex gap-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="font-medium">Required Access Tokens:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>GitHub: Personal access token with repo scope</li>
                    <li>Bitbucket: App password with PR read permissions</li>
                    <li>SonarQube: User token with project analysis permissions</li>
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
                Now you can start using Sonarflow to fetch issues and run scans:
              </p>
              <div className="space-y-3">
                <CodeBlock code="npx @bitrockteam/sonarflow fetch" />
                <CodeBlock code="npx @bitrockteam/sonarflow scan" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
