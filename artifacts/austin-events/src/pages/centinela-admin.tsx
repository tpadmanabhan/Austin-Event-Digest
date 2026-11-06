import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListCentinelaResidentsQueryKey, getListCentinelaUpdatesQueryKey, getListCentinelaActivitiesQueryKey,
  useListCentinelaResidents, useListCentinelaUpdates, useListCentinelaActivities,
  useAddCentinelaResident, useRemoveCentinelaResident, useCreateCentinelaUpdate,
  useUpdateCentinelaUpdate, useDeleteCentinelaUpdate, useCreateCentinelaActivity,
  useUpdateCentinelaActivity, useDeleteCentinelaActivity,
} from "@workspace/api-client-react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import "./centinela.css";

type UpdateDraft = { title: string; body: string; category: string; pinned: boolean };
type ActivityDraft = { title: string; description: string; location: string; timingLabel: string };
const emptyUpdate: UpdateDraft = { title: "", body: "", category: "Community", pinned: false };
const emptyActivity: ActivityDraft = { title: "", description: "", location: "", timingLabel: "" };
const adminRequest = (): { headers: Record<string, string> } => {
  const token = typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem("admin_token") ?? "";
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
};
const friendlyError = "We couldn’t save this change. Check your admin session and try again.";

export default function CentinelaAdmin() {
  const queryClient = useQueryClient();
  const request = useMemo(() => adminRequest(), []);
  const residentsQuery = useListCentinelaResidents({ query: { queryKey: getListCentinelaResidentsQueryKey() }, request });
  const updatesQuery = useListCentinelaUpdates({ query: { queryKey: getListCentinelaUpdatesQueryKey() }, request });
  const activitiesQuery = useListCentinelaActivities({ query: { queryKey: getListCentinelaActivitiesQueryKey() }, request });
  const addResident = useAddCentinelaResident({ request });
  const removeResident = useRemoveCentinelaResident({ request });
  const createUpdate = useCreateCentinelaUpdate({ request });
  const updateUpdate = useUpdateCentinelaUpdate({ request });
  const deleteUpdate = useDeleteCentinelaUpdate({ request });
  const createActivity = useCreateCentinelaActivity({ request });
  const updateActivity = useUpdateCentinelaActivity({ request });
  const deleteActivity = useDeleteCentinelaActivity({ request });

  const [email, setEmail] = useState("");
  const [updateDraft, setUpdateDraft] = useState<UpdateDraft>(emptyUpdate);
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(emptyActivity);
  const [editingUpdate, setEditingUpdate] = useState<number | null>(null);
  const [editingActivity, setEditingActivity] = useState<number | null>(null);
  const [updateEdit, setUpdateEdit] = useState<UpdateDraft>(emptyUpdate);
  const [activityEdit, setActivityEdit] = useState<ActivityDraft>(emptyActivity);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: getListCentinelaResidentsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListCentinelaUpdatesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListCentinelaActivitiesQueryKey() });
  };
  const handleError = () => { setError(friendlyError); setMessage(""); };
  const handleSuccess = (text: string) => { refreshAll(); setMessage(text); setError(""); };
  const busy = addResident.isPending || removeResident.isPending || createUpdate.isPending || updateUpdate.isPending || deleteUpdate.isPending || createActivity.isPending || updateActivity.isPending || deleteActivity.isPending;

  const submitResident = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    addResident.mutate({ data: { email: email.trim() } }, {
      onSuccess: () => { setEmail(""); handleSuccess("Resident access added."); }, onError: handleError,
    });
  };
  const submitUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!updateDraft.title.trim() || !updateDraft.body.trim()) return;
    createUpdate.mutate({ data: { ...updateDraft, title: updateDraft.title.trim(), body: updateDraft.body.trim(), category: updateDraft.category.trim() || "Community" } }, {
      onSuccess: () => { setUpdateDraft(emptyUpdate); handleSuccess("Community note published."); }, onError: handleError,
    });
  };
  const submitActivity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityDraft.title.trim() || !activityDraft.timingLabel.trim()) return;
    createActivity.mutate({ data: { ...activityDraft, title: activityDraft.title.trim(), description: activityDraft.description.trim(), location: activityDraft.location.trim(), timingLabel: activityDraft.timingLabel.trim() } }, {
      onSuccess: () => { setActivityDraft(emptyActivity); handleSuccess("Neighbor proposal added."); }, onError: handleError,
    });
  };

  return <main className="centinela"><div className="cv-container cv-admin">
    <header className="cv-admin-header"><div><div className="cv-eyebrow">Centinela Ocean View</div><h1>Community desk</h1></div><span className="cv-tag">Tenant admin</span></header>
    <p className="cv-section-intro">Keep neighbors informed, manage resident access, and share ideas for gathering. Proposals remain proposals unless separately confirmed.</p>
    {message && <div className="cv-success" role="status" data-testid="status-admin-success">{message}</div>}
    {error && <div className="cv-error" role="alert" data-testid="error-admin-action">{error}</div>}
    {busy && <div className="cv-loading" role="status" data-testid="status-admin-saving">Saving your community change…</div>}
    <div className="cv-admin-grid">
      <section className="cv-admin-panel" aria-labelledby="admin-residents-heading">
        <h2 id="admin-residents-heading">Resident access</h2>
        <form className="cv-form" onSubmit={submitResident}>
          <label className="cv-visually-muted" htmlFor="cv-resident-email">Resident email</label>
          <div className="cv-form-row"><input id="cv-resident-email" className="cv-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="neighbor@example.com" data-testid="input-admin-resident-email" /><button className="cv-button" type="submit" disabled={addResident.isPending} data-testid="button-add-resident"><Plus size={15} /> Add resident</button></div>
        </form>
        {residentsQuery.isLoading ? <div className="cv-skeleton" data-testid="loading-admin-residents" /> : residentsQuery.isError ? <div className="cv-error" role="alert" data-testid="error-admin-residents">Resident list unavailable. <button onClick={() => residentsQuery.refetch()} data-testid="button-retry-admin-residents">Retry</button></div> :
          (residentsQuery.data?.residents ?? []).length === 0 ? <div className="cv-empty" data-testid="empty-admin-residents">No residents have been added yet.</div> :
          residentsQuery.data?.residents.map(resident => <div className="cv-admin-row" key={resident.id} data-testid={`row-admin-resident-${resident.id}`}><div><strong>{resident.email}</strong><p>Access added {new Date(resident.createdAt).toLocaleDateString()}</p></div>
            <div className="cv-admin-actions">{confirmRemove === resident.id ? <><button className="cv-icon-button cv-icon-button--danger" aria-label={`Confirm remove ${resident.email}`} onClick={() => removeResident.mutate({ residentId: resident.id }, { onSuccess: () => { setConfirmRemove(null); handleSuccess("Resident access removed."); }, onError: handleError })} data-testid={`button-confirm-remove-resident-${resident.id}`}><Check size={15} /></button><button className="cv-icon-button" aria-label="Cancel removal" onClick={() => setConfirmRemove(null)} data-testid={`button-cancel-remove-resident-${resident.id}`}><X size={15} /></button></> : <button className="cv-icon-button cv-icon-button--danger" aria-label={`Remove resident ${resident.email}`} onClick={() => setConfirmRemove(resident.id)} data-testid={`button-remove-resident-${resident.id}`}><Trash2 size={15} /></button>}</div>
          </div>)}
      </section>
      <section className="cv-admin-panel" aria-labelledby="admin-updates-heading">
        <h2 id="admin-updates-heading">Community notes</h2>
        <form className="cv-form" onSubmit={submitUpdate}>
          <input className="cv-input" required maxLength={160} aria-label="Note title" placeholder="A clear, neighborly headline" value={updateDraft.title} onChange={e => setUpdateDraft({ ...updateDraft, title: e.target.value })} data-testid="input-admin-update-title" />
          <textarea className="cv-textarea" required maxLength={6000} aria-label="Note details" placeholder="What should residents know?" value={updateDraft.body} onChange={e => setUpdateDraft({ ...updateDraft, body: e.target.value })} data-testid="input-admin-update-body" />
          <div className="cv-form-row"><input className="cv-input" maxLength={60} aria-label="Category" value={updateDraft.category} onChange={e => setUpdateDraft({ ...updateDraft, category: e.target.value })} data-testid="input-admin-update-category" /><label className="cv-checkbox"><input type="checkbox" checked={updateDraft.pinned} onChange={e => setUpdateDraft({ ...updateDraft, pinned: e.target.checked })} data-testid="input-admin-update-pinned" /> Pin this note</label></div>
          <button className="cv-button" type="submit" disabled={createUpdate.isPending} data-testid="button-publish-update"><Plus size={15} /> Publish note</button>
        </form>
        {updatesQuery.isLoading ? <div className="cv-skeleton" data-testid="loading-admin-updates" /> : updatesQuery.isError ? <div className="cv-error" role="alert" data-testid="error-admin-updates">Community notes unavailable. <button onClick={() => updatesQuery.refetch()} data-testid="button-retry-admin-updates">Retry</button></div> :
          (updatesQuery.data?.updates ?? []).length === 0 ? <div className="cv-empty" data-testid="empty-admin-updates">No community notes have been published.</div> :
          updatesQuery.data?.updates.map(item => <div className="cv-admin-row" key={item.id} data-testid={`row-admin-update-${item.id}`}>
            {editingUpdate === item.id ? <form className="cv-form" onSubmit={e => { e.preventDefault(); updateUpdate.mutate({ updateId: item.id, data: updateEdit }, { onSuccess: () => { setEditingUpdate(null); handleSuccess("Community note updated."); }, onError: handleError }); }}>
              <input className="cv-input" aria-label="Edit note title" value={updateEdit.title} onChange={e => setUpdateEdit({ ...updateEdit, title: e.target.value })} data-testid={`input-edit-update-title-${item.id}`} />
              <textarea className="cv-textarea" aria-label="Edit note body" value={updateEdit.body} onChange={e => setUpdateEdit({ ...updateEdit, body: e.target.value })} data-testid={`input-edit-update-body-${item.id}`} />
              <input className="cv-input" aria-label="Edit note category" value={updateEdit.category} onChange={e => setUpdateEdit({ ...updateEdit, category: e.target.value })} data-testid={`input-edit-update-category-${item.id}`} />
              <label className="cv-checkbox"><input type="checkbox" checked={updateEdit.pinned} onChange={e => setUpdateEdit({ ...updateEdit, pinned: e.target.checked })} data-testid={`input-edit-update-pinned-${item.id}`} /> Pin this note</label>
              <div className="cv-admin-actions"><button className="cv-icon-button" aria-label="Save update" type="submit" data-testid={`button-save-update-${item.id}`}><Check size={15} /></button><button className="cv-icon-button" type="button" aria-label="Cancel edit" onClick={() => setEditingUpdate(null)} data-testid={`button-cancel-edit-update-${item.id}`}><X size={15} /></button></div>
            </form> : <><div><strong>{item.title}</strong><p>{item.category}{item.pinned ? " · Pinned" : ""}</p></div><div className="cv-admin-actions"><button className="cv-icon-button" aria-label={`Edit ${item.title}`} onClick={() => { setEditingUpdate(item.id); setUpdateEdit({ title: item.title, body: item.body, category: item.category, pinned: item.pinned }); }} data-testid={`button-edit-update-${item.id}`}><Pencil size={14} /></button><button className="cv-icon-button cv-icon-button--danger" aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm(`Delete “${item.title}”?`)) deleteUpdate.mutate({ updateId: item.id }, { onSuccess: () => handleSuccess("Community note deleted."), onError: handleError }); }} data-testid={`button-delete-update-${item.id}`}><Trash2 size={14} /></button></div></>}
          </div>)}
      </section>
      <section className="cv-admin-panel" aria-labelledby="admin-activities-heading">
        <h2 id="admin-activities-heading">Neighbor proposals</h2>
        <p className="cv-visually-muted">Activities created here appear as resident proposals. Do not describe them as approved unless approval is confirmed through the appropriate community process.</p>
        <form className="cv-form" onSubmit={submitActivity}>
          <input className="cv-input" required maxLength={160} aria-label="Proposal title" placeholder="What could neighbors do together?" value={activityDraft.title} onChange={e => setActivityDraft({ ...activityDraft, title: e.target.value })} data-testid="input-admin-activity-title" />
          <textarea className="cv-textarea" maxLength={2000} aria-label="Proposal description" placeholder="A little more about the idea…" value={activityDraft.description} onChange={e => setActivityDraft({ ...activityDraft, description: e.target.value })} data-testid="input-admin-activity-description" />
          <div className="cv-form-row"><input className="cv-input" maxLength={180} aria-label="Location" placeholder="Location or TBD" value={activityDraft.location} onChange={e => setActivityDraft({ ...activityDraft, location: e.target.value })} data-testid="input-admin-activity-location" /><input className="cv-input" required maxLength={120} aria-label="Timing" placeholder="Timing or TBD" value={activityDraft.timingLabel} onChange={e => setActivityDraft({ ...activityDraft, timingLabel: e.target.value })} data-testid="input-admin-activity-timing" /></div>
          <button className="cv-button" type="submit" disabled={createActivity.isPending} data-testid="button-create-activity"><Plus size={15} /> Add proposal</button>
        </form>
        {activitiesQuery.isLoading ? <div className="cv-skeleton" data-testid="loading-admin-activities" /> : activitiesQuery.isError ? <div className="cv-error" role="alert" data-testid="error-admin-activities">Proposals unavailable. <button onClick={() => activitiesQuery.refetch()} data-testid="button-retry-admin-activities">Retry</button></div> :
          (activitiesQuery.data?.activities ?? []).length === 0 ? <div className="cv-empty" data-testid="empty-admin-activities">No neighbor proposals yet.</div> :
          activitiesQuery.data?.activities.map(item => <div className="cv-admin-row" key={item.id} data-testid={`row-admin-activity-${item.id}`}>
            {editingActivity === item.id ? <form className="cv-form" onSubmit={e => { e.preventDefault(); updateActivity.mutate({ activityId: item.id, data: activityEdit }, { onSuccess: () => { setEditingActivity(null); handleSuccess("Neighbor proposal updated."); }, onError: handleError }); }}>
              <input className="cv-input" aria-label="Edit proposal title" value={activityEdit.title} onChange={e => setActivityEdit({ ...activityEdit, title: e.target.value })} data-testid={`input-edit-activity-title-${item.id}`} />
              <textarea className="cv-textarea" aria-label="Edit proposal description" value={activityEdit.description} onChange={e => setActivityEdit({ ...activityEdit, description: e.target.value })} data-testid={`input-edit-activity-description-${item.id}`} />
              <div className="cv-form-row"><input className="cv-input" aria-label="Edit proposal location" value={activityEdit.location} onChange={e => setActivityEdit({ ...activityEdit, location: e.target.value })} data-testid={`input-edit-activity-location-${item.id}`} /><input className="cv-input" aria-label="Edit proposal timing" value={activityEdit.timingLabel} onChange={e => setActivityEdit({ ...activityEdit, timingLabel: e.target.value })} data-testid={`input-edit-activity-timing-${item.id}`} /></div>
              <select className="cv-select" aria-label="Proposal status" value={item.status} onChange={e => updateActivity.mutate({ activityId: item.id, data: { status: e.target.value as "proposed" | "archived" } }, { onSuccess: () => handleSuccess("Proposal status updated."), onError: handleError })} data-testid={`select-activity-status-${item.id}`}><option value="proposed">Proposed</option><option value="archived">Archived</option></select>
              <div className="cv-admin-actions"><button className="cv-icon-button" aria-label="Save proposal" type="submit" data-testid={`button-save-activity-${item.id}`}><Check size={15} /></button><button className="cv-icon-button" type="button" aria-label="Cancel edit" onClick={() => setEditingActivity(null)} data-testid={`button-cancel-edit-activity-${item.id}`}><X size={15} /></button></div>
            </form> : <><div><strong>{item.title}</strong><p>{item.status} · {item.interestCount} interested{item.isSample ? " · sample" : ""}</p></div><div className="cv-admin-actions"><button className="cv-icon-button" aria-label={`Edit ${item.title}`} onClick={() => { setEditingActivity(item.id); setActivityEdit({ title: item.title, description: item.description, location: item.location, timingLabel: item.timingLabel }); }} data-testid={`button-edit-activity-${item.id}`}><Pencil size={14} /></button><button className="cv-icon-button cv-icon-button--danger" aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm(`Delete “${item.title}”?`)) deleteActivity.mutate({ activityId: item.id }, { onSuccess: () => handleSuccess("Neighbor proposal deleted."), onError: handleError }); }} data-testid={`button-delete-activity-${item.id}`}><Trash2 size={14} /></button></div></>}
          </div>)}
      </section>
    </div>
  </div></main>;
}
