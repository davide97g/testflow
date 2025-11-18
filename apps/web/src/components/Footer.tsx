import { Github } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <img
                src="/logo.svg"
                alt="Sonarflow"
                className="h-8 w-8"
                aria-label="Sonarflow logo"
              />
              <span className="text-xl font-bold">Sonarflow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Automate SonarQube Issue Management with AI Integration
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Documentation</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/get-started" className="hover:text-foreground transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/contribute" className="hover:text-foreground transition-colors">
                  Contribute
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/bitrockteam/sonarflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Github className="h-3 w-3" />
                  GitHub
                </a>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  MIT License
                </a>
              </li>
              <li>
                <span className="text-xs">Powered by Node.js & TypeScript</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Sonarflow. Built by BitRock Team.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
