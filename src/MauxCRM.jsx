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
  { key: "dashboard",  label: "Přehled",      live: true },
  { key: "vykaz",      label: "Výkaz práce",  live: true },
  { key: "fakturace",  label: "Fakturace",    live: true },
  { key: "klienti",    label: "Klienti",      live: true },
  { key: "uschovy",    label: "Úschovy",      live: false, desc: "Evidence advokátních úschov a výpočet úroků." },
  { key: "ucetni",     label: "Účetní export",live: false, desc: "Export podkladu pro účetní — základ, DPH, splatnosti." },
  { key: "happy",      label: "Happy Life",   live: false, desc: "Osobní finance — spoření, majetek, přehledy." },
];

const fmtKc = (n) => new Intl.NumberFormat("cs-CZ").format(Math.round(n || 0)) + " Kč";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "—";
const uid = () => "id_" + Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;background:#F0EFF8}
.mx{--ink:#3518A5;--ink2:#2810a0;--ink3:#4a2bc4;--gold:#B8923D;--gold2:#d4a84b;--bg:#F0EFF8;--surface:#FFFFFF;--line:#E8E6F2;--line2:#D4D1E8;--mut:#9896A8;--txt:#18162A;
  font-family:'Inter',system-ui,sans-serif;color:var(--txt);background:var(--bg);min-height:100vh;display:flex;font-size:14px;line-height:1.5}
