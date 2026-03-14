import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hslStringToHex, hexToHslString, hasAlpha, parseHslAlpha, combineHslAlpha } from "@/lib/color-utils";

interface ThemeColorInputProps {
  label: string;
  cssVar: string;
  value: string;
  onChange: (cssVar: string, value: string) => void;
}

export function ThemeColorInput({ label, cssVar, value, onChange }: ThemeColorInputProps) {
  const { base, alpha } = parseHslAlpha(value);
  const isAlpha = hasAlpha(value);
  const hexColor = hslStringToHex(base);

  return (
    <div className="flex items-center gap-3 group">
      <div className="relative">
        <div
          className="h-8 w-8 rounded-md border border-border-strong cursor-pointer overflow-hidden shrink-0"
          style={{ backgroundColor: isAlpha ? `hsl(${value})` : `hsl(${base})` }}
        >
          <input
            type="color"
            value={hexColor}
            onChange={(e) => {
              const newHsl = hexToHslString(e.target.value);
              onChange(cssVar, alpha ? combineHslAlpha(newHsl, alpha) : newHsl);
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-normal mb-0.5 block truncate">
          {label}
        </Label>
        <Input
          value={value}
          onChange={(e) => onChange(cssVar, e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="174 72% 50%"
        />
      </div>
    </div>
  );
}
