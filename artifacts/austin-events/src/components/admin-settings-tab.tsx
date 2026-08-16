import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/tenant-context";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Palette, Check, Tag, Mail, ImageIcon, Loader2, X, User } from "lucide-react";

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

  const [curatorName, setCuratorName] = useState("");
  const [initialCuratorName, setInitialCuratorName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [initialAdminEmail, setInitialAdminEmail] = useState("");

  // Image uploads (#81) — load from admin settings GET (not public tenant config)
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [brandIconUrl, setBrandIconUrl] = useState<string | null>(null);
  const [initialHeroImageUrl, setInitialHeroImageUrl] = useState<string | null>(null);
  const [initialBrandIconUrl, setInitialBrandIconUrl] = useState<string | null>(null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadEmail() {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await fetch("/api/admin/settings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json() as { tenant?: { curatorName?: string | null; adminEmail?: string | null; heroImageUrl?: string | null; brandIconUrl?: string | null } };
        const email = data.tenant?.adminEmail ?? "";
        const curator = data.tenant?.curatorName ?? "";
        const hero = data.tenant?.heroImageUrl ?? null;
        const icon = data.tenant?.brandIconUrl ?? null;
        if (!cancelled) {
          setCuratorName(curator);
          setInitialCuratorName(curator);
          setAdminEmail(email);
          setInitialAdminEmail(email);
          setHeroImageUrl(hero);
          setInitialHeroImageUrl(hero);
          setBrandIconUrl(icon);
          setInitialBrandIconUrl(icon);
        }
      } catch {
        // non-critical
      }
    }
    loadEmail();
    return () => { cancelled = true; };
  }, []);

  const isDirty =
    name !== tenant.name ||
    accentColor !== tenant.accentColor ||
    curatorName !== initialCuratorName ||
    adminEmail !== initialAdminEmail ||
    heroImageUrl !== initialHeroImageUrl ||
    brandIconUrl !== initialBrandIconUrl ||
    JSON.stringify([...categories].sort()) !== JSON.stringify([...tenant.categories].sort());

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Please choose an image under 3 MB." });
      return;
    }
    setIsUploadingHero(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setHeroImageUrl(dataUrl);
    } catch {
      toast({ variant: "destructive", title: "Failed to read file" });
    } finally {
      setIsUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  }

  async function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Please choose an image under 1 MB." });
      return;
    }
    setIsUploadingIcon(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setBrandIconUrl(dataUrl);
    } catch {
      toast({ variant: "destructive", title: "Failed to read file" });
    } finally {
      setIsUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  }

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
        body: JSON.stringify({
          name: name.trim(),
          accentColor,
          categories,
          ...(curatorName !== initialCuratorName ? { curatorName: curatorName.trim() || null } : {}),
          ...(adminEmail.trim() && adminEmail.trim() !== initialAdminEmail ? { adminEmail: adminEmail.trim() } : {}),
          ...(heroImageUrl !== initialHeroImageUrl ? { heroImageUrl } : {}),
          ...(brandIconUrl !== initialBrandIconUrl ? { brandIconUrl } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Failed to save", description: data.message });
        return;
      }

      // Apply the new accent color immediately
      document.documentElement.style.setProperty("--color-primary", accentColor);

      setInitialCuratorName(curatorName.trim());
      if (adminEmail.trim()) setInitialAdminEmail(adminEmail.trim());

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

      {/* Curator name */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-bold text-lg">Curator name</h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Shown as a byline on the digest page and in emails ("— Name"). Leave blank to hide the attribution.
        </p>
        <Input
          value={curatorName}
          onChange={e => setCuratorName(e.target.value)}
          className="rounded-xl max-w-sm"
          placeholder="e.g. Raj, Bob, Phil…"
        />
      </div>

      {/* Admin email */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-bold text-lg">Admin email</h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Used for admin login and as the default address when sending yourself a draft digest.
        </p>
        <Input
          type="email"
          value={adminEmail}
          onChange={e => setAdminEmail(e.target.value)}
          className="rounded-xl max-w-sm"
          placeholder="you@example.com"
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

      {/* Hero image + brand icon */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-bold text-lg">City images</h3>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Upload a custom hero photo and brand icon for your city page.
        </p>

        {/* Hero image */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">Hero photo</label>
          <p className="text-xs text-muted-foreground">Shown prominently at the top of your city page. Landscape images work best (max 3 MB).</p>
          {heroImageUrl ? (
            <div className="relative w-full max-w-sm">
              <img src={heroImageUrl} alt="Hero preview" className="w-full rounded-xl object-cover aspect-[16/9] border border-border" />
              <button
                onClick={() => setHeroImageUrl(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => heroInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full max-w-sm h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors gap-2"
            >
              {isUploadingHero ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{isUploadingHero ? "Reading file…" : "Click to upload"}</span>
            </div>
          )}
          <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
        </div>

        {/* Brand icon */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">Brand icon</label>
          <p className="text-xs text-muted-foreground">Shown in the nav bar and footer. Square or near-square images work best (max 1 MB).</p>
          {brandIconUrl ? (
            <div className="relative w-24">
              <img src={brandIconUrl} alt="Icon preview" className="w-24 h-24 rounded-xl object-cover border border-border" />
              <button
                onClick={() => setBrandIconUrl(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                title="Remove icon"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => iconInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors gap-1"
            >
              {isUploadingIcon ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{isUploadingIcon ? "Reading…" : "Click to upload"}</span>
            </div>
          )}
          <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
        </div>
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
