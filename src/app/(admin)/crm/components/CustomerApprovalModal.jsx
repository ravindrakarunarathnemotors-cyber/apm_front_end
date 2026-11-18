"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Collapse, Form, FormControl, FormSelect, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useCompleteCustomerApprovalMutation,
  useGetCustomerApprovalQuery,
  useMarkClientListSentMutation,
  useSaveCustomerApprovalMutation,
  useSendApprovalLogisticsMutation,
  useSendApprovalSmsMutation,
  useSendClientPartsSmsMutation,
} from "./customerApprovalApi";
import { printHtml, savePdf } from "./estimatePdf";
import { DEFAULT_COMPANY, termsHtml, useGetCompanyProfileQuery, useGetTermsQuery } from "./settingsApi";

// Customer Approval (the stage after "Spare Part Review & Order").
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
// Switched off for now (set to true to show them again)
const SHOW_ADD_AGREED_ITEM = false;   // "Add another agreed item" (department / repair type / new item with price)
const SHOW_EXTRA_NOTE = false;        // "Extra note"
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const letter = (n) => String.fromCharCode(97 + (n % 26));
// for now the estimate is only sent by SMS (the other ways can be added back here later)
const VIA = [
  ["SMS", "SMS", "mdi:message-text-outline"],
];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Same look as the spare parts quotation (KARUNARATHNE AUTO ZONE, maroon + gold)
const DOC_CSS = `@page{size:A4;margin:14mm}
:root{--brand:#8f0b0b;--brand-d:#5e0404;--gold:#a8864f;--ink:#1c1917;--muted:#78716c;--line:#e7e2dc;--soft:#f6f4f1}
*{box-sizing:border-box}
body{font-family:"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);margin:0;font-size:12.5px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:794px;margin:0 auto;padding:24px 28px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding-bottom:14px;border-bottom:3px solid var(--brand)}
.top > div:first-child{flex:1 1 auto;min-width:0}
.top > .doc{flex:0 0 auto;max-width:42%}
.top img{height:56px;width:auto;max-width:120px;object-fit:contain;display:block;flex:0 0 auto}
.brandname{font-size:16px;font-weight:800;letter-spacing:.05em;line-height:1.25;color:var(--brand);overflow-wrap:anywhere}
.doc{text-align:right}
.doc .t{font-size:22px;font-weight:700;letter-spacing:.14em;white-space:nowrap;text-transform:uppercase;color:var(--brand)}
.doc .s{font-size:11px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase}
.gold{height:3px;background:var(--gold);margin-top:3px}
.co{overflow-wrap:anywhere;font-size:10.5px;line-height:1.5;color:#57534e;margin-top:3px}
.dm{margin-top:6px;font-size:11.5px;display:inline-grid;grid-template-columns:auto auto;gap:1px 12px;text-align:left}.dm span{color:var(--muted)}.dm b{text-align:right}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0 6px;align-items:stretch}
.box{border:1px solid var(--line);border-radius:6px;overflow:hidden}
.box h3{margin:0;background:var(--soft);padding:6px 12px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);border-bottom:1px solid var(--line)}
.box .b{padding:9px 12px;font-size:12px;line-height:1.6}
.vg{display:grid;grid-template-columns:auto 1fr;gap:2px 14px}.vg span{color:var(--muted)}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:16px 0 4px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.meta div{padding:9px 12px;border-right:1px solid var(--line);background:var(--soft)}
.meta div:last-child{border-right:0}
.meta dt{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0}
.meta dd{margin:2px 0 0;font-weight:600;font-size:13px;word-break:break-word}
h2{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:22px 0 8px;display:flex;align-items:center;gap:8px}
h2:after{content:"";flex:1;height:1px;background:var(--line)}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:var(--brand);color:#fff;text-align:left;padding:7px 9px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
td{padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:nth-child(even) td{background:#fbfaf8}
.c{text-align:center;color:var(--muted);width:32px}
.empty{color:var(--muted);text-align:center;padding:12px}
.note{color:var(--muted);font-size:11.5px;margin:0 0 6px}
.badge{display:inline-block;padding:1px 9px;border-radius:99px;font-size:10.5px;font-weight:600;background:#f3ede4;color:#6b5320}
.badge.ok{background:#eaf3ee;color:#2f6f4f}
.sum{margin:18px 0 0 auto;width:320px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.sum div{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--line)}
.sum div:last-child{border-bottom:0}
.sum .g{background:var(--brand);color:#fff;font-size:14px;font-weight:700;letter-spacing:.04em}
.sign{display:flex;gap:40px;margin-top:46px}
.sign div{flex:1;border-top:1px solid #999;padding-top:5px;color:var(--muted);font-size:11px}
.foot{margin-top:26px;padding-top:8px;border-top:2px solid var(--gold);text-align:center;color:var(--muted);font-size:10.5px;letter-spacing:.08em}
table,tr,.sum,.sign{page-break-inside:avoid}
@media print{.page{padding:0}}`;
const when = (v) => (v ? new Date(v).toLocaleString() : "");
const toWaNumber = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("94")) return d;
  return d.startsWith("0") ? `94${d.slice(1)}` : d;
};

// One collapsible section: coloured icon, title, short summary and a done tick.
// estHours is stored as decimal hours (1.5 = 1 hr 30 min); the form shows Hours and Minutes separately
const splitHM = (v) => { const t = Number(v) || 0; let h = Math.floor(t + 1e-6); let m = Math.round((t - h) * 60); if (m >= 60) { h += 1; m = 0; } return [h, m]; };
const joinHM = (h, m) => { const t = Math.round(((Number(h) || 0) + (Number(m) || 0) / 60) * 10000) / 10000; return t > 0 ? String(t) : ""; };
const fmtTime = (hours, days) => {
  const [h, m] = splitHM(hours); const d = Number(days) || 0;
  return [d > 0 ? `${d} Day${d === 1 ? "" : "s"}` : "", h > 0 ? `${h} Hrs` : "", m > 0 ? `${m} Min` : ""].filter(Boolean).join(" ");
};

// Time picker: big - / + buttons around the number, plus one-tap quick values
function TimeStepper({ label, unit, icon, value, onChange, step, quick, disabled }) {
  const n = value === "" || value === null || value === undefined ? 0 : Number(value) || 0;
  const setN = (v) => { const x = Math.max(0, Math.round(v * 10) / 10); onChange(x === 0 ? "" : String(x)); };
  return (
    <div className="ts-box">
      <div className="ts-label"><Icon icon={icon} width="18" height="18" /> {label}</div>
      <div className="ts-row">
        <button type="button" className="ts-btn" disabled={disabled || n <= 0} onClick={() => setN(n - step)} aria-label={`Decrease ${label}`}><Icon icon="mdi:minus" width="24" height="24" /></button>
        <div className="ts-val">
          <input type="number" inputMode="decimal" min="0" step={step} disabled={disabled} placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
          <span>{unit}</span>
        </div>
        <button type="button" className="ts-btn" disabled={disabled} onClick={() => setN(n + step)} aria-label={`Increase ${label}`}><Icon icon="mdi:plus" width="24" height="24" /></button>
      </div>
      <div className="ts-chips">
        {quick.map((q) => (
          <button key={q} type="button" disabled={disabled} className={`ts-chip ${n === q ? "on" : ""}`} onClick={() => setN(q)}>{q}</button>
        ))}
        <button type="button" disabled={disabled || n === 0} className="ts-chip clr" onClick={() => onChange("")}>Clear</button>
      </div>
    </div>
  );
}

function Card({ title, hint, right, children, icon = "mdi:clipboard-text-outline", color: _sectionColor, summary, done, defaultOpen = true, anchor }) {
  const color = "#c8102e"; // one theme colour for every section (black + red)
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-ca={anchor} className="bg-white rounded-3 mb-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,.07)", borderLeft: `4px solid ${color}` }}>
      <div className="d-flex flex-wrap align-items-center gap-2 p-2 px-3" role="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{ background: open ? `color-mix(in srgb, ${color} 7%, white)` : "#fff", borderRadius: open ? "0.45rem 0.45rem 0 0" : "0.45rem" }}>
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
          <Icon icon={icon} width="20" height="20" />
        </span>
        <div className="me-auto" style={{ minWidth: 150 }}>
          <div className="fw-bold d-flex align-items-center gap-2">{title}{done === true && <Icon icon="mdi:check-circle" width="18" height="18" className="text-success" />}</div>
          {hint && open && <div className="small text-muted">{hint}</div>}
          {summary ? <div className="small text-muted">{summary}</div> : null}
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" className="text-muted flex-shrink-0" />
      </div>
      <Collapse in={open}><div><div className="p-3 border-top">{children}</div></div></Collapse>
    </div>
  );
}

