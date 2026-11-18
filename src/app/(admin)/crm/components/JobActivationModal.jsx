"use client";

import { useState } from "react";
import { Alert, Button, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useActivateJobMutation, useGetJobActivationQuery } from "./jobActivationApi";
import CancelJobModal from "./CancelJobModal";   // Cancel job (reason + optional inspection fee)

// Job Activation (the stage after "Internal Inspection - 1"): "Are you fully aware of this job?" -> Yes -> the job officially starts.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// estimate time is saved as decimal hours (1.5 = 1 hr 30 min)
const fmtTime = (hours, days) => {
  const t = Number(hours) || 0; let h = Math.floor(t + 1e-6); let m = Math.round((t - h) * 60); if (m >= 60) { h += 1; m = 0; }
  const d = Number(days) || 0;
  return [d > 0 ? `${d} Day${d === 1 ? "" : "s"}` : "", h > 0 ? `${h} Hrs` : "", m > 0 ? `${m} Min` : ""].filter(Boolean).join(" ");
};

const Fact = ({ icon, label, children, wide, hot }) => (
  <div className={wide ? "col-12" : "col-12 col-sm-6"}>
    <div className={`ja-tile ${hot ? "hot" : ""}`}>
      <span className="ja-ico"><Icon icon={icon} width="22" height="22" /></span>
      <div className="min-w-0"><div className="ja-lb">{label}</div><div className="ja-vl">{children}</div></div>
    </div>
  </div>
);

