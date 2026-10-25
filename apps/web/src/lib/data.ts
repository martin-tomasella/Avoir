import { supabase } from "./supabase";

export type LiveAsset = {
  asset_id: string;
  alias: string | null;
  person_name: string | null;
  cargo: string | null;
  group_name: string | null;
  ts: string | null;
  speed: number | null;
  lat: number | null;
  lon: number | null;
  attributes: Record<string, unknown> | null;
};

export type AssetStatus = "ok" | "warn" | "crit" | "neu";

export function statusOf(a: LiveAsset, hasAlarm: boolean): AssetStatus {
  if (hasAlarm) return "crit";
  if (!a.ts) return "neu";
  const ageMin = (Date.now() - new Date(a.ts).getTime()) / 60000;
  if (ageMin > 60) return "neu"; // sin reportar hace >1h
  if ((a.speed ?? 0) > 3) return "ok"; // en movimiento
  return "warn"; // detenido
}

export const statusLabel: Record<AssetStatus, string> = {
  ok: "En línea",
  warn: "Detenido",
  crit: "Alarma",
  neu: "Sin reportar",
};

export async function fetchLiveAssets(): Promise<LiveAsset[]> {
  const { data, error } = await supabase
    .from("asset_live")
    .select("*")
    .order("person_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LiveAsset[];
}

export async function fetchOpenAlarmAssetIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("alarm")
    .select("asset_id")
    .neq("status", "closed");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.asset_id).filter(Boolean) as string[]);
}
