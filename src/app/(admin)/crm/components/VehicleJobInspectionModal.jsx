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
  useRemoveInspectionFileMutation,
  useRemoveRepairItemMutation,
  useSaveJobInspectionMutation,
} from "@/store/features/apiSlice";

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
function YesNo({ value, onChange, disabled }) {
  return (
    <div className="btn-group" role="group">
      {[[true, "Yes"], [false, "No"]].map(([v, t]) => (
        <Button key={t} size="sm" variant={value === v ? (v ? "success" : "secondary") : "outline-secondary"} disabled={disabled} onClick={() => onChange(value === v ? null : v)}>{t}</Button>
      ))}
    </div>
  );
}

// One collapsible section: coloured icon, title, a short summary and a done tick. Click the header to open / close.
function Card({ title, hint, children, right, icon = "mdi:clipboard-text-outline", color = "#2563eb", summary, done, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-3 mb-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,.07)", borderLeft: `4px solid ${color}` }}>
      <div className="d-flex flex-wrap align-items-center gap-2 p-2 px-3" role="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ background: open ? `color-mix(in srgb, ${color} 7%, white)` : "#fff", borderRadius: open ? "0.45rem 0.45rem 0 0" : "0.45rem" }}>
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
          <Icon icon={icon} width="20" height="20" />
        </span>
        <div className="me-auto" style={{ minWidth: 150 }}>
          <div className="fw-bold d-flex align-items-center gap-2">
            {title}
            {done === true && <Icon icon="mdi:check-circle" width="18" height="18" className="text-success" />}
          </div>
          {hint && open && <div className="small text-muted">{hint}</div>}
          {summary ? <div className="small text-muted">{summary}</div> : null}
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" className="text-muted flex-shrink-0" />
      </div>
      <Collapse in={open}>
        <div><div className="p-3 border-top">{children}</div></div>
      </Collapse>
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
  const [extraParents, setExtraParents] = useState([]); // repair types added here (not picked in the complaint stage)
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
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", repairType: "" }); // new repair line
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ description: "", amount: "", repairType: "" }); // alternate line
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
      if (!fromComplaint.has(parent) && (data.repairTree || []).some((g) => g.parent === parent) && !extras.includes(parent)) extras.push(parent);
    });
    setExtraParents(extras);
    setInitDone(true);
    setSigner(i?.signedByName || "");
  }, [data]);

  const job = data?.job;
  const readOnly = data && !data.canRecord;
  const signed = Boolean(data?.signed);
  const active = (data?.repairItems || []).filter((r) => r.status === "ACTIVE");
  const old = (data?.repairItems || []).filter((r) => r.status !== "ACTIVE");
  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });

  const payload = (complete) => ({
    jobId, testRun, faultsFound, faults, identifiedFaults: identified, rootCauses: roots,
    previousRepair, newRepair, warranty, historyRemarks,
    // the parent types picked in the complaint stage are always included
    repairTypes: [...new Set([...shownGroups.map((g) => g.parent), ...repairTypes])],
    complete, signerName: signer.trim(), signatureImage: complete ? signature : undefined,
  });

  const submit = async (complete) => {
    setError("");
    if (complete) {
      if (!testRun) return setError("Select whether a test run is necessary.");
      if (faultsFound === null) return setError("Select Record Faults or No Faults Found.");
      if (faultsFound && !faults.some((x) => x.trim())) return setError("Record at least one fault.");
      if (signer.trim().length < 2) return setError("Select the head mechanic.");
      if (people.length > 0 && !people.some((p) => p.name === signer.trim())) return setError("Select the head mechanic from the list.");
      if (!signature) return setError("The head mechanic must draw the signature.");
      const ok = await Swal.fire({ title: "Sign and complete?", text: `${job.jobNo}: the inspection will be signed by ${signer.trim()} and the job moves to the next stage.`, icon: "question", showCancelButton: true, confirmButtonText: "Sign & complete" });
      if (!ok.isConfirmed) return;
    }
    try {
      const res = await save(payload(complete)).unwrap();
      snapRef.current = currentKey;
      await Swal.fire({ title: complete ? "Inspection signed!" : "Saved!", icon: "success", timer: 1300, showConfirmButton: false });
      // "Update" of an already signed inspection also moves on: the window closes and the next stage (Spare Part Review & Order) opens
      const goNext = complete || signed;
      onSaved?.({ jobId, stageCompleted: Boolean(res.stageCompleted) || goNext });
      if (goNext) onHide();
    } catch (ex) {
      setError(ex?.data?.message || "Failed to save the inspection.");
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

  const itemOf = (f) => ({ description: f.description.trim(), amount: Number(f.amount || 0), repairType: f.repairType || undefined });
  const checkItem = (f) => (!f.description.trim() ? "Enter the repair item." : f.amount !== "" && !(Number(f.amount) >= 0) ? "Enter a valid amount." : "");

  const add = async () => {
    const p = checkItem(form); if (p) return setError(p);
    setError("");
    try { await addItem({ jobId, ...itemOf(form) }).unwrap(); setForm({ description: "", amount: "", repairType: "" }); } catch (ex) { fail(ex, "Could not add the repair item."); }
  };
  const alternate = async () => {
    const p = checkItem(edit); if (p) return setError(p);
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
  const toggleType = (t) => setRepairTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  // Parent types shown in "Select type of repair": the ones from the complaint + the ones added here
  const complaintGroups = data?.repairGroups || [];
  const shownGroups = [
    ...complaintGroups.map((g) => ({ ...g, extra: false })),
    ...extraParents.map((n) => (data?.repairTree || []).find((g) => g.parent === n)).filter(Boolean).map((g) => ({ ...g, extra: true })),
  ];
  const addableParents = (data?.repairTree || []).filter((g) => !shownGroups.some((x) => x.parent === g.parent));
  const typeOptions = shownGroups.length ? shownGroups.flatMap((g) => [g.parent, ...g.children.map((c) => c.label)]) : data?.repairTypes || [];

  // the form content without "complete" / signature image: used to know if there is anything unsaved
  const draftKey = () => { const { complete, signatureImage, ...rest } = payload(false); return JSON.stringify(rest); };
  const currentKey = initDone ? draftKey() : null;
  useEffect(() => { if (initDone && snapRef.current === null) snapRef.current = currentKey; });   // first render after the form is filled

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
      try { await save(payload(false)).unwrap(); snapRef.current = currentKey; onSaved?.({ jobId, stageCompleted: false }); onHide(); }
      catch (ex) { setError(ex?.data?.message || "Failed to save the inspection."); }
    } else if (r.isDenied) onHide();
  };

  // A child type ticked -> a line (child name + labour price) is added to the Repair list; unticked -> that line is removed.
  const lineOf = (c) => active.filter((r) => r.repairType === c.label && r.description === c.name);
  const toggleChild = async (c) => {
    const on = repairTypes.includes(c.label);
    toggleType(c.label);
    try {
      if (!on) {
        if (lineOf(c).length === 0) await addItem({ jobId, description: c.name, amount: Number(c.price || 0), repairType: c.label }).unwrap();
      } else {
        for (const r of lineOf(c)) await removeItem({ jobId, itemId: r.id }).unwrap();
      }
    } catch (ex) { fail(ex, "Could not update the repair list."); }
  };
  const dropExtraParent = async (g) => {
    const ok = await Swal.fire({ title: "Remove this repair type?", text: `${g.parent} and its repair list lines will be removed.`, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (!ok.isConfirmed) return;
    try {
      for (const c of g.children) { if (repairTypes.includes(c.label)) await toggleChildOff(c); }
      setExtraParents((cur) => cur.filter((n) => n !== g.parent));
    } catch (ex) { fail(ex, "Could not remove the repair type."); }
  };
  const toggleChildOff = async (c) => {
    setRepairTypes((cur) => cur.filter((x) => x !== c.label));
    for (const r of lineOf(c)) await removeItem({ jobId, itemId: r.id }).unwrap();
  };

  return (
    <Modal show onHide={saving ? undefined : tryClose} size="xl" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={false}>
      <Modal.Header closeButton={!saving} className="border-0 pb-0">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white" style={{ width: 44, height: 44, background: "#2563eb" }}>
            <Icon icon="mdi:car-wrench" width="26" height="26" />
          </span>
          <span>
            Vehicle Job Inspection
            {job && <span className="text-muted fw-normal">{` / ${job.departmentName} Department`}</span>}
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f1f5f9" }}>
        {isLoading && <div className="text-center py-5"><Spinner /></div>}
        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError?.data?.message || "Could not load the inspection."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Try again</Button>
          </Alert>
        )}
        {data && (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 px-3 bg-white rounded-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,.07)" }}>
              <span className="fw-bold"><Icon icon="mdi:briefcase-outline" width="18" height="18" className="me-1 text-muted" />{job.jobNo}</span>
              <span><Icon icon="mdi:car-outline" width="18" height="18" className="me-1 text-muted" />{job.regNo}</span>
              <span className="text-muted"><Icon icon="mdi:account-outline" width="18" height="18" className="me-1" />{job.customerName}</span>
              <span className="ms-auto d-flex flex-wrap gap-2">
                <Badge bg="light" text="dark" className="border fw-normal">{active.length} repair item(s)</Badge>
                <Badge bg="success-subtle" text="success-emphasis" className="fw-semibold">{money(data.totalRepairValue)}</Badge>
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
            <Card title="Test Run" icon="mdi:speedometer" color="#2563eb" defaultOpen done={!!testRun} summary={testRun ? (testRun === "NECESSARY" ? "Necessary" : "Not necessary") : "Not answered yet"}>
              <div className="d-flex gap-3 flex-wrap">
                <Form.Check type="radio" id="tr1" name="testrun" label="Necessary" checked={testRun === "NECESSARY"} disabled={readOnly} onChange={() => setTestRun("NECESSARY")} />
                <Form.Check type="radio" id="tr2" name="testrun" label="Not Necessary" checked={testRun === "NOT_NECESSARY"} disabled={readOnly} onChange={() => setTestRun("NOT_NECESSARY")} />
              </div>
            </Card>
            <Card title="Faults" icon="mdi:alert-octagon-outline" color="#dc2626" defaultOpen done={faultsFound !== null} summary={faultsFound === true ? `${faults.filter((x) => x.trim()).length} fault(s) recorded` : faultsFound === false ? "No faults found" : "Not answered yet"}>
              <div className="d-flex gap-3 flex-wrap mb-2">
                <Form.Check type="radio" id="f1" name="faults" label="Record Faults" checked={faultsFound === true} disabled={readOnly} onChange={() => setFaultsFound(true)} />
                <Form.Check type="radio" id="f2" name="faults" label="No Faults Found" checked={faultsFound === false} disabled={readOnly} onChange={() => setFaultsFound(false)} />
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
            <Card title="Select type of repair" icon="mdi:wrench-cog-outline" color="#ea580c" defaultOpen done={repairTypes.some((t) => String(t).includes(" > "))} summary={`${shownGroups.length} type(s) · ${repairTypes.filter((t) => String(t).includes(" > ")).length} child type(s) ticked`} hint={shownGroups.length ? "The types from the complaint are selected for you. Tick the child types that apply: each one is added to the Repair list with its price." : undefined}>
              {shownGroups.length > 0 ? (
                shownGroups.map((g) => (
                  <div key={g.parent} className="border rounded-3 mb-2 overflow-hidden">
                    <div className="d-flex align-items-center gap-2 px-3 py-2 bg-body-tertiary">
                      <Icon icon="mdi:check-circle" width="20" height="20" className="text-success flex-shrink-0" />
                      <span className="fw-semibold">{g.parent}</span>
                      <Badge bg="light" text="dark" className="border fw-normal ms-auto">{g.extra ? "Added here" : "From complaint"}</Badge>
                      {g.extra && !readOnly && (
                        <Button size="sm" variant="outline-danger" className="py-0" onClick={() => dropExtraParent(g)} aria-label="Remove this repair type"><Icon icon="mdi:close" width="16" height="16" /></Button>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      {g.children.length === 0 && <div className="small text-muted">No child types are set for this type.</div>}
                      <Row className="g-1">
                        {g.children.map((c) => (
                          <Col key={c.id} md={6}>
                            <Form.Check
                              type="checkbox"
                              id={`rt-${c.id}`}
                              checked={repairTypes.includes(c.label)}
                              disabled={readOnly}
                              onChange={() => toggleChild(c)}
                              label={<span className="d-inline-flex align-items-center gap-2">{c.name}{c.price != null && <Badge bg="success-subtle" text="success-emphasis" className="fw-normal">{money(c.price)}</Badge>}</span>}
                            />
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                ))
              ) : (
                <Row className="g-1">
                  {data.repairTypes.map((t) => (
                    <Col key={t} md={6}><Form.Check type="checkbox" id={`rt-${t}`} label={t} checked={repairTypes.includes(t)} disabled={readOnly} onChange={() => toggleType(t)} /></Col>
                  ))}
                </Row>
              )}

              {!readOnly && addableParents.length > 0 && (
                <FormSelect size="sm" className="mt-2" value="" aria-label="Add another repair type" onChange={(e) => e.target.value && setExtraParents((cur) => [...cur, e.target.value])}>
                  <option value="">+ Add another repair type...</option>
                  {addableParents.map((g) => <option key={g.parent} value={g.parent}>{g.parent}</option>)}
                </FormSelect>
              )}
            </Card>

            {/* Repair list */}
            <Card title="Repair list" icon="mdi:clipboard-list-outline" color="#16a34a" defaultOpen done={active.length > 0} summary={`${active.length} item(s) · Total ${money(data.totalRepairValue)}`} hint="Shown in Client Approval (Stage 9). Items can be added, removed or alternated."
              right={<span className="badge text-bg-success fs-6 fw-semibold">Total {money(data.totalRepairValue)}</span>}>
              <Table size="sm" responsive className="align-middle mb-2">
                <thead><tr><th>#</th><th>Repair item</th><th>Type</th><th className="text-end">Amount</th><th /></tr></thead>
                <tbody>
                  {active.length === 0 && <tr><td colSpan={5} className="text-muted small">No repair items yet.</td></tr>}
                  {active.map((r, n) => (
                    editId === r.id ? (
                      <tr key={r.id}>
                        <td>{n + 1}</td>
                        <td><FormControl size="sm" autoComplete="off" maxLength={300} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></td>
                        <td><FormSelect size="sm" value={edit.repairType} onChange={(e) => setEdit({ ...edit, repairType: e.target.value })}><option value="">-</option>{typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}</FormSelect></td>
                        <td style={{ width: 120 }}><FormControl size="sm" type="number" min="0" step="0.01" className="text-end" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></td>
                        <td className="text-nowrap"><Button size="sm" variant="success" onClick={alternate}>Replace</Button> <Button size="sm" variant="outline-secondary" onClick={() => setEditId(null)}>Cancel</Button></td>
                      </tr>
                    ) : (
                      <tr key={r.id}>
                        <td>{n + 1}</td><td>{r.description}</td><td className="small text-muted">{r.repairType || "-"}</td><td className="text-end">{money(r.amount)}</td>
                        <td className="text-nowrap text-end">
                          {!readOnly && (<>
                            <Button size="sm" variant="outline-primary" title="Alternate" onClick={() => { setEditId(r.id); setEdit({ description: r.description, amount: String(r.amount), repairType: r.repairType || "" }); }}><Icon icon="mdi:swap-horizontal" width="16" height="16" /></Button>{" "}
                            <Button size="sm" variant="outline-danger" title="Remove" onClick={() => remove(r)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>
                          </>)}
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </Table>
              {!readOnly && (
                <Row className="g-2 align-items-center">
                  <Col md={5}><FormControl size="sm" autoComplete="off" maxLength={300} placeholder="Repair item" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Col>
                  <Col md={3}><FormSelect size="sm" value={form.repairType} onChange={(e) => setForm({ ...form, repairType: e.target.value })}><option value="">Type (optional)</option>{typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}</FormSelect></Col>
                  <Col md={2}><FormControl size="sm" type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Col>
                  <Col md={2} className="d-grid"><Button size="sm" variant="primary" disabled={addingItem} onClick={add}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button></Col>
                </Row>
              )}
              {old.length > 0 && (
                <div className="mt-2">
                  <Button size="sm" variant="link" className="p-0" onClick={() => setShowOld(!showOld)}>{showOld ? "Hide" : "Show"} removed / replaced items ({old.length})</Button>
                  <Collapse in={showOld}>
                    <div className="small text-muted">
                      {old.map((r) => <div key={r.id}><s>{r.description} · {money(r.amount)}</s> <Badge bg="light" text="dark" className="border">{r.status === "REMOVED" ? "Removed" : "Replaced"}</Badge></div>)}
                    </div>
                  </Collapse>
                </div>
              )}
            </Card>

            {/* Signature */}
            <Card title="Signature of Head mechanic" icon="mdi:draw" color="#d97706" done={signed} summary={signed ? `Signed by ${data.inspection.signedByName}` : "Not signed yet"} hint={signed ? "Signed" : "Select the head mechanic, draw the signature and press Sign & complete."}>
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
        <Button variant="outline-secondary" onClick={tryClose} disabled={saving}>Close</Button>
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