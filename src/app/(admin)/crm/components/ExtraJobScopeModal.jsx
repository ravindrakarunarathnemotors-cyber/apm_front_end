"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Col, Form, FormControl, FormSelect, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddExtraScopeMutation, useCompleteExtraScopeMutation, useDeleteExtraScopeMutation,
  useGetExtraScopesQuery, useGetExtraRepairTreeQuery, useSaveExtraScopeMutation, useSendExtraScopeSmsMutation,
} from "./extraScopeApi";
import { useSearchSpareLimitedQuery } from "./sparePartsSearchApi";
import { useAddSpareOptionMutation } from "@/store/features/apiSlice";
import { printHtml, savePdf } from "./estimatePdf";
import { DEFAULT_COMPANY, termsHtml, useGetCompanyProfileQuery, useGetTermsQuery } from "./settingsApi";

// Extra Job Scope: extra work found / requested after the job is activated. A job can have many (#1, #2 ...).
// Steps: 1 New findings  ->  2 Spare parts  ->  3 Estimate  ->  4 Customer approval. Everything is auto-saved.
// Props: jobId, onHide
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const letter = (n) => String.fromCharCode(97 + (n % 26));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nid = (p) => `${p}${Math.random().toString(36).slice(2, 9)}`;
const STATUS = { OPEN: ["warning", "Open"], APPROVED: ["success", "Approved"], PARTIAL: ["info", "Partly approved"], REJECTED: ["danger", "Rejected"] };
const STEPS = [["findings", "New findings", "mdi:magnify-scan"], ["parts", "Spare parts", "mdi:cog-outline"], ["estimate", "Estimate", "mdi:calculator-variant-outline"], ["approval", "Customer approval", "mdi:account-check-outline"]];
const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });

// amounts as typed numbers; same totals rule as the server
// the price adjustment (%) is added to the unit price of every line: customer unit price = unit price + %
const adjU = (pct, u) => Math.round((Number(u) || 0) * (100 + (Number(pct) || 0))) / 100;
function calcTotals(f, pct) {
  const A = (u) => adjU(pct, u);
  // "Agreed scope only" applies to the repair (labour) lines; the spare parts are always part of the estimate (unless the customer brings them)
  const agreed = (x) => f.decision !== "REJECTED" && (f.decision !== "PARTIAL" || f.agreedScope.includes(x.id));
  const agreedPart = () => f.decision !== "REJECTED";
  const own = (x) => f.partsBy === "CLIENT" && f.clientParts.includes(x.id);
  const labour = f.incLabour === false ? 0 : f.labour.filter(agreed).reduce((s, x) => s + (x.qty || 1) * A(x.amount), 0);
  const spare = f.incParts === false ? 0 : f.parts.filter((x) => agreedPart() && !own(x)).reduce((s, x) => s + x.qty * A(x.unitPrice), 0)
    + f.quotes.filter(agreedPart).reduce((s, x) => s + (x.qty || 1) * A(x.price), 0);
  const r2 = (n) => Math.round(n * 100) / 100;
  return { labour: r2(labour), spare: r2(spare), total: r2(labour + spare) };
}
// estHours is stored as decimal hours (1.5 = 1 hr 30 min); the form shows Hours and Minutes separately (same as Customer Approval)
const splitHM = (v) => { const t = Number(v) || 0; let h = Math.floor(t + 1e-6); let m = Math.round((t - h) * 60); if (m >= 60) { h += 1; m = 0; } return [h, m]; };
const joinHM = (h, m) => { const t = Math.round(((Number(h) || 0) + (Number(m) || 0) / 60) * 10000) / 10000; return t > 0 ? String(t) : ""; };
// "Parent > Child" -> "Child" (only the child type is shown in the estimate)
const childOf = (d) => String(d || "").split(" > ").slice(-1)[0];
const timeText = (f) => {
  const [h, m] = splitHM(f.estHours); const d = Number(f.estDays) || 0;
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
        {quick.map((q) => <button key={q} type="button" disabled={disabled} className={`ts-chip ${n === q ? "on" : ""}`} onClick={() => setN(q)}>{q}</button>)}
        <button type="button" disabled={disabled || n === 0} className="ts-chip clr" onClick={() => onChange("")}>Clear</button>
      </div>
    </div>
  );
}

// a text box that grows with its text (no scroll bar, no fixed height)
function AutoText({ value, onChange, disabled, placeholder }) {
  const ref = useRef(null);
  const fit = () => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } };
  useEffect(fit, [value]);
  return <FormControl as="textarea" rows={1} ref={ref} size="sm" value={value} disabled={disabled} placeholder={placeholder} onChange={onChange} onInput={fit} style={{ resize: "none", overflow: "hidden" }} />;
}

