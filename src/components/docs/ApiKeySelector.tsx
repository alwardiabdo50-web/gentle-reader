import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Key } from "lucide-react";

interface ApiKeySelectorProps {
  value: string;
  onChange: (v: string) => void;
}

const DEFAULT_KEY = "nc_live_your_api_key_here";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
}

export function ApiKeySelector({ value, onChange }: ApiKeySelectorProps) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);

  useEffect(() => {
    supabase
      .from("api_keys")
      .select("id, name, key_prefix")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setKeys(data);
      });
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Key className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-72 h-8 text-xs font-mono">
          <SelectValue placeholder={DEFAULT_KEY} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_KEY} className="text-xs font-mono">
            {DEFAULT_KEY}
          </SelectItem>
          {keys.map((k) => (
            <SelectItem key={k.id} value={`${k.key_prefix}...`} className="text-xs font-mono">
              {k.name} — {k.key_prefix}...
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== DEFAULT_KEY && (
        <span className="text-[10px] text-muted-foreground">Replace with your full API key</span>
      )}
    </div>
  );
}

export { DEFAULT_KEY };
