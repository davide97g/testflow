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
            <code className="px-1 py-0.5 bg-muted rounded">read:packages</code>{" "}
            scope. Create one at GitHub Settings → Developer settings → Personal
            access tokens.
          </p>
          <CodeBlock
            code={`echo "@davide97g:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc`}
          />
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
            code={`@davide97g:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN`}
            language="text"
          />
        </div>
      ),
    },
    {
      question: "How do I configure Jira integration?",
      answer: (
        <div className="space-y-3">
          <p>
            Jira integration is required. Set up your environment variables:
          </p>
          <CodeBlock
            code={`JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token`}
            language="bash"
          />
          <p>
            Create an API token at Atlassian Account Settings → Security → API
            tokens. You'll also need to configure the Jira base URL during{" "}
            <code className="px-1 py-0.5 bg-muted rounded">testflow init</code>.
          </p>
        </div>
      ),
    },
    {
      question: "How do I configure Bitbucket integration?",
      answer: (
        <div className="space-y-3">
          <p>
            Bitbucket integration is optional. Set up your environment
            variables:
          </p>
          <CodeBlock
            code={`BITBUCKET_EMAIL=your-email@example.com
BITBUCKET_API_TOKEN=your_bitbucket_api_token`}
            language="bash"
          />
          <p>
            Create an app password at Bitbucket Settings → Personal settings →
            App passwords with PR read permissions. Configure workspace and
            repository during{" "}
            <code className="px-1 py-0.5 bg-muted rounded">testflow init</code>.
          </p>
        </div>
      ),
    },
    {
      question: "Where are the extracted files stored?",
      answer: (
        <div className="space-y-3">
          <p>
            All extracted data is stored in the{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              .testflow/output/
            </code>{" "}
            directory:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <code className="px-1 py-0.5 bg-muted rounded">
                .testflow/output/{`{ISSUE-KEY}`}/jira-issue-description.txt
              </code>{" "}
              - Human-readable summary
            </li>
            <li>
              <code className="px-1 py-0.5 bg-muted rounded">
                .testflow/output/{`{ISSUE-KEY}`}/raw/jira-issue.json
              </code>{" "}
              - Full Jira issue data
            </li>
            <li>
              <code className="px-1 py-0.5 bg-muted rounded">
                .testflow/output/{`{ISSUE-KEY}`}/pr.patch
              </code>{" "}
              - PR code changes (if found)
            </li>
            <li>
              <code className="px-1 py-0.5 bg-muted rounded">
                .testflow/output/{`{ISSUE-KEY}`}/confluence/
              </code>{" "}
              - Confluence pages (if found)
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "How do I integrate with my AI editor?",
      answer: (
        <div className="space-y-3">
          <p>
            The{" "}
            <code className="px-1 py-0.5 bg-muted rounded">testflow init</code>{" "}
            command automatically creates editor rule files:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Cursor:</strong> Creates{" "}
              <code className="px-1 py-0.5 bg-muted rounded">.cursorrules</code>{" "}
              file
            </li>
            <li>
              <strong>GitHub Copilot:</strong> Creates{" "}
              <code className="px-1 py-0.5 bg-muted rounded">
                .github/copilot-instructions.md
              </code>{" "}
              file
            </li>
            <li>
              <strong>Codeium:</strong> Creates{" "}
              <code className="px-1 py-0.5 bg-muted rounded">
                .codeium/instructions.md
              </code>{" "}
              file
            </li>
          </ul>
          <p>
            AI editors can then read the extracted data from{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              .testflow/output/
            </code>{" "}
            directories.
          </p>
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
              <strong>Jira:</strong> API token with read permissions for issues
              and projects
            </li>
            <li>
              <strong>Bitbucket:</strong> App password with repository read and
              PR read permissions
            </li>
            <li>
              <strong>Confluence:</strong> API token with read permissions (can
              use same as Jira if same domain)
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "Can I extract a specific Jira issue?",
      answer: (
        <div className="space-y-3">
          <p>Yes! You can extract a specific issue by providing its key:</p>
          <CodeBlock code="testflow extract J-123" />
          <p>
            Or run{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              testflow extract
            </code>{" "}
            without arguments for interactive mode.
          </p>
        </div>
      ),
    },
    {
      question: "Can I extract PR changes without a Jira issue?",
      answer: (
        <div className="space-y-3">
          <p>Yes! You can extract PR changes directly using the PR ID:</p>
          <CodeBlock code="testflow extract:pr 123" />
          <p>
            This will download the PR patch file without requiring a Jira issue.
          </p>
        </div>
      ),
    },
    {
      question: "Can I use this in CI/CD pipelines?",
      answer: (
        <div className="space-y-3">
          <p>Yes! testflow is perfect for CI/CD. Add it to your pipeline:</p>
          <CodeBlock
            code={
              "- name: Extract Jira Issue\n  run: |\n    testflow extract ${{ env.JIRA_ISSUE_KEY }}"
            }
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
          <h1 className="text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about testflow
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
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
            <h3 className="text-xl font-semibold mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? Open an issue on GitHub or
              reach out to the community.
            </p>
            <a
              href="https://github.com/davide97g/testflow/issues"
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
