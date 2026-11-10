"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useCompleteHandoverCheckMutation, useGetHandoverCheckQuery, useSaveHandoverCheckMutation } from "./handoverCheckApi";

// Handover readiness (the stage after "Job Completed"): b. property, c. keys, d. ERP, e. customer awareness,
// then "All above facts are cleared"  Yes / Need to recheck.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
export default function HandoverCheckModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetHandoverCheckQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [saveDraft, { isLoading: saving }] = useSaveHandoverCheckMutation();
  const [complete, { isLoading: completing }] = useCompleteHandoverCheckMutation();
  const [checks, setChecks] = useState([]);
  const [answer, setAnswer] = useState(null);   // "YES" | "RECHECK"
  const [note, setNote] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    setChecks(data.header.checks || []); setAnswer(data.header.answer || null); setNote(data.header.note || "");
  }, [data]);

  const job = data?.job;
  const done = Boolean(data?.header?.completedAt);
  const locked = !data?.canRecord;
  const items = data?.items || [];
  const ticked = items.filter((x) => checks.includes(x.key)).length;
  const toggle = (k) => !locked && setChecks((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });
  const letter = (key) => key.toLowerCase();

  const submit = async () => {
    if (!answer) return fail("Select Yes or Need to recheck.");
    if (answer === "RECHECK") {
      if (!note.trim()) return fail("Enter what must be rechecked.");
      try { await saveDraft({ jobId, checks, answer, note }).unwrap(); Swal.fire({ title: "Saved", text: "The stage stays open until everything is cleared.", icon: "info", timer: 1800, showConfirmButton: false }); } catch (ex) { fail(ex?.data?.message || "Could not save."); }
      return;
    }
    if (ticked < items.length) return fail(`Tick all the items first (${items.length - ticked} left).`);
    const c = await Swal.fire({ title: "All the facts are cleared?", text: "The stage completes.", icon: "question", showCancelButton: true, confirmButtonText: "Yes, complete", confirmButtonColor: "#15803d" });
    if (!c.isConfirmed) return;
    try {
      const r = await complete({ jobId, checks, answer: "YES" }).unwrap();
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { fail(ex?.data?.message || "Could not complete."); }
  };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load this stage."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="hc-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
        </div>
        {done && <Alert variant="success" className="d-flex align-items-center gap-2"><Icon icon="mdi:check-decagram" width="24" height="24" /> All the facts are cleared · {new Date(data.header.completedAt).toLocaleString()}</Alert>}
        {!done && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}
        <div className="d-flex align-items-center gap-3 mb-3">
          <ProgressBar now={items.length ? (ticked / items.length) * 100 : 0} variant="success" style={{ flex: 1, height: 10 }} />
          <span className="small fw-semibold">{ticked} / {items.length}</span>
        </div>
        <div className="hc-card">
          <div className="hc-title"><Icon icon="mdi:clipboard-check-outline" width="20" height="20" /> Before handing over the vehicle</div>
          {items.map((x) => (
            <label key={x.key} className={`hc-row ${checks.includes(x.key) ? "on" : ""} ${locked ? "lock" : ""}`}>
              <Form.Check type="checkbox" disabled={locked} checked={checks.includes(x.key)} onChange={() => toggle(x.key)} />
              <span className="hc-l">{letter(x.key)}.</span><span style={{ flex: 1 }}>{x.label}</span>
            </label>
          ))}
        </div>
        <div className="hc-card">
          <div className="hc-title"><Icon icon="mdi:help-circle-outline" width="20" height="20" /> All above facts are cleared</div>
          <div className="d-flex flex-wrap gap-2">
            {[["YES", "Yes", "mdi:check"], ["RECHECK", "Need to recheck", "mdi:refresh"]].map(([k, label, icon]) => (
              <button key={k} type="button" disabled={locked} className={`hc-choice ${answer === k ? (k === "YES" ? "yes" : "no") : ""}`} onClick={() => setAnswer(k)}><Icon icon={icon} width="18" height="18" /> {label}</button>
            ))}
          </div>
          {answer === "RECHECK" && (
            <div className="mt-3">
              <Form.Label className="small fw-semibold mb-1">What must be rechecked</Form.Label>
              <Form.Control as="textarea" rows={2} disabled={locked} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="hc-blur" dialogClassName="hc-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.hc-modal { --bs-modal-width: 700px; } }
        .modal-backdrop.hc-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.hc-blur.show { opacity: 1; }
        .hc-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .hc-modal .hc-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .hc-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .hc-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .hc-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
        .hc-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .hc-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .hc-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .hc-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 6px; border: 1.5px solid #e5e7eb; border-radius: 12px; cursor: pointer; background: #fff; transition: all .15s; }
        .hc-row:hover:not(.lock) { border-color: #9ca3af; }
        .hc-row.on { border-color: #16a34a; background: #f0fdf4; }
        .hc-row.lock { cursor: default; }
        .hc-row .form-check { margin: 0; min-height: 0; }
        .hc-l { width: 20px; color: #6b7280; font-weight: 600; }
        .hc-choice { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 22px; border-radius: 12px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 700; }
        .hc-choice.yes { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        .hc-choice.no { border-color: #d97706; background: #fffbeb; color: #92400e; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="hc-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:car-key" width="30" height="30" />
          <span>Handover Readiness{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data?.canRecord && !done && (
          <Button variant={answer === "RECHECK" ? "warning" : "success"} disabled={saving || completing || !answer} onClick={submit}>
            {saving || completing ? <Spinner size="sm" /> : <Icon icon={answer === "RECHECK" ? "mdi:content-save-outline" : "mdi:check-circle-outline"} />} {answer === "RECHECK" ? "Save (recheck)" : "Complete stage"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}