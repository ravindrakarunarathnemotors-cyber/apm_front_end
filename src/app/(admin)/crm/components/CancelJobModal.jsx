"use client";

import { useRef, useState } from "react";
import { Button, Form, FormControl, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useCancelJobMutation } from "./jobCancelApi";

// "Cancel job" (Job Activation stage): the reason is typed, an inspection fee is optional.
//  - with a fee    -> the job invoice holds ONLY the inspection fee (the repair / parts lines are dropped)
//  - without a fee -> the invoice is cancelled
// The cancellation is recorded (reason, fee, who, when).
// Props: job { id, jobNo, regNo, customerName }, onHide, onCancelled?()
const money = (n) => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CancelJobModal({ job, onHide, onCancelled }) {
  const [cancelJob, { isLoading }] = useCancelJobMutation();
  const [reason, setReason] = useState("");
  const [charge, setCharge] = useState(false);
  const [fee, setFee] = useState("");
  const [bad, setBad] = useState("");               // which field is wrong (red border)
  const reasonRef = useRef(null), feeRef = useRef(null);
  const feeNum = charge ? Number(fee) : 0;

  const problem = async (msg, field) => {
    setBad(field);
    await Swal.fire({ title: "Please check", text: msg, icon: "error", confirmButtonText: "OK", confirmButtonColor: "#111" });
    (field === "reason" ? reasonRef : feeRef).current?.focus();
  };

  const submit = async () => {
    if (reason.trim().length < 3) return problem("Type the reason for cancelling the job.", "reason");
    if (charge && !(feeNum > 0)) return problem("Enter the inspection fee, or untick the inspection fee.", "fee");
    setBad("");
    const ok = await Swal.fire({
      title: `Cancel ${job.jobNo}?`,
      html: charge
        ? `The job invoice will be marked <b>CANCELLED</b> (kept for the record) and a new invoice is created for the <b>inspection fee: LKR ${money(feeNum)}</b>.`
        : "There is <b>no inspection fee</b>. The job invoice will be marked <b>CANCELLED</b> and nothing is charged.",
      icon: "warning", showCancelButton: true, confirmButtonText: "Yes, cancel the job", cancelButtonText: "Keep the job", confirmButtonColor: "#c8102e",
    });
    if (!ok.isConfirmed) return;
    try {
      await cancelJob({ jobId: job.id, reason: reason.trim(), inspectionFee: charge ? feeNum : 0 }).unwrap();
      await Swal.fire({ title: "Job cancelled", text: "The cancellation is recorded.", icon: "success", timer: 1600, showConfirmButton: false });
      onCancelled?.();
      onHide();
    } catch (ex) { Swal.fire({ title: "Could not cancel", text: ex?.data?.message || "Something went wrong.", icon: "error" }); }
  };

  return (
    <Modal show onHide={isLoading ? undefined : onHide} centered backdrop="static" dialogClassName="cj-modal">
      <style>{`
        .cj-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
        .cj-modal .cj-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 12px 20px; }
        .cj-modal .modal-body { background: #f6f6f7; }
        .cj-modal .form-control { border-radius: 12px; border: 1.5px solid #c4c4ca; }
        .cj-modal .form-control:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .cj-modal .form-control.cj-bad { border-color: #dc2626; box-shadow: 0 0 0 4px rgba(220,38,38,.18); }
        .cj-modal .cj-fee { border: 1.5px solid #e3e3e6; border-radius: 14px; background: #fff; padding: 12px 14px; }
        .cj-modal .cj-note { font-size: .84rem; border-radius: 10px; padding: 8px 12px; background: #fff1f2; border: 1px dashed #c8102e; }
        .cj-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .cj-modal .btn-cancel-job { color: #fff; border: 0; border-radius: 10px; font-weight: 700; background: linear-gradient(135deg,#000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; }
        .cj-modal .btn-cancel-job:hover { filter: brightness(1.25); color: #fff; }
      `}</style>
      <Modal.Header closeButton={!isLoading} closeVariant="white" className="cj-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-white"><Icon icon="mdi:cancel" width="26" height="26" /> Cancel job · {job.jobNo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="small text-muted mb-3">{job.regNo} · {job.customerName}</div>
        <Form.Label className="fw-semibold">Reason for cancelling <span className="text-danger">*</span></Form.Label>
        <FormControl as="textarea" rows={3} maxLength={500} ref={reasonRef} className={bad === "reason" ? "cj-bad" : ""} value={reason} placeholder="e.g. The customer did not accept the estimate"
          onChange={(e) => { setReason(e.target.value); if (bad === "reason") setBad(""); }} />
        <div className="text-end small text-muted">{reason.length} / 500</div>

        <div className="cj-fee mt-2">
          <Form.Check type="switch" id="cj-charge" label="Charge an inspection fee" checked={charge} onChange={(e) => { setCharge(e.target.checked); if (!e.target.checked) setBad(""); }} />
          {charge && (
            <div className="mt-2">
              <div className="input-group">
                <span className="input-group-text">LKR</span>
                <FormControl type="number" min="0" step="any" inputMode="decimal" ref={feeRef} className={bad === "fee" ? "cj-bad" : ""} placeholder="0.00" value={fee}
                  onChange={(e) => { setFee(e.target.value); if (bad === "fee") setBad(""); }} />
              </div>
            </div>
          )}
        </div>
        <div className="cj-note mt-3">
          {charge
            ? <>The job invoice is marked <b>cancelled</b> and a <b>new invoice</b> is created for the inspection fee{feeNum > 0 ? <> (LKR {money(feeNum)})</> : null}.</>
            : <>No inspection fee: the job invoice is marked <b>cancelled</b> and nothing is charged.</>}
          <div className="text-muted mt-1">The earlier stages of the job stay viewable. The cancellation (reason, fee, who and when) is kept as a record.</div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" disabled={isLoading} onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Back</Button>
        <Button className="btn-cancel-job" disabled={isLoading} onClick={submit}>{isLoading ? <Spinner size="sm" /> : <Icon icon="mdi:cancel" width="18" height="18" />} Cancel job</Button>
      </Modal.Footer>
    </Modal>
  );
}