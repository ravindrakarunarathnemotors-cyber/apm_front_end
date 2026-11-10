"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Col, Collapse, Form, FormControl, FormSelect, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddInspectionFileMutation,
  useAddRepairItemMutation,
  useAlternateRepairItemMutation,
  useGetEmployeesQuery,
  useGetJobInspectionQuery,
  useGetSparePartsQuery,
  useRemoveInspectionFileMutation,
  useRemoveRepairItemMutation,
  useSaveJobInspectionMutation,
} from "@/store/features/apiSlice";
import SparePartsSections from "./SparePartsSections";
import { useSetJobMarkupMutation, useSetRepairWarrantyMutation, useUpdateRepairQtyMutation } from "./inspectionQtyApi";

// Mechanical Stage 7 · Vehicle Job Inspection
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"]; // same storage-host fix as the evidence window
const letter = (n) => String.fromCharCode(97 + (n % 26));
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// hand-drawn signature (mouse / finger / pen). onChange(dataUrl | "")
function SignaturePad({ onChange, disabled }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const pos = (e) => {
    const c = ref.current, r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    ref.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111827";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setInked(true);
    onChange(ref.current.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setInked(false);
    onChange("");
  };
  return (
    <div>
      <canvas
        ref={ref} width={600} height={160}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
        style={{ width: "100%", height: 130, border: "1px dashed #94a3b8", borderRadius: 8, background: "#fff", touchAction: "none", cursor: disabled ? "not-allowed" : "crosshair" }}
      />
      <div className="d-flex justify-content-between align-items-center mt-1">
        <span className="small text-muted">{inked ? "Signature captured" : "Sign inside the box (mouse, finger or pen)"}</span>
        <Button size="sm" variant="outline-secondary" disabled={disabled || !inked} onClick={clear}><Icon icon="mdi:eraser" width="16" height="16" /> Clear</Button>
      </div>
    </div>
  );
}

// Searchable dropdown of the employees: type to filter by name / employee no / designation, click to pick.
function EmployeePicker({ value, onChange, employees, disabled, placeholder = "Select the head mechanic" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");          // what is typed while searching
  const [typing, setTyping] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setTyping(false); } };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const q = (typing ? text : "").trim().toLowerCase();
  const list = employees.filter((e) => !q || [e.name, e.no, e.designation].some((v) => String(v || "").toLowerCase().includes(q)));
  const pick = (e) => { onChange(e.name); setOpen(false); setTyping(false); setText(""); };

  return (
    <div ref={boxRef} className="position-relative">
      <div className="input-group">
        <span className="input-group-text bg-white"><Icon icon="mdi:account-hard-hat-outline" width="20" height="20" /></span>
        <FormControl
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={typing ? text : value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setTyping(true); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter" && list.length === 1) { e.preventDefault(); pick(list[0]); } if (e.key === "Escape") { setOpen(false); setTyping(false); } }}
        />
        {value && !disabled && (
          <Button variant="outline-secondary" aria-label="Clear" onClick={() => { onChange(""); setText(""); setTyping(false); }}><Icon icon="mdi:close" width="18" height="18" /></Button>
        )}
        <Button variant="outline-secondary" disabled={disabled} aria-label="Open list" onClick={() => setOpen(!open)}><Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="20" height="20" /></Button>
      </div>
      {open && !disabled && (
        <div className="position-absolute w-100 bg-white border rounded-3 shadow mt-1" style={{ zIndex: 1055, maxHeight: 240, overflowY: "auto" }}>
          {list.length === 0 && <div className="p-3 text-muted small">No employee found{q ? ` for "${text.trim()}"` : ""}.</div>}
          {list.map((e) => (
            <button key={e.key} type="button" className={`d-flex align-items-center gap-2 w-100 text-start border-0 px-3 py-2 ${e.name === value ? "bg-primary-subtle" : "bg-white"}`} onClick={() => pick(e)}>
              <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary flex-shrink-0 fw-semibold" style={{ width: 30, height: 30, fontSize: 12 }}>{String(e.name || "?").trim().slice(0, 1).toUpperCase()}</span>
              <span className="flex-grow-1">
                <span className="d-block fw-semibold lh-sm">{e.name}</span>
                <span className="small text-muted">{[e.designation, e.no].filter(Boolean).join(" · ")}</span>
              </span>
              {e.name === value && <Icon icon="mdi:check" width="18" height="18" className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// a. b. c. lines (add / remove)
function LineList({ lines, onChange, disabled, placeholder = "Write here" }) {
  const set = (i, v) => onChange(lines.map((x, n) => (n === i ? v : x)));
  return (
    <div className="d-flex flex-column gap-2">
      {lines.map((v, i) => (
        <div key={i} className="d-flex align-items-center gap-2">
          <span className="fw-semibold text-muted" style={{ width: 22 }}>{letter(i)}.</span>
          <FormControl autoComplete="off" maxLength={300} value={v} disabled={disabled} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
          {!disabled && lines.length > 1 && (
            <Button size="sm" variant="outline-danger" aria-label="Remove line" onClick={() => onChange(lines.filter((_, n) => n !== i))}>
              <Icon icon="mdi:close" width="16" height="16" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <div><Button size="sm" variant="outline-primary" onClick={() => onChange([...lines, ""])}><Icon icon="mdi:plus" width="16" height="16" /> Add line</Button></div>
      )}
    </div>
  );
}

// Yes / No (tri-state: null = not answered)
// Big tap-friendly choice buttons (replaces the small radio circles). options: [{ value, label, icon, tone: "green" | "amber" | "dark" }]
const TONES = { green: ["#16a34a", "#f0fdf4", "#14532d"], amber: ["#d97706", "#fffbeb", "#78350f"], dark: ["#111827", "#f3f4f6", "#111827"] };
function Choice({ value, onChange, options, disabled }) {
  return (
    <div role="radiogroup" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((o) => {
        const on = value === o.value;
        const [c, bg, fg] = TONES[o.tone || "dark"];
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(o.value)}
            style={{ flex: "1 1 190px", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, textAlign: "left", fontWeight: 600, cursor: disabled ? "default" : "pointer",
              border: `1.5px solid ${on ? c : "#d6d9de"}`, background: on ? bg : "#fff", color: on ? fg : "#4b5563", boxShadow: on ? `0 0 0 3px ${c}22` : "none", opacity: disabled && !on ? 0.6 : 1, transition: "all .15s" }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", flex: "none", background: on ? c : "#f3f4f6", color: on ? "#fff" : "#6b7280" }}>
              <Icon icon={o.icon} width="18" height="18" />
            </span>
            <span style={{ flex: 1 }}>{o.label}</span>
            {on && <Icon icon="mdi:check-circle" width="20" height="20" style={{ color: c }} />}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange, disabled }) {
  return (
    <div className="btn-group" role="group">
      {[[true, "Yes"], [false, "No"]].map(([v, t]) => (
        <Button key={t} variant={value === v ? (v ? "success" : "secondary") : "outline-secondary"} className="vj-yn px-4" disabled={disabled} onClick={() => onChange(value === v ? null : v)}>{t}</Button>
      ))}
    </div>
  );
}

// One collapsible section: coloured icon, title, a short summary and a done tick. Click the header to open / close.
function Card({ title, hint, children, right, icon = "mdi:clipboard-text-outline", color: _sectionColor, summary, done, defaultOpen = true, anchor }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = true;
  return (
    <div data-vj={anchor} className="vj-card">
      <div className="vj-card-h" role={hasBody ? "button" : undefined} aria-expanded={hasBody ? open : undefined} onClick={hasBody ? () => setOpen(!open) : undefined}>
        <span className="vj-ico"><Icon icon={icon} width="20" height="20" /></span>
        <div className="me-auto" style={{ minWidth: 150 }}>
          <div className="vj-card-t">
            {title}
            {done === true && <Icon icon="mdi:check-circle" width="18" height="18" className="text-success" />}
          </div>
          {hint && (open || !hasBody) && <div className="vj-card-s">{hint}</div>}
          {summary ? <div className="vj-card-s">{summary}</div> : null}
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
        {hasBody && <span className="vj-chev"><Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="20" height="20" /></span>}
      </div>
      {hasBody && (
        <Collapse in={open}>
          <div><div className="vj-card-b">{children}</div></div>
        </Collapse>
      )}
    </div>
  );
}

const Concern = ({ title, list, open, setOpen, extra }) => (
  <div className="border rounded-3 p-2 px-3 mb-2 bg-white">
    <div className="d-flex justify-content-between align-items-center">
      <div className="fw-semibold">{title} <Badge bg="secondary" pill>{list.length + (extra ? 1 : 0)}</Badge></div>
      <Button size="sm" variant="outline-primary" onClick={() => setOpen(!open)}><Icon icon={open ? "mdi:eye-off-outline" : "mdi:eye-outline"} width="16" height="16" /> {open ? "Hide" : "View"}</Button>
    </div>
    <Collapse in={open}>
      <div>
        <div className="pt-2">
          {extra && <div className="mb-1"><span className="text-muted small">Complaint: </span>{extra}</div>}
          {list.length === 0 && !extra ? <span className="text-muted small">Nothing recorded.</span> : list.map((c, n) => (
            <div key={n} className="d-flex gap-2"><span className="fw-semibold text-muted" style={{ width: 20 }}>{letter(n)}.</span><span>{c.name}<span className="text-muted small"> · {c.title}</span></span></div>
          ))}
        </div>
      </div>
    </Collapse>
  </div>
);


// "Warranty claim" pill: grey outline when off, solid green with a shield tick when on
function ClaimPill({ on, disabled, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} title={on ? "Warranty claim - not charged. Click to charge it again" : "Mark as a warranty claim (not charged)"}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 10px 3px 7px", borderRadius: 999, fontSize: ".75rem", fontWeight: 600, lineHeight: 1.4, cursor: disabled ? "default" : "pointer",
        border: `1.5px solid ${on ? "#16a34a" : "#cbd0d6"}`, background: on ? "#16a34a" : "#fff", color: on ? "#fff" : "#4b5563", opacity: disabled ? 0.65 : 1, transition: "all .15s" }}>
      <Icon icon={on ? "mdi:shield-check" : "mdi:shield-outline"} width="15" height="15" />
      {on ? "Warranty claim" : "Claim warranty"}
    </button>
  );
}

export default function VehicleJobInspectionModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch } = useGetJobInspectionQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveJobInspectionMutation();
  const [addItem, { isLoading: addingItem }] = useAddRepairItemMutation();
  const [altItem] = useAlternateRepairItemMutation();
  const [removeItem] = useRemoveRepairItemMutation();
  const [addFile] = useAddInspectionFileMutation();
  const [removeFile] = useRemoveInspectionFileMutation();

  const [testRun, setTestRun] = useState(null);
  const [faultsFound, setFaultsFound] = useState(null);
  const [faults, setFaults] = useState([""]);
  const [identified, setIdentified] = useState([""]);
  const [roots, setRoots] = useState([""]);
  const [previousRepair, setPreviousRepair] = useState(null);
  const [newRepair, setNewRepair] = useState(null);
  const [warranty, setWarranty] = useState(null);
  const [historyRemarks, setHistoryRemarks] = useState("");
  const [repairTypes, setRepairTypes] = useState([]);
  const [extraParents, setExtraParents] = useState([]); // repair types added here (not picked in the complaint stage): [{ parent, department }]
  const [signer, setSigner] = useState("");
  const { data: employeeRows = [] } = useGetEmployeesQuery();
  // people who have not resigned; mechanics first, then A-Z. A saved signer who has since resigned stays selectable.
  const people = employeeRows
    .filter((e) => e.status !== "Resigned")
    .map((e) => ({ key: e.dbId, name: e.name, no: e.id, designation: e.designation }))
    .sort((a, b) => (/mechanic/i.test(b.designation || "") - /mechanic/i.test(a.designation || "")) || String(a.name).localeCompare(String(b.name)));
  const [signature, setSignature] = useState(""); // PNG data URL of the drawn signature
  const [showMain, setShowMain] = useState(false);
  const [showSub, setShowSub] = useState(false);
  // spare parts are recorded in this window too (departments with a spare parts stage right after the inspection)
  const { data: spData } = useGetSparePartsQuery(jobId, { skip: !jobId });
  const [showAdj, setShowAdj] = useState(false); // toggle: show the actual price / increase lines under the adjusted prices (default off)
  const [updateQty] = useUpdateRepairQtyMutation();
  const [setRepairWarranty] = useSetRepairWarrantyMutation();
  const [setMarkup, { isLoading: savingMarkup }] = useSetJobMarkupMutation();
  const [qtyLive, setQtyLive] = useState({}); // qty typed in the Repair list table (saved when the cursor leaves the box)
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ description: "", qty: "1", amount: "", repairType: "" }); // new repair line
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ description: "", qty: "1", amount: "", repairType: "" }); // alternate line
  const [showOld, setShowOld] = useState(false);
  const fileRef = useRef(null);
  const initRef = useRef(false);
  const snapRef = useRef(null);                  // the form as it was when loaded / last saved (to detect unsaved changes)
  const [initDone, setInitDone] = useState(false);

  // fill the form ONCE from the saved record (later refetches - uploads, repair lines - must not wipe what is being typed)
  useEffect(() => {
    if (!data || initRef.current) return;
    initRef.current = true;
    const i = data.inspection;
    setTestRun(i?.testRun ?? null);
    setFaultsFound(i?.faultsFound ?? null);
    setFaults(data.faults?.length ? data.faults : [""]);
    setIdentified(data.identifiedFaults?.length ? data.identifiedFaults : [""]);
    setRoots(data.rootCauses?.length ? data.rootCauses : [""]);
    setPreviousRepair(i?.previousRepair ?? null);
    setNewRepair(i?.newRepair ?? null);
    setWarranty(i?.warranty ?? null);
    setHistoryRemarks(i?.historyRemarks || "");
    setRepairTypes(i?.repairTypes || []);
    // saved types that are not from the complaint stage come back as extra parents
    const fromComplaint = new Set((data.repairGroups || []).map((g) => g.parent));
    const extras = [];
    (i?.repairTypes || []).forEach((t) => {
      const parent = String(t).includes(" > ") ? String(t).split(" > ")[0] : t;
      const hit = (data.repairTree || []).find((g) => g.parent === parent);
      if (!fromComplaint.has(parent) && hit && !extras.some((x) => x.parent === parent)) extras.push({ parent, department: hit.department });
    });
    // the saved ones remember the department they were picked from
    const saved = (Array.isArray(i?.extraParents) ? i.extraParents : []).filter((x) => (data.repairTree || []).some((g) => g.parent === x.parent && g.department === x.department));
    saved.forEach((x) => { const k = extras.findIndex((e) => e.parent === x.parent); if (k >= 0) extras[k] = x; else extras.push(x); });
    setExtraParents(extras);
    setInitDone(true);
    setSigner(i?.signedByName || "");
  }, [data]);

  const job = data?.job;
  const readOnly = data && !data.canRecord;
  const signed = Boolean(data?.signed);
  const active = (data?.repairItems || []).filter((r) => r.status === "ACTIVE");
  // price adjustment (markup %) of the job: added to EACH repair line and EACH spare part line separately, then summed
  const pct = Number(data?.markupPercent || 0);
  // the % is added to the UNIT PRICE of each line, so the line amount = qty x (unit price + %)
  const adjUnit = (u) => Math.round((Number(u) || 0) * (100 + pct)) / 100;
  // "Warranty available? Yes": a line marked as a warranty claim is shown as "Warranty claim" and is not charged
  const wOn = warranty === true;
  const claimed = (x) => Boolean(wOn && x?.warrantyClaim);
  const repairGross = active.filter((r) => !claimed(r)).reduce((sum, r) => sum + (r.qty || 1) * adjUnit(r.unitPrice ?? r.amount), 0);
  const spareGross = spData
    ? (spData.items || []).filter((i) => !claimed(i)).reduce((sum, i) => sum + i.qty * adjUnit(i.unitPrice), 0)
      + (spData.quotes || []).filter((q) => q.quotedPrice != null).reduce((sum, q) => sum + adjUnit(q.quotedPrice), 0)
    : 0;
  const old = (data?.repairItems || []).filter((r) => r.status !== "ACTIVE");
  // Show the problem in a SweetAlert; when it is closed, jump to the section that needs fixing (opens it if collapsed)
  const problem = (msg, anchor) => {
    setError(msg);
    Swal.fire({ title: "Please check", text: msg, icon: "error", confirmButtonText: "OK, show me", confirmButtonColor: "#111" }).then(() => {
      const el = document.querySelector(`.vj-modal [data-vj="${anchor}"]`);
      if (!el) return;
      const head = el.querySelector("[aria-expanded]");
      if (head && head.getAttribute("aria-expanded") === "false") head.click();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("vj-flash");
      setTimeout(() => el.classList.remove("vj-flash"), 2500);
      setTimeout(() => el.querySelector("input:not([type=hidden]):not([disabled]), textarea, canvas")?.focus?.({ preventScroll: true }), 450);
    });
  };
  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });

  const payload = (complete) => ({
    jobId, testRun, faultsFound, faults, identifiedFaults: identified, rootCauses: roots,
    previousRepair, newRepair, warranty, historyRemarks, extraParents,
    // the parent types picked in the complaint stage are always included
    repairTypes: [...new Set([...shownGroups.map((g) => g.parent), ...repairTypes])],
    complete, signerName: signer.trim(), signatureImage: complete ? signature : undefined,
  });

  const submit = async (complete) => {
    setError("");
    if (complete) {
      if (!testRun) return problem("Select whether a test run is necessary.", "testrun");
      if (faultsFound === null) return problem("Select Record Faults or No Faults Found.", "faults");
      if (faultsFound && !faults.some((x) => x.trim())) return problem("Record at least one fault.", "faults");
      if (signer.trim().length < 2) return problem("Select the head mechanic.", "sign");
      if (people.length > 0 && !people.some((p) => p.name === signer.trim())) return problem("Select the head mechanic from the list.", "sign");
      if (!signature) return problem("The head mechanic must draw the signature.", "sign");
      if (spData?.canRecord && !signed && spData.items.length === 0 && !spData.header.noParts) return problem("Add the spare parts, or tick 'No spare parts needed'.", "spare");
      const ok = await Swal.fire({ title: "Sign and complete?", text: `${job.jobNo}: the inspection will be signed by ${signer.trim()} and the job moves to the next stage.`, icon: "question", showCancelButton: true, confirmButtonText: "Sign & complete" });
      if (!ok.isConfirmed) return;
    }
    try {
      const res = await save(payload(complete)).unwrap();
      snapRef.current = currentKey;
      await Swal.fire({ title: complete ? "Inspection signed!" : "Saved!", icon: "success", timer: 1300, showConfirmButton: false });
      // "Update" of an already signed inspection also moves on: the window closes and the next stage (Spare Part Review & Order) opens
      const goNext = complete || signed;
      onSaved?.({ jobId, stageCompleted: Boolean(res.stageCompleted) || goNext, spareCompleted: Boolean(res.spareCompleted) || Boolean(spData?.header?.completedAt) });
      if (goNext) onHide();
    } catch (ex) {
      problem(ex?.data?.message || "Failed to save the inspection.", "sign");
    }
  };

  // scanner report: upload to the file storage, then register it
  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        if (f.size > 25 * 1024 * 1024) { Swal.fire({ title: "File too large", text: `${f.name} is over 25 MB.`, icon: "warning" }); continue; }
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
        const up = await res.json().catch(() => ({}));
        if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
        const url = URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl;
        await addFile({ jobId, fileName: f.name, fileUrl: url, mimeType: f.type, size: f.size }).unwrap();
      }
    } catch (ex) { fail(ex, "Upload failed"); } finally { setUploading(false); }
  };

  // amount in the form = unit price; the line total (qty x unit price) is calculated by the server
  const changeMarkup = async (percent) => { try { await setMarkup({ jobId, percent }).unwrap(); } catch (ex) { fail(ex, "Could not change the price adjustment."); } };
  const toggleClaim = async (r, claim) => { try { await setRepairWarranty({ jobId, itemId: r.id, claim }).unwrap(); } catch (ex) { fail(ex, "Could not change the warranty claim."); } };
  const commitQty = async (r) => {
    const raw = qtyLive[r.id];
    if (raw === undefined) return;
    const n = Number(raw);
    setQtyLive((m) => { const x = { ...m }; delete x[r.id]; return x; });
    if (raw === "" || n === (r.qty || 1)) return;
    if (!Number.isInteger(n) || n < 1) return problem("Enter a valid quantity (1 or more).", "repair");
    try { await updateQty({ jobId, itemId: r.id, qty: n }).unwrap(); } catch (ex) { fail(ex, "Could not change the quantity."); }
  };
  const itemOf = (f) => ({ description: f.description.trim(), qty: Number(f.qty || 1), unitPrice: Number(f.amount || 0), repairType: f.repairType || undefined });
  const checkItem = (f) => (!f.description.trim() ? "Enter the repair item." : !(Number(f.qty || 1) >= 1 && Number.isInteger(Number(f.qty || 1))) ? "Enter a valid quantity (1 or more)." : f.amount !== "" && !(Number(f.amount) >= 0) ? "Enter a valid unit price." : "");

  const add = async () => {
    const p = checkItem(form); if (p) return problem(p, "repair");
    setError("");
    try { await addItem({ jobId, ...itemOf(form) }).unwrap(); setForm({ description: "", qty: "1", amount: "", repairType: "" }); } catch (ex) { fail(ex, "Could not add the repair item."); }
  };
  const alternate = async () => {
    const p = checkItem(edit); if (p) return problem(p, "repair");
    setError("");
    try { await altItem({ jobId, itemId: editId, ...itemOf(edit) }).unwrap(); setEditId(null); } catch (ex) { fail(ex, "Could not change the repair item."); }
  };
  const remove = async (r) => {
    const ok = await Swal.fire({ title: "Remove this repair item?", text: r.description, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (!ok.isConfirmed) return;
    try {
      await removeItem({ jobId, itemId: r.id }).unwrap();
      // the child type this line came from is unticked too (when no other line of it is left)
      const child = (data?.repairTree || []).flatMap((g) => g.children).find((c) => c.label === r.repairType && c.name === r.description);
      if (child && !active.some((x) => x.id !== r.id && x.repairType === child.label && x.description === child.name)) {
        setRepairTypes((cur) => cur.filter((t) => t !== child.label));
      }
    } catch (ex) { fail(ex, "Could not remove the repair item."); }
  };
  const dropFile = async (f) => {
    const ok = await Swal.fire({ title: "Remove this file?", text: f.fileName, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (!ok.isConfirmed) return;
    try { await removeFile(f.id).unwrap(); } catch (ex) { fail(ex, "Could not remove the file."); }
  };
  // per repair type: false = only the ticked child types are shown (default), true = every child type is shown to tick / untick
  const [openGroups, setOpenGroups] = useState({});
  const [addDept, setAddDept] = useState("");   // department chosen in "Add another repair type" (empty = this department)
  const toggleGroup = (name) => setOpenGroups((m) => ({ ...m, [name]: !m[name] }));
  const toggleType = (t) => setRepairTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  // Parent types shown in "Select type of repair": the ones from the complaint + the ones added here
  const complaintGroups = data?.repairGroups || [];
  const shownGroups = [
    ...complaintGroups.map((g) => ({ ...g, extra: false })),
    ...extraParents.map((x) => (data?.repairTree || []).find((g) => g.parent === x.parent && g.department === x.department)).filter(Boolean).map((g) => ({ ...g, extra: true })),
  ];
  // repair types that can still be added: this department first, then the other departments (a name that is already shown is skipped)
  const addableParents = (data?.repairTree || []).filter((g) => !shownGroups.some((x) => x.parent === g.parent && (x.extra ? x.department === g.department : true)));
  const addableByDept = addableParents.reduce((m, g) => { const k = g.department || "Other"; (m[k] = m[k] || { current: Boolean(g.isCurrent), list: [] }).list.push(g); return m; }, {});
  const typeOptions = shownGroups.length ? shownGroups.flatMap((g) => [g.parent, ...g.children.map((c) => c.label)]) : data?.repairTypes || [];

  // the form content without "complete" / signature image: used to know if there is anything unsaved
  const draftKey = () => { const { complete, signatureImage, ...rest } = payload(false); return JSON.stringify(rest); };
  const currentKey = initDone ? draftKey() : null;
  useEffect(() => { if (initDone && snapRef.current === null) snapRef.current = currentKey; });   // first render after the form is filled

  // Auto-save: ~1.5 s after the last change the form is saved as a draft (not for a signed inspection - that is saved with "Update").
  // A failed auto-save stays quiet (the Save draft button / the close question still work).
  const [autoState, setAutoState] = useState("");   // "" | "pending" | "saving" | "saved" | "failed"
  const autoBusy = useRef(false);
  useEffect(() => {
    if (!initDone || !data || readOnly || signed || currentKey === null || snapRef.current === null) return undefined;
    if (currentKey === snapRef.current) return undefined;
    setAutoState("pending");
    const t = setTimeout(async () => {
      if (autoBusy.current) return;
      autoBusy.current = true;
      const key = currentKey;
      setAutoState("saving");
      try { await save(payload(false)).unwrap(); snapRef.current = key; setAutoState("saved"); }
      catch (_) { setAutoState("failed"); }
      finally { autoBusy.current = false; }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, initDone, readOnly, signed]);

  // Close: if something typed is not saved yet, ask (Save draft & close / Discard / Keep editing)
  const tryClose = async () => {
    if (saving) return;
    if (!data || readOnly || snapRef.current === null || currentKey === snapRef.current) return onHide();
    const r = await Swal.fire({
      title: "Unsaved changes",
      text: "You typed or ticked something that is not saved yet. Save it as a draft before closing?",
      icon: "warning", showDenyButton: true, showCancelButton: true,
      confirmButtonText: "Save draft & close", denyButtonText: "Discard changes", cancelButtonText: "Keep editing",
    });
    if (r.isConfirmed) {
      try { await save(payload(false)).unwrap(); snapRef.current = currentKey; onSaved?.({ jobId, stageCompleted: false, spareCompleted: false }); onHide(); }
      catch (ex) { setError(ex?.data?.message || "Failed to save the inspection."); }
    } else if (r.isDenied) onHide();
  };

  // A child type ticked -> a line (child name + labour price) is added to the Repair list; unticked -> that line is removed.
  const lineOf = (c) => active.filter((r) => r.repairType === c.label && r.description === c.name);
  // a child type counts as ticked when it was ticked OR its line is already in the Repair list (so saved / added lines show as ticked automatically)
  const isOn = (c) => repairTypes.includes(c.label) || lineOf(c).length > 0;
  const tickedCount = new Set([...repairTypes, ...active.map((r) => r.repairType)].filter((t) => String(t || "").includes(" > "))).size;
  const toggleChild = async (c) => {
    const on = isOn(c);
    setRepairTypes((cur) => (on ? cur.filter((x) => x !== c.label) : cur.includes(c.label) ? cur : [...cur, c.label]));
    try {
      if (!on) {
        if (lineOf(c).length === 0) await addItem({ jobId, description: c.name, qty: 1, unitPrice: Number(c.price || 0), repairType: c.label }).unwrap();
      } else {
        for (const r of lineOf(c)) await removeItem({ jobId, itemId: r.id }).unwrap();
      }
    } catch (ex) { fail(ex, "Could not update the repair list."); }
  };
  const dropExtraParent = async (g) => {
    const ok = await Swal.fire({ title: "Remove this repair type?", text: `${g.parent} and its repair list lines will be removed.`, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (!ok.isConfirmed) return;
    try {
      for (const c of g.children) { if (isOn(c)) await toggleChildOff(c); }
      setExtraParents((cur) => cur.filter((x) => !(x.parent === g.parent && x.department === g.department)));
    } catch (ex) { fail(ex, "Could not remove the repair type."); }
  };
  const toggleChildOff = async (c) => {
    setRepairTypes((cur) => cur.filter((x) => x !== c.label));
    for (const r of lineOf(c)) await removeItem({ jobId, itemId: r.id }).unwrap();
  };

  return (
    <Modal show onHide={saving ? undefined : tryClose} size="xl" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={false} dialogClassName="vj-modal">
      <style>{`
        @media (min-width: 992px) { .modal-dialog.vj-modal { --bs-modal-width: 1060px; } }
        .vj-modal { --ink: #111827; --mut: #6b7280; --line: #e5e7eb; --bg: #f4f5f7; --acc: #c8102e; }
        .vj-modal .modal-content { border: 0; border-radius: 20px; overflow: hidden; box-shadow: 0 30px 70px -20px rgba(0,0,0,.55); }
        .vj-modal .vj-head { background: linear-gradient(135deg,#0b0b0d 0%,#16161a 55%,#25252c 100%); color: #fff; border: 0; border-bottom: 3px solid var(--acc); padding: 16px 24px; }
        .vj-modal .vj-head-ico { width: 46px; height: 46px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); }
        .vj-modal .modal-body { background: var(--bg) !important; padding: 20px 24px; }
        .vj-modal .form-control, .vj-modal .form-select { border-radius: 12px; border: 1.5px solid #d4d7dd; min-height: 46px; background-color: #fff; }
        .vj-modal textarea.form-control { min-height: 0; }
        .vj-modal .form-control:focus, .vj-modal .form-select:focus { border-color: var(--ink); box-shadow: 0 0 0 4px rgba(17,24,39,.08); }
        .vj-modal .input-group > .form-control { border-radius: 0 12px 12px 0; }
        .vj-modal .input-group > .form-control:not(:last-child) { border-radius: 0; }
        .vj-modal .input-group > .input-group-text:first-child { border-radius: 12px 0 0 12px; background: #eef0f3 !important; color: var(--ink); border: 1.5px solid #d4d7dd; border-right: 0; }
        .vj-modal .form-check-input { width: 1.2em; height: 1.2em; border-color: #9ca3af; }
        .vj-modal .form-check-input:checked { background-color: var(--ink); border-color: var(--ink); }
        .vj-modal .form-check-input:focus { border-color: var(--ink); box-shadow: 0 0 0 4px rgba(17,24,39,.1); }
        .vj-modal .form-check-label { font-weight: 600; }
        .vj-modal .btn-outline-primary, .vj-modal .btn-outline-secondary, .vj-modal .btn-light { color: var(--ink); border: 1.5px solid #d4d7dd; border-radius: 10px; font-weight: 600; background: #fff; }
        .vj-modal .btn-outline-primary:hover, .vj-modal .btn-outline-secondary:hover, .vj-modal .btn-light:hover { color: #fff; background: var(--ink); border-color: var(--ink); }
        .vj-modal .btn-outline-danger { border-radius: 10px; border-width: 1.5px; }
        .vj-modal .btn-secondary { background: var(--ink); border-color: var(--ink); color: #fff; border-radius: 10px; }
        .vj-modal .btn-success, .vj-modal .btn-primary { color: #fff !important; border: 0 !important; border-radius: 10px; font-weight: 700; background: linear-gradient(135deg,#111827 0%,#1f2937 100%); box-shadow: 0 8px 18px -10px rgba(17,24,39,.7); }
        .vj-modal .btn-success:hover, .vj-modal .btn-primary:hover { filter: brightness(1.3); }
        .vj-modal .vj-yn { min-height: 44px; font-weight: 700; }
        .vj-modal .vj-yn.btn-success { background: linear-gradient(135deg,#047857,#10b981); box-shadow: none; }
        .vj-modal .vj-yn.btn-secondary { background: linear-gradient(135deg,#111827,#374151); box-shadow: none; }
        .vj-modal .modal-footer .btn { min-height: 46px; padding: 0 24px; border-radius: 12px; }
        .vj-modal .modal-footer { background: #fff; border-top: 1px solid var(--line); padding: 12px 24px; }
        .vj-modal table thead th { background: #f1f2f5; color: #4b5563; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; border: 0; }
        .vj-modal tfoot td { background: #f1f2f5; font-weight: 800; border-top: 2px solid var(--ink); border-bottom: 0; padding-top: .55rem; padding-bottom: .55rem; }
        .vj-modal .vj-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 12px 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 10px 24px -18px rgba(16,24,40,.25); }
        .vj-modal .vj-jobno { display: inline-block; background: var(--ink); color: #fff; border-radius: 8px; padding: 3px 11px; font-weight: 700; font-size: .85rem; letter-spacing: .02em; }
        .vj-modal .vj-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; }
        .vj-modal .vj-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; margin-bottom: 14px; overflow: visible; box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 12px 28px -20px rgba(16,24,40,.28); }
        .vj-modal .vj-card-h { border-radius: 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 14px 18px; cursor: pointer; }
        .vj-modal .vj-card-h[aria-expanded="true"] { border-bottom: 1px solid #eef0f3; border-radius: 18px 18px 0 0; }
        .vj-modal .vj-ico { width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; background: linear-gradient(145deg,#1f2937,#374151); box-shadow: 0 6px 14px -8px rgba(17,24,39,.7); }
        .vj-modal .vj-card-t { font-weight: 700; font-size: 1.02rem; color: var(--ink); display: flex; align-items: center; gap: 8px; }
        .vj-modal .vj-card-s { font-size: .82rem; color: var(--mut); margin-top: 1px; }
        .vj-modal .vj-chev { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--mut); background: #f3f4f6; flex-shrink: 0; }
        .vj-modal .vj-card-b { padding: 18px; background: #fcfcfd; border-radius: 0 0 18px 18px; }
        .vj-modal .dropdown-menu { z-index: 1080; border-radius: 14px; border: 1px solid var(--line); box-shadow: 0 18px 40px -16px rgba(16,24,40,.35); }
        .vj-modal .vj-est { display: flex; flex-wrap: wrap; align-items: stretch; margin-bottom: 14px; border-radius: 18px; overflow: hidden; color: #fff; background: linear-gradient(135deg,#0b0b0d 0%,#16161a 55%,#25252c 100%); box-shadow: 0 18px 36px -22px rgba(0,0,0,.8); border-bottom: 3px solid var(--acc); }
        .vj-modal .vj-est-l { flex: 1 1 320px; padding: 16px 20px; }
        .vj-modal .vj-est-ttl { display: flex; align-items: center; gap: 8px; font-size: .78rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.7); margin-bottom: 8px; }
        .vj-modal .vj-est-row { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; font-size: .98rem; }
        .vj-modal .vj-est-row small { color: rgba(255,255,255,.55); margin-left: 6px; }
        .vj-modal .vj-est-row i { flex: 1; border-bottom: 1px dotted rgba(255,255,255,.28); transform: translateY(-4px); min-width: 12px; }
        .vj-modal .vj-est-row b { font-variant-numeric: tabular-nums; font-weight: 700; }
        .vj-modal .vj-adj { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 24px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 16px; padding: 12px 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
        .vj-modal .vj-adj-main { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .vj-modal .vj-adj-ico { width: 38px; height: 38px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(145deg,#1f2937,#374151); flex-shrink: 0; }
        .vj-modal .vj-adj-t { font-weight: 700; color: var(--ink); line-height: 1.2; }
        .vj-modal .vj-adj-s { font-size: .78rem; color: var(--mut); line-height: 1.3; }
        .vj-modal .vj-adj .form-select { width: 130px; min-height: 42px; font-weight: 700; }
        .vj-modal .vj-adj-sw { border-left: 1px solid #eef0f3; padding-left: 24px; }
        .vj-modal .vj-adj-sw .form-check { margin: 0; }
        .vj-modal .vj-adj-sw .form-check-label { font-weight: 700; color: var(--ink); }
        .vj-modal .vj-adj-sw .form-check-input { width: 2.4em; height: 1.3em; }
        .vj-modal .vj-adj-sw.off { opacity: .6; }
        @media (max-width: 767px) { .vj-modal .vj-adj-sw { border-left: 0; padding-left: 0; border-top: 1px solid #eef0f3; padding-top: 10px; width: 100%; } }
        .vj-modal .vj-est-pct { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
        .vj-modal .vj-est-pct label { font-size: .78rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.7); white-space: nowrap; }
        .vj-modal .vj-est-pct .form-select { max-width: 150px; min-height: 38px; border-radius: 10px; background-color: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.25); color: #fff; font-weight: 700; }
        .vj-modal .vj-est-pct .form-select option { color: #111827; }
        .vj-modal .vj-est-note { margin-top: 6px; font-size: .76rem; color: rgba(255,255,255,.5); }
        .vj-modal .vj-est-r { flex: 0 1 280px; padding: 16px 22px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; text-align: right; background: rgba(255,255,255,.06); border-left: 1px solid rgba(255,255,255,.1); }
        .vj-modal .vj-est-r small { text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; color: rgba(255,255,255,.65); font-weight: 700; }
        .vj-modal .vj-est-r .tt { font-size: 1.9rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.15; }
        @media (max-width: 575px) { .vj-modal .vj-est-r { flex: 1 1 100%; align-items: flex-start; text-align: left; border-left: 0; border-top: 1px solid rgba(255,255,255,.1); } }
        .vj-modal .vj-qty { min-height: 36px; max-width: 84px; margin-left: auto; font-weight: 700; }
        .vj-modal .vj-flash { animation: vjflash 2.5s ease; }
        @keyframes vjflash { 0%,60% { box-shadow: 0 0 0 4px rgba(200,16,46,.4); } 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0); } }
      `}</style>
      <Modal.Header closeButton={!saving} closeVariant="white" className="vj-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <span className="vj-head-ico"><Icon icon="mdi:car-wrench" width="26" height="26" /></span>
          <span>
            Vehicle Job Inspection
            {job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f4f5f7" }}>
        {isLoading && <div className="text-center py-5"><Spinner /></div>}
        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError?.data?.message || "Could not load the inspection."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Try again</Button>
          </Alert>
        )}
        {data && (
          <>
            <div className="vj-strip">
              <span className="vj-jobno">{job.jobNo}</span>
              <span className="vj-plate">{job.regNo}</span>
              <span className="fw-semibold"><Icon icon="mdi:account-outline" width="18" height="18" className="me-1 text-muted" />{job.customerName}</span>
              <span className="ms-auto d-flex flex-wrap gap-2">
                <Badge bg="light" text="dark" className="border fw-normal">{active.length} repair item(s)</Badge>
                <Badge bg="dark" className="fw-semibold">{money(repairGross)}</Badge>
                {signed && <Badge bg="success">Signed by {data.inspection.signedByName} · {new Date(data.inspection.signedAt).toLocaleString()}</Badge>}
              </span>
            </div>
            {readOnly && <Alert variant="secondary" className="py-2">{signed ? "The head mechanic has signed this inspection. It is read-only (only an authorised user can change it)." : "You can only view this inspection now."}</Alert>}

            {/* Main / Sub concern */}
            <Card title="Customer concerns" icon="mdi:message-alert-outline" color="#d97706" summary={`${data.concerns.main.length + (data.concerns.complaint ? 1 : 0)} main · ${data.concerns.sub.length} sub`}>
              <Concern title="Main Concern" list={data.concerns.main} extra={data.concerns.complaint} open={showMain} setOpen={setShowMain} />
              <Concern title="Sub Concern" list={data.concerns.sub} open={showSub} setOpen={setShowSub} />
            </Card>

            {/* Test run + faults */}
            <Card anchor="testrun" title="Test Run" icon="mdi:speedometer" color="#2563eb" defaultOpen done={!!testRun} summary={testRun ? (testRun === "NECESSARY" ? "Necessary" : "Not necessary") : "Not answered yet"}>
              <Choice value={testRun} onChange={setTestRun} disabled={readOnly} options={[
                { value: "NECESSARY", label: "Necessary", icon: "mdi:car-cog", tone: "green" },
                { value: "NOT_NECESSARY", label: "Not Necessary", icon: "mdi:car-off", tone: "dark" },
              ]} />
            </Card>
            <Card anchor="faults" title="Faults" icon="mdi:alert-octagon-outline" color="#dc2626" defaultOpen done={faultsFound !== null} summary={faultsFound === true ? `${faults.filter((x) => x.trim()).length} fault(s) recorded` : faultsFound === false ? "No faults found" : "Not answered yet"}>
              <div className="mb-2">
                <Choice value={faultsFound} onChange={setFaultsFound} disabled={readOnly} options={[
                  { value: true, label: "Record Faults", icon: "mdi:clipboard-alert-outline", tone: "amber" },
                  { value: false, label: "No Faults Found", icon: "mdi:check-decagram-outline", tone: "green" },
                ]} />
              </div>
              {faultsFound === true && <LineList lines={faults} onChange={setFaults} disabled={readOnly} placeholder="Fault" />}
            </Card>

            {/* Diagnosis */}
            <Card title="Diagnosis" icon="mdi:stethoscope" color="#7c3aed" hint="Scanner report attached · can be shared with the other departments" summary={`${identified.filter((x) => x.trim()).length} identified fault(s) · ${data.scannerFiles.length} scanner file(s)`}
              right={!readOnly && (
                <>
                  <Button size="sm" variant="outline-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Spinner size="sm" /> : <Icon icon="mdi:paperclip" width="16" height="16" />} Attach scanner report
                  </Button>
                  <input ref={fileRef} type="file" hidden multiple accept="application/pdf,image/*,.txt,.csv" onChange={onFiles} />
                </>
              )}>
              {data.scannerFiles.length === 0 ? <div className="small text-muted mb-2">No scanner report attached.</div> : (
                <div className="d-flex flex-column gap-1 mb-2">
                  {data.scannerFiles.map((f) => (
                    <div key={f.id} className="d-flex align-items-center gap-2">
                      <Icon icon="mdi:file-document-outline" width="18" height="18" />
                      <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-grow-1 text-truncate">{f.fileName}</a>
                      {!readOnly && <Button size="sm" variant="outline-danger" onClick={() => dropFile(f)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                    </div>
                  ))}
                </div>
              )}
              <div className="fw-semibold small mb-1">Identified Faults</div>
              <LineList lines={identified} onChange={setIdentified} disabled={readOnly} placeholder="Identified fault" />
              <div className="fw-semibold small mt-3 mb-1">Root Cause of the vehicle issues</div>
              <LineList lines={roots} onChange={setRoots} disabled={readOnly} placeholder="Root cause" />
              <div className="small text-muted mt-2">Linked with Spare Parts (Stage 8) and Customer Approval (Stage 9).</div>
            </Card>

            {/* History / ERP */}
            <Card title="Vehicle History / ERP Check" icon="mdi:history" color="#0891b2" done={previousRepair !== null || newRepair !== null || warranty !== null} summary={`${data.history.length} earlier job(s) for this vehicle`}>
              {data.history.length > 0 ? (
                <div className="small mb-2">
                  <span className="text-muted">Earlier jobs of {job.regNo}: </span>
                  {data.history.map((h) => <Badge key={h.jobNo} bg="light" text="dark" className="border me-1">{h.jobNo} · {new Date(h.createdAt).toLocaleDateString()}</Badge>)}
                </div>
              ) : <div className="small text-muted mb-2">No earlier jobs for this vehicle.</div>}
              <Row className="g-2 align-items-center">
                <Col xs={8}>Related to a previous repair?</Col><Col xs={4}><YesNo value={previousRepair} onChange={setPreviousRepair} disabled={readOnly} /></Col>
                <Col xs={8}>New repair?</Col><Col xs={4}><YesNo value={newRepair} onChange={setNewRepair} disabled={readOnly} /></Col>
                <Col xs={8}>Warranty available?</Col><Col xs={4}><YesNo value={warranty} onChange={setWarranty} disabled={readOnly} /></Col>
              </Row>
              <FormControl as="textarea" rows={2} maxLength={2000} className="mt-2" placeholder="Remarks (optional)" value={historyRemarks} disabled={readOnly} onChange={(e) => setHistoryRemarks(e.target.value)} />
            </Card>

            {/* Repair types */}
            <Card title="Select type of repair" icon="mdi:wrench-cog-outline" color="#ea580c" defaultOpen done={tickedCount > 0} summary={`${shownGroups.length} type(s) · ${tickedCount} child type(s) ticked`} hint={shownGroups.length ? "The types from the complaint are selected for you. Tick the child types that apply: each one is added to the Repair list with its price." : undefined}>
              <div className="vj-adj">
                <div className="vj-adj-main">
                  <span className="vj-adj-ico"><Icon icon="mdi:percent" width="20" height="20" /></span>
                  <div>
                    <div className="vj-adj-t">Price adjustment</div>
                    <div className="vj-adj-s">Added to the price of every spare part and repair item</div>
                  </div>
                  <select id="vj-markup" aria-label="Price adjustment" className="form-select" value={pct} disabled={readOnly || savingMarkup} onChange={(e) => changeMarkup(Number(e.target.value))}>
                    <option value={0}>None</option>
                    {[2, 5, 8, 10, 12].map((p) => <option key={p} value={p}>+ {p}%</option>)}
                  </select>
                  {savingMarkup && <Spinner size="sm" />}
                </div>
                <div className={`vj-adj-sw ${pct === 0 ? "off" : ""}`}>
                  <Form.Check type="switch" id="vj-showadj" label="Show price breakdown" checked={showAdj && pct > 0} disabled={pct === 0} onChange={(e) => setShowAdj(e.target.checked)} />
                  <div className="vj-adj-s">{pct === 0 ? "Choose a percentage first." : "Shows the actual price and the increase under each price."}</div>
                </div>
              </div>
              {shownGroups.length > 0 ? (
                shownGroups.map((g) => (
                  <div key={g.parent} className="border rounded-3 mb-2 overflow-hidden">
                    <div className="d-flex align-items-center gap-2 px-3 py-2 bg-body-tertiary">
                      <Icon icon="mdi:check-circle" width="20" height="20" className="text-success flex-shrink-0" />
                      <span className="fw-semibold">{g.parent}</span>
                      <Badge bg="light" text="dark" className="border fw-normal ms-auto">{g.extra ? (g.isCurrent === false ? `Added · ${g.department}` : "Added here") : "From complaint"}</Badge>
                      {g.extra && !readOnly && (
                        <Button size="sm" variant="outline-danger" className="py-0" onClick={() => dropExtraParent(g)} aria-label="Remove this repair type"><Icon icon="mdi:close" width="16" height="16" /></Button>
                      )}
                    </div>
                    {(() => {
                      const ticked = g.children.filter((c) => isOn(c));
                      const showAll = Boolean(openGroups[g.parent]) || (ticked.length === 0 && g.children.length > 0 && !readOnly);
                      return (
                        <div className="px-3 py-2">
                          {g.children.length === 0 && <div className="small text-muted">No child types are set for this type.</div>}
                          {g.children.length > 0 && !showAll && (
                            <div className="d-flex flex-wrap gap-2">
                              {ticked.map((c) => (
                                <span key={c.id} className="d-inline-flex align-items-center gap-2 rounded-pill border border-success-subtle bg-success-subtle text-success-emphasis ps-3 pe-2 py-1 small fw-semibold">
                                  <Icon icon="mdi:check-circle" width="16" height="16" />{c.name}{c.price != null && <span className="fw-normal">{money(c.price)}</span>}
                                  {!readOnly && <button type="button" className="btn btn-sm p-0 border-0 text-success-emphasis lh-1" title="Remove from the repair list" aria-label={`Remove ${c.name}`} onClick={() => toggleChild(c)}><Icon icon="mdi:close-circle" width="18" height="18" /></button>}
                                </span>
                              ))}
                            </div>
                          )}
                          {g.children.length > 0 && showAll && (
                            <>
                              {ticked.length === 0 && <div className="small text-muted mb-2">Tick the child types that apply. Each one is added to the Repair list.</div>}
                              <Row className="g-1">
                                {g.children.map((c) => (
                                  <Col key={c.id} md={6}>
                                    <Form.Check
                                      type="checkbox"
                                      id={`rt-${c.id}`}
                                      checked={isOn(c)}
                                      disabled={readOnly}
                                      onChange={() => toggleChild(c)}
                                      label={<span className="d-inline-flex align-items-center gap-2">{c.name}{c.price != null && <Badge bg="success-subtle" text="success-emphasis" className="fw-normal">{money(c.price)}</Badge>}</span>}
                                    />
                                  </Col>
                                ))}
                              </Row>
                            </>
                          )}
                          {g.children.length > 0 && !readOnly && ticked.length > 0 && (
                            <button type="button" className="btn btn-sm btn-link p-0 mt-2 text-decoration-none fw-semibold" onClick={() => toggleGroup(g.parent)}>
                              <Icon icon={showAll ? "mdi:chevron-up" : "mdi:plus-circle-outline"} width="16" height="16" className="me-1" />
                              {showAll ? "Done" : `Add or change (${g.children.length - ticked.length} more)`}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))
              ) : (
                <Row className="g-1">
                  {data.repairTypes.map((t) => (
                    <Col key={t} md={6}><Form.Check type="checkbox" id={`rt-${t}`} label={t} checked={repairTypes.includes(t)} disabled={readOnly} onChange={() => toggleType(t)} /></Col>
                  ))}
                </Row>
              )}

              {!readOnly && addableParents.length > 0 && (() => {
                const depts = Object.entries(addableByDept).sort((a, b) => Number(b[1].current) - Number(a[1].current));
                const deptName = addDept && addableByDept[addDept] ? addDept : depts[0][0];   // default: this department
                return (
                  <div className="row g-2 mt-1">
                    <div className="col-12 col-md-5">
                      <FormSelect size="sm" aria-label="Department" value={deptName} onChange={(e) => setAddDept(e.target.value)}>
                        {depts.map(([dept, v]) => <option key={dept} value={dept}>{v.current ? `${dept} (this department)` : dept}</option>)}
                      </FormSelect>
                    </div>
                    <div className="col-12 col-md-7">
                      <FormSelect size="sm" aria-label="Add another repair type" value="" onChange={(e) => e.target.value && setExtraParents((cur) => [...cur, { parent: e.target.value, department: deptName }])}>
                        <option value="">+ Add a {deptName} repair type...</option>
                        {addableByDept[deptName].list.map((g) => <option key={g.parent} value={g.parent}>{g.parent}</option>)}
                      </FormSelect>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Repair list */}
            <Card anchor="repair" title="Repair list" icon="mdi:clipboard-list-outline" color="#16a34a" defaultOpen done={active.length > 0} summary={`${active.length} item(s) · Total ${money(repairGross)}${pct > 0 ? ` (incl. +${pct}%)` : ""}`} hint="Shown in Client Approval (Stage 9). Items can be added, removed or alternated."
              right={<span className="badge text-bg-dark fs-6 fw-semibold">Total {money(repairGross)}</span>}>
              <Table size="sm" responsive className="align-middle mb-2">
                <thead><tr><th>#</th><th>Repair item</th><th>Type</th><th className="text-end" style={{ width: 80 }}>Qty</th><th className="text-end">Unit price</th><th className="text-end">Amount</th><th /></tr></thead>
                <tbody>
                  {active.length === 0 && <tr><td colSpan={7} className="text-muted small">No repair items yet.</td></tr>}
                  {active.map((r, n) => (
                    editId === r.id ? (
                      <tr key={r.id}>
                        <td>{n + 1}</td>
                        <td><FormControl size="sm" autoComplete="off" maxLength={300} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></td>
                        <td><FormSelect size="sm" value={edit.repairType} onChange={(e) => setEdit({ ...edit, repairType: e.target.value })}><option value="">-</option>{typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}</FormSelect></td>
                        <td style={{ width: 80 }}><FormControl size="sm" type="number" min="1" step="1" className="text-end" value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: e.target.value })} /></td>
                        <td style={{ width: 130 }}><FormControl size="sm" type="number" min="0" step="0.01" className="text-end" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></td>
                        <td className="text-end fw-semibold">{money(Number(edit.qty || 1) * adjUnit(edit.amount))}</td>
                        <td className="text-nowrap"><Button size="sm" variant="success" onClick={alternate}>Replace</Button> <Button size="sm" variant="outline-secondary" onClick={() => setEditId(null)}>Cancel</Button></td>
                      </tr>
                    ) : (
                      <tr key={r.id}>
                        <td>{n + 1}</td><td>{r.description}{wOn && <div><ClaimPill on={Boolean(r.warrantyClaim)} disabled={readOnly} onChange={(v) => toggleClaim(r, v)} /></div>}</td><td className="small text-muted">{r.repairType || "-"}</td><td className="text-end">
                          {readOnly ? (r.qty || 1) : (
                            <FormControl size="sm" type="number" min="1" step="1" className="text-end vj-qty" aria-label="Quantity" value={qtyLive[r.id] ?? (r.qty || 1)}
                              onChange={(e) => setQtyLive((m) => ({ ...m, [r.id]: e.target.value }))} onBlur={() => commitQty(r)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                          )}
                        </td>
                        <td className="text-end">{claimed(r) ? <span className="text-muted text-decoration-line-through">{money(adjUnit(r.unitPrice ?? r.amount))}</span> : money(adjUnit(r.unitPrice ?? r.amount))}{pct > 0 && showAdj && !claimed(r) && (<>
                          <div className="small text-muted fw-normal text-nowrap">Actual: {money(r.unitPrice ?? r.amount)}</div>
                          <div className="small text-success fw-normal text-nowrap">+{money(adjUnit(r.unitPrice ?? r.amount) - Number(r.unitPrice ?? r.amount))} ({pct}%)</div>
                        </>)}</td>
                        <td className="text-end fw-semibold">
                          {(() => { const q = Number(qtyLive[r.id] > 0 ? qtyLive[r.id] : (r.qty || 1)); const b = Number(r.unitPrice ?? r.amount); if (claimed(r)) return <Badge bg="success">Warranty claim</Badge>; return (<>{money(q * adjUnit(b))}{pct > 0 && showAdj && <div className="small text-success fw-normal text-nowrap">+{money(q * (adjUnit(b) - b))} increase</div>}</>); })()}
                        </td>
                        <td className="text-nowrap text-end">
                          {!readOnly && (<>
                            <Button size="sm" variant="outline-primary" title="Alternate" onClick={() => { setEditId(r.id); setEdit({ description: r.description, qty: String(r.qty || 1), amount: String(r.unitPrice ?? r.amount), repairType: r.repairType || "" }); }}><Icon icon="mdi:swap-horizontal" width="16" height="16" /></Button>{" "}
                            <Button size="sm" variant="outline-danger" title="Remove" onClick={() => remove(r)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>
                          </>)}
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
                {active.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="text-end">Total</td>
                      <td className="text-end">{money(repairGross)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </Table>
              {!readOnly && (
                <Row className="g-2 align-items-center">
                  <Col md={4}><FormControl size="sm" autoComplete="off" maxLength={300} placeholder="Repair item" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Col>
                  <Col md={2}><FormSelect size="sm" value={form.repairType} onChange={(e) => setForm({ ...form, repairType: e.target.value })}><option value="">Type (optional)</option>{typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}</FormSelect></Col>
                  <Col xs={4} md={1}><FormControl size="sm" type="number" min="1" step="1" placeholder="Qty" title="Quantity" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Col>
                  <Col xs={8} md={2}><FormControl size="sm" type="number" min="0" step="0.01" placeholder="Unit price" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Col>
                  <Col md={2} className="d-grid"><Button size="sm" variant="primary" disabled={addingItem} onClick={add}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button></Col>
                </Row>
              )}
              {old.length > 0 && (
                <div className="mt-2">
                  <Button size="sm" variant="link" className="p-0" onClick={() => setShowOld(!showOld)}>{showOld ? "Hide" : "Show"} removed / replaced items ({old.length})</Button>
                  <Collapse in={showOld}>
                    <div className="small text-muted">
                      {old.map((r) => <div key={r.id}><s>{r.description}{(r.qty || 1) > 1 ? ` × ${r.qty}` : ""} · {money(r.amount)}</s> <Badge bg="light" text="dark" className="border">{r.status === "REMOVED" ? "Removed" : "Replaced"}</Badge></div>)}
                    </div>
                  </Collapse>
                </div>
              )}
            </Card>

            {/* Signature */}
            {/* Spare parts (Spare Part Review & Order is part of this window) */}
            <div data-vj="spare"><SparePartsSections jobId={jobId} readOnly={readOnly} markupPercent={pct} showAdjDetails={showAdj} warrantyOn={wOn} /></div>

            <Card anchor="sign" title="Signature of Head mechanic" icon="mdi:draw" color="#d97706" done={signed} summary={signed ? `Signed by ${data.inspection.signedByName}` : "Not signed yet"} hint={signed ? "Signed" : "Select the head mechanic, draw the signature and press Sign & complete."}>
              <div className="mb-2"><EmployeePicker value={signer} onChange={setSigner} employees={people} disabled={readOnly || signed} /></div>
              {signed
                ? (data.inspection.signatureImage ? <img src={data.inspection.signatureImage} alt="Head mechanic signature" style={{ maxWidth: "100%", height: 100, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }} /> : null)
                : <SignaturePad onChange={setSignature} disabled={readOnly} />}
            </Card>
            {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {data && !readOnly && !signed && autoState && (
          <span className="small me-auto text-muted">
            {autoState === "saving" ? "Saving…" : autoState === "pending" ? "Unsaved changes…" : autoState === "failed" ? <span className="text-danger">Auto-save failed - use Save draft</span> : <span className="text-success"><Icon icon="mdi:check" width="16" height="16" /> All changes saved</span>}
          </span>
        )}
        <Button variant="light" onClick={tryClose} disabled={saving} style={{ border: "1.5px solid #c4c4ca", color: "#111", fontWeight: 600 }}>Close</Button>
        {data && !readOnly && (
          <>
            <Button variant="outline-primary" disabled={saving} onClick={() => submit(false)}>{saving ? <Spinner size="sm" /> : null} {signed ? "Update" : "Save draft"}</Button>
            {!signed && <Button variant="success" disabled={saving} onClick={() => submit(true)}><Icon icon="mdi:draw" width="18" height="18" /> Sign &amp; complete</Button>}
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}