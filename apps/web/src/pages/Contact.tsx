import { ExternalLink, Github, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contact = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="container px-4 md:px-8 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with the Sonarflow community and the BitRock team
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Report bugs, request features, or contribute to the project on GitHub.
              </p>
              <a
                href="https://github.com/bitrockteam/sonarflow"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Visit Repository
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                GitHub Discussions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Join the community discussions, ask questions, and share your experiences.
              </p>
              <a
                href="https://github.com/bitrockteam/sonarflow/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Join Discussions
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For business inquiries or direct support, reach out via email.
              </p>
              <a href="mailto:support@bitrock.it">
                <Button className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                BitRock Website
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Learn more about BitRock and our other open source projects.
              </p>
              <a href="https://www.bitrock.it" target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Visit BitRock
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle>Community Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Be respectful and constructive in all communications</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Search existing issues before creating new ones</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Provide detailed information when reporting bugs</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Help others in the community when you can</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Project Information</h2>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">License</div>
                <div className="font-semibold">MIT</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">Built With</div>
                <div className="font-semibold">Node.js & TypeScript</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground mb-1">Maintained By</div>
                <div className="font-semibold">BitRock Team</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
