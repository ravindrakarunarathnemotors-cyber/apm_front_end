"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useCompleteTeamInspectionMutation, useGetTeamInspectionQuery, useSaveTeamInspectionMutation } from "./teamInspectionApi";

// Team Self-Inspection (the stage after "Job Activation"): Team Inspection Sheet + Housekeeping & FOD.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const letter = (n) => String.fromCharCode(97 + n);

export default function TeamInspectionModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetTeamInspectionQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [saveDraft, { isLoading: saving }] = useSaveTeamInspectionMutation();
  const [complete, { isLoading: completing }] = useCompleteTeamInspectionMutation();
  const [checks, setChecks] = useState([]);
  const [trialNeeded, setTrialNeeded] = useState(null);
  const [trialPerson, setTrialPerson] = useState("");
  const [jobCardNote, setJobCardNote] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    setChecks(data.header.checks || []);
    setTrialNeeded(data.header.trialNeeded);
    setTrialPerson(data.header.trialPerson || "");
    setJobCardNote(data.header.jobCardNote || "");
  }, [data]);

  const job = data?.job;
  const done = Boolean(data?.header?.completedAt);
  const locked = done || !data?.canRecord;
  const all = [...(data?.sheet || []), ...(data?.housekeeping || [])];
  const ticked = all.filter((x) => checks.includes(x.key)).length;
  const toggle = (k) => !locked && setChecks((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const tickAll = () => !locked && setChecks(all.map((x) => x.key));
  const payload = () => ({ jobId, checks, trialNeeded, trialPerson, jobCardNote });
  const fail = (ex, fb) => Swal.fire({ title: "Please check", text: ex?.data?.message || fb, icon: "error", confirmButtonColor: "#111" });

  const save = async () => {
    try { await saveDraft(payload()).unwrap(); Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false }); } catch (ex) { fail(ex, "Could not save."); }
  };
  const finish = async () => {
    if (ticked < all.length) return fail(null, `Tick all the items first (${all.length - ticked} left).`);
    if (trialNeeded === null) return fail(null, "Select whether a trial is needed.");
    if (trialNeeded && !trialPerson.trim()) return fail(null, "Enter the responsible person for the trial.");
    const c = await Swal.fire({ title: "Complete the Team Self-Inspection?", text: "The job moves to the next stage.", icon: "question", showCancelButton: true, confirmButtonText: "Complete", confirmButtonColor: "#15803d" });
    if (!c.isConfirmed) return;
    try {
      const r = await complete(payload()).unwrap();
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { fail(ex, "Could not complete the stage."); }
  };

  const group = (title, icon, list, startAt = 0) => (
    <div className="ti-card">
      <div className="ti-title"><Icon icon={icon} width="20" height="20" /> {title}</div>
      {list.map((x, n) => (
        <label key={x.key} className={`ti-row ${checks.includes(x.key) ? "on" : ""} ${locked ? "lock" : ""}`}>
          <Form.Check type="checkbox" disabled={locked} checked={checks.includes(x.key)} onChange={() => toggle(x.key)} />
          <span className="ti-l">{letter(startAt + n)}.</span>
          <span style={{ flex: 1 }}>{x.label}</span>
        </label>
      ))}
    </div>
  );

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load the Team Self-Inspection."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="ti-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
        </div>
        {data.returned && !done && (
          <Alert variant="warning">
            <div className="fw-bold d-flex align-items-center gap-2"><Icon icon="mdi:undo-variant" width="20" height="20" /> Returned by the Department Head (round {data.returned.round}) · Internal Inspection 2 reopened</div>
            {data.returned.note && <div className="mt-1">{data.returned.note}</div>}
            <div className="small mt-1">Check and update the sheet, then complete the stage again for the new review.</div>
          </Alert>
        )}
        {done && <Alert variant="success" className="d-flex align-items-center gap-2"><Icon icon="mdi:check-decagram" width="24" height="24" /> Team Self-Inspection completed · {new Date(data.header.completedAt).toLocaleString()}</Alert>}
        {!done && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}
        <div className="d-flex align-items-center gap-3 mb-3">
          <ProgressBar now={all.length ? (ticked / all.length) * 100 : 0} variant="success" style={{ flex: 1, height: 10 }} />
          <span className="small fw-semibold">{ticked} / {all.length}</span>
          {!locked && <Button size="sm" variant="outline-dark" onClick={tickAll}>Tick all</Button>}
        </div>

        {group("Team Inspection Sheet", "mdi:clipboard-check-outline", data.sheet)}

        <div className="ti-card">
          <div className="ti-title"><Icon icon="mdi:car-wrench" width="20" height="20" /> Job card and trial</div>
          <Form.Label className="small fw-semibold mb-1">Job card detail</Form.Label>
          <Form.Control as="textarea" rows={2} disabled={locked} value={jobCardNote} onChange={(e) => setJobCardNote(e.target.value)} placeholder="Job card detail / notes" maxLength={1000} />
          <div className="mt-3 small fw-semibold">h. If needed, go on a trial with the responsible person</div>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {[[true, "Trial needed", "mdi:car-arrow-right"], [false, "No trial needed", "mdi:close"]].map(([k, label, icon]) => (
              <button key={label} type="button" disabled={locked} className={`ti-choice ${trialNeeded === k ? "on" : ""}`} onClick={() => setTrialNeeded(k)}><Icon icon={icon} width="18" height="18" /> {label}</button>
            ))}
          </div>
          {trialNeeded === true && (
            <Form.Control className="mt-2" disabled={locked} value={trialPerson} onChange={(e) => setTrialPerson(e.target.value)} placeholder="Responsible person for the trial" maxLength={120} />
          )}
        </div>

        {group("Housekeeping & FOD", "mdi:broom", data.housekeeping)}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="ti-blur" dialogClassName="ti-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.ti-modal { --bs-modal-width: 760px; } }
        .modal-backdrop.ti-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.ti-blur.show { opacity: 1; }
        .ti-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .ti-modal .ti-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .ti-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .ti-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .ti-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
        .ti-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .ti-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .ti-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .ti-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 6px; border: 1.5px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all .15s; background: #fff; }
        .ti-row:hover:not(.lock) { border-color: #9ca3af; }
        .ti-row.on { border-color: #16a34a; background: #f0fdf4; }
        .ti-row.lock { cursor: default; }
        .ti-row .form-check { margin: 0; min-height: 0; }
        .ti-l { width: 20px; color: #6b7280; font-weight: 600; }
        .ti-choice { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 600; }
        .ti-choice.on { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        .ti-choice:disabled { opacity: .7; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="ti-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:clipboard-check-multiple-outline" width="30" height="30" />
          <span>Team Self-Inspection{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data?.canRecord && !done && (
          <>
            <Button variant="outline-dark" disabled={saving || completing} onClick={save}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
            <Button variant="success" disabled={completing} onClick={finish}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" />} Complete stage</Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}