import { useState } from "react";
import { supabase } from "../lib/supabase";

export function Login() {
  const [email, setEmail] = useState("demo@avoir.app");
  const [password, setPassword] = useState("avoir1234");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  }

  return (
    <div className="login">
      <form className="box" onSubmit={submit}>
        <div className="brandrow">
          <div className="logo" />
          <div>
            <b>Avoir</b>
            <div className="tag">Field Ops</div>
          </div>
        </div>
        <h1>Ingresar</h1>
        <p>Plataforma de gestión de recursos en campo</p>
        <label htmlFor="email">Correo</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label htmlFor="pass">Contraseña</label>
        <input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? "Ingresando…" : "Ingresar al panel"}
        </button>
        {err && <div className="err">{err}</div>}
        <div className="hint">Demo: demo@avoir.app / avoir1234</div>
      </form>
    </div>
  );
}