// A row "label ........ amount" of the estimate
const Line = ({ label, value, strong, muted }) => (
  <div className={`d-flex justify-content-between py-1 ${strong ? "fw-bold" : ""} ${muted ? "text-muted" : ""}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

// Big YES / NO style switch
function Choice({ value, onChange, options, disabled }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      {options.map(([v, label, icon]) => (
        <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)}
          className={`btn btn-sm d-flex align-items-center gap-2 ${value === v ? "btn-primary" : "btn-outline-secondary"}`}>
          {icon && <Icon icon={icon} width="18" height="18" />}{label}
        </button>
      ))}
    </div>
  );
}

export default function CustomerApprovalModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch, isFetching } = useGetCustomerApprovalQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveCustomerApprovalMutation();
  const [complete, { isLoading: completing }] = useCompleteCustomerApprovalMutation();
  const [markSent] = useMarkClientListSentMutation();
  const [sendLogistics, { isLoading: sendingLogi }] = useSendApprovalLogisticsMutation();
  const [sendSmsApi] = useSendApprovalSmsMutation();
  const [sendPartsSms] = useSendClientPartsSmsMutation();
  const [partsBusy, setPartsBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const [manualDraft, setManualDraft] = useState({ description: "", amount: "" });
  const [scopeDraft, setScopeDraft] = useState("");
  const [scopeDept, setScopeDept] = useState("");      // department of the "Add another agreed item" picker (empty = this department)
  const [scopeParent, setScopeParent] = useState("");
  const [scopePrice, setScopePrice] = useState("");
  const snapRef = useRef("");
  const fileRef = useRef(null);

  // Show the problem in a SweetAlert; when it is closed, jump to the section that needs fixing (opens it if collapsed)
  const problem = (msg, anchor) => {
    setError(msg);
    Swal.fire({ title: "Please check", text: msg, icon: "error", confirmButtonText: "OK, show me", confirmButtonColor: "#111" }).then(() => {
      const el = document.querySelector(`.ca-modal [data-ca="${anchor}"]`);
      if (!el) return;
      const head = el.querySelector("[aria-expanded]");
      if (head && head.getAttribute("aria-expanded") === "false") head.click();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ca-flash");
      setTimeout(() => el.classList.remove("ca-flash"), 2500);
      setTimeout(() => el.querySelector("input:not([type=hidden]):not([disabled]), textarea")?.focus?.({ preventScroll: true }), 450);
    });
  };
  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });
  const job = data?.job, ctx = data?.context, saved = data?.saved;
  // what the customer can bring: the spare parts AND the third-party items (a third-party item is saved as the negative number of its id)
  const selParts = ctx ? [...ctx.parts, ...(ctx.quotes || []).map((q) => ({ id: -q.id, name: q.description, brand: "Third party", quality: "", qty: 1, isQuote: true }))] : [];
  const readOnly = data && !data.canRecord;

  // The form is filled once from the saved data (the saved time stamps keep coming from the server)
  useEffect(() => {
    if (!data || form) return;
    const s = data.saved;
    const f = {
      estHours: s.estHours ?? "", estDays: s.estDays ?? "", includeSpareParts: s.includeSpareParts, includeLabour: s.includeLabour,
      manualItems: [], washOptionIds: [], sentVia: (s.sentVia || []).filter((v) => v === "SMS"),
      decision: s.decision, agreedScope: s.agreedScope || [], extraNote: s.extraNote || "", partsBy: s.partsBy,
      clientPartsFiles: s.clientPartsFiles || [], clientParts: s.clientParts || [], thirdPartyNote: s.thirdPartyNote || "",
    };
    setForm(f); snapRef.current = JSON.stringify(f);
  }, [data, form]);

  // what goes into the estimate sent to the customer (all selected by default, each can be removed)
  // "Did you receive the customer's confirmation?" - until it is Yes the confirmation / spare parts / final estimate sections are muted
  const [replyYes, setReplyYes] = useState(null);
  const { data: companyData } = useGetCompanyProfileQuery();   // Settings > Company profile (name + logo on the documents)
  const company = { ...DEFAULT_COMPANY, ...(companyData?.company || {}) };
  const { data: termsData } = useGetTermsQuery();   // Settings > Terms & conditions (printed on the estimate)
  const [viewEst, setViewEst] = useState(null);   // estimate preview: null | "full" | "agreed"
  const [sendSel, setSendSel] = useState({ labour: true, parts: true, quotes: true, time: true });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, v) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  // ---- live estimate ----
  const computeCalc = (form) => {
    if (!form || !ctx) return { spare: 0, labour: 0, manual: 0, repair: 0, markup: 0, pct: 0, wash: 0, total: 0, spareAll: 0, labourAll: 0 };
    // by what the customer agreed: "Agreed scope only" counts only the ticked repair items; spare parts the customer brings are not charged
    const keyOf = (l) => l.repairType || l.description;
    const labourLines = ctx.labour.filter((l) => !l.warrantyClaim && (form.decision !== "PARTIAL" || form.agreedScope.includes(keyOf(l))));
    const partLines = ctx.parts.filter((p) => !p.warrantyClaim && !(form.partsBy === "CLIENT" && form.clientParts.includes(p.id)));
    const partsBase = partLines.reduce((s, r) => s + r.qty * r.unitPrice, 0);
    const quoteLines = ctx.quotes.filter((q) => !(form.partsBy === "CLIENT" && form.clientParts.includes(-q.id)));   // the customer brings it himself: not charged
    const quotesBase = quoteLines.reduce((s, q) => s + q.quotedPrice, 0);
    const inclQ = form.includeQuotes ?? form.includeSpareParts;   // third-party quotations can be switched on / off on their own
    const labourBase = labourLines.reduce((s, r) => s + (r.amount || 0), 0);
    const spare = (form.includeSpareParts ? partsBase : 0) + (inclQ ? quotesBase : 0);
    const labour = form.includeLabour ? labourBase : 0;
    const manual = form.manualItems.reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const wash = ctx.washOptions.filter((o) => form.washOptionIds.includes(o.id)).reduce((s, o) => s + o.price, 0);
    // price adjustment (markup %) chosen in the Vehicle Job Inspection: added on spare parts + cost for repair (not on wash)
    const pct = Number(ctx.markupPercent) || 0;                          // repair + manual lines
    const spct = Number(ctx.sparePercent ?? ctx.markupPercent) || 0;     // spare parts + quotations have their own %
    // the % is added to the unit price of each line: markup of a line = qty x (unit price + % - unit price)
    const lineAdj = (q, u, pc = pct) => Math.round((Number(q) || 0) * (Math.round((Number(u) || 0) * (100 + pc)) / 100 - (Number(u) || 0)) * 100) / 100;
    const partsMkAll = partLines.reduce((s, r) => s + lineAdj(r.qty, r.unitPrice, spct), 0);
    const quotesMkAll = quoteLines.reduce((s, q) => s + lineAdj(1, q.quotedPrice, spct), 0);
    const labourMkAll = labourLines.reduce((s, r) => s + lineAdj(r.qty || 1, r.unitPrice ?? r.amount), 0);
    const spareMk = (form.includeSpareParts ? partsMkAll : 0) + (inclQ ? quotesMkAll : 0);
    const labourMk = form.includeLabour ? labourMkAll : 0;
    const markup = Math.round((spareMk + labourMk + form.manualItems.reduce((s, m) => s + lineAdj(1, m.amount), 0)) * 100) / 100;
    return { spare, labour, manual, repair: labour + manual, markup, pct, spct, wash, total: spare + labour + manual + markup + wash,
      spareAll: Math.round((partsBase + partsMkAll + quotesBase + quotesMkAll) * 100) / 100,
      partsAll: Math.round((partsBase + partsMkAll) * 100) / 100, quotesAll: Math.round((quotesBase + quotesMkAll) * 100) / 100,
      spareShown: Math.round((spare + spareMk) * 100) / 100, labourAll: Math.round((labourBase + labourMkAll) * 100) / 100 };
  };
  const calc = useMemo(() => computeCalc(form), [form, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  // The estimate sent to the customer BEFORE the confirmation: every repair selected in the Vehicle Job Inspection and every spare part (no agreement applied yet)
  const fullOf = (f) => (f ? { ...f, decision: null, agreedScope: [], partsBy: null, clientParts: [], includeSpareParts: sendSel.parts, includeQuotes: sendSel.quotes, includeLabour: sendSel.labour } : f);
  const calcFull = useMemo(() => computeCalc(fullOf(form)), [form, ctx, sendSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = form && JSON.stringify(form) !== snapRef.current;
  const payload = () => ({
    jobId, estHours: form.estHours === "" ? null : Number(form.estHours), estDays: form.estDays === "" ? null : Number(form.estDays),
    includeSpareParts: form.includeSpareParts, includeLabour: form.includeLabour, manualItems: form.manualItems,
    washOptionIds: form.washOptionIds, sentVia: form.sentVia, decision: form.decision, agreedScope: form.agreedScope,
    extraNote: form.extraNote, partsBy: form.partsBy, clientPartsFiles: form.clientPartsFiles, clientParts: form.clientParts,
    thirdPartyRequest: Boolean(saved?.thirdPartyRequest), thirdPartyNote: form.thirdPartyNote,
  });
  const doSave = async () => {
    await save(payload()).unwrap();
    snapRef.current = JSON.stringify(form);
  };
  // Auto-save: ~1.5 s after the last change the form is saved (a failed auto-save stays quiet: Save / the close question still work)
  const [autoState, setAutoState] = useState("");   // "" | "pending" | "saving" | "saved" | "failed"
  const autoBusy = useRef(false);
  const formKey = form ? JSON.stringify(form) : null;
  useEffect(() => {
    if (!data || !form || readOnly || formKey === null || formKey === snapRef.current) return undefined;
    setAutoState("pending");
    const t = setTimeout(async () => {
      if (autoBusy.current) return;
      autoBusy.current = true;
      setAutoState("saving");
      try { await save(payload()).unwrap(); snapRef.current = formKey; setAutoState("saved"); }
      catch (_) { setAutoState("failed"); }
      finally { autoBusy.current = false; }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey, readOnly, !!data]);

  const saveClick = async () => {
    setError("");
    try { await doSave(); Swal.fire({ title: "Saved", icon: "success", timer: 900, showConfirmButton: false }); } catch (ex) { problem(ex?.data?.message || "Could not save.", "time"); }
  };

  const finish = async () => {
    setError("");
    if (!form.estHours && !form.estDays) return problem("Enter the estimated time of repair.", "time");
    if (!(replyYes ?? Boolean(form.decision))) return problem("Answer \"Did you receive the customer's confirmation?\" with Yes first.", "reply");
    // sending the estimate by SMS is optional: the stage can be completed without it
    if (!form.decision) return problem("Select the customer confirmation.", "decision");
    if (form.decision === "PARTIAL" && form.agreedScope.length === 0) return problem("Tick the repair items the customer agreed to.", "decision");
    if (!form.partsBy) return problem("Select who provides the spare parts.", "parts");
    if (form.partsBy === "CLIENT" && form.clientParts.length === 0 && form.clientPartsFiles.length === 0) return problem("Tick the spare parts the customer brings.", "parts");
    const ok = await Swal.fire({ title: "Complete Customer Approval?", text: `${job.jobNo} moves to the next stage. This form can no longer be changed.`, icon: "question", showCancelButton: true, confirmButtonText: "Complete" });
    if (!ok.isConfirmed) return;
    try {
      await doSave();
      const r = await complete(jobId).unwrap();
      await Swal.fire({ title: "Done!", icon: "success", timer: 1200, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { problem(ex?.data?.message || "Could not complete the stage.", "decision"); }
  };

  const tryClose = async () => {
    if (!dirty && !manualDraft.description.trim() && !scopeDraft.trim()) return onHide();
    const r = await Swal.fire({ title: "Save your changes?", text: "You have changes that are not saved yet.", icon: "warning", showCancelButton: true, showDenyButton: true, confirmButtonText: "Save & close", denyButtonText: "Close without saving", cancelButtonText: "Stay" });
    if (r.isConfirmed) { try { await doSave(); onHide(); } catch (ex) { setError(ex?.data?.message || "Could not save."); } }
    else if (r.isDenied) onHide();
  };

  // ---- manual lines / agreed scope ----
  const addManual = () => {
    if (!manualDraft.description.trim()) return problem("Write the description of the line.", "estimate");
    const amt = Number(manualDraft.amount || 0);
    if (!Number.isFinite(amt) || amt < 0) return problem("Enter a valid amount.", "estimate");
    setError(""); set({ manualItems: [...form.manualItems, { description: manualDraft.description.trim(), amount: amt }] }); setManualDraft({ description: "", amount: "" });
  };
  // a new agreed item typed here: saved as text, with the price in brackets when given ("Item (Rs. 1,500.00)")
  const addScope = () => {
    const t = scopeDraft.trim(); if (!t) return;
    const price = Number(scopePrice);
    if (scopePrice !== "" && !(price >= 0)) return Swal.fire({ title: "Please check", text: "Enter a valid price.", icon: "error" });
    const text = scopePrice !== "" ? `${t} (${money(price)})` : t;
    if (!form.agreedScope.includes(text)) set({ agreedScope: [...form.agreedScope, text] });
    setScopeDraft(""); setScopePrice("");
  };

  // ---- customer's spare part list ----
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return Swal.fire({ title: "File too large", text: "Max 15 MB.", icon: "warning" });
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
      set({ clientPartsFiles: [...form.clientPartsFiles, { url: URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl, name: f.name }] });
    } catch (ex) { fail(ex, "Upload failed"); } finally { setUploading(false); }
  };
  const sendToCustomer = async () => {
    if (form.clientParts.length === 0) return problem("Tick the spare parts the customer brings first.", "parts");
    setError("");
    try {
      await doSave();
      const phone = await askPhone("Send the spare parts report link by SMS");
      if (phone === null) return;
      const r = await sendPartsSms({ jobId, phone }).unwrap();
      if (r.sms?.sent) Swal.fire({ title: "SMS sent", text: r.sms.to ? `The spare parts report link was sent to ${r.sms.to}` : "The customer got the link.", icon: "success", timer: 2000, showConfirmButton: false });
      else Swal.fire({ title: "SMS not sent", text: r.sms?.error || "Could not send the SMS.", icon: "error" });
    } catch (ex) { fail(ex, "Could not send."); }
  };

  // ---- The spare parts report (the parts the customer brings): same look as the estimate; downloaded as a PDF ----
  const downloadPartsReport = async () => {
    const chosen = selParts.filter((p) => form.clientParts.includes(p.id));
    if (chosen.length === 0) return problem("Tick the spare parts the customer brings first.", "parts");
    const logo = company.logoUrl || `${window.location.origin}/images/mainlogo.jpeg`;
    const today = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    const R = 'style="text-align:right"';
    const qty = chosen.reduce((t, p) => t + (Number(p.qty) || 0), 0);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Spare parts report ${esc(job.jobNo)}</title><style>${DOC_CSS}</style></head><body><div class="page">
<div class="top">
  <div style="display:flex;align-items:center;gap:12px"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div class="brandname" style="min-width:0">${esc(company.name)}</div></div>
  <div class="doc"><div class="t">Spare parts report</div><div class="s">Parts provided by the customer</div></div>
</div><div class="gold"></div>
<dl class="meta">
  <div><dt>Job</dt><dd>${esc(job.jobNo)}</dd></div>
  <div><dt>Customer</dt><dd>${esc(job.customerName)}</dd></div>
  <div><dt>Vehicle no</dt><dd>${esc(job.regNo)}</dd></div>
  <div><dt>Date</dt><dd>${today}</dd></div>
</dl>
<div class="note" style="margin-top:6px">Department: ${esc(job.departmentName)} · Please bring the spare parts listed below to the workshop.</div>
<h2>Spare parts to bring</h2>
<table><thead><tr><th class="c" style="color:#fff">#</th><th>Spare part</th><th ${R}>Qty</th></tr></thead><tbody>${chosen.map((p, n) => `<tr><td class="c">${n + 1}</td><td><b>${esc(p.name)}</b></td><td ${R}><b>${p.qty}</b></td></tr>`).join("")}</tbody></table>
<div class="sum"><div class="g"><span>${chosen.length} item(s)</span><span>Total qty ${qty}</span></div></div>
<div class="sign"><div>Prepared by</div><div>Customer</div></div>
<div class="foot">${esc(company.name)} · Thank you for choosing us</div>
</div></body></html>`;
    setPartsBusy(true);
    try { await savePdf(html, `Spare-parts-${job.jobNo}`); } finally { setPartsBusy(false); }
  };

  // ---- Logistic & Stock ----
  const logistics = async (kind) => {
    setError("");
    try {
      await doSave();
      const r = await sendLogistics({ jobId, kind, note: kind === "THIRD_PARTY" ? form.thirdPartyNote : undefined }).unwrap();
      Swal.fire({ title: "Sent to Logistic & Stock", text: r.sms?.sent ? "The link was also sent by SMS." : "Recorded. The Logistic & Stock department can see it in the spare parts list.", icon: "success", timer: 1800, showConfirmButton: false });
    } catch (ex) { fail(ex, "Could not send the request."); }
  };

  // ---- The estimate document (shared by Download PDF and Print) ----
  const buildEstimateHtml = (full = false) => {
    const F = full ? fullOf(form) : form;
    const C = full ? calcFull : calc;
    const logo = company.logoUrl || `${window.location.origin}/images/mainlogo.jpeg`;
    const today = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    const R = 'style="text-align:right"';
    const washSel = ctx.washOptions.filter((o) => F.washOptionIds.includes(o.id));
    // only what the customer agreed: the ticked repair items ("Agreed scope only"), and not the spare parts the customer brings himself
    const keyOf = (l) => l.repairType || l.description;
    const ownParts = F.partsBy === "CLIENT" ? selParts.filter((p) => F.clientParts.includes(p.id)) : [];
    const docParts = ctx.parts.filter((p) => !ownParts.includes(p));
    const docQuotes = ctx.quotes.filter((q) => !ownParts.some((o) => o.id === -q.id));
    const docLabour = ctx.labour.filter((l) => F.decision !== "PARTIAL" || F.agreedScope.includes(keyOf(l)));
    // prices as in the Vehicle Job Inspection: the price adjustment % is already inside each unit price
    const adjU = (u) => Math.round((Number(u) || 0) * (100 + C.pct)) / 100;                     // repair lines
    const adjS = (u) => Math.round((Number(u) || 0) * (100 + (C.spct ?? C.pct))) / 100;        // spare parts / quotations
    const WC = '<b style="color:#15803d">Warranty claim</b>';
    const inclQ = F.includeQuotes ?? F.includeSpareParts;   // third-party quotations: only when selected
    const partRows = [
      ...(F.includeSpareParts ? docParts : []).map((p, n) => `<tr><td class="c">${n + 1}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.brand || "-")}</td><td ${R}>${p.qty}</td><td ${R}>${p.warrantyClaim ? `<s>${money(adjS(p.unitPrice))}</s>` : money(adjS(p.unitPrice))}</td><td ${R}>${p.warrantyClaim ? WC : `<b>${money(p.qty * adjU(p.unitPrice))}</b>`}</td></tr>`),
      ...(inclQ ? docQuotes : []).map((q, n) => `<tr><td class="c">${(F.includeSpareParts ? docParts.length : 0) + n + 1}</td><td><b>${esc(q.description)}</b> (third party)</td><td>-</td><td ${R}>1</td><td ${R}>${money(adjS(q.quotedPrice))}</td><td ${R}><b>${money(adjS(q.quotedPrice))}</b></td></tr>`),
    ].join("");
    const labourRows = [
      ...(F.includeLabour ? docLabour.map((l) => `<tr><td>${esc(l.description)}${(l.qty || 1) > 1 ? ` × ${l.qty}` : ""}</td><td ${R}>${l.warrantyClaim ? WC : money((l.qty || 1) * adjU(l.unitPrice ?? l.amount))}</td></tr>`) : []),
      ...F.manualItems.map((m) => `<tr><td>${esc(m.description)}</td><td ${R}>${money(m.amount)}</td></tr>`),
    ].join("");
    const time = (full && !sendSel.time) ? "-" : (fmtTime(F.estHours, F.estDays) || "-");
    // company address / phone / email under the company name, and the vehicle details of the job
    const coLines = [company.address, [company.phone, company.email].filter(Boolean).join("  ·  "), company.website].filter(Boolean).map((x) => esc(x).replace(/\n/g, "<br/>")).join("<br/>");
    const vehRows = [
      ["Vehicle no", job.regNo], ["Chassis no", job.chassisNo], ["Engine no", job.engineNo],
      ["Year", job.yearOfManufacture], ["Colour", job.colour], ["Mileage", job.mileageKm ? `${Number(job.mileageKm).toLocaleString()} km` : ""], ["Tyre size", job.tyreSize],
    ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => `<span>${k}</span><b>${esc(String(v))}</b>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Estimate ${esc(job.jobNo)}</title><style>${DOC_CSS}</style></head><body><div class="page">
<div class="top">
  <div style="display:flex;align-items:center;gap:12px"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div style="min-width:0"><div class="brandname">${esc(company.name)}</div>${coLines ? `<div class="co">${coLines}</div>` : ""}</div></div>
  <div class="doc"><div class="t">Estimate</div><div class="s">Repair estimation</div>
    <div class="dm"><span>Estimate no</span><b>${esc(job.jobNo)}</b><span>Date</span><b>${today}</b>${job.departmentName ? `<span>Department</span><b>${esc(job.departmentName)}</b>` : ""}</div></div>
</div><div class="gold"></div>
<div class="parties">
  <div class="box"><h3>Customer</h3><div class="b"><b style="font-size:13px">${esc(job.customerName)}</b>${job.customerAddress ? `<br/>${esc(job.customerAddress).replace(/\n/g, "<br/>")}` : ""}${job.contactNumber ? `<br/>Tel: ${esc(job.contactNumber)}` : ""}${job.customerEmail ? `<br/>${esc(job.customerEmail)}` : ""}</div></div>
  <div class="box"><h3>Vehicle</h3><div class="b"><div class="vg">${vehRows}</div></div></div>
</div>
<div class="note" style="margin-top:6px">Estimated time of repair: <b>${esc(time)}</b> (including spare parts availability)</div>
${ownParts.length ? `<p class="note"><b>Spare parts provided by the customer (not charged):</b> ${ownParts.map((p) => `${esc(p.name)} × ${p.qty}`).join("; ")}</p>` : ""}
${F.decision === "PARTIAL" ? `<p class="note"><b>Agreed scope only</b></p>` : ""}
${partRows ? `<h2>Spare parts</h2><table><thead><tr><th class="c" style="color:#fff">#</th><th>Item</th><th>Brand</th><th ${R}>Qty</th><th ${R}>Unit price</th><th ${R}>Total</th></tr></thead><tbody>${partRows}</tbody></table>` : ""}
${labourRows ? `<h2>Repair &amp; labour</h2>${F.includeLabour && ctx.rootCauses.length ? `<p class="note"><b>Root causes:</b> ${ctx.rootCauses.map(esc).join("; ")}</p>` : ""}<table><thead><tr><th>Work</th><th ${R}>Amount</th></tr></thead><tbody>${labourRows}</tbody></table>` : ""}
${washSel.length ? `<h2>Wash</h2><table><thead><tr><th>Wash type</th><th ${R}>Price</th></tr></thead><tbody>${washSel.map((o) => `<tr><td>${esc(o.group ? `${o.group} > ${o.name}` : o.name)}</td><td ${R}>${money(o.price)}</td></tr>`).join("")}</tbody></table>` : ""}
<div class="sum"><div><span>Spare parts</span><b>${money(C.spareShown)}</b></div><div><span>Cost for repair</span><b>${money((F.includeLabour ? C.labourAll : 0) + C.manual)}</b></div>${C.wash > 0 ? `<div><span>Wash</span><b>${money(C.wash)}</b></div>` : ""}<div class="g"><span>Estimated total</span><span>${money(C.total)}</span></div></div>
${termsHtml(termsData?.terms?.estimate)}
<div class="sign"><div>Prepared by</div><div>Customer approval</div></div>
<div class="foot">${esc(company.name)} · Thank you for choosing us</div>
</div>
</body></html>`;
    return html;
  };
  // Download = saves a PDF straight away;  Print = opens the print window
  const downloadEstimate = async (full = false) => { setPdfBusy(true); try { await savePdf(buildEstimateHtml(full), `Estimate-${job.jobNo}`); } finally { setPdfBusy(false); } };
  const printEstimate = (full = false) => printHtml(buildEstimateHtml(full));
  // Asks which mobile number the SMS goes to (the customer's number is filled in; it can be changed). Returns the number, or null when cancelled.
  const askPhone = async (title) => {
    const r = await Swal.fire({
      title, input: "tel", inputLabel: "Mobile number (07XXXXXXXX)", inputValue: job.contactNumber || "", inputPlaceholder: "07XXXXXXXX",
      showCancelButton: true, confirmButtonText: "Send SMS",
      inputValidator: (v) => (/^(?:\+?94|0)?7\d{8}$/.test(String(v).replace(/[\s-]/g, "")) ? undefined : "Enter a valid mobile number (07XXXXXXXX)"),
    });
    return r.isConfirmed ? String(r.value).replace(/[\s-]/g, "") : null;
  };

  // Send via SMS: the customer gets the estimate total (and the repair time) by SMS
  const sendEstimateSms = async (full = false) => {
    const tot = full ? calcFull.total : calc.total;
    if (!(tot > 0)) return Swal.fire({ title: "Nothing to send", text: "The estimate total is Rs. 0.00.", icon: "info" });
    const phone = await askPhone(`Send the estimate (${money(tot)}) by SMS`);
    if (phone === null) return;
    setSmsBusy(true);
    try {
      const r = await sendSmsApi({ jobId, phone, html: buildEstimateHtml(full), full: full || undefined, includeSpareParts: full ? sendSel.parts : form.includeSpareParts, includeQuotes: full ? sendSel.quotes : undefined, includeLabour: full ? sendSel.labour : form.includeLabour, time: (full && !sendSel.time) ? undefined : (fmtTime(form.estHours, form.estDays) || undefined) }).unwrap();
      if (r.sms?.sent) {
        set({ sentVia: ["SMS"] });
        Swal.fire({ title: "SMS sent", text: r.sms.to ? `Sent to ${r.sms.to}` : "The customer got the estimate.", icon: "success", timer: 1800, showConfirmButton: false });
      } else Swal.fire({ title: "SMS not sent", text: r.sms?.error || "Could not send the SMS.", icon: "error" });
    } catch (ex) { fail(ex, "Could not send the SMS."); }
    finally { setSmsBusy(false); }
  };

  // Wash types: parents in a dropdown; a parent with child types shows its children, a parent without children is picked directly
  const [washParent, setWashParent] = useState("");
  const washParents = useMemo(() => {
    const m = new Map();
    (ctx?.washOptions || []).forEach((o) => {
      const key = o.group || o.name;
      if (!m.has(key)) m.set(key, { name: key, kids: [], single: null });
      if (o.group) m.get(key).kids.push(o); else m.get(key).single = o;
    });
    return [...m.values()];
  }, [ctx]);
  const washKids = washParents.find((p) => p.name === washParent)?.kids || [];
  const washSelected = (ctx?.washOptions || []).filter((o) => form?.washOptionIds.includes(o.id));
  // The Wash Type list is "select one": picking a type replaces the previous one
  const pickWash = (id) => set({ washOptionIds: form.washOptionIds.includes(id) ? [] : [id] });
  const pickWashParent = (name) => {
    const p = washParents.find((x) => x.name === name);
    if (p?.single && p.kids.length === 0) {
      set({ washOptionIds: [p.single.id] });
      setWashParent("");
    } else setWashParent(name);
  };

  const body = () => {
    if (isLoading || (data && !form)) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load the Customer Approval."}</Alert>;
    if (!data || !form) return null;
    return (
      <>
        {/* Job strip */}
        <div className="bg-white rounded-3 p-3 mb-3 d-flex flex-wrap gap-4 align-items-center" style={{ border: "1px solid #e3e3e6", borderLeft: "5px solid #c8102e", boxShadow: "0 4px 14px -10px rgba(15,23,42,.45)" }}>
          <div><div className="small text-muted">Job</div><span className="ca-jobno">{job.jobNo}</span></div>
          <div><div className="small text-muted">Vehicle</div><span className="ca-plate">{job.regNo}</span></div>
          <div><div className="small text-muted">Customer</div><div className="fw-bold">{job.customerName}</div></div>
          <div className="ms-auto text-end"><div className="small text-muted">Estimated total</div><div className="fs-5 fw-bold" style={{ color: "#c8102e" }}>{money(calc.total)}</div></div>
        </div>
        {readOnly && <Alert variant="info" className="py-2">{saved.completedAt ? "This stage is completed. The form is read only." : "This job has not reached this stage yet."}</Alert>}

        {/* a. Estimated time */}
        <Card anchor="time" title="Estimated Time of Repair" icon="mdi:timer-outline" color="#0891b2" hint="Including spare parts availability"
          done={Boolean(form.estHours || form.estDays)} summary={form.estHours || form.estDays ? fmtTime(form.estHours, form.estDays) : null}>
          <style>{`
            .ts-box { background: #fafafa; border: 1.5px solid #e3e3e6; border-radius: 14px; padding: 12px 14px; height: 100%; }
            .ts-label { font-weight: 700; color: #111; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
            .ts-label svg { color: #c8102e; }
            .ts-row { display: flex; align-items: stretch; gap: 8px; }
            .ts-btn { width: 52px; min-height: 52px; border-radius: 12px; border: 0; color: #fff; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .ts-btn:disabled { opacity: .35; }
            .ts-btn:active:not(:disabled) { transform: scale(.95); }
            .ts-val { flex: 1; min-width: 0; display: flex; align-items: baseline; justify-content: center; gap: 6px; background: #fff; border: 1.5px solid #c4c4ca; border-radius: 12px; padding: 0 10px; }
            .ts-val:focus-within { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
            .ts-val input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; text-align: right; font-size: 1.7rem; font-weight: 800; color: #111; padding: 6px 0; -moz-appearance: textfield; }
            .ts-val input::-webkit-outer-spin-button, .ts-val input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .ts-val span { font-weight: 700; color: #c8102e; text-transform: uppercase; font-size: .8rem; letter-spacing: .05em; }
            .ts-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
            .ts-chip { min-width: 44px; min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1.5px solid #c4c4ca; background: #fff; color: #111; font-weight: 700; font-size: .9rem; }
            .ts-chip:hover:not(:disabled) { border-color: #111; }
            .ts-chip.on { background: #c8102e; border-color: #c8102e; color: #fff; }
            .ts-chip.clr { margin-left: auto; color: #6b7280; font-weight: 600; border-style: dashed; }
            @media (max-width: 575.98px) {
              .ts-box { padding: 10px; }
              .ts-btn { width: 46px; min-height: 48px; }
              .ts-val input { font-size: 1.45rem; }
              .ts-chip { min-height: 40px; }
            }
            .ts-total { margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; background: #111; color: #fff; border-radius: 10px; padding: 6px 14px; font-weight: 700; box-shadow: inset 4px 0 0 #c8102e; }
          `}</style>
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <TimeStepper label="Days" unit="Days" icon="mdi:calendar-clock-outline" step={1} quick={[1, 2, 3, 5, 7, 10]} disabled={readOnly} value={form.estDays} onChange={(v) => set({ estDays: v })} />
            </div>
            <div className="col-12 col-lg-4">
              <TimeStepper label="Hours" unit="Hrs" icon="mdi:clock-outline" step={1} quick={[1, 2, 3, 4, 6, 8]} disabled={readOnly} value={splitHM(form.estHours)[0] || ""} onChange={(v) => set({ estHours: joinHM(Math.floor(Number(v) || 0), splitHM(form.estHours)[1]) })} />
            </div>
            <div className="col-12 col-lg-4">
              <TimeStepper label="Minutes" unit="Min" icon="mdi:timer-outline" step={5} quick={[10, 15, 30, 45]} disabled={readOnly} value={splitHM(form.estHours)[1] || ""}
                onChange={(v) => { let m = Math.floor(Number(v) || 0); let [h] = splitHM(form.estHours); if (m >= 60) { h += Math.floor(m / 60); m %= 60; } set({ estHours: joinHM(h, m) }); }} />
            </div>
          </div>
          {(Number(form.estHours) > 0 || Number(form.estDays) > 0) && (
            <div className="ts-total"><Icon icon="mdi:timer-sand" width="20" height="20" /> Estimated repair time: {fmtTime(form.estHours, form.estDays).replace(/ (?=\d+ (Hrs|Min))/g, " + ")}</div>
          )}
        </Card>

        {/* the estimate sent to the customer BEFORE the confirmation */}
        <Card anchor="estimate" title="Estimate to Send to the Customer" icon="mdi:file-document-outline" color="#16a34a" done={form.sentVia.length > 0}
          summary={form.sentVia.length ? `Sent via ${VIA.filter(([k]) => form.sentVia.includes(k)).map((v) => v[1]).join(", ")}` : "Not sent to the customer yet"}
          hint="Everything is selected by default. Untick what should not go into the estimate, then send it to the customer and take the confirmation below.">
          <div className="te-row" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              ["labour", "Repair items", `${ctx.labour.filter((l) => !l.warrantyClaim).length} item(s) · ${money(calcFull.labourAll)}`],
              ["parts", "Spare parts", `${ctx.parts.filter((p) => !p.warrantyClaim).length} item(s) · ${money(calcFull.partsAll)}`],
              ...(ctx.quotes.length ? [["quotes", "Third-party quotations", `${ctx.quotes.length} item(s) · ${money(calcFull.quotesAll)}`]] : []),
              ["time", "Estimated time", fmtTime(form.estHours, form.estDays) || "Not set"],
            ].map(([k, t, v]) => (
              <button key={k} type="button" role="switch" aria-checked={sendSel[k]} disabled={readOnly} className={`te-chip ${sendSel[k] ? "on" : ""}`} onClick={() => setSendSel((x) => ({ ...x, [k]: !x[k] }))}>
                <span className="te-box"><Icon icon="mdi:check" width="16" height="16" /></span>
                <span><small>{t}</small><b>{v}</b></span>
              </button>
            ))}
            <div className="te-sum"><small>Estimate total{(calcFull.pct > 0 || calcFull.spct > 0) ? ` (incl. repair +${calcFull.pct}% / parts +${calcFull.spct}%)` : ""}</small><b>{money(calcFull.total)}</b></div>
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-3">
            <Button variant="outline-dark" disabled={!(calcFull.total > 0)} onClick={() => setViewEst("full")}>
              <Icon icon="mdi:eye-outline" width="18" height="18" /> View estimate
            </Button>
            <Button variant="success" className="fw-semibold" disabled={pdfBusy || !(calcFull.total > 0)} onClick={() => downloadEstimate(true)}>
              {pdfBusy ? <Spinner size="sm" /> : <Icon icon="mdi:file-download-outline" width="18" height="18" />} Download estimate (PDF)
            </Button>
            <Button variant="outline-secondary" disabled={pdfBusy || !(calcFull.total > 0)} onClick={() => printEstimate(true)}>
              <Icon icon="mdi:printer-outline" width="18" height="18" /> Print
            </Button>
            <Button variant="primary" className="fw-semibold" disabled={pdfBusy || smsBusy || readOnly || !(calcFull.total > 0)} onClick={() => sendEstimateSms(true)}>
              {smsBusy ? <Spinner size="sm" /> : <Icon icon="mdi:message-text-outline" width="18" height="18" />} {form.sentVia.includes("SMS") ? "Send via SMS again" : "Send via SMS"}
            </Button>
          </div>
        </Card>

        {/* gate: the next sections stay muted until the customer's reply is received */}
        {(() => {
          const got = replyYes ?? Boolean(form.decision);
          return (
            <Card anchor="reply" title="Did you receive the customer's confirmation?" icon="mdi:message-reply-text-outline" color="#16a34a" done={got}
              summary={got ? "Yes, the customer replied" : "Waiting for the customer's reply"}
              hint="Send the estimate above and wait for the customer's reply. Answer Yes to unlock the confirmation, spare parts and final estimate.">
              <Choice disabled={readOnly} value={got ? "YES" : "NO"} onChange={(v) => setReplyYes(v === "YES")} options={[["YES", "Yes, received", "mdi:check-circle-outline"], ["NO", "No, not yet", "mdi:clock-outline"]]} />
            </Card>
          );
        })()}

        <div className={(replyYes ?? Boolean(form.decision)) ? "" : "ca-muted"} aria-disabled={!(replyYes ?? Boolean(form.decision))}>
        {/* confirmation */}
        <Card anchor="decision" title="Customer Confirmation" icon="mdi:account-check-outline" color="#16a34a" done={Boolean(form.decision)}
          summary={form.decision === "TOTAL" ? "Total approved" : form.decision === "PARTIAL" ? "Partly approved (agreed scope)" : "Not selected"}>
          <Choice disabled={readOnly} value={form.decision} onChange={(v) => set({ decision: v })} options={[["TOTAL", "Total approved", "mdi:check-all"], ["PARTIAL", "Agreed scope only", "mdi:format-list-checks"]]} />
          {form.decision === "PARTIAL" && (() => {
            // the repair items chosen in the Vehicle Job Inspection: tick only the ones the customer agreed to
            const keyOf = (l) => l.repairType || l.description;
            const keys = ctx.labour.map(keyOf);
            const picked = (l) => form.agreedScope.includes(keyOf(l));
            const custom = form.agreedScope.filter((x) => !keys.includes(x));        // items typed by hand
            const toggleKey = (l) => set({ agreedScope: picked(l) ? form.agreedScope.filter((x) => x !== keyOf(l)) : [...form.agreedScope, keyOf(l)] });
            const allOn = keys.length > 0 && keys.every((k) => form.agreedScope.includes(k));
            return (
              <div className="mt-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="fw-semibold small">Agreed Scope <span className="text-muted fw-normal">· tick the repair items the customer agreed to</span></div>
                  {!readOnly && keys.length > 0 && (
                    <button type="button" className="btn btn-sm btn-link ms-auto p-0 text-decoration-none fw-semibold" onClick={() => set({ agreedScope: allOn ? custom : [...new Set([...form.agreedScope, ...keys])] })}>{allOn ? "Clear all" : "Select all"}</button>
                  )}
                </div>
                {ctx.labour.length === 0 && <div className="small text-muted mb-2">No repair items were selected in the Vehicle Job Inspection. Add the agreed items below.</div>}
                <div className="d-flex flex-column gap-2">
                  {ctx.labour.map((l, n) => {
                    const on = picked(l);
                    const [parent, child] = String(l.repairType || "").includes(" > ") ? String(l.repairType).split(" > ") : [l.repairType, null];
                    return (
                      <button key={n} type="button" role="checkbox" aria-checked={on} disabled={readOnly} onClick={() => toggleKey(l)}
                        style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "9px 12px", borderRadius: 12, cursor: readOnly ? "default" : "pointer",
                          border: `1.5px solid ${on ? "#16a34a" : "#d6d9de"}`, background: on ? "#f0fdf4" : "#fff", color: on ? "#14532d" : "#374151", transition: "all .15s" }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", flex: "none", border: `1.5px solid ${on ? "#16a34a" : "#c4c8cf"}`, background: on ? "#16a34a" : "#fff", color: on ? "#fff" : "transparent" }}>
                          <Icon icon="mdi:check" width="16" height="16" />
                        </span>
                        <span className="flex-grow-1">
                          <span className="fw-semibold">{l.description}</span>
                          {parent && <span className="d-block small text-muted">{child ? parent : l.repairType}</span>}
                        </span>
                        {l.warrantyClaim ? <Badge bg="success">Warranty claim</Badge> : <span className="fw-semibold text-nowrap">{money(l.amount)}</span>}
                      </button>
                    );
                  })}
                </div>
                {custom.map((x) => {
                  const hit = (ctx.repairTree || []).flatMap((g) => g.children).find((c) => c.label === x);
                  const typed = !hit ? /^(.*) \((Rs\. [\d,]+\.\d{2})\)$/.exec(x) : null;   // "Item (Rs. 1,500.00)"
                  return (
                    <div key={x} className="d-flex align-items-center gap-2 border rounded-3 px-3 py-2 mt-2 bg-body-tertiary">
                      <Icon icon="mdi:plus-circle-outline" width="18" height="18" className="text-success" />
                      <span className="flex-grow-1"><span className="fw-semibold">{hit ? hit.name : typed ? typed[1] : x}</span>{hit && <span className="d-block small text-muted">{x.split(" > ")[0]}</span>}</span>
                      {hit?.price != null ? <span className="fw-semibold text-nowrap">{money(hit.price)}</span> : typed ? <span className="fw-semibold text-nowrap">{typed[2]}</span> : null}
                      {!readOnly && <Button size="sm" variant="outline-danger" onClick={() => set({ agreedScope: form.agreedScope.filter((y) => y !== x) })}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                    </div>
                  );
                })}
                {SHOW_ADD_AGREED_ITEM && !readOnly && (() => {
                  // add another agreed item: department -> repair type -> child type (with its price), like in the Vehicle Job Inspection
                  const tree = ctx.repairTree || [];
                  const byDept = tree.reduce((m, g) => { (m[g.department] = m[g.department] || { current: Boolean(g.isCurrent), list: [] }).list.push(g); return m; }, {});
                  const depts = Object.entries(byDept).sort((a, b) => Number(b[1].current) - Number(a[1].current));
                  const dept = depts.length === 0 ? "" : scopeDept && byDept[scopeDept] ? scopeDept : depts[0][0];
                  const group = dept ? byDept[dept].list.find((g) => g.parent === scopeParent) : null;
                  const addItem = (label) => { if (!form.agreedScope.includes(label)) set({ agreedScope: [...form.agreedScope, label] }); };
                  return (
                    <div className="border rounded-3 p-2 mt-3">
                      <div className="small fw-semibold mb-2">Add another agreed item</div>
                      {depts.length > 0 && <div className="row g-2">
                        <div className="col-12 col-md-5">
                          <Form.Label htmlFor="sc-dept" className="small fw-semibold mb-1">Department</Form.Label>
                          <FormSelect id="sc-dept" size="sm" aria-label="Department" value={dept} onChange={(e) => { setScopeDept(e.target.value); setScopeParent(""); }}>
                            {depts.map(([d, v]) => <option key={d} value={d}>{v.current ? `${d} (this department)` : d}</option>)}
                          </FormSelect>
                        </div>
                        <div className="col-12 col-md-7">
                          <Form.Label htmlFor="sc-type" className="small fw-semibold mb-1">Repair type</Form.Label>
                          <FormSelect id="sc-type" size="sm" aria-label="Repair type" value={group ? group.parent : ""} onChange={(e) => setScopeParent(e.target.value)}>
                            <option value="">Select a {dept} repair type...</option>
                            {byDept[dept].list.map((g) => <option key={g.parent} value={g.parent}>{g.parent}</option>)}
                          </FormSelect>
                        </div>
                      </div>}
                      {group && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {group.children.length === 0 && (
                            <button type="button" className="btn btn-sm btn-outline-secondary rounded-pill" disabled={form.agreedScope.includes(group.parent)} onClick={() => addItem(group.parent)}><Icon icon="mdi:plus" width="16" height="16" /> {group.parent}</button>
                          )}
                          {group.children.map((c) => {
                            const added = form.agreedScope.includes(c.label);
                            return (
                              <button key={c.id} type="button" disabled={added} onClick={() => addItem(c.label)}
                                className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-2 ${added ? "btn-success" : "btn-outline-secondary"}`}>
                                <Icon icon={added ? "mdi:check" : "mdi:plus"} width="16" height="16" />{c.name}{c.price != null && <span className="fw-normal">{money(c.price)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="border-top mt-3 pt-2">
                        <div className="small text-muted mb-1">Not in the list? Add a new item with its own price</div>
                        <div className="row g-2 align-items-end">
                          <div className="col-12 col-md-6">
                            <Form.Label htmlFor="sc-name" className="small fw-semibold mb-1">Item name</Form.Label>
                            <FormControl id="sc-name" size="sm" placeholder="e.g. Rear lamp fix" value={scopeDraft} onChange={(e) => setScopeDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addScope()} />
                          </div>
                          <div className="col-7 col-md-4">
                            <Form.Label htmlFor="sc-price" className="small fw-semibold mb-1">Price (Rs.) <span className="text-muted fw-normal">- optional</span></Form.Label>
                            <FormControl id="sc-price" size="sm" type="number" min="0" step="0.01" className="text-end" placeholder="e.g. 1500.00" value={scopePrice} onChange={(e) => setScopePrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addScope()} />
                          </div>
                          <div className="col-5 col-md-2 d-grid"><Button size="sm" variant="outline-primary" onClick={addScope}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
          {SHOW_EXTRA_NOTE && <div className="mt-3">
            <div className="fw-semibold small mb-1">Extra note</div>
            <FormControl as="textarea" rows={2} maxLength={1000} disabled={readOnly} value={form.extraNote} onChange={(e) => set({ extraNote: e.target.value })} />
          </div>}
        </Card>

        {/* spare parts provider */}
        <Card anchor="parts" title="Spare Parts Provided by" icon="mdi:cog-transfer-outline" color="#d97706" done={Boolean(form.partsBy)}
          summary={form.partsBy === "COMPANY" ? "Provided by us" : form.partsBy === "CLIENT" ? "Provided by client" : "Not selected"}>
          <Choice disabled={readOnly} value={form.partsBy} onChange={(v) => set({ partsBy: v })} options={[["COMPANY", "Provided by us", "mdi:store-outline"], ["CLIENT", "Provided by client", "mdi:account-outline"]]} />

          {form.partsBy === "CLIENT" && (
            <div className="mt-3 border rounded-3 p-3">
              <div className="d-flex align-items-center gap-2 mb-1">
                <div className="fw-semibold">The customer brings the spare parts</div>
                {!readOnly && selParts.length > 0 && (
                  <button type="button" className="btn btn-sm btn-link ms-auto p-0 text-decoration-none fw-semibold" onClick={() => set({ clientParts: selParts.every((p) => form.clientParts.includes(p.id)) ? [] : selParts.map((p) => p.id) })}>
                    {selParts.every((p) => form.clientParts.includes(p.id)) ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="small text-muted mb-2">{selParts.length > 0 ? "Tick the spare parts and third-party items (from the Vehicle Job Inspection) that the customer provides." : "No spare parts were added in the Vehicle Job Inspection."}</div>
              <div className="d-flex flex-column gap-2 mb-3">
                {selParts.map((p) => {
                  const on = form.clientParts.includes(p.id);
                  return (
                    <button key={p.id} type="button" role="checkbox" aria-checked={on} disabled={readOnly} onClick={() => set({ clientParts: on ? form.clientParts.filter((x) => x !== p.id) : [...form.clientParts, p.id] })}
                      style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "9px 12px", borderRadius: 12, cursor: readOnly ? "default" : "pointer",
                        border: `1.5px solid ${on ? "#16a34a" : "#d6d9de"}`, background: on ? "#f0fdf4" : "#fff", color: on ? "#14532d" : "#374151", transition: "all .15s" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", flex: "none", border: `1.5px solid ${on ? "#16a34a" : "#c4c8cf"}`, background: on ? "#16a34a" : "#fff", color: on ? "#fff" : "transparent" }}>
                        <Icon icon="mdi:check" width="16" height="16" />
                      </span>
                      <span className="flex-grow-1">
                        <span className="fw-semibold">{p.name}</span>
                        <span className="d-block small text-muted">{[p.brand, p.quality].filter(Boolean).join(" · ")}{p.brand || p.quality ? " · " : ""}Qty {p.qty}{p.isQuote ? " · quotation item" : ""}</span>
                      </span>
                      {on && <Badge bg="success">Customer provides</Badge>}
                    </button>
                  );
                })}
              </div>
              {form.clientPartsFiles.map((f, n) => (
                <div key={n} className="d-flex align-items-center gap-2 border-top py-1">
                  <Icon icon="mdi:paperclip" width="18" height="18" className="text-muted" />
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-grow-1 text-truncate">{f.name}</a>
                </div>
              ))}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button size="sm" variant="success" disabled={readOnly || partsBusy || form.clientParts.length === 0} onClick={sendToCustomer}><Icon icon="mdi:message-text-outline" width="16" height="16" /> Send report link by SMS</Button>
                <Button size="sm" variant="outline-secondary" disabled={partsBusy || form.clientParts.length === 0} onClick={downloadPartsReport}>
                  {partsBusy ? <Spinner size="sm" /> : <Icon icon="mdi:file-download-outline" width="16" height="16" />} Download report (PDF)
                </Button>
                {saved.clientListSentAt && <span className="small text-success"><Icon icon="mdi:check-circle" width="16" height="16" /> Sent {when(saved.clientListSentAt)}</span>}
              </div>
            </div>
          )}

          {form.partsBy === "COMPANY" && (
            <div className="mt-3 border rounded-3 p-3">
              <div className="fw-semibold mb-1">The company provides the spare parts</div>
              <div className="small text-muted mb-2">{ctx.parts.length} spare part(s) · {money(ctx.sparePartsValue)} (from the Spare Part Review &amp; Order stage)</div>
              {!readOnly && (
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <Button size="sm" variant="primary" disabled={sendingLogi} onClick={() => logistics("REPAIR")}><Icon icon="mdi:truck-delivery-outline" width="16" height="16" /> Send Repair Request to Logistic and Stock Department</Button>
                  {saved.repairRequestSentAt && <span className="small text-success"><Icon icon="mdi:check-circle" width="16" height="16" /> Sent {when(saved.repairRequestSentAt)}</span>}
                </div>
              )}
              {readOnly && saved.repairRequestSentAt && <div className="small text-success">Repair request sent {when(saved.repairRequestSentAt)}</div>}
            </div>
          )}
        </Card>

        {/* Total estimate + download */}
        <Card anchor="sent" title={`Total Estimate  ${money(calc.total)}`} icon="mdi:cash-multiple" color="#16a34a" done={form.sentVia.length > 0}
          summary={form.sentVia.length ? `Sent via ${VIA.filter(([k]) => form.sentVia.includes(k)).map((v) => v[1]).join(", ")}` : "Not sent to the customer yet"}
          hint={[form.decision === "PARTIAL" ? `Agreed scope: ${ctx.labour.filter((l) => form.agreedScope.includes(l.repairType || l.description)).length} of ${ctx.labour.length} repair item(s)` : form.decision === "TOTAL" ? "Total approved" : "Customer decision not selected yet",
            form.partsBy === "CLIENT" ? `Customer provides ${form.clientParts.length} spare part(s) (not charged)` : null,
            (calc.pct > 0 || calc.spct > 0) ? `price adjustment: repair +${calc.pct}%, spare parts +${calc.spct}%` : null, "warranty claims not charged"].filter(Boolean).join(" · ")}>
          <style>{`
            .te-row{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
            .te-chip{flex:1 1 170px;display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border:1.5px solid #d6d9de;border-radius:12px;background:#fff;color:#374151;cursor:pointer;transition:all .15s}
            .te-chip:hover:not(:disabled){border-color:#9ca3af}
            .te-chip:disabled{cursor:default;opacity:.75}
            .te-chip .te-box{width:22px;height:22px;border-radius:7px;border:1.5px solid #c4c8cf;display:grid;place-items:center;flex:none;color:transparent;background:#fff}
            .te-chip small{display:block;color:#6b7280;font-size:.72rem;line-height:1.1}
            .te-chip b{display:block;font-size:.95rem;line-height:1.25}
            .te-chip.on{border-color:#16a34a;background:#f0fdf4;color:#14532d}
            .te-chip.on .te-box{background:#16a34a;border-color:#16a34a;color:#fff}
            .te-chip.on small{color:#4d7c5f}
            .te-sum{flex:1 1 190px;border-radius:12px;background:#111827;color:#fff;padding:10px 14px;display:flex;flex-direction:column;justify-content:center}
            .te-sum small{color:#9ca3af;font-size:.72rem}
            .te-sum b{font-size:1.15rem}
          `}</style>
          <div className="te-row">
            {[["includeSpareParts", "Spare parts (incl. third-party)", calc.spareAll], ["includeLabour", "Labour / repairs", calc.labourAll]].map(([k, t, v]) => (
              <button key={k} type="button" role="switch" aria-checked={Boolean(form[k])} disabled={readOnly} className={`te-chip ${form[k] ? "on" : ""}`} onClick={() => set({ [k]: !form[k] })}>
                <span className="te-box"><Icon icon="mdi:check" width="16" height="16" /></span>
                <span><small>{t}</small><b>{money(v)}</b></span>
              </button>
            ))}
            <div className="te-sum"><small>Estimate total</small><b>{money(calc.total)}</b></div>
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mt-3">
            <Button variant="outline-dark" disabled={!(calc.total > 0)} onClick={() => setViewEst("agreed")}>
              <Icon icon="mdi:eye-outline" width="18" height="18" /> View estimate
            </Button>
            <Button variant="success" className="fw-semibold" disabled={pdfBusy} onClick={() => downloadEstimate()}>
              {pdfBusy ? <Spinner size="sm" /> : <Icon icon="mdi:file-download-outline" width="18" height="18" />} Download estimate (PDF)
            </Button>
            <Button variant="outline-secondary" disabled={pdfBusy} onClick={() => printEstimate()}>
              <Icon icon="mdi:printer-outline" width="18" height="18" /> Print
            </Button>
            <Button variant="primary" className="fw-semibold" disabled={pdfBusy || smsBusy || readOnly} onClick={() => sendEstimateSms()}>
              {smsBusy ? <Spinner size="sm" /> : <Icon icon="mdi:message-text-outline" width="18" height="18" />} {form.sentVia.includes("SMS") ? "Send via SMS again" : "Send via SMS"}
            </Button>
          </div>
        </Card>

        </div>

        {viewEst && (
          <Modal show onHide={() => setViewEst(null)} size="xl" centered scrollable fullscreen="xl-down" dialogClassName="ca-est-modal">
            <style>{`@media (max-width: 1199.98px) { .ca-est-modal .ca-est-body { height: calc(100vh - 124px) !important; } }`}</style>
            <Modal.Header closeButton><Modal.Title className="fs-6 d-flex align-items-center gap-2"><Icon icon="mdi:file-document-outline" width="20" height="20" /> Estimate {job.jobNo}</Modal.Title></Modal.Header>
            <Modal.Body className="p-0 ca-est-body" style={{ height: "75vh" }}>
              <iframe title="Estimate" srcDoc={buildEstimateHtml(viewEst === "full")} style={{ width: "100%", height: "100%", border: 0, background: "#fff" }} />
            </Modal.Body>
            <Modal.Footer><Button variant="light" onClick={() => setViewEst(null)} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button></Modal.Footer>
          </Modal>
        )}

        {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
      </>
    );
  };

  return (
    <Modal show onHide={tryClose} size="xl" centered scrollable fullscreen="lg-down" backdrop="static" enforceFocus={false} dialogClassName="ca-modal">
      <style>{`
        @media (min-width: 992px) { .modal-dialog.ca-modal { --bs-modal-width: 1060px; } }
        .ca-muted { opacity: .4; filter: grayscale(.7); pointer-events: none; user-select: none; }
        .ca-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
        .ca-modal .ca-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .ca-modal .modal-body { background: #f6f6f7 !important; padding: 18px 22px; }
        .ca-modal .form-control, .ca-modal .form-select { border-radius: 12px; border: 1.5px solid #c4c4ca; min-height: 44px; }
        .ca-modal textarea.form-control { min-height: 0; }
        .ca-modal .form-control:focus, .ca-modal .form-select:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .ca-modal .input-group > .form-control { border-radius: 0 12px 12px 0; }
        .ca-modal .input-group > .form-control:not(:last-child) { border-radius: 0; }
        .ca-modal .input-group > .input-group-text:first-child { border-radius: 12px 0 0 12px; background: #fde8ea !important; color: #c8102e; border: 1.5px solid #c4c4ca; }
        .ca-modal .form-check-input { width: 1.2em; height: 1.2em; }
        .ca-modal .form-check-input:checked { background-color: #c8102e; border-color: #c8102e; }
        .ca-modal .form-check-input:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .ca-modal .btn-outline-primary, .ca-modal .btn-outline-secondary { color: #111; border: 1.5px solid #c4c4ca; border-radius: 10px; font-weight: 600; background: #fff; }
        .ca-modal .btn-outline-primary:hover, .ca-modal .btn-outline-secondary:hover { color: #fff; background: #111; border-color: #111; }
        .ca-modal .btn-outline-danger { border-radius: 10px; border-width: 1.5px; }
        .ca-modal .btn-secondary { background: #111; border-color: #111; border-radius: 10px; }
        .ca-modal .btn-success, .ca-modal .btn-primary { color: #fff !important; border: 0 !important; border-radius: 10px; font-weight: 700; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; }
        .ca-modal .btn-success:hover, .ca-modal .btn-primary:hover { filter: brightness(1.25); }
        .ca-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 22px; }
        .ca-modal .modal-footer .btn { min-height: 46px; padding: 0 22px; border-radius: 12px; }
        .ca-modal table thead th { background: #111; color: #fff; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; border: 0; }
        .ca-modal .ca-flash { animation: caflash 2.5s ease; }
        @keyframes caflash { 0%,60% { box-shadow: 0 0 0 4px rgba(200,16,46,.55); } 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0); } }
        .ca-modal .ca-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 3px 10px; font-weight: 700; font-size: .85rem; box-shadow: inset 3px 0 0 #c8102e; }
        .ca-modal .ca-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="ca-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:account-check-outline" width="30" height="30" />
          <span>Customer Approval{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f6f6f7" }}>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" className="me-auto" disabled={isFetching} onClick={refetch}><Icon icon="mdi:refresh" width="16" height="16" /> Refresh</Button>
        {data && !readOnly && form && autoState && (
          <span className="small text-muted">
            {autoState === "saving" ? "Saving…" : autoState === "pending" ? "Unsaved changes…" : autoState === "failed" ? <span className="text-danger">Auto-save failed - use Save</span> : <span className="text-success"><Icon icon="mdi:check" width="16" height="16" /> All changes saved</span>}
          </span>
        )}
        <Button variant="light" onClick={tryClose} style={{ border: "1.5px solid #c4c4ca", color: "#111", fontWeight: 600 }}>Close</Button>
        {data && !readOnly && form && (
          <>
            <Button variant="outline-primary" disabled={saving || !dirty} onClick={saveClick}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" width="18" height="18" />} Save</Button>
            <Button variant="success" disabled={completing || saving} onClick={finish}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" width="18" height="18" />} Complete stage</Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}