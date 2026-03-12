import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PRESETS = [
  { value: "every_hour", label: "Every hour", cron: "0 * * * *" },
  { value: "every_6_hours", label: "Every 6 hours", cron: "0 */6 * * *" },
  { value: "every_12_hours", label: "Every 12 hours", cron: "0 */12 * * *" },
  { value: "daily", label: "Daily (midnight)", cron: "0 0 * * *" },
  { value: "weekly", label: "Weekly (Sunday)", cron: "0 0 * * 0" },
  { value: "monthly", label: "Monthly (1st)", cron: "0 0 1 * *" },
  { value: "custom", label: "Custom cron", cron: "" },
];

export const JOB_TYPES = [
  { value: "scrape", label: "Scrape" },
  { value: "crawl", label: "Crawl" },
  { value: "extract", label: "Extract" },
];

export interface ScheduleFormState {
  name: string;
  description: string;
  jobType: string;
  url: string;
  preset: string;
  customCron: string;
  enableDiff: boolean;
  prompt: string;
  maxPages: string;
  maxDepth: string;
}

export const defaultFormState: ScheduleFormState = {
  name: "",
  description: "",
  jobType: "scrape",
  url: "",
  preset: "daily",
  customCron: "0 0 * * *",
  enableDiff: false,
  prompt: "",
  maxPages: "10",
  maxDepth: "2",
};

interface Props {
  form: ScheduleFormState;
  onChange: (updates: Partial<ScheduleFormState>) => void;
  disableJobType?: boolean;
}

export default function ScheduleFormFields({ form, onChange, disableJobType }: Props) {
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <Label>Name</Label>
        <Input placeholder="My daily scrape" value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input placeholder="Monitor pricing changes" value={form.description} onChange={(e) => onChange({ description: e.target.value })} />
      </div>
      {!disableJobType && (
        <div>
          <Label>Job Type</Label>
          <Select value={form.jobType} onValueChange={(v) => onChange({ jobType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>URL</Label>
        <Input placeholder="https://example.com" value={form.url} onChange={(e) => onChange({ url: e.target.value })} />
      </div>

      {form.jobType === "extract" && (
        <div>
          <Label>Extraction Prompt</Label>
          <Input placeholder="Extract product prices and availability" value={form.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
        </div>
      )}

      {form.jobType === "crawl" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Max Pages</Label>
            <Input type="number" value={form.maxPages} onChange={(e) => onChange({ maxPages: e.target.value })} />
          </div>
          <div>
            <Label>Max Depth</Label>
            <Input type="number" value={form.maxDepth} onChange={(e) => onChange({ maxDepth: e.target.value })} />
          </div>
        </div>
      )}

      <div>
        <Label>Frequency</Label>
        <Select value={form.preset} onValueChange={(v) => onChange({ preset: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.preset === "custom" && (
        <div>
          <Label>Cron Expression</Label>
          <Input
            placeholder="0 9 * * 1-5"
            value={form.customCron}
            onChange={(e) => onChange({ customCron: e.target.value })}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Checkbox
          id="enable-diff"
          checked={form.enableDiff}
          onCheckedChange={(checked) => onChange({ enableDiff: checked === true })}
        />
        <div>
          <Label htmlFor="enable-diff" className="cursor-pointer">Enable change detection</Label>
          <p className="text-xs text-muted-foreground">
            Compare results between runs and flag when content changes.
          </p>
        </div>
      </div>
    </div>
  );
}
