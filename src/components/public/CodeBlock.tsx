import { forwardRef, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(({ code, language = "bash", title }, ref) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={ref} className="rounded-xl border border-border overflow-hidden bg-sidebar">
      {title && (
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-5 overflow-x-auto text-[13px] leading-relaxed">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";
