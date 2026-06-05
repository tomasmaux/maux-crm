import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

/* ─── KONSTANTY ─── */
const SERVICE_COLORS = {
  "Reality / transakce": "#1c0a63",
  "Smlouvy o dílo / výstavba": "#3b2a8c",
  "AML": "#b8923d",
  "Spory / proces": "#a23b3b",
  "Korporát": "#1f6b6b",
  "Zápůjčky / úvěry": "#7a5326",
  "Nájemní vztahy": "#3f6b2a",
  "Pracovní / NDA": "#5a3b7a",
};
const ALL_SERVICES = Object.keys(SERVICE_COLORS);

const MODULES = [
  { key: "klienti",   label: "Klienti",       icon: "◆", live: true },
  { key: "dashboard", label: "Přehled",        icon: "▦", live: false, desc: "KPI z fakturace a backlogu — měsíční zisk, trend, health skóre." },
  { key: "fakturace", label: "Fakturace",      icon: "₵", live: false, desc: "Seznam faktur, stav splatnosti, podklad pro účetní." },
  { key: "vykaz",     label: "Výkaz práce",   icon: "◷", live: false, desc: "Denní zápis: datum · klient · čas · popis. Krmí fakturaci." },
  { key: "uschovy",   label: "Úschovy",        icon: "⛁", live: false, desc: "Advokátní úschovy + výpočet úroků po měsících." },
  { key: "ucetni",    label: "Účetní export",  icon: "⇪", live: false, desc: "Export podkladu pro účetní — základ, poplatek, DPH, splatnosti." },
  { key: "happy",     label: "Happy Life",     icon: "❖", live: false, desc: "Osobní finance — spoření, majetek, životní náklady, grafy." },
];

const fmtKc = (n) => new Intl.NumberFormat("cs-CZ").format(Math.round(n || 0)) + " Kč";
const uid = () => "cl_" + Math.random().toString(36).slice(2, 9);

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Hanken+Grotesk:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;min-height:100vh;background:#f6f5fb}
.mx{--ink:#1c0a63;--ink2:#3b2a8c;--gold:#b8923d;--bg:#f6f5fb;--card:#ffffff;--line:#e7e4f1;--mut:#6b6485;
  font-family:'Hanken Grotesk',system-ui,sans-serif;color:#211b33;background:var(--bg);
  min-height:100vh;display:flex}
