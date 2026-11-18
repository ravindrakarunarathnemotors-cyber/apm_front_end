"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import { useGetBayDepartmentQuery, useGetDamageReportDepartmentQuery, useGetEvidenceDepartmentQuery, useGetTeamDepartmentQuery } from "@/store/features/apiSlice";
import { ActionMenu } from "./DepartmentDashboard";
import JobDetailsModal from "./JobDetailsModal";
import ComplaintModal from "./ComplaintModal";
import { OPEN_COMPLAINT_EVENT } from "./PreDepartmentActions";
import TeamAllocationModal from "./TeamAllocationModal";
import BayAllocationModal from "./BayAllocationModal";
import VehicleEvidenceModal from "./VehicleEvidenceModal";
import VehicleJobInspectionModal from "./VehicleJobInspectionModal"; // Mechanical stage 7
import SparePartsModal from "./SparePartsModal"; // Spare Part Review & Order
import CustomerApprovalModal from "./CustomerApprovalModal"; // Customer Approval (after the spare parts stage)
import InternalInspectionModal from "./InternalInspectionModal"; // Internal Inspection - 1 (after Customer Approval)
import JobActivationModal from "./JobActivationModal"; // Job Activation (after Internal Inspection - 1)
import TeamInspectionModal from "./TeamInspectionModal"; // Team Self-Inspection (after Job Activation)
import TeamReviewModal from "./TeamReviewModal"; // Review Team Inspection Sheet (Department Head)
import DeptTransferModal from "./DeptTransferModal"; // Transfer to other departments (after the review)
import JobEndModal from "./JobEndModal"; // Job Completed / copy the job card to the Account Department
import HandoverCheckModal from "./HandoverCheckModal"; // Handover readiness (after Job Completed)
import DeliveryReviewModal from "./DeliveryReviewModal"; // Delivery Review (after Handover Readiness)
import FreeInspectionModal from "./FreeInspectionModal"; // Free Inspection Schedule (after Delivery Review)
import InvoiceModal from "./InvoiceModal"; // Invoice + payments (created when the Customer Approval is completed)
import ExtraJobScopeModal from "./ExtraJobScopeModal"; // Extra Job Scope (only once the job is activated)
import PreDepartmentActions from "./PreDepartmentActions"; // Evidence first, then Select Department
import DamageReportModal from "./DamageReportModal"; // stage 8: vehicle damages report (can be skipped)
import VehicleJobCheckModal from "./VehicleJobCheckModal"; // Wash: Vehicle Job Inspection checklist
import { useGetJobCheckDepartmentQuery } from "./jobCheckApi";
import WashTeamInspectionModal from "./WashTeamInspectionModal"; // Wash: Team Self-Inspection
import { useGetTeamCheckDepartmentQuery } from "./teamCheckApi";
import WashDryingAreaModal from "./WashDryingAreaModal"; // Wash: Drying Area
import { useGetDryingCheckDepartmentQuery } from "./dryingCheckApi";
import WashInternalInspectionModal from "./WashInternalInspectionModal"; // Wash: Internal Inspection 2
import { useGetInternalCheckDepartmentQuery } from "./internalCheckApi";
import WashDeliveryReviewModal from "./WashDeliveryReviewModal"; // Wash: Delivery Review + OTP
import { useGetWashDeliveryDepartmentQuery } from "./washDeliveryApi";
import { getDepartmentUi } from "./departmentConfig";

const DEPARTMENT_STAGE_NO = 4; // stage 4 = select the department

