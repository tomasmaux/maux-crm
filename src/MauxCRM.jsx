import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

/* ─── KONSTANTY ─── */
const SERVICE_COLORS = {
  "Reality / transakce": "#3518A5",
  "Smlouvy o dílo / výstavba": "#5a3fd4",
  "AML": "#B8923D",
  "Spory / proces": "#c0392b",
  "Korporát": "#1a7a6e",
  "Zápůjčky / úvěry": "#7a5326",
  "Nájemní vztahy": "#2e7d32",
  "Pracovní / NDA": "#6a3d9a",
};
const ALL_SERVICES = Object.keys(SERVICE_COLORS);

const MODULES = [
  { key: "fakturace", label: "Fakturace", live: true },
  { key: "klienti",   label: "Klienti",   live: true },
  { key: "uschovy",   label: "Úschovy",   live: false, desc: "Evidence advokátních úschov a výpočet úroků." },
  { key: "ucetni",    label: "Účetní export", live: false, desc: "Export podkladu pro účetní — základ, DPH, splatnosti." },
  { key: "happy",     label: "Happy Life", live: false, desc: "Osobní finance — spoření, majetek, přehledy." },
];

const fmtKc = (n) => new Intl.NumberFormat("cs-CZ").format(Math.round(n || 0)) + " Kč";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "—";
const uid = () => "id_" + Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;background:#f5f5f5}
.mx{--ink:#3518A5;--ink2:#4a2bc4;--gold:#B8923D;--bg:#ffffff;--bg2:#f8f7ff;--line:#f0f0f0;--line2:#e8e8e8;--mut:#aaa;--txt:#111;
  font-family:'Inter',system-ui,sans-serif;color:var(--txt);background:var(--bg);min-height:100vh;display:flex}
