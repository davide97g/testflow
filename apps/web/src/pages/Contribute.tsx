import { Bug, Github, GitPullRequest, Lightbulb } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contribute = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Contribute</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Help make Sonarflow better! We welcome contributions from the community
          </p>
          <div className="mt-8">
            <a
              href="https://github.com/bitrockteam/sonarflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gap-2">
                <Github className="h-5 w-5" />
                View on GitHub
              </Button>
            </a>
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Report Issues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Found a bug or have a suggestion? Open an issue on GitHub:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Check if the issue already exists</li>
                <li>Provide clear reproduction steps</li>
                <li>Include your environment details</li>
                <li>Add relevant logs or screenshots</li>
              </ul>
              <a
                href="https://github.com/bitrockteam/sonarflow/issues/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-2">
                  <Bug className="h-4 w-4" />
                  Open an Issue
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5" />
                Submit Pull Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Ready to contribute code? Follow these steps:</p>
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">1. Fork and Clone</p>
                  <CodeBlock
                    code={`git clone https://github.com/YOUR_USERNAME/sonarflow.git
cd sonarflow`}
                  />
                </div>
                <div>
                  <p className="font-medium mb-2">2. Create a Branch</p>
                  <CodeBlock code="git checkout -b feature/your-feature-name" />
                </div>
                <div>
                  <p className="font-medium mb-2">3. Install Dependencies</p>
                  <CodeBlock code="npm install" />
                </div>
                <div>
                  <p className="font-medium mb-2">4. Make Your Changes</p>
                  <p className="text-sm text-muted-foreground">
                    Write clean, well-documented code following the project's style guide
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-2">5. Test Locally</p>
                  <CodeBlock code="npm test && npx sonarflow" />
                </div>
                <div>
                  <p className="font-medium mb-2">6. Submit Your PR</p>
                  <CodeBlock
                    code={`git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Developer Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Follow the existing code style and conventions</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Write meaningful commit messages (use conventional commits)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Add tests for new features</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Update documentation as needed</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Be respectful and constructive in discussions</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Code of Conduct</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We are committed to providing a welcoming and inclusive environment. Please:
              </p>
              <ul className="space-y-2 text-muted-foreground ml-4">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Be respectful and professional</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Accept constructive criticism gracefully</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Focus on what is best for the community</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Show empathy towards other community members</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardHeader>
              <CardTitle>Local Testing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Test your changes locally before submitting:</p>
              <CodeBlock
                code={`# Install dependencies
npm install

# Run tests
npm test

# Test the CLI
npx sonarflow --help
npx sonarflow init
npx sonarflow fetch
npx sonarflow scan`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contribute;
