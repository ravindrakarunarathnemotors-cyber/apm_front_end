"use client";

import { useEffect, useRef, useState } from "react";
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

/* ----------------------------- estimated time (same time picker as Mechanical) ----------------------------- */
// stored as decimal hours (1.5 = 1 hr 30 min); the form shows Hours and Minutes separately
const splitHM = (v) => { const t = Number(v) || 0; let h = Math.floor(t + 1e-6); let mi = Math.round((t - h) * 60); if (mi >= 60) { h += 1; mi = 0; } return [h, mi]; };
const joinHM = (h, mi) => { const t = Math.round(((Number(h) || 0) + (Number(mi) || 0) / 60) * 10000) / 10000; return t > 0 ? String(t) : ""; };
const fmtHM = (v) => { const [h, mi] = splitHM(v); return [h > 0 ? `${h} Hrs` : "", mi > 0 ? `${mi} Min` : ""].filter(Boolean).join(" "); };

function TimeStepper({ label, unit, icon, value, onChange, step, quick }) {
  const n = value === "" || value === null || value === undefined ? 0 : Number(value) || 0;
  const setN = (v) => { const x = Math.max(0, Math.round(v * 10) / 10); onChange(x === 0 ? "" : String(x)); };
  return (
    <div className="ts-box">
      <div className="ts-label"><Icon icon={icon} width="18" height="18" /> {label}</div>
      <div className="ts-row">
        <button type="button" className="ts-btn" disabled={n <= 0} onClick={() => setN(n - step)} aria-label={`Decrease ${label}`}><Icon icon="mdi:minus" width="24" height="24" /></button>
        <div className="ts-val">
          <input type="number" inputMode="decimal" min="0" step={step} placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
          <span>{unit}</span>
        </div>
        <button type="button" className="ts-btn" onClick={() => setN(n + step)} aria-label={`Increase ${label}`}><Icon icon="mdi:plus" width="24" height="24" /></button>
      </div>
      <div className="ts-chips">
        {quick.map((q) => (
          <button key={q} type="button" className={`ts-chip ${n === q ? "on" : ""}`} onClick={() => setN(q)}>{q}</button>
        ))}
        <button type="button" disabled={n === 0} className="ts-chip clr" onClick={() => onChange("")}>Clear</button>
      </div>
    </div>
  );
}

// Hours + Minutes pickers for one estimate (value = decimal hours as text)
function EstimateRow({ title, icon, value, onChange }) {
  const [h, mi] = splitHM(value);
  return (
    <div className="mb-3">
      <div className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: "#111" }}>
        <Icon icon={icon} width="20" height="20" style={{ color: "#c8102e" }} /> {title}
        {Number(value) > 0 && <span className="ts-total ms-auto"><Icon icon="mdi:timer-sand" width="18" height="18" /> {fmtHM(value).replace(/ (?=\d+ Min)/, " + ")}</span>}
      </div>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <TimeStepper label="Hours" unit="Hrs" icon="mdi:clock-outline" step={1} quick={[1, 2, 3, 4]} value={h || ""}
            onChange={(v) => onChange(joinHM(Math.floor(Number(v) || 0), mi))} />
        </div>
        <div className="col-12 col-md-6">
          <TimeStepper label="Minutes" unit="Min" icon="mdi:timer-outline" step={5} quick={[10, 15, 30, 45]} value={mi || ""}
            onChange={(v) => { let x = Math.floor(Number(v) || 0); let hh = h; if (x >= 60) { hh += Math.floor(x / 60); x %= 60; } onChange(joinHM(hh, x)); }} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- one type list ----------------------------- */
