"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Form, FormControl, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetEmployeesQuery } from "@/store/features/apiSlice";
import { useDecideTeamReviewMutation, useGetTeamReviewQuery } from "./teamReviewApi";

// Review Team Inspection Sheet (the stage after "Team Self-Inspection"): the Department Head approves Yes / No.
//   Yes -> signature of the Department Head, the stage completes.
//   No  -> the Team Self-Inspection (Internal Inspection 2) is reopened; it comes back here until the answer is Yes.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted, reopened })
const letter = (n) => String.fromCharCode(97 + n);

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
function EmployeePicker({ value, onChange, employees, disabled, placeholder = "Select the Department Head" }) {
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

export default function TeamReviewModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetTeamReviewQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const { data: employeeRows = [] } = useGetEmployeesQuery();
  // people who have not resigned, A-Z
  const people = employeeRows
    .filter((e) => e.status !== "Resigned")
    .map((e) => ({ key: e.dbId, name: e.name, no: e.id, designation: e.designation }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const [decide, { isLoading: deciding }] = useDecideTeamReviewMutation();
  const [approved, setApproved] = useState(null);   // Yes / No
  const [note, setNote] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState("");
  const [extras, setExtras] = useState([]);          // "Need to add more option": extra review points
  const [newPoint, setNewPoint] = useState("");

  const job = data?.job;
  const done = Boolean(data?.header?.approvedAt);
  const locked = !data?.canRecord;
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });
  const addPoint = () => { const l = newPoint.trim(); if (!l) return; setExtras((x) => [...x, { label: l, checked: false }]); setNewPoint(""); };

  const submit = async () => {
    if (approved === null) return fail("Select Approved Yes or No.");
    if (approved && !signerName.trim()) return fail("Select the Department Head.");
    if (approved && people.length > 0 && !people.some((p) => p.name === signerName.trim())) return fail("Select the Department Head from the list.");
    if (approved && !signature) return fail("The Department Head must draw the signature.");
    if (!approved && !note.trim()) return fail("Enter what must be updated.");
    const c = await Swal.fire({
      title: approved ? "Approve the Team Inspection Sheet?" : "Send back to the team?",
      text: approved ? "The stage completes." : "Team Self-Inspection (Internal Inspection 2) will be reopened for the team to check and update the sheet.",
      icon: "question", showCancelButton: true, confirmButtonText: approved ? "Approve" : "Send back", confirmButtonColor: approved ? "#15803d" : "#c8102e",
    });
    if (!c.isConfirmed) return;
    try {
      const r = await decide({ jobId, approved, note, signerName, signatureImage: signature, extras }).unwrap();
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted), reopened: Boolean(r.reopened) });
      onHide();
    } catch (ex) { fail(ex?.data?.message || "Could not save the decision."); }
  };

  const list = (items, startAt = 0) => items.map((x, n) => (
    <div key={x.key} className={`tr-row ${x.checked ? "on" : "off"}`}>
      <Icon icon={x.checked ? "mdi:check-circle" : "mdi:close-circle-outline"} width="20" height="20" />
      <span className="tr-l">{letter(startAt + n)}.</span><span style={{ flex: 1 }}>{x.label}</span>
    </div>
  ));

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load the review."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="tr-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
          <div><div className="small text-muted">Review round</div><b>{data.header.round || 1}</b></div>
        </div>
        {done && (
          <Alert variant="success">
            <div className="d-flex align-items-center gap-2 fw-bold"><Icon icon="mdi:check-decagram" width="24" height="24" /> Approved · {new Date(data.header.approvedAt).toLocaleString()}</div>
            {data.header.signedByName && <div className="small mt-1">Department Head: {data.header.signedByName}</div>}
            {data.header.signatureImage && <img src={data.header.signatureImage} alt="Department Head signature" style={{ maxWidth: "100%", height: 90, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 6 }} />}
          </Alert>
        )}
        {!done && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}

        <div className="tr-card">
          <div className="tr-title"><Icon icon="mdi:clipboard-check-outline" width="20" height="20" /> Team Inspection Sheet</div>
          {list(data.sheet)}
          <div className="tr-meta">
            <div><span className="text-muted">Job card detail:</span> {data.inspection.jobCardNote || "-"}</div>
            <div><span className="text-muted">Trial:</span> {data.inspection.trialNeeded === true ? `Needed · ${data.inspection.trialPerson || "-"}` : data.inspection.trialNeeded === false ? "Not needed" : "-"}</div>
          </div>
        </div>
        <div className="tr-card">
          <div className="tr-title"><Icon icon="mdi:broom" width="20" height="20" /> Housekeeping &amp; FOD</div>
          {list(data.housekeeping)}
        </div>

        {data.rounds.length > 0 && (
          <div className="tr-card">
            <div className="tr-title"><Icon icon="mdi:history" width="20" height="20" /> Review history</div>
            {data.rounds.map((r, n) => (
              <div key={n} className="tr-hist">
                <Badge bg={r.approved ? "success" : "danger"}>{`Round ${r.round} · ${r.approved ? "Approved" : "Not approved"}`}</Badge>
                <span className="small text-muted ms-2">{new Date(r.decidedAt).toLocaleString()}{r.decidedByName ? ` · ${r.decidedByName}` : ""}</span>
                {r.note && <div className="mt-1">{r.note}</div>}
                {r.extras?.length > 0 && <ul className="mb-0 ps-3 small">{r.extras.map((e, i) => <li key={i}>{e.label}</li>)}</ul>}
              </div>
            ))}
          </div>
        )}

        {!locked && (
          <>
            <div className="tr-card">
              <div className="tr-title"><Icon icon="mdi:playlist-plus" width="20" height="20" /> Extra review points</div>
              {extras.map((e, i) => (
                <div key={i} className="d-flex align-items-center gap-2 mb-1">
                  <Form.Check type="checkbox" checked={e.checked} onChange={() => setExtras((x) => x.map((y, k) => (k === i ? { ...y, checked: !y.checked } : y)))} />
                  <span style={{ flex: 1 }}>{e.label}</span>
                  <Button size="sm" variant="outline-danger" onClick={() => setExtras((x) => x.filter((_, k) => k !== i))}><Icon icon="mdi:close" /></Button>
                </div>
              ))}
              <div className="d-flex gap-2 mt-2">
                <Form.Control value={newPoint} onChange={(e) => setNewPoint(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPoint(); } }} placeholder="Add another review point" maxLength={200} />
                <Button variant="outline-dark" onClick={addPoint}><Icon icon="mdi:plus" /> Add</Button>
              </div>
            </div>

            <div className="tr-card">
              <div className="tr-title"><Icon icon="mdi:account-check-outline" width="20" height="20" /> Approved?</div>
              <div className="d-flex flex-wrap gap-2">
                {[[true, "Yes", "mdi:check"], [false, "No", "mdi:close"]].map(([k, label, icon]) => (
                  <button key={label} type="button" className={`tr-choice ${approved === k ? (k ? "yes" : "no") : ""}`} onClick={() => setApproved(k)}><Icon icon={icon} width="18" height="18" /> {label}</button>
                ))}
              </div>
              {approved === false && (
                <div className="mt-3">
                  <Alert variant="warning" className="py-2 small">Team Self-Inspection (Internal Inspection 2) will be reopened. The team checks and updates the sheet, then it comes back here for review.</Alert>
                  <Form.Label className="small fw-semibold mb-1">What must be checked / updated</Form.Label>
                  <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
                </div>
              )}
              {approved === true && (
                <div className="mt-3">
                  <Form.Label className="small fw-semibold mb-1">Signature of Department Head</Form.Label>
                  <div className="mb-2"><EmployeePicker value={signerName} onChange={setSignerName} employees={people} placeholder="Select the Department Head" /></div>
                  <SignaturePad onChange={setSignature} />
                </div>
              )}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="tr-blur" dialogClassName="tr-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.tr-modal { --bs-modal-width: 760px; } }
        .modal-backdrop.tr-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.tr-blur.show { opacity: 1; }
        .tr-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .tr-modal .tr-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .tr-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .tr-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .tr-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
        .tr-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .tr-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .tr-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .tr-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 5px; border-radius: 10px; border: 1px solid #e5e7eb; }
        .tr-row.on { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
        .tr-row.off { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
        .tr-l { width: 20px; font-weight: 600; opacity: .7; }
        .tr-meta { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e3e3e6; display: grid; gap: 4px; }
        .tr-hist { padding: 8px 0; border-bottom: 1px solid #f0f0f2; }
        .tr-hist:last-child { border-bottom: 0; }
        .tr-choice { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 26px; border-radius: 12px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 700; }
        .tr-choice.yes { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        .tr-choice.no { border-color: #c8102e; background: #fef2f2; color: #991b1b; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="tr-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:clipboard-text-search-outline" width="30" height="30" />
          <span>Review Team Inspection Sheet{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data?.canRecord && !done && (
          <Button variant={approved === false ? "danger" : "success"} disabled={deciding || approved === null} onClick={submit}>
            {deciding ? <Spinner size="sm" /> : <Icon icon={approved === false ? "mdi:undo-variant" : "mdi:check-circle-outline"} />} {approved === false ? "Send back to the team" : "Approve & complete"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}