import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lang } from "./snippetGenerator";

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleCopy}>
          {copied ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

interface LanguageSnippetProps {
  snippets: Record<Lang, string>;
  defaultLang?: Lang;
}

const langLabel: Record<Lang, string> = { curl: "cURL", python: "Python", nodejs: "Node.js" };
const langSyntax: Record<Lang, string> = { curl: "bash", python: "python", nodejs: "javascript" };

export function LanguageSnippet({ snippets, defaultLang = "curl" }: LanguageSnippetProps) {
  return (
    <Tabs defaultValue={defaultLang} className="w-full">
      <TabsList className="bg-muted/50 border border-border h-8">
        {(Object.keys(langLabel) as Lang[]).map((l) => (
          <TabsTrigger key={l} value={l} className="text-xs h-6">{langLabel[l]}</TabsTrigger>
        ))}
      </TabsList>
      {(Object.keys(langLabel) as Lang[]).map((l) => (
        <TabsContent key={l} value={l} className="mt-2">
          {l === "python" && (
            <div className="text-[10px] text-muted-foreground mb-2 font-mono bg-muted/30 border border-border rounded px-3 py-1.5 inline-block">
              pip install requests
            </div>
          )}
          <CodeBlock code={snippets[l]} language={langSyntax[l]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
