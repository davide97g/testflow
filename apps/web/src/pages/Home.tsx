import {
  Box,
  FileText,
  Github,
  GitPullRequest,
  Link as LinkIcon,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import CodeBlock from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Home = () => {
  const features = [
    {
      icon: GitPullRequest,
      title: "Jira Issue Extraction",
      description: "Extract Jira issue details, linked resources, and associated PR changes",
    },
    {
      icon: LinkIcon,
      title: "Linked Resources",
      description: "Automatically fetches linked Jira issues and Confluence pages",
    },
    {
      icon: Sparkles,
      title: "AI Editor Integration",
      description: "Seamlessly integrates with Cursor, GitHub Copilot, and Codeium editors",
    },
    {
      icon: FileText,
      title: "Structured Output",
      description: "Get organized data in .testflow/output with JSON and human-readable formats",
    },
    {
      icon: Search,
      title: "Bitbucket Integration",
      description: "Automatically finds and downloads PR changes from Bitbucket repositories",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container relative px-4 py-20 md:py-32 md:px-8">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Framework for Testing and Automation
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Extract Jira Issues and PR Changes with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Integration
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Automate issue extraction, fetch linked resources, and integrate seamlessly with your AI-powered editor
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/get-started">
                <Button size="lg" className="text-base px-8">
                  Get Started
                </Button>
              </Link>
              <a
                href="https://github.com/davide97g/testflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
            </div>

            <div className="mt-12 max-w-xs mx-auto">
              <CodeBlock code="bun add @davide97g/testflow" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to streamline your testing and automation workflow
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-border/50 transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Usage Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Quick Usage</h2>
            <p className="text-lg text-muted-foreground">
              Get started in seconds with simple commands
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Initialize Configuration</h3>
              <p className="text-muted-foreground">
                Set up your testflow configuration with an interactive wizard
              </p>
              <CodeBlock code="testflow init" />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Extract Issue Data</h3>
              <p className="text-muted-foreground">
                Extract Jira issue details, linked resources, and PR changes
              </p>
              <CodeBlock code="testflow extract" />
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Platform Support</h2>
            <p className="text-lg text-muted-foreground">
              Works seamlessly with your favorite platforms
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 text-2xl font-semibold">
              <Box className="h-10 w-10" />
              <span>Jira</span>
            </div>
            <div className="flex items-center gap-3 text-2xl font-semibold">
              <Box className="h-10 w-10" />
              <span>Bitbucket</span>
            </div>
            <div className="flex items-center gap-3 text-2xl font-semibold">
              <FileText className="h-10 w-10" />
              <span>Confluence</span>
            </div>
          </div>
        </div>
      </section>

      {/* Output Structure Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Output Structure</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              All extracted data is organized in a structured format for easy consumption by AI editors
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-border/50">
              <CardContent className="p-6">
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
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Why Developers Love testflow</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Save time, automate issue extraction, and integrate AI-powered insights directly into your
            workflow
          </p>
          <Link to="/get-started">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Start Using testflow
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