export default function JobActivationModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetJobActivationQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [activate, { isLoading: activating }] = useActivateJobMutation();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setErrorState] = useState("");
  const setError = (m) => { setErrorState(m); if (m) Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonText: "OK", confirmButtonColor: "#111" }); };
  const job = data?.job, ap = data?.approval;
  const activated = Boolean(data?.header?.activatedAt);

  const yes = async () => {
    setError("");
    try {
      const r = await activate(jobId).unwrap();
      await Swal.fire({ title: "OFFICIALLY JOB STARTS", text: `${job.jobNo} · ${job.regNo}`, icon: "success", confirmButtonText: "OK" });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { setError(ex?.data?.message || "Could not start the job."); }
  };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load the Job Activation."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="bg-white rounded-3 p-3 mb-3 d-flex flex-wrap gap-4 align-items-center" style={{ border: "1px solid #e3e3e6", borderLeft: "5px solid #c8102e", boxShadow: "0 4px 14px -10px rgba(15,23,42,.45)" }}>
          <div><div className="small text-muted">Job</div><span className="ja-jobno">{job.jobNo}</span></div>
          <div><div className="small text-muted">Vehicle</div><span className="ja-plate">{job.regNo}</span></div>
          <div><div className="small text-muted">Customer</div><div className="fw-bold">{job.customerName}</div></div>
        </div>

        <div className="ja-sec">Job summary</div>
        <div className="row g-2 mb-3">
          <Fact icon="mdi:cash-multiple" label="Estimated total" hot>{money(ap?.estimatedTotal)}</Fact>
          <Fact icon="mdi:timer-outline" label="Estimated time of repair">{ap ? (fmtTime(ap.estHours, ap.estDays) || "-") : "-"}</Fact>
          <Fact icon="mdi:account-check-outline" label="Customer confirmation">
            {ap?.decision === "TOTAL" ? "Total approved" : ap?.decision === "PARTIAL" ? "Agreed scope only" : "-"}
            {ap?.decision === "PARTIAL" && ap.agreedScope?.length > 0 && <ul className="mb-0 ps-3 fw-normal small">{ap.agreedScope.map((x, n) => <li key={n}>{x}</li>)}</ul>}
          </Fact>
          <Fact icon="mdi:cog-transfer-outline" label="Spare parts">{ap?.partsBy === "CLIENT" ? "Provided by the customer" : ap?.partsBy === "COMPANY" ? `Provided by the company · ${data.partsCount} part(s)` : "-"}</Fact>
          {ap?.extraNote && <Fact wide icon="mdi:note-text-outline" label="Extra note">{ap.extraNote}</Fact>}
          {data.inspectionNotes && <Fact wide icon="mdi:clipboard-list-outline" label="Internal inspection notes">{data.inspectionNotes}</Fact>}
        </div>

        {activated ? (
          <div className="ja-done">
            <Icon icon="mdi:check-decagram" width="44" height="44" />
            <div><div className="fs-5 fw-bold">OFFICIALLY JOB STARTED</div><div className="small">{new Date(data.header.activatedAt).toLocaleString()}{data.header.activatedByName ? ` · ${data.header.activatedByName}` : ""}</div></div>
          </div>
        ) : !data.canRecord ? (
          <Alert variant="info" className="mb-0">This job has not reached this stage yet.</Alert>
        ) : (
          <div className="ja-cta">
            <span className="ja-rocket"><Icon icon="mdi:rocket-launch-outline" width="34" height="34" /></span>
            <div className="fs-4 fw-bold mb-1">Are you fully aware of this job?</div>
            <div className="text-muted mb-3">Check the summary above. Once you confirm, the job officially starts.</div>
            <Button className="ja-yes" disabled={activating} onClick={yes}>
              {activating ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" width="26" height="26" />} Yes, I am aware · Start the job
            </Button>
            <div className="mt-3"><Button variant="outline-danger" className="ja-cancel" onClick={() => setCancelOpen(true)}><Icon icon="mdi:cancel" width="18" height="18" /> Cancel this job</Button></div>
          </div>
        )}
        {error && <Alert variant="danger" className="py-2 mt-3 mb-0">{error}</Alert>}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} dialogClassName="ja-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.ja-modal { --bs-modal-width: 760px; } }
        .ja-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
        .ja-modal .ja-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .ja-modal .modal-body { background: #f6f6f7 !important; padding: 18px 22px; }
        .ja-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 22px; }
        .ja-modal .modal-footer .btn { min-height: 46px; padding: 0 24px; border-radius: 12px; }
        .ja-modal .ja-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 3px 10px; font-weight: 700; font-size: .85rem; box-shadow: inset 3px 0 0 #c8102e; }
        .ja-modal .ja-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; }
        .ja-modal .ja-sec { font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #c8102e; margin: 2px 0 8px; }
        .ja-modal .ja-tile { display: flex; gap: 12px; align-items: center; background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 12px 14px; height: 100%; }
        .ja-modal .ja-tile.hot { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); border: 0; color: #fff; }
        .ja-modal .ja-ico { width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fde8ea; color: #c8102e; }
        .ja-modal .ja-tile.hot .ja-ico { background: rgba(255,255,255,.18); color: #fff; }
        .ja-modal .ja-lb { font-size: .75rem; color: #6b7280; }
        .ja-modal .ja-tile.hot .ja-lb { color: rgba(255,255,255,.75); }
        .ja-modal .ja-vl { font-weight: 700; word-break: break-word; }
        .ja-modal .ja-tile.hot .ja-vl { font-size: 1.4rem; font-weight: 800; }
        .ja-modal .ja-cta { background: #fff; border: 1.5px dashed #c8102e; border-radius: 18px; padding: 24px 18px; text-align: center; }
        .ja-modal .ja-rocket { width: 66px; height: 66px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #fde8ea; color: #c8102e; margin-bottom: 10px; }
        .ja-modal .ja-yes { width: 100%; max-width: 440px; min-height: 58px; border: 0 !important; border-radius: 14px; font-size: 1.1rem; font-weight: 800; color: #fff !important; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -4px 0 #c8102e, 0 12px 22px -12px rgba(0,0,0,.7); display: inline-flex; align-items: center; justify-content: center; gap: 10px; }
        .ja-modal .ja-yes:hover:not(:disabled) { filter: brightness(1.25); }
        .ja-modal .ja-cancel { border-radius: 10px; border-width: 1.5px; font-weight: 600; }
        .ja-modal .ja-done { display: flex; align-items: center; gap: 14px; border-radius: 16px; padding: 18px 20px; color: #fff; background: linear-gradient(135deg,#052e16,#15803d 60%,#22c55e); }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="ja-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:rocket-launch-outline" width="30" height="30" />
          <span>Job Activation{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f6f6f7" }}>{body()}</Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", color: "#111", fontWeight: 600 }}>Close</Button></Modal.Footer>
      {cancelOpen && job && <CancelJobModal job={{ ...job, id: jobId }} onHide={() => setCancelOpen(false)} onCancelled={() => { onSaved?.({ jobId, stageCompleted: false }); onHide(); }} />}
    </Modal>
  );
}