import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { MapScreen } from "../screens/MapScreen";
import { AssetsScreen } from "../screens/AssetsScreen";
import { AlarmsScreen } from "../screens/AlarmsScreen";
import { Placeholder } from "../screens/Placeholder";

type ScreenKey =
  | "mapa" | "activos" | "geozonas" | "jornadas"
  | "alarmas" | "formularios" | "tareas" | "usuarios";

const NAV: { grp: string; items: { k: ScreenKey; label: string }[] }[] = [
  { grp: "Operación", items: [
    { k: "mapa", label: "Mapa en vivo" },
    { k: "activos", label: "Activos" },
    { k: "geozonas", label: "Geozonas" },
    { k: "jornadas", label: "Jornadas" },
  ]},
  { grp: "Trabajo en campo", items: [
    { k: "formularios", label: "Formularios" },
    { k: "tareas", label: "Tareas" },
  ]},
  { grp: "Monitoreo", items: [
    { k: "alarmas", label: "Alarmero" },
  ]},
  { grp: "Administración", items: [
    { k: "usuarios", label: "Usuarios" },
  ]},
];

export function Shell({ session }: { session: Session }) {
  const [screen, setScreen] = useState<ScreenKey>("mapa");
  const [company, setCompany] = useState<string>("");
  const name = (session.user.user_metadata?.full_name as string) || session.user.email || "Usuario";

  useEffect(() => {
    supabase.from("company").select("name").limit(1).maybeSingle().then(({ data }) => {
      if (data?.name) setCompany(data.name);
    });
  }, []);

  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="app">
      <div className="sbrand">
        <div className="logo" />
        <b>Avoir</b>
      </div>
      <header className="top">
        <div className="tenant"><span className="d" />{company || "—"}</div>
        <div className="sp" />
        <div className="me">
          <span className="avatar">{initials}</span>
          <span>{name}</span>
        </div>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Salir</button>
      </header>
      <nav className="nav">
        {NAV.map((g) => (
          <div key={g.grp}>
            <div className="grp">{g.grp}</div>
            {g.items.map((it) => (
              <button
                key={it.k}
                className={"item" + (screen === it.k ? " on" : "")}
                onClick={() => setScreen(it.k)}
              >
                {it.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <main className="main">
        {screen === "mapa" && <MapScreen />}
        {screen === "activos" && <AssetsScreen />}
        {screen === "alarmas" && <AlarmsScreen />}
        {screen === "geozonas" && <Placeholder title="Geozonas" note="Dibujo y reglas de geozonas — próxima iteración." />}
        {screen === "jornadas" && <Placeholder title="Jornadas de trabajo" note="Horarios por día y fichaje — próxima iteración." />}
        {screen === "formularios" && <Placeholder title="Formularios" note="Constructor y envíos — próxima iteración." />}
        {screen === "tareas" && <Placeholder title="Tareas" note="Agenda y tareas de campo — próxima iteración." />}
        {screen === "usuarios" && <Placeholder title="Usuarios" note="Gestión de usuarios y roles — próxima iteración." />}
      </main>
    </div>
  );
}
