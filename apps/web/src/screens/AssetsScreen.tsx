import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchLiveAssets, fetchOpenAlarmAssetIds, statusOf, statusLabel,
  type LiveAsset,
} from "../lib/data";

type Dev = { asset_id: string | null; kind: string; identifier: string; model: string | null; os: string | null };

const AVA = ["#4c7dff", "#23c6b3", "#9a86f5", "#f6b545"];

function ago(ts: string | null): string {
  if (!ts) return "—";
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es-AR");
}

export function AssetsScreen() {
  const [rows, setRows] = useState<LiveAsset[]>([]);
  const [devs, setDevs] = useState<Record<string, Dev>>({});
  const [alarms, setAlarms] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [a, al] = await Promise.all([fetchLiveAssets(), fetchOpenAlarmAssetIds()]);
      setRows(a);
      setAlarms(al);
      const { data } = await supabase.from("device").select("asset_id,kind,identifier,model,os");
      const map: Record<string, Dev> = {};
      (data ?? []).forEach((d) => { if (d.asset_id) map[d.asset_id] = d as Dev; });
      setDevs(map);
    })();
  }, []);

  return (
    <>
      <div className="ph">
        <div>
          <h1>Activos</h1>
          <div className="sub">{rows.length} dispositivos · personas, vehículos y trackers</div>
        </div>
      </div>
      <div className="wrap">
        <table className="tbl">
          <thead>
            <tr><th>Activo</th><th>Dispositivo</th><th>IMEI / ID</th><th>Grupo</th><th>Estado</th><th>Último reporte</th></tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const d = devs[a.asset_id];
              const st = statusOf(a, alarms.has(a.asset_id));
              const nm = a.person_name ?? a.alias ?? "Activo";
              return (
                <tr key={a.asset_id}>
                  <td>
                    <div className="who">
                      <span className="ava" style={{ background: AVA[i % AVA.length] }}>
                        {nm.slice(0, 2).toUpperCase()}
                      </span>
                      <div><b>{nm}</b><br /><small style={{ color: "var(--faint)" }}>{a.cargo ?? "—"}</small></div>
                    </div>
                  </td>
                  <td className="os">
                    {d ? <><span className="b">{d.kind === "hardware" ? "GPS" : d.os?.split(" ")[0] ?? "App"}</span>{d.model ?? "—"}</> : "—"}
                  </td>
                  <td className="mono">{d?.identifier ?? "—"}</td>
                  <td>{a.group_name ?? "—"}</td>
                  <td><span className={"chip " + st}><span className="d" />{statusLabel[st]}</span></td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{ago(a.ts)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
