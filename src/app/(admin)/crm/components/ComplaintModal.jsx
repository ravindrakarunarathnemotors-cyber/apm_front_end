"use client";

import { useState } from "react";
import { Alert, Badge, Button, Col, Collapse, Form, FormControl, FormSelect, Modal, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useGetJobComplaintQuery,
  useSaveJobComplaintMutation,
  useShiftJobDepartmentMutation,
} from "@/store/features/apiSlice";
import { getDepartmentUi } from "./departmentConfig";
import ManageOptionsModal from "./ManageOptionsModal";

/* ----------------------------- helpers ----------------------------- */
const money = (n) => (n === null || n === undefined ? null : `Rs. ${Number(n).toLocaleString()}`);

// [{ name: "Collision Related", items: [...] }, ...]  (items without a group go under name "")
const groupOptions = (options) => {
  const groups = [];
  options.forEach((o) => {
    const name = o.groupName || "";
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, items: [] };
      groups.push(g);
    }
    g.items.push(o);
  });
  return groups;
};

/* ----------------------------- one type list ----------------------------- */
function OptionList({ list, selected, onToggle, onClear, color }) {
  const single = list.selection === "SINGLE";
  const count = list.options.filter((o) => selected.includes(o.id)).length;

  return (
    <div className="mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-1">
        <h6 className="fw-bold mb-0">
          Or select {list.title}{" "}
          <Badge bg="light" text="dark" className="border fw-normal">
            {single ? "select one" : "select one or more"}
          </Badge>
        </h6>
        {count > 0 && (
          <Button variant="link" size="sm" className="p-0" onClick={onClear}>
            Clear selection
          </Button>
        )}
      </div>

      <div className="small text-muted mb-2">
        {list.concernLevel === "SUB"
          ? "Selected items are shown in the Inspection Sheet (Stage 7) as a sub concern."
          : "Selected item is shown in the Inspection Sheet (Stage 7) as the main concern."}
        {list.showInStageNo && ` Item and price are shown in Client Approval - Stage ${list.showInStageNo}.`}
      </div>

      {list.options.length === 0 && <Alert variant="warning" className="py-2 small">No items in this list yet.</Alert>}

      {groupOptions(list.options).map((g) => (
        <div key={g.name || "_"} className="mb-2">
          {g.name && <div className="fw-semibold small text-uppercase text-muted mb-1">{g.name}</div>}
          <Row className="g-2">
            {g.items.map((o) => {
              const checked = selected.includes(o.id);
              return (
                <Col xs={12} sm={6} xl={4} key={o.id}>
                  <label
                    className="d-flex align-items-start gap-2 rounded p-2 h-100"
                    style={{
                      cursor: "pointer",
                      border: `2px solid ${checked ? color : "#e2e8f0"}`,
                      backgroundColor: checked ? `color-mix(in srgb, ${color} 8%, white)` : "#fff",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type={single ? "radio" : "checkbox"}
                      className="mt-1"
                      name={`list-${list.id}`}
                      checked={checked}
                      onChange={() => onToggle(list, o)}
                    />
                    <span className="flex-grow-1">
                      <span className="fw-semibold">{o.name}</span>
                      {o.description && <span className="d-block small text-muted">{o.description}</span>}
                    </span>
                    {list.hasPrice && (
                      <Badge bg={o.price == null ? "secondary" : "success"} className="align-self-center text-nowrap">
                        {money(o.price) || "Price not set"}
                      </Badge>
                    )}
                  </label>
                </Col>
              );
            })}
          </Row>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- the form ----------------------------- */
function ComplaintForm({ data, onHide, onSaved, startNow }) {
  const { job, config, complaint: saved, otherDepartments, canManage } = data;
  const ui = getDepartmentUi(job.departmentName);

  const [complaint, setComplaint] = useState(saved?.complaint || "");
  const [remarks, setRemarks] = useState(saved?.remarks || "");
  const [vehiclePass, setVehiclePass] = useState(saved?.vehiclePassIssued ?? false);
  const [approval, setApproval] = useState(saved?.initialCustomerApproval ?? null); // true / false / null
  const [selected, setSelected] = useState(saved?.selectedOptionIds || []);
  const [error, setError] = useState("");

  const [showShift, setShowShift] = useState(false);
  const [shiftTo, setShiftTo] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [showManage, setShowManage] = useState(false);
  // Opens straight on the "Stage 4 A" confirmation when the user pressed "Start Job" in the dashboard
  const [confirming, setConfirming] = useState(Boolean(startNow && saved && saved.initialCustomerApproval !== null && !saved.startConfirmedAt));

  const [saveComplaint, { isLoading: saving }] = useSaveJobComplaintMutation();
  const [shiftJob, { isLoading: shifting }] = useShiftJobDepartmentMutation();

  const stageOpen = job.stageNo === 5; // first time: saving completes stage 5
  const busy = saving || shifting;

  const toggle = (list, option) => {
    setError("");
    setSelected((prev) => {
      const listIds = list.options.map((o) => o.id);
      if (list.selection === "SINGLE") {
        return [...prev.filter((id) => !listIds.includes(id)), option.id];
      }
      return prev.includes(option.id) ? prev.filter((id) => id !== option.id) : [...prev, option.id];
    });
  };
  const clearList = (list) => {
    const listIds = list.options.map((o) => o.id);
    setSelected((prev) => prev.filter((id) => !listIds.includes(id)));
  };

  // Wash: the complaint can be saved now and the job started later ("Stage 4 A" confirmation)
  const hasStartStep = config.requiresInitialApproval && stageOpen;
  const alreadyStarted = Boolean(saved?.startConfirmedAt);

  const validate = (needApproval) => {
    setError("");
    if (!complaint.trim() && selected.length === 0) {
      setError("Write the complaint or select a type.");
      return false;
    }
    if (needApproval && config.requiresInitialApproval && approval === null) {
      setError("Select Initial Customer Approval (Yes / No) to start the job.");
      return false;
    }
    return true;
  };

  // Normal departments: save and continue.  Wash: "Save" keeps the job waiting, "Save & Start Job" asks for the confirmation.
  const onSaveClick = () => {
    if (validate(false)) save(false);
  };
  const onStartClick = () => {
    if (validate(true)) setConfirming(true);
  };

  const save = async (startConfirmed) => {
    try {
      await saveComplaint({
        jobId: job.id,
        complaint,
        remarks,
        vehiclePassIssued: vehiclePass,
        initialCustomerApproval: approval,
        startConfirmed,
        optionIds: selected,
      }).unwrap();
      await Swal.fire({
        title: startConfirmed ? "Job started!" : "Saved!",
        text: startConfirmed
          ? `The job has started for ${job.departmentName}.`
          : hasStartStep
            ? "Complaint saved. The job is not started yet. You can start it later."
            : stageOpen
              ? "Complaint recorded. The job moved to the next stage."
              : "Complaint updated.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
      // tell the dashboard the complaint is done, so it can open the next stage (Team Allocation)
      onSaved?.({ jobId: job.id, stageCompleted: stageOpen && (!hasStartStep || startConfirmed) });
      onHide();
    } catch (err) {
      setConfirming(false);
      setError(err?.data?.message || "Failed to save the complaint.");
    }
  };

  const shift = async () => {
    setError("");
    const dept = otherDepartments.find((d) => String(d.id) === String(shiftTo));
    if (!dept) {
      setError("Select the department to shift this job to.");
      return;
    }
    const ok = await Swal.fire({
      title: "Shift to other department?",
      text: `${job.jobNo} will be moved from ${job.departmentName} to ${dept.name}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, shift",
    });
    if (!ok.isConfirmed) return;

    try {
      await shiftJob({ jobId: job.id, departmentId: dept.id, reason: shiftReason }).unwrap();
      await Swal.fire({ title: "Shifted!", text: `The job is now in ${dept.name}.`, icon: "success", timer: 1500, showConfirmButton: false });
      onHide();
    } catch (err) {
      setError(err?.data?.message || "Failed to shift the job.");
    }
  };

  // ---------- Stage 4 A: "Are you sure about initial starting?" ----------
  if (confirming) {
    const chosen = config.lists.flatMap((l) =>
      l.options.filter((o) => selected.includes(o.id)).map((o) => ({ list: l, option: o }))
    );
    return (
      <>
        <Modal.Body className="bg-light d-flex justify-content-center">
          <div className="bg-white border rounded p-4 w-100" style={{ maxWidth: 640 }}>
            <div className="text-center mb-3">
              <Icon icon="mdi:help-circle-outline" width="56" height="56" color={ui.color} />
              <div className="text-muted fw-semibold">Stage 4 A</div>
              <h4 className="fw-bold mb-1">Are you sure about initial starting?</h4>
              <div className="text-muted">
                Initially JOB STARTS for <strong style={{ color: ui.color }}>{job.departmentName}</strong>
              </div>
            </div>

            <div className="border rounded p-3 mb-3 small">
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Job</span>
                <strong>{job.jobNo} · {job.regNo}</strong>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Customer</span>
                <strong>{job.customerName}</strong>
              </div>
              {chosen.map(({ list, option }) => (
                <div key={option.id} className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">{list.title}</span>
                  <strong>
                    {option.name}
                    {list.hasPrice && option.price != null ? ` · ${money(option.price)}` : ""}
                  </strong>
                </div>
              ))}
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Initial Customer Approval</span>
                <strong className={approval ? "text-success" : "text-danger"}>{approval ? "Yes" : "No"}</strong>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">Vehicle pass issued</span>
                <strong>{vehiclePass ? "Yes" : "No"}</strong>
              </div>
            </div>

            {approval === false && (
              <Alert variant="warning" className="py-2 small">
                Initial Customer Approval is <strong>No</strong>. Make sure the customer agrees before the job starts.
              </Alert>
            )}

            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

            <div className="d-flex gap-2 justify-content-center">
              <Button variant="outline-secondary" onClick={() => setConfirming(false)} disabled={saving}>
                <Icon icon="mdi:arrow-left" width="18" height="18" /> No, go back
              </Button>
              <Button variant="success" onClick={() => save(true)} disabled={saving}>
                <Icon icon="mdi:check-circle-outline" width="20" height="20" />{" "}
                {saving ? "Starting..." : "Yes, start the job"}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </>
    );
  }

  return (
    <>
      <Modal.Body className="bg-light">
        {/* job strip */}
        <div className="bg-white border rounded p-2 px-3 mb-3 d-flex flex-wrap gap-3 align-items-center">
          <strong>{job.jobNo}</strong>
          <span><Icon icon="mdi:account-outline" width="16" height="16" /> {job.customerName}</span>
          <span><Icon icon="mdi:car-outline" width="16" height="16" /> {job.regNo}</span>
          <Badge bg={stageOpen ? (saved ? "warning" : "primary") : "success"} text={stageOpen && saved ? "dark" : undefined}>
            {stageOpen ? (saved ? "Saved · not started yet" : "Complaint stage open") : "Complaint recorded"}
          </Badge>
          {saved && (
            <small className="text-muted ms-auto">
              Last saved by {saved.recordedByName || "-"} · {new Date(saved.recordedAt).toLocaleString("en-GB")}
            </small>
          )}
        </div>

        {error && <Alert variant="danger" className="py-2" dismissible onClose={() => setError("")}>{error}</Alert>}

        {/* Write complaint + Shift */}
        <div className="bg-white border rounded p-3 mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h6 className="fw-bold mb-0">Write Complaint</h6>
            {stageOpen && otherDepartments.length > 0 && (
              <Button variant="outline-warning" size="sm" onClick={() => setShowShift((v) => !v)} disabled={busy}>
                <Icon icon="mdi:swap-horizontal" width="18" height="18" /> Shift To Other Department
              </Button>
            )}
          </div>

          <Collapse in={showShift}>
            <div>
              <div className="border rounded p-2 mb-3 bg-light">
                <Row className="g-2 align-items-end">
                  <Col md={4}>
                    <Form.Label className="small mb-1">Shift to</Form.Label>
                    <FormSelect size="sm" value={shiftTo} onChange={(e) => setShiftTo(e.target.value)}>
                      <option value="">Select department</option>
                      {otherDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </FormSelect>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="small mb-1">Reason (optional)</Form.Label>
                    <FormControl size="sm" value={shiftReason} onChange={(e) => setShiftReason(e.target.value)} placeholder="Why is the job moved?" />
                  </Col>
                  <Col md={2} className="d-grid">
                    <Button size="sm" variant="warning" onClick={shift} disabled={busy}>
                      {shifting ? "Shifting..." : "Shift"}
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>
          </Collapse>

          <FormControl
            as="textarea"
            rows={4}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="Write the customer's complaint / concern"
          />
          <FormControl
            as="textarea"
            rows={3}
            className="mt-2"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Additional notes (optional)"
          />
          <div className="small text-muted mt-2">
            <Icon icon="mdi:information-outline" width="16" height="16" /> This concern is shown as the main issue in
            the Inspection Sheet (Stage 7 / main concern).
          </div>
        </div>

        {/* Type lists of this department */}
        <div className="bg-white border rounded p-3 mb-3">
          {config.lists.map((list) => (
            <OptionList
              key={list.id}
              list={list}
              selected={selected}
              color={ui.color}
              onToggle={toggle}
              onClear={() => clearList(list)}
            />
          ))}
          {config.lists.length === 0 && <Alert variant="warning" className="mb-0">No type lists for this department yet.</Alert>}

          {canManage && (
            <Button variant="link" size="sm" className="p-0" onClick={() => setShowManage(true)}>
              <Icon icon="mdi:playlist-edit" width="18" height="18" /> Manage lists (add / edit / remove)
            </Button>
          )}
        </div>

        {/* Approval + vehicle pass */}
        <div className="bg-white border rounded p-3">
          {config.requiresInitialApproval && (
            <div className="mb-3">
              <div className="fw-semibold mb-1">Initial Customer Approval</div>
              <Form.Check inline type="radio" id="appr-yes" name="approval" label="Yes" checked={approval === true} onChange={() => setApproval(true)} />
              <Form.Check inline type="radio" id="appr-no" name="approval" label="No" checked={approval === false} onChange={() => setApproval(false)} />
            </div>
          )}
          <Form.Check
            type="switch"
            id="vehicle-pass"
            label="Issued Vehicle Pass to client (Yes)"
            checked={vehiclePass}
            onChange={(e) => setVehiclePass(e.target.checked)}
          />
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={busy}>Cancel</Button>
        {hasStartStep ? (
          <>
            <Button variant="outline-success" onClick={onSaveClick} disabled={busy}>
              <Icon icon="mdi:content-save-outline" width="20" height="20" />{" "}
              {saving ? "Saving..." : "Save (start later)"}
            </Button>
            <Button variant="success" onClick={onStartClick} disabled={busy}>
              <Icon icon="mdi:play-circle-outline" width="20" height="20" /> Save &amp; Start Job
            </Button>
          </>
        ) : (
          <Button variant="success" onClick={onSaveClick} disabled={busy}>
            <Icon icon="mdi:content-save-outline" width="20" height="20" />{" "}
            {saving ? "Saving..." : stageOpen ? "Save & Continue" : "Update"}
          </Button>
        )}
      </Modal.Footer>

      {showManage && (
        <ManageOptionsModal departmentId={job.departmentId} departmentName={job.departmentName} onHide={() => setShowManage(false)} />
      )}
    </>
  );
}

/* ----------------------------- modal ----------------------------- */
export default function ComplaintModal({ jobId, onHide, onSaved, startNow = false }) {
  const { data, isLoading, isError, error, refetch } = useGetJobComplaintQuery(jobId, { skip: !jobId });
  const ui = data ? getDepartmentUi(data.job.departmentName) : null;

  return (
    <Modal show={Boolean(jobId)} onHide={onHide} size="xl" fullscreen="md-down" scrollable centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          {ui && <Icon icon={ui.icon} width="24" height="24" color={ui.color} className="me-2" />}
          Customer Complaint recording / Review
          {data ? ` / ${data.job.departmentName}` : ""} / Open window
        </Modal.Title>
      </Modal.Header>

      {isLoading && (
        <Modal.Body className="text-center text-muted py-5">
          <Spinner animation="border" size="sm" className="me-2" /> Loading...
        </Modal.Body>
      )}

      {isError && (
        <Modal.Body>
          <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-0">
            <span>{error?.data?.message || "Failed to load the complaint form."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        </Modal.Body>
      )}

      {/* key: the form starts fresh for every job / after the department changes */}
      {data && <ComplaintForm key={`${data.job.id}-${data.job.departmentId}`} data={data} onHide={onHide} onSaved={onSaved} startNow={startNow} />}
    </Modal>
  );
}