// Stage actions of ONE job, whatever its department (used by the ALL tab of the Jobs Dashboard).
// Same buttons and same flow as the department dashboards:
//   Start Job / Complaint -> Team (Mechanical) or Bay (Wash) -> Vehicle Evidence of Damages.
// It looks up the job's own department rules, so every row behaves according to its department.
// Modals are only mounted while open, so a long list stays light.
export default function JobActionsCell({ job, block = false }) {
  const dept = job.departmentName || "";
  const skip = { skip: !dept };
  const { data: teamDept } = useGetTeamDepartmentQuery(dept, skip);
  const { data: bayDept } = useGetBayDepartmentQuery(dept, skip);
  const { data: evDept } = useGetEvidenceDepartmentQuery(dept, skip);
  const { data: drDept } = useGetDamageReportDepartmentQuery(dept, skip);
  const { data: jcDept } = useGetJobCheckDepartmentQuery(dept, skip);
  const { data: tcDept } = useGetTeamCheckDepartmentQuery(dept, skip);
  const { data: dcDept } = useGetDryingCheckDepartmentQuery(dept, skip);
  const { data: icDept } = useGetInternalCheckDepartmentQuery(dept, skip);
  const { data: wdDept } = useGetWashDeliveryDepartmentQuery(dept, skip);

  // Stage 4: the job has no department yet -> "Select Department" (same call as the CRM jobs table)
  const waitingForDepartment = job.status === "IN_PROGRESS" && job.stageNo === DEPARTMENT_STAGE_NO && !job.departmentName;
  const [viewOpen, setViewOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  // the department was just selected for this job (stage 4) -> the Customer Complaint window opens by itself
  // The table row AND the phone card both render this cell (one of them is hidden by CSS). Only the visible one may open the window,
  // otherwise two Concern windows open stacked and the second one stays behind the next stage window.
  const anchorRef = useRef(null);
  useEffect(() => {
    const onOpen = (e) => { if (e.detail?.jobId === job.id && anchorRef.current && anchorRef.current.offsetParent !== null) { setStartNow(false); setComplaintOpen(true); } };
    window.addEventListener(OPEN_COMPLAINT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COMPLAINT_EVENT, onOpen);
  }, [job.id]);
  const [startNow, setStartNow] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [bayOpen, setBayOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [washTeamOpen, setWashTeamOpen] = useState(false); // Wash: Team Self-Inspection
  const [dryOpen, setDryOpen] = useState(false); // Wash: Drying Area
  const [intOpen, setIntOpen] = useState(false); // Wash: Internal Inspection 2
  const [washDelOpen, setWashDelOpen] = useState(false); // Wash: Delivery Review
  const [checkOpen, setCheckOpen] = useState(false); // Wash: Vehicle Job Inspection checklist
  const [inspOpen, setInspOpen] = useState(false);
  const [spareOpen, setSpareOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const [teamInspOpen, setTeamInspOpen] = useState(false);
  const [teamReviewOpen, setTeamReviewOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [jobEndOpen, setJobEndOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [freeInspOpen, setFreeInspOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [preEvOpen, setPreEvOpen] = useState(false); // stage 4 "Vehicle Evidence" (view / customer link) after the department is selected

  const hasTeam = Boolean(job.requiresTeam || teamDept?.hasTeamAllocation);
  const hasBay = Boolean(job.requiresBay || bayDept?.hasBayAllocation);
  const evStage = evDept?.evidenceStageNo ?? 7; // Mechanical / Wash 7, Detailing / Accident Repair / Tyre Center 6
  const hasEvidence = Boolean(evDept?.hasVehicleEvidence);

  const hasReport = Boolean(drDept?.hasDamageReport);
  const reportStage = drDept?.damageReportStageNo ?? 8;

  const list = [];
  const live = job.status !== "CANCELLED";
  // a cancelled job keeps the actions of the stages it had already finished (view only); the stage it was cancelled in, and the later ones, are gone
  const reach = (n) => (live ? job.stageNo >= n : job.stageNo > n);
  if (job.status === "IN_PROGRESS" && job.requiresStart && job.complaintSaved && job.bayAllocated && !job.startedAt) {
    list.push({ key: "start", label: "Start Job", icon: "mdi:play-circle-outline", current: true, variant: "success", run: () => { setStartNow(true); setComplaintOpen(true); } });
  }
  if (reach(5)) {
    const open = job.stageNo === 5 && !job.complaintSaved;
    list.push({ key: "complaint", label: open ? "Record Complaint" : "Complaint", icon: "mdi:message-alert-outline", current: open, run: () => { setStartNow(false); setComplaintOpen(true); } });
  }
  if (hasTeam && reach(6)) {
    const open = job.stageNo === 6 && !job.teamAllocated;
    list.push({ key: "team", label: open ? "Allocate Team" : "Team", icon: "mdi:account-group-outline", current: open, run: () => setTeamOpen(true) });
  }
  if (hasBay && reach(6)) {
    const open = job.stageNo === 6 && !job.bayAllocated;
    list.push({ key: "bay", label: open ? "Allocate Bay" : "Bay", icon: "mdi:garage-variant", current: open, run: () => setBayOpen(true) });
  }
  if (reach(5)) {
    list.push({ key: "stage4", label: "Vehicle Evidence", icon: "mdi:car-search-outline", current: false, run: () => setPreEvOpen(true) });
  }
  // Mechanical stage 7 = Vehicle Job Inspection (replaces the old evidence window)
  const inspStage = evDept?.jobInspectionStageNo ?? 7;
  if (evDept?.hasJobInspection && reach(inspStage)) {
    const open = job.stageNo === inspStage;
    list.push({ key: "inspection", label: open ? "Job Inspection" : "Inspection", icon: "mdi:clipboard-check-outline", current: open, run: () => setInspOpen(true) });
  }
  if (hasEvidence && reach(evStage)) {
    const open = job.stageNo === evStage;
    list.push({ key: "evidence", label: open ? "Record Evidence" : "Evidence", icon: "mdi:car-search-outline", current: open, run: () => setEvidenceOpen(true) });
  }

  // Stage 8 = vehicle damages report (Mechanical; can be skipped)
  if (hasReport && reach(reportStage)) {
    const open = job.stageNo === reportStage;
    list.push({ key: "report", label: open ? "Damages Report" : "Report", icon: "mdi:file-alert-outline", current: open, run: () => setReportOpen(true) });
  }

  // Wash: Vehicle Job Inspection checklist (the stage right after the damages report)
  const checkStage = jcDept?.jobCheckStageNo ?? 8;
  if (jcDept?.hasJobCheck && reach(checkStage)) {
    const open = job.stageNo === checkStage;
    list.push({ key: "jobcheck", label: open ? "Job Inspection" : "Inspection", icon: "mdi:clipboard-check-outline", current: open, run: () => setCheckOpen(true) });
  }

  // Wash: Team Self-Inspection (the stage right after the job inspection)
  const teamStage = tcDept?.teamCheckStageNo ?? 9;
  if (tcDept?.hasTeamCheck && reach(teamStage)) {
    const open = job.stageNo === teamStage;
    list.push({ key: "teamcheck", label: open ? "Team Inspection" : "Team Check", icon: "mdi:account-group-outline", current: open, run: () => setWashTeamOpen(true) });
  }

  // Wash: Drying Area (the stage right after the team self-inspection)
  const dryStage = dcDept?.dryingCheckStageNo ?? 10;
  if (dcDept?.hasDryingCheck && reach(dryStage)) {
    const open = job.stageNo === dryStage;
    list.push({ key: "dryingcheck", label: open ? "Drying Area" : "Drying", icon: "mdi:car-wash", current: open, run: () => setDryOpen(true) });
  }

  // Wash: Internal Inspection 2 (the stage right after the drying area)
  const intStage = icDept?.internalCheckStageNo ?? 11;
  if (icDept?.hasInternalCheck && reach(intStage)) {
    const open = job.stageNo === intStage;
    list.push({ key: "internalcheck", label: open ? "Internal Inspection" : "Interior", icon: "mdi:car-seat", current: open, run: () => setIntOpen(true) });
  }

  // Spare Part Review & Order: the spare parts are part of the Vehicle Job Inspection window, so this stage has no button of its own.
  // It is only offered for a job that is still waiting at this stage (saved earlier), so that it can be completed.
  const spareStage = evDept?.spareStageNo;
  if (evDept?.hasSpareParts && spareStage && job.stageNo === spareStage && live) {
    const open = job.stageNo === spareStage;
    list.push({ key: "spare", label: open ? "Spare Parts" : "Parts", icon: "mdi:cog-transfer-outline", current: open, run: () => setSpareOpen(true) });
  }

  // Customer Approval (departments that use it: right after the spare parts stage)
  const approvalStage = evDept?.approvalStageNo;
  if (evDept?.hasCustomerApproval && approvalStage && reach(approvalStage)) {
    const open = job.stageNo === approvalStage;
    list.push({ key: "approval", label: open ? "Customer Approval" : "Approval", icon: "mdi:account-check-outline", current: open, run: () => setApprovalOpen(true) });
  }

  // Internal Inspection - 1 (after Customer Approval)
  const internalStage = evDept?.internalStageNo;
  if (evDept?.hasInternalInspection && internalStage && reach(internalStage)) {
    const open = job.stageNo === internalStage;
    list.push({ key: "internal", label: open ? "Internal Inspection" : "Inspection 1", icon: "mdi:clipboard-list-outline", current: open, run: () => setInternalOpen(true) });
  }

  // Job Activation (after Internal Inspection - 1)
  const activationStage = evDept?.activationStageNo;
  if (evDept?.hasJobActivation && activationStage && reach(activationStage)) {
    const open = job.stageNo === activationStage;
    list.push({ key: "activation", label: open ? "Job Activation" : "Activation", icon: "mdi:rocket-launch-outline", current: open, run: () => setActivationOpen(true) });
  }

  // Team Self-Inspection (after Job Activation)
  const teamInspStage = evDept?.teamInspectionStageNo;
  if (evDept?.hasTeamInspection && teamInspStage && reach(teamInspStage)) {
    const open = job.stageNo === teamInspStage;
    list.push({ key: "teaminsp", label: open ? "Team Self-Inspection" : "Self-Inspection", icon: "mdi:clipboard-check-multiple-outline", current: open, run: () => setTeamInspOpen(true) });
  }

  // Review Team Inspection Sheet (Department Head: Approved Yes / No)
  const reviewStage = evDept?.teamReviewStageNo;
  if (evDept?.hasTeamReview && reviewStage && reach(reviewStage)) {
    const open = job.stageNo === reviewStage;
    list.push({ key: "teamreview", label: open ? "Review Inspection" : "Review", icon: "mdi:clipboard-text-search-outline", current: open, run: () => setTeamReviewOpen(true) });
  }

  // Transfer to other departments (Wash / Detail), after the review
  const transferStage = evDept?.deptTransferStageNo;
  if (evDept?.hasDeptTransfer && transferStage && reach(transferStage)) {
    const open = job.stageNo === transferStage;
    list.push({ key: "transfer", label: open ? "Transfer Department" : "Transfer", icon: "mdi:swap-horizontal-bold", current: open, run: () => setTransferOpen(true) });
  }

  // Job Completed / copy the job card to the Account Department (after the transfer stage)
  const jobEndStage = evDept?.jobEndStageNo;
  if (evDept?.hasJobEnd && jobEndStage && reach(jobEndStage)) {
    const open = job.stageNo === jobEndStage;
    list.push({ key: "jobend", label: open ? "End Job" : "Job End", icon: "mdi:flag-checkered", current: open, run: () => setJobEndOpen(true) });
  }

  // Handover readiness (after Job Completed)
  const handoverStage = evDept?.handoverCheckStageNo;
  if (evDept?.hasHandoverCheck && handoverStage && reach(handoverStage)) {
    const open = job.stageNo === handoverStage;
    list.push({ key: "handover", label: open ? (/wash/i.test(dept || "") ? "Delivery Arrangement" : "Handover Check") : (/wash/i.test(dept || "") ? "Delivery" : "Handover"), icon: "mdi:car-key", current: open, run: () => setHandoverOpen(true) });
  }

  // Wash: Delivery Review + OTP (the stage right after the delivery arrangement)
  const washDelStage = wdDept?.washDeliveryStageNo ?? 14;
  if (wdDept?.hasWashDelivery && reach(washDelStage)) {
    const open = job.stageNo === washDelStage;
    list.push({ key: "washdelivery", label: "Delivery Review", icon: "mdi:car-key", current: open, run: () => setWashDelOpen(true) });
  }

  // Delivery Review (after Handover Readiness)
  const deliveryStage = evDept?.deliveryReviewStageNo;
  if (evDept?.hasDeliveryReview && deliveryStage && reach(deliveryStage)) {
    const open = job.stageNo === deliveryStage;
    list.push({ key: "delivery", label: open ? "Delivery Review" : "Delivery", icon: "mdi:truck-check-outline", current: open, run: () => setDeliveryOpen(true) });
  }

  // Free Inspection Schedule (after Delivery Review)
  const freeInspStage = evDept?.freeInspectionStageNo;
  if (evDept?.hasFreeInspection && freeInspStage && reach(freeInspStage)) {
    const open = job.stageNo === freeInspStage;
    list.push({ key: "freeinsp", label: open ? "Free Inspection" : "Free Insp.", icon: "mdi:calendar-check-outline", current: open, run: () => setFreeInspOpen(true) });
  }

  // Invoice (created when the Customer Approval stage is completed)
  if (evDept?.hasCustomerApproval && evDept.approvalStageNo && job.stageNo > evDept.approvalStageNo && live) {
    list.push({ key: "invoice", label: "Invoice", icon: "mdi:receipt-text-outline", current: false, run: () => setInvoiceOpen(true) });
  }
  // Wash: the invoice is created when the job is started, and the charges are added to it as the stages go on
  if (/wash/i.test(dept || "") && !evDept?.hasCustomerApproval && job.startedAt && live) {
    list.push({ key: "invoice", label: "Invoice", icon: "mdi:receipt-text-outline", current: false, run: () => setInvoiceOpen(true) });
  }

  // Extra Job Scope: only after the job is activated
  if (job.activationEnabled && job.activatedAt && live) {
    list.push({ key: "extra", label: "Extra Job Scope", icon: "mdi:playlist-plus", current: false, run: () => setExtraOpen(true) });
  }

  const current = list.find((a) => a.current);
  const extra = list.find((a) => a.key === "extra"); // shown as its own button, not inside the menu
  const others = list.filter((a) => a !== current && a !== extra);
  // team / bay saved (stage completed) -> the Vehicle Job Inspection window opens by itself (Mechanical)
  const afterAllocation = ({ stageCompleted }) => {
    if (!stageCompleted) return;
    if (evDept?.hasJobInspection) { setInspOpen(true); return; }
    // Wash: bay allocated -> the Start Job window (approval Yes / No + confirmation) opens by itself
    if (job.requiresStart && !job.startedAt) { setStartNow(true); setComplaintOpen(true); }
  };

  return (
    <>
      <span ref={anchorRef} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true" />
      {block ? (
        <div className="d-flex flex-wrap gap-2">
          {waitingForDepartment && <PreDepartmentActions job={job} block={block} />}
          {/* phone: only the current stage, Extra Job Scope and View are outside; the buttons of the completed stages are in "More" */}
          {current && (
            <Button size="sm" variant={current.variant || "primary"} className="flex-fill" onClick={current.run}>
              <Icon icon={current.icon} width="18" height="18" /> {current.label}
            </Button>
          )}
          {extra && (
            <Button size="sm" variant="outline-dark" className="flex-fill" onClick={extra.run}>
              <Icon icon={extra.icon} width="18" height="18" /> {extra.label}
            </Button>
          )}
          <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => setViewOpen(true)}>
            <Icon icon="mdi:eye-outline" width="18" height="18" /> View
          </Button>
          {others.length > 0 && <ActionMenu id={`more-m-${job.id}`} actions={others} label="More" icon="mdi:dots-horizontal" block />}
        </div>
      ) : (
        <div className="d-flex gap-1 justify-content-end align-items-center">
          {waitingForDepartment && <PreDepartmentActions job={job} block={block} />}
          {current && (
            <Button size="sm" variant={current.variant || "primary"} className="text-nowrap" onClick={current.run}>
              <Icon icon={current.icon} width="18" height="18" /> {current.label}
            </Button>
          )}
          {extra && (
          <Button size="sm" variant="outline-dark" className="text-nowrap" onClick={extra.run}>
            <Icon icon={extra.icon} width="18" height="18" /> {extra.label}
          </Button>
        )}
          <ActionMenu id={`all-${job.id}`} actions={[...others, { key: "view", label: "View", icon: "mdi:eye-outline", run: () => setViewOpen(true) }]} />
        </div>
      )}

      {spareOpen && <SparePartsModal key={`sp${job.id}`} jobId={job.id} onHide={() => setSpareOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted) { if (evDept?.hasCustomerApproval) setApprovalOpen(true); else if (hasReport) setReportOpen(true); } }} />}
      {approvalOpen && <CustomerApprovalModal key={`ca${job.id}`} jobId={job.id} onHide={() => setApprovalOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasInternalInspection) setInternalOpen(true); }} />}
      {internalOpen && <InternalInspectionModal key={`ii${job.id}`} jobId={job.id} onHide={() => setInternalOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasJobActivation) setActivationOpen(true); }} />}
      {activationOpen && <JobActivationModal key={`ja${job.id}`} jobId={job.id} onHide={() => setActivationOpen(false)} onSaved={() => { /* the job has started: the next stage is NOT opened automatically (it is opened from the actions menu) */ }} />}
      {teamInspOpen && <TeamInspectionModal key={`ti${job.id}`} jobId={job.id} onHide={() => setTeamInspOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasTeamReview) setTeamReviewOpen(true); }} />}
      {teamReviewOpen && <TeamReviewModal key={`tr${job.id}`} jobId={job.id} onHide={() => setTeamReviewOpen(false)} onSaved={({ reopened, stageCompleted }) => { if (reopened) setTeamInspOpen(true); else if (stageCompleted && evDept?.hasDeptTransfer) setTransferOpen(true); }} />}
      {transferOpen && <DeptTransferModal key={`dt${job.id}`} jobId={job.id} onHide={() => setTransferOpen(false)} onSaved={({ stageCompleted }) => { if (!stageCompleted) return; if (evDept?.hasJobEnd) setJobEndOpen(true); else if (evDept?.hasHandoverCheck) setHandoverOpen(true); }} />}
      {jobEndOpen && <JobEndModal key={`je${job.id}`} jobId={job.id} onHide={() => setJobEndOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasHandoverCheck) setHandoverOpen(true); }} />}
      {handoverOpen && <HandoverCheckModal key={`hc${job.id}`} jobId={job.id} onHide={() => setHandoverOpen(false)} onSaved={({ stageCompleted }) => { if (!stageCompleted) return; if (evDept?.hasDeliveryReview) setDeliveryOpen(true); else if (wdDept?.hasWashDelivery) setWashDelOpen(true); }} />}
      {washDelOpen && <WashDeliveryReviewModal key={`wd${job.id}`} jobId={job.id} onHide={() => setWashDelOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasFreeInspection) setFreeInspOpen(true); }} />}
      {deliveryOpen && <DeliveryReviewModal key={`dr${job.id}`} jobId={job.id} onHide={() => setDeliveryOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasFreeInspection) setFreeInspOpen(true); }} />}
      {freeInspOpen && <FreeInspectionModal key={`fi${job.id}`} jobId={job.id} onHide={() => setFreeInspOpen(false)} />}
      {invoiceOpen && <InvoiceModal key={`inv${job.id}`} jobId={job.id} onHide={() => setInvoiceOpen(false)} />}
      {extraOpen && <ExtraJobScopeModal key={`ex${job.id}`} jobId={job.id} onHide={() => setExtraOpen(false)} />}
      {inspOpen && <VehicleJobInspectionModal key={`insp${job.id}`} jobId={job.id} onHide={() => setInspOpen(false)} onSaved={({ stageCompleted, spareCompleted }) => { if (!stageCompleted) return; /* spare parts are part of the inspection window now: when they were completed with it, go straight on */ if (spareCompleted) { if (evDept?.hasCustomerApproval) setApprovalOpen(true); else if (hasReport) setReportOpen(true); } else if (evDept?.hasSpareParts) setSpareOpen(true); else if (hasReport) setReportOpen(true); }} />}
      {preEvOpen && <VehicleEvidenceModal key={`pre${job.id}`} jobId={job.id} preDepartment onHide={() => setPreEvOpen(false)} />}
      {viewOpen && <JobDetailsModal jobId={job.id} onHide={() => setViewOpen(false)} />}
      {teamOpen && <TeamAllocationModal key={job.id} jobId={job.id} onHide={() => setTeamOpen(false)} onSaved={afterAllocation} />}
      {bayOpen && <BayAllocationModal key={job.id} jobId={job.id} onHide={() => setBayOpen(false)} onSaved={afterAllocation} />}
      {evidenceOpen && (
        <VehicleEvidenceModal key={job.id} jobId={job.id} onHide={() => setEvidenceOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && hasReport) setReportOpen(true); }} />
      )}
      {reportOpen && <DamageReportModal key={job.id} jobId={job.id} onHide={() => setReportOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && jcDept?.hasJobCheck) setCheckOpen(true); }} />}
      {checkOpen && <VehicleJobCheckModal key={`jc${job.id}`} jobId={job.id} onHide={() => setCheckOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && tcDept?.hasTeamCheck) setWashTeamOpen(true); }} />}
      {washTeamOpen && <WashTeamInspectionModal key={`tc${job.id}`} jobId={job.id} onHide={() => setWashTeamOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && dcDept?.hasDryingCheck) setDryOpen(true); }} />}
      {dryOpen && <WashDryingAreaModal key={`dc${job.id}`} jobId={job.id} onHide={() => setDryOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && icDept?.hasInternalCheck) setIntOpen(true); }} />}
      {intOpen && <WashInternalInspectionModal key={`ic${job.id}`} jobId={job.id} onHide={() => setIntOpen(false)} onSaved={({ stageCompleted }) => { if (stageCompleted && evDept?.hasDeptTransfer) setTransferOpen(true); }} />}
      {complaintOpen && (
        <ComplaintModal
          jobId={job.id}
          startNow={startNow}
          onSaved={({ stageCompleted, started }) => {
            // Wash: the job has just been started -> the Vehicle Damages Report window opens by itself
            if (started && hasReport) { setReportOpen(true); return; }
            // complaint (or Start Job) finished -> next stage window opens by itself
            if (!stageCompleted) return;
            if (hasTeam) setTeamOpen(true);
            else if (hasBay) setBayOpen(true);
            else if (hasEvidence && evStage <= 6) setEvidenceOpen(true);
          }}
          onHide={() => { setComplaintOpen(false); setStartNow(false); }}
        />
      )}
    </>
  );
}