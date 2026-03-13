interface Param {
  name: string;
  type: string;
  default: string;
  desc: string;
}

export function ParamsTable({ params }: { params: Param[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Parameters:</p>
      <div className="rounded-lg border border-border divide-y divide-border text-xs">
        {params.map((p) => (
          <div key={p.name} className="flex items-start px-3 py-2 gap-4">
            <code className="font-mono text-primary shrink-0 w-36">{p.name}</code>
            <span className="text-muted-foreground w-16 shrink-0">{p.type}</span>
            <span className="text-muted-foreground w-20 shrink-0">{p.default}</span>
            <span className="text-foreground">{p.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
