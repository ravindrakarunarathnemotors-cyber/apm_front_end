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
        <Modal show onHide={() => setDeptOpen(false)} centered size="sm" enforceFocus={false}>
          <Modal.Header closeButton><Modal.Title className="fs-6">Select Department · {job.jobNo}</Modal.Title></Modal.Header>
          <Modal.Body className="d-grid gap-2">
            {departments.length === 0 && <div className="text-muted">No departments.</div>}
            {departments.map((d) => (
              <Button key={d.id} variant="outline-primary" className="text-start" disabled={saving}
                onClick={async () => { if (await pick(d)) setDeptOpen(false); }}>
                <Icon icon={getDepartmentUi(d.name).icon} width="18" height="18" color={getDepartmentUi(d.name).color} className="me-2" />{d.name}
              </Button>
            ))}
          </Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => { setDeptOpen(false); setOpen(true); }}>Back</Button></Modal.Footer>
        </Modal>
      )}
    </>
  );
}