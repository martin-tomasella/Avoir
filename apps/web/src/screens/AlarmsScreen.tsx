import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AlarmRow = {
  id: string;
  type: string;
  status: string;
  description: string | null;
  event_ts: string;
  asset: { person_name: string | null; alias: string | null } | null;
};

const STYLE: Record<string, string> = { attention: "crit", active: "warn", closed: "neu" };
const LABEL: Record<string, string> = { attention: "Atención", active: "Activa", closed: "Cerrada" };

export function AlarmsScreen() {
  const [rows, setRows] = useState<AlarmRow[]>([]);

  useEffect(() => {
    supabase
      .from("alarm")
      .select("id,type,status,description,event_ts,asset:asset_id(person_name,alias)")
      .order("event_ts", { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data ?? []) as unknown as AlarmRow[]));
  }, []);

  return (
    <>
      <div className="ph">
        <div>
          <h1>Alarmero</h1>
          <div className="sub">Atención a personas (lone-worker) · asignación y cierre</div>
        </div>
      </div>
      <div className="wrap">
        <table className="tbl">
          <thead>
            <tr><th>Descripción</th><th>Activo</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--muted)" }}>Sin alarmas registradas.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.description ?? r.type}</b></td>
                <td>{r.asset?.person_name ?? r.asset?.alias ?? "—"}</td>
                <td>{r.type}</td>
                <td><span className={"chip " + (STYLE[r.status] ?? "neu")}><span className="d" />{LABEL[r.status] ?? r.status}</span></td>
                <td className="mono" style={{ color: "var(--muted)" }}>{new Date(r.event_ts).toLocaleString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
