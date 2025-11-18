import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

const CodeBlock = ({ code, language = "bash", className = "" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Command copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`relative rounded-lg border border-border bg-muted/50 ${className}`}>
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-7 px-2 text-xs">
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="text-sm font-mono">{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
