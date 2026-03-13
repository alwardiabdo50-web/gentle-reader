const BASE = "https://moeegphrlhtuovqtgrci.supabase.co/functions/v1";

export type Lang = "curl" | "python" | "nodejs";

interface SnippetDef {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  description?: string;
}

export function generateSnippet(def: SnippetDef, lang: Lang, apiKey: string): string {
  const url = `${BASE}${def.path}`;
  const bodyStr = def.body ? JSON.stringify(def.body, null, 2) : null;

  if (lang === "curl") {
    const lines = [`curl -X ${def.method} ${url} \\`];
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -H "X-API-Key: ${apiKey}"`);
    if (bodyStr) {
      // remove last line's lack of backslash, add it
      lines[lines.length - 1] += " \\";
      lines.push(`  -d '${bodyStr}'`);
    }
    return lines.join("\n");
  }

  if (lang === "python") {
    const lines = ["import requests", ""];
    lines.push(`url = "${url}"`);
    lines.push(`headers = {`);
    lines.push(`    "Content-Type": "application/json",`);
    lines.push(`    "X-API-Key": "${apiKey}"`);
    lines.push(`}`);
    if (def.method === "GET") {
      lines.push("", `response = requests.get(url, headers=headers)`);
    } else {
      lines.push("", `payload = ${bodyStr ?? "{}"}`);
      lines.push("", `response = requests.post(url, json=payload, headers=headers)`);
    }
    lines.push(`print(response.json())`);
    return lines.join("\n");
  }

  // nodejs
  const lines = [];
  if (def.method === "GET") {
    lines.push(`const response = await fetch("${url}", {`);
    lines.push(`  headers: {`);
    lines.push(`    "X-API-Key": "${apiKey}"`);
    lines.push(`  }`);
    lines.push(`});`);
  } else {
    lines.push(`const response = await fetch("${url}", {`);
    lines.push(`  method: "POST",`);
    lines.push(`  headers: {`);
    lines.push(`    "Content-Type": "application/json",`);
    lines.push(`    "X-API-Key": "${apiKey}"`);
    lines.push(`  },`);
    lines.push(`  body: JSON.stringify(${bodyStr ?? "{}"})`);
    lines.push(`});`);
  }
  lines.push("", `const data = await response.json();`);
  lines.push(`console.log(data);`);
  return lines.join("\n");
}