.serif{font-family:'Fraunces',Georgia,serif}
.sb{width:224px;flex:0 0 224px;background:#1A0E5C;display:flex;flex-direction:column;padding:28px 14px 24px;min-height:100vh;position:sticky;top:0}
.brand{padding:2px 8px 32px}
.brand .wm{font-family:'Fraunces',serif;font-size:21px;font-weight:400;color:#fff;letter-spacing:.08em}
.brand .sub{font-size:7.5px;letter-spacing:.45em;text-transform:uppercase;color:var(--gold2);margin-top:4px;font-weight:600;opacity:.9}
.nav{display:flex;flex-direction:column;gap:2px}
.ni{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:9px;cursor:pointer;font-size:12.5px;font-weight:400;color:rgba(255,255,255,.5);border:none;background:none;text-align:left;width:100%;transition:all .15s;letter-spacing:.01em}
.ni:hover{color:rgba(255,255,255,.85);background:rgba(255,255,255,.07)}
.ni.on{color:#fff;background:rgba(255,255,255,.12);font-weight:500}
.ni.on::before{content:'';display:inline-block;width:3px;height:16px;background:var(--gold2);border-radius:2px;margin-right:10px;flex-shrink:0}
.ni:not(.on)::before{content:'';display:inline-block;width:3px;height:16px;border-radius:2px;margin-right:10px;flex-shrink:0;opacity:0}
.ni .soon{font-size:8px;color:rgba(255,255,255,.2);letter-spacing:.04em;font-weight:400;background:rgba(255,255,255,.06);border-radius:4px;padding:2px 6px}
.sbfoot{margin-top:auto;font-size:10.5px;color:rgba(255,255,255,.25);line-height:1.7;padding:16px 8px 0;border-top:1px solid rgba(255,255,255,.08)}
.sbfoot button{background:none;border:none;color:rgba(255,255,255,.25);font:inherit;font-size:10.5px;cursor:pointer;padding:0;text-decoration:underline;transition:.12s}
.sbfoot button:hover{color:rgba(255,255,255,.5)}
.main{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--bg)}
.top{padding:32px 40px 0;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.top-l .eyebrow{font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--ink);font-weight:600;opacity:.5;margin-bottom:8px}
.top-l h1{font-family:'Fraunces',serif;font-size:32px;font-weight:300;color:var(--txt);line-height:1.1;letter-spacing:-.01em}
.top-r{display:flex;gap:8px;align-items:center;padding-bottom:2px}
.hr{height:1px;background:var(--line);margin:24px 40px 0}
.body{flex:1;padding:28px 40px 48px}
/* tooltip */
.tt-wrap{position:relative;display:inline-block;max-width:100%}
.tt-wrap .tt{display:none;position:absolute;left:0;top:calc(100% + 6px);z-index:50;background:#1A0E5C;color:#fff;font-size:12px;line-height:1.6;padding:10px 14px;border-radius:8px;min-width:280px;max-width:420px;box-shadow:0 8px 24px rgba(0,0,0,.18);white-space:pre-wrap;word-break:break-word}
.tt-wrap:hover .tt{display:block}
.btn{font:inherit;font-size:12.5px;font-weight:500;border-radius:8px;padding:8px 16px;cursor:pointer;border:1px solid var(--line2);background:var(--surface);color:var(--ink);transition:all .15s;white-space:nowrap}
.btn:hover{border-color:var(--ink);background:#F7F5FF}
.btn.pri{background:var(--ink);color:#fff;border-color:var(--ink);box-shadow:0 2px 8px rgba(53,24,165,.25)}
.btn.pri:hover{background:var(--ink2);box-shadow:0 4px 12px rgba(53,24,165,.35)}
.btn.gho{background:none;border-color:transparent;color:var(--mut)}
.btn.gho:hover{color:var(--ink);background:#F3F0FF}
.btn.dng{color:#DC2626;border-color:#FEE2E2}
.btn.dng:hover{background:#FFF5F5;border-color:#FECACA}
.pill{font-size:11.5px;padding:6px 14px;border-radius:20px;border:1px solid var(--line2);background:var(--surface);color:var(--mut);cursor:pointer;transition:.15s;font-weight:400}
.pill:hover{border-color:var(--ink);color:var(--ink)}
.pill.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:32px}
.kpi{padding:20px 22px;border:1px solid var(--line);border-radius:12px;background:var(--surface);transition:.2s}
.kpi:hover{border-color:var(--line2);box-shadow:0 2px 12px rgba(0,0,0,.06)}
.kpi .k{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:10px}
.kpi .v{font-family:'Fraunces',serif;font-size:24px;font-weight:300;color:var(--txt);line-height:1}
.kpi .s{font-size:11.5px;color:var(--mut);margin-top:6px}
.kpi.hi{background:var(--ink);border-color:var(--ink);box-shadow:0 4px 16px rgba(53,24,165,.3)}
.kpi.hi:hover{box-shadow:0 6px 20px rgba(53,24,165,.4)}
.kpi.hi .k{color:rgba(255,255,255,.5)}
.kpi.hi .v{color:#fff}
.kpi.hi .s{color:rgba(255,255,255,.65)}
.sec-hd{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.sec-hd button{font-size:12px;color:var(--ink);background:none;border:none;cursor:pointer;letter-spacing:0;text-transform:none;font-weight:500;font-family:inherit;opacity:.8;transition:.12s}
.sec-hd button:hover{opacity:1}
.tbl{width:100%;border-collapse:collapse;margin-bottom:32px;background:var(--surface);border-radius:12px;overflow:hidden;border:1px solid var(--line)}
.tbl th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:500;padding:12px 18px;text-align:left;border-bottom:1px solid var(--line);background:var(--surface)}
.tbl th:last-child,.tbl td:last-child{text-align:right}
.tbl td{padding:14px 18px;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tbody tr{cursor:pointer;transition:.1s}
.tbl tbody tr:hover td{background:#FAF8FF}
.t-name{font-size:13.5px;color:var(--txt);font-weight:500}
.t-sub{font-size:11px;color:var(--mut);margin-top:2px;font-weight:400}
.t-date{font-size:12.5px;color:var(--mut)}
.t-amt{font-family:'Fraunces',serif;font-size:15px;font-weight:300;color:var(--txt)}
.badge{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;padding:4px 10px;border-radius:20px;font-weight:500}
.badge::before{content:'';width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0}
.b-ok{background:#ECFDF5;color:#065F46}.b-ok::before{background:#10B981}
.b-wait{background:#FFFBEB;color:#92400E}.b-wait::before{background:#F59E0B}
.b-late{background:#FEF2F2;color:#991B1B}.b-late::before{background:#EF4444}
.b-vy{background:#EEF2FF;color:#3730A3}.b-vy::before{background:#6366F1}
.det{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:28px 32px;max-width:780px}
.det-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
.det h2{font-family:'Fraunces',serif;font-size:26px;font-weight:300;color:var(--txt);line-height:1.2;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.det .reg{font-size:12.5px;color:var(--mut);margin-top:6px;white-space:pre-line;line-height:1.6}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
.fld .l{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:5px}
.fld .d{font-size:14px;color:var(--txt);line-height:1.55}
.fld a{color:var(--ink);text-decoration:none;font-weight:500}
.fld a:hover{text-decoration:underline}
.bigval{font-family:'Fraunces',serif;font-size:28px;font-weight:300;color:var(--gold)}
.svwrap{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.sdot{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--txt);font-weight:400;background:#F5F4FA;border-radius:20px;padding:3px 9px}
.sdot i{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
.notes{margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}
.notes .d{font-size:13.5px;color:var(--txt);line-height:1.7;white-space:pre-wrap}
.actions{display:flex;gap:8px;margin-top:24px;padding-top:20px;border-top:1px solid var(--line)}
.form{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:28px 32px;max-width:700px}
.form h2{font-family:'Fraunces',serif;font-size:21px;font-weight:300;color:var(--txt);margin-bottom:22px}
.frow{margin-bottom:14px}
.frow label{display:block;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:6px}
.frow input,.frow textarea,.frow select{width:100%;font:inherit;font-size:13.5px;padding:9px 12px;border:1px solid var(--line2);border-radius:8px;outline:none;background:#fff;color:var(--txt);transition:.15s}
.frow input:focus,.frow textarea:focus,.frow select:focus{border-color:var(--ink);box-shadow:0 0 0 3px rgba(53,24,165,.08)}
.frow textarea{resize:vertical;min-height:70px;line-height:1.6}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.svpick{display:flex;gap:6px;flex-wrap:wrap}
.svopt{font-size:11.5px;font-weight:400;padding:5px 12px;border-radius:20px;cursor:pointer;border:1px solid var(--line2);background:#fff;color:var(--mut);transition:.15s}
.svopt:hover{border-color:var(--ink);color:var(--ink)}
.svopt.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.items-wrap{border:1px solid var(--line2);border-radius:10px;overflow:hidden;margin-bottom:14px}
.item-head{display:grid;grid-template-columns:1fr 80px 100px 100px 36px;gap:8px;padding:10px 14px;background:#FAFAFA;border-bottom:1px solid var(--line)}
.item-head span{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:500}
.item-row{display:grid;grid-template-columns:1fr 80px 100px 100px 36px;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);align-items:center}
.item-row:last-child{border-bottom:none}
.item-row input{font:inherit;font-size:13px;padding:6px 10px;border:1px solid var(--line2);border-radius:6px;outline:none;background:#fff;color:var(--txt);width:100%;transition:.15s}
.item-row input:focus{border-color:var(--ink);box-shadow:0 0 0 2px rgba(53,24,165,.08)}
.item-row .amt{font-family:'Fraunces',serif;font-size:14px;color:var(--txt);text-align:right;font-weight:300}
.item-del{background:none;border:none;cursor:pointer;color:#DDD;font-size:18px;padding:0;display:flex;align-items:center;justify-content:center;transition:.12s;line-height:1}
.item-del:hover{color:#DC2626}
.totals{background:#FAFAFA;border:1px solid var(--line);border-radius:10px;padding:14px 18px;margin-bottom:14px}
.tot-row{display:flex;justify-content:space-between;font-size:13px;color:var(--mut);padding:4px 0}
.tot-row.final{font-size:14px;color:var(--txt);font-weight:600;border-top:1px solid var(--line2);margin-top:8px;padding-top:10px}
.tot-row.final .tv{font-family:'Fraunces',serif;font-size:20px;font-weight:300;color:var(--ink)}
.inv-det-meta{display:flex;gap:28px;margin:20px 0;padding:20px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);flex-wrap:wrap}
.inv-det-meta .mf .ml{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:5px}
.inv-det-meta .mf .mv{font-size:14px;color:var(--txt);font-weight:500}
.inv-items-det{width:100%;border-collapse:collapse;margin:20px 0}
.inv-items-det th{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:500;padding:0 0 10px;text-align:left;border-bottom:1px solid var(--line)}
.inv-items-det th:last-child,.inv-items-det td:last-child{text-align:right}
.inv-items-det td{padding:12px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.inv-items-det tr:last-child td{border-bottom:none}
.inv-totals{margin-top:16px;padding:16px;background:#FAFAFA;border-radius:10px;border:1px solid var(--line)}
.filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.fchip{font-size:11.5px;font-weight:400;padding:5px 12px;border-radius:20px;cursor:pointer;border:1px solid var(--line2);background:var(--surface);color:var(--mut);transition:.15s}
.fchip:hover{border-color:var(--ink);color:var(--ink)}
.fchip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:9px;padding:9px 13px;flex:1;min-width:200px;transition:.15s}
.search:focus-within{border-color:var(--ink);box-shadow:0 0 0 3px rgba(53,24,165,.08)}
.search input{border:none;outline:none;font:inherit;font-size:13.5px;width:100%;background:none;color:var(--txt)}
.tag{font-size:9px;letter-spacing:.04em;text-transform:uppercase;font-weight:600;border-radius:5px;padding:2px 7px}
.tag.firma{background:#EEF2FF;color:#4338CA}
.tag.osoba{background:#FEF3C7;color:#92400E}
.stat-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 18px;min-width:130px;flex:1;transition:.2s}
.stat:hover{border-color:var(--line2);box-shadow:0 2px 8px rgba(0,0,0,.05)}
.stat .k{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:500}
.stat .v{font-size:20px;font-weight:600;color:var(--ink);margin-top:3px;font-variant-numeric:tabular-nums}
.stat.gold .v{color:var(--gold)}
.tools{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.sbadge{font-size:9px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;border-radius:5px;padding:2px 7px}
.status-aktivní{background:#ECFDF5;color:#065F46}
.status-spící{background:#FFFBEB;color:#92400E}
.status-ukončený{background:#FEF2F2;color:#991B1B}
.ph{max-width:520px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:48px 40px;text-align:center}
.ph h2{font-family:'Fraunces',serif;font-size:22px;font-weight:300;color:var(--txt);margin:0 0 8px}
.ph .ph2{display:inline-block;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink);font-weight:600;background:#EEF2FF;border-radius:5px;padding:3px 10px;margin-bottom:14px;opacity:.8}
.ph p{font-size:13.5px;color:var(--mut);line-height:1.65}
.lock{flex:1;display:flex;align-items:center;justify-content:center;background:var(--bg);min-height:100vh}
.lockcard{text-align:center;max-width:360px;width:100%;padding:48px 44px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
.lockcard .wm{font-family:'Fraunces',serif;font-size:30px;font-weight:400;color:var(--ink);letter-spacing:.06em}
.lockcard .sub{font-size:7.5px;letter-spacing:.45em;text-transform:uppercase;color:var(--gold);margin-top:4px;font-weight:600}
.lockcard p{font-size:13px;color:var(--mut);margin:24px 0 8px;line-height:1.6}
.lockcard .field{margin-bottom:12px;text-align:left}
.lockcard .field label{display:block;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:6px;font-weight:500}
.lockcard input{width:100%;font:inherit;font-size:14px;padding:11px 14px;border-radius:9px;border:1px solid var(--line2);outline:none;color:var(--txt);transition:.15s;background:#fff}
.lockcard input:focus{border-color:var(--ink);box-shadow:0 0 0 3px rgba(53,24,165,.1)}
.lockcard .btn-login{width:100%;margin-top:8px;padding:12px;font-size:14px;font-weight:500;border-radius:9px;border:none;background:var(--ink);color:#fff;cursor:pointer;transition:.15s;font-family:inherit;box-shadow:0 2px 8px rgba(53,24,165,.3)}
.lockcard .btn-login:hover{background:var(--ink2);box-shadow:0 4px 12px rgba(53,24,165,.4)}
.lockcard .btn-login:disabled{opacity:.6;cursor:not-allowed;box-shadow:none}
.lockcard .err{color:#DC2626;font-size:12px;margin-top:10px;min-height:14px}
.ov{position:fixed;inset:0;background:rgba(15,10,40,.35);display:flex;align-items:center;justify-content:center;z-index:99;backdrop-filter:blur(2px)}
.cf{background:var(--surface);border-radius:14px;padding:28px 32px;max-width:340px;text-align:center;border:1px solid var(--line);box-shadow:0 16px 48px rgba(0,0,0,.12)}
.cf h3{font-size:17px;color:var(--txt);font-weight:600;margin-bottom:8px}
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
async function fetchWorkEntries() {
  const { data, error } = await supabase.from("work_entries").select("*, clients(name, ico, hourly_rate)").order("entry_date", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function upsertWorkEntry(e) {
  const { clients: _c, ...rest } = e;
  const { error } = await supabase.from("work_entries").upsert({ ...rest, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function deleteWorkEntryDb(id) {
  const { error } = await supabase.from("work_entries").delete().eq("id", id);
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

/* ─── DASHBOARD ─── */
function Dashboard({ invoices, workEntries, clients, onNav }) {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const year = now.getFullYear();

  const months = Array.from({ length: now.getMonth() + 1 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return { key: `${year}-${m}`, label: CZ_MONTHS[i].slice(0, 3) };
  });

  const revenueByMonth = months.map(({ key, label }) => ({
    label,
    v: invoices.filter(i => (i.issue_date || "").startsWith(key)).reduce((s, i) => s + (i.total || 0), 0),
  }));
  const maxRev = Math.max(...revenueByMonth.map(m => m.v), 1);

  const ytd = invoices.filter(i => (i.issue_date || "").startsWith(String(year))).reduce((s, i) => s + (i.subtotal || 0), 0);
  const thisMonthRev = invoices.filter(i => (i.issue_date || "").startsWith(thisMonth)).reduce((s, i) => s + (i.subtotal || 0), 0);
  const prevMonthRev = invoices.filter(i => (i.issue_date || "").startsWith(prevMonth)).reduce((s, i) => s + (i.subtotal || 0), 0);
  const revTrend = prevMonthRev > 0 ? Math.round(((thisMonthRev - prevMonthRev) / prevMonthRev) * 100) : null;

  const unbilled = workEntries.filter(e => !e.invoice_id);
  const unbilledAmt = unbilled.reduce((s, e) => s + Math.round((e.amount || 0) * 1.21) + (e.notary_fee || 0) + (e.admin_fee || 0), 0);
  const unbilledClients = new Set(unbilled.filter(e => e.client_id).map(e => e.client_id)).size;

  const overdue = invoices.filter(i => invoiceStatus(i) === "po_splatnosti");
  const overdueAmt = overdue.reduce((s, i) => s + (i.subtotal || 0), 0);
  const pending = invoices.filter(i => invoiceStatus(i) === "vystavena");
  const pendingAmt = pending.reduce((s, i) => s + (i.subtotal || 0), 0);

  const thisMonthHours = workEntries.filter(e => (e.entry_date || "").startsWith(thisMonth)).reduce((s, e) => s + (e.hours || 0), 0);
  const thisMonthRealH = workEntries.filter(e => (e.entry_date || "").startsWith(thisMonth)).reduce((s, e) => s + (e.real_hours || 0), 0);

  const clientRev = {};
  invoices.forEach(i => { if (i.client_id) clientRev[i.client_id] = (clientRev[i.client_id] || 0) + (i.subtotal || 0); });
  const topClients = Object.entries(clientRev).sort(([, a], [, b]) => b - a).slice(0, 6)
    .map(([id, rev]) => ({ c: clients.find(x => x.id === id), rev })).filter(x => x.c);
  const maxCR = topClients[0]?.rev || 1;

  const recentWork = [...workEntries].sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || "")).slice(0, 5);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Dobré ráno";
    if (h < 18) return "Dobré odpoledne";
    return "Dobrý večer";
  };

  const W = 440; const H = 140; const pad = 28;
  const barW = Math.floor((W - pad * 2) / Math.max(revenueByMonth.length, 1)) - 4;

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 300, color: "var(--txt)" }}>
          {greeting()}, Tomáši.
        </div>
        <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 4 }}>
          {now.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {overdue.length > 0 && <span style={{ marginLeft: 12, color: "#DC2626", fontWeight: 500 }}>⚠ {overdue.length} faktura po splatnosti</span>}
          {unbilledClients > 0 && <span style={{ marginLeft: 12, color: "var(--ink)", fontWeight: 500 }}>● {unbilledClients} klientů čeká na fakturu</span>}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { k: "YTD — bez DPH", v: fmtKc(ytd), s: `s DPH: ${fmtKc(invoices.filter(i=>(i.issue_date||"").startsWith(String(year))).reduce((s,i)=>s+(i.total||0),0))} · ${invoices.filter(i=>(i.issue_date||"").startsWith(String(year))).length} faktur`, accent: true },
          { k: `${CZ_MONTHS[now.getMonth()]} — bez DPH`, v: fmtKc(thisMonthRev), s: revTrend !== null ? `${revTrend >= 0 ? "↑" : "↓"} ${Math.abs(revTrend)} % vs. minulý měsíc` : "aktuální měsíc", warn: revTrend !== null && revTrend < -10 },
          { k: "K vyfakturování", v: fmtKc(unbilledAmt), s: `${unbilledClients} klientů · ${unbilled.length} záznamů`, cta: true },
          { k: overdueAmt > 0 ? "Po splatnosti ⚠" : "Neuhrazeno", v: fmtKc(overdueAmt > 0 ? overdueAmt : pendingAmt), s: overdueAmt > 0 ? `${overdue.length} faktur — nutná akce` : `${pending.length} faktur čeká`, danger: overdueAmt > 0 },
        ].map((item, i) => (
          <div key={i} style={{
            background: item.accent ? "var(--ink)" : item.danger ? "#FEF2F2" : item.cta ? "#F3F0FF" : "#fff",
            border: `1px solid ${item.accent ? "var(--ink)" : item.danger ? "#FECACA" : item.cta ? "#D8D2F5" : "var(--line)"}`,
            borderRadius: 12, padding: "18px 20px",
            boxShadow: item.accent ? "0 4px 20px rgba(53,24,165,.3)" : "0 1px 4px rgba(0,0,0,.04)"
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".15em", textTransform: "uppercase", fontWeight: 500, marginBottom: 10, color: item.accent ? "rgba(255,255,255,.5)" : item.danger ? "#991B1B" : item.cta ? "var(--ink)" : "var(--mut)", opacity: item.accent ? 1 : .9 }}>{item.k}</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 300, lineHeight: 1, color: item.accent ? "#fff" : item.danger ? "#DC2626" : item.cta ? "var(--ink)" : "var(--txt)" }}>{item.v}</div>
            <div style={{ fontSize: 11.5, marginTop: 7, color: item.accent ? "rgba(255,255,255,.6)" : item.danger ? "#991B1B" : item.cta ? "var(--ink3)" : "var(--mut)" }}>{item.s}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 24 }}>
        {/* Bar chart */}
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500, marginBottom: 16 }}>Měsíční příjmy {year}</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H + 24}`} style={{ overflow: "visible" }}>
            {revenueByMonth.map((m, i) => {
              const bh = maxRev > 0 ? Math.round((m.v / maxRev) * H) : 0;
              const x = pad + i * ((W - pad * 2) / revenueByMonth.length);
              const bx = x + ((W - pad * 2) / revenueByMonth.length - barW) / 2;
              const isThis = i === revenueByMonth.length - 1;
              return (
                <g key={i}>
                  <rect x={bx} y={H - bh} width={barW} height={bh}
                    fill={isThis ? "var(--ink)" : "#E8E4FB"} rx={4} />
                  <text x={bx + barW / 2} y={H + 16} textAnchor="middle"
                    fill={isThis ? "var(--ink)" : "var(--mut)"}
                    fontSize={10} fontFamily="Inter, sans-serif" fontWeight={isThis ? 600 : 400}>{m.label}</text>
                  {m.v > 0 && bh > 20 && <text x={bx + barW / 2} y={H - bh - 5} textAnchor="middle"
                    fill={isThis ? "var(--ink)" : "var(--mut)"} fontSize={9} fontFamily="Inter, sans-serif">
                    {Math.round(m.v / 1000)}k
                  </text>}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Top clients */}
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500, marginBottom: 16 }}>Top klienti</div>
          {topClients.map(({ c, rev }, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: "var(--txt)", fontWeight: 500, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <span style={{ fontSize: 12, fontFamily: "Fraunces, serif", fontWeight: 300, color: "var(--gold)", flexShrink: 0, marginLeft: 8 }}>{Math.round(rev / 1000)}k Kč</span>
              </div>
              <div style={{ height: 4, background: "#F0EEF8", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.round((rev / maxCR) * 100)}%`, background: i === 0 ? "var(--ink)" : "#A89DE0", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* K vystavení */}
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500 }}>K vystavení</div>
            <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => onNav("fakturace")}>Přejít →</button>
          </div>
          {unbilledClients === 0 ? (
            <div style={{ fontSize: 13, color: "var(--mut)", textAlign: "center", padding: "16px 0" }}>Vše vyfakturováno ✓</div>
          ) : (
            Object.entries(
              unbilled.reduce((acc, e) => { acc[e.client_id] = [...(acc[e.client_id] || []), e]; return acc; }, {})
            ).slice(0, 4).map(([cid, es]) => {
              const c = clients.find(x => x.id === cid);
              const amt = es.reduce((s,e) => s + Math.round((e.amount||0)*1.21) + (e.notary_fee||0) + (e.admin_fee||0), 0);
              return (
                <div key={cid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--txt)" }}>{c?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--mut)" }}>{es.length} záznamů</div>
                  </div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 300, color: "var(--ink)" }}>{fmtKc(amt)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Posledních 5 výkazů */}
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500 }}>
              Posledních 5 výkazů · {thisMonthHours.toFixed(1)} h tento měsíc
            </div>
            <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => onNav("vykaz")}>+ Nový záznam</button>
          </div>
          {recentWork.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--mut)", textAlign: "center", padding: "16px 0" }}>Žádné záznamy.</div>
          ) : recentWork.map(e => {
            const c = e.clients?.name || clients.find(x => x.id === e.client_id)?.name;
            return (
              <div key={e.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)", alignItems: "flex-start" }}>
                <div style={{ fontSize: 10.5, color: "var(--mut)", whiteSpace: "nowrap", paddingTop: 2 }}>{fmtDate(e.entry_date)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", marginBottom: 1 }}>{c || "—"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", whiteSpace: "nowrap" }}>{e.hours > 0 ? `${e.hours} h` : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── VÝKAZ PRÁCE ─── */
const CZ_MONTHS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const monthKey = (d) => d ? d.slice(0, 7) : "";
const monthLabel = (k) => { const [y,m] = k.split("-"); return `${CZ_MONTHS[parseInt(m)-1]} ${y}`; };

function WorkEntryForm({ init, clients, onSave, onCancel, saving }) {
  const [d, setD] = useState(() => init || {
    id: uid(), client_id: "", entry_date: today(),
    description: "", hours: "", rate: 2000,
    notary_fee: 0, admin_fee: 0,
    real_hours: "", notes: "",
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const onClientChange = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    set("client_id", clientId);
    if (c?.hourly_rate > 0) set("rate", c.hourly_rate);
  };

  const amount = Math.round((Number(d.hours) || 0) * (Number(d.rate) || 0));
  const client = clients.find(c => c.id === d.client_id);

  const save = () => {
    if (!d.client_id || !d.description.trim()) return;
    onSave({ ...d, hours: Number(d.hours) || 0, rate: Number(d.rate) || 2000,
      amount, notary_fee: Number(d.notary_fee) || 0, admin_fee: Number(d.admin_fee) || 0,
      real_hours: Number(d.real_hours) || 0 });
  };

  return (
    <div className="form" style={{ maxWidth: 680 }}>
      <h2>{init ? "Upravit záznam" : "Nový záznam"}</h2>
      <div className="two">
        <div className="frow">
          <label>Klient *</label>
          <select value={d.client_id} onChange={e => onClientChange(e.target.value)}>
            <option value="">— vyber klienta —</option>
            {clients.sort((a,b) => a.name.localeCompare(b.name,"cs")).map(c =>
              <option key={c.id} value={c.id}>{c.name}</option>
            )}
          </select>
        </div>
        <div className="frow">
          <label>Datum</label>
          <input type="date" value={d.entry_date} onChange={e => set("entry_date", e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <label>Popis úkonu *</label>
        <textarea value={d.description} onChange={e => set("description", e.target.value)}
          placeholder="Příprava kupní smlouvy - Mochov; koordinace s klientem; ověření stavu v KN…" rows={3} />
      </div>
      <div style={{ background: "#F7F5FF", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink)", fontWeight: 600, marginBottom: 12, opacity: .7 }}>Fakturované položky</div>
        <div className="three">
          <div className="frow" style={{ marginBottom: 0 }}>
            <label>Hodiny (faktur.)</label>
            <input type="number" step="0.5" min="0" value={d.hours} onChange={e => set("hours", e.target.value)} placeholder="0" />
          </div>
          <div className="frow" style={{ marginBottom: 0 }}>
            <label>Hodinovka (Kč)</label>
            <input type="number" value={d.rate} onChange={e => set("rate", e.target.value)} />
          </div>
          <div className="frow" style={{ marginBottom: 0 }}>
            <label>Celkem bez DPH</label>
            <input readOnly value={`${new Intl.NumberFormat("cs-CZ").format(amount)} Kč`}
              style={{ background: "#fff", color: "var(--ink)", fontFamily: "Fraunces, serif", fontWeight: 300, fontSize: 15 }} />
          </div>
        </div>
        <div className="two" style={{ marginTop: 10 }}>
          <div className="frow" style={{ marginBottom: 0 }}>
            <label>Notář — přefakturace (Kč, bez DPH)</label>
            <input type="number" min="0" value={d.notary_fee || ""} onChange={e => set("notary_fee", e.target.value)} placeholder="0" />
          </div>
          <div className="frow" style={{ marginBottom: 0 }}>
            <label>Správní poplatek (Kč, bez DPH)</label>
            <input type="number" min="0" value={d.admin_fee || ""} onChange={e => set("admin_fee", e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>
      <div className="two">
        <div className="frow">
          <label>Reálné hodiny (interní — nezobrazí se klientovi)</label>
          <input type="number" step="0.5" min="0" value={d.real_hours || ""} onChange={e => set("real_hours", e.target.value)} placeholder="0" />
        </div>
        <div className="frow">
          <label>Interní poznámka</label>
          <input value={d.notes} onChange={e => set("notes", e.target.value)} placeholder="Vlastní memo…" />
        </div>
      </div>
      {client && <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 14 }}>
        Klient: <strong style={{ color: "var(--ink)" }}>{client.name}</strong>
        {client.hourly_rate > 0 && <span> · sazba {new Intl.NumberFormat("cs-CZ").format(client.hourly_rate)} Kč/h</span>}
      </div>}
      <div className="actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 4 }}>
        <button className="btn gho" onClick={onCancel}>Zrušit</button>
        <button className="btn pri" onClick={save} disabled={saving} style={{ marginLeft: "auto" }}>
          {saving ? "Ukládám…" : "Uložit záznam"}
        </button>
      </div>
    </div>
  );
}

function WorkEntryList({ entries, clients, invoices, onNew, onEdit, onDelete, onGenerateInvoice, loading }) {
  const [filterClient, setFilterClient] = useState("");

  const filtered = useMemo(() => {
    let list = filterClient ? entries.filter(e => e.client_id === filterClient) : entries;
    return list;
  }, [entries, filterClient]);

  const unbilled = filtered.filter(e => !e.invoice_id);
  const unbilledByMonth = useMemo(() => {
    const map = {};
    unbilled.forEach(e => {
      const k = monthKey(e.entry_date);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    return Object.entries(map).sort(([a],[b]) => b.localeCompare(a));
  }, [unbilled]);

  const totalHours = unbilled.reduce((s, e) => s + (e.hours || 0), 0);
  const totalAmount = unbilled.reduce((s, e) => s + (e.amount || 0) + (e.notary_fee || 0) + (e.admin_fee || 0), 0);

  const clientName = (e) => e.clients?.name || clients.find(c => c.id === e.client_id)?.name || "—";

  return (
    <>
      <div className="kpi-row">
        <div className="kpi hi">
          <div className="k">Nevyfakturováno</div>
          <div className="v">{new Intl.NumberFormat("cs-CZ").format(Math.round(totalAmount * 1.21))} Kč</div>
          <div className="s">{unbilled.length} záznamů · {totalHours.toFixed(1)} h</div>
        </div>
        <div className="kpi">
          <div className="k">Celkem záznamů</div>
          <div className="v">{entries.length}</div>
          <div className="s">vyfakturováno {entries.filter(e => e.invoice_id).length}</div>
        </div>
        <div className="kpi">
          <div className="k">Klientů aktivních</div>
          <div className="v">{new Set(unbilled.map(e => e.client_id).filter(Boolean)).size}</div>
          <div className="s">s nevyfakturovanou prací</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          style={{ font: "inherit", fontSize: 13, padding: "8px 12px", border: "1px solid var(--line2)", borderRadius: 8, color: filterClient ? "var(--ink)" : "var(--mut)", background: "#fff", minWidth: 200 }}>
          <option value="">Všichni klienti</option>
          {clients.sort((a,b) => a.name.localeCompare(b.name,"cs")).map(c =>
            <option key={c.id} value={c.id}>{c.name}</option>
          )}
        </select>
        {filterClient && <button className="btn gho" style={{ fontSize: 12, color: "#DC2626" }} onClick={() => setFilterClient("")}>Zrušit ×</button>}
        <button className="btn pri" onClick={onNew} style={{ marginLeft: "auto" }}>+ Nový záznam</button>
      </div>

      {loading && <div className="loading">Načítám záznamy…</div>}
      {!loading && unbilledByMonth.length === 0 && (
        <div className="ph" style={{ marginBottom: 24 }}>
          <h2 className="serif">Žádné nevyfakturované záznamy</h2>
          <p>Přidej první záznam práce tlačítkem výše.</p>
        </div>
      )}

      {!loading && unbilledByMonth.map(([month, monthEntries]) => {
        const mHours = monthEntries.reduce((s,e) => s + (e.hours||0), 0);
        const mWork = monthEntries.reduce((s,e) => s + (e.amount||0), 0);
        const mNotary = monthEntries.reduce((s,e) => s + (e.notary_fee||0), 0);
        const mAdmin = monthEntries.reduce((s,e) => s + (e.admin_fee||0), 0);
        const mTotal = Math.round(mWork * 1.21) + mNotary + mAdmin;
        const clients_in_month = [...new Set(monthEntries.map(e => e.client_id))];

        return (
          <div key={month} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 400, color: "var(--txt)" }}>{monthLabel(month)}</span>
                <span style={{ fontSize: 11, color: "var(--mut)" }}>{mHours.toFixed(1)} h · {monthEntries.length} záznamů</span>
                <span style={{ fontSize: 13, fontFamily: "Fraunces, serif", fontWeight: 300, color: "var(--gold)" }}>{new Intl.NumberFormat("cs-CZ").format(mTotal)} Kč</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {filterClient ? (
                  <button className="btn pri" style={{ fontSize: 12 }}
                    onClick={() => onGenerateInvoice(filterClient, monthEntries)}>
                    Vystavit fakturu →
                  </button>
                ) : (
                  clients_in_month.map(cid => {
                    const c = clients.find(x => x.id === cid);
                    const ces = monthEntries.filter(e => e.client_id === cid);
                    return (
                      <button key={cid} className="btn" style={{ fontSize: 11 }}
                        onClick={() => onGenerateInvoice(cid, ces)}>
                        FA: {c?.name?.split(" ")[0] || "?"}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <table className="tbl" style={{ marginBottom: 0 }}>
              <thead><tr>
                <th>Datum</th>
                {!filterClient && <th>Klient</th>}
                <th>Popis úkonu</th>
                <th>Hodiny</th>
                <th>Notář / Sp.</th>
                <th style={{ textAlign: "right" }}>Bez DPH</th>
                <th style={{ textAlign: "right" }}></th>
              </tr></thead>
              <tbody>
                {monthEntries.sort((a,b) => (a.entry_date||"").localeCompare(b.entry_date||"")).map(e => (
                  <tr key={e.id} onClick={() => onEdit(e)}>
                    <td className="t-date">{fmtDate(e.entry_date)}</td>
                    {!filterClient && <td><div className="t-name" style={{ fontSize: 13 }}>{clientName(e)}</div></td>}
                    <td>
                      <div style={{ fontSize: 13, color: "var(--txt)", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                      {e.real_hours > 0 && <div className="t-sub">reálně: {e.real_hours} h</div>}
                    </td>
                    <td className="t-date">{e.hours > 0 ? `${e.hours} h` : "—"}</td>
                    <td className="t-date" style={{ fontSize: 11 }}>
                      {e.notary_fee > 0 && <div>Notář: {new Intl.NumberFormat("cs-CZ").format(e.notary_fee)} Kč</div>}
                      {e.admin_fee > 0 && <div>Sp.pop.: {new Intl.NumberFormat("cs-CZ").format(e.admin_fee)} Kč</div>}
                    </td>
                    <td className="t-amt">{new Intl.NumberFormat("cs-CZ").format((e.amount||0) + (e.notary_fee||0) + (e.admin_fee||0))} Kč</td>
                    <td style={{ textAlign: "right" }} onClick={ev => ev.stopPropagation()}>
                      <button className="btn gho" style={{ fontSize: 11, padding: "4px 8px", color: "#DC2626" }}
                        onClick={() => onDelete(e.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {!loading && entries.filter(e => e.invoice_id).length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--mut)", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 500 }}>
            Vyfakturované záznamy ({entries.filter(e => e.invoice_id).length})
          </summary>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead><tr><th>Datum</th><th>Klient</th><th>Popis</th><th>Hodiny</th><th style={{ textAlign: "right" }}>Bez DPH</th></tr></thead>
            <tbody>
              {entries.filter(e => e.invoice_id && (!filterClient || e.client_id === filterClient))
                .slice(0, 20).map(e => (
                <tr key={e.id} style={{ opacity: .6 }}>
                  <td className="t-date">{fmtDate(e.entry_date)}</td>
                  <td className="t-date">{clientName(e)}</td>
                  <td style={{ fontSize: 13 }}>{e.description?.slice(0,80)}</td>
                  <td className="t-date">{e.hours > 0 ? `${e.hours} h` : "—"}</td>
                  <td className="t-amt">{new Intl.NumberFormat("cs-CZ").format((e.amount||0) + (e.notary_fee||0) + (e.admin_fee||0))} Kč</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}

/* ─── FAKTURACE ─── */
function InvoiceList({ invoices, clients, workEntries, onOpen, onOpenClient, onToggleStatus, onGenerateInvoice, loading }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("vse");
  const [filterClient, setFilterClient] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  // Draft invoices — aggregate unbilled work entries per client
  const drafts = useMemo(() => {
    const unbilled = (workEntries || []).filter(e => !e.invoice_id && e.client_id);
    const byClient = {};
    unbilled.forEach(e => {
      if (!byClient[e.client_id]) byClient[e.client_id] = [];
      byClient[e.client_id].push(e);
    });
    return Object.entries(byClient).map(([clientId, entries]) => {
      const client = clients.find(c => c.id === clientId);
      const workAmt = entries.reduce((s,e) => s + (e.amount||0), 0);
      const notary = entries.reduce((s,e) => s + (e.notary_fee||0), 0);
      const admin = entries.reduce((s,e) => s + (e.admin_fee||0), 0);
      const vat = Math.round(workAmt * 0.21);
      const total = workAmt + vat + notary + admin;
      const hours = entries.reduce((s,e) => s + (e.hours||0), 0);
      return { clientId, client, entries, workAmt, notary, admin, vat, total, hours };
    }).sort((a,b) => b.total - a.total);
  }, [workEntries, clients]);

  const [expandedDraft, setExpandedDraft] = useState(null);

  const filtered = useMemo(() => {
    let list = [...invoices];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(i =>
      (i.clients?.name || i.notes || "").toLowerCase().includes(q) ||
      (i.invoice_number || "").toLowerCase().includes(q)
    );
    if (filterClient) list = list.filter(i => i.client_id === filterClient);
    if (filterStatus === "uhrazena") list = list.filter(i => i.status === "uhrazena");
    if (filterStatus === "vystavena") list = list.filter(i => invoiceStatus(i) === "vystavena");
    if (filterStatus === "po_splatnosti") list = list.filter(i => invoiceStatus(i) === "po_splatnosti");
    if (dateFrom) list = list.filter(i => i.issue_date >= dateFrom);
    if (dateTo) list = list.filter(i => i.issue_date <= dateTo);
    list.sort((a, b) => {
      if (sortBy === "date_desc") return (b.issue_date || "").localeCompare(a.issue_date || "");
      if (sortBy === "date_asc") return (a.issue_date || "").localeCompare(b.issue_date || "");
      if (sortBy === "number") return (a.invoice_number || "").localeCompare(b.invoice_number || "", undefined, { numeric: true });
      if (sortBy === "amount_desc") return (b.total || 0) - (a.total || 0);
      if (sortBy === "amount_asc") return (a.total || 0) - (b.total || 0);
      return 0;
    });
    return list;
  }, [invoices, search, filterClient, filterStatus, dateFrom, dateTo, sortBy]);

  const total = useMemo(() => invoices.reduce((s, i) => s + (i.subtotal || 0), 0), [invoices]);
  const nezaplaceno = useMemo(() => invoices.filter(i => invoiceStatus(i) !== "uhrazena").reduce((s, i) => s + (i.subtotal || 0), 0), [invoices]);
  const poSplatnosti = useMemo(() => invoices.filter(i => invoiceStatus(i) === "po_splatnosti").reduce((s, i) => s + (i.subtotal || 0), 0), [invoices]);
  const hasFilters = search || filterClient || filterStatus !== "vse" || dateFrom || dateTo;

  const clientName = (inv) => inv.clients?.name || inv.notes?.split(" - ")[0] || "—";

  const StatusToggle = ({ inv }) => {
    const s = invoiceStatus(inv);
    return (
      <span
        className={`badge ${s === "uhrazena" ? "b-ok" : s === "po_splatnosti" ? "b-late" : "b-vy"}`}
        style={{ cursor: "pointer", userSelect: "none" }}
        title="Klikni pro změnu stavu"
        onClick={e => { e.stopPropagation(); onToggleStatus(inv); }}
      >
        {s === "uhrazena" ? "Uhrazeno ✓" : s === "po_splatnosti" ? "Po splatnosti" : "Vystavena"}
      </span>
    );
  };

  return (
    <>
      {/* ── PŘIPRAVENO K VYSTAVENÍ ── */}
      {drafts.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div className="sec-hd" style={{ marginBottom: 14 }}>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              K vystavení · {drafts.length} {drafts.length === 1 ? "klient" : "klientů"}
            </span>
            <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              Agregováno z výkazu práce — zkontroluj a vystav
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {drafts.map(d => (
              <div key={d.clientId} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", cursor: "pointer" }}
                  onClick={() => setExpandedDraft(expandedDraft === d.clientId ? null : d.clientId)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--txt)" }}>{d.client?.name || "—"}</div>
                    <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
                      {d.entries.length} záznamů · {d.hours.toFixed(1)} h fakturovaných
                      {d.notary > 0 && ` · notář ${fmtKc(d.notary)}`}
                      {d.admin > 0 && ` · sp.pop. ${fmtKc(d.admin)}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: 16 }}>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 300, color: "var(--gold)" }}>{fmtKc(d.total)}</div>
                    <div style={{ fontSize: 11, color: "var(--mut)" }}>základ {fmtKc(d.workAmt)} + DPH {fmtKc(d.vat)}{(d.notary+d.admin)>0 ? ` + přef. ${fmtKc(d.notary+d.admin)}` : ""}</div>
                  </div>
                  <button className="btn pri" style={{ fontSize: 12, flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); onGenerateInvoice(d.clientId, d.entries); }}>
                    Vystavit fakturu →
                  </button>
                  <span style={{ fontSize: 11, color: "var(--mut)", cursor: "pointer" }}>{expandedDraft === d.clientId ? "▲" : "▼"}</span>
                </div>
                {expandedDraft === d.clientId && (
                  <div style={{ borderTop: "1px solid var(--line)", background: "#FAFAFA" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead><tr style={{ background: "#F3F0FF" }}>
                        <th style={{ padding: "8px 18px", textAlign: "left", fontWeight: 500, color: "var(--mut)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Datum</th>
                        <th style={{ padding: "8px 18px", textAlign: "left", fontWeight: 500, color: "var(--mut)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Popis</th>
                        <th style={{ padding: "8px 18px", textAlign: "right", fontWeight: 500, color: "var(--mut)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Hodiny</th>
                        <th style={{ padding: "8px 18px", textAlign: "right", fontWeight: 500, color: "var(--mut)", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" }}>Bez DPH</th>
                      </tr></thead>
                      <tbody>
                        {d.entries.sort((a,b)=>(a.entry_date||"").localeCompare(b.entry_date||"")).map(e => (
                          <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
                            <td style={{ padding: "10px 18px", color: "var(--mut)", whiteSpace: "nowrap" }}>{fmtDate(e.entry_date)}</td>
                            <td style={{ padding: "10px 18px", color: "var(--txt)" }}>
                              {e.description}
                              {(e.notary_fee > 0 || e.admin_fee > 0) && (
                                <span style={{ fontSize: 10.5, color: "var(--mut)", marginLeft: 8 }}>
                                  {e.notary_fee > 0 && `+notář ${fmtKc(e.notary_fee)}`}
                                  {e.admin_fee > 0 && ` +sp.pop. ${fmtKc(e.admin_fee)}`}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "10px 18px", textAlign: "right", color: "var(--mut)" }}>{e.hours > 0 ? `${e.hours} h` : "—"}</td>
                            <td style={{ padding: "10px 18px", textAlign: "right", fontFamily: "Fraunces, serif", fontWeight: 300 }}>
                              {fmtKc((e.amount||0)+(e.notary_fee||0)+(e.admin_fee||0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STATISTIKY ── */}
      <div className="kpi-row">
        <div className="kpi hi">
          <div className="k">Fakturováno celkem — bez DPH</div>
          <div className="v">{fmtKc(total)}</div>
          <div className="s">s DPH: {fmtKc(invoices.reduce((s,i) => s+(i.total||0),0))} · {invoices.length} faktur</div>
        </div>
        <div className="kpi">
          <div className="k">Neuhrazeno — bez DPH</div>
          <div className="v">{fmtKc(nezaplaceno)}</div>
          <div className="s">s DPH: {fmtKc(invoices.filter(i=>invoiceStatus(i)!=="uhrazena").reduce((s,i)=>s+(i.total||0),0))} · čeká na platbu</div>
        </div>
        <div className="kpi">
          <div className="k">Po splatnosti — bez DPH</div>
          <div className="v" style={{ color: poSplatnosti > 0 ? "#DC2626" : "var(--txt)" }}>{fmtKc(poSplatnosti)}</div>
          <div className="s" style={{ color: poSplatnosti > 0 ? "#DC2626" : "var(--mut)" }}>
            {poSplatnosti > 0 ? `s DPH: ${fmtKc(invoices.filter(i=>invoiceStatus(i)==="po_splatnosti").reduce((s,i)=>s+(i.total||0),0))} — nutná akce` : "vše v pořádku"}
          </div>
        </div>
      </div>

      {/* ── FILTRY A HISTORIE ── */}
      <div className="sec-hd" style={{ marginBottom: 12 }}><span>Historie faktur</span></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="search" style={{ maxWidth: 280 }}>
          <span style={{ color: "var(--mut)", fontSize: 14 }}>⌕</span>
          <input placeholder="Hledat fakturu, klienta…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          style={{ font: "inherit", fontSize: 13, padding: "8px 12px", border: "1px solid var(--line2)", borderRadius: 8, color: filterClient ? "var(--ink)" : "var(--mut)", background: "#fff", cursor: "pointer", minWidth: 160 }}>
          <option value="">Všichni klienti</option>
          {clients.sort((a,b) => a.name.localeCompare(b.name, "cs")).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ font: "inherit", fontSize: 13, padding: "8px 12px", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--mut)", background: "#fff", cursor: "pointer" }}>
          <option value="date_desc">Nejnovější</option>
          <option value="date_asc">Nejstarší</option>
          <option value="number">Číslo faktury</option>
          <option value="amount_desc">Částka ↓</option>
          <option value="amount_asc">Částka ↑</option>
        </select>
        <button className={`btn${showFilters ? "" : " gho"}`} onClick={() => setShowFilters(p => !p)} style={{ fontSize: 12 }}>
          {showFilters ? "Skrýt filtry" : "Datum & stav ▾"}
        </button>
        {hasFilters && (
          <button className="btn gho" style={{ fontSize: 12, color: "#DC2626" }}
            onClick={() => { setSearch(""); setFilterClient(""); setFilterStatus("vse"); setDateFrom(""); setDateTo(""); }}>
            Zrušit filtry ×
          </button>
        )}
      </div>

      {showFilters && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500 }}>Stav:</span>
          {[["vse","Vše"],["vystavena","Vystavena"],["uhrazena","Uhrazena"],["po_splatnosti","Po splatnosti"]].map(([k,l]) => (
            <span key={k} className={"fchip"+(filterStatus===k?" on":"")} onClick={()=>setFilterStatus(k)}>{l}</span>
          ))}
          <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500, marginLeft: 8 }}>Datum od:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ font: "inherit", fontSize: 13, padding: "6px 10px", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--txt)", background: "#fff" }} />
          <span style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mut)", fontWeight: 500 }}>do:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ font: "inherit", fontSize: 13, padding: "6px 10px", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--txt)", background: "#fff" }} />
        </div>
      )}

      {loading && <div className="loading">Načítám faktury…</div>}
      {!loading && (
        <table className="tbl">
          <thead><tr>
            <th>Klient</th><th>Číslo faktury</th><th>Vystavena</th><th>Splatnost</th><th style={{ textAlign: "right" }}>Základ / S DPH</th><th style={{ textAlign: "right" }}>Stav</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--mut)", fontSize: 13 }}>
                {hasFilters ? "Žádné faktury neodpovídají filtru." : "Žádné faktury."}
              </td></tr>
            )}
            {filtered.map(inv => (
              <tr key={inv.id} onClick={() => onOpen(inv.id)}>
                <td>
                  <div className="t-name"
                    style={{ color: inv.client_id ? "var(--ink)" : "var(--txt)", cursor: inv.client_id ? "pointer" : "default", fontWeight: 500 }}
                    onClick={e => { if (inv.client_id) { e.stopPropagation(); onOpenClient(inv.client_id); } }}
                    title={inv.client_id ? "Otevřít kartu klienta" : undefined}>
                    {clientName(inv)}
                    {inv.client_id && <span style={{ fontSize: 10, marginLeft: 4, opacity: .5 }}>↗</span>}
                  </div>
                  {inv.clients?.ico && <div className="t-sub">IČO: {inv.clients.ico}</div>}
                </td>
                <td className="t-date" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {(() => {
                    const desc = (inv.items || []).map(it => it.description).filter(Boolean).join("\n");
                    return desc ? (
                      <div className="tt-wrap">
                        <span>{inv.invoice_number || "—"}</span>
                        <div className="tt">{desc}</div>
                      </div>
                    ) : <span>{inv.invoice_number || "—"}</span>;
                  })()}
                </td>
                <td className="t-date">{fmtDate(inv.issue_date)}</td>
                <td className="t-date">{fmtDate(inv.due_date)}</td>
                <td style={{ textAlign: "right" }}>
                  <div className="t-amt">{fmtKc(inv.subtotal)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 2 }}>s DPH: {fmtKc(inv.total)}</div>
                </td>
                <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                  <StatusToggle inv={inv} />
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                  <button className="btn gho" style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => onOpen(inv.id, "edit")}>✎</button>
                  <button className="btn gho" style={{ fontSize: 11, padding: "4px 8px", color: "#DC2626" }}
                    onClick={() => onOpen(inv.id, "delete")}>✕</button>
                </td>
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
        <div className="mf"><div className="ml">Základ bez DPH</div><div className="mv" style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 300, color: "var(--gold)" }}>{fmtKc(inv.subtotal)}</div></div>
        <div className="mf"><div className="ml">Celkem s DPH</div><div className="mv" style={{ fontSize: 14, color: "var(--mut)" }}>{fmtKc(inv.total)}</div></div>
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
  const [workEntries, setWorkEntries] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [mod, setMod] = useState("dashboard");
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
    Promise.all([
      fetchClients().catch(e => { console.error("clients:", e); return []; }),
      fetchInvoices().catch(e => { console.error("invoices:", e); return []; }),
      fetchWorkEntries().catch(e => { console.error("work:", e); return []; }),
    ])
      .then(([c, i, w]) => { setClients(c); setInvoices(i); setWorkEntries(w); })
      .finally(() => setDataLoading(false));
  }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); setClients([]); setInvoices([]); setWorkEntries([]); };

  const saveWorkEntry = async (e) => {
    setSaving(true);
    try {
      await upsertWorkEntry(e);
      const updated = await fetchWorkEntries();
      setWorkEntries(updated);
      setMode("list"); setSel(null);
    } catch (err) { alert("Chyba: " + err.message); } finally { setSaving(false); }
  };
  const doDeleteWorkEntry = async (id) => {
    try {
      await deleteWorkEntryDb(id);
      setWorkEntries(p => p.filter(e => e.id !== id));
    } catch (err) { alert("Chyba: " + err.message); }
  };

  const generateInvoiceFromEntries = async (clientId, entries) => {
    const client = clients.find(c => c.id === clientId);
    const workItems = entries.filter(e => e.hours > 0).map(e => ({
      id: uid(), description: e.description, hours: e.hours, rate: e.rate, amount: e.amount, no_vat: false
    }));
    const totalNotary = entries.reduce((s,e) => s + (e.notary_fee||0), 0);
    const totalAdmin = entries.reduce((s,e) => s + (e.admin_fee||0), 0);
    const items = [...workItems];
    if (totalNotary > 0) items.push({ id: uid(), description: "Přefakturace — notář", hours: 0, rate: 0, amount: totalNotary, no_vat: true });
    if (totalAdmin > 0) items.push({ id: uid(), description: "Správní poplatek — přefakturace", hours: 0, rate: 0, amount: totalAdmin, no_vat: true });
    const workSubtotal = workItems.reduce((s,i) => s + i.amount, 0);
    const vatAmount = Math.round(workSubtotal * 0.21);
    const subtotal = workSubtotal;
    const total = workSubtotal + vatAmount + totalNotary + totalAdmin;
    const inv = {
      id: uid(), invoice_number: nextInvoiceNumber(invoices),
      client_id: clientId, issue_date: today(), due_date: addDays(today(), 14),
      items, subtotal, vat_rate: 21, vat_amount: vatAmount, total,
      status: "vystavena", notes: "",
    };
    setSaving(true);
    try {
      await upsertInvoice(inv);
      const entryIds = entries.map(e => e.id);
      await Promise.all(entries.map(e => upsertWorkEntry({ ...e, invoice_id: inv.id })));
      const [updatedInvoices, updatedWork] = await Promise.all([fetchInvoices(), fetchWorkEntries()]);
      setInvoices(updatedInvoices); setWorkEntries(updatedWork);
      setSel(inv.id); setMod("fakturace"); setMode("detail");
    } catch (err) { alert("Chyba: " + err.message); } finally { setSaving(false); }
  };

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
  const toggleInvoiceStatus = async (inv) => {
    const newStatus = inv.status === "uhrazena" ? "vystavena" : "uhrazena";
    const updated = { ...inv, status: newStatus };
    setInvoices(p => p.map(i => i.id === inv.id ? { ...i, status: newStatus } : i));
    try { await upsertInvoice(updated); }
    catch (e) { setInvoices(p => p.map(i => i.id === inv.id ? inv : i)); alert("Chyba: " + e.message); }
  };
  const openClientFromInvoice = (clientId) => {
    setSel(clientId); setMod("klienti"); setMode("detail");
  };

  const selClient = clients.find(c => c.id === sel);
  const selInvoice = invoices.find(i => i.id === sel);
  const curMod = MODULES.find(m => m.key === mod);

  const selWorkEntry = workEntries.find(e => e.id === sel);

  const pageTitle = () => {
    if (mod === "dashboard") return "Přehled";
    if (mod === "vykaz") {
      if (mode === "new") return "Nový záznam";
      if (mode === "edit") return "Upravit záznam";
      return "Výkaz práce";
    }
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

          {/* DASHBOARD */}
          {mod === "dashboard" && (
            <Dashboard invoices={invoices} workEntries={workEntries} clients={clients}
              onNav={k => { setMod(k); setMode("list"); setSel(null); }} />
          )}

          {/* VÝKAZ PRÁCE */}
          {mod === "vykaz" && mode === "list" && (
            <WorkEntryList entries={workEntries} clients={clients} invoices={invoices}
              onNew={() => setMode("new")}
              onEdit={e => { setSel(e.id); setMode("edit"); }}
              onDelete={doDeleteWorkEntry}
              onGenerateInvoice={generateInvoiceFromEntries}
              loading={dataLoading} />
          )}
          {mod === "vykaz" && mode === "new" && (
            <WorkEntryForm clients={clients} onSave={saveWorkEntry} onCancel={() => setMode("list")} saving={saving} />
          )}
          {mod === "vykaz" && mode === "edit" && selWorkEntry && (
            <WorkEntryForm init={selWorkEntry} clients={clients} onSave={saveWorkEntry} onCancel={() => setMode("list")} saving={saving} />
          )}

          {/* FAKTURACE */}
          {mod === "fakturace" && curMod?.live && mode === "list" && (
            <InvoiceList
              invoices={invoices} clients={clients} workEntries={workEntries}
              onOpen={(id, action) => {
                setSel(id);
                if (action === "edit") setMode("edit");
                else if (action === "delete") setConfirmDel(id);
                else setMode("detail");
              }}
              onToggleStatus={toggleInvoiceStatus}
              onOpenClient={openClientFromInvoice}
              onGenerateInvoice={generateInvoiceFromEntries}
              loading={dataLoading}
            />
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
