import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAdminSettings, useAdminSettingsMutations } from "@/hooks/useAdminData";
import { toast } from "sonner";
import { Loader2, ChevronDown, RotateCcw, Download, Upload, Sun, Moon } from "lucide-react";
import { ThemeColorInput } from "./ThemeColorInput";

const COLOR_GROUPS = {
  "Core": {
    "background": "Background",
    "foreground": "Foreground",
    "card": "Card",
    "card-foreground": "Card Foreground",
    "card-hover": "Card Hover",
  },
  "Brand": {
    "primary": "Primary",
    "primary-foreground": "Primary Foreground",
    "ring": "Ring / Focus",
  },
  "Semantic": {
    "destructive": "Destructive",
    "destructive-foreground": "Destructive Foreground",
    "success": "Success",
    "warning": "Warning",
    "info": "Info",
    "muted": "Muted",
    "muted-foreground": "Muted Foreground",
  },
  "Surfaces": {
    "secondary": "Secondary",
    "secondary-foreground": "Secondary Foreground",
    "accent": "Accent",
    "accent-foreground": "Accent Foreground",
    "popover": "Popover",
    "popover-foreground": "Popover Foreground",
  },
  "Borders": {
    "border": "Border",
    "border-strong": "Border Strong",
    "input": "Input Border",
  },
  "Sidebar": {
    "sidebar-background": "Background",
    "sidebar-foreground": "Foreground",
    "sidebar-primary": "Primary",
    "sidebar-primary-foreground": "Primary Foreground",
    "sidebar-accent": "Accent",
    "sidebar-accent-foreground": "Accent Foreground",
    "sidebar-border": "Border",
    "sidebar-ring": "Ring",
  },
} as const;

const LIGHT_DEFAULTS: Record<string, string> = {
  "background": "40 6% 97%",
  "foreground": "240 6% 10%",
  "card": "0 0% 100%",
  "card-foreground": "240 6% 10%",
  "card-hover": "240 5% 96%",
  "primary": "174 72% 50%",
  "primary-foreground": "240 6% 4%",
  "ring": "174 72% 50%",
  "destructive": "0 84% 60%",
  "destructive-foreground": "0 0% 100%",
  "success": "160 84% 39%",
  "warning": "38 92% 50%",
  "info": "217 91% 60%",
  "muted": "240 5% 96%",
  "muted-foreground": "240 4% 46%",
  "secondary": "240 5% 96%",
  "secondary-foreground": "240 6% 10%",
  "accent": "240 5% 93%",
  "accent-foreground": "240 6% 10%",
  "popover": "0 0% 100%",
  "popover-foreground": "240 6% 10%",
  "border": "0 0% 0% / 0.08",
  "border-strong": "0 0% 0% / 0.13",
  "input": "0 0% 0% / 0.13",
  "sidebar-background": "240 5% 96%",
  "sidebar-foreground": "240 4% 46%",
  "sidebar-primary": "174 72% 50%",
  "sidebar-primary-foreground": "240 6% 4%",
  "sidebar-accent": "174 72% 50% / 0.12",
  "sidebar-accent-foreground": "174 62% 38%",
  "sidebar-border": "0 0% 0% / 0.08",
  "sidebar-ring": "174 72% 50%",
};

const DARK_DEFAULTS: Record<string, string> = {
  "background": "240 6% 4%",
  "foreground": "40 14% 97%",
  "card": "240 6% 11%",
  "card-foreground": "40 14% 97%",
  "card-hover": "240 6% 15%",
  "primary": "174 72% 50%",
  "primary-foreground": "240 6% 4%",
  "ring": "174 72% 50%",
  "destructive": "0 84% 60%",
  "destructive-foreground": "40 14% 97%",
  "success": "160 84% 39%",
  "warning": "38 92% 50%",
  "info": "217 91% 60%",
  "muted": "240 6% 10%",
  "muted-foreground": "240 5% 55%",
  "secondary": "240 6% 10%",
  "secondary-foreground": "40 14% 97%",
  "accent": "240 6% 15%",
  "accent-foreground": "40 14% 97%",
  "popover": "240 6% 10%",
  "popover-foreground": "40 14% 97%",
  "border": "0 0% 100% / 0.10",
  "border-strong": "0 0% 100% / 0.16",
  "input": "0 0% 100% / 0.16",
  "sidebar-background": "240 8% 7%",
  "sidebar-foreground": "240 5% 65%",
  "sidebar-primary": "174 72% 50%",
  "sidebar-primary-foreground": "240 6% 4%",
  "sidebar-accent": "174 72% 50% / 0.12",
  "sidebar-accent-foreground": "174 72% 50%",
  "sidebar-border": "0 0% 100% / 0.10",
  "sidebar-ring": "174 72% 50%",
};

