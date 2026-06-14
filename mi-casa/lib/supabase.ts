// Lightweight Supabase REST helpers (anon key — public/safe to embed).
const URL = "https://wetwdokwnstjidoceoib.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldHdkb2t3bnN0amlkb2Nlb2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NTAyNDQsImV4cCI6MjA5NTIyNjI0NH0.PMC2z6gXGE_wnyo7esdP_F-Vp-N0RZbHKPa9am6CQE0";

const authHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}` };

export const ifcPublicUrl = (name: string) =>
  `${URL}/storage/v1/object/public/ifc/${encodeURIComponent(name)}`;

/** Names of the .ifc objects in the public `ifc` bucket (best effort). */
export async function listIfcs(): Promise<string[]> {
  try {
    const res = await fetch(`${URL}/storage/v1/object/list/ifc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ prefix: "", limit: 200, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) return [];
    const arr = (await res.json()) as { name?: string }[];
    return arr
      .map((o) => o.name ?? "")
      .filter((n) => n.toLowerCase().endsWith(".ifc"));
  } catch {
    return [];
  }
}

export interface ConfigRow {
  name: string;
  updated_at: string;
}

export async function listConfigs(): Promise<ConfigRow[]> {
  try {
    const res = await fetch(
      `${URL}/rest/v1/configs?select=name,updated_at&order=updated_at.desc`,
      { headers: authHeaders }
    );
    if (!res.ok) return [];
    return (await res.json()) as ConfigRow[];
  } catch {
    return [];
  }
}

export async function saveConfig(name: string, data: unknown): Promise<void> {
  const res = await fetch(`${URL}/rest/v1/configs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
      ...authHeaders,
    },
    body: JSON.stringify({ name, data, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Guardar (${res.status}): ${await res.text()}`);
}

export async function loadConfig(name: string): Promise<unknown | null> {
  const res = await fetch(
    `${URL}/rest/v1/configs?name=eq.${encodeURIComponent(name)}&select=data`,
    { headers: authHeaders }
  );
  if (!res.ok) throw new Error(`Cargar (${res.status})`);
  const arr = (await res.json()) as { data: unknown }[];
  return arr[0]?.data ?? null;
}
