import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Send } from "lucide-react";

const volumeOptions = [
  { value: "under-100k", label: "Under 100k" },
  { value: "100k-500k", label: "100k – 500k" },
  { value: "500k-1m", label: "500k – 1M" },
  { value: "1m-plus", label: "1M+" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", volume: "", message: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error: dbError } = await supabase.from("contact_requests" as any).insert({
      name: form.name.trim().slice(0, 100),
      email: form.email.trim().slice(0, 255),
      company: form.company.trim().slice(0, 100) || null,
      volume: form.volume || null,
      message: form.message.trim().slice(0, 2000) || null,
    } as any);
    setLoading(false);

    if (dbError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground text-center">
          Talk to Sales
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Interested in Scale or Enterprise? Tell us about your needs and we'll get back to you within 24 hours.
        </p>

        {submitted ? (
          <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-10 text-center">
            <CheckCircle className="h-10 w-10 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">We've received your message</h2>
            <p className="text-sm text-muted-foreground">Our team will reach out to <span className="font-medium text-foreground">{form.email}</span> shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-xl border border-border bg-card p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" placeholder="Jane Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email *</Label>
                <Input id="email" type="email" placeholder="jane@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Acme Inc." value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="volume">Expected Monthly Volume</Label>
                <Select value={form.volume} onValueChange={(v) => setForm({ ...form, volume: v })}>
                  <SelectTrigger id="volume"><SelectValue placeholder="Select volume" /></SelectTrigger>
                  <SelectContent>
                    {volumeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Tell us about your use case…" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : <><Send className="h-4 w-4" /> Send Message</>}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
