"use client";

import { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import { useGetDepartmentsQuery, useGetPreEvidenceQuery, useSetJobDepartmentMutation } from "@/store/features/apiSlice";
import { ActionMenu } from "./DepartmentDashboard";
import VehicleEvidenceModal from "./VehicleEvidenceModal"; // the same Vehicle Evidence window, in stage 4 mode
import { getDepartmentUi } from "./departmentConfig";

// Job at stage 4 (no department yet), used in the CRM jobs table AND the Jobs Dashboard:
//   1. only the "Evidence" button is shown (photos / videos of the vehicle),
//   2. once the evidence is uploaded, "Select Department" appears.
// After a department is chosen the Customer Complaint window must open by itself. This component disappears as soon as the job
// leaves stage 4, so it announces the job on `window`; JobActionsCell / JobsTable (which stay mounted) listen and open the window.
export const OPEN_COMPLAINT_EVENT = "autopromax:open-complaint";

// Props: job { id, jobNo, regNo }, block (full-width buttons for the mobile cards)
export default function PreDepartmentActions({ job, block = false }) {
  const { data: pre, isLoading } = useGetPreEvidenceQuery(job.id);
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [setJobDepartment, { isLoading: saving }] = useSetJobDepartmentMutation();
  const [open, setOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false); // "Next: Select Department" step

  const general = (pre?.files || []).filter((f) => f.category !== "PROPERTY").length;
  const property = (pre?.files || []).filter((f) => f.category === "PROPERTY").length;
  const count = general + property;
  // the department can be selected only when the evidence is complete: vehicle photos / videos + the property question answered (Yes -> its photos / videos)
  const evidenceDone = general > 0 && pre?.propertyInside != null && (pre.propertyInside === false || property > 0);

  const pick = async (d) => {
    const ok = await Swal.fire({ title: "Select department?", text: `${job.jobNo} will be assigned to ${d.name}.`, icon: "question", showCancelButton: true, confirmButtonText: "Yes, assign" });
    if (!ok.isConfirmed) return false;
    try {
      await setJobDepartment({ id: job.id, departmentId: d.id }).unwrap(); // lists refresh by themselves
      await Swal.fire({ title: "Done!", text: `${d.name} selected.`, icon: "success", timer: 1000, showConfirmButton: false });
      window.dispatchEvent(new CustomEvent(OPEN_COMPLAINT_EVENT, { detail: { jobId: job.id } })); // -> Customer Complaint recording window
      return true;
    } catch (err) {
      Swal.fire({ title: "Error", text: err?.data?.message || "Failed to select the department.", icon: "error" });
      return false;
    }
  };

  return (
    <>
      <Button size="sm" variant={evidenceDone ? "outline-warning" : "warning"} className={`text-nowrap ${block ? "flex-fill" : ""}`} disabled={isLoading} onClick={() => setOpen(true)}>
        <Icon icon="mdi:car-search-outline" width="18" height="18" /> {evidenceDone ? `Evidence (${count})` : "Evidence"}
      </Button>
      {evidenceDone && (
        <div className={block ? "flex-fill" : ""}>
          <ActionMenu
            id={`dept-${job.id}`}
            label="Select Department"
            icon="mdi:domain"
            variant="primary"
            busy={saving}
            block={block}
            actions={
              departments.length === 0
                ? [{ key: "none", label: "No departments", icon: "mdi:domain-off", run: () => {} }]
                : departments.map((d) => ({ key: d.id, label: d.name, icon: getDepartmentUi(d.name).icon, run: () => pick(d) }))
            }
          />
        </div>
      )}
      {open && (
        <VehicleEvidenceModal
          jobId={job.id}
          preDepartment
          onHide={() => setOpen(false)}
          onNext={() => { setOpen(false); setDeptOpen(true); }}
        />
      )}
      {deptOpen && (
        <Modal show onHide={() => setDeptOpen(false)} centered enforceFocus={false} dialogClassName="sd-modal">
          <style>{`
            .sd-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
            @media (min-width: 576px) { .modal-dialog.sd-modal { --bs-modal-width: 520px; } }
            .sd-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
            .sd-modal .modal-body { background: #f6f6f7; padding: 18px 20px; }
            .sd-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 3px 10px; font-weight: 700; font-size: .82rem; box-shadow: inset 3px 0 0 #c8102e; }
            .sd-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; }
            .sd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            @media (max-width: 420px) { .sd-grid { grid-template-columns: 1fr; } }
            .sd-dept { display: flex; align-items: center; gap: 12px; text-align: left; background: #fff; border: 1.5px solid #e3e3e6; border-left-width: 5px; border-radius: 14px; padding: 12px 12px; min-height: 68px; font-weight: 700; color: #0f172a; transition: transform .12s, box-shadow .15s, border-color .15s, background .15s; }
            .sd-dept:hover:not(:disabled) { transform: translateY(-2px); background: #fff1f2; box-shadow: 0 10px 22px -12px rgba(200,16,46,.55); }
            .sd-dept:disabled { opacity: .55; }
            .sd-ico { width: 44px; height: 44px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .sd-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 20px; }
            .sd-back { border-radius: 12px; min-height: 44px; padding: 0 20px; font-weight: 600; background: #fff; color: #111; border: 1.5px solid #c4c4ca; }
          `}</style>
          <Modal.Header closeButton closeVariant="white" className="sd-head">
            <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-white">
              <Icon icon="mdi:domain" width="28" height="28" /> Select Department
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="sd-jobno">{job.jobNo}</span>
              {job.regNo && <span className="sd-plate">{job.regNo}</span>}
              <span className="small text-muted ms-1">Which department will do this job?</span>
            </div>
            {departments.length === 0 && <div className="text-muted text-center py-3">No departments.</div>}
            <div className="sd-grid">
              {departments.map((d) => {
                const ui = getDepartmentUi(d.name);
                return (
                  <button key={d.id} type="button" className="sd-dept" style={{ borderLeftColor: ui.color }} disabled={saving}
                    onClick={async () => { if (await pick(d)) setDeptOpen(false); }}>
                    <span className="sd-ico" style={{ color: ui.color, background: `color-mix(in srgb, ${ui.color} 12%, white)` }}>
                      <Icon icon={ui.icon} width="26" height="26" />
                    </span>
                    <span className="flex-grow-1">{d.name}</span>
                    <Icon icon="mdi:chevron-right" width="22" height="22" style={{ color: "#94a3b8" }} />
                  </button>
                );
              })}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" className="sd-back" onClick={() => { setDeptOpen(false); setOpen(true); }}>
              <Icon icon="mdi:arrow-left" width="18" height="18" /> Back
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}