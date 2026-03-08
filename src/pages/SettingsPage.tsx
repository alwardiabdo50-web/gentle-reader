import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences.
        </p>
      </div>

      {/* Profile */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input defaultValue="John Developer" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input defaultValue="john@example.com" className="mt-1" disabled />
          </div>
        </div>
        <Button size="sm">Save Changes</Button>
      </div>

      <Separator />

      {/* Notifications */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="space-y-3">
          {[
            { label: "Usage alerts", desc: "Get notified when credits run low" },
            { label: "Job failures", desc: "Receive alerts on failed jobs" },
            { label: "Product updates", desc: "Hear about new features" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-3 surface-1">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
        <div className="rounded-lg border border-destructive/30 p-4 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Delete account</div>
              <div className="text-xs text-muted-foreground">Permanently delete your account and all data.</div>
            </div>
            <Button variant="destructive" size="sm">Delete Account</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
