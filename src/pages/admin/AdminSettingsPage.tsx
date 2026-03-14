import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSettings, useAdminSettingsMutations } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Search, Share2, Palette, AlertTriangle } from "lucide-react";

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettings();
  const { updateSetting } = useAdminSettingsMutations();

  const [seo, setSeo] = useState({ title: "", description: "", keywords: "", og_image: "" });
  const [socials, setSocials] = useState({ twitter: "", github: "", linkedin: "", discord: "", youtube: "" });
  const [branding, setBranding] = useState({ favicon_url: "", logo_url: "", hero_image_url: "" });
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings as Record<string, unknown>;
      if (s.seo) setSeo(s.seo as typeof seo);
      if (s.socials) setSocials(s.socials as typeof socials);
      if (s.branding) setBranding(s.branding as typeof branding);
      if (s.maintenance) setMaintenance(s.maintenance as typeof maintenance);
    }
  }, [data]);

  const save = useCallback((key: string, value: unknown) => {
    updateSetting.mutate({ key, value }, {
      onSuccess: () => toast.success(`${key} settings saved`),
      onError: (e) => toast.error(e.message),
    });
  }, [updateSetting]);

  const handleFileUpload = useCallback(async (field: keyof typeof branding, file: File) => {
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `${field}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const newBranding = { ...branding, [field]: urlData.publicUrl };
      setBranding(newBranding);
      save("branding", newBranding);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }, [branding, save]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage SEO, social links, branding, and maintenance mode.</p>
      </div>

      <Tabs defaultValue="seo">
        <TabsList>
          <TabsTrigger value="seo" className="gap-1.5"><Search className="h-3.5 w-3.5" />SEO</TabsTrigger>
          <TabsTrigger value="socials" className="gap-1.5"><Share2 className="h-3.5 w-3.5" />Socials</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5"><Palette className="h-3.5 w-3.5" />Branding</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Configure default meta tags for public pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Site Title</Label>
                <Input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} placeholder="Nebula Crawl — Web Scraping API" />
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} placeholder="The web scraping API built for developers..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Keywords</Label>
                <Input value={seo.keywords} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} placeholder="web scraping, API, crawling, data extraction" />
              </div>
              <div className="space-y-2">
                <Label>OG Image URL</Label>
                <Input value={seo.og_image} onChange={(e) => setSeo({ ...seo, og_image: e.target.value })} placeholder="https://..." />
              </div>
              <Button onClick={() => save("seo", seo)} disabled={updateSetting.isPending}>
                {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save SEO Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="socials">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>URLs displayed in the footer and elsewhere.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["twitter", "github", "linkedin", "discord", "youtube"] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key === "twitter" ? "Twitter / X" : key}</Label>
                  <Input value={socials[key]} onChange={(e) => setSocials({ ...socials, [key]: e.target.value })} placeholder={`https://${key}.com/...`} />
                </div>
              ))}
              <Button onClick={() => save("socials", socials)} disabled={updateSetting.isPending}>
                {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Social Links
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Assets</CardTitle>
              <CardDescription>Upload favicon, logo, and hero image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(["favicon_url", "logo_url", "hero_image_url"] as const).map((field) => (
                <div key={field} className="space-y-2">
                  <Label className="capitalize">{field.replace(/_/g, " ").replace(" url", "")}</Label>
                  <div className="flex items-center gap-3">
                    {branding[field] && (
                      <img src={branding[field]} alt={field} className="h-10 w-10 rounded border border-border object-contain bg-muted" />
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field, file);
                        }}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          {uploading === field ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                          Upload
                        </span>
                      </Button>
                    </label>
                    <Input
                      value={branding[field]}
                      onChange={(e) => setBranding({ ...branding, [field]: e.target.value })}
                      placeholder="Or paste URL..."
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
              <Button onClick={() => save("branding", branding)} disabled={updateSetting.isPending}>
                {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
              <CardDescription>When enabled, public pages show a maintenance banner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={maintenance.enabled}
                  onCheckedChange={(checked) => setMaintenance({ ...maintenance, enabled: checked })}
                />
                <Label>Maintenance mode {maintenance.enabled ? "enabled" : "disabled"}</Label>
              </div>
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  value={maintenance.message}
                  onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
                  placeholder="We're currently performing scheduled maintenance. We'll be back shortly."
                  rows={3}
                />
              </div>
              <Button onClick={() => save("maintenance", maintenance)} disabled={updateSetting.isPending}>
                {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Maintenance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
