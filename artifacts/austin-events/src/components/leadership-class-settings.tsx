import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_LEADERSHIP_CLASS_PROFILES,
  type LeadershipClassProfile,
} from "../../../../shared/leadership-class-profiles";

type ImageField = "classPhotoUrl" | "classRepPhotoUrl";

function profileCopy(profiles?: LeadershipClassProfile[] | null): LeadershipClassProfile[] {
  return structuredClone(profiles?.length ? profiles : DEFAULT_LEADERSHIP_CLASS_PROFILES);
}

async function uploadPhoto(file: File): Promise<string> {
  const token = sessionStorage.getItem("admin_token");
  const urlResponse = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const uploadData = await urlResponse.json();
  if (!urlResponse.ok || typeof uploadData.uploadURL !== "string" || typeof uploadData.objectPath !== "string") {
    throw new Error(uploadData.message || "Could not start the image upload.");
  }

  const uploadResponse = await fetch(uploadData.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("The image upload did not complete.");
  return `/api/storage${uploadData.objectPath}`;
}

export function LeadershipClassSettings() {
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState(() => profileCopy(tenant.leadershipClassProfiles));
  const [initialProfiles, setInitialProfiles] = useState(() => profileCopy(tenant.leadershipClassProfiles));
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const next = profileCopy(tenant.leadershipClassProfiles);
    setProfiles(next);
    setInitialProfiles(next);
  }, [tenant.slug, tenant.leadershipClassProfiles]);

  const isDirty = JSON.stringify(profiles) !== JSON.stringify(initialProfiles);
  const updateProfile = (id: string, changes: Partial<LeadershipClassProfile>) => {
    setProfiles((current) => current.map((profile) => profile.id === id ? { ...profile, ...changes } : profile));
  };

  const handlePhotoUpload = async (profileId: string, field: ImageField, file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast({ variant: "destructive", title: "Unsupported image", description: "Choose a JPG, PNG, WEBP, or GIF file." });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Choose an image under 4 MB." });
      return;
    }

    const previewKey = `${profileId}:${field}`;
    const previewUrl = URL.createObjectURL(file);
    setLocalPreviews((current) => {
      const oldUrl = current[previewKey];
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return { ...current, [previewKey]: previewUrl };
    });
    setUploading(previewKey);
    try {
      const imageUrl = await uploadPhoto(file);
      updateProfile(profileId, { [field]: imageUrl });
      toast({ title: "Photo uploaded", description: "Save the class profiles to publish this photo." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(null);
    }
  };

  const addProfile = () => {
    if (profiles.length >= 20) {
      toast({ variant: "destructive", title: "Maximum reached", description: "You can add up to 20 class profiles." });
      return;
    }
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `class-${Date.now()}`;
    setProfiles((current) => [...current, {
      id,
      className: "",
      classRepName: "",
      classRepLinkedInUrl: "",
      teamWhatsAppUrl: "",
      teamLinkedInUrl: "",
      classPhotoUrl: null,
      classRepPhotoUrl: null,
    }]);
  };

  const handleSave = async () => {
    if (profiles.some((profile) => !profile.className.trim() || !profile.classRepName.trim())) {
      toast({ variant: "destructive", title: "Add the class and rep names", description: "Each class needs both names before saving." });
      return;
    }
    if (uploading) return;

    setIsSaving(true);
    try {
      const token = sessionStorage.getItem("admin_token");
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ leadershipClassProfiles: profiles }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ variant: "destructive", title: "Could not save class profiles", description: data.message || "Please check the fields and try again." });
        return;
      }

      const savedProfiles = profileCopy(data.tenant?.leadershipClassProfiles ?? profiles);
      setProfiles(savedProfiles);
      setInitialProfiles(savedProfiles);
      Object.values(localPreviews).forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      setLocalPreviews({});
      await queryClient.invalidateQueries({ queryKey: ["tenant-config", tenant.slug] });
      toast({ title: "Class profiles saved" });
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try saving again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-foreground">Leadership Austin class profiles</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            These details appear below “Hey, all alumni” on the full edition and in the newsletter email.
            Add one profile for each class.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={addProfile} disabled={profiles.length >= 20}>
          <Plus className="mr-2 h-4 w-4" /> Add class
        </Button>
      </div>

      {profiles.map((profile, index) => (
        <fieldset key={profile.id} className="space-y-4 rounded-xl border border-border/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <legend className="px-1 text-sm font-bold text-foreground">Class {index + 1}</legend>
            {profiles.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProfiles((current) => current.filter((item) => item.id !== profile.id))}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Class name
              <Input value={profile.className} maxLength={120} onChange={(event) => updateProfile(profile.id, { className: event.target.value })} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Class rep name
              <Input value={profile.classRepName} maxLength={120} onChange={(event) => updateProfile(profile.id, { classRepName: event.target.value })} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Class rep LinkedIn profile
              <Input type="url" placeholder="https://www.linkedin.com/in/…" value={profile.classRepLinkedInUrl} onChange={(event) => updateProfile(profile.id, { classRepLinkedInUrl: event.target.value })} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Team WhatsApp link
              <Input type="url" placeholder="https://chat.whatsapp.com/…" value={profile.teamWhatsAppUrl} onChange={(event) => updateProfile(profile.id, { teamWhatsAppUrl: event.target.value })} />
            </label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              Team LinkedIn group
              <Input type="url" placeholder="https://www.linkedin.com/groups/…" value={profile.teamLinkedInUrl} onChange={(event) => updateProfile(profile.id, { teamLinkedInUrl: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {([
              ["classPhotoUrl", "Class photo", "Landscape image displayed below the alumni greeting."],
              ["classRepPhotoUrl", "Class rep photo", "Portrait displayed beside the rep's name."],
            ] as const).map(([field, label, hint]) => {
              const previewKey = `${profile.id}:${field}`;
              const imageSrc = localPreviews[previewKey] || profile[field] || null;
              return (
                <div key={field} className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  {imageSrc ? (
                    <div className="relative w-fit max-w-full">
                      <img
                        src={imageSrc}
                        alt={`${profile.className || "Class"} ${label.toLowerCase()} preview`}
                        className={field === "classPhotoUrl"
                          ? "h-28 w-full max-w-sm rounded-lg border border-border object-contain"
                          : "h-20 w-20 rounded-full border-2 border-[#FFBA01] object-cover"}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${label.toLowerCase()}`}
                        onClick={() => {
                          updateProfile(profile.id, { [field]: null });
                          setLocalPreviews((current) => {
                            const next = { ...current };
                            if (next[previewKey]) URL.revokeObjectURL(next[previewKey]);
                            delete next[previewKey];
                            return next;
                          });
                        }}
                        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40">
                    {uploading === previewKey
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ImagePlus className="h-4 w-4" />}
                    {uploading === previewKey ? "Uploading…" : imageSrc ? "Replace photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={!!uploading}
                      onChange={(event) => {
                        void handlePhotoUpload(profile.id, field, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <Button onClick={handleSave} disabled={!isDirty || isSaving || !!uploading} className="gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isSaving ? "Saving…" : "Save class profiles"}
      </Button>
    </section>
  );
}
