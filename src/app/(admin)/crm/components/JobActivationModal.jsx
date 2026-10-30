"use client";

import { useState } from "react";
import { Alert, Button, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useActivateJobMutation, useGetJobActivationQuery } from "./jobActivationApi";

// Job Activation (the stage after "Internal Inspection - 1"): "Are you fully aware of this job?" -> Yes -> the job officially starts.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Fact = ({ icon, label, children }) => (
  <div className="d-flex gap-3 align-items-start py-2 border-bottom">
    <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 34, height: 34, background: "#eff6ff", color: "#2563eb" }}><Icon icon={icon} width="19" height="19" /></span>
    <div><div className="small text-muted">{label}</div><div className="fw-semibold">{children}</div></div>
  </div>
);

export default function JobActivationModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetJobActivationQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [activate, { isLoading: activating }] = useActivateJobMutation();
  const [error, setError] = useState("");
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
        <div className="bg-white rounded-3 p-3 mb-3 d-flex flex-wrap gap-4" style={{ border: "1px solid #e2e8f0" }}>
          <div><div className="small text-muted">Job</div><div className="fw-bold">{job.jobNo}</div></div>
          <div><div className="small text-muted">Vehicle</div><div className="fw-bold">{job.regNo}</div></div>
          <div><div className="small text-muted">Customer</div><div className="fw-bold">{job.customerName}</div></div>
        </div>

        <div className="bg-white rounded-3 p-3 mb-3" style={{ border: "1px solid #e2e8f0" }}>
          <div className="fw-bold mb-1">Job summary</div>
          <Fact icon="mdi:timer-outline" label="Estimated time of repair">{ap ? ([ap.estHours ? `${ap.estHours} Hrs` : "", ap.estDays ? `${ap.estDays} Days` : ""].filter(Boolean).join(" / ") || "-") : "-"}</Fact>
          <Fact icon="mdi:account-check-outline" label="Customer confirmation">
            {ap?.decision === "TOTAL" ? "Total approved" : ap?.decision === "PARTIAL" ? "Agreed scope only" : "-"}
            {ap?.decision === "PARTIAL" && ap.agreedScope?.length > 0 && <ul className="mb-0 ps-3 fw-normal">{ap.agreedScope.map((x, n) => <li key={n}>{x}</li>)}</ul>}
          </Fact>
          <Fact icon="mdi:cash-multiple" label="Estimated total">{money(ap?.estimatedTotal)}</Fact>
          <Fact icon="mdi:cog-transfer-outline" label="Spare parts">{ap?.partsBy === "CLIENT" ? "Provided by the customer" : ap?.partsBy === "COMPANY" ? `Provided by the company · ${data.partsCount} part(s)` : "-"}</Fact>
          {ap?.extraNote && <Fact icon="mdi:note-text-outline" label="Extra note">{ap.extraNote}</Fact>}
          {data.inspectionNotes && <Fact icon="mdi:clipboard-list-outline" label="Internal inspection notes">{data.inspectionNotes}</Fact>}
        </div>

        {activated ? (
          <Alert variant="success" className="d-flex align-items-center gap-2 mb-0">
            <Icon icon="mdi:check-decagram" width="24" height="24" />
            <div><b>OFFICIALLY JOB STARTED</b><div className="small">{new Date(data.header.activatedAt).toLocaleString()}{data.header.activatedByName ? ` · ${data.header.activatedByName}` : ""}</div></div>
          </Alert>
        ) : !data.canRecord ? (
          <Alert variant="info" className="mb-0">This job has not reached this stage yet.</Alert>
        ) : (
          <div className="rounded-3 p-4 text-center" style={{ background: "linear-gradient(135deg,#f0fdf4,#ecfeff)", border: "1px solid #bbf7d0" }}>
            <div className="fs-5 fw-bold mb-3">Are you fully aware of this job?</div>
            <Button size="lg" variant="success" className="px-5 fw-semibold shadow-sm" disabled={activating} onClick={yes}>
              {activating ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" width="24" height="24" />} Yes
            </Button>
            <div className="small text-muted mt-3">Clicking Yes officially starts the job.</div>
          </div>
        )}
        {error && <Alert variant="danger" className="py-2 mt-3 mb-0">{error}</Alert>}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false}>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white" style={{ width: 44, height: 44, background: "#16a34a" }}><Icon icon="mdi:rocket-launch-outline" width="26" height="26" /></span>
          <span>Job Activation{job && <span className="text-muted fw-normal">{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f1f5f9" }}>{body()}</Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}