// Photos / videos of the new findings: same look as Vehicle Evidence (big drop area, camera buttons, thumbnails with upload status)
const MAX_IMAGE_MB = 15, MAX_VIDEO_MB = 100;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const pad2 = (n) => String(n).padStart(2, "0");
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`; };
const safeName = (v) => String(v || "").replace(/[^A-Za-z0-9-]+/g, "").toUpperCase();
function EvidenceUpload({ job, files, onAdd, onRemove, disabled }) {
  const photoRef = useRef(null), videoRef = useRef(null), galleryRef = useRef(null);
  const [queue, setQueue] = useState([]);     // { key, file, url (preview), name, type, status, error }
  const [over, setOver] = useState(false);
  const [view, setView] = useState(null);
  const seq = useRef(files.length);
  const patchQ = (key, p) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const dropQ = (key) => setQueue((q) => { const x = q.find((y) => y.key === key); if (x) URL.revokeObjectURL(x.url); return q.filter((y) => y.key !== key); });
  const queueRef = useRef([]); queueRef.current = queue;
  useEffect(() => () => { queueRef.current.forEach((q) => URL.revokeObjectURL(q.url)); }, []);

  const uploadOne = async (en) => {
    patchQ(en.key, { status: "uploading", error: "" });
    try {
      const fd = new FormData(); fd.append("file", new File([en.file], en.name, { type: en.file.type, lastModified: Date.now() }));
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
      onAdd({ id: nid("f"), name: en.name, url: URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl, mime: en.file.type });
      dropQ(en.key);
    } catch (ex) { patchQ(en.key, { status: "error", error: ex?.message || "Upload failed" }); }
  };
  const take = (list) => {
    const entries = [], rejected = [];
    for (const file of list) {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) { rejected.push(`${file.name}: only images and videos`); continue; }
      const mb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
      if (file.size > mb * 1024 * 1024) { rejected.push(`${file.name}: larger than ${mb}MB`); continue; }
      seq.current += 1;
      const ext = EXT[file.type] || (isVideo ? "mp4" : "jpg");
      entries.push({ key: `q${Date.now()}-${seq.current}`, file, url: URL.createObjectURL(file), type: isVideo ? "VIDEO" : "IMAGE", status: "uploading", error: "", name: `${safeName(job.jobNo)}_${safeName(job.regNo)}_EXTRA_${stamp()}_${seq.current}.${ext}` });
    }
    if (rejected.length) Swal.fire({ title: "Some files were skipped", html: rejected.map((x) => `<div style="font-size:.9rem">${esc(x)}</div>`).join(""), icon: "warning" });
    if (!entries.length) return;
    setQueue((q) => [...q, ...entries]);
    (async () => { for (const en of entries) await uploadOne(en); })();
  };
  const onPicked = (e) => { const list = Array.from(e.target.files || []); e.target.value = ""; take(list); };
  const thumbs = [
    ...files.map((x) => ({ key: x.id, url: x.url, name: x.name, type: x.mime?.startsWith("video") ? "VIDEO" : "IMAGE", status: "saved", onRemove: () => onRemove(x.id) })),
    ...queue.map((q) => ({ key: q.key, url: q.url, name: q.name, type: q.type, status: q.status, error: q.error, onRemove: () => dropQ(q.key), onRetry: () => uploadOne(q) })),
  ];
  return (
    <div>
      <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onPicked} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={onPicked} />
      <input ref={galleryRef} type="file" accept="image/*,video/*" multiple hidden onChange={onPicked} />
      {!disabled && (
        <div className={`ve-drop ${over ? "over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer?.files?.length) take(Array.from(e.dataTransfer.files)); }}>
          <button type="button" className="ve-drop-main" onClick={() => galleryRef.current?.click()}>
            <span className="ve-cloud"><Icon icon="mdi:cloud-upload" width="46" height="46" /></span>
            <span className="ve-drop-title">Browse file to upload</span>
            <span className="ve-drop-sub ve-only-mouse">or drag &amp; drop photos / videos here</span>
            <span className="ve-drop-sub ve-only-touch">Tap to choose photos / videos from your phone</span>
          </button>
          <div className="ve-drop-cam">
            <button type="button" onClick={() => photoRef.current?.click()}><Icon icon="mdi:camera" width="24" height="24" /> Take photo</button>
            <button type="button" onClick={() => videoRef.current?.click()}><Icon icon="mdi:video" width="24" height="24" /> Record video</button>
          </div>
        </div>
      )}
      {thumbs.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-3">
          {thumbs.map((e) => (
            <div key={e.key} style={{ width: 112 }}>
              <div className={`position-relative rounded-3 overflow-hidden bg-dark ${e.status === "error" ? "border border-2 border-danger" : "border"}`} style={{ width: 112, height: 112, cursor: "pointer" }} role="button" tabIndex={0} title={e.name} onClick={() => setView(e)} onKeyDown={(ev) => ev.key === "Enter" && setView(e)}>
                {e.type === "VIDEO" ? (
                  <>
                    <video src={e.url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                    <span className="position-absolute top-50 start-50 translate-middle text-white" style={{ textShadow: "0 0 6px #000" }}><Icon icon="mdi:play-circle" width="34" height="34" /></span>
                  </>
                ) : <img src={e.url} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {e.status === "uploading" && <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,.45)" }}><Spinner animation="border" size="sm" variant="light" /></div>}
                {e.status === "saved" && <span className="position-absolute bottom-0 start-0 m-1 badge bg-success"><Icon icon="mdi:check" width="12" height="12" /></span>}
                {!disabled && e.status !== "uploading" && (
                  <button type="button" aria-label="Remove" onClick={(ev) => { ev.stopPropagation(); e.onRemove(); }} className="btn btn-sm btn-dark position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, opacity: 0.9, minHeight: 0 }}><Icon icon="mdi:close" width="14" height="14" /></button>
                )}
              </div>
              {e.status === "uploading" && <div className="small text-primary text-truncate">Uploading...</div>}
              {e.status === "error" && <div className="small text-danger" style={{ lineHeight: 1.2 }}>{e.error} {e.onRetry && <a href="#retry" onClick={(ev) => { ev.preventDefault(); e.onRetry(); }}>Retry</a>}</div>}
            </div>
          ))}
        </div>
      )}
      {view && (
        <Modal show onHide={() => setView(null)} centered size="lg" contentClassName="bg-dark text-white">
          <Modal.Header closeButton closeVariant="white" className="border-0"><Modal.Title className="fs-6 text-break">{view.name}</Modal.Title></Modal.Header>
          <Modal.Body className="text-center p-2">
            {view.type === "VIDEO" ? <video src={view.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "75vh" }} /> : <img src={view.url} alt={view.name} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} />}
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

function Section({ id, title, icon, hint, children }) {
  return (
    <div className="xs-card" id={id ? `xs-${id}` : undefined}>
      <div className="xs-card-h"><Icon icon={icon} width="18" height="18" /> <b>{title}</b></div>
      {hint && <div className="xs-hint">{hint}</div>}
      {children}
    </div>
  );
}

// Search the Item master by item name, SKU, part no / OEM no, barcode or brand (same as Vehicle Job Inspection).
// Nothing is listed until the user types. Clicking a result adds the part straight away.
const TYPED_ROWS = 10, MORE_ROWS = 10;
function PartSearch({ onAdd, disabled }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [limit, setLimit] = useState(TYPED_ROWS);
  const [added, setAdded] = useState(null);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setLimit(TYPED_ROWS); }, [dq]);
  const typed = dq.length > 0;
  const { data = [], isFetching } = useSearchSpareLimitedQuery({ q: dq, limit }, { skip: !typed });
  const hasMore = typed && data.length >= limit && limit < 50;
  const pick = (p) => {
    if (disabled) return;
    setAdded(p.id); onAdd(p); setQ("");
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1500);
  };
  return (
    <div className="mb-2">
      <div className="input-group">
        <span className="input-group-text bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></span>
        <FormControl autoComplete="off" disabled={disabled} placeholder="Type item name, SKU, part no, OEM no, barcode or brand to search..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <Button variant="outline-secondary" aria-label="Clear" onClick={() => setQ("")}><Icon icon="mdi:close" width="18" height="18" /></Button>}
        {isFetching && <span className="input-group-text bg-white"><Spinner size="sm" /></span>}
      </div>
      {typed && (
        <div className="border rounded-3 mt-1 bg-white overflow-hidden shadow-sm" style={{ maxHeight: 300, overflowY: "auto" }}>
          {!isFetching && data.length === 0 && <div className="small text-muted p-3">No spare part found for &apos;{dq}&apos;. Add it manually below.</div>}
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
          {hasMore && <button type="button" className="btn btn-link btn-sm w-100 text-decoration-none" disabled={isFetching} onClick={() => setLimit((l) => l + MORE_ROWS)}><Icon icon="mdi:chevron-down" width="18" height="18" /> Show more</button>}
        </div>
      )}
    </div>
  );
}

