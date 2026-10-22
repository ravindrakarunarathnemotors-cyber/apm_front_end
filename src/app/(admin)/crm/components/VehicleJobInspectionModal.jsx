"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Col, Collapse, Form, FormControl, FormSelect, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddInspectionFileMutation,
  useAddRepairItemMutation,
  useAlternateRepairItemMutation,
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

const Card = ({ title, hint, children, right }) => (
  <div className="bg-white border rounded-3 p-2 px-3 mb-2">
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <div>
        <div className="fw-bold">{title}</div>
        {hint && <div className="small text-muted">{hint}</div>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

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
  const [signer, setSigner] = useState("");
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
    previousRepair, newRepair, warranty, historyRemarks, repairTypes, complete, signerName: signer.trim(), signatureImage: complete ? signature : undefined,
  });

  const submit = async (complete) => {
    setError("");
    if (complete) {
      if (!testRun) return setError("Select whether a test run is necessary.");
      if (faultsFound === null) return setError("Select Record Faults or No Faults Found.");
      if (faultsFound && !faults.some((x) => x.trim())) return setError("Record at least one fault.");
      if (signer.trim().length < 2) return setError("Enter the head mechanic name.");
      if (!signature) return setError("The head mechanic must draw the signature.");
      const ok = await Swal.fire({ title: "Sign and complete?", text: `${job.jobNo}: the inspection will be signed by ${signer.trim()} and the job moves to the next stage.`, icon: "question", showCancelButton: true, confirmButtonText: "Sign & complete" });
      if (!ok.isConfirmed) return;
    }
    try {
      const res = await save(payload(complete)).unwrap();
      await Swal.fire({ title: complete ? "Inspection signed!" : "Saved!", icon: "success", timer: 1300, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(res.stageCompleted) });
      if (complete) onHide();
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
    try { await removeItem({ jobId, itemId: r.id }).unwrap(); } catch (ex) { fail(ex, "Could not remove the repair item."); }
  };
  const dropFile = async (f) => {
    const ok = await Swal.fire({ title: "Remove this file?", text: f.fileName, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (!ok.isConfirmed) return;
    try { await removeFile(f.id).unwrap(); } catch (ex) { fail(ex, "Could not remove the file."); }
  };
  const toggleType = (t) => setRepairTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <Modal show onHide={saving ? undefined : onHide} size="lg" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={false}>
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-6">
          Vehicle Job Inspection
          {job && <span className="text-muted fw-normal">{` / ${job.departmentName} Department / Open window`}</span>}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f8fafc" }}>
        {isLoading && <div className="text-center py-5"><Spinner /></div>}
        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError?.data?.message || "Could not load the inspection."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Try again</Button>
          </Alert>
        )}
        {data && (
          <>
            <div className="d-flex flex-wrap gap-3 mb-2 small">
              <span><strong>{job.jobNo}</strong></span><span>{job.regNo}</span><span className="text-muted">{job.customerName}</span>
              {signed && <Badge bg="success">Signed by {data.inspection.signedByName} · {new Date(data.inspection.signedAt).toLocaleString()}</Badge>}
            </div>
            {readOnly && <Alert variant="secondary" className="py-2">{signed ? "The head mechanic has signed this inspection. It is read-only (only an authorised user can change it)." : "You can only view this inspection now."}</Alert>}

            {/* Main / Sub concern */}
            <Concern title="Main Concern" list={data.concerns.main} extra={data.concerns.complaint} open={showMain} setOpen={setShowMain} />
            <Concern title="Sub Concern" list={data.concerns.sub} open={showSub} setOpen={setShowSub} />

            {/* Test run + faults */}
            <Card title="Test Run">
              <div className="d-flex gap-3 flex-wrap">
                <Form.Check type="radio" id="tr1" name="testrun" label="Necessary" checked={testRun === "NECESSARY"} disabled={readOnly} onChange={() => setTestRun("NECESSARY")} />
                <Form.Check type="radio" id="tr2" name="testrun" label="Not Necessary" checked={testRun === "NOT_NECESSARY"} disabled={readOnly} onChange={() => setTestRun("NOT_NECESSARY")} />
              </div>
            </Card>
            <Card title="Faults">
              <div className="d-flex gap-3 flex-wrap mb-2">
                <Form.Check type="radio" id="f1" name="faults" label="Record Faults" checked={faultsFound === true} disabled={readOnly} onChange={() => setFaultsFound(true)} />
                <Form.Check type="radio" id="f2" name="faults" label="No Faults Found" checked={faultsFound === false} disabled={readOnly} onChange={() => setFaultsFound(false)} />
              </div>
              {faultsFound === true && <LineList lines={faults} onChange={setFaults} disabled={readOnly} placeholder="Fault" />}
            </Card>

            {/* Diagnosis */}
            <Card title="Diagnosis" hint="Scanner report attached · can be shared with the other departments"
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
            <Card title="Vehicle History / ERP Check">
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
            <Card title="Select type of repair">
              <Row className="g-1">
                {data.repairTypes.map((t) => (
                  <Col key={t} md={6}><Form.Check type="checkbox" id={`rt-${t}`} label={t} checked={repairTypes.includes(t)} disabled={readOnly} onChange={() => toggleType(t)} /></Col>
                ))}
              </Row>
            </Card>

            {/* Repair list */}
            <Card title="Repair list" hint="Shown in Client Approval (Stage 9). Items can be added, removed or alternated."
              right={<div className="fw-bold">Total Repair Value: {money(data.totalRepairValue)}</div>}>
              <Table size="sm" responsive className="align-middle mb-2">
                <thead><tr><th>#</th><th>Repair item</th><th>Type</th><th className="text-end">Amount</th><th /></tr></thead>
                <tbody>
                  {active.length === 0 && <tr><td colSpan={5} className="text-muted small">No repair items yet.</td></tr>}
                  {active.map((r, n) => (
                    editId === r.id ? (
                      <tr key={r.id}>
                        <td>{n + 1}</td>
                        <td><FormControl size="sm" autoComplete="off" maxLength={300} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></td>
                        <td><FormSelect size="sm" value={edit.repairType} onChange={(e) => setEdit({ ...edit, repairType: e.target.value })}><option value="">-</option>{data.repairTypes.map((t) => <option key={t} value={t}>{t}</option>)}</FormSelect></td>
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
                  <Col md={3}><FormSelect size="sm" value={form.repairType} onChange={(e) => setForm({ ...form, repairType: e.target.value })}><option value="">Type (optional)</option>{data.repairTypes.map((t) => <option key={t} value={t}>{t}</option>)}</FormSelect></Col>
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
            <Card title="Signature of Head mechanic" hint={signed ? "Signed" : "Enter the name, draw the signature and press Sign & complete."}>
              <FormControl autoComplete="off" maxLength={100} placeholder="Head mechanic name" value={signer} disabled={readOnly || signed} onChange={(e) => setSigner(e.target.value)} className="mb-2" />
              {signed
                ? (data.inspection.signatureImage ? <img src={data.inspection.signatureImage} alt="Head mechanic signature" style={{ maxWidth: "100%", height: 100, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }} /> : null)
                : <SignaturePad onChange={setSignature} disabled={readOnly} />}
            </Card>
            {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={saving}>Close</Button>
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