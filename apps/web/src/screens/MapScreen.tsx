import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { supabase, MAP_STYLE } from "../lib/supabase";
import {
  fetchLiveAssets, fetchOpenAlarmAssetIds, statusOf, statusLabel,
  type LiveAsset, type AssetStatus,
} from "../lib/data";

const COLOR: Record<AssetStatus, string> = {
  ok: "#38cf8a", warn: "#f6b545", crit: "#ff5f6e", neu: "#64738f",
};

export function MapScreen() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const [assets, setAssets] = useState<LiveAsset[]>([]);
  const [alarms, setAlarms] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const [a, al] = await Promise.all([fetchLiveAssets(), fetchOpenAlarmAssetIds()]);
      setAssets(a);
      setAlarms(al);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando datos");
    }
  }

  // init map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: MAP_STYLE,
      center: [-58.43, -34.61],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    load();
    // realtime: cualquier posición nueva refresca
    const ch = supabase
      .channel("positions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "position" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // render markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const a of assets) {
      if (a.lat == null || a.lon == null) continue;
      seen.add(a.asset_id);
      const st = statusOf(a, alarms.has(a.asset_id));
      const color = COLOR[st];
      let m = markers.current[a.asset_id];
      if (!m) {
        const el = document.createElement("div");
        el.style.cssText = "width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(45deg);border:2px solid #fff;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,.5)";
        el.addEventListener("click", () => setSel(a.asset_id));
        m = new maplibregl.Marker({ element: el });
        markers.current[a.asset_id] = m;
      }
      (m.getElement() as HTMLElement).style.background = color;
      m.setLngLat([a.lon, a.lat]);
      const attrs = a.attributes || {};
      m.setPopup(
        new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
          `<h4>${a.person_name ?? a.alias ?? "Activo"}</h4>
           <div class="row"><span>Estado</span><b>${statusLabel[st]}</b></div>
           <div class="row"><span>Velocidad</span><b>${a.speed ?? 0} km/h</b></div>
           <div class="row"><span>Grupo</span><b>${a.group_name ?? "—"}</b></div>
           ${"temp_c" in attrs ? `<div class="row"><span>Temp.</span><b>${(attrs as any).temp_c} °C</b></div>` : ""}
           ${"battery" in attrs ? `<div class="row"><span>Batería</span><b>${(attrs as any).battery}%</b></div>` : ""}`
        )
      );
      m.addTo(map);
    }
    // quitar marcadores de activos que ya no están
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) { markers.current[id].remove(); delete markers.current[id]; }
    }
  }, [assets, alarms]);

  function focus(a: LiveAsset) {
    setSel(a.asset_id);
    const map = mapRef.current;
    if (map && a.lat != null && a.lon != null) {
      map.flyTo({ center: [a.lon, a.lat], zoom: 14 });
      markers.current[a.asset_id]?.togglePopup();
    }
  }

  const online = assets.filter((a) => statusOf(a, alarms.has(a.asset_id)) === "ok").length;

  return (
    <>
      <div className="ph">
        <div>
          <h1>Mapa en vivo</h1>
          <div className="sub">{assets.length} activos · {online} en línea · {alarms.size} alarma(s) abierta(s)</div>
        </div>
      </div>
      <div className="ops">
        <div className="aside">
          <div className="hd"><span>Activos</span><span>{assets.length}</span></div>
          <div className="alist">
            {err && <div style={{ padding: 13, color: "var(--red)", fontSize: 12 }}>{err}</div>}
            {assets.map((a) => {
              const st = statusOf(a, alarms.has(a.asset_id));
              return (
                <div key={a.asset_id} className={"ai" + (sel === a.asset_id ? " sel" : "")} onClick={() => focus(a)}>
                  <span className="pin" style={{ background: COLOR[st] }} />
                  <div className="nm">
                    <b>{a.person_name ?? a.alias ?? "Activo"}</b>
                    <small>{a.group_name ?? "—"}</small>
                  </div>
                  <span className="sp">{a.speed ?? 0} km/h</span>
                </div>
              );
            })}
          </div>
        </div>
        <div id="map" ref={mapEl} />
      </div>
    </>
  );
}