export default function ExtraJobScopeModal({ jobId, onHide }) {
  const { data, isLoading, isError } = useGetExtraScopesQuery(jobId);
  const [addScope] = useAddExtraScopeMutation();
  const job = data?.job;
  // one Extra Job Scope per job: it is created the first time the window is opened, and opened straight away
  const scope = data?.scopes?.[data.scopes.length - 1];
  const asked = useRef(false);
  useEffect(() => {
    if (!data || scope || !data.canAdd || asked.current) return;
    asked.current = true;
    addScope(jobId).unwrap().catch((ex) => fail(ex, "Could not start the Extra Job Scope."));
  }, [data, scope, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal show onHide={onHide} size="xl" centered scrollable backdrop="static">
      <style>{`
        .xs-card{background:#fff;border:1px solid #eceff3;border-left:4px solid #8f0b0b;border-radius:14px;padding:16px 18px;margin-bottom:16px;box-shadow:0 2px 10px rgba(17,24,39,.05)}
        .xs-card-h{display:flex;align-items:center;gap:10px;color:#1f2937;margin-bottom:4px;font-size:1.02rem}
        .xs-card-h svg{background:#fdf2f2;color:#8f0b0b;border-radius:10px;padding:6px;width:32px;height:32px;box-sizing:border-box}
        .xs-hint{color:#6b7280;font-size:.82rem;margin-bottom:8px}
        .xs-steps{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .xs-step{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:6px 14px;font-size:.88rem;display:inline-flex;align-items:center;gap:6px}
        .xs-step.on{background:#8f0b0b;border-color:#8f0b0b;color:#fff}
        .ve-drop{border:2.5px dashed #c8102e;border-radius:16px;background:#fff;padding:10px;transition:all .15s}
        .ve-drop.over{background:#fff1f2;border-color:#7a0a14;box-shadow:0 0 0 5px rgba(200,16,46,.15)}
        .ve-drop-main{width:100%;border:0;background:transparent;display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 8px 14px;cursor:pointer}
        .ve-cloud{width:78px;height:78px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#c8102e;background:#fde8ea}
        .ve-drop-main:hover .ve-cloud{background:#c8102e;color:#fff}
        .ve-drop-title{font-size:1.15rem;font-weight:700;color:#c8102e}
        .ve-drop-sub{font-size:.85rem;color:#64748b}
        .ve-only-touch{display:none}
        @media (hover:none){.ve-only-touch{display:inline}.ve-only-mouse{display:none}}
        .ve-drop-cam{display:grid;grid-template-columns:1fr 1fr;gap:10px;border-top:1.5px dashed #e3b4ba;padding-top:10px}
        .ve-drop-cam button{min-height:56px;border:0;border-radius:12px;color:#fff;font-weight:700;font-size:1rem;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#000 0%,#1c1c1c 50%,#3d3d3d 100%);box-shadow:inset 0 -3px 0 #c8102e}
        .ve-drop-cam button:active{filter:brightness(1.4)}
        .xs-type{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:10px}
        .xs-type-h{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f9fafb}
        .xs-type-h .btn{min-height:32px;padding:0 8px}
        .xs-chip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;padding:5px 8px 5px 12px;font-size:.88rem;font-weight:600}
        .xs-chip button{border:0;background:transparent;color:#166534;padding:0;line-height:1;display:inline-flex}
        .xs-adj{border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;padding:12px 14px;margin-bottom:14px}
        .xs-adj-main{display:flex;align-items:center;gap:12px}
        .xs-adj-ico{width:36px;height:36px;border-radius:10px;background:#fdf2f2;color:#8f0b0b;display:inline-flex;align-items:center;justify-content:center}
        .xs-draft{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:12px;border:1.5px dashed #d8dde3;border-radius:14px;background:#fafbfc;margin-bottom:10px}
        .xs-draft-n{width:28px;height:28px;border-radius:50%;background:#8f0b0b;color:#fff;font-weight:700;display:inline-flex;align-items:center;justify-content:center;align-self:center}
        .xs-ph{width:72px;height:72px;border-radius:12px;border:2px dashed #c4c9d0;display:flex;align-items:center;justify-content:center}
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
        .ts-total { margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; background: #111; color: #fff; border-radius: 10px; padding: 6px 14px; font-weight: 700; box-shadow: inset 4px 0 0 #c8102e; }
        .xs-live{position:sticky;top:-1rem;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:14px;background:#111;color:#fff;border-radius:12px;padding:8px 14px;margin:-4px 0 12px;box-shadow:inset 4px 0 0 #c8102e,0 6px 16px -8px rgba(0,0,0,.5);font-size:.9rem}
        .xs-live-dot{width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.7);animation:xsPulse 1.6s infinite}
        @keyframes xsPulse{70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
        .xs-live-total b{font-size:1.1rem;color:#fbbf24}
        .xs-send{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 14px;border:1.5px solid #f3d0d0;background:#fff7f7;border-radius:14px;margin-bottom:14px}
        .xs-selchip{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border:1.5px solid #d6d9de;border-radius:12px;background:#fff;color:#374151;transition:all .15s}
        .xs-selchip:hover{border-color:#9ca3af}
        .xs-selchip.on{border-color:#16a34a;background:#f0fdf4;color:#14532d}
        .xs-selbox{width:22px;height:22px;border-radius:7px;border:1.5px solid #c4c8cf;display:grid;place-items:center;flex:none;color:transparent;background:#fff}
        .xs-selchip.on .xs-selbox{background:#16a34a;border-color:#16a34a;color:#fff}
        .xs-selt{display:block;font-size:.72rem;color:#6b7280;font-weight:600}
        .xs-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:10px}
        .xs-sum b{font-size:1rem}
        .xs-lbl{display:block;font-size:.75rem;font-weight:600;color:#6b7280;margin-bottom:4px;letter-spacing:.03em}
        .xs-table th{font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}
        .xs-table tfoot th{font-size:.95rem;color:#111;text-transform:none;border-top:2px solid #e5e7eb;border-bottom:0}
        .xs-row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
        .xs-card .form-control,.xs-card .form-select{min-height:48px;border-radius:12px;border:1.5px solid #e2e6ea;background:#f9fafb;padding:10px 14px;font-size:.95rem;transition:all .15s}
        .xs-card textarea.form-control{min-height:96px;line-height:1.5}
        .xs-card .form-control:hover{border-color:#cbd2d9;background:#fff}
        .xs-card .form-control:focus{border-color:#8f0b0b;background:#fff;box-shadow:0 0 0 .22rem rgba(143,11,11,.12)}
        .xs-card .btn{border-radius:10px;min-height:40px;padding:0 14px;display:inline-flex;align-items:center;gap:6px}
        .xs-letter{width:22px;color:#6b7280;text-align:center}
        .xs-results{border:1px solid #e5e7eb;border-radius:8px;margin-top:6px;max-height:240px;overflow:auto;background:#fff}
        .xs-result{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #f1f5f9;color:inherit;padding:8px 10px}
        .xs-result:hover{background:#f9fafb}
        .xs-total{display:flex;justify-content:space-between;padding:12px 16px;border-radius:12px;background:#f3f4f6;margin-top:10px}
        .modal-backdrop.xs-blur{background:rgba(15,15,20,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
        .modal-backdrop.xs-blur.show{opacity:1}
        .xs-muted{opacity:.4;filter:grayscale(.7);pointer-events:none;user-select:none}
        .xs-big{background:#8f0b0b;color:#fff;font-weight:700;font-size:1.05rem}
        .xs-choice{border:1.5px solid #e2e6ea;background:#f9fafb;color:#374151;border-radius:12px;padding:12px 18px;display:inline-flex;gap:6px;align-items:center}
        .xs-choice.on{border-color:#8f0b0b;background:#fdf2f2;color:#8f0b0b;font-weight:600}
        .xs-tick{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px}
        .xs-tick.on{border-color:#16a34a;background:#f0fdf4}
      
      `}</style>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 d-flex align-items-center gap-2">
          <Icon icon="mdi:playlist-plus" width="20" height="20" /> Extra Job Scope
          {job && <span className="text-secondary fw-normal">· {job.jobNo} · {job.regNo} · {job.customerName}</span>}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {(isLoading || (data && !scope && data.canAdd)) && <div className="text-center p-4"><Spinner /></div>}
        {isError && <div className="text-danger">Could not load the Extra Job Scope.</div>}
        {data && !scope && !data.canAdd && <div className="text-secondary text-center p-4">Extra Job Scope can be added only after the job is activated.</div>}
        {data && scope && <ScopeEditor key={scope.id} job={job} scope={scope} onBack={onHide} />}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

function ScopeEditor({ job, scope, onBack }) {
  const [save] = useSaveExtraScopeMutation();
  const [sendSmsApi] = useSendExtraScopeSmsMutation();
  const [complete, { isLoading: completing }] = useCompleteExtraScopeMutation();
  const readOnly = scope.status !== "OPEN";
  const setStep = (k) => { document.getElementById(`xs-${k}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const [f, setF] = useState(() => ({ ...scope.data, markupPercent: scope.data.markupPercent ?? null, repairParents: scope.data.repairParents || [], estHours: scope.data.estHours ?? "", estDays: scope.data.estDays ?? "" }));
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const pct = Number(f.markupPercent ?? job.markupPercent) || 0;   // price adjustment: the one chosen in the Vehicle Job Inspection unless changed here
  const A = (u) => adjU(pct, u);                                   // customer unit price
  const [viewDoc, setViewDoc] = useState(false);              // estimate preview window
  const [showAdj, setShowAdj] = useState(false);              // "Show price breakdown"
  // The estimate (sent to the customer to get the confirmation) always shows the full price, even when the customer did not approve.
  // The approved total (what the customer agreed) is shown in Customer confirmation.
  // what goes into the estimate sent to the customer: all selected by default, each can be removed
  const { data: companyData } = useGetCompanyProfileQuery();   // Settings > Company profile (name + logo on the documents)
  const company = { ...DEFAULT_COMPANY, ...(companyData?.company || {}) };
  const { data: termsData } = useGetTermsQuery();   // Settings > Terms & conditions (printed on the estimate)
  const [replied, setReplied] = useState(null);   // "Did you receive the customer's confirmation?" (null = Yes when a decision already exists)
  const [viewKind, setViewKind] = useState("est");
  const [confirmOpen, setConfirmOpen] = useState(false);   // "Are you fully aware of the extra job details?"
  const [sendSel, setSendSel] = useState({ labour: true, parts: true, time: true });
  const estF = useMemo(() => ({ ...f, decision: f.decision === "REJECTED" ? null : f.decision, incLabour: sendSel.labour, incParts: sendSel.parts }), [f, sendSel]);
  const tAll = useMemo(() => calcTotals({ ...estF, incLabour: true, incParts: true }, Number(f.markupPercent ?? job.markupPercent) || 0), [estF, f.markupPercent, job.markupPercent]);
  const t = useMemo(() => calcTotals(estF, Number(f.markupPercent ?? job.markupPercent) || 0), [estF, job.markupPercent]);
  const ap = useMemo(() => calcTotals(f, Number(f.markupPercent ?? job.markupPercent) || 0), [f, job.markupPercent]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const blankDraft = () => ({ key: nid("d"), description: "", photoUrl: "", qty: 1 });
  const [drafts, setDrafts] = useState(() => [blankDraft()]);     // several items can be filled in and requested together
  const camRef = useRef(null), galRef = useRef(null), pickIdx = useRef(null);
  const patchDraft = (key, p) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const [manual, setManual] = useState({ name: "", brand: "", quality: "", qty: 1, unitPrice: "" });
  const [showManual, setShowManual] = useState(false);
  const { data: scopesData, refetch: refetchScopes } = useGetExtraScopesQuery(job.id);
  const brands = scopesData?.options?.brands || [], qualities = scopesData?.options?.qualities || [];
  const [addOption] = useAddSpareOptionMutation();
  const newOption = async (kind) => {
    const r = await Swal.fire({ title: kind === "BRAND" ? "Add a brand" : "Add a quality", input: "text", inputPlaceholder: kind === "BRAND" ? "e.g. Korea" : "e.g. Used", showCancelButton: true, confirmButtonText: "Add", inputValidator: (v) => (!v?.trim() ? "Enter a name" : undefined) });
    if (r.isConfirmed) try { await addOption({ kind, name: r.value.trim() }).unwrap(); refetchScopes(); } catch (ex) { fail(ex, "Could not add the option."); }
  };

  // auto-save: 1.5 s after the last change
  const [auto, setAuto] = useState("saved");
  const snap = useRef(JSON.stringify(f));
  useEffect(() => {
    if (readOnly) return;
    const key = JSON.stringify(f);
    if (key === snap.current) return;
    setAuto("pending");
    const h = setTimeout(async () => {
      setAuto("saving");
      try { await save({ jobId: job.id, scopeId: scope.id, ...f }).unwrap(); snap.current = key; setAuto("saved"); } catch (_) { setAuto("failed"); }
    }, 1500);
    return () => clearTimeout(h);
  }, [f, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const flush = async () => { await save({ jobId: job.id, scopeId: scope.id, ...f }).unwrap(); snap.current = JSON.stringify(f); setAuto("saved"); };

  // photos / videos (Update Evidence slot 2) and the item photo of a third party quotation
  const upload = async (file) => {
    if (file.size > 25 * 1024 * 1024) { Swal.fire({ title: "File too large", text: `${file.name} is over 25 MB.`, icon: "warning" }); return null; }
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
    const up = await res.json().catch(() => ({}));
    if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
    return URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl;
  };
  // item photo: the camera (tablets / phones) or the gallery
  const [photoBusy, setPhotoBusy] = useState(null);   // key of the draft whose photo is uploading
  const pickPhoto = (key, kind) => { pickIdx.current = key; (kind === "camera" ? camRef : galRef).current?.click(); };
  const onPhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    const key = pickIdx.current;
    if (!file || !key) return;
    if (!file.type.startsWith("image/")) return Swal.fire({ title: "Only photos can be added here", icon: "info" });
    setPhotoBusy(key);
    try { const url = await upload(file); if (url) patchDraft(key, { photoUrl: url }); } catch (ex) { fail(ex, "Upload failed"); } finally { setPhotoBusy(null); }
  };

  const addCatalog = (p) => set({ parts: [...f.parts, { id: nid("p"), partId: p.id, name: p.name, brand: p.brand || "", quality: p.quality || "", qty: 1, unitPrice: p.price, source: "CATALOG", stock: p.stockQty > 0 ? "IN_STOCK" : "OUT_OF_STOCK" }] });
  const addManual = () => {
    if (!manual.name.trim()) return Swal.fire({ title: "Enter the spare part name", icon: "info" });
    const qty = Math.max(1, parseInt(manual.qty, 10) || 1);
    set({ parts: [...f.parts, { id: nid("p"), partId: null, name: manual.name.trim(), brand: manual.brand, quality: manual.quality || qualities[0] || "", qty, unitPrice: Number(manual.unitPrice || 0), source: "MANUAL", stock: "UNKNOWN" }] });
    setManual({ name: "", brand: "", quality: "", qty: 1, unitPrice: "" });
  };
  const addQuote = () => {
    const filled = drafts.filter((d) => d.description.trim() || d.photoUrl);
    if (!filled.length) return Swal.fire({ title: "Add a description of the item", icon: "info" });
    if (filled.some((d) => !d.description.trim())) return Swal.fire({ title: "Add a description for every item", text: "Each item with a photo needs a description.", icon: "info" });
    set({ quotes: [...f.quotes, ...filled.map((d) => ({ id: nid("q"), description: d.description.trim(), photoUrl: d.photoUrl, qty: Math.max(1, parseInt(d.qty, 10) || 1), price: 0 }))] });
    setDrafts([blankDraft()]);
  };
  const upd = (key, id, p) => set({ [key]: f[key].map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const del = (key, id) => set({ [key]: f[key].filter((x) => x.id !== id), agreedScope: f.agreedScope.filter((x) => x !== id), clientParts: f.clientParts.filter((x) => x !== id) });
  // Select type of repair (all departments): the ticked child types become labour lines
  const { data: tree = [] } = useGetExtraRepairTreeQuery(job.id);
  const [openGroups, setOpenGroups] = useState({});
  const [addDept, setAddDept] = useState("");
  const isOn = (c) => f.labour.some((l) => l.childId === c.id);
  const toggleChild = (g, c) => {
    const have = f.labour.find((l) => l.childId === c.id);
    if (have) return del("labour", have.id);
    set({ labour: [...f.labour, { id: `c${c.id}`, childId: c.id, label: c.label, description: c.label, qty: 1, amount: c.price ?? 0 }] });
  };
  const dropParent = (g) => {
    const ids = g.children.map((c) => c.id);
    const gone = f.labour.filter((l) => ids.includes(l.childId)).map((l) => l.id);
    set({ repairParents: f.repairParents.filter((x) => !(x.parent === g.parent && x.department === g.department)), labour: f.labour.filter((l) => !gone.includes(l.id)), agreedScope: f.agreedScope.filter((x) => !gone.includes(x)) });
  };
  const addable = tree.filter((g) => !f.repairParents.some((x) => x.parent === g.parent && x.department === g.department))
    .reduce((m, g) => { const k = g.department || "Other"; (m[k] = m[k] || { current: Boolean(g.isCurrent), list: [] }).list.push(g); return m; }, {});
  const depts = Object.entries(addable).sort((a, b) => Number(b[1].current) - Number(a[1].current));
  const deptName = addDept && addable[addDept] ? addDept : depts[0]?.[0];
  const tickIn = (key, id) => set({ [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] });

  // ---- estimate document ----
  const itemsOf = (F, sel) => {
    const agreed = (x) => F.decision !== "REJECTED" && (F.decision !== "PARTIAL" || F.agreedScope.includes(x.id));
    const agreedPart = () => F.decision !== "REJECTED";
    const own = (x) => F.partsBy === "CLIENT" && F.clientParts.includes(x.id);
    return {
      labour: sel.labour ? F.labour.filter(agreed) : [],
      parts: sel.parts ? F.parts.filter((x) => agreedPart() && !own(x)) : [],
      quotes: sel.parts ? F.quotes.filter(agreedPart) : [],
      ownParts: sel.parts ? F.parts.filter((x) => agreedPart() && own(x)) : [],
    };
  };
  const itemsEst = useMemo(() => itemsOf(estF, sendSel), [f, estF, sendSel]);
  const tEst = t;
  // "approved" = the estimate of what the customer confirmed (Customer confirmation section); otherwise the estimate sent to get the confirmation
  const buildHtml = (approved = false) => {
    const t = approved ? ap : tEst;
    const items = approved ? itemsOf(f, { labour: true, parts: true, time: true }) : itemsEst;
    const showTime = approved ? true : sendSel.time;
    const logo = company.logoUrl || `${window.location.origin}/images/mainlogo.jpeg`;
    const R = 'style="text-align:right"';
    const rows = (list, fn) => list.map(fn).join("");
    const css = `@page{size:A4;margin:14mm}:root{--brand:#8f0b0b;--gold:#a8864f;--ink:#1c1917;--muted:#78716c;--line:#e7e2dc}*{box-sizing:border-box}body{font-family:"Segoe UI",Helvetica,Arial,sans-serif;color:var(--ink);margin:0;font-size:12.5px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:794px;margin:0 auto;padding:24px 28px}.top{display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:3px solid var(--brand)}.top img{height:56px}.brandname{font-size:19px;font-weight:800;letter-spacing:.1em;color:var(--brand)}.t{font-size:22px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--brand);text-align:right}h2{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:20px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:var(--brand);color:#fff;text-align:left;padding:7px 9px;font-size:10.5px;text-transform:uppercase}td{padding:7px 9px;border-bottom:1px solid var(--line)}.sum{margin:18px 0 0 auto;width:320px;border:1px solid var(--line)}.sum div{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--line)}.sum .g{background:var(--brand);color:#fff;font-weight:700;font-size:14px}.note{color:var(--muted);margin:6px 0}.foot{margin-top:26px;padding-top:8px;border-top:2px solid var(--gold);text-align:center;color:var(--muted);font-size:10.5px}`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Extra Job Scope ${esc(job.jobNo)}</title><style>${css}</style></head><body><div class="page">
<div class="top"><div style="display:flex;align-items:center;gap:12px"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div class="brandname">${esc(company.name)}</div></div><div class="t">${approved ? "Approved Estimate" : "Extra Estimate"}</div></div>
<p class="note">Job <b>${esc(job.jobNo)}</b> · Vehicle <b>${esc(job.regNo)}</b> · Customer <b>${esc(job.customerName)}</b> · Extra Job Scope #${scope.seq} · ${new Date().toLocaleDateString()}</p>
${showTime ? `<p class="note">Estimated time of repair: <b>${esc(timeText(f) || "-")}</b></p>` : ""}
${f.rootCauses.length ? `<p class="note"><b>Findings:</b> ${f.rootCauses.map(esc).join("; ")}</p>` : ""}
${items.ownParts.length ? `<p class="note"><b>Spare parts provided by the customer (not charged):</b> ${items.ownParts.map((p) => `${esc(p.name)} × ${p.qty}`).join("; ")}</p>` : ""}
${items.parts.length || items.quotes.length ? `<h2>Spare parts</h2><table><thead><tr><th>Item</th><th>Brand</th><th ${R}>Qty</th><th ${R}>Unit price</th><th ${R}>Total</th></tr></thead><tbody>${rows(items.parts, (p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.brand || "-")}</td><td ${R}>${p.qty}</td><td ${R}>${money(A(p.unitPrice))}</td><td ${R}><b>${money(p.qty * A(p.unitPrice))}</b></td></tr>`)}${rows(items.quotes, (q) => `<tr><td><b>${esc(q.description)}</b> (third party)</td><td>-</td><td ${R}>${q.qty || 1}</td><td ${R}>${money(A(q.price))}</td><td ${R}><b>${money((q.qty || 1) * A(q.price))}</b></td></tr>`)}</tbody></table>` : ""}
${items.labour.length ? `<h2>Labour</h2><table><thead><tr><th>Work</th><th ${R}>Qty</th><th ${R}>Unit price</th><th ${R}>Amount</th></tr></thead><tbody>${rows(items.labour, (l) => `<tr><td>${esc(childOf(l.description))}</td><td ${R}>${l.qty || 1}</td><td ${R}>${money(A(l.amount))}</td><td ${R}><b>${money((l.qty || 1) * A(l.amount))}</b></td></tr>`)}</tbody></table>` : ""}
<div class="sum"><div><span>Spare parts</span><b>${money(t.spare)}</b></div><div><span>Labour</span><b>${money(t.labour)}</b></div><div class="g"><span>${approved ? "Approved total" : "Estimated total"}</span><span>${money(t.total)}</span></div></div>
${termsHtml(termsData?.terms?.estimate)}
<div class="foot">${esc(company.name)} · Thank you for choosing us</div></div></body></html>`;
  };
  const canDoc = t.total > 0;
  const canAp = ap.total > 0;
  const gateYes = replied ?? Boolean(f.decision);
  const download = async (approved = false) => { setBusy(true); try { await savePdf(buildHtml(approved === true), `${approved === true ? "Approved" : "Extra"}-Estimate-${job.jobNo}-${scope.seq}`); } finally { setBusy(false); } };
  const print = (approved = false) => printHtml(buildHtml(approved === true));
  const askPhone = async () => {
    const r = await Swal.fire({
      title: `Send the estimate (${money(t.total)}) by SMS`, input: "tel", inputLabel: "Mobile number (07XXXXXXXX)", inputValue: job.contactNumber || "", inputPlaceholder: "07XXXXXXXX",
      showCancelButton: true, confirmButtonText: "Send SMS",
      inputValidator: (v) => (/^(?:\+?94|0)?7\d{8}$/.test(String(v).replace(/[\s-]/g, "")) ? undefined : "Enter a valid mobile number (07XXXXXXXX)"),
    });
    return r.isConfirmed ? String(r.value).replace(/[\s-]/g, "") : null;
  };
  const sendSms = async (approved = false) => {
    approved = approved === true;
    if (approved ? !canAp : !canDoc) return Swal.fire({ title: "Nothing to send", text: "The total is Rs. 0.00.", icon: "info" });
    const phone = await askPhone();
    if (phone === null) return;
    setBusy(true);
    try {
      await flush();
      const r = await sendSmsApi({ jobId: job.id, scopeId: scope.id, phone, approved, includeLabour: sendSel.labour, includeParts: sendSel.parts, includeTime: sendSel.time }).unwrap();
      if (r.sms?.sent) { if (!approved) { set({ sentVia: "SMS" }); snap.current = JSON.stringify({ ...f, sentVia: "SMS" }); } Swal.fire({ title: "SMS sent", text: r.sms.to ? `Sent to ${r.sms.to}` : "", icon: "success", timer: 1800, showConfirmButton: false }); }
      else Swal.fire({ title: "SMS not sent", text: r.sms?.error || "Could not send the SMS.", icon: "error" });
    } catch (ex) { fail(ex, "Could not send the SMS."); } finally { setBusy(false); }
  };

  const finish = async () => {
    const stop = (msg, to) => { setStep(to); return Swal.fire({ title: "Not complete yet", text: msg, icon: "info" }); };
    if (!f.labour.length && !f.parts.length && !f.quotes.length) return stop("Add the extra work (labour) or the spare parts first.", "findings");
    if (!Number(f.estHours) && !Number(f.estDays)) return stop("Enter the estimated time of repair.", "estimate");
    if (!f.decision) return stop("Select the customer confirmation.", "approval");
    if (f.decision === "PARTIAL" && f.labour.length > 0 && !f.agreedScope.length) return stop("Tick the repair items the customer agreed.", "approval");
    if (f.decision !== "REJECTED" && f.parts.length + f.quotes.length > 0 && !f.partsBy) return stop("Select who provides the spare parts.", "approval");
    if (f.decision !== "REJECTED" && f.partsBy === "CLIENT" && !f.clientParts.length) return stop("Tick the spare parts the customer brings.", "approval");
    setConfirmOpen(true);
  };
  const confirmStart = async () => {
    try { await flush(); await complete({ jobId: job.id, scopeId: scope.id }).unwrap(); setConfirmOpen(false); onBack(); } catch (ex) { setConfirmOpen(false); fail(ex, "Could not complete it."); }
  };

  const dis = readOnly;
  const labourTotal = f.labour.reduce((s, x) => s + (x.qty || 1) * A(x.amount), 0);
  const partsTotal = f.parts.reduce((s, x) => s + x.qty * A(x.unitPrice), 0) + f.quotes.reduce((s, x) => s + (x.qty || 1) * A(x.price), 0);
  const everyItem = [
    ...f.labour.map((x) => ({ id: x.id, label: `${childOf(x.description)}${(x.qty || 1) > 1 ? ` × ${x.qty}` : ""}`, sub: "Labour", amount: (x.qty || 1) * A(x.amount) })),
    ...f.parts.map((x) => ({ id: x.id, label: `${x.name}${x.brand ? ` (${x.brand})` : ""} × ${x.qty}`, sub: "Spare part", amount: x.qty * A(x.unitPrice) })),
    ...f.quotes.map((x) => ({ id: x.id, label: `${x.description}${(x.qty || 1) > 1 ? ` × ${x.qty}` : ""}`, sub: "Third party item", amount: (x.qty || 1) * A(x.price) })),
  ];

  return (
    <div>
      {confirmOpen && (
        <Modal show onHide={() => !completing && setConfirmOpen(false)} centered backdrop="static" backdropClassName="xs-blur">
          <Modal.Header closeButton={!completing}><Modal.Title className="fs-6"><Icon icon="mdi:briefcase-clock-outline" /> Job Reactivation</Modal.Title></Modal.Header>
          <Modal.Body className="text-center py-4">
            <Icon icon="mdi:clipboard-text-search-outline" width="46" height="46" style={{ color: "#8f0b0b" }} />
            <h5 className="mt-3 mb-2">Are you fully aware of the extra job details?</h5>
            <div className="text-secondary">Approved total: <b>{money(ap.total)}</b></div>
            <div className="small text-muted mt-3">Pressing Yes will reactivate the job for all related departments.</div>
          </Modal.Body>
          <Modal.Footer className="justify-content-center">
            <Button variant="outline-secondary" disabled={completing} onClick={() => setConfirmOpen(false)}>No</Button>
            <Button variant="success" disabled={completing} onClick={confirmStart}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" />} Yes, OFFICIALLY JOB STARTS</Button>
          </Modal.Footer>
        </Modal>
      )}
      {viewDoc && (
        <Modal show onHide={() => setViewDoc(false)} size="xl" centered scrollable backdropClassName="xs-blur">
          <Modal.Header closeButton><Modal.Title className="fs-6"><Icon icon="mdi:file-document-outline" /> {viewKind === "ap" ? "Approved Estimate" : "Extra Job Estimate"}</Modal.Title></Modal.Header>
          <Modal.Body className="p-0" style={{ height: "75vh" }}>
            <iframe title="Estimate" srcDoc={buildHtml(viewKind === "ap")} style={{ width: "100%", height: "100%", border: 0, background: "#fff" }} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => download(viewKind === "ap")} disabled={busy}><Icon icon="mdi:download" /> Download (PDF)</Button>
            <Button variant="outline-secondary" onClick={() => print(viewKind === "ap")}><Icon icon="mdi:printer-outline" /> Print</Button>
            {!dis && <Button variant="primary" onClick={() => { setViewDoc(false); sendSms(viewKind === "ap"); }} disabled={busy}><Icon icon="mdi:message-text-outline" /> Send via SMS</Button>}
          </Modal.Footer>
        </Modal>
      )}
      <div className="xs-live" title="Updates live">
        <span className="xs-live-dot" /> <b>LIVE</b>
        <span className="ms-2">Spare parts <b>{money(t.spare)}</b></span>
        <span>Labour <b>{money(t.labour)}</b></span>
        <span className="ms-auto xs-live-total">Extra Job Estimate <b>{money(t.total)}</b></span>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div><b>Extra Job Scope</b> <Badge bg={STATUS[scope.status]?.[0]}>{STATUS[scope.status]?.[1]}</Badge></div>
        <div className="small text-secondary">{readOnly ? "Completed" : auto === "saving" ? "Saving..." : auto === "pending" ? "Changes not saved yet" : auto === "failed" ? <span className="text-danger">Auto-save failed</span> : "All changes saved"}</div>
      </div>

      {(
        <>
          <Section id="findings" title="Root causes (new findings)" icon="mdi:magnify-scan" hint="What was found that needs extra work.">
            <AutoText value={f.rootCauses[0] || ""} disabled={dis} placeholder="Describe what was found that needs extra work..." onChange={(e) => set({ rootCauses: [e.target.value] })} />
          </Section>
          <Section title="Update evidence (photos / videos)" icon="mdi:camera-outline" hint="Upload photos or videos of the new findings.">
            <EvidenceUpload job={job} files={f.files} disabled={dis} onAdd={(x) => setF((v) => ({ ...v, files: [...v.files, x] }))} onRemove={(id) => del("files", id)} />
          </Section>
          <Section title="Select type of repair" icon="mdi:wrench-cog-outline" hint="Pick the department, add its repair type, then tick the child types that apply. Each one is added to the labour list with its price.">
            <div className="xs-adj">
              <div className="xs-adj-main">
                <span className="xs-adj-ico"><Icon icon="mdi:percent" width="20" height="20" /></span>
                <div style={{ flex: 1 }}>
                  <div className="fw-semibold">Price adjustment</div>
                  <div className="small text-muted">Added to the price of every spare part and repair item</div>
                </div>
                <FormSelect aria-label="Price adjustment" style={{ maxWidth: 140 }} value={pct} disabled={dis} onChange={(e) => set({ markupPercent: Number(e.target.value) })}>
                  <option value={0}>None</option>
                  {[2, 5, 8, 10, 12].map((x) => <option key={x} value={x}>+ {x}%</option>)}
                </FormSelect>
              </div>
              <div className={`mt-2 ${pct === 0 ? "opacity-50" : ""}`}>
                <Form.Check type="switch" id="xs-showadj" label="Show price breakdown" checked={showAdj && pct > 0} disabled={pct === 0} onChange={(e) => setShowAdj(e.target.checked)} />
                <div className="small text-muted">{pct === 0 ? "Choose a percentage first." : "Shows the actual price and the increase under each price."}</div>
              </div>
            </div>
            {f.repairParents.map((rp) => {
              const g = tree.find((x) => x.parent === rp.parent && x.department === rp.department);
              if (!g) return null;
              const key = `${g.department}|${g.parent}`;
              const ticked = g.children.filter((c) => isOn(c));
              const showAll = Boolean(openGroups[key]) || (ticked.length === 0 && g.children.length > 0 && !dis);
              return (
                <div key={key} className="xs-type">
                  <div className="xs-type-h">
                    <Icon icon="mdi:check-circle" width="20" height="20" className="text-success" />
                    <b>{g.parent}</b>
                    <Badge bg="light" text="dark" className="border fw-normal ms-auto">{g.department}</Badge>
                    {!dis && <Button size="sm" variant="outline-danger" onClick={() => dropParent(g)} aria-label="Remove this repair type"><Icon icon="mdi:close" /></Button>}
                  </div>
                  <div className="p-3">
                    {g.children.length === 0 && <div className="small text-secondary">No child types are set for this type.</div>}
                    {g.children.length > 0 && !showAll && (
                      <div className="d-flex flex-wrap gap-2">
                        {ticked.map((c) => (
                          <span key={c.id} className="xs-chip"><Icon icon="mdi:check-circle" width="16" height="16" />{c.name}{c.price != null && <span className="fw-normal">{money(c.price)}</span>}
                            {!dis && <button type="button" aria-label={`Remove ${c.name}`} onClick={() => toggleChild(g, c)}><Icon icon="mdi:close-circle" width="18" height="18" /></button>}
                          </span>
                        ))}
                      </div>
                    )}
                    {g.children.length > 0 && showAll && (
                      <Row className="g-2">
                        {g.children.map((c) => (
                          <Col key={c.id} md={6}>
                            <label className={`xs-tick ${isOn(c) ? "on" : ""}`} style={{ marginBottom: 0 }}>
                              <Form.Check type="checkbox" disabled={dis} checked={isOn(c)} onChange={() => toggleChild(g, c)} />
                              <span style={{ flex: 1 }}>{c.name}</span>{c.price != null && <b>{money(c.price)}</b>}
                            </label>
                          </Col>
                        ))}
                      </Row>
                    )}
                    {g.children.length > 0 && !dis && ticked.length > 0 && (
                      <button type="button" className="btn btn-link p-0 mt-2 text-decoration-none fw-semibold" style={{ minHeight: 0 }} onClick={() => setOpenGroups((o) => ({ ...o, [key]: !o[key] }))}>
                        <Icon icon={showAll ? "mdi:chevron-up" : "mdi:plus-circle-outline"} width="16" height="16" /> {showAll ? "Done" : `Add or change (${g.children.length - ticked.length} more)`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!dis && depts.length > 0 && (
              <div className="row g-2 mt-1">
                <div className="col-12 col-md-5">
                  <FormSelect aria-label="Department" value={deptName} onChange={(e) => setAddDept(e.target.value)}>
                    {depts.map(([d, v]) => <option key={d} value={d}>{v.current ? `${d} (this department)` : d}</option>)}
                  </FormSelect>
                </div>
                <div className="col-12 col-md-7">
                  <FormSelect aria-label="Add a repair type" value="" onChange={(e) => e.target.value && set({ repairParents: [...f.repairParents, { parent: e.target.value, department: deptName }] })}>
                    <option value="">+ Add a {deptName} repair type...</option>
                    {addable[deptName].list.map((g) => <option key={g.parent} value={g.parent}>{g.parent}</option>)}
                  </FormSelect>
                </div>
              </div>
            )}
            {(
              <div className="mt-3">
                <div className="xs-hint mb-1">Repair list</div>
                <div className="table-responsive">
                  <table className="table align-middle mb-0 xs-table">
                    <thead><tr><th>#</th><th>Repair item</th><th>Type</th><th className="text-end" style={{ width: 90 }}>Qty</th><th className="text-end">Unit price</th><th className="text-end">Amount</th><th /></tr></thead>
                    <tbody>
                      {f.labour.length === 0 && <tr><td colSpan={7} className="text-secondary small">No repair items yet. Tick the child types above.</td></tr>}
                      {f.labour.map((l, n) => (
                        <tr key={l.id}>
                          <td>{n + 1}</td>
                          <td className="fw-semibold">{childOf(l.description)}</td>
                          <td className="text-secondary small">{l.description}</td>
                          <td className="text-end"><FormControl type="number" min="1" style={{ minHeight: 36, padding: "4px 8px", textAlign: "right" }} value={l.qty || 1} disabled={dis} onChange={(e) => upd("labour", l.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} /></td>
                          <td className="text-end text-nowrap">
                            <div className="fw-semibold">{money(A(l.amount))}</div>
                            {pct > 0 && showAdj && (<><div className="small text-muted">Actual: {money(l.amount)}</div><div className="small text-success">+{money(A(l.amount) - Number(l.amount || 0))} ({pct}%)</div></>)}
                          </td>
                          <td className="text-end text-nowrap"><b>{money((l.qty || 1) * A(l.amount))}</b>{pct > 0 && showAdj && <div className="small text-success">+{money((l.qty || 1) * (A(l.amount) - Number(l.amount || 0)))} increase</div>}</td>
                          <td className="text-end">{!dis && <Button size="sm" variant="outline-danger" onClick={() => del("labour", l.id)} aria-label="Remove"><Icon icon="mdi:close" /></Button>}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><th colSpan={5}>Total</th><th className="text-end text-nowrap">{money(labourTotal)}</th><th /></tr></tfoot>
                  </table>
                </div>
              </div>
            )}
          </Section>
        </>
      )}

      {(
        <>
          <Section id="parts" title="Spare Parts Requirement" icon="mdi:cog-transfer-outline" hint="Search the item master and click a part to add it. If the stock is not available, update the price manually.">
            {pct > 0 && (
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="small text-muted">Price adjustment +{pct}% is added to every unit price.</div>
                <Form.Check type="switch" id="xs-showadj2" label="Show price breakdown" checked={showAdj} onChange={(e) => setShowAdj(e.target.checked)} />
              </div>
            )}
            {!dis && (
              <div className="rounded-3 p-3 mb-3" style={{ background: "#f4f5f7", border: "1px solid #e5e7eb" }}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon="mdi:plus-circle-outline" width="20" height="20" /> Add item</div>
                  <Button size="sm" variant={showManual ? "secondary" : "outline-secondary"} onClick={() => setShowManual((v) => !v)}>
                    <Icon icon={showManual ? "mdi:close" : "mdi:pencil-plus-outline"} width="16" height="16" /> {showManual ? "Hide manual form" : "Add item manually"}
                  </Button>
                </div>
                <PartSearch onAdd={addCatalog} />
                <div className="small text-muted">Search the item master and click an item to add it. Can&apos;t find it? Use &apos;Add item manually&apos;.</div>
              </div>
            )}
            <div className="table-responsive">
              <Table size="sm" className="align-middle mb-2 xs-table">
                <thead><tr><th /><th>Spare part</th><th style={{ width: 130 }}>Brand</th><th>Quality</th><th style={{ width: 90 }}>Qty</th><th className="text-end" style={{ width: 150 }}>Price (Rs.)</th><th className="text-end">Total</th><th /></tr></thead>
                <tbody>
                  {f.parts.length === 0 && <tr><td colSpan={8} className="small text-muted">No spare parts yet.</td></tr>}
                  {f.parts.map((p, n) => (
                    <tr key={p.id} className={p.stock === "OUT_OF_STOCK" ? "table-warning" : ""}>
                      <td className="text-muted">{letter(n)}.</td>
                      <td>{p.name}
                        <div>
                          <Badge bg={p.stock === "IN_STOCK" ? "success" : p.stock === "OUT_OF_STOCK" ? "danger" : "secondary"}>{p.stock === "IN_STOCK" ? "In stock" : p.stock === "OUT_OF_STOCK" ? "Out of stock" : "Not checked"}</Badge>{" "}
                          {p.source === "MANUAL" && <Badge bg="warning" text="dark">Manual price</Badge>}
                        </div>
                        {p.stock === "OUT_OF_STOCK" && <div className="small text-danger">Stock not available · update the price manually</div>}
                      </td>
                      <td className="small">{p.brand || "-"}</td>
                      <td className="small">{p.quality || "-"}</td>
                      <td><FormControl type="number" min="1" style={{ minHeight: 36, padding: "4px 8px" }} disabled={dis} value={p.qty} onChange={(e) => upd("parts", p.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} /></td>
                      <td className="text-end text-nowrap">
                        <div className="fw-semibold">{money(A(p.unitPrice))}</div>
                        {pct > 0 && showAdj && (<><div className="small text-muted">Actual: {money(p.unitPrice)}</div><div className="small text-success">+{money(A(p.unitPrice) - Number(p.unitPrice || 0))} ({pct}%)</div></>)}
                      </td>
                      <td className="text-end text-nowrap"><b>{money(p.qty * A(p.unitPrice))}</b>{pct > 0 && showAdj && <div className="small text-success">+{money(p.qty * (A(p.unitPrice) - Number(p.unitPrice || 0)))} increase</div>}</td>
                      <td>{!dis && <Button size="sm" variant="outline-danger" onClick={() => del("parts", p.id)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
                {f.parts.length > 0 && <tfoot><tr><th colSpan={6} className="text-end">Total</th><th className="text-end text-nowrap">{money(f.parts.reduce((x, p) => x + p.qty * A(p.unitPrice), 0))}</th><th /></tr></tfoot>}
              </Table>
            </div>
            {!dis && showManual && (
              <div className="border rounded p-3 bg-light">
                <div className="small fw-semibold mb-2">Add / update manually</div>
                <div className="row g-2">
                  <div className="col-12 col-md-4"><FormControl autoComplete="off" placeholder="Spare part name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} /></div>
                  <div className="col-6 col-md-2 d-flex gap-1"><FormSelect value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })}><option value="">Brand</option>{brands.map((b) => <option key={b}>{b}</option>)}</FormSelect><Button variant="outline-secondary" title="Add a brand" onClick={() => newOption("BRAND")}>+</Button></div>
                  <div className="col-6 col-md-2"><FormSelect value={manual.quality || qualities[0] || ""} onChange={(e) => setManual({ ...manual, quality: e.target.value })}>{qualities.map((b) => <option key={b}>{b}</option>)}</FormSelect></div>
                  <div className="col-3 col-md-1"><FormControl type="number" min="1" placeholder="Qty" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} /></div>
                  <div className="col-5 col-md-2"><FormControl type="number" min="0" step="0.01" placeholder="Price" value={manual.unitPrice} onChange={(e) => setManual({ ...manual, unitPrice: e.target.value })} /></div>
                  <div className="col-4 col-md-1 d-grid"><Button onClick={addManual}>Add</Button></div>
                </div>
              </div>
            )}
          </Section>
          <Section title="Request quotation from third parties" icon="mdi:storefront-outline" hint="Item photo + description + quantity, then press Request. The price is entered later, when the quotation comes back.">
            {f.quotes.map((q, i) => (
              <div className="xs-row" key={q.id} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                <span className="xs-letter">{letter(i)}.</span>
                <div style={{ flex: 1, minWidth: 180 }}>{q.photoUrl && <a href={q.photoUrl} target="_blank" rel="noreferrer" className="me-2 align-middle d-inline-block" title="Open the photo"><img src={q.photoUrl} alt="Item" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} /></a>}{q.description}
                  <div className="small">{Number(q.price) > 0 ? <Badge bg="success">Quoted</Badge> : <Badge bg="warning" text="dark">Waiting for quotation</Badge>}</div></div>
                <div style={{ width: 90 }}>
                  <label className="xs-lbl">Quantity</label>
                  <FormControl type="number" min="1" value={q.qty || 1} disabled={dis} onChange={(e) => upd("quotes", q.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                </div>
                <div style={{ width: 150 }}>
                  <label className="xs-lbl">Quoted price (Rs.)</label>
                  <FormControl type="number" min="0" step="0.01" placeholder="When received" value={q.price} disabled={dis} onChange={(e) => upd("quotes", q.id, { price: e.target.value })} />
                </div>
                {Number(q.price) > 0 && <div className="text-end" style={{ minWidth: 120 }}><label className="xs-lbl">Total{pct > 0 ? ` (+${pct}%)` : ""}</label><div className="fw-semibold">{money((q.qty || 1) * A(q.price))}</div></div>}
                {!dis && <Button size="sm" variant="outline-danger" onClick={() => del("quotes", q.id)}><Icon icon="mdi:close" /></Button>}
              </div>
            ))}
            {!dis && (
              <div className="mt-2">
                <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
                <input ref={galRef} type="file" accept="image/*" hidden onChange={onPhoto} />
                {drafts.map((d, i) => (
                  <div key={d.key} className="xs-draft">
                    <div className="xs-draft-n">{i + 1}</div>
                    <div>
                      <label className="xs-lbl">Item photo</label>
                      {photoBusy === d.key ? (
                        <div className="xs-ph"><Spinner size="sm" /></div>
                      ) : d.photoUrl ? (
                        <div className="position-relative d-inline-block">
                          <img src={d.photoUrl} alt="Item" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "2px solid #16a34a", display: "block" }} />
                          <button type="button" aria-label="Remove photo" onClick={() => patchDraft(d.key, { photoUrl: "" })} className="btn btn-sm btn-dark position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, minHeight: 0, transform: "translate(35%,-35%)", borderRadius: "50%" }}><Icon icon="mdi:close" width="14" height="14" /></button>
                        </div>
                      ) : (
                        <div className="d-flex gap-2">
                          <Button variant="dark" title="Take a photo with the camera" onClick={() => pickPhoto(d.key, "camera")}><Icon icon="mdi:camera" width="20" height="20" /> Camera</Button>
                          <Button variant="outline-secondary" title="Choose a photo from this device" onClick={() => pickPhoto(d.key, "gallery")}><Icon icon="mdi:image-outline" width="20" height="20" /> Gallery</Button>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label className="xs-lbl">Description</label>
                      <FormControl placeholder="Describe the item you need a quotation for" value={d.description} onChange={(e) => patchDraft(d.key, { description: e.target.value })} />
                    </div>
                    <div style={{ width: 100 }}>
                      <label className="xs-lbl">Quantity</label>
                      <FormControl type="number" min="1" value={d.qty} onChange={(e) => patchDraft(d.key, { qty: e.target.value })} />
                    </div>
                    {drafts.length > 1 && <Button variant="outline-danger" aria-label="Remove this item" onClick={() => setDrafts((x) => x.filter((y) => y.key !== d.key))}><Icon icon="mdi:close" /></Button>}
                  </div>
                ))}
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Button variant="outline-secondary" onClick={() => setDrafts((x) => [...x, blankDraft()])}><Icon icon="mdi:plus" /> Add another item</Button>
                  <Button variant="primary" onClick={addQuote}><Icon icon="mdi:send-outline" /> Request{drafts.filter((d) => d.description.trim()).length > 1 ? ` (${drafts.filter((d) => d.description.trim()).length} items)` : ""}</Button>
                </div>
              </div>
            )}
          </Section>
          <div className="xs-total"><span>Total spare parts value</span><b>{money(partsTotal)}</b></div>
        </>
      )}

      {(
        <>
          <Section id="estimate" title="Estimated Time of Repair" icon="mdi:timer-outline" hint="Including spare parts availability">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <TimeStepper label="Days" unit="Days" icon="mdi:calendar-clock-outline" step={1} quick={[1, 2, 3, 5, 7, 10]} disabled={dis} value={f.estDays} onChange={(v) => set({ estDays: v })} />
              </div>
              <div className="col-12 col-md-4">
                <TimeStepper label="Hours" unit="Hrs" icon="mdi:clock-outline" step={1} quick={[1, 2, 3, 4, 6, 8]} disabled={dis} value={splitHM(f.estHours)[0] || ""} onChange={(v) => set({ estHours: joinHM(Math.floor(Number(v) || 0), splitHM(f.estHours)[1]) })} />
              </div>
              <div className="col-12 col-md-4">
                <TimeStepper label="Minutes" unit="Min" icon="mdi:timer-outline" step={5} quick={[10, 15, 30, 45]} disabled={dis} value={splitHM(f.estHours)[1] || ""}
                  onChange={(v) => { let m = Math.floor(Number(v) || 0); let [h] = splitHM(f.estHours); if (m >= 60) { h += Math.floor(m / 60); m %= 60; } set({ estHours: joinHM(h, m) }); }} />
              </div>
            </div>
            {(Number(f.estHours) > 0 || Number(f.estDays) > 0) && (
              <div className="ts-total"><Icon icon="mdi:timer-sand" width="20" height="20" /> Estimated repair time: {timeText(f).replace(/ (?=\d+ (Hrs|Min))/g, " + ")}</div>
            )}
          </Section>
          <Section title="Extra Job Estimate" icon="mdi:calculator-variant-outline" hint="Updates live as you change the items. Calculated from what the customer agreed (see Customer confirmation).">
            <div className="xs-sum">
              {[
                ["labour", "Repair items", `${f.labour.length} item(s) · ${money(tAll.labour)}`],
                ["parts", "Spare parts", `${f.parts.length + f.quotes.length} item(s) · ${money(tAll.spare)}`],
                ["time", "Estimated time", timeText(f) || "Not set"],
              ].map(([k, label, v]) => (
                <button key={k} type="button" role="switch" aria-checked={sendSel[k]} className={`xs-selchip ${sendSel[k] ? "on" : ""}`} onClick={() => setSendSel((x) => ({ ...x, [k]: !x[k] }))}>
                  <span className="xs-selbox"><Icon icon="mdi:check" width="16" height="16" /></span>
                  <span><span className="xs-selt">{label}</span><b>{v}</b></span>
                </button>
              ))}
            </div>
            <div className="xs-total xs-big"><span>Extra Job Estimate</span><span>{money(t.total)}</span></div>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <Button variant="outline-dark" disabled={!canDoc} onClick={() => { setViewKind("est"); setViewDoc(true); }}><Icon icon="mdi:eye-outline" /> View estimate</Button>
              <Button variant="outline-secondary" disabled={!canDoc || busy} onClick={() => download(false)}>{busy ? <Spinner size="sm" /> : <Icon icon="mdi:download" />} Download estimate (PDF)</Button>
              <Button variant="outline-secondary" disabled={!canDoc} onClick={() => print(false)}><Icon icon="mdi:printer-outline" /> Print</Button>
              {!dis && <Button variant="primary" disabled={!canDoc || busy} onClick={() => sendSms(false)}><Icon icon="mdi:message-text-outline" /> Send via SMS</Button>}
              {f.sentVia === "SMS" && <Badge bg="success" className="align-self-center">Sent by SMS</Badge>}
            </div>
            {!canDoc && <div className="small text-muted mt-2">Add items first: View, Download, Print and Send work when the estimate total is more than Rs. 0.00.</div>}
          </Section>
        </>
      )}

      {(
        <>
          <Section id="approval" title="Did you receive the customer's confirmation?" icon="mdi:message-reply-text-outline" hint="Answer Yes once the customer has replied. The sections below unlock after that.">
            <div className="d-flex flex-wrap gap-2">
              {[[true, "Yes", "mdi:check"], [false, "No", "mdi:close"]].map(([k, label, icon]) => (
                <button key={label} type="button" disabled={dis} className={`xs-choice ${gateYes === k ? "on" : ""}`} onClick={() => setReplied(k)}><Icon icon={icon} width="18" height="18" /> {label}</button>
              ))}
            </div>
          </Section>
          <div className={gateYes ? "" : "xs-muted"} aria-disabled={!gateYes}>
          <Section title="Customer confirmation" icon="mdi:account-check-outline">
            <div className="d-flex flex-wrap gap-2">
              {[["APPROVED", "Total approved", "mdi:check-all"], ["PARTIAL", "Agreed scope only", "mdi:check"], ["REJECTED", "Not approved", "mdi:close-circle-outline"]].map(([k, label, icon]) => (
                <button key={k} type="button" disabled={dis} className={`xs-choice ${f.decision === k ? "on" : ""}`} onClick={() => set({ decision: k })}><Icon icon={icon} width="18" height="18" /> {label}</button>
              ))}
            </div>
          </Section>
          {f.decision === "PARTIAL" && (
            <Section title="Agreed scope" icon="mdi:format-list-checks" hint="Tick the repair items the customer agreed. The spare parts stay in the estimate.">
              {everyItem.filter((x) => x.sub === "Labour").map((x) => (
                <label key={x.id} className={`xs-tick ${f.agreedScope.includes(x.id) ? "on" : ""}`}>
                  <Form.Check type="checkbox" disabled={dis} checked={f.agreedScope.includes(x.id)} onChange={() => tickIn("agreedScope", x.id)} />
                  <span style={{ flex: 1 }}>{x.label} <span className="text-secondary small">· {x.sub}</span></span><b>{money(x.amount)}</b>
                </label>
              ))}
            </Section>
          )}
          {f.decision && f.decision !== "REJECTED" && (f.parts.length > 0 || f.quotes.length > 0) && (
            <Section title="Spare parts provided by" icon="mdi:truck-outline">
              <div className="d-flex flex-wrap gap-2">
                {[["US", "Provided by us", "mdi:store-outline"], ["CLIENT", "Provided by client", "mdi:account-outline"]].map(([k, label, icon]) => (
                  <button key={k} type="button" disabled={dis} className={`xs-choice ${f.partsBy === k ? "on" : ""}`} onClick={() => set({ partsBy: k })}><Icon icon={icon} width="18" height="18" /> {label}</button>
                ))}
              </div>
              {f.partsBy === "CLIENT" && (
                <div className="mt-3">
                  <div className="xs-hint">Tick the spare parts the customer brings (they are not charged).</div>
                  {f.parts.map((p) => (
                    <label key={p.id} className={`xs-tick ${f.clientParts.includes(p.id) ? "on" : ""}`}>
                      <Form.Check type="checkbox" disabled={dis} checked={f.clientParts.includes(p.id)} onChange={() => tickIn("clientParts", p.id)} />
                      <span style={{ flex: 1 }}>{p.name} {p.brand} × {p.qty}</span>
                    </label>
                  ))}
                </div>
              )}
            </Section>
          )}
          <div className="xs-total xs-big"><span>Approved total</span><span>{money(ap.total)}</span></div>
          <Section title="Approved Estimate" icon="mdi:file-check-outline" hint="The estimate of what the customer confirmed (agreed repairs, spare parts and who provides them).">
            <div className="d-flex flex-wrap gap-2">
              <Button variant="outline-dark" disabled={!canAp} onClick={() => { setViewKind("ap"); setViewDoc(true); }}><Icon icon="mdi:eye-outline" /> View estimate</Button>
              <Button variant="outline-secondary" disabled={!canAp || busy} onClick={() => download(true)}>{busy ? <Spinner size="sm" /> : <Icon icon="mdi:download" />} Download estimate (PDF)</Button>
              <Button variant="outline-secondary" disabled={!canAp} onClick={() => print(true)}><Icon icon="mdi:printer-outline" /> Print</Button>
              {!dis && <Button variant="primary" disabled={!canAp || busy} onClick={() => sendSms(true)}><Icon icon="mdi:message-text-outline" /> Send via SMS</Button>}
            </div>
            {!canAp && <div className="small text-muted mt-2">Choose the customer&apos;s decision first. The approved estimate is available when the approved total is more than Rs. 0.00.</div>}
          </Section>
          </div>
          {!dis && (
            <div className="text-end mt-3">
              <Button variant="success" disabled={completing || !gateYes} onClick={finish}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" />} Complete Extra Job Scope</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}