.serif{font-family:'Fraunces',Georgia,serif}
.sb{width:228px;flex:0 0 228px;background:linear-gradient(168deg,#1c0a63,#150748);color:#e9e6f7;
  display:flex;flex-direction:column;padding:22px 14px;min-height:100vh;position:sticky;top:0}
.brand{padding:6px 8px 22px}
.brand .wm{font-size:25px;font-weight:600;letter-spacing:.04em;line-height:1}
.brand .sub{font-size:10.5px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold);margin-top:7px;font-weight:600}
.nav{display:flex;flex-direction:column;gap:2px}
.ni{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;cursor:pointer;
  font-size:14px;font-weight:500;color:#c8c2e6;border:1px solid transparent;transition:.15s;text-align:left;background:none;width:100%}
.ni:hover{background:rgba(255,255,255,.06);color:#fff}
.ni.on{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(184,146,61,.45)}
.ni .ic{width:18px;text-align:center;font-size:14px;opacity:.85}
.ni .soon{margin-left:auto;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#8e86b8;border:1px solid #4a3f7a;border-radius:5px;padding:1px 5px}
.sbfoot{margin-top:auto;font-size:10.5px;color:#8e86b8;line-height:1.5;padding:14px 8px 0;border-top:1px solid rgba(255,255,255,.08)}
.sbfoot button{background:none;border:none;color:#8e86b8;font:inherit;font-size:10.5px;cursor:pointer;padding:0;text-decoration:underline}
.sbfoot button:hover{color:#c8c2e6}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.top{padding:20px 28px 16px;border-bottom:1px solid var(--line);background:#fbfafe;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;position:sticky;top:0;z-index:2}
.top h1{font-size:25px;font-weight:600;color:var(--ink)}
.top .crumb{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:5px;font-weight:600}
.body{flex:1;padding:22px 28px 30px}
.stats{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.stat{background:var(--card);border:1px solid var(--line);border-radius:11px;padding:13px 17px;min-width:140px;flex:1}
.stat .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:600}
.stat .v{font-size:21px;font-weight:600;color:var(--ink);margin-top:3px}
.stat.gold .v{color:var(--gold)}
.tools{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.search{flex:1;min-width:180px;display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:9px 13px}
.search input{border:none;outline:none;font:inherit;font-size:14px;width:100%;background:none;color:#211b33}
.btn{font:inherit;font-size:13px;font-weight:600;border-radius:9px;padding:9px 15px;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--ink);transition:.15s;white-space:nowrap}
.btn:hover{border-color:var(--ink)}
.btn.pri{background:var(--ink);color:#fff;border-color:var(--ink)}
.btn.pri:hover{background:#2a1580}
.btn.gho{background:none;border-color:transparent;color:var(--mut)}
.btn.gho:hover{color:var(--ink);background:#efecf9}
.btn.dng{color:#a23b3b;border-color:#e7c9c9}
.btn.dng:hover{background:#fbedec;border-color:#a23b3b}
.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.fchip{font-size:12px;font-weight:500;padding:5px 11px;border-radius:20px;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--mut);transition:.15s}
.fchip:hover{border-color:var(--ink2)}
.fchip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.list{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.row{display:grid;grid-template-columns:1fr 150px 1fr 120px;gap:14px;align-items:center;padding:13px 18px;border-bottom:1px solid var(--line);cursor:pointer;transition:.12s}
.row:last-child{border-bottom:none}
.row:hover{background:#f7f5fd}
.row .nm{font-weight:600;font-size:14.5px;color:#211b33;display:flex;align-items:center;gap:9px}
.tag{font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;border-radius:5px;padding:2px 6px}
.tag.firma{background:#ece8fb;color:var(--ink)}
.tag.osoba{background:#f3eee2;color:var(--gold)}
.row .ct{font-size:13px;color:var(--mut)}
.row .sv{display:flex;gap:5px;flex-wrap:wrap}
.sdot{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#4a4360;font-weight:500}
.sdot i{width:8px;height:8px;border-radius:50%;display:inline-block}
.more{font-size:11px;color:var(--mut)}
.row .inv{text-align:right;font-weight:600;font-size:14px;color:var(--ink);font-variant-numeric:tabular-nums}
.empty{padding:50px;text-align:center;color:var(--mut);font-size:14px}
.det{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px 28px;max-width:760px}
.det h2{font-size:27px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.det .reg{font-size:13px;color:var(--mut);margin-top:7px;white-space:pre-line;line-height:1.5}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:24px}
.fld .l{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:600;margin-bottom:5px}
.fld .d{font-size:14.5px;color:#211b33;line-height:1.55}
.fld a{color:var(--ink2);text-decoration:none}
.fld a:hover{text-decoration:underline}
.bigval{font-size:30px;font-weight:600;color:var(--gold);font-family:'Fraunces',serif}
.svwrap{display:flex;gap:7px;flex-wrap:wrap;margin-top:3px}
.notes{margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}
.notes .d{font-size:14px;color:#3a3450;line-height:1.65;white-space:pre-wrap}
.actions{display:flex;gap:9px;margin-top:26px;padding-top:20px;border-top:1px solid var(--line)}
.status-badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-radius:6px;padding:3px 8px}
.status-aktivní{background:#e4f7ec;color:#1a5c33}
.status-spící{background:#f3eee2;color:#7a4d10}
.status-ukončený{background:#fde8e8;color:#a23b3b}
.form{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px 28px;max-width:680px}
.form h2{font-size:22px;font-weight:600;color:var(--ink);margin-bottom:20px}
.frow{margin-bottom:15px}
.frow label{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:600;margin-bottom:6px}
.frow input,.frow textarea,.frow select{width:100%;font:inherit;font-size:14px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;outline:none;background:#fff;color:#211b33}
.frow input:focus,.frow textarea:focus,.frow select:focus{border-color:var(--ink2)}
.frow textarea{resize:vertical;min-height:72px;line-height:1.5}
.two{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px}
.svpick{display:flex;gap:7px;flex-wrap:wrap}
.svopt{font-size:12px;font-weight:500;padding:6px 11px;border-radius:20px;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--mut)}
.svopt.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.ph{max-width:560px;background:var(--card);border:1px dashed #cfc9e6;border-radius:14px;padding:40px 34px;text-align:center}
.ph .ic{font-size:34px;color:var(--ink2);opacity:.5}
.ph h2{font-size:22px;font-weight:600;color:var(--ink);margin:14px 0 6px}
.ph .ph2{display:inline-block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:700;border:1px solid #e6d9bd;border-radius:6px;padding:3px 9px;margin-bottom:14px}
.ph p{font-size:14px;color:var(--mut);line-height:1.6}
.lock{flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(168deg,#1c0a63,#120640);padding:30px;min-height:100vh}
.lockcard{text-align:center;color:#fff;max-width:340px;width:100%}
.lockcard .wm{font-size:40px;font-weight:600;letter-spacing:.03em}
.lockcard .sub{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold);margin-top:8px;font-weight:600}
.lockcard p{font-size:12.5px;color:#b2aad6;margin:22px 0 8px;line-height:1.55}
.lockcard .field{margin-bottom:10px}
.lockcard .field label{display:block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7d75ab;margin-bottom:5px;text-align:left}
.lockcard input{width:100%;font:inherit;font-size:15px;padding:11px 14px;border-radius:9px;border:1px solid #3a2d70;background:rgba(255,255,255,.07);color:#fff;outline:none}
.lockcard input::placeholder{color:#7d75ab}
.lockcard input:focus{border-color:var(--gold)}
.lockcard .btn-login{width:100%;margin-top:6px;padding:12px;font-size:15px;font-weight:600;border-radius:9px;border:none;background:var(--gold);color:#fff;cursor:pointer;transition:.15s}
.lockcard .btn-login:hover{background:#a07830}
.lockcard .btn-login:disabled{opacity:.6;cursor:not-allowed}
.lockcard .err{color:#ffb4a8;font-size:12px;margin-top:11px;min-height:14px}
.ov{position:fixed;inset:0;background:rgba(28,10,99,.32);display:flex;align-items:center;justify-content:center;z-index:99}
.cf{background:#fff;border-radius:13px;padding:24px 26px;max-width:340px;text-align:center;box-shadow:0 20px 50px -16px rgba(0,0,0,.4)}
.cf h3{font-size:18px;color:var(--ink);font-weight:600;margin-bottom:7px}
.cf p{font-size:13.5px;color:var(--mut);line-height:1.5;margin-bottom:18px}
.cf .r{display:flex;gap:9px;justify-content:center}
.loading{padding:60px;text-align:center;color:var(--mut);font-size:14px}
@media(max-width:768px){
  .mx{flex-direction:column}
  .sb{width:100%;min-height:auto;position:relative;flex-direction:row;flex-wrap:wrap;padding:14px;gap:6px}
  .brand{flex:0 0 100%;padding:0 0 10px}
  .nav{flex-direction:row;flex-wrap:wrap;gap:4px}
  .ni{width:auto;padding:6px 10px}
  .sbfoot{display:none}
  .top{position:relative}
  .row{grid-template-columns:1fr auto}
  .row .ct,.row .sv{display:none}
  .grid2,.two,.three{grid-template-columns:1fr}
}
`;

/* ─── SUPABASE DATA LAYER ─── */
async function fetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("invoiced", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function upsertClient(client) {
  const { error } = await supabase
    .from("clients")
    .upsert({ ...client, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function deleteClientDb(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

/* ─── COMPONENTS ─── */
function ServiceDots({ list, max = 3 }) {
  const show = list.slice(0, max);
  return (
    <div className="sv">
      {show.map((s) => (
        <span className="sdot" key={s}>
          <i style={{ background: SERVICE_COLORS[s] || "#aaa" }} />
          {s.split(" / ")[0]}
        </span>
      ))}
      {list.length > max && <span className="more">+{list.length - max}</span>}
    </div>
  );
}

function Sidebar({ mod, setMod, onLogout }) {
  return (
    <aside className="sb">
      <div className="brand">
        <div className="wm serif">MAUX</div>
        <div className="sub">CRM · interní</div>
      </div>
      <nav className="nav">
        {MODULES.map((m) => (
          <button
            key={m.key}
            className={"ni" + (mod === m.key ? " on" : "")}
            onClick={() => setMod(m.key)}
          >
            <span className="ic">{m.icon}</span>
            {m.label}
            {!m.live && <span className="soon">Fáze 2</span>}
          </button>
        ))}
      </nav>
      <div className="sbfoot">
        MAUX Legal · Poděbrady
        <br />
        <button onClick={onLogout}>Odhlásit se</button>
      </div>
    </aside>
  );
}

function ClientList({ clients, query, setQuery, filter, setFilter, onOpen, onNew }) {
  const sum = useMemo(() => clients.reduce((a, c) => a + (c.invoiced || 0), 0), [clients]);
  const firmy = clients.filter((c) => c.type === "firma").length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => !filter || (c.services || []).includes(filter))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.contact || "").toLowerCase().includes(q) ||
          (c.notes || "").toLowerCase().includes(q) ||
          (c.emails || []).join(" ").toLowerCase().includes(q)
      )
      .sort((a, b) => (b.invoiced || 0) - (a.invoiced || 0));
  }, [clients, query, filter]);

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="k">Klientů</div>
          <div className="v">{clients.length}</div>
        </div>
        <div className="stat gold">
          <div className="k">Fakturováno celkem</div>
          <div className="v">{fmtKc(sum)}</div>
        </div>
        <div className="stat">
          <div className="k">Firmy / osoby</div>
          <div className="v">
            {firmy} / {clients.length - firmy}
          </div>
        </div>
      </div>
      <div className="tools">
        <div className="search">
          <span style={{ color: "#9b93bd" }}>⌕</span>
          <input
            placeholder="Hledat klienta, kontakt, e-mail, poznámku…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn pri" onClick={onNew}>
          + Nový klient
        </button>
      </div>
      <div className="filters">
        <span className={"fchip" + (!filter ? " on" : "")} onClick={() => setFilter(null)}>
          Vše
        </span>
        {ALL_SERVICES.map((s) => (
          <span
            key={s}
            className={"fchip" + (filter === s ? " on" : "")}
            onClick={() => setFilter(filter === s ? null : s)}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="list">
        {filtered.length === 0 && <div className="empty">Nic neodpovídá filtru.</div>}
        {filtered.map((c) => (
          <div className="row" key={c.id} onClick={() => onOpen(c.id)}>
            <div className="nm">
              {c.name}
              <span className={"tag " + c.type}>{c.type}</span>
              {c.status && c.status !== "aktivní" && (
                <span className={"status-badge status-" + c.status}>{c.status}</span>
              )}
            </div>
            <div className="ct">{c.contact || "—"}</div>
            <ServiceDots list={c.services || []} />
            <div className="inv">{fmtKc(c.invoiced)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Detail({ c, onBack, onEdit, onDelete }) {
  return (
    <div className="det">
      <h2>
        {c.name}
        <span className={"tag " + c.type}>{c.type}</span>
        {c.status && (
          <span className={"status-badge status-" + c.status}>{c.status}</span>
        )}
        {c.uschovaaml && (
          <span className="status-badge" style={{ background: "#fef3e2", color: "#7a4d10" }}>
            Úschova / AML
          </span>
        )}
      </h2>
      {c.reg && <div className="reg">{c.reg}</div>}
      <div className="grid2">
        <div className="fld">
          <div className="l">Kontaktní osoba</div>
          <div className="d">{c.contact || "—"}</div>
        </div>
        <div className="fld">
          <div className="l">Fakturováno (letos)</div>
          <div className="bigval">{fmtKc(c.invoiced)}</div>
        </div>
        <div className="fld">
          <div className="l">E-maily</div>
          <div className="d">
            {(c.emails || []).length
              ? (c.emails || []).map((e) => (
                  <div key={e}>
                    <a href={"mailto:" + e}>{e}</a>
                  </div>
                ))
              : "—"}
          </div>
        </div>
        <div className="fld">
          <div className="l">Specializace</div>
          <div className="svwrap">
            {(c.services || []).length ? (
              (c.services || []).map((s) => (
                <span className="sdot" key={s}>
                  <i style={{ background: SERVICE_COLORS[s] || "#aaa" }} />
                  {s}
                </span>
              ))
            ) : (
              <span className="d">—</span>
            )}
          </div>
        </div>
        {c.last_work_date && (
          <div className="fld">
            <div className="l">Datum poslední práce</div>
            <div className="d">{c.last_work_date}</div>
          </div>
        )}
        {c.file_link && (
          <div className="fld">
            <div className="l">Odkaz na spis</div>
            <div className="d">
              <a href={c.file_link} target="_blank" rel="noopener noreferrer">
                Otevřít spis →
              </a>
            </div>
          </div>
        )}
      </div>
      {c.notes && (
        <div className="notes">
          <div
            className="l"
            style={{
              fontSize: 10.5,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--mut)",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Poznámky / příklady prací
          </div>
          <div className="d">{c.notes}</div>
        </div>
      )}
      <div className="actions">
        <button className="btn gho" onClick={onBack}>
          ← Zpět
        </button>
        <button className="btn" onClick={onEdit}>
          Upravit
        </button>
        <button className="btn dng" onClick={onDelete} style={{ marginLeft: "auto" }}>
          Smazat
        </button>
      </div>
    </div>
  );
}

function Form({ init, onSave, onCancel, saving }) {
  const [d, setD] = useState(
    () =>
      init || {
        id: uid(),
        name: "",
        type: "firma",
        ico: "",
        reg: "",
        invoiced: 0,
        contact: "",
        emails: [],
        services: [],
        notes: "",
        status: "aktivní",
        uschovaaml: false,
        last_work_date: "",
        file_link: "",
      }
  );
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const toggleSv = (s) =>
    setD((p) => ({
      ...p,
      services: (p.services || []).includes(s)
        ? (p.services || []).filter((x) => x !== s)
        : [...(p.services || []), s],
    }));
  const save = () => {
    if (!d.name.trim()) return;
    const emails =
      typeof d.emails === "string"
        ? d.emails.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean)
        : d.emails;
    onSave({ ...d, name: d.name.trim(), invoiced: Number(d.invoiced) || 0, emails });
  };
  const emailStr = Array.isArray(d.emails) ? d.emails.join(", ") : d.emails;

  return (
    <div className="form">
      <h2>{init ? "Upravit klienta" : "Nový klient"}</h2>
      <div className="frow">
        <label>Název klienta *</label>
        <input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="RUFU realitní s.r.o." />
      </div>
      <div className="three">
        <div className="frow">
          <label>Typ</label>
          <select value={d.type} onChange={(e) => set("type", e.target.value)}>
            <option value="firma">firma</option>
            <option value="osoba">osoba</option>
          </select>
        </div>
        <div className="frow">
          <label>Stav</label>
          <select value={d.status || "aktivní"} onChange={(e) => set("status", e.target.value)}>
            <option value="aktivní">aktivní</option>
            <option value="spící">spící</option>
            <option value="ukončený">ukončený</option>
          </select>
        </div>
        <div className="frow">
          <label>IČO</label>
          <input value={d.ico || ""} onChange={(e) => set("ico", e.target.value)} placeholder="22113169" />
        </div>
      </div>
      <div className="frow">
        <label>Identifikace / adresa (vol.)</label>
        <input value={d.reg || ""} onChange={(e) => set("reg", e.target.value)} placeholder="IČO: … nebo dat. nar. + adresa" />
      </div>
      <div className="two">
        <div className="frow">
          <label>Kontaktní osoba</label>
          <input value={d.contact || ""} onChange={(e) => set("contact", e.target.value)} />
        </div>
        <div className="frow">
          <label>Fakturováno (Kč)</label>
          <input type="number" value={d.invoiced || 0} onChange={(e) => set("invoiced", e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label>E-maily (oddělit čárkou)</label>
        <input value={emailStr || ""} onChange={(e) => set("emails", e.target.value)} placeholder="jan@firma.cz, fakturace@firma.cz" />
      </div>
      <div className="two">
        <div className="frow">
          <label>Datum poslední práce</label>
          <input type="date" value={d.last_work_date || ""} onChange={(e) => set("last_work_date", e.target.value)} />
        </div>
        <div className="frow">
          <label>Odkaz na spis (vol.)</label>
          <input value={d.file_link || ""} onChange={(e) => set("file_link", e.target.value)} placeholder="https://drive.google.com/…" />
        </div>
      </div>
      <div className="frow">
        <label style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "none", letterSpacing: 0, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={!!d.uschovaaml}
            onChange={(e) => set("uschovaaml", e.target.checked)}
            style={{ width: "auto", margin: 0 }}
          />
          Klient s úschovou nebo AML povinností
        </label>
      </div>
      <div className="frow">
        <label>Specializace</label>
        <div className="svpick">
          {ALL_SERVICES.map((s) => (
            <span
              key={s}
              className={"svopt" + ((d.services || []).includes(s) ? " on" : "")}
              onClick={() => toggleSv(s)}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="frow">
        <label>Poznámky / příklady prací</label>
        <textarea value={d.notes || ""} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 8 }}>
        <button className="btn gho" onClick={onCancel}>
          Zrušit
        </button>
        <button className="btn pri" onClick={save} disabled={saving} style={{ marginLeft: "auto" }}>
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </div>
  );
}

function Placeholder({ m }) {
  return (
    <div className="ph">
      <div className="ic">{m.icon}</div>
      <div style={{ marginTop: 14 }}>
        <span className="ph2">Fáze 2</span>
      </div>
      <h2 className="serif">{m.label}</h2>
      <p>{m.desc}</p>
      <p style={{ marginTop: 14, fontSize: 12.5 }}>
        Tenhle modul napojíme, až bude jádro odladěné. Architektura s ním počítá.
      </p>
    </div>
  );
}

function Lock({ onOk }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!email.trim() || !password) { setErr("Vyplň e-mail a heslo."); return; }
    setLoading(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setErr("Nesprávný e-mail nebo heslo.");
      setLoading(false);
    } else {
      onOk();
    }
  };

  return (
    <div className="lock">
      <div className="lockcard">
        <div className="wm serif">MAUX</div>
        <div className="sub">CRM</div>
        <p>Interní systém kanceláře MAUX Legal.<br />Přihlášení je chráněno.</p>
        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            placeholder="tomas@maux.cz"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && go()}
            autoFocus
          />
        </div>
        <div className="field">
          <label>Heslo</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </div>
        <button className="btn-login" onClick={go} disabled={loading}>
          {loading ? "Přihlašuji…" : "Vstoupit do CRM"}
        </button>
        <div className="err">{err}</div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function MauxCRM() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [mod, setMod] = useState("klienti");
  const [mode, setMode] = useState("list");
  const [sel, setSel] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saving, setSaving] = useState(false);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load clients when logged in
  useEffect(() => {
    if (!session) return;
    setClientsLoading(true);
    fetchClients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setClientsLoading(false));
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setClients([]);
    setMode("list");
    setSel(null);
  };

  const saveClient = async (c) => {
    setSaving(true);
    try {
      await upsertClient(c);
      const updated = await fetchClients();
      setClients(updated);
      setSel(c.id);
      setMode("detail");
    } catch (e) {
      alert("Chyba při ukládání: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id) => {
    try {
      await deleteClientDb(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      setConfirmDel(null);
      setMode("list");
      setSel(null);
    } catch (e) {
      alert("Chyba při mazání: " + e.message);
    }
  };

  const selClient = clients.find((c) => c.id === sel);
  const curMod = MODULES.find((m) => m.key === mod);
  const title =
    mod === "klienti"
      ? mode === "new"
        ? "Nový klient"
        : mode === "edit"
        ? "Úprava klienta"
        : mode === "detail"
        ? selClient?.name || "Klient"
        : "Klienti"
      : curMod?.label;

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1c0a63" }}>
        <style>{CSS}</style>
        <div style={{ color: "#b8923d", fontFamily: "Georgia, serif", fontSize: 24 }}>MAUX CRM</div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <div className="mx">
        <style>{CSS}</style>
        <Lock onOk={() => {}} />
      </div>
    );
  }

  return (
    <div className="mx">
      <style>{CSS}</style>
      <Sidebar
        mod={mod}
        setMod={(k) => { setMod(k); setMode("list"); setSel(null); }}
        onLogout={handleLogout}
      />
      <div className="main">
        <div className="top">
          <div>
            <div className="crumb">MAUX Legal · {mod === "klienti" ? "Klienti" : curMod?.label}</div>
            <h1 className="serif">{title}</h1>
          </div>
        </div>
        <div className="body">
          {mod !== "klienti" && <Placeholder m={curMod} />}
          {mod === "klienti" && clientsLoading && <div className="loading">Načítám klienty…</div>}
          {mod === "klienti" && !clientsLoading && mode === "list" && (
            <ClientList
              clients={clients}
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
              onOpen={(id) => { setSel(id); setMode("detail"); }}
              onNew={() => setMode("new")}
            />
          )}
          {mod === "klienti" && mode === "detail" && selClient && (
            <Detail
              c={selClient}
              onBack={() => setMode("list")}
              onEdit={() => setMode("edit")}
              onDelete={() => setConfirmDel(selClient.id)}
            />
          )}
          {mod === "klienti" && mode === "edit" && selClient && (
            <Form init={selClient} onSave={saveClient} onCancel={() => setMode("detail")} saving={saving} />
          )}
          {mod === "klienti" && mode === "new" && (
            <Form onSave={saveClient} onCancel={() => setMode("list")} saving={saving} />
          )}
        </div>
      </div>
      {confirmDel && (
        <div className="ov" onClick={() => setConfirmDel(null)}>
          <div className="cf" onClick={(e) => e.stopPropagation()}>
            <h3>Smazat klienta?</h3>
            <p>Tahle akce je nevratná.</p>
            <div className="r">
              <button className="btn gho" onClick={() => setConfirmDel(null)}>Zrušit</button>
              <button className="btn dng" onClick={() => doDelete(confirmDel)}>Smazat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