function OptionList({ list, selected, onToggle, onClear, color, showChildren = false }) {
  const single = list.selection === "SINGLE";

  // This stage shows the parent types only. Their child types (with the labour prices) are used in the later stages.
  // A group that has no parent entry of its own is still shown, so nothing becomes impossible to select.
  const parentNames = new Set(list.options.filter((o) => !(o.groupName || "").trim()).map((o) => o.name.trim().toLowerCase()));
  const hasChildren = (o) => list.options.some((c) => (c.groupName || "").trim().toLowerCase() === o.name.trim().toLowerCase());
  const visible = list.options.filter((o) => !(o.groupName || "").trim() || !parentNames.has(o.groupName.trim().toLowerCase()));
  const count = list.options.filter((o) => selected.includes(o.id)).length;

  // Wash: after a parent type is selected, its child types (with the price) are shown so one can be picked.
  const childrenOf = (p) => list.options.filter((c) => (c.groupName || "").trim().toLowerCase() === p.name.trim().toLowerCase());
  const isActiveParent = (p) => selected.includes(p.id) || childrenOf(p).some((c) => selected.includes(c.id));
  const activeParent = showChildren ? visible.find((p) => !(p.groupName || "").trim() && childrenOf(p).length > 0 && isActiveParent(p)) : null;
  const activeChildren = activeParent ? childrenOf(activeParent) : [];

  return (
    <div className="mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-1">
        <h6 className="fw-bold mb-0" style={{ color: "#111" }}>
          Or select {list.title}{" "}
          <Badge bg="light" text="dark" className="border fw-normal">
            {single ? "select one" : "select one or more"}
          </Badge>
        </h6>
        {count > 0 && (
          <Button variant="link" size="sm" className="p-0" style={{ color: "#c8102e" }} onClick={onClear}>
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

      {visible.length === 0 && <Alert variant="warning" className="py-2 small">No items in this list yet.</Alert>}

      {groupOptions(visible).map((g) => (
        <div key={g.name || "_"} className="mb-2">
          {g.name && <div className="fw-semibold small text-uppercase text-muted mb-1">{g.name}</div>}
          <Row className="g-2">
            {g.items.map((o) => {
              const checked = showChildren ? isActiveParent(o) : selected.includes(o.id);
              return (
                <Col xs={12} sm={6} xl={4} key={o.id}>
                  <label
                    className="cm-opt d-flex align-items-start gap-2 p-2 h-100"
                    style={{
                      minHeight: 52,
                      border: `2px solid ${checked ? "#c8102e" : "#e2e8f0"}`,
                      backgroundColor: checked ? "#fff1f2" : "#fff",
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
                    {list.hasPrice && !hasChildren(o) && (
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

      {activeParent && (
        <div className="mt-3 p-3 rounded-3" style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
          <div className="fw-semibold mb-2" style={{ color: "#111" }}>
            <Icon icon="mdi:subdirectory-arrow-right" width="18" height="18" /> {activeParent.name}: select one
            {!activeChildren.some((c) => selected.includes(c.id)) && (
              <span className="ms-2 small fw-normal text-muted">(the price is taken from the option you select)</span>
            )}
          </div>
          <Row className="g-2">
            {activeChildren.map((c) => {
              const on = selected.includes(c.id);
              return (
                <Col xs={12} sm={6} xl={4} key={c.id}>
                  <label
                    className="cm-opt d-flex align-items-start gap-2 p-2 h-100"
                    style={{ minHeight: 48, border: `2px solid ${on ? "#c8102e" : "#e2e8f0"}`, backgroundColor: on ? "#fff1f2" : "#fff" }}
                  >
                    <input type="radio" className="mt-1" name={`list-${list.id}-child`} checked={on} onChange={() => onToggle(list, c)} />
                    <span className="flex-grow-1">
                      <span className="fw-semibold">{c.name}</span>
                      {c.description && <span className="d-block small text-muted">{c.description}</span>}
                    </span>
                    {list.hasPrice && (
                      <Badge bg={c.price == null ? "secondary" : "success"} className="align-self-center text-nowrap">
                        {money(c.price) || "Price not set"}
                      </Badge>
                    )}
                  </label>
                </Col>
              );
            })}
          </Row>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- the form ----------------------------- */
function ComplaintForm({ data, onHide, onSaved, startNow, onConfirmingChange }) {
  const { job, config, complaint: saved, otherDepartments, canManage } = data;
  const ui = getDepartmentUi(job.departmentName);

  const [complaint, setComplaint] = useState(saved?.complaint || "");
  const [remarks, setRemarks] = useState(saved?.remarks || "");
  const [vehiclePass, setVehiclePass] = useState(saved?.vehiclePassIssued ?? false);
  const [approval, setApproval] = useState(saved?.initialCustomerApproval ?? null); // true / false / null
  // Wash only: estimated time to wash, and to dry + vacuum (decimal hours as text)
  const [estWash, setEstWash] = useState(saved?.estWashHours ? String(saved.estWashHours) : "");
  const [estDry, setEstDry] = useState(saved?.estDryHours ? String(saved.estDryHours) : "");
  const [selected, setSelected] = useState(saved?.selectedOptionIds || []);
  const [error, setError] = useState("");
  const [errTarget, setErrTarget] = useState(""); // which field the error is about: "complaint" | "approval" | ""
  const [errTick, setErrTick] = useState(0);
  const complaintRef = useRef(null);
  const approvalRef = useRef(null);
  const alertRef = useRef(null);

  // Show an error and take the user to it (focus the complaint box / scroll to the approval buttons / scroll to the message)
  const fail = (msg, target = "") => {
    setError(msg);
    setErrTarget(target);
    setErrTick((t) => t + 1);
  };
  useEffect(() => {
    if (!errTick) return undefined;
    const t = setTimeout(() => {
      if (errTarget === "complaint" && complaintRef.current) {
        complaintRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        complaintRef.current.focus({ preventScroll: true });
      } else if (errTarget === "approval" && approvalRef.current) {
        approvalRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (alertRef.current) {
        alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [errTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showShift, setShowShift] = useState(false);
  const [shiftTo, setShiftTo] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [showManage, setShowManage] = useState(false);
  // Opens straight on the "Stage 4 A" confirmation when the user pressed "Start Job" in the dashboard
  const [confirming, setConfirming] = useState(Boolean(startNow && saved && saved.initialCustomerApproval !== null && !saved.startConfirmedAt));
  // tell the window around us, so the "Are you sure about initial starting?" step looks like its own window (no complaint header)
  useEffect(() => {
    onConfirmingChange?.(confirming);
    return () => onConfirmingChange?.(false);
  }, [confirming]); // eslint-disable-line react-hooks/exhaustive-deps

  const [saveComplaint, { isLoading: saving }] = useSaveJobComplaintMutation();
  const [shiftJob, { isLoading: shifting }] = useShiftJobDepartmentMutation();

  const isWash = /wash/i.test(job.departmentName || ""); // Wash does not need the "Additional notes" box
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
  // Wash flow:  Save (stay on this stage)  ->  Save & Bay Allocation (stage 5 done)  ->  later "Start Job" (approval Yes / No + confirmation)
  const alreadyStarted = Boolean(saved?.startConfirmedAt);
  const washFlow = Boolean(config.requiresInitialApproval);
  const hasStartStep = washFlow && !alreadyStarted; // the job still has to be started

  const validate = (needApproval) => {
    setError("");
    if (!complaint.trim() && selected.length === 0) {
      fail("Write the complaint or select a type.", "complaint");
      return false;
    }
    if (needApproval && config.requiresInitialApproval && approval === null) {
      fail("Select Initial Customer Approval (Yes / No) to start the job.", "approval");
      return false;
    }
    return true;
  };

  // Normal departments: save and continue.  Wash: "Save" keeps the job waiting, "Save & Start Job" asks for the confirmation.
  const onSaveClick = () => {
    if (validate(false)) save(false);
  };
  // Wash: save and go on to Bay Allocation (the job is started afterwards)
  const onBayClick = () => {
    if (validate(false)) save(false, true);
  };
  const onStartClick = () => {
    if (validate(true)) setConfirming(true);
  };

  const save = async (startConfirmed, completeStage = false) => {
    try {
      await saveComplaint({
        jobId: job.id,
        complaint,
        remarks,
        vehiclePassIssued: vehiclePass,
        initialCustomerApproval: approval,
        estWashHours: isWash && estWash !== "" ? Number(estWash) : null,
        estDryHours: isWash && estDry !== "" ? Number(estDry) : null,
        startConfirmed,
        completeStage,
        optionIds: selected,
      }).unwrap();
      await Swal.fire({
        title: startConfirmed ? "Job started!" : "Saved!",
        text: startConfirmed
          ? `The job has started for ${job.departmentName}.`
          : completeStage
            ? "Complaint saved. Next: Bay Allocation."
            : hasStartStep
              ? "Complaint saved."
            : stageOpen
              ? "Complaint recorded. The job moved to the next stage."
              : "Complaint updated.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
      // close this window first, then tell the dashboard the complaint is done so it can open the next stage (Team Allocation / Bay / ...)
      // (a short delay: the next window must not open while this one is still closing, or this one stays open behind it)
      const done = { jobId: job.id, stageCompleted: stageOpen && (!washFlow || startConfirmed || completeStage), started: startConfirmed };
      onSaved?.(done);   // handed to the modal wrapper: the next stage window opens only AFTER this window has fully closed
      onHide();
    } catch (err) {
      setConfirming(false);
      fail(err?.data?.message || "Failed to save the complaint.");
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
    const total = chosen.reduce((sum, { option }) => sum + (Number(option.price) || 0), 0);
    const hasPrice = chosen.some(({ option }) => option.price != null);
    const Tile = ({ icon, label, children }) => (
      <div className="sc-tile">
        <div className="sc-tile-label"><Icon icon={icon} width="16" height="16" /> {label}</div>
        <div className="sc-tile-value">{children}</div>
      </div>
    );
    return (
      <>
        <style>{`
          .sc-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 44px -20px rgba(15,23,42,.45); border: 1px solid #e4e4e7; }
          .sc-head { background: linear-gradient(135deg,#0a0a0a 0%,#2a0a0e 55%,#c8102e 140%); color: #fff; text-align: center; padding: 26px 20px 22px; }
          .sc-ico { width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.12); border: 2px solid rgba(255,255,255,.35); }
          .sc-pill { display: inline-block; background: #c8102e; color: #fff; font-weight: 800; font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; padding: 3px 12px; border-radius: 999px; }
          .sc-dept { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.14); border-radius: 999px; padding: 3px 12px; font-weight: 700; }
          .sc-vehicle { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 16px 20px; border-bottom: 1px dashed #e4e4e7; }
          .sc-plate { background: #facc15; color: #111; border: 2px solid #111; border-radius: 8px; padding: 2px 12px; font-weight: 900; letter-spacing: .08em; font-size: 1.15rem; }
          .sc-body { padding: 16px 20px 6px; }
          .sc-service { background: #fafafa; border: 1.5px solid #e4e4e7; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
          .sc-price { font-weight: 900; font-size: 1.5rem; color: #c8102e; white-space: nowrap; }
          .sc-tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
          .sc-tile { background: #fff; border: 1.5px solid #e4e4e7; border-radius: 14px; padding: 10px 14px; }
          .sc-tile-label { display: flex; align-items: center; gap: 6px; font-size: .78rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
          .sc-tile-label svg { color: #c8102e; }
          .sc-tile-value { font-size: 1.25rem; font-weight: 800; color: #111; margin-top: 2px; }
          .sc-approve { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 14px; font-weight: 800; }
          .sc-foot { padding: 14px 20px 20px; display: flex; gap: 10px; }
          .sc-foot button { flex: 1; min-height: 52px; border-radius: 14px; font-weight: 800; font-size: 1rem; }
          @media (max-width: 480px) { .sc-tiles { grid-template-columns: 1fr; } .sc-foot { flex-direction: column-reverse; } }
        `}</style>
        <Modal.Body className="bg-light d-flex justify-content-center">
          <div className="sc-card w-100">
            <div className="sc-head">
              <div className="sc-ico"><Icon icon="mdi:play-circle-outline" width="40" height="40" /></div>
              <span className="sc-pill">Stage 4 A</span>
              <h4 className="fw-bold mt-2 mb-2">Are you sure about initial starting?</h4>
              <span className="sc-dept"><Icon icon={ui.icon || "mdi:car-wash"} width="18" height="18" /> Job starts for {job.departmentName}</span>
            </div>

            <div className="sc-vehicle">
              <span className="sc-plate">{job.regNo}</span>
              <div className="me-auto">
                <div className="fw-bold" style={{ color: "#111" }}>{job.jobNo}</div>
                <div className="small text-muted d-flex align-items-center gap-1"><Icon icon="mdi:account-outline" width="16" height="16" /> {job.customerName}</div>
              </div>
              <span className={`sc-approve ${approval ? "" : ""}`} style={{ background: approval ? "#dcfce7" : "#fee2e2", color: approval ? "#15803d" : "#b91c1c" }}>
                <Icon icon={approval ? "mdi:check-circle" : "mdi:close-circle"} width="18" height="18" />
                Customer approval: {approval ? "Yes" : "No"}
              </span>
            </div>

            <div className="sc-body">
              {chosen.map(({ list, option }) => (
                <div key={option.id} className="sc-service">
                  <div>
                    <div className="small fw-bold text-muted text-uppercase" style={{ letterSpacing: ".04em" }}>{list.title}</div>
                    <div className="fw-bold fs-5" style={{ color: "#111" }}>
                      {option.groupName ? <>{option.groupName} <Icon icon="mdi:chevron-right" width="20" height="20" /> {option.name}</> : option.name}
                    </div>
                  </div>
                  {list.hasPrice && option.price != null && <div className="sc-price">{money(option.price)}</div>}
                </div>
              ))}

              {isWash && (
                <div className="sc-tiles">
                  <Tile icon="mdi:car-wash" label="Time to wash">{fmtHM(estWash) || <span className="text-muted fw-normal">Not set</span>}</Tile>
                  <Tile icon="mdi:vacuum-outline" label="Drying and vacuum">{fmtHM(estDry) || <span className="text-muted fw-normal">Not set</span>}</Tile>
                </div>
              )}

              {chosen.length > 1 && hasPrice && (
                <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                  <span className="fw-bold text-muted">Total</span>
                  <span className="sc-price">{money(total)}</span>
                </div>
              )}

              {approval === false && (
                <Alert variant="warning" className="py-2 small">
                  Initial Customer Approval is <strong>No</strong>. Make sure the customer agrees before the job starts.
                </Alert>
              )}
              {error && <Alert ref={alertRef} variant="danger" className="py-2">{error}</Alert>}
            </div>

            <div className="sc-foot">
              <Button variant="outline-secondary" onClick={() => setConfirming(false)} disabled={saving}>
                <Icon icon="mdi:arrow-left" width="20" height="20" /> No, go back
              </Button>
              <Button variant="success" onClick={() => save(true)} disabled={saving}>
                <Icon icon="mdi:check-circle-outline" width="22" height="22" />{" "}
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
          <span className="cm-jobno">{job.jobNo}</span>
          <span className="fw-semibold"><Icon icon="mdi:account-outline" width="18" height="18" style={{ color: "#c8102e" }} /> {job.customerName}</span>
          <span className="cm-plate">{job.regNo}</span>
          <Badge bg={stageOpen ? (saved ? "warning" : "primary") : "success"} text={stageOpen && saved ? "dark" : undefined}>
            {stageOpen ? (saved ? "Saved · not started yet" : "Complaint stage open") : "Complaint recorded"}
          </Badge>
          {saved && (
            <small className="text-muted ms-auto">
              Last saved by {saved.recordedByName || "-"} · {new Date(saved.recordedAt).toLocaleString("en-GB")}
            </small>
          )}
        </div>

        {error && <Alert ref={alertRef} variant="danger" className="py-2" dismissible onClose={() => setError("")}>{error}</Alert>}

        {/* Write complaint + Shift */}
        <div className="bg-white border rounded p-3 mb-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h6 className="fw-bold mb-0">Write Concern</h6>
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
            ref={complaintRef}
            isInvalid={errTarget === "complaint" && Boolean(error) && !complaint.trim() && selected.length === 0}
            value={complaint}
            onChange={(e) => { setComplaint(e.target.value); if (errTarget === "complaint") setError(""); }}
            placeholder="Write the customer's complaint / concern"
          />
          {!isWash && (
            <FormControl
              as="textarea"
              rows={3}
              className="mt-2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional notes (optional)"
            />
          )}
          <div className="small text-muted mt-2">
            <Icon icon="mdi:information-outline" width="16" height="16" /> This concern is shown as the main issue in
            the Inspection Sheet (Stage 7 / main concern).
          </div>
        </div>

        {/* Type lists of this department */}
        <div className="bg-white border rounded p-3 mb-3">
          {config.lists.map((list) => (
            <OptionList
              showChildren={isWash}
              key={list.id}
              list={list}
              selected={selected}
              color={ui.color}
              onToggle={toggle}
              onClear={() => clearList(list)}
            />
          ))}
          {config.lists.length === 0 && <Alert variant="warning" className="mb-0">No type lists for this department yet.</Alert>}

          {/* "Manage lists" button is switched off here (lists are managed from the Jobs Dashboard -> Repair Type window).
              To bring it back, remove this comment:
          {canManage && (
            <Button variant="link" size="sm" className="p-0" onClick={() => setShowManage(true)}>
              <Icon icon="mdi:playlist-edit" width="18" height="18" /> Manage lists (add / edit / remove)
            </Button>
          )}
          */}
        </div>

        {/* Wash: estimated times (same Hours / Minutes picker as the Mechanical estimate) */}
        {isWash && (
          <div className="bg-white border rounded p-3 mb-3">
            <style>{`
              .ts-box { background: #fafafa; border: 1.5px solid #e3e3e6; border-radius: 14px; padding: 12px 14px; height: 100%; }
              .ts-label { font-weight: 700; color: #111; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
              .ts-label svg { color: #c8102e; }
              .ts-row { display: flex; align-items: stretch; gap: 8px; }
              .ts-btn { width: 52px; min-height: 52px; border-radius: 12px; border: 0; color: #fff; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
              .ts-btn:disabled { opacity: .35; }
              .ts-btn:active:not(:disabled) { transform: scale(.95); }
              .ts-val { flex: 1; min-width: 0; display: flex; align-items: baseline; justify-content: center; gap: 6px; background: #fff; border: 1.5px solid #c4c4ca; border-radius: 12px; padding: 0 10px; }
              .ts-val:focus-within { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
              .ts-val input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; text-align: right; font-size: 1.7rem; font-weight: 800; color: #111; padding: 6px 0; -moz-appearance: textfield; }
              .ts-val input::-webkit-outer-spin-button, .ts-val input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
              .ts-val span { font-weight: 700; color: #c8102e; text-transform: uppercase; font-size: .8rem; letter-spacing: .05em; }
              .ts-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
              .ts-chip { min-width: 44px; min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1.5px solid #c4c4ca; background: #fff; color: #111; font-weight: 700; font-size: .9rem; }
              .ts-chip:hover:not(:disabled) { border-color: #111; }
              .ts-chip.on { background: #c8102e; border-color: #c8102e; color: #fff; }
              .ts-chip.clr { margin-left: auto; color: #6b7280; font-weight: 600; border-style: dashed; }
              .ts-total { display: inline-flex; align-items: center; gap: 8px; background: #111; color: #fff; border-radius: 10px; padding: 4px 12px; font-weight: 700; font-size: .9rem; box-shadow: inset 4px 0 0 #c8102e; }
            `}</style>
            <EstimateRow title="Estimated Time to Wash" icon="mdi:car-wash" value={estWash} onChange={setEstWash} />
            <EstimateRow title="Estimated Time to Drying and Vacuum" icon="mdi:vacuum-outline" value={estDry} onChange={setEstDry} />
          </div>
        )}

        {/* Initial approval (Wash only). The "Issued Vehicle Pass" switch has been removed for every department. */}
        {config.requiresInitialApproval && (
          <div ref={approvalRef} className={`bg-white border rounded p-3 ${errTarget === "approval" && error && approval === null ? "ap-missing" : ""}`}>
            <style>{`
              .ap-missing { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220,38,38,.18); animation: ap-shake .35s; }
              @keyframes ap-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
              .ap-btn { flex: 1; min-height: 56px; border-radius: 14px; border: 2px solid #c4c4ca; background: #fff; color: #111; font-weight: 800; font-size: 1.05rem; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all .15s; }
              .ap-btn:hover { border-color: #111; }
              .ap-btn:active { transform: scale(.97); }
              .ap-btn.yes.on { background: #16a34a; border-color: #16a34a; color: #fff; box-shadow: 0 6px 16px -6px rgba(22,163,74,.6); }
              .ap-btn.no.on { background: #c8102e; border-color: #c8102e; color: #fff; box-shadow: 0 6px 16px -6px rgba(200,16,46,.6); }
            `}</style>
            <div className="fw-bold mb-2" style={{ color: "#111" }}>Initial Customer Approval <span className="small fw-normal text-muted">(needed when the job is started)</span></div>
            {errTarget === "approval" && error && approval === null && (
              <div className="small fw-semibold mb-2" style={{ color: "#dc2626" }}>Please select Yes or No.</div>
            )}
            <div className="d-flex gap-2">
              <button type="button" className={`ap-btn yes ${approval === true ? "on" : ""}`} onClick={() => { setError(""); setApproval(true); }} aria-pressed={approval === true}>
                <Icon icon="mdi:check-circle-outline" width="24" height="24" /> Yes
              </button>
              <button type="button" className={`ap-btn no ${approval === false ? "on" : ""}`} onClick={() => { setError(""); setApproval(false); }} aria-pressed={approval === false}>
                <Icon icon="mdi:close-circle-outline" width="24" height="24" /> No
              </button>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" className="cm-cancel" onClick={onHide} disabled={busy}>Cancel</Button>
        {hasStartStep ? (
          <>
            <Button variant="outline-success" onClick={onSaveClick} disabled={busy}>
              <Icon icon="mdi:content-save-outline" width="20" height="20" />{" "}
              {saving ? "Saving..." : "Save"}
            </Button>
            {stageOpen ? (
              <Button variant="success" onClick={onBayClick} disabled={busy}>
                <Icon icon="mdi:garage-variant" width="20" height="20" /> Save &amp; Bay Allocation
              </Button>
            ) : (
              <Button variant="success" onClick={onStartClick} disabled={busy}>
                <Icon icon="mdi:play-circle-outline" width="20" height="20" /> Save &amp; Start Job
              </Button>
            )}
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
  const { data, isLoading, isError, error, refetch } = useGetJobComplaintQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const ui = data ? getDepartmentUi(data.job.departmentName) : null;
  const [confirmView, setConfirmView] = useState(false); // the "Stage 4 A" confirmation is showing
  // Close in two steps: hide with the animation first, then tell the parent (onHide) and open the next stage window (onSaved).
  // This way the Concern window can never stay open behind the next stage window.
  const [closing, setClosing] = useState(false);
  const pendingDone = useRef(null);
  const requestClose = () => setClosing(true);
  const afterExit = () => {
    const done = pendingDone.current; pendingDone.current = null; setClosing(false);
    onHide?.();
    if (done) setTimeout(() => onSaved?.(done), 0);
  };

  return (
    <Modal show={Boolean(jobId) && !closing} onHide={requestClose} onExited={afterExit} size={confirmView ? "md" : "xl"} fullscreen={confirmView ? false : "xl-down"} scrollable centered backdrop="static" dialogClassName={`cm-modal ${confirmView ? "cm-confirm" : ""}`}>
      <style>{`
        @media (min-width: 992px) { .modal-dialog.cm-modal { --bs-modal-width: 1000px; } }
        .cm-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
        .cm-modal .cm-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .cm-modal .modal-body { background: #f6f6f7 !important; padding: 18px 22px; }
        .cm-modal .modal-body .bg-white.border.rounded, .cm-modal .modal-body .bg-white.border.rounded-3 { border-radius: 14px !important; border: 1px solid #e3e3e6 !important; border-left: 5px solid #c8102e !important; box-shadow: 0 4px 14px -10px rgba(15,23,42,.45); }
        .cm-modal .modal-body .border.rounded.p-3.mb-3.small { border-radius: 12px !important; background: #fafafb; }
        .cm-modal .btn-outline-success, .cm-modal .btn-outline-secondary { color: #111; border: 1.5px solid #111; border-radius: 12px; font-weight: 600; background: #fff; min-height: 46px; padding: 0 20px; }
        .cm-modal .btn-outline-success:hover, .cm-modal .btn-outline-secondary:hover { color: #fff; background: #111; border-color: #111; }
        .cm-modal .btn-outline-warning { border-radius: 10px; font-weight: 600; }
        .cm-modal .modal-footer .btn-success, .cm-modal .modal-body .btn-success { color: #fff !important; border: 0 !important; border-radius: 12px; font-weight: 700; min-height: 46px; padding: 0 22px; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e, 0 8px 18px -8px rgba(0,0,0,.6); }
        .cm-modal .btn-success:hover { filter: brightness(1.25); }
        .cm-modal .cm-cancel { border-radius: 12px; min-height: 46px; padding: 0 20px; font-weight: 600; background: #fff; color: #111; border: 1.5px solid #c4c4ca; }
        .cm-modal .form-control, .cm-modal .form-select { border-radius: 12px; border: 1.5px solid #c4c4ca; }
        .cm-modal .form-control:focus, .cm-modal .form-select:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .cm-modal .form-check-input:checked { background-color: #c8102e; border-color: #c8102e; }
        .cm-modal .form-check-input:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .cm-modal input[type="radio"], .cm-modal input[type="checkbox"] { accent-color: #c8102e; width: 18px; height: 18px; }
        .cm-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 22px; }
        .cm-modal .cm-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 3px 10px; font-weight: 700; font-size: .85rem; box-shadow: inset 3px 0 0 #c8102e; }
        .cm-modal .cm-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; }
        .cm-modal .cm-opt { cursor: pointer; border-radius: 12px; transition: all .15s ease; }
        .cm-modal .cm-opt:hover { border-color: #c8102e !important; }
        /* "Are you sure about initial starting?" = its own window: no complaint header, the card is the window */
        @media (min-width: 576px) { .modal-dialog.cm-modal.cm-confirm { --bs-modal-width: 620px; } }
        .cm-modal.cm-confirm .modal-content { background: transparent; box-shadow: none; overflow: visible; }
        .cm-modal.cm-confirm .modal-body { background: transparent !important; padding: 0; overflow: visible; }
      `}</style>
      {!confirmView && (
      <Modal.Header closeButton closeVariant="white" className="cm-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-white">
          <Icon icon="mdi:message-alert-outline" width="28" height="28" />
          Customer Concern recording
          {ui && data && <span className="fw-normal small" style={{ color: "rgba(255,255,255,.75)" }}>· {data.job.departmentName}</span>}
        </Modal.Title>
      </Modal.Header>
      )}

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
      {data && <ComplaintForm key={`${data.job.id}-${data.job.departmentId}`} data={data} onHide={requestClose} onSaved={(d) => { pendingDone.current = d; }} startNow={startNow} onConfirmingChange={setConfirmView} />}
    </Modal>
  );
}