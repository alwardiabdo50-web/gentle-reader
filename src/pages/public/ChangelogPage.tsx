import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Category = "feature" | "improvement" | "deprecation" | "fix";

interface ChangelogEntry {
  id: string;
  date: string;
  version: string;
  category: Category;
  title: string;
  description: string;
}

const categoryConfig: Record<Category, { label: string; variant: "success" | "info" | "warning" | "destructive" }> = {
  feature: { label: "Feature", variant: "success" },
  improvement: { label: "Improvement", variant: "info" },
  deprecation: { label: "Deprecation", variant: "warning" },
  fix: { label: "Fix", variant: "destructive" },
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("changelog_entries")
      .select("id, date, version, category, title, description")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setEntries((data as unknown as ChangelogEntry[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Changelog
      </h1>
      <p className="mt-2 text-muted-foreground">
        New features, improvements, and deprecations for the Nebula Crawl API.
      </p>

      <div className="mt-12 space-y-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pl-8 pb-10">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-5 w-72 mb-1" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : (
          entries.map((entry, i) => {
            const cat = categoryConfig[entry.category] ?? categoryConfig.feature;
            return (
              <div key={entry.id} className="relative pl-8 pb-10 last:pb-0">
                {i < entries.length - 1 && (
                  <span className="absolute left-[7px] top-[22px] bottom-0 w-px bg-border" />
                )}
                <span className="absolute left-0 top-[6px] h-[15px] w-[15px] rounded-full border-2 border-primary bg-background" />

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <time>{new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</time>
                  <span className="font-mono text-foreground/70">{entry.version}</span>
                  <Badge variant={cat.variant}>{cat.label}</Badge>
                </div>

                <h2 className="mt-1.5 text-base font-semibold text-foreground leading-snug">
                  {entry.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {entry.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
