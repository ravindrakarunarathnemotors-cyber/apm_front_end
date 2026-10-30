"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Collapse, Form, FormControl, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useCompleteCustomerApprovalMutation,
  useGetCustomerApprovalQuery,
  useMarkClientListSentMutation,
  useSaveCustomerApprovalMutation,
  useSendApprovalLogisticsMutation,
} from "./customerApprovalApi";

// Customer Approval (the stage after "Spare Part Review & Order").
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const letter = (n) => String.fromCharCode(97 + (n % 26));
const VIA = [
  ["WHATSAPP", "WhatsApp", "mdi:whatsapp"],
  ["ERP", "ERP System", "mdi:monitor-dashboard"],
  ["PHONE_CALL", "Recorded phone call", "mdi:phone-in-talk-outline"],
  ["EMAIL", "Email", "mdi:email-outline"],
];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Same look as the spare parts quotation (KARUNARATHNE AUTO ZONE, maroon + gold)
const DOC_CSS = `@page{size:A4;margin:14mm}
:root{--brand:#8f0b0b;--brand-d:#5e0404;--gold:#a8864f;--ink:#1c1917;--muted:#78716c;--line:#e7e2dc;--soft:#f6f4f1}
*{box-sizing:border-box}
body{font-family:"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);margin:0;font-size:12.5px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:794px;margin:0 auto;padding:24px 28px}
.top{display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:3px solid var(--brand)}
.top img{height:56px;width:auto;object-fit:contain;display:block}
.brandname{font-size:19px;font-weight:800;letter-spacing:.1em;color:var(--brand)}
.doc{text-align:right}
.doc .t{font-size:22px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--brand)}
.doc .s{font-size:11px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase}
.gold{height:3px;background:var(--gold);margin-top:3px}
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
function Card({ title, hint, right, children, icon = "mdi:clipboard-text-outline", color = "#2563eb", summary, done, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-3 mb-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,.07)", borderLeft: `4px solid ${color}` }}>
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

  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [manualDraft, setManualDraft] = useState({ description: "", amount: "" });
  const [scopeDraft, setScopeDraft] = useState("");
  const snapRef = useRef("");
  const fileRef = useRef(null);

  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });
  const job = data?.job, ctx = data?.context, saved = data?.saved;
  const readOnly = data && !data.canRecord;

  // The form is filled once from the saved data (the saved time stamps keep coming from the server)
  useEffect(() => {
    if (!data || form) return;
    const s = data.saved;
    const f = {
      estHours: s.estHours ?? "", estDays: s.estDays ?? "", includeSpareParts: s.includeSpareParts, includeLabour: s.includeLabour,
      manualItems: s.manualItems || [], washOptionIds: (s.washItems || []).map((w) => w.optionId), sentVia: s.sentVia || [],
      decision: s.decision, agreedScope: s.agreedScope || [], extraNote: s.extraNote || "", partsBy: s.partsBy,
      clientPartsFiles: s.clientPartsFiles || [], thirdPartyNote: s.thirdPartyNote || "",
    };
    setForm(f); snapRef.current = JSON.stringify(f);
  }, [data, form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, v) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  // ---- live estimate ----
  const calc = useMemo(() => {
    if (!form || !ctx) return { spare: 0, labour: 0, manual: 0, repair: 0, wash: 0, total: 0 };
    const spare = form.includeSpareParts ? ctx.sparePartsValue : 0;
    const labour = form.includeLabour ? ctx.labourTotal : 0;
    const manual = form.manualItems.reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const wash = ctx.washOptions.filter((o) => form.washOptionIds.includes(o.id)).reduce((s, o) => s + o.price, 0);
    return { spare, labour, manual, repair: labour + manual, wash, total: spare + labour + manual + wash };
  }, [form, ctx]);

  const dirty = form && JSON.stringify(form) !== snapRef.current;
  const payload = () => ({
    jobId, estHours: form.estHours === "" ? null : Number(form.estHours), estDays: form.estDays === "" ? null : Number(form.estDays),
    includeSpareParts: form.includeSpareParts, includeLabour: form.includeLabour, manualItems: form.manualItems,
    washOptionIds: form.washOptionIds, sentVia: form.sentVia, decision: form.decision, agreedScope: form.agreedScope,
    extraNote: form.extraNote, partsBy: form.partsBy, clientPartsFiles: form.clientPartsFiles,
    thirdPartyRequest: Boolean(saved?.thirdPartyRequest), thirdPartyNote: form.thirdPartyNote,
  });
  const doSave = async () => {
    await save(payload()).unwrap();
    snapRef.current = JSON.stringify(form);
  };
  const saveClick = async () => {
    setError("");
    try { await doSave(); Swal.fire({ title: "Saved", icon: "success", timer: 900, showConfirmButton: false }); } catch (ex) { setError(ex?.data?.message || "Could not save."); }
  };

  const finish = async () => {
    setError("");
    if (!form.estHours && !form.estDays) return setError("Enter the estimated time of repair.");
    if (form.sentVia.length === 0) return setError("Select how the estimation was sent.");
    if (!form.decision) return setError("Select the customer confirmation.");
    if (form.decision === "PARTIAL" && form.agreedScope.length === 0) return setError("Write the agreed scope.");
    if (!form.partsBy) return setError("Select who provides the spare parts.");
    if (form.partsBy === "CLIENT" && form.clientPartsFiles.length === 0) return setError("Upload the spare part list of the customer.");
    const ok = await Swal.fire({ title: "Complete Customer Approval?", text: `${job.jobNo} moves to the next stage. This form can no longer be changed.`, icon: "question", showCancelButton: true, confirmButtonText: "Complete" });
    if (!ok.isConfirmed) return;
    try {
      await doSave();
      const r = await complete(jobId).unwrap();
      await Swal.fire({ title: "Done!", icon: "success", timer: 1200, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { setError(ex?.data?.message || "Could not complete the stage."); }
  };

  const tryClose = async () => {
    if (!dirty && !manualDraft.description.trim() && !scopeDraft.trim()) return onHide();
    const r = await Swal.fire({ title: "Save your changes?", text: "You have changes that are not saved yet.", icon: "warning", showCancelButton: true, showDenyButton: true, confirmButtonText: "Save & close", denyButtonText: "Close without saving", cancelButtonText: "Stay" });
    if (r.isConfirmed) { try { await doSave(); onHide(); } catch (ex) { setError(ex?.data?.message || "Could not save."); } }
    else if (r.isDenied) onHide();
  };

  // ---- manual lines / agreed scope ----
  const addManual = () => {
    if (!manualDraft.description.trim()) return setError("Write the description of the line.");
    const amt = Number(manualDraft.amount || 0);
    if (!Number.isFinite(amt) || amt < 0) return setError("Enter a valid amount.");
    setError(""); set({ manualItems: [...form.manualItems, { description: manualDraft.description.trim(), amount: amt }] }); setManualDraft({ description: "", amount: "" });
  };
  const addScope = () => { const t = scopeDraft.trim(); if (!t) return; set({ agreedScope: [...form.agreedScope, t] }); setScopeDraft(""); };

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
    if (form.clientPartsFiles.length === 0) return setError("Upload the spare part list first.");
    setError("");
    try {
      await doSave();
      const text = `Spare part list for ${job.regNo} (${job.jobNo}):\n${form.clientPartsFiles.map((f) => f.url).join("\n")}`;
      const phone = toWaNumber(job.contactNumber);
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      await markSent(jobId).unwrap();
      if (!phone) Swal.fire({ title: "Recorded", text: "The customer has no mobile number, so WhatsApp was not opened. Send the list manually.", icon: "info" });
    } catch (ex) { fail(ex, "Could not send."); }
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

  // ---- Download the estimate (print / "Save as PDF") ----
  const downloadEstimate = () => {
    const logo = `${window.location.origin}/images/mainlogo.jpeg`;
    const today = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    const R = 'style="text-align:right"';
    const washSel = ctx.washOptions.filter((o) => form.washOptionIds.includes(o.id));
    const partRows = [
      ...ctx.parts.map((p, n) => `<tr><td class="c">${n + 1}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.brand || "-")}</td><td ${R}>${p.qty}</td><td ${R}>${money(p.unitPrice)}</td><td ${R}><b>${money(p.qty * p.unitPrice)}</b></td></tr>`),
      ...ctx.quotes.map((q, n) => `<tr><td class="c">${ctx.parts.length + n + 1}</td><td><b>${esc(q.description)}</b> (third party)</td><td>-</td><td ${R}>1</td><td ${R}>${money(q.quotedPrice)}</td><td ${R}><b>${money(q.quotedPrice)}</b></td></tr>`),
    ].join("");
    const labourRows = [
      ...(form.includeLabour ? ctx.labour.map((l) => `<tr><td>${esc(l.description)}</td><td ${R}>${money(l.amount)}</td></tr>`) : []),
      ...form.manualItems.map((m) => `<tr><td>${esc(m.description)}</td><td ${R}>${money(m.amount)}</td></tr>`),
    ].join("");
    const time = [form.estHours ? `${form.estHours} Hrs` : "", form.estDays ? `${form.estDays} Days` : ""].filter(Boolean).join(" / ") || "-";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Estimate ${esc(job.jobNo)}</title><style>${DOC_CSS}</style></head><body><div class="page">
<div class="top">
  <div style="display:flex;align-items:center;gap:12px"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div class="brandname">KARUNARATHNE AUTO ZONE</div></div>
  <div class="doc"><div class="t">Estimate</div><div class="s">Repair estimation</div></div>
</div><div class="gold"></div>
<dl class="meta">
  <div><dt>Job</dt><dd>${esc(job.jobNo)}</dd></div>
  <div><dt>Customer</dt><dd>${esc(job.customerName)}</dd></div>
  <div><dt>Vehicle no</dt><dd>${esc(job.regNo)}</dd></div>
  <div><dt>Date</dt><dd>${today}</dd></div>
</dl>
<div class="note" style="margin-top:6px">Department: ${esc(job.departmentName)} · Estimated time of repair: <b>${esc(time)}</b> (including spare parts availability)</div>
${form.includeSpareParts && partRows ? `<h2>Spare parts</h2><table><thead><tr><th class="c" style="color:#fff">#</th><th>Item</th><th>Brand</th><th ${R}>Qty</th><th ${R}>Unit price</th><th ${R}>Total</th></tr></thead><tbody>${partRows}</tbody></table>` : ""}
${labourRows ? `<h2>Repair &amp; labour</h2>${form.includeLabour && ctx.rootCauses.length ? `<p class="note"><b>Root causes:</b> ${ctx.rootCauses.map(esc).join("; ")}</p>` : ""}<table><thead><tr><th>Work</th><th ${R}>Amount</th></tr></thead><tbody>${labourRows}</tbody></table>` : ""}
${washSel.length ? `<h2>Wash</h2><table><thead><tr><th>Wash type</th><th ${R}>Price</th></tr></thead><tbody>${washSel.map((o) => `<tr><td>${esc(o.group ? `${o.group} > ${o.name}` : o.name)}</td><td ${R}>${money(o.price)}</td></tr>`).join("")}</tbody></table>` : ""}
<div class="sum"><div><span>Spare parts</span><b>${money(calc.spare)}</b></div><div><span>Cost for repair</span><b>${money(calc.repair)}</b></div><div><span>Wash</span><b>${money(calc.wash)}</b></div><div class="g"><span>Estimated total</span><span>${money(calc.total)}</span></div></div>
<div class="sign"><div>Prepared by</div><div>Customer approval</div></div>
<div class="foot">KARUNARATHNE AUTO ZONE · Thank you for choosing us</div>
</div>
<script>
(function(){var done=false;function go(){if(done)return;done=true;window.print()}
var im=document.images[0];if(!im||im.complete){setTimeout(go,150)}else{im.onload=go;im.onerror=go;setTimeout(go,2500)}})();
<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups to download the estimate.", icon: "info" });
    w.document.open(); w.document.write(html); w.document.close();
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
        <div className="bg-white rounded-3 p-3 mb-3 d-flex flex-wrap gap-4 align-items-center" style={{ border: "1px solid #e2e8f0" }}>
          <div><div className="small text-muted">Job</div><div className="fw-bold">{job.jobNo}</div></div>
          <div><div className="small text-muted">Vehicle</div><div className="fw-bold">{job.regNo}</div></div>
          <div><div className="small text-muted">Customer</div><div className="fw-bold">{job.customerName}</div></div>
          <div className="ms-auto text-end"><div className="small text-muted">Estimated total</div><div className="fs-5 fw-bold" style={{ color: "#16a34a" }}>{money(calc.total)}</div></div>
        </div>
        {readOnly && <Alert variant="info" className="py-2">{saved.completedAt ? "This stage is completed. The form is read only." : "This job has not reached this stage yet."}</Alert>}

        {/* a. Estimated time */}
        <Card title="Estimated Time of Repair" icon="mdi:timer-outline" color="#0891b2" hint="Including spare parts availability"
          done={Boolean(form.estHours || form.estDays)} summary={form.estHours || form.estDays ? `${form.estHours || 0} Hrs / ${form.estDays || 0} Days` : null}>
          <div className="row g-2" style={{ maxWidth: 440 }}>
            <div className="col-6"><div className="input-group"><FormControl type="number" min="0" step="0.5" disabled={readOnly} placeholder="0" value={form.estHours} onChange={(e) => set({ estHours: e.target.value })} /><span className="input-group-text">Hrs</span></div></div>
            <div className="col-6"><div className="input-group"><FormControl type="number" min="0" step="0.5" disabled={readOnly} placeholder="0" value={form.estDays} onChange={(e) => set({ estDays: e.target.value })} /><span className="input-group-text">Days</span></div></div>
          </div>
        </Card>

        {/* b. Estimate */}
        <Card title="Estimate" icon="mdi:calculator-variant-outline" color="#ea580c" summary={`Total ${money(calc.total)}`} done={calc.total > 0}
          hint="Spare parts and labour come from the earlier stages. Wash prices come from the Wash list.">
          {/* spare parts */}
          <div className="border rounded-3 p-3 mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <div className="fw-semibold">Total Spare Parts Value <span className="text-muted fw-normal">· Generate Spare Parts Requirements</span></div>
              <Choice disabled={readOnly} value={form.includeSpareParts ? "Y" : "N"} onChange={(v) => set({ includeSpareParts: v === "Y" })} options={[["Y", "YES"], ["N", "NO"]]} />
            </div>
            {form.includeSpareParts && (
              <>
                {ctx.parts.length === 0 && ctx.quotes.length === 0 ? <div className="small text-muted">No spare parts were added in the previous stage.</div> : (
                  <Table size="sm" className="mb-1 align-middle">
                    <thead><tr><th></th><th>Spare part</th><th>Brand</th><th className="text-end">Qty</th><th className="text-end">Total</th></tr></thead>
                    <tbody>
                      {ctx.parts.map((p, n) => <tr key={`p${n}`}><td className="text-muted">{letter(n)}.</td><td>{p.name}</td><td className="small">{p.brand || "-"}</td><td className="text-end">{p.qty}</td><td className="text-end">{money(p.qty * p.unitPrice)}</td></tr>)}
                      {ctx.quotes.map((q, n) => <tr key={`q${n}`}><td className="text-muted">{letter(ctx.parts.length + n)}.</td><td>{q.description} <Badge bg="info">Third party</Badge></td><td>-</td><td className="text-end">1</td><td className="text-end">{money(q.quotedPrice)}</td></tr>)}
                    </tbody>
                  </Table>
                )}
                <Line label="Spare parts value" value={money(ctx.sparePartsValue)} strong />
              </>
            )}
          </div>

          {/* repair cost */}
          <div className="border rounded-3 p-3 mb-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <div className="fw-semibold">Cost for repair <span className="text-muted fw-normal">· Generate Root Cause &amp; Detail Labour List</span></div>
              <Choice disabled={readOnly} value={form.includeLabour ? "Y" : "N"} onChange={(v) => set({ includeLabour: v === "Y" })} options={[["Y", "YES"], ["N", "NO"]]} />
            </div>
            {form.includeLabour && (
              <>
                {ctx.rootCauses.length > 0 && <div className="mb-2"><div className="small fw-semibold">Root causes</div>{ctx.rootCauses.map((r, n) => <div key={n} className="small"><span className="text-muted me-2">{letter(n)}.</span>{r}</div>)}</div>}
                {ctx.labour.length === 0 ? <div className="small text-muted">No labour list was recorded in the previous stage.</div> : (
                  <Table size="sm" className="mb-1 align-middle">
                    <thead><tr><th></th><th>Labour work</th><th className="text-end">Amount</th></tr></thead>
                    <tbody>{ctx.labour.map((l, n) => <tr key={n}><td className="text-muted">{n + 1}.</td><td>{l.description}{l.repairType && <div className="small text-muted">{l.repairType}</div>}</td><td className="text-end">{money(l.amount)}</td></tr>)}</tbody>
                  </Table>
                )}
              </>
            )}
            <div className="fw-semibold small mt-3 mb-1">Write detail list manually</div>
            {form.manualItems.map((m, n) => (
              <div key={n} className="d-flex align-items-center gap-2 border-top py-1">
                <span className="text-muted">{n + 1}.</span><span className="flex-grow-1">{m.description}</span><span>{money(m.amount)}</span>
                {!readOnly && <Button size="sm" variant="outline-danger" onClick={() => set({ manualItems: form.manualItems.filter((_, i) => i !== n) })}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
              </div>
            ))}
            {!readOnly && (
              <div className="row g-2 mt-1">
                <div className="col-12 col-md-7"><FormControl size="sm" placeholder="Description" value={manualDraft.description} onChange={(e) => setManualDraft({ ...manualDraft, description: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addManual()} /></div>
                <div className="col-8 col-md-3"><FormControl size="sm" type="number" min="0" step="0.01" placeholder="Amount" value={manualDraft.amount} onChange={(e) => setManualDraft({ ...manualDraft, amount: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addManual()} /></div>
                <div className="col-4 col-md-2 d-grid"><Button size="sm" variant="outline-primary" onClick={addManual}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button></div>
              </div>
            )}
            <div className="border-top mt-3 pt-2"><Line label="Cost for repair" value={money(calc.repair)} strong /></div>
          </div>

          {/* wash */}
          <div className="border rounded-3 p-3 mb-3">
            <div className="fw-semibold mb-2">Cost for Wash <span className="text-muted fw-normal">· select one wash type if needed</span></div>
            {washParents.length === 0 ? <div className="small text-muted">No wash types yet. Add them in Jobs Dashboard &gt; Repair Type &gt; Wash.</div> : (
              <>
                {!readOnly && (
                  <Form.Select className="mb-2" style={{ maxWidth: 420 }} value={washParent} onChange={(e) => pickWashParent(e.target.value)}>
                    <option value="">Select wash type...</option>
                    {washParents.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}{p.single ? ` · ${money(p.single.price)}` : ` (${p.kids.length} types)`}</option>
                    ))}
                  </Form.Select>
                )}
                {washKids.length > 0 && !readOnly && (
                  <div className="row g-2 mb-2">
                    {washKids.map((o) => {
                      const on = form.washOptionIds.includes(o.id);
                      return (
                        <div key={o.id} className="col-12 col-md-6 col-lg-4">
                          <label className={`d-flex align-items-center gap-2 border rounded-3 px-3 py-2 w-100 ${on ? "border-info bg-info-subtle" : "bg-white"}`} style={{ cursor: "pointer" }}>
                            <Form.Check.Input type="radio" name="wash-type" checked={on} onChange={() => pickWash(o.id)} onClick={() => on && pickWash(o.id)} />
                            <span className="flex-grow-1">{o.name}</span><span className="fw-semibold">{money(o.price)}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
                {washSelected.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {washSelected.map((o) => (
                      <span key={o.id} className="badge rounded-pill text-bg-info d-inline-flex align-items-center gap-2 fs-6 fw-normal py-2 px-3">
                        {o.group ? `${o.group} › ${o.name}` : o.name} · {money(o.price)}
                        {!readOnly && <button type="button" aria-label="Remove" className="btn-close btn-close-white" style={{ fontSize: 9 }} onClick={() => set({ washOptionIds: [] })} />}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="border-top mt-2 pt-2"><Line label="Cost for wash" value={money(calc.wash)} strong /></div>
          </div>

          {/* total */}
          <div className="rounded-3 p-3 text-white" style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
            <div className="d-flex justify-content-between small opacity-75"><span>Spare parts</span><span>{money(calc.spare)}</span></div>
            <div className="d-flex justify-content-between small opacity-75"><span>Cost for repair</span><span>{money(calc.repair)}</span></div>
            <div className="d-flex justify-content-between small opacity-75"><span>Wash</span><span>{money(calc.wash)}</span></div>
            <div className="d-flex justify-content-between fs-5 fw-bold border-top border-light border-opacity-50 mt-2 pt-2"><span>Estimated Total</span><span>{money(calc.total)}</span></div>
          </div>
        </Card>

        {/* sent via */}
        <Card title="Estimation sent via" icon="mdi:send-outline" color="#7c3aed" right={<Button variant="success" className="fw-semibold shadow-sm" onClick={downloadEstimate}><Icon icon="mdi:download-outline" width="20" height="20" /> Download estimate</Button>} done={form.sentVia.length > 0} summary={form.sentVia.length ? VIA.filter(([k]) => form.sentVia.includes(k)).map((v) => v[1]).join(", ") : "Select one or more"}>
          <div className="d-flex flex-wrap gap-2">
            {VIA.map(([k, label, icon]) => {
              const on = form.sentVia.includes(k);
              return (
                <button key={k} type="button" disabled={readOnly} onClick={() => toggle("sentVia", k)} className={`btn d-flex align-items-center gap-2 ${on ? "btn-primary" : "btn-outline-secondary"}`}>
                  <Icon icon={icon} width="20" height="20" />{label}{on && <Icon icon="mdi:check" width="18" height="18" />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* confirmation */}
        <Card title="Customer Confirmation" icon="mdi:account-check-outline" color="#16a34a" done={Boolean(form.decision)}
          summary={form.decision === "TOTAL" ? "Total approved" : form.decision === "PARTIAL" ? "Partly approved (agreed scope)" : "Not selected"}>
          <Choice disabled={readOnly} value={form.decision} onChange={(v) => set({ decision: v })} options={[["TOTAL", "Total approved", "mdi:check-all"], ["PARTIAL", "Agreed scope only", "mdi:format-list-checks"]]} />
          {form.decision === "PARTIAL" && (
            <div className="mt-3">
              <div className="fw-semibold small mb-1">Agreed Scope</div>
              {form.agreedScope.map((s, n) => (
                <div key={n} className="d-flex align-items-center gap-2 border-top py-1">
                  <span className="text-muted">{letter(n)}.</span><span className="flex-grow-1">{s}</span>
                  {!readOnly && <Button size="sm" variant="outline-danger" onClick={() => set({ agreedScope: form.agreedScope.filter((_, i) => i !== n) })}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                </div>
              ))}
              {!readOnly && (
                <div className="d-flex gap-2 mt-1">
                  <FormControl size="sm" placeholder="Add an agreed item" value={scopeDraft} onChange={(e) => setScopeDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addScope()} />
                  <Button size="sm" variant="outline-primary" onClick={addScope}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button>
                </div>
              )}
            </div>
          )}
          <div className="mt-3">
            <div className="fw-semibold small mb-1">Extra note</div>
            <FormControl as="textarea" rows={2} maxLength={1000} disabled={readOnly} value={form.extraNote} onChange={(e) => set({ extraNote: e.target.value })} />
          </div>
        </Card>

        {/* spare parts provider */}
        <Card title="Spare Parts Provided by" icon="mdi:cog-transfer-outline" color="#d97706" done={Boolean(form.partsBy)}
          summary={form.partsBy === "COMPANY" ? "Provided by us" : form.partsBy === "CLIENT" ? "Provided by client" : "Not selected"}>
          <Choice disabled={readOnly} value={form.partsBy} onChange={(v) => set({ partsBy: v })} options={[["COMPANY", "Provided by us", "mdi:store-outline"], ["CLIENT", "Provided by client", "mdi:account-outline"]]} />

          {form.partsBy === "CLIENT" && (
            <div className="mt-3 border rounded-3 p-3">
              <div className="fw-semibold mb-1">The customer brings the spare parts</div>
              <div className="small text-muted mb-2">Upload the full spare part list, then send it to the customer.</div>
              {form.clientPartsFiles.map((f, n) => (
                <div key={n} className="d-flex align-items-center gap-2 border-top py-1">
                  <Icon icon="mdi:paperclip" width="18" height="18" className="text-muted" />
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-grow-1 text-truncate">{f.name}</a>
                  {!readOnly && <Button size="sm" variant="outline-danger" onClick={() => set({ clientPartsFiles: form.clientPartsFiles.filter((_, i) => i !== n) })}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                </div>
              ))}
              {!readOnly && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <input ref={fileRef} type="file" hidden accept="image/*,application/pdf" onChange={onFile} />
                  <Button size="sm" variant="outline-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Spinner size="sm" /> : <Icon icon="mdi:upload" width="16" height="16" />} Upload full spare part list</Button>
                  <Button size="sm" variant="success" disabled={form.clientPartsFiles.length === 0} onClick={sendToCustomer}><Icon icon="mdi:whatsapp" width="16" height="16" /> Send customer</Button>
                  {saved.clientListSentAt && <span className="small text-success align-self-center"><Icon icon="mdi:check-circle" width="16" height="16" /> Sent {when(saved.clientListSentAt)}</span>}
                </div>
              )}
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

              <div className="border-top mt-3 pt-3">
                <div className="fw-semibold mb-1">Third party request</div>
                <div className="small text-muted mb-2">Request to purchase from third parties (from the Logistic and Stock Department)</div>
                <FormControl as="textarea" rows={2} maxLength={500} disabled={readOnly} placeholder="Which items? (optional note)" value={form.thirdPartyNote} onChange={(e) => set({ thirdPartyNote: e.target.value })} />
                {!readOnly && (
                  <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                    <Button size="sm" variant="outline-primary" disabled={sendingLogi} onClick={() => logistics("THIRD_PARTY")}><Icon icon="mdi:storefront-outline" width="16" height="16" /> Request to purchase from third parties</Button>
                    {saved.thirdPartySentAt && <span className="small text-success"><Icon icon="mdi:check-circle" width="16" height="16" /> Requested {when(saved.thirdPartySentAt)}</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
      </>
    );
  };

  return (
    <Modal show onHide={tryClose} size="xl" centered scrollable fullscreen="lg-down" backdrop="static" enforceFocus={false}>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white" style={{ width: 44, height: 44, background: "#16a34a" }}>
            <Icon icon="mdi:account-check-outline" width="26" height="26" />
          </span>
          <span>Customer Approval{job && <span className="text-muted fw-normal">{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f1f5f9" }}>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" className="me-auto" disabled={isFetching} onClick={refetch}><Icon icon="mdi:refresh" width="16" height="16" /> Refresh</Button>
        <Button variant="outline-secondary" onClick={tryClose}>Close</Button>
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

