import CodeBlock from "@/components/CodeBlock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

const FAQ = () => {
  const faqs = [
    {
      question: "How do I authenticate with GitHub Packages?",
      answer: (
        <div className="space-y-3">
          <p>
            You need a GitHub personal access token with the{" "}
            <code className="px-1 py-0.5 bg-muted rounded">read:packages</code> scope. Create one at
            GitHub Settings → Developer settings → Personal access tokens.
          </p>
          <CodeBlock code="npm login --registry=https://npm.pkg.github.com --scope=@bitrockteam" />
        </div>
      ),
    },
    {
      question: "Why am I getting authentication errors?",
      answer: (
        <div className="space-y-3">
          <p>Common causes:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Missing or expired GitHub token</li>
            <li>Incorrect .npmrc configuration</li>
            <li>Token doesn't have required permissions</li>
          </ul>
          <p>Verify your .npmrc file contains:</p>
          <CodeBlock
            code={`@bitrockteam:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN`}
            language="text"
          />
        </div>
      ),
    },
    {
      question: "How do I configure Bitbucket integration?",
      answer: (
        <div className="space-y-3">
          <p>Set up your environment variables with Bitbucket credentials:</p>
          <CodeBlock
            code={`BITBUCKET_USERNAME=your_username
BITBUCKET_APP_PASSWORD=your_app_password`}
            language="bash"
          />
          <p>
            Create an app password at Bitbucket Settings → Personal settings → App passwords with PR
            read permissions.
          </p>
        </div>
      ),
    },
    {
      question: "What SonarQube versions are supported?",
      answer: (
        <div className="space-y-3">
          <p>
            Sonarflow works with SonarQube 7.9+ and SonarCloud. Both Community and Enterprise
            editions are supported.
          </p>
        </div>
      ),
    },
    {
      question: "Can I run scans without a SonarQube server?",
      answer: (
        <div className="space-y-3">
          <p>
            Yes! The <code className="px-1 py-0.5 bg-muted rounded">scan</code> command runs
            SonarScanner locally without requiring a SonarQube server instance.
          </p>
          <CodeBlock code="npx @bitrockteam/sonarflow scan" />
        </div>
      ),
    },
    {
      question: "Where are the issue reports stored?",
      answer: (
        <div className="space-y-3">
          <p>
            Reports are stored in the <code className="px-1 py-0.5 bg-muted rounded">.sonar</code>{" "}
            directory:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <code className="px-1 py-0.5 bg-muted rounded">.sonar/issues.json</code> - Fetched PR
              issues
            </li>
            <li>
              <code className="px-1 py-0.5 bg-muted rounded">.sonar/scanner-report.json</code> -
              Local scan results
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "How do I integrate with my AI editor?",
      answer: (
        <div className="space-y-3">
          <p>Sonarflow automatically generates JSON reports that AI editors can read:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Cursor:</strong> Configure settings to read{" "}
              <code className="px-1 py-0.5 bg-muted rounded">.sonar/issues.json</code>
            </li>
            <li>
              <strong>VSCode:</strong> Install the Sonarflow extension
            </li>
            <li>
              <strong>Windsurf:</strong> Automatically detects{" "}
              <code className="px-1 py-0.5 bg-muted rounded">.sonar</code> directories
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "What if my command fails with permission errors?",
      answer: (
        <div className="space-y-3">
          <p>Check your access tokens have the correct permissions:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>GitHub:</strong> <code className="px-1 py-0.5 bg-muted rounded">repo</code>{" "}
              and <code className="px-1 py-0.5 bg-muted rounded">read:packages</code>
            </li>
            <li>
              <strong>Bitbucket:</strong> PR read permissions
            </li>
            <li>
              <strong>SonarQube:</strong> Project analysis permissions
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "How do I update to the latest version?",
      answer: (
        <div className="space-y-3">
          <p>Use the update command to check and install the latest version:</p>
          <CodeBlock code="npx @bitrockteam/sonarflow update" />
          <p>Or reinstall manually:</p>
          <CodeBlock code="npm install -g @bitrockteam/sonarflow@latest" />
        </div>
      ),
    },
    {
      question: "Can I use this in CI/CD pipelines?",
      answer: (
        <div className="space-y-3">
          <p>Yes! Sonarflow is perfect for CI/CD. Add it to your pipeline:</p>
          <CodeBlock
            code={`- name: Run Sonarflow
  run: |
    npx @bitrockteam/sonarflow fetch
    npx @bitrockteam/sonarflow scan`}
            language="yaml"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about Sonarflow
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? Open an issue on GitHub or reach out to the
              community.
            </p>
            <a
              href="https://github.com/bitrockteam/sonarflow/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Ask on GitHub →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