.serif{font-family:'Fraunces',Georgia,serif}
/* sidebar */
.sb{width:210px;flex:0 0 210px;background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;padding:28px 16px;min-height:100vh;position:sticky;top:0}
.brand{padding:4px 8px 32px}
.brand .wm{font-family:'Fraunces',serif;font-size:20px;font-weight:300;color:var(--ink);letter-spacing:.05em}
.brand .sub{font-size:8px;letter-spacing:.5em;text-transform:uppercase;color:var(--gold);margin-top:4px;font-weight:500}
.nav{display:flex;flex-direction:column;gap:1px}
.ni{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:400;color:var(--mut);border:none;background:none;text-align:left;width:100%;transition:.12s;letter-spacing:.01em}
.ni:hover{color:var(--ink);background:var(--bg2)}
.ni.on{color:var(--ink);background:var(--bg2);font-weight:500}
.ni .soon{font-size:8.5px;color:#ccc;letter-spacing:.06em;font-weight:400}
.sbfoot{margin-top:auto;font-size:10px;color:#ccc;line-height:1.7;padding:16px 8px 0;border-top:1px solid var(--line)}
.sbfoot button{background:none;border:none;color:#ccc;font:inherit;font-size:10px;cursor:pointer;padding:0;text-decoration:underline}
.sbfoot button:hover{color:var(--mut)}
/* main */
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.top{padding:36px 44px 0;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.top-l .eyebrow{font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:var(--gold);font-weight:500;margin-bottom:10px}
.top-l h1{font-family:'Fraunces',serif;font-size:32px;font-weight:300;color:var(--txt);letter-spacing:-.01em;line-height:1}
.top-r{display:flex;gap:8px;align-items:center;padding-bottom:4px}
.hr{height:1px;background:var(--line);margin:24px 44px 0}
.body{flex:1;padding:32px 44px 48px}
/* buttons */
.btn{font:inherit;font-size:12px;font-weight:500;border-radius:8px;padding:8px 18px;cursor:pointer;border:1px solid var(--line2);background:#fff;color:var(--ink);transition:.12s;white-space:nowrap;letter-spacing:.02em}
.btn:hover{border-color:var(--ink)}
.btn.pri{background:var(--ink);color:#fff;border-color:var(--ink)}
.btn.pri:hover{background:var(--ink2)}
.btn.gho{background:none;border-color:transparent;color:var(--mut)}
.btn.gho:hover{color:var(--ink);background:var(--bg2)}
.btn.dng{color:#c0392b;border-color:#f5c6c6}
.btn.dng:hover{background:#fff5f5}
.pill{font-size:11px;padding:7px 16px;border-radius:20px;border:1px solid var(--line2);background:#fff;color:var(--mut);cursor:pointer;transition:.12s}
.pill:hover{border-color:var(--ink);color:var(--ink)}
.pill.on{background:var(--ink);color:#fff;border-color:var(--ink)}
/* kpi */
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:36px}
.kpi{padding:22px 24px;border:1px solid var(--line);border-radius:10px;background:#fff}
.kpi .k{font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:12px}
.kpi .v{font-family:'Fraunces',serif;font-size:26px;font-weight:300;color:var(--txt);line-height:1}
.kpi .s{font-size:11px;color:var(--gold);margin-top:8px}
.kpi.hi{background:var(--ink);border-color:var(--ink)}
.kpi.hi .k{color:rgba(255,255,255,.45)}
.kpi.hi .v{color:#fff}
.kpi.hi .s{color:#c5b8f5}
/* table */
.sec-hd{font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}
.sec-hd button{font-size:11px;color:var(--ink);background:none;border:none;cursor:pointer;letter-spacing:0;text-transform:none;font-weight:500;font-family:inherit}
.tbl{width:100%;border-collapse:collapse;margin-bottom:36px}
.tbl th{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#ccc;font-weight:500;padding:0 0 12px;text-align:left;border-bottom:1px solid var(--line)}
.tbl th:last-child,.tbl td:last-child{text-align:right}
.tbl td{padding:15px 0;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tbody tr{cursor:pointer;transition:.1s}
.tbl tbody tr:hover td{background:#fafafa}
.t-name{font-size:13.5px;color:var(--txt);font-weight:400}
.t-sub{font-size:10.5px;color:#ccc;margin-top:3px}
.t-date{font-size:12px;color:var(--mut)}
.t-amt{font-family:'Fraunces',serif;font-size:16px;font-weight:300;color:var(--txt)}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:10px;padding:4px 10px;border-radius:20px;font-weight:400}
.badge::before{content:'';width:5px;height:5px;border-radius:50%;display:inline-block}
.b-ok{background:#edfbf2;color:#1a7040}.b-ok::before{background:#28a862}
.b-wait{background:#fffbee;color:#8a6010}.b-wait::before{background:#d4990f}
.b-late{background:#fff0f0;color:#a02020}.b-late::before{background:#e03030}
.b-vy{background:#f0edfd;color:var(--ink)}.b-vy::before{background:var(--ink)}
/* detail */
.det{background:#fff;border:1px solid var(--line);border-radius:12px;padding:32px 36px;max-width:780px}
.det-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.det h2{font-family:'Fraunces',serif;font-size:28px;font-weight:300;color:var(--txt);line-height:1.1;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.det .reg{font-size:12.5px;color:var(--mut);margin-top:6px;white-space:pre-line;line-height:1.5}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
.fld .l{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:6px}
.fld .d{font-size:14px;color:var(--txt);line-height:1.55}
.fld a{color:var(--ink);text-decoration:none}.fld a:hover{text-decoration:underline}
.bigval{font-family:'Fraunces',serif;font-size:28px;font-weight:300;color:var(--gold)}
.svwrap{display:flex;gap:7px;flex-wrap:wrap;margin-top:3px}
.sdot{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#4a4360;font-weight:400}
.sdot i{width:7px;height:7px;border-radius:50%;display:inline-block}
.notes{margin-top:24px;padding-top:20px;border-top:1px solid var(--line)}
.notes .d{font-size:13.5px;color:#333;line-height:1.65;white-space:pre-wrap}
.actions{display:flex;gap:9px;margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}
/* form */
.form{background:#fff;border:1px solid var(--line);border-radius:12px;padding:30px 34px;max-width:700px}
.form h2{font-family:'Fraunces',serif;font-size:22px;font-weight:300;color:var(--txt);margin-bottom:24px}
.frow{margin-bottom:16px}
.frow label{display:block;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:7px}
.frow input,.frow textarea,.frow select{width:100%;font:inherit;font-size:13.5px;padding:9px 12px;border:1px solid var(--line2);border-radius:8px;outline:none;background:#fff;color:var(--txt);transition:.12s}
.frow input:focus,.frow textarea:focus,.frow select:focus{border-color:var(--ink)}
.frow textarea{resize:vertical;min-height:70px;line-height:1.55}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.svpick{display:flex;gap:7px;flex-wrap:wrap}
.svopt{font-size:11.5px;font-weight:400;padding:6px 12px;border-radius:20px;cursor:pointer;border:1px solid var(--line2);background:#fff;color:var(--mut);transition:.12s}
.svopt.on{background:var(--ink);color:#fff;border-color:var(--ink)}
/* invoice items */
.items-wrap{border:1px solid var(--line2);border-radius:8px;overflow:hidden;margin-bottom:16px}
.item-head{display:grid;grid-template-columns:1fr 80px 100px 100px 36px;gap:8px;padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--line)}
.item-head span{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);font-weight:500}
.item-row{display:grid;grid-template-columns:1fr 80px 100px 100px 36px;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);align-items:center}
.item-row:last-child{border-bottom:none}
.item-row input{font:inherit;font-size:13px;padding:7px 10px;border:1px solid var(--line2);border-radius:6px;outline:none;background:#fff;color:var(--txt);width:100%}
.item-row input:focus{border-color:var(--ink)}
.item-row .amt{font-family:'Fraunces',serif;font-size:14px;color:var(--txt);text-align:right;font-weight:300}
.item-del{background:none;border:none;cursor:pointer;color:#ddd;font-size:16px;padding:0;display:flex;align-items:center;justify-content:center;transition:.12s}
.item-del:hover{color:#c0392b}
.totals{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:16px}
.tot-row{display:flex;justify-content:space-between;font-size:13px;color:var(--mut);padding:3px 0}
.tot-row.final{font-size:15px;color:var(--txt);font-weight:500;border-top:1px solid var(--line2);margin-top:8px;padding-top:10px}
.tot-row.final .tv{font-family:'Fraunces',serif;font-size:18px;font-weight:300;color:var(--ink)}
/* invoice detail */
.inv-det-meta{display:flex;gap:32px;margin:20px 0;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.inv-det-meta .mf .ml{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:5px}
.inv-det-meta .mf .mv{font-size:14px;color:var(--txt)}
.inv-items-det{width:100%;border-collapse:collapse;margin:20px 0}
.inv-items-det th{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);font-weight:500;padding:0 0 10px;text-align:left;border-bottom:1px solid var(--line)}
.inv-items-det th:last-child,.inv-items-det td:last-child{text-align:right}
.inv-items-det td{padding:12px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.inv-items-det tr:last-child td{border-bottom:none}
.inv-totals{margin-top:16px;padding:16px;background:var(--bg2);border-radius:8px}
/* filters */
.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.fchip{font-size:11.5px;font-weight:400;padding:5px 12px;border-radius:20px;cursor:pointer;border:1px solid var(--line2);background:#fff;color:var(--mut);transition:.12s}
.fchip:hover{border-color:var(--ink)}
.fchip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
/* search */
.search{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line2);border-radius:9px;padding:9px 13px;flex:1;min-width:180px}
.search input{border:none;outline:none;font:inherit;font-size:13.5px;width:100%;background:none;color:var(--txt)}
/* tag */
.tag{font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:600;border-radius:5px;padding:2px 6px}
.tag.firma{background:#ede8fd;color:var(--ink)}
.tag.osoba{background:#fdf5e8;color:var(--gold)}
.stat-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.stat{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 18px;min-width:130px;flex:1}
.stat .k{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);font-weight:500}
.stat .v{font-size:20px;font-weight:500;color:var(--ink);margin-top:3px;font-variant-numeric:tabular-nums}
.stat.gold .v{color:var(--gold)}
/* tools row */
.tools{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
/* status badge in forms */
.sbadge{font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;border-radius:5px;padding:2px 7px}
.status-aktivní{background:#edfbf2;color:#1a7040}
.status-spící{background:#fdf5e8;color:#7a5a1a}
.status-ukončený{background:#fff0f0;color:#a02020}
/* placeholder */
.ph{max-width:520px;background:#fff;border:1px dashed #e0daf5;border-radius:12px;padding:48px 40px;text-align:center}
.ph .ic{font-size:32px;color:var(--ink);opacity:.25}
.ph h2{font-family:'Fraunces',serif;font-size:22px;font-weight:300;color:var(--txt);margin:16px 0 8px}
.ph .ph2{display:inline-block;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:500;border:1px solid #f0dcb8;border-radius:4px;padding:3px 10px;margin-bottom:14px}
.ph p{font-size:13.5px;color:var(--mut);line-height:1.65}
/* lock */
.lock{flex:1;display:flex;align-items:center;justify-content:center;background:#fff;min-height:100vh}
.lockcard{text-align:center;max-width:340px;width:100%;padding:48px 40px;border:1px solid var(--line);border-radius:16px}
.lockcard .wm{font-family:'Fraunces',serif;font-size:32px;font-weight:300;color:var(--ink);letter-spacing:.05em}
.lockcard .sub{font-size:8px;letter-spacing:.5em;text-transform:uppercase;color:var(--gold);margin-top:6px;font-weight:500}
.lockcard p{font-size:12.5px;color:var(--mut);margin:24px 0 8px;line-height:1.6}
.lockcard .field{margin-bottom:12px;text-align:left}
.lockcard .field label{display:block;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);margin-bottom:6px;font-weight:500}
.lockcard input{width:100%;font:inherit;font-size:14px;padding:11px 14px;border-radius:9px;border:1px solid var(--line2);outline:none;color:var(--txt);transition:.12s}
.lockcard input:focus{border-color:var(--ink)}
.lockcard .btn-login{width:100%;margin-top:8px;padding:12px;font-size:14px;font-weight:500;border-radius:9px;border:none;background:var(--ink);color:#fff;cursor:pointer;transition:.15s;font-family:inherit}
.lockcard .btn-login:hover{background:var(--ink2)}
.lockcard .btn-login:disabled{opacity:.6;cursor:not-allowed}
.lockcard .err{color:#c0392b;font-size:11.5px;margin-top:10px;min-height:14px}
/* overlay */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;z-index:99}
.cf{background:#fff;border-radius:12px;padding:28px 32px;max-width:340px;text-align:center;border:1px solid var(--line)}
.cf h3{font-size:17px;color:var(--txt);font-weight:500;margin-bottom:8px}
.cf p{font-size:13px;color:var(--mut);line-height:1.5;margin-bottom:20px}
.cf .r{display:flex;gap:10px;justify-content:center}
.loading{padding:60px;text-align:center;color:var(--mut);font-size:13.5px}
@media(max-width:800px){.mx{flex-direction:column}.sb{width:100%;min-height:auto;position:relative;flex-direction:row;padding:14px;gap:6px}.brand{padding:0 12px 0 0;flex:0 0 auto}.nav{flex-direction:row;flex-wrap:wrap;gap:4px}.ni{width:auto;padding:7px 12px}.sbfoot{display:none}.top{padding:20px 20px 0}.hr{margin:16px 20px 0}.body{padding:20px 20px 32px}.kpi-row{grid-template-columns:1fr}.grid2,.two,.three{grid-template-columns:1fr}.item-head,.item-row{grid-template-columns:1fr 60px 80px 80px 30px}}
`;

/* ─── SUPABASE DATA LAYER ─── */
async function fetchClients() {
  const { data, error } = await supabase.from("clients").select("*").order("invoiced", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function upsertClient(c) {
  const { error } = await supabase.from("clients").upsert({ ...c, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function deleteClientDb(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
async function fetchInvoices() {
  const { data, error } = await supabase.from("invoices").select("*, clients(name, ico)").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function upsertInvoice(inv) {
  const { clients: _c, ...rest } = inv;
  const { error } = await supabase.from("invoices").upsert({ ...rest, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function deleteInvoiceDb(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

/* ─── HELPERS ─── */
function computeInvoiceTotals(items) {
  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const vatAmount = Math.round(subtotal * 0.21);
  const total = subtotal + vatAmount;
  return { subtotal, vat_amount: vatAmount, total };
}
function nextInvoiceNumber(invoices) {
  const year = new Date().getFullYear();
  const nums = invoices
    .map(i => { const m = (i.invoice_number || "").match(/(\d+)$/); return m ? parseInt(m[1]) : 0; })
    .filter(n => n > 0);
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `FA ${year}/${String(next).padStart(3, "0")}`;
}
function invoiceStatus(inv) {
  if (inv.status === "uhrazena") return "uhrazena";
  if (inv.due_date && new Date(inv.due_date) < new Date()) return "po_splatnosti";
  return "vystavena";
}

/* ─── COMPONENTS ─── */
function ServiceDots({ list, max = 3 }) {
  const show = (list || []).slice(0, max);
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {show.map(s => (
        <span className="sdot" key={s}><i style={{ background: SERVICE_COLORS[s] || "#aaa" }} />{s.split(" / ")[0]}</span>
      ))}
      {(list || []).length > max && <span style={{ fontSize: 11, color: "var(--mut)" }}>+{list.length - max}</span>}
    </div>
  );
}

function Sidebar({ mod, setMod, onLogout }) {
  return (
    <aside className="sb">
      <div className="brand">
        <div className="wm serif">MAUX</div>
        <div className="sub">Legal · CRM</div>
      </div>
      <nav className="nav">
        {MODULES.map(m => (
          <button key={m.key} className={"ni" + (mod === m.key ? " on" : "")} onClick={() => setMod(m.key)}>
            {m.label}
            {!m.live && <span className="soon">brzy</span>}
          </button>
        ))}
      </nav>
      <div className="sbfoot">
        Mgr. Tomáš Maux<br />
        Poděbrady · {new Date().getFullYear()}<br />
        <button onClick={onLogout}>Odhlásit se</button>
      </div>
    </aside>
  );
}

/* ─── FAKTURACE ─── */
function InvoiceList({ invoices, clients, onOpen, onNew, loading }) {
  const [filter, setFilter] = useState("vse");
  const total = useMemo(() => invoices.reduce((s, i) => s + (i.total || 0), 0), [invoices]);
  const nezaplaceno = useMemo(() => invoices.filter(i => invoiceStatus(i) !== "uhrazena").reduce((s, i) => s + (i.total || 0), 0), [invoices]);
  const poSplatnosti = useMemo(() => invoices.filter(i => invoiceStatus(i) === "po_splatnosti").reduce((s, i) => s + (i.total || 0), 0), [invoices]);

  const filtered = useMemo(() => {
    if (filter === "vse") return invoices;
    if (filter === "ceka") return invoices.filter(i => invoiceStatus(i) === "vystavena");
    if (filter === "pozde") return invoices.filter(i => invoiceStatus(i) === "po_splatnosti");
    return invoices;
  }, [invoices, filter]);

  const statusBadge = (inv) => {
    const s = invoiceStatus(inv);
    if (s === "uhrazena") return <span className="badge b-ok">Uhrazeno</span>;
    if (s === "po_splatnosti") return <span className="badge b-late">Po splatnosti</span>;
    return <span className="badge b-vy">Vystavena</span>;
  };

  return (
    <>
      <div className="kpi-row">
        <div className="kpi hi">
          <div className="k">Fakturováno YTD</div>
          <div className="v">{fmtKc(total)}</div>
          <div className="s">{invoices.length} faktur celkem</div>
        </div>
        <div className="kpi">
          <div className="k">Neuhrazeno</div>
          <div className="v">{fmtKc(nezaplaceno)}</div>
          <div className="s">čeká na platbu</div>
        </div>
        <div className="kpi">
          <div className="k">Po splatnosti</div>
          <div className="v">{fmtKc(poSplatnosti)}</div>
          <div className="s" style={{ color: poSplatnosti > 0 ? "#c0392b" : "var(--gold)" }}>
            {poSplatnosti > 0 ? "nutná akce" : "vše v pořádku"}
          </div>
        </div>
      </div>
      <div className="sec-hd">
        <span>Faktury</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["vse","Vše"],["ceka","Čeká"],["pozde","Po splatnosti"]].map(([k,l]) => (
          <span key={k} className={"fchip"+(filter===k?" on":"")} onClick={()=>setFilter(k)}>{l}</span>
        ))}
        <button className="btn pri" onClick={onNew} style={{ marginLeft: "auto" }}>+ Nová faktura</button>
      </div>
      {loading && <div className="loading">Načítám faktury…</div>}
      {!loading && (
        <table className="tbl">
          <thead><tr>
            <th>Klient</th><th>Číslo faktury</th><th>Vystavena</th><th>Splatnost</th><th>Částka s DPH</th><th>Stav</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--mut)" }}>Žádné faktury</td></tr>
            )}
            {filtered.map(inv => (
              <tr key={inv.id} onClick={() => onOpen(inv.id)}>
                <td>
                  <div className="t-name">{inv.clients?.name || "—"}</div>
                  {inv.clients?.ico && <div className="t-sub">IČO: {inv.clients.ico}</div>}
                </td>
                <td className="t-date">{inv.invoice_number}</td>
                <td className="t-date">{fmtDate(inv.issue_date)}</td>
                <td className="t-date">{fmtDate(inv.due_date)}</td>
                <td className="t-amt">{fmtKc(inv.total)}</td>
                <td>{statusBadge(inv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function InvoiceDetail({ inv, clients, onBack, onEdit, onDelete }) {
  const clientName = inv.clients?.name || clients.find(c => c.id === inv.client_id)?.name || "—";
  const items = inv.items || [];
  const s = invoiceStatus(inv);

  return (
    <div className="det" style={{ maxWidth: 720 }}>
      <div className="det-head">
        <div>
          <div style={{ fontSize: 9, letterSpacing: ".25em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 500, marginBottom: 8 }}>Faktura</div>
          <h2 className="serif" style={{ fontSize: 26 }}>{inv.invoice_number}</h2>
        </div>
        <div style={{ paddingTop: 4 }}>
          {s === "uhrazena" && <span className="badge b-ok">Uhrazeno</span>}
          {s === "po_splatnosti" && <span className="badge b-late">Po splatnosti</span>}
          {s === "vystavena" && <span className="badge b-vy">Vystavena</span>}
        </div>
      </div>
      <div className="inv-det-meta">
        <div className="mf"><div className="ml">Klient</div><div className="mv">{clientName}</div></div>
        <div className="mf"><div className="ml">Vystavena</div><div className="mv">{fmtDate(inv.issue_date)}</div></div>
        <div className="mf"><div className="ml">Splatnost</div><div className="mv">{fmtDate(inv.due_date)}</div></div>
        <div className="mf"><div className="ml">Celkem s DPH</div><div className="mv" style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 300, color: "var(--gold)" }}>{fmtKc(inv.total)}</div></div>
      </div>
      <table className="inv-items-det">
        <thead><tr><th style={{width:"50%"}}>Popis</th><th>Hodin</th><th>Sazba/h</th><th>Částka</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{it.description || "—"}</td>
              <td>{it.hours ? `${it.hours} h` : "—"}</td>
              <td>{it.rate ? fmtKc(it.rate) : "—"}</td>
              <td style={{ textAlign: "right", fontFamily: "Fraunces, serif", fontWeight: 300 }}>{fmtKc(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inv-totals">
        <div className="tot-row"><span>Základ daně</span><span>{fmtKc(inv.subtotal)}</span></div>
        <div className="tot-row"><span>DPH 21 %</span><span>{fmtKc(inv.vat_amount)}</span></div>
        <div className="tot-row final"><span>Celkem k úhradě</span><span className="tv">{fmtKc(inv.total)}</span></div>
      </div>
      {inv.notes && (
        <div className="notes">
          <div className="fld"><div className="l">Poznámka</div><div className="d">{inv.notes}</div></div>
        </div>
      )}
      <div className="actions">
        <button className="btn gho" onClick={onBack}>← Zpět</button>
        <button className="btn" onClick={onEdit}>Upravit</button>
        <button className="btn dng" onClick={onDelete} style={{ marginLeft: "auto" }}>Smazat</button>
      </div>
    </div>
  );
}

function InvoiceForm({ init, clients, invoices, onSave, onCancel, saving }) {
  const defaultItem = () => ({ id: uid(), description: "", hours: "", rate: "", amount: 0 });
  const [d, setD] = useState(() => init || {
    id: uid(),
    invoice_number: nextInvoiceNumber(invoices),
    client_id: "",
    issue_date: today(),
    due_date: addDays(today(), 14),
    items: [defaultItem()],
    subtotal: 0, vat_rate: 21, vat_amount: 0, total: 0,
    status: "vystavena",
    notes: "",
  });

  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const updateItem = (idx, field, val) => {
    const items = d.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === "hours" || field === "rate") {
        const h = field === "hours" ? Number(val) : Number(it.hours);
        const r = field === "rate" ? Number(val) : Number(it.rate);
        updated.amount = h && r ? Math.round(h * r) : (Number(it.amount) || 0);
      }
      return updated;
    });
    const totals = computeInvoiceTotals(items);
    setD(p => ({ ...p, items, ...totals }));
  };

  const addItem = () => {
    const clientRate = clients.find(c => c.id === d.client_id)?.hourly_rate || "";
    setD(p => ({ ...p, items: [...p.items, { ...defaultItem(), rate: clientRate }] }));
  };

  const removeItem = (idx) => {
    const items = d.items.filter((_, i) => i !== idx);
    const totals = computeInvoiceTotals(items);
    setD(p => ({ ...p, items, ...totals }));
  };

  const onClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const rate = client?.hourly_rate || "";
    const items = d.items.map(it => {
      if (it.rate) return it;
      return { ...it, rate };
    });
    const totals = computeInvoiceTotals(items);
    setD(p => ({ ...p, client_id: clientId, items, ...totals }));
  };

  const save = () => {
    if (!d.client_id || !d.invoice_number) return;
    onSave(d);
  };

  return (
    <div className="form" style={{ maxWidth: 760 }}>
      <h2>{init ? "Upravit fakturu" : "Nová faktura"}</h2>
      <div className="two">
        <div className="frow">
          <label>Číslo faktury *</label>
          <input value={d.invoice_number} onChange={e => set("invoice_number", e.target.value)} />
        </div>
        <div className="frow">
          <label>Stav</label>
          <select value={d.status} onChange={e => set("status", e.target.value)}>
            <option value="vystavena">Vystavena</option>
            <option value="uhrazena">Uhrazena</option>
          </select>
        </div>
      </div>
      <div className="frow">
        <label>Klient *</label>
        <select value={d.client_id} onChange={e => onClientChange(e.target.value)}>
          <option value="">— vyber klienta —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.ico ? ` (${c.ico})` : ""}</option>)}
        </select>
      </div>
      <div className="two">
        <div className="frow">
          <label>Datum vystavení</label>
          <input type="date" value={d.issue_date} onChange={e => set("issue_date", e.target.value)} />
        </div>
        <div className="frow">
          <label>Datum splatnosti</label>
          <input type="date" value={d.due_date} onChange={e => set("due_date", e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label>Položky faktury</label>
        <div className="items-wrap">
          <div className="item-head">
            <span>Popis práce</span><span>Hodin</span><span>Sazba / h</span><span>Částka</span><span></span>
          </div>
          {d.items.map((it, idx) => (
            <div className="item-row" key={it.id}>
              <input placeholder="Popis práce…" value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} />
              <input type="number" placeholder="0" value={it.hours} onChange={e => updateItem(idx, "hours", e.target.value)} min="0" step="0.5" />
              <input type="number" placeholder="0" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} min="0" />
              <div className="amt">{fmtKc(it.amount)}</div>
              <button className="item-del" onClick={() => removeItem(idx)} title="Smazat">×</button>
            </div>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 8 }} onClick={addItem}>+ Přidat položku</button>
      </div>
      <div className="totals">
        <div className="tot-row"><span>Základ daně</span><span>{fmtKc(d.subtotal)}</span></div>
        <div className="tot-row"><span>DPH 21 %</span><span>{fmtKc(d.vat_amount)}</span></div>
        <div className="tot-row final"><span>Celkem k úhradě</span><span className="tv">{fmtKc(d.total)}</span></div>
      </div>
      <div className="frow">
        <label>Poznámka (volitelné)</label>
        <textarea value={d.notes} onChange={e => set("notes", e.target.value)} placeholder="Variabilní symbol, IBAN, poznámka pro klienta…" />
      </div>
      <div className="actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 8 }}>
        <button className="btn gho" onClick={onCancel}>Zrušit</button>
        <button className="btn pri" onClick={save} disabled={saving} style={{ marginLeft: "auto" }}>
          {saving ? "Ukládám…" : "Uložit fakturu"}
        </button>
      </div>
    </div>
  );
}

/* ─── KLIENTI ─── */
function ClientList({ clients, query, setQuery, filter, setFilter, onOpen, onNew }) {
  const sum = useMemo(() => clients.reduce((a, c) => a + (c.invoiced || 0), 0), [clients]);
  const firmy = clients.filter(c => c.type === "firma").length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter(c => !filter || (c.services || []).includes(filter))
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.contact || "").toLowerCase().includes(q) || (c.notes || "").toLowerCase().includes(q) || (c.emails || []).join(" ").toLowerCase().includes(q))
      .sort((a, b) => (b.invoiced || 0) - (a.invoiced || 0));
  }, [clients, query, filter]);

  return (
    <>
      <div className="stat-row">
        <div className="stat"><div className="k">Klientů</div><div className="v">{clients.length}</div></div>
        <div className="stat gold"><div className="k">Fakturováno celkem</div><div className="v">{fmtKc(sum)}</div></div>
        <div className="stat"><div className="k">Firmy / osoby</div><div className="v">{firmy} / {clients.length - firmy}</div></div>
      </div>
      <div className="tools">
        <div className="search"><span style={{ color: "#ccc" }}>⌕</span>
          <input placeholder="Hledat klienta, kontakt, e-mail…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button className="btn pri" onClick={onNew}>+ Nový klient</button>
      </div>
      <div className="filters">
        <span className={"fchip" + (!filter ? " on" : "")} onClick={() => setFilter(null)}>Vše</span>
        {ALL_SERVICES.map(s => (
          <span key={s} className={"fchip" + (filter === s ? " on" : "")} onClick={() => setFilter(filter === s ? null : s)}>{s}</span>
        ))}
      </div>
      <table className="tbl">
        <thead><tr>
          <th>Klient</th><th>Kontakt</th><th>Specializace</th><th>Fakturováno</th>
        </tr></thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--mut)" }}>Nic neodpovídá filtru.</td></tr>}
          {filtered.map(c => (
            <tr key={c.id} onClick={() => onOpen(c.id)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span className="t-name">{c.name}</span>
                  <span className={"tag " + c.type}>{c.type}</span>
                  {c.status && c.status !== "aktivní" && <span className={"sbadge status-" + c.status}>{c.status}</span>}
                </div>
              </td>
              <td className="t-date">{c.contact || "—"}</td>
              <td><ServiceDots list={c.services || []} /></td>
              <td className="t-amt">{fmtKc(c.invoiced)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ClientDetail({ c, onBack, onEdit, onDelete }) {
  return (
    <div className="det">
      <h2 className="serif">
        {c.name}
        <span className={"tag " + c.type}>{c.type}</span>
        {c.status && c.status !== "aktivní" && <span className={"sbadge status-" + c.status}>{c.status}</span>}
        {c.uschovaaml && <span className="sbadge" style={{ background: "#fdf5e8", color: "#7a5a1a" }}>Úschova / AML</span>}
      </h2>
      {c.reg && <div className="reg">{c.reg}</div>}
      <div className="grid2">
        <div className="fld"><div className="l">Kontaktní osoba</div><div className="d">{c.contact || "—"}</div></div>
        <div className="fld"><div className="l">Fakturováno (letos)</div><div className="bigval">{fmtKc(c.invoiced)}</div></div>
        <div className="fld"><div className="l">E-maily</div><div className="d">
          {(c.emails || []).length ? (c.emails || []).map(e => <div key={e}><a href={"mailto:" + e}>{e}</a></div>) : "—"}
        </div></div>
        <div className="fld"><div className="l">Specializace</div>
          <div className="svwrap">
            {(c.services || []).length ? (c.services || []).map(s => (
              <span className="sdot" key={s}><i style={{ background: SERVICE_COLORS[s] || "#aaa" }} />{s}</span>
            )) : <span className="d">—</span>}
          </div>
        </div>
        {c.hourly_rate > 0 && <div className="fld"><div className="l">Hodinová sazba</div><div className="d">{fmtKc(c.hourly_rate)} / h</div></div>}
        {c.last_work_date && <div className="fld"><div className="l">Datum poslední práce</div><div className="d">{fmtDate(c.last_work_date)}</div></div>}
        {c.file_link && <div className="fld"><div className="l">Odkaz na spis</div><div className="d"><a href={c.file_link} target="_blank" rel="noopener noreferrer">Otevřít spis →</a></div></div>}
      </div>
      {c.notes && <div className="notes"><div className="fld l" style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500, marginBottom: 6 }}>Poznámky</div><div className="d notes">{c.notes}</div></div>}
      <div className="actions">
        <button className="btn gho" onClick={onBack}>← Zpět</button>
        <button className="btn" onClick={onEdit}>Upravit</button>
        <button className="btn dng" onClick={onDelete} style={{ marginLeft: "auto" }}>Smazat</button>
      </div>
    </div>
  );
}

function ClientForm({ init, onSave, onCancel, saving }) {
  const [d, setD] = useState(() => init || {
    id: uid(), name: "", type: "firma", ico: "", reg: "", invoiced: 0,
    contact: "", emails: [], services: [], notes: "",
    status: "aktivní", uschovaaml: false, last_work_date: "", file_link: "", hourly_rate: 0,
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const toggleSv = (s) => setD(p => ({
    ...p, services: (p.services || []).includes(s) ? (p.services || []).filter(x => x !== s) : [...(p.services || []), s]
  }));
  const save = () => {
    if (!d.name.trim()) return;
    const emails = typeof d.emails === "string"
      ? d.emails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean)
      : d.emails;
    onSave({ ...d, name: d.name.trim(), invoiced: Number(d.invoiced) || 0, hourly_rate: Number(d.hourly_rate) || 0, emails });
  };
  const emailStr = Array.isArray(d.emails) ? d.emails.join(", ") : d.emails;

  return (
    <div className="form">
      <h2>{init ? "Upravit klienta" : "Nový klient"}</h2>
      <div className="frow"><label>Název klienta *</label><input value={d.name} onChange={e => set("name", e.target.value)} /></div>
      <div className="three">
        <div className="frow"><label>Typ</label><select value={d.type} onChange={e => set("type", e.target.value)}>
          <option value="firma">firma</option><option value="osoba">osoba</option>
        </select></div>
        <div className="frow"><label>Stav</label><select value={d.status || "aktivní"} onChange={e => set("status", e.target.value)}>
          <option value="aktivní">aktivní</option><option value="spící">spící</option><option value="ukončený">ukončený</option>
        </select></div>
        <div className="frow"><label>IČO</label><input value={d.ico || ""} onChange={e => set("ico", e.target.value)} /></div>
      </div>
      <div className="frow"><label>Identifikace / adresa</label><input value={d.reg || ""} onChange={e => set("reg", e.target.value)} /></div>
      <div className="three">
        <div className="frow"><label>Kontaktní osoba</label><input value={d.contact || ""} onChange={e => set("contact", e.target.value)} /></div>
        <div className="frow"><label>Fakturováno (Kč)</label><input type="number" value={d.invoiced || 0} onChange={e => set("invoiced", e.target.value)} /></div>
        <div className="frow"><label>Hodinová sazba (Kč)</label><input type="number" value={d.hourly_rate || 0} onChange={e => set("hourly_rate", e.target.value)} /></div>
      </div>
      <div className="frow"><label>E-maily (oddělit čárkou)</label><input value={emailStr || ""} onChange={e => set("emails", e.target.value)} /></div>
      <div className="two">
        <div className="frow"><label>Datum poslední práce</label><input type="date" value={d.last_work_date || ""} onChange={e => set("last_work_date", e.target.value)} /></div>
        <div className="frow"><label>Odkaz na spis</label><input value={d.file_link || ""} onChange={e => set("file_link", e.target.value)} placeholder="https://…" /></div>
      </div>
      <div className="frow"><label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, textTransform: "none", letterSpacing: 0 }}>
        <input type="checkbox" checked={!!d.uschovaaml} onChange={e => set("uschovaaml", e.target.checked)} style={{ width: "auto", margin: 0 }} />
        Klient s úschovou nebo AML povinností
      </label></div>
      <div className="frow"><label>Specializace</label>
        <div className="svpick">{ALL_SERVICES.map(s => (
          <span key={s} className={"svopt" + ((d.services || []).includes(s) ? " on" : "")} onClick={() => toggleSv(s)}>{s}</span>
        ))}</div>
      </div>
      <div className="frow"><label>Poznámky</label><textarea value={d.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
      <div className="actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 8 }}>
        <button className="btn gho" onClick={onCancel}>Zrušit</button>
        <button className="btn pri" onClick={save} disabled={saving} style={{ marginLeft: "auto" }}>{saving ? "Ukládám…" : "Uložit"}</button>
      </div>
    </div>
  );
}

function Placeholder({ m }) {
  return (
    <div className="ph">
      <h2 className="serif">{m.label}</h2>
      <div style={{ marginTop: 12 }}><span className="ph2">Brzy</span></div>
      <p>{m.desc}</p>
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
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setErr("Nesprávný e-mail nebo heslo."); setLoading(false); }
  };
  return (
    <div className="lock">
      <div className="lockcard">
        <div className="wm serif">MAUX</div>
        <div className="sub">Legal · CRM</div>
        <p>Interní systém kanceláře.<br />Přihlášení je chráněno.</p>
        <div className="field"><label>E-mail</label>
          <input type="email" placeholder="tomas@maux.cz" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && go()} autoFocus />
        </div>
        <div className="field"><label>Heslo</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && go()} />
        </div>
        <button className="btn-login" onClick={go} disabled={loading}>{loading ? "Přihlašuji…" : "Vstoupit do CRM"}</button>
        <div className="err">{err}</div>
      </div>
    </div>
  );
}

function PasswordReset({ onDone }) {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false);
  const save = async () => {
    if (pw.length < 8) { setErr("Heslo musí mít alespoň 8 znaků."); return; }
    if (pw !== pw2) { setErr("Hesla se neshodují."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErr(error.message); setLoading(false); return; }
    setDone(true); setTimeout(onDone, 2000);
  };
  return (
    <div className="lock"><div className="lockcard">
      <div className="wm serif">MAUX</div><div className="sub">Legal · CRM</div>
      <p>Nastav si nové heslo.</p>
      {done ? <div style={{ color: "var(--gold)", marginTop: 16 }}>Heslo změněno. Přihlašuji…</div> : <>
        <div className="field"><label>Nové heslo</label><input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} autoFocus /></div>
        <div className="field"><label>Zopakuj heslo</label><input type="password" value={pw2} onChange={e => { setPw2(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && save()} /></div>
        <button className="btn-login" onClick={save} disabled={loading}>{loading ? "Ukládám…" : "Nastavit heslo"}</button>
        <div className="err">{err}</div>
      </>}
    </div></div>
  );
}

/* ─── MAIN APP ─── */
export default function MauxCRM() {
  const [session, setSession] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [mod, setMod] = useState("fakturace");
  const [mode, setMode] = useState("list");
  const [sel, setSel] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setPasswordRecovery(true); setSession(session); }
      else { setSession(session); setPasswordRecovery(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setDataLoading(true);
    Promise.all([fetchClients(), fetchInvoices()])
      .then(([c, i]) => { setClients(c); setInvoices(i); })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); setClients([]); setInvoices([]); };

  const saveClient = async (c) => {
    setSaving(true);
    try { await upsertClient(c); const updated = await fetchClients(); setClients(updated); setSel(c.id); setMode("detail"); }
    catch (e) { alert("Chyba: " + e.message); } finally { setSaving(false); }
  };
  const doDeleteClient = async (id) => {
    try { await deleteClientDb(id); setClients(p => p.filter(c => c.id !== id)); setConfirmDel(null); setMode("list"); setSel(null); }
    catch (e) { alert("Chyba: " + e.message); }
  };
  const saveInvoice = async (inv) => {
    setSaving(true);
    try { await upsertInvoice(inv); const updated = await fetchInvoices(); setInvoices(updated); setSel(inv.id); setMode("detail"); }
    catch (e) { alert("Chyba: " + e.message); } finally { setSaving(false); }
  };
  const doDeleteInvoice = async (id) => {
    try { await deleteInvoiceDb(id); setInvoices(p => p.filter(i => i.id !== id)); setConfirmDel(null); setMode("list"); setSel(null); }
    catch (e) { alert("Chyba: " + e.message); }
  };

  const selClient = clients.find(c => c.id === sel);
  const selInvoice = invoices.find(i => i.id === sel);
  const curMod = MODULES.find(m => m.key === mod);

  const pageTitle = () => {
    if (mod === "klienti") {
      if (mode === "new") return "Nový klient";
      if (mode === "edit") return "Upravit klienta";
      if (mode === "detail" && selClient) return selClient.name;
      return "Klienti";
    }
    if (mod === "fakturace") {
      if (mode === "new") return "Nová faktura";
      if (mode === "edit") return "Upravit fakturu";
      if (mode === "detail" && selInvoice) return selInvoice.invoice_number;
      return "Fakturace";
    }
    return curMod?.label || "";
  };

  if (session === undefined) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <style>{CSS}</style>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#3518A5", fontWeight: 300 }}>MAUX</div>
    </div>
  );
  if (passwordRecovery) return <div className="mx"><style>{CSS}</style><PasswordReset onDone={() => setPasswordRecovery(false)} /></div>;
  if (!session) return <div className="mx"><style>{CSS}</style><Lock onOk={() => {}} /></div>;

  return (
    <div className="mx">
      <style>{CSS}</style>
      <Sidebar mod={mod} setMod={k => { setMod(k); setMode("list"); setSel(null); }} onLogout={handleLogout} />
      <div className="main">
        <div className="top">
          <div className="top-l">
            <div className="eyebrow">MAUX Legal · {curMod?.label}</div>
            <h1 className="serif">{pageTitle()}</h1>
          </div>
          <div className="top-r">
          </div>
        </div>
        <div className="hr" />
        <div className="body">
          {!curMod?.live && <Placeholder m={curMod} />}

          {/* FAKTURACE */}
          {mod === "fakturace" && curMod?.live && mode === "list" && (
            <InvoiceList invoices={invoices} clients={clients} onOpen={id => { setSel(id); setMode("detail"); }} onNew={() => setMode("new")} loading={dataLoading} />
          )}
          {mod === "fakturace" && mode === "detail" && selInvoice && (
            <InvoiceDetail inv={selInvoice} clients={clients} onBack={() => setMode("list")} onEdit={() => setMode("edit")} onDelete={() => setConfirmDel(selInvoice.id)} />
          )}
          {mod === "fakturace" && mode === "edit" && selInvoice && (
            <InvoiceForm init={selInvoice} clients={clients} invoices={invoices} onSave={saveInvoice} onCancel={() => setMode("detail")} saving={saving} />
          )}
          {mod === "fakturace" && mode === "new" && (
            <InvoiceForm clients={clients} invoices={invoices} onSave={saveInvoice} onCancel={() => setMode("list")} saving={saving} />
          )}

          {/* KLIENTI */}
          {mod === "klienti" && mode === "list" && (
            <ClientList clients={clients} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onOpen={id => { setSel(id); setMode("detail"); }} onNew={() => setMode("new")} />
          )}
          {mod === "klienti" && mode === "detail" && selClient && (
            <ClientDetail c={selClient} onBack={() => setMode("list")} onEdit={() => setMode("edit")} onDelete={() => setConfirmDel(selClient.id)} />
          )}
          {mod === "klienti" && mode === "edit" && selClient && (
            <ClientForm init={selClient} onSave={saveClient} onCancel={() => setMode("detail")} saving={saving} />
          )}
          {mod === "klienti" && mode === "new" && (
            <ClientForm onSave={saveClient} onCancel={() => setMode("list")} saving={saving} />
          )}
        </div>
      </div>

      {confirmDel && (
        <div className="ov" onClick={() => setConfirmDel(null)}>
          <div className="cf" onClick={e => e.stopPropagation()}>
            <h3>Smazat?</h3>
            <p>Tato akce je nevratná.</p>
            <div className="r">
              <button className="btn gho" onClick={() => setConfirmDel(null)}>Zrušit</button>
              <button className="btn dng" onClick={() => {
                if (mod === "klienti") doDeleteClient(confirmDel);
                else doDeleteInvoice(confirmDel);
              }}>Smazat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
