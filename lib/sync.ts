import type { Desk } from "./types";

const KEY = "subtext.workspace";

export type SyncState = "local" | "saving" | "saved" | "error";

export function workspaceId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function switchWorkspace(id: string) {
  localStorage.setItem(KEY, id);
  localStorage.removeItem("subtext.desks");
  localStorage.removeItem("subtext.active");
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({ error: "Unreadable response from server." }));
  if (!res.ok) throw new Error(data.error || "Sync failed.");
  return data;
}

export const pullDesks = (workspace: string) => call<{ enabled: boolean; desks: Desk[] }>(`/api/desks?workspace=${workspace}`);

export const pushDesk = (workspace: string, desk: Desk) => call<{ enabled: boolean }>("/api/desks", { method: "PUT", body: JSON.stringify({ workspace, desk }) });

export const dropDesk = (workspace: string, id: string) => call<{ enabled: boolean }>(`/api/desks?workspace=${workspace}&id=${encodeURIComponent(id)}`, { method: "DELETE" });

export const pullClips = (workspace: string) => call<{ enabled: boolean; clips: { url: string; title: string; text: string }[] }>(`/api/clips?workspace=${workspace}`);

export const pushClip = (workspace: string, clip: { url: string; title: string; text: string }) =>
  call<{ enabled: boolean; ok?: boolean }>("/api/clips", { method: "POST", body: JSON.stringify({ workspace, ...clip }) });

export function mergeDesks(local: Desk[], remote: Desk[]) {
  const byId = new Map<string, Desk>();
  for (const d of [...local, ...remote]) {
    const seen = byId.get(d.id);
    if (!seen || (d.updatedAt ?? 0) > (seen.updatedAt ?? 0)) byId.set(d.id, d);
  }
  return [...byId.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
