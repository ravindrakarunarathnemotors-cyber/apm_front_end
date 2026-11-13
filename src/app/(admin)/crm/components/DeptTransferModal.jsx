"use client";

import { useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetDeptTransferQuery, useSaveDeptTransferMutation } from "./deptTransferApi";

// Transfer to other departments (the stage after "Review Team Inspection Sheet"):
//   "Transfer to other departments" Yes / No (default No). Yes -> ONE department from a dropdown; a new linked job is created there.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted, created })
export default function DeptTransferModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetDeptTransferQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveDeptTransferMutation();
  const [transfer, setTransfer] = useState(false);   // default No
  const [deptId, setDeptId] = useState("");           // the one department (only when Yes)
  const [remark, setRemark] = useState("");           // optional remark (Yes or No)

  const job = data?.job;
  // all the departments the job can go to (an older backend sent them as "standard" + "others")
  const departments = data?.departments ?? [...(data?.standard || []).map((x) => ({ id: x.departmentId, name: x.name })), ...(data?.others || [])];
  const done = Boolean(data?.header?.completedAt);
  const locked = !data?.canRecord;
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });

  const submit = async () => {
    if (transfer && !deptId) return fail("Select the department.");
    const name = departments.find((d) => String(d.id) === String(deptId))?.name;
    const c = await Swal.fire({
      title: "Complete the transfer stage?",
      text: transfer ? `A new job will be created in the ${name} Department.` : "No transfer. The stage completes.",
      icon: "question", showCancelButton: true, confirmButtonText: "Complete", confirmButtonColor: "#15803d",
    });
    if (!c.isConfirmed) return;
    try {
      const r = await save({ jobId, transfer, departmentId: transfer ? Number(deptId) : undefined, remark: remark.trim() || undefined }).unwrap();
      if (r.created?.length) await Swal.fire({ title: "Transferred", html: r.created.map((x) => `<b>${x.jobNo}</b>`).join("<br/>"), icon: "success", confirmButtonText: "OK" });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted), created: r.created || [] });
      onHide();
    } catch (ex) { fail(ex?.data?.message || "Could not save."); }
  };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load the transfer stage."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="dt-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
        </div>
        {!done && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}

        {done ? (
          <div className="dt-card">
            <div className="dt-title"><Icon icon="mdi:check-decagram" width="20" height="20" /> Transfer stage completed</div>
            {(data.saved || []).filter((x) => x.transferred).length === 0 && <div className="text-muted">Not transferred to another department.</div>}
            {data.header?.remark && <div className="mt-2 p-2 rounded" style={{ background: "#fafafa", border: "1px solid #e3e3e6", whiteSpace: "pre-wrap" }}><div className="small text-muted fw-semibold">Remark</div>{data.header.remark}</div>}
            {(data.saved || []).filter((x) => x.transferred).map((x) => (
              <div key={x.departmentId} className="dt-row">
                <span style={{ flex: 1 }}>Transferred to {x.departmentName} Department</span>
                {x.newJobNo && <Badge bg="dark">{x.newJobNo}</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <div className="dt-card">
            <div className="dt-title"><Icon icon="mdi:swap-horizontal-bold" width="20" height="20" /> Transfer to other departments</div>
            <div className="d-flex gap-2 flex-wrap">
              {[[true, "Yes"], [false, "No"]].map(([k, label]) => (
                <button key={label} type="button" disabled={locked} className={`dt-choice ${transfer === k ? (k ? "yes" : "no") : ""}`} onClick={() => { setTransfer(k); if (!k) setDeptId(""); }}>{label}</button>
              ))}
            </div>
            {transfer && (
              <div className="mt-3">
                <Form.Label className="small fw-semibold mb-1">Select the department (one only)</Form.Label>
                <Form.Select disabled={locked} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  <option value="">Select a department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Form.Select>
                <div className="small text-muted mt-2">A new job is created in that department (same customer and vehicle) and the related department process starts there.</div>
              </div>
            )}
            <div className="mt-3">
              <Form.Label className="small fw-semibold mb-1">Remark <span className="text-muted fw-normal">(optional)</span></Form.Label>
              <Form.Control as="textarea" rows={3} maxLength={1000} disabled={locked} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason for the transfer / anything the other department should know" />
              <div className="small text-muted text-end">{remark.length} / 1000</div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="dt-blur" dialogClassName="dt-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.dt-modal { --bs-modal-width: 720px; } }
        .modal-backdrop.dt-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.dt-blur.show { opacity: 1; }
        .dt-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .dt-modal .dt-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .dt-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .dt-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .dt-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
        .dt-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .dt-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .dt-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .dt-row { display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin-bottom: 6px; border: 1.5px solid #e5e7eb; border-radius: 12px; background: #fff; }
        .dt-choice { min-width: 64px; min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 700; }
        .dt-choice.yes { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        .dt-choice.no { border-color: #6b7280; background: #f3f4f6; color: #374151; }
        .dt-choice:disabled { opacity: .7; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="dt-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:swap-horizontal-bold" width="30" height="30" />
          <span>Transfer to Other Departments{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data?.canRecord && !done && (
          <Button variant="success" disabled={saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" />} Complete stage</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}