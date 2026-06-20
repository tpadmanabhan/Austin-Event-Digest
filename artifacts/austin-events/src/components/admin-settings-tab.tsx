import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/tenant-context";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Palette, Check, Tag } from "lucide-react";

const ALL_CATEGORIES = [
  { name: "Tech",     emoji: "💻", description: "Startup meetups, AI demos, developer nights." },
  { name: "Music",    emoji: "🎵", description: "Live concerts, open mics, music festivals." },
  { name: "Food",     emoji: "🍔", description: "Food pop-ups, restaurant openings, tastings." },
  { name: "Wellness", emoji: "🧘", description: "Yoga, meditation, hiking, outdoor fitness." },
  { name: "Civics",   emoji: "🏛️", description: "City council, neighborhood events, volunteering." },
];

export function AdminSettingsTab() {
  const { toast } = useToast();
  const tenant = useTenant();
  const queryClient = useQueryClient();

  const [name, setName] = useState(tenant.name);
  const [accentColor, setAccentColor] = useState(tenant.accentColor);
  const [categories, setCategories] = useState<string[]>(tenant.categories);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty =
    name !== tenant.name ||
    accentColor !== tenant.accentColor ||
    JSON.stringify([...categories].sort()) !== JSON.stringify([...tenant.categories].sort());

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async function handleSave() {
    if (categories.length === 0) {
      toast({ variant: "destructive", title: "Select at least one category" });
      return;
    }
    if (name.trim().length < 2) {
      toast({ variant: "destructive", title: "Display name must be at least 2 characters" });
      return;
    }

    setIsSaving(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), accentColor, categories }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Failed to save", description: data.message });
        return;
      }

      // Apply the new accent color immediately
      document.documentElement.style.setProperty("--color-primary", accentColor);

      // Invalidate tenant config so the rest of the app picks up the changes
      await queryClient.invalidateQueries({ queryKey: ["tenant-config", tenant.slug] });
      toast({ title: "Settings saved!" });
    } catch {
      toast({ variant: "destructive", title: "Network error — please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Display name */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="font-serif font-bold text-lg">Newsletter name</h3>
        <p className="text-sm text-muted-foreground -mt-2">
          This appears in the page title, nav, and emails.
        </p>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          className="rounded-xl max-w-sm"
          placeholder="Austin Events"
        />
      </div>

      {/* Accent color */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-bold text-lg">Accent color</h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Used for buttons, links, and highlights across your newsletter.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={accentColor}
            onChange={e => setAccentColor(e.target.value)}
            className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer p-1 bg-card"
          />
          <div className="space-y-1">
            <code className="text-sm font-mono text-foreground">{accentColor}</code>
            <div
              className="w-32 h-6 rounded-lg border border-border"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-bold text-lg">Event categories</h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          We'll discover and filter events matching these categories.
        </p>
        <div className="space-y-2">
          {ALL_CATEGORIES.map(cat => {
            const checked = categories.includes(cat.name);
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => toggleCategory(cat.name)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80 hover:bg-muted/30"
                }`}
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                }`}>
                  {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>{cat.emoji}</span>
                    <span className="font-semibold text-foreground text-sm">{cat.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        {categories.length === 0 && (
          <p className="text-xs text-destructive">Select at least one category.</p>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving || !isDirty || categories.length === 0}
        className="rounded-xl gap-2 h-11 px-6"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
