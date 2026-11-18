"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Collapse, Dropdown, Form, FormControl, FormSelect, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddSpareOptionMutation,
  useAddSparePartItemMutation,
  useAddSpareQuoteMutation,
  useCompleteSparePartsMutation,
  useGetSparePartsQuery,
  useRemoveSparePartItemMutation,
  useRemoveSpareQuoteMutation,
  useSendSparePartsLinkMutation,
  useSetSparePartsHeaderMutation,
  useUpdateSparePartItemMutation,
} from "@/store/features/apiSlice";
import { useSearchSpareLimitedQuery } from "./sparePartsSearchApi";

// Spare Part Review & Order (all departments that use it)
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const letter = (n) => String.fromCharCode(97 + (n % 26));
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STOCK_BADGE = { IN_STOCK: ["success", "In stock"], OUT_OF_STOCK: ["danger", "Out of stock"], UNKNOWN: ["secondary", "Not checked"] };
const QUOTE_BADGE = { REQUESTED: ["secondary", "Requested"], SENT: ["info", "Sent to Logistic & Stock"], QUOTED: ["success", "Quoted"] };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Search the Item master (Inventory & Spare Parts) by item name, SKU, part no / OEM no, barcode or brand.
// Nothing is listed until the user types. The database returns the first 10 matches ("Show more" loads 10 more).
// Clicking a result adds the part to the requirement list straight away.
const TYPED_ROWS = 10, MORE_ROWS = 10;
function ItemSearch({ onAdd, disabled }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [limit, setLimit] = useState(TYPED_ROWS);
  const [added, setAdded] = useState(null);   // id of the part just added (shows a tick for a moment)
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setLimit(TYPED_ROWS); }, [dq]);
  const typed = dq.length > 0;
  const { data = [], isFetching } = useSearchSpareLimitedQuery({ q: dq, limit }, { skip: !typed });
  const hasMore = typed && data.length >= limit && limit < 50;
  const pick = async (p) => {
    if (disabled) return;
    setAdded(p.id);
    await onAdd(p);
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1500);
  };
  return (
    <div className="mb-2">
      <style>{`.is-search-ph::placeholder{color:#6b7280 !important;opacity:1 !important;font-style:normal}`}</style>
      <div className="input-group">
        <span className="input-group-text bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></span>
        <FormControl className="is-search-ph" autoComplete="off" disabled={disabled} placeholder="Type item name, SKU, part no, OEM no, barcode or brand to search..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <Button variant="outline-secondary" aria-label="Clear" onClick={() => setQ("")}><Icon icon="mdi:close" width="18" height="18" /></Button>}
        {isFetching && <span className="input-group-text bg-white"><Spinner size="sm" /></span>}
      </div>
      {typed && (
        <div className="border rounded-3 mt-1 bg-white overflow-hidden shadow-sm" style={{ maxHeight: 300, overflowY: "auto" }}>
          {!isFetching && data.length === 0 && <div className="small text-muted p-3">No spare part found for "{dq}". Add it to the Item master (Inventory &amp; Spare Parts), or add it manually below.</div>}
          {data.map((p) => (
            <button key={p.id} type="button" disabled={disabled} onClick={() => pick(p)} className={`d-flex align-items-center gap-2 w-100 text-start border-0 border-bottom px-3 py-2 ${added === p.id ? "bg-success-subtle" : "bg-white"}`}>
              <div className="flex-grow-1">
                <div className="fw-semibold">{p.name}</div>
                <div className="small text-muted">{[p.sku && `SKU ${p.sku}`, p.partNo, p.brand, p.quality].filter(Boolean).join(" · ") || "-"}</div>
              </div>
              <div className="text-end">
                <div className="fw-semibold">{money(p.price)}</div>
                <Badge bg={p.stockQty > 0 ? "success" : "danger"}>{p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}</Badge>
              </div>
              {added === p.id && <Icon icon="mdi:check-circle" width="22" height="22" className="text-success flex-shrink-0" />}
            </button>
          ))}
          {hasMore && (
            <button type="button" className="btn btn-link btn-sm w-100 text-decoration-none" disabled={isFetching} onClick={() => setLimit((l) => l + MORE_ROWS)}>
              <Icon icon="mdi:chevron-down" width="18" height="18" /> Show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// One collapsible section: coloured icon, title, a short summary and a done tick. Click the header to open / close.
// A card without children (the Total card) is just a header.
function Card({ title, hint, right, children, icon = "mdi:clipboard-text-outline", color: _sectionColor, summary, done, defaultOpen = true }) {
  const color = "#c8102e"; // one theme colour for every section (black + red)
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = children !== undefined && children !== null;
  return (
    <div className="bg-white rounded-3 mb-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,.07)", borderLeft: `4px solid ${color}` }}>
      <div
        className="d-flex flex-wrap align-items-center gap-2 p-2 px-3"
        role={hasBody ? "button" : undefined}
        aria-expanded={hasBody ? open : undefined}
        onClick={hasBody ? () => setOpen(!open) : undefined}
        style={{ background: hasBody && open ? `color-mix(in srgb, ${color} 7%, white)` : "#fff", borderRadius: hasBody && open ? "0.45rem 0.45rem 0 0" : "0.45rem" }}
      >
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
          <Icon icon={icon} width="20" height="20" />
        </span>
        <div className="me-auto" style={{ minWidth: 150 }}>
          <div className="fw-bold d-flex align-items-center gap-2">
            {title}
            {done === true && <Icon icon="mdi:check-circle" width="18" height="18" className="text-success" />}
          </div>
          {hint && (open || !hasBody) && <div className="small text-muted">{hint}</div>}
          {summary ? <div className="small text-muted">{summary}</div> : null}
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
        {hasBody && <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" className="text-muted flex-shrink-0" />}
      </div>
      {hasBody && (
        <Collapse in={open}>
          <div><div className="p-3 border-top">{children}</div></div>
        </Collapse>
      )}
    </div>
  );
}

export default function SparePartsModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch, isFetching } = useGetSparePartsQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [addItem, { isLoading: adding }] = useAddSparePartItemMutation();
  const [updateItem] = useUpdateSparePartItemMutation();
  const [removeItem] = useRemoveSparePartItemMutation();
  const [addQuote, { isLoading: quoting }] = useAddSpareQuoteMutation();
  const [removeQuote] = useRemoveSpareQuoteMutation();
  const [sendLink, { isLoading: linking }] = useSendSparePartsLinkMutation();
  const [setHeader] = useSetSparePartsHeaderMutation();
  const [complete, { isLoading: completing }] = useCompleteSparePartsMutation();
  const [addOption] = useAddSpareOptionMutation();

  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: "", brand: "", quality: "", qty: "1", unitPrice: "" });
  const [quote, setQuote] = useState({ description: "", photoUrl: "", photoName: "" });
  const [uploading, setUploading] = useState(false);
  const [showPrev, setShowPrev] = useState(true);
  const [error, setError] = useState("");
  const [sections, setSections] = useState({ parts: true, labour: true, quotes: true, total: true });
  const photoRef = useRef(null);

  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });
  const job = data?.job;
  const readOnly = data && !data.canRecord;
  const done = Boolean(data?.header?.completedAt);
  const qualities = data?.options?.qualities || [];
  const brands = data?.options?.brands || [];
  useEffect(() => { if (data && !manual.quality && qualities.length) setManual((m) => ({ ...m, quality: qualities[0] })); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFromCatalog = async (p) => { try { await addItem({ jobId, partId: p.id, qty: 1 }).unwrap(); } catch (ex) { fail(ex, "Could not add the spare part."); } };
  const addManual = async () => {
    setError("");
    if (!manual.name.trim()) return setError("Enter the spare part name.");
    try { await addItem({ jobId, ...manual, qty: Number(manual.qty || 1), unitPrice: Number(manual.unitPrice || 0) }).unwrap(); setManual({ ...manual, name: "", unitPrice: "", qty: "1" }); } catch (ex) { fail(ex, "Could not add the spare part."); }
  };
  // Live (unsaved) qty / price typed in the table, so the line total updates while typing.
  const [live, setLive] = useState({});
  const setLiveField = (id, field, value) => setLive((m) => ({ ...m, [id]: { ...m[id], [field]: value } }));
  const numOf = (i, field) => { const v = live[i.id]?.[field]; return v === undefined || v === "" ? (v === "" ? 0 : i[field]) : Number(v); };
  const commit = async (i, field) => {
    const v = live[i.id]?.[field];
    if (v === undefined) return;
    const n = Number(v);
    const ok = Number.isFinite(n) && n !== i[field] && (field !== "qty" || n >= 1);
    if (ok) await patch(i, { [field]: n });
    setLive((m) => { const x = { ...m }; if (x[i.id]) { x[i.id] = { ...x[i.id] }; delete x[i.id][field]; } return x; });
  };
  const patch = async (it, change) => { try { await updateItem({ jobId, itemId: it.id, ...change }).unwrap(); } catch (ex) { fail(ex, "Could not save the change."); } };
  const remove = async (it) => {
    const ok = await Swal.fire({ title: "Remove this spare part?", text: it.name, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (ok.isConfirmed) try { await removeItem({ jobId, itemId: it.id }).unwrap(); } catch (ex) { fail(ex, "Could not remove it."); }
  };
  const newOption = async (kind) => {
    const r = await Swal.fire({ title: kind === "BRAND" ? "Add a brand" : "Add a quality", input: "text", inputPlaceholder: kind === "BRAND" ? "e.g. Korea" : "e.g. Used", showCancelButton: true, confirmButtonText: "Add", inputValidator: (v) => (!v?.trim() ? "Enter a name" : undefined) });
    if (r.isConfirmed) try { await addOption({ kind, name: r.value.trim() }).unwrap(); } catch (ex) { fail(ex, "Could not add the option."); }
  };

  // third-party quotation: item photo + description
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return Swal.fire({ title: "File too large", text: "Max 15 MB.", icon: "warning" });
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
      setQuote((q) => ({ ...q, photoUrl: URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl, photoName: f.name }));
    } catch (ex) { fail(ex, "Upload failed"); } finally { setUploading(false); }
  };
  const addQuoteReq = async () => {
    setError("");
    if (!quote.description.trim()) return setError("Add a description of the item.");
    try { await addQuote({ jobId, photoUrl: quote.photoUrl || undefined, description: quote.description.trim() }).unwrap(); setQuote({ description: "", photoUrl: "", photoName: "" }); } catch (ex) { fail(ex, "Could not add the request."); }
  };

  // "Upload to ERP System" + link to the Inventory & Spare Parts
  const send = async () => {
    try {
      await sendLink(jobId).unwrap();
      await Swal.fire({
        title: "Sent to Inventory & Spare Parts",
        html: `<div class="text-muted" style="font-size:.9rem">The spare parts and the quotation requests are now in <strong>Inventory &amp; Spare Parts &rarr; Job Orders &rarr; Spare part orders</strong>.</div>`,
        icon: "success",
      });
    } catch (ex) { fail(ex, "Could not upload to the ERP."); }
  };

  const finish = async () => {
    setError("");
    const ok = await Swal.fire({ title: "Complete the spare part review?", text: `${job.jobNo} moves to the next stage. The list can no longer be changed here.`, icon: "question", showCancelButton: true, confirmButtonText: "Complete" });
    if (!ok.isConfirmed) return;
    try {
      const r = await complete(jobId).unwrap();
      await Swal.fire({ title: "Done!", icon: "success", timer: 1200, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { setError(ex?.data?.message || "Could not complete the stage."); }
  };

  // Parts, price/qty edits and quotation requests are saved as soon as they are added or changed.
  // Only text that is typed but not added yet can be lost, so ask before closing in that case.
  const hasPending = () =>
    Boolean(manual.name.trim() || manual.unitPrice || quote.description.trim() || quote.photoUrl) ||
    Object.values(live).some((f) => f && Object.keys(f).length > 0);
  const tryClose = async () => {
    if (!hasPending()) return onHide();
    const r = await Swal.fire({
      title: "Close without adding?", icon: "warning", showCancelButton: true, showDenyButton: true,
      text: "You have typed an item or a quotation request that is not added yet. Already added parts are saved.",
      confirmButtonText: "Stay and add it", denyButtonText: "Close anyway", cancelButtonText: "Cancel", focusConfirm: true,
    });
    if (r.isDenied) onHide();
  };

  // Download the quotation: pick the sections, then print / "Save as PDF"
  const download = () => {
    const items = data.items, prev = data.previous;
    const logo = `${window.location.origin}/images/mainlogo.jpeg`;
    const today = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    const partsTotal = items.reduce((t, i) => t + i.qty * i.unitPrice, 0);
    const quotedTotal = data.quotes.reduce((t, q) => t + (q.quotedPrice != null ? q.quotedPrice : 0), 0);
    const labourTotal = (prev?.labourList || []).reduce((t, l) => t + (Number(l.amount) || 0), 0);
    const R = 'style="text-align:right"';
    const rows = items.map((i, n) => `<tr><td class="c">${n + 1}</td><td><b>${esc(i.name)}</b></td><td>${esc(i.brand || "-")}</td><td>${esc(i.quality || "-")}</td><td ${R}>${i.qty}</td><td ${R}>${money(i.unitPrice)}</td><td ${R}><b>${money(i.qty * i.unitPrice)}</b></td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Quotation ${esc(job.jobNo)}</title>
<style>
@page{size:A4;margin:14mm}
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
@media print{.page{padding:0}}
</style></head><body><div class="page">
<div class="top">
  <div style="display:flex;align-items:center;gap:12px"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div class="brandname">KARUNARATHNE AUTO ZONE</div></div>
  <div class="doc"><div class="t">Quotation</div><div class="s">Spare parts &amp; labour</div></div>
</div><div class="gold"></div>
<dl class="meta">
  <div><dt>Quotation for job</dt><dd>${esc(job.jobNo)}</dd></div>
  <div><dt>Customer</dt><dd>${esc(job.customerName)}</dd></div>
  <div><dt>Vehicle no</dt><dd>${esc(job.regNo)}</dd></div>
  <div><dt>Date</dt><dd>${today}</dd></div>
</dl>
<div class="note" style="margin-top:6px">Department: ${esc(job.departmentName)}</div>
${sections.parts ? `<h2>Spare parts</h2><table><thead><tr><th class="c" style="color:#fff">#</th><th>Item</th><th>Brand</th><th>Quality</th><th ${R}>Qty</th><th ${R}>Unit price</th><th ${R}>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">No spare parts</td></tr>'}</tbody></table>` : ""}
${sections.labour ? `<h2>Root cause &amp; labour work</h2>${prev?.rootCauses?.length ? `<p class="note"><b>Root causes:</b> ${prev.rootCauses.map(esc).join("; ")}</p>` : ""}<table><thead><tr><th>Labour work</th><th ${R}>Amount</th></tr></thead><tbody>${(prev?.labourList || []).map((l) => `<tr><td>${esc(l.description)}</td><td ${R}>${money(l.amount)}</td></tr>`).join("") || '<tr><td colspan="2" class="empty">-</td></tr>'}</tbody></table>` : ""}
${sections.quotes ? `<h2>Third-party quotations</h2><table><thead><tr><th>Item</th><th>Status</th><th ${R}>Quoted price</th></tr></thead><tbody>${data.quotes.map((q) => `<tr><td>${esc(q.description)}</td><td><span class="badge ${q.status === "QUOTED" ? "ok" : ""}">${esc(QUOTE_BADGE[q.status]?.[1])}</span></td><td ${R}>${q.quotedPrice != null ? money(q.quotedPrice) : "-"}</td></tr>`).join("") || '<tr><td colspan="3" class="empty">-</td></tr>'}</tbody></table>` : ""}
${sections.total ? `<div class="sum">${sections.parts ? `<div><span>Spare parts</span><b>${money(partsTotal)}</b></div>` : ""}${sections.quotes ? `<div><span>Third-party quotations</span><b>${money(quotedTotal)}</b></div>` : ""}${sections.labour ? `<div><span>Labour</span><b>${money(labourTotal)}</b></div>` : ""}<div class="g"><span>Total spare parts value</span><span>${money(data.totalSparePartsValue)}</span></div></div>` : ""}
<div class="sign"><div>Prepared by</div><div>Customer approval</div></div>
<div class="foot">KARUNARATHNE AUTO ZONE · Thank you for choosing us</div>
</div>
<script>
(function(){var done=false;function go(){if(done)return;done=true;window.print()}
var im=document.images[0];if(!im||im.complete){setTimeout(go,150)}else{im.onload=go;im.onerror=go;setTimeout(go,2500)}})();
<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups to download the quotation.", icon: "info" });
    w.document.open(); w.document.write(html); w.document.close();
  };

  const prev = data?.previous;
  return (
    <>
      <Modal show onHide={tryClose} size="xl" centered scrollable fullscreen="lg-down" backdrop="static" enforceFocus={false} dialogClassName="sp-modal">
        <style>{`
          @media (min-width: 992px) { .modal-dialog.sp-modal { --bs-modal-width: 1060px; } }
          .sp-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
          .sp-modal .sp-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
          .sp-modal .modal-body { background: #f6f6f7 !important; padding: 18px 22px; }
          .sp-modal .form-control, .sp-modal .form-select { border-radius: 12px; border: 1.5px solid #c4c4ca; min-height: 44px; }
          .sp-modal .form-control:focus, .sp-modal .form-select:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
          .sp-modal .input-group > .form-control { border-radius: 0 12px 12px 0; min-height: 52px; }
          .sp-modal .input-group > .input-group-text:first-child { border-radius: 12px 0 0 12px; background: #fde8ea !important; color: #c8102e; border: 1.5px solid #c4c4ca; border-right: 0; }
          .sp-modal .form-check-input:checked { background-color: #c8102e; border-color: #c8102e; }
          .sp-modal .btn-outline-primary, .sp-modal .btn-outline-secondary { color: #111; border: 1.5px solid #c4c4ca; border-radius: 10px; font-weight: 600; background: #fff; }
          .sp-modal .btn-outline-primary:hover, .sp-modal .btn-outline-secondary:hover { color: #fff; background: #111; border-color: #111; }
          .sp-modal .btn-outline-danger { border-radius: 10px; border-width: 1.5px; }
          .sp-modal .btn-secondary { background: #111; border-color: #111; border-radius: 10px; }
          .sp-modal .btn-success, .sp-modal .btn-primary { color: #fff !important; border: 0 !important; border-radius: 10px; font-weight: 700; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; }
          .sp-modal .btn-success:hover, .sp-modal .btn-primary:hover { filter: brightness(1.25); }
          .sp-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 22px; }
          .sp-modal .modal-footer .btn { min-height: 46px; padding: 0 22px; border-radius: 12px; }
          .sp-modal table thead th { background: #111; color: #fff; font-size: .72rem; letter-spacing: .05em; text-transform: uppercase; border: 0; }
          .sp-modal .sp-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 3px 10px; font-weight: 700; font-size: .85rem; box-shadow: inset 3px 0 0 #c8102e; }
          .sp-modal .sp-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; }
        `}</style>
        <Modal.Header closeButton closeVariant="white" className="sp-head">
          <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
            <Icon icon="mdi:cog-transfer-outline" width="30" height="30" />
            <span>
              Spare Part Review &amp; Order{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: "#f6f6f7" }}>
          {isLoading && <div className="text-center py-5"><Spinner /></div>}
          {isError && <Alert variant="danger" className="d-flex justify-content-between"><span>{loadError?.data?.message || "Could not load the spare parts."}</span><Button size="sm" variant="outline-danger" onClick={refetch}>Try again</Button></Alert>}
          {data && (
            <>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 px-3 bg-white rounded-3" style={{ border: "1px solid #e3e3e6", borderLeft: "5px solid #c8102e", boxShadow: "0 4px 14px -10px rgba(15,23,42,.45)" }}>
                <span className="sp-jobno">{job.jobNo}</span>
                <span className="sp-plate">{job.regNo}</span>
                <span className="fw-semibold"><Icon icon="mdi:account-outline" width="18" height="18" className="me-1" style={{ color: "#c8102e" }} />{job.customerName}</span>
                <span className="ms-auto d-flex flex-wrap gap-2">
                  <Badge bg="light" text="dark" className="border fw-normal">{data.items.length} spare part(s)</Badge>
                  <Badge bg="dark" className="fw-semibold">{money(data.totalSparePartsValue)}</Badge>
                  {done && <Badge bg="success">Completed</Badge>}
                </span>
              </div>
              {readOnly && <Alert variant="secondary" className="py-2">{done ? "This stage is completed. The list is read-only." : "You can only view this stage now."}</Alert>}

              {/* Root cause / labour work list from the previous stage */}
              <Card title="Root Cause / Labour Work List" icon="mdi:clipboard-text-clock-outline" color="#7c3aed" hint="Shown from the previous related stage"
                summary={`${prev.rootCauses.length} root cause(s) · ${prev.labourList.length} labour item(s)`}>
                <Collapse in={showPrev}>
                  <div>
                    {prev.rootCauses.length === 0 && prev.labourList.length === 0 && !prev.complaint && prev.concerns.length === 0 && <div className="small text-muted">Nothing recorded in the previous stage.</div>}
                    {prev.complaint && <div className="mb-1"><span className="text-muted small">Complaint: </span>{prev.complaint}</div>}
                    {prev.concerns.length > 0 && <div className="mb-1 small">{prev.concerns.map((c, n) => <Badge key={n} bg="light" text="dark" className="border me-1">{c.name}</Badge>)}</div>}
                    {prev.rootCauses.length > 0 && <div className="mb-1"><div className="fw-semibold small">Root causes</div>{prev.rootCauses.map((r, n) => <div key={n}><span className="text-muted me-2">{letter(n)}.</span>{r}</div>)}</div>}
                    {prev.labourList.length > 0 && (
                      <Table size="sm" className="mb-0"><thead><tr><th>Labour work</th><th>Type</th><th className="text-end">Amount</th></tr></thead>
                        <tbody>{prev.labourList.map((l, n) => <tr key={n}><td>{l.description}</td><td className="small text-muted">{l.repairType || "-"}</td><td className="text-end">{money(l.amount)}</td></tr>)}</tbody></Table>
                    )}
                  </div>
                </Collapse>
              </Card>

              {/* Requirement list */}
              <Card title="Spare Parts Requirement" icon="mdi:cog-transfer-outline" color="#ea580c" done={data.items.length > 0} summary={`${data.items.length} part(s) · ${money(data.items.reduce((s, i) => s + numOf(i, "qty") * numOf(i, "unitPrice"), 0))}`} hint="Search the item master and click a part to add it. If the stock is not available, update the price manually."
                right={<span className="badge text-bg-success fs-6 fw-semibold">{money(data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0))}</span>}>
                {!readOnly && (
                  <div className="rounded-3 p-3 mb-3" style={{ background: "color-mix(in srgb, #ea580c 7%, white)", border: "1px solid color-mix(in srgb, #ea580c 30%, white)", boxShadow: "0 2px 8px rgba(234,88,12,.10)" }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon="mdi:plus-circle-outline" width="20" height="20" style={{ color: "#ea580c" }} /> Add item</div>
                      <Button size="sm" variant={showManual ? "secondary" : "outline-secondary"} onClick={() => setShowManual((v) => !v)}>
                        <Icon icon={showManual ? "mdi:close" : "mdi:pencil-plus-outline"} width="16" height="16" /> {showManual ? "Hide manual form" : "Add item manually"}
                      </Button>
                    </div>
                    <ItemSearch onAdd={addFromCatalog} disabled={adding} />
                    <div className="small text-muted mt-n2">Search the item master and click an item to add it. Can't find it? Use "Add item manually".</div>
                  </div>
                )}
                <Table size="sm" responsive className="align-middle mb-2">
                  <thead><tr><th /><th>Spare part</th><th style={{ width: 130 }}>Brand</th><th>Quality</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 130 }}>Price (Rs.)</th><th className="text-end">Total</th><th /></tr></thead>
                  <tbody>
                    {data.items.length === 0 && <tr><td colSpan={8} className="small text-muted">No spare parts yet.</td></tr>}
                    {data.items.map((i, n) => {
                      const [sv, st] = STOCK_BADGE[i.stockStatus];
                      return (
                        <tr key={`${i.id}-${i.brand}`} className={i.stockStatus === "OUT_OF_STOCK" ? "table-warning" : ""}>
                          <td className="text-muted">{letter(n)}.</td>
                          <td>{i.name}<div><Badge bg={sv}>{st}</Badge> {i.priceSource === "MANUAL" && <Badge bg="warning" text="dark">Manual price</Badge>} {i.priceSource === "LOGISTICS" && <Badge bg="info">Updated by Logistic &amp; Stock</Badge>}</div>{i.stockStatus === "OUT_OF_STOCK" && <div className="small text-danger">Stock not available · update the price manually</div>}</td>
                          <td className="small">{i.brand || "-"}</td>
                          <td className="small">{i.quality || "-"}</td>
                          <td><FormControl size="sm" type="number" min="1" disabled={readOnly} value={live[i.id]?.qty ?? i.qty} onChange={(e) => setLiveField(i.id, "qty", e.target.value)} onBlur={() => commit(i, "qty")} /></td>
                          <td><FormControl size="sm" type="number" min="0" step="0.01" disabled={readOnly} value={live[i.id]?.unitPrice ?? i.unitPrice} onChange={(e) => setLiveField(i.id, "unitPrice", e.target.value)} onBlur={() => commit(i, "unitPrice")} /></td>
                          <td className="text-end">{money(numOf(i, "qty") * numOf(i, "unitPrice"))}</td>
                          <td>{!readOnly && <Button size="sm" variant="outline-danger" onClick={() => remove(i)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                {!readOnly && showManual && (
                  <div className="border rounded p-2 bg-light">
                    <div className="small fw-semibold mb-1">Add / update manually</div>
                    <div className="row g-2">
                      <div className="col-12 col-md-4"><FormControl size="sm" autoComplete="off" placeholder="Spare part name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} /></div>
                      <div className="col-6 col-md-2 d-flex gap-1"><FormSelect size="sm" value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })}><option value="">Brand</option>{brands.map((b) => <option key={b}>{b}</option>)}</FormSelect><Button size="sm" variant="outline-secondary" title="Add a brand" onClick={() => newOption("BRAND")}>+</Button></div>
                      <div className="col-6 col-md-2"><FormSelect size="sm" value={manual.quality} onChange={(e) => setManual({ ...manual, quality: e.target.value })}>{qualities.map((b) => <option key={b}>{b}</option>)}</FormSelect></div>
                      <div className="col-3 col-md-1"><FormControl size="sm" type="number" min="1" placeholder="Qty" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} /></div>
                      <div className="col-5 col-md-2"><FormControl size="sm" type="number" min="0" step="0.01" placeholder="Price" value={manual.unitPrice} onChange={(e) => setManual({ ...manual, unitPrice: e.target.value })} /></div>
                      <div className="col-4 col-md-1 d-grid"><Button size="sm" disabled={adding} onClick={addManual}>Add</Button></div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Third-party quotation */}
              <Card title="Request quotation from third parties" icon="mdi:storefront-outline" color="#0891b2" done={data.quotes.length > 0} summary={`${data.quotes.length} request(s)`} hint="Item photo + description. It is uploaded to the ERP and Inventory & Spare Parts is notified to answer with a price.">
                {!readOnly && (
                  <div className="row g-2 align-items-start mb-2">
                    <div className="col-md-4 d-flex align-items-center gap-2">
                      <Button size="sm" variant="outline-primary" disabled={uploading} onClick={() => photoRef.current?.click()}>{uploading ? <Spinner size="sm" /> : <Icon icon="mdi:camera-outline" width="16" height="16" />} Item photo</Button>
                      <input ref={photoRef} type="file" hidden accept="image/*" capture="environment" onChange={onPhoto} />
                      {quote.photoUrl && <img src={quote.photoUrl} alt="" style={{ height: 38, borderRadius: 4 }} />}
                    </div>
                    <div className="col-md-6"><FormControl as="textarea" rows={2} size="sm" maxLength={1000} placeholder="Add description" value={quote.description} onChange={(e) => setQuote({ ...quote, description: e.target.value })} /></div>
                    <div className="col-md-2 d-grid"><Button size="sm" disabled={quoting} onClick={addQuoteReq}><Icon icon="mdi:plus" width="16" height="16" /> Add request</Button></div>
                  </div>
                )}
                {data.quotes.length === 0 ? <div className="small text-muted">No quotation requests.</div> : data.quotes.map((q) => (
                  <div key={q.id} className="d-flex align-items-center gap-2 border-top py-1">
                    {q.photoUrl ? <a href={q.photoUrl} target="_blank" rel="noopener noreferrer"><img src={q.photoUrl} alt="" style={{ height: 40, width: 40, objectFit: "cover", borderRadius: 4 }} /></a> : <Icon icon="mdi:image-off-outline" width="28" height="28" className="text-muted" />}
                    <div className="flex-grow-1">{q.description}<div className="small"><Badge bg={QUOTE_BADGE[q.status][0]}>{QUOTE_BADGE[q.status][1]}</Badge>{q.quotedPrice != null && <strong className="ms-2">{money(q.quotedPrice)}</strong>}{q.quotedNote && <span className="text-muted ms-2">{q.quotedNote}</span>}</div></div>
                    {!readOnly && q.status === "REQUESTED" && <Button size="sm" variant="outline-danger" onClick={() => removeQuote({ jobId, quoteId: q.id })}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                  </div>
                ))}
                {(data.items.length > 0 || data.quotes.length > 0) && (
                <div className="border-top mt-3 pt-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div className="small text-muted">{data.header.logisticsUpdatedAt ? `Logistic & Stock updated ${new Date(data.header.logisticsUpdatedAt).toLocaleString()} · the list above shows their prices` : data.header.linkSentAt ? `Uploaded to Inventory ${new Date(data.header.linkSentAt).toLocaleString()} · waiting for Inventory & Spare Parts to update` : "Not uploaded to Inventory & Spare Parts yet"}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-secondary" disabled={isFetching} onClick={refetch}><Icon icon="mdi:refresh" width="16" height="16" /> Refresh</Button>
                    {!readOnly && <Button size="sm" variant="primary" disabled={linking || !data.header.needsUpload} onClick={send}><Icon icon={data.header.needsUpload ? "mdi:send-outline" : "mdi:check-circle-outline"} width="16" height="16" /> {data.header.needsUpload ? "Upload to ERP System" : "Uploaded"}</Button>}
                  </div>
                </div>
                )}
              </Card>

              {/* Total + download */}
              <Card title={`Total Spare Parts Value  ${money(data.totalSparePartsValue)}`} icon="mdi:cash-multiple" color="#16a34a" hint="Spare parts + quoted third-party prices"
                right={
                  <Dropdown align="end" autoClose="outside">
                    <Dropdown.Toggle variant="success" className="fw-semibold px-3 shadow-sm"><Icon icon="mdi:download-outline" width="20" height="20" /> Download quotation</Dropdown.Toggle>
                    <Dropdown.Menu className="p-2" style={{ minWidth: 260 }}>
                      <div className="small text-muted mb-1">Select the sections</div>
                      {[["parts", "Spare parts requirement list"], ["labour", "Root cause / labour work list"], ["quotes", "Third-party quotations"], ["total", "Total value"]].map(([k, t]) => (
                        <Form.Check key={k} type="checkbox" id={`sec-${k}`} label={t} checked={sections[k]} onChange={(e) => setSections({ ...sections, [k]: e.target.checked })} />
                      ))}
                      <Button size="sm" className="mt-2 w-100" disabled={!Object.values(sections).some(Boolean)} onClick={download}>Download / Print (PDF)</Button>
                    </Dropdown.Menu>
                  </Dropdown>
                } />
              {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={tryClose} style={{ border: "1.5px solid #c4c4ca", color: "#111", fontWeight: 600 }}>Close</Button>
          {data && !readOnly && <Button variant="success" disabled={completing} onClick={finish}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" width="18" height="18" />} Complete stage</Button>}
        </Modal.Footer>
      </Modal>
    </>
  );
}