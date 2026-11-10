"use client";

import { useState } from "react";
import { Alert, Badge, Button, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import JobDetailsModal from "./JobDetailsModal";
import { useConfirmJobCardCopyMutation, useEndJobMutation, useGetJobEndQuery } from "./jobEndApi";

// Job Completed / Copy job card to Account Department (the stage after "Transfer to Other Departments").
//   1) Are you sure that you want to end this job?  Yes -> Job Completed
//   2) Are you sure that you need to copy the job card to the Account Department? (check the soft copy before sending it)  Yes -> Confirmed
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
export default function JobEndModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetJobEndQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [endJob, { isLoading: ending }] = useEndJobMutation();
  const [confirmCopy, { isLoading: confirming }] = useConfirmJobCardCopyMutation();
  const [copyYes, setCopyYes] = useState(false);   // step 2: Yes chosen -> the Confirmed button appears
  const [viewCard, setViewCard] = useState(false);  // soft copy of the job card

  const job = data?.job;
  const ended = Boolean(data?.header?.endedAt);
  const copied = Boolean(data?.header?.copiedAt);
  const fail = (ex, fb) => Swal.fire({ title: "Please check", text: ex?.data?.message || fb, icon: "error", confirmButtonColor: "#111" });

  const doEnd = async () => {
    try { await endJob(jobId).unwrap(); } catch (ex) { fail(ex, "Could not end the job."); }
  };
  const doConfirm = async () => {
    try {
      const r = await confirmCopy(jobId).unwrap();
      await Swal.fire({ title: "Confirmed", text: "The job card is copied to the Account Department.", icon: "success", timer: 1800, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { fail(ex, "Could not confirm."); }
  };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load this stage."}</Alert>;
    if (!data) return null;
    const locked = !data.canRecord;
    return (
      <>
        <div className="je-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
        </div>
        {!copied && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}

        <div className="je-card">
          <div className="je-title"><Icon icon="mdi:flag-checkered" width="20" height="20" /> End this job</div>
          <div className="fs-5 fw-semibold mb-3">Are you sure that you want to end this job?</div>
          {ended ? (
            <div className="je-done"><Icon icon="mdi:check-decagram" width="30" height="30" /> <div><div className="fw-bold fs-5">Job Completed</div><div className="small">{new Date(data.header.endedAt).toLocaleString()}{data.header.endedByName ? ` · ${data.header.endedByName}` : ""}</div></div></div>
          ) : (
            <Button variant="success" size="lg" disabled={locked || ending} onClick={doEnd}>{ending ? <Spinner size="sm" /> : <Icon icon="mdi:check" />} Yes</Button>
          )}
        </div>

        <div className={`je-card ${ended ? "" : "je-muted"}`} aria-disabled={!ended}>
          <div className="je-title"><Icon icon="mdi:file-send-outline" width="20" height="20" /> Job card to Account Department</div>
          <div className="fs-5 fw-semibold">Are you sure that you need to Copy Job Card to Account Department ?</div>
          <div className="text-muted mb-3">(Check soft copy before sending it)</div>
          {copied ? (
            <div className="je-done"><Icon icon="mdi:check-decagram" width="30" height="30" /> <div><div className="fw-bold fs-5">Confirmed</div><div className="small">{new Date(data.header.copiedAt).toLocaleString()}{data.header.copiedByName ? ` · ${data.header.copiedByName}` : ""}</div></div></div>
          ) : (
            <>
              <Button variant="outline-dark" className="mb-3" onClick={() => setViewCard(true)}><Icon icon="mdi:eye-outline" /> View job card (soft copy)</Button>
              <div className="d-flex gap-2 flex-wrap">
                <button type="button" disabled={!ended || locked} className={`je-choice ${copyYes ? "yes" : ""}`} onClick={() => setCopyYes(true)}>Yes</button>
                <button type="button" disabled={!ended || locked} className="je-choice" onClick={() => setCopyYes(false)}>Cancel</button>
              </div>
              {copyYes && (
                <div className="mt-3">
                  <div className="small text-muted mb-2">If yes, please click Confirmed.</div>
                  <Button variant="success" size="lg" disabled={confirming} onClick={doConfirm}>{confirming ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" />} Confirmed</Button>
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="je-blur" dialogClassName="je-modal">
        <style>{`
          @media (min-width: 768px) { .modal-dialog.je-modal { --bs-modal-width: 680px; } }
          .modal-backdrop.je-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
          .modal-backdrop.je-blur.show { opacity: 1; }
          .je-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
          .je-modal .je-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
          .je-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
          .je-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
          .je-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
          .je-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
          .je-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; }
          .je-muted { opacity: .4; filter: grayscale(.7); pointer-events: none; user-select: none; }
          .je-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
          .je-done { display: flex; align-items: center; gap: 12px; border-radius: 14px; padding: 14px 16px; color: #fff; background: linear-gradient(135deg,#052e16,#15803d 60%,#22c55e); }
          .je-choice { min-width: 90px; min-height: 46px; padding: 0 22px; border-radius: 12px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 700; }
          .je-choice.yes { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        `}</style>
        <Modal.Header closeButton closeVariant="white" className="je-head">
          <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
            <Icon icon="mdi:flag-checkered" width="30" height="30" />
            <span>Job Completed{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>{body()}</Modal.Body>
        <Modal.Footer><Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button></Modal.Footer>
      </Modal>
      {viewCard && <JobDetailsModal jobId={jobId} onHide={() => setViewCard(false)} />}
    </>
  );
}