type ThemePalette = { light: Record<string, string>; dark: Record<string, string> };

export default function ThemePaletteEditor() {
  const { data } = useAdminSettings();
  const { updateSetting } = useAdminSettingsMutations();

  const [palette, setPalette] = useState<ThemePalette>({
    light: { ...LIGHT_DEFAULTS },
    dark: { ...DARK_DEFAULTS },
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Core: true, Brand: true });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings as Record<string, unknown>;
      if (s.theme) {
        const t = s.theme as ThemePalette;
        setPalette({
          light: { ...LIGHT_DEFAULTS, ...(t.light || {}) },
          dark: { ...DARK_DEFAULTS, ...(t.dark || {}) },
        });
      }
    }
  }, [data]);

  const handleChange = useCallback((mode: "light" | "dark", cssVar: string, value: string) => {
    setPalette((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [cssVar]: value },
    }));
  }, []);

  const save = useCallback(() => {
    updateSetting.mutate(
      { key: "theme", value: palette },
      {
        onSuccess: () => toast.success("Theme palette saved"),
        onError: (e) => toast.error(e.message),
      }
    );
  }, [updateSetting, palette]);

  const resetMode = useCallback((mode: "light" | "dark") => {
    setPalette((prev) => ({
      ...prev,
      [mode]: mode === "light" ? { ...LIGHT_DEFAULTS } : { ...DARK_DEFAULTS },
    }));
    toast.info(`${mode === "light" ? "Light" : "Dark"} palette reset to defaults`);
  }, []);

  const exportPalette = useCallback(() => {
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "theme-palette.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [palette]);

  const importPalette = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as ThemePalette;
        if (parsed.light && parsed.dark) {
          setPalette({
            light: { ...LIGHT_DEFAULTS, ...parsed.light },
            dark: { ...DARK_DEFAULTS, ...parsed.dark },
          });
          toast.success("Palette imported");
        } else {
          toast.error("Invalid palette format — needs light & dark keys");
        }
      } catch {
        toast.error("Failed to parse JSON file");
      }
    };
    input.click();
  }, []);

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const renderPalette = (mode: "light" | "dark") => (
    <div className="space-y-3">
      {Object.entries(COLOR_GROUPS).map(([groupName, vars]) => (
        <Collapsible key={groupName} open={openGroups[groupName] ?? false} onOpenChange={() => toggleGroup(groupName)}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-foreground">
            <span>{groupName}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openGroups[groupName] ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 pb-3 px-1">
              {Object.entries(vars).map(([cssVar, label]) => (
                <ThemeColorInput
                  key={cssVar}
                  label={label}
                  cssVar={cssVar}
                  value={palette[mode][cssVar] || ""}
                  onChange={(v, val) => handleChange(mode, v, val)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Manage CSS color variables for light and dark modes. Changes apply globally.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={importPalette}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportPalette}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dark">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="light" className="gap-1.5"><Sun className="h-3.5 w-3.5" />Light</TabsTrigger>
              <TabsTrigger value="dark" className="gap-1.5"><Moon className="h-3.5 w-3.5" />Dark</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="light">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Edit the light mode palette</p>
              <Button variant="ghost" size="sm" onClick={() => resetMode("light")} className="text-xs gap-1.5">
                <RotateCcw className="h-3 w-3" />Reset to defaults
              </Button>
            </div>
            {renderPalette("light")}
          </TabsContent>

          <TabsContent value="dark">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Edit the dark mode palette</p>
              <Button variant="ghost" size="sm" onClick={() => resetMode("dark")} className="text-xs gap-1.5">
                <RotateCcw className="h-3 w-3" />Reset to defaults
              </Button>
            </div>
            {renderPalette("dark")}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-border">
          <Button onClick={save} disabled={updateSetting.isPending}>
            {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Theme Palette
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
