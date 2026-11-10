"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, ButtonGroup, Card, Col, Form, FormControl, InputGroup, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import JobStartBadge from "./JobStartBadge";
import { useGetBayDepartmentQuery, useGetDamageReportDepartmentQuery, useGetEvidenceDepartmentQuery, useGetJobsQuery, useGetTeamDepartmentQuery } from "@/store/features/apiSlice";
// Same folder: the View modal (customer + vehicle + job details + timeline) and the department icons / colours.
import JobDetailsModal from "./JobDetailsModal";
import JobsTabs from "./JobsTabs"; // ALL / Mechanical / Wash ... tab links
import ComplaintModal from "./ComplaintModal"; // Stage 5: customer complaint recording / review
import BayAllocationModal from "./BayAllocationModal"; // Stage 6 (Wash): bay allocation without a team
import VehicleEvidenceModal from "./VehicleEvidenceModal";
import VehicleJobInspectionModal from "./VehicleJobInspectionModal"; // Mechanical stage 7
import SparePartsModal from "./SparePartsModal"; // Spare Part Review & Order: Vehicle Job Inspection
import CustomerApprovalModal from "./CustomerApprovalModal"; // Customer Approval
import InternalInspectionModal from "./InternalInspectionModal"; // Internal Inspection - 1
import JobActivationModal from "./JobActivationModal"; // Job Activation
import InvoiceModal from "./InvoiceModal"; // Invoice + payments (created when the Customer Approval is completed)
import FreeInspectionModal from "./FreeInspectionModal"; // Free Inspection Schedule (after Delivery Review)
import DeliveryReviewModal from "./DeliveryReviewModal"; // Delivery Review (after Handover Readiness)
import HandoverCheckModal from "./HandoverCheckModal"; // Handover readiness (after Job Completed)
import JobEndModal from "./JobEndModal"; // Job Completed / copy the job card to the Account Department
import DeptTransferModal from "./DeptTransferModal"; // Transfer to other departments (after the review)
import TeamReviewModal from "./TeamReviewModal"; // Review Team Inspection Sheet (Department Head)
import TeamInspectionModal from "./TeamInspectionModal"; // Team Self-Inspection (after Job Activation)
import ExtraJobScopeModal from "./ExtraJobScopeModal"; // Extra Job Scope (only once the job is activated)
import DamageReportModal from "./DamageReportModal"; // Stage 8: vehicle damages report (can be skipped)
import VehicleJobCheckModal from "./VehicleJobCheckModal"; // Wash: Vehicle Job Inspection checklist (after the damages report)
import { useGetJobCheckDepartmentQuery } from "./jobCheckApi";
import TeamAllocationModal from "./TeamAllocationModal"; // Stage 6: team allocation (team, bay, team leader, PPE ...)
import { usePermissions } from "./permissionsApi"; // action permissions (button shown only when allowed)
import ManageTeamsBaysModal from "./ManageTeamsBaysModal"; // create / edit teams and bays any time (not only at stage 6)
import { getDepartmentUi } from "./departmentConfig";

/* ----------------------------- helpers ----------------------------- */
const fmtDate = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "-" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// "2h 15m" since a given time
const since = (iso) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};

// "today" | "upcoming" | "past" | "" (no appointment): used for the Appointment column and the row tint
const apptState = (job) => {
  if (!job.appointmentDate) return "";
  const t = todayStr();
  return job.appointmentDate === t ? "today" : job.appointmentDate > t ? "upcoming" : "past";
};
const apptRowClass = (j) => (apptState(j) === "upcoming" ? "dd-up" : apptState(j) === "today" ? "dd-today" : "");

// "5m" / "2h 10m" / "3d 4h" since a time (Updated column)
const agoText = (iso) => (iso ? `${since(iso)} ago` : "-");

const todayStr = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time

// A live job whose current stage has been open longer than this is "overdue" (red badge + Overdue chip). Same as the Jobs Dashboard.
const OVERDUE_HOURS = 24;
const stageMins = (j) => (j.status === "IN_PROGRESS" && j.stageStartedAt ? Math.floor((Date.now() - new Date(j.stageStartedAt).getTime()) / 60000) : NaN);
const isOverdue = (j) => stageMins(j) >= OVERDUE_HOURS * 60;
// Sri Lankan numbers: 0771234567 -> 94771234567 (wa.me needs the country code, digits only)
const waNumber = (n) => {
  const d = String(n || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("94")) return d;
  return d.startsWith("0") ? `94${d.slice(1)}` : `94${d}`;
};

// One tap: call or WhatsApp the customer
function ContactButtons({ job, size = 40 }) {
  const tel = String(job.contactNumber || "").replace(/[^\d+]/g, "");
  if (!tel) return null;
  const stop = (e) => e.stopPropagation();
  const style = { width: size, height: size };
  return (
    <span className="d-inline-flex gap-1 flex-shrink-0">
      <a href={`tel:${tel}`} onClick={stop} className="da-contact da-call" style={style} title={`Call ${job.contactNumber}`} aria-label="Call customer">
        <Icon icon="mdi:phone" width="20" height="20" />
      </a>
      <a href={`https://wa.me/${waNumber(job.contactNumber)}`} target="_blank" rel="noopener noreferrer" onClick={stop} className="da-contact da-wa" style={style} title="WhatsApp" aria-label="WhatsApp customer">
        <Icon icon="mdi:whatsapp" width="20" height="20" />
      </a>
    </span>
  );
}

// "in stage 3h 10m", or a red "Overdue · 1d 3h" once the stage is open longer than OVERDUE_HOURS
function StageTime({ job }) {
  const mins = stageMins(job);
  if (!Number.isFinite(mins) || mins < 0) return null;
  const text = since(job.stageStartedAt);
  return isOverdue(job) ? (
    <span className="da-stuck d-inline-flex align-items-center gap-1" title="This stage has been open for a long time">
      <Icon icon="mdi:alert-circle" width="14" height="14" /> Overdue · {text}
    </span>
  ) : (
    <span className="small text-muted d-inline-flex align-items-center gap-1"><Icon icon="mdi:timer-sand" width="14" height="14" /> in stage {text}</span>
  );
}

/* ----------------------------- small components ----------------------------- */
// Appointment column (same as the Jobs Dashboard "All" tab): date / time chip + sales officer + appointment department
function AppointmentCell({ job }) {
  const st = apptState(job);
  if (!st) return <span className="small text-muted">Walk-in</span>;
  const color = st === "today" ? "#c8102e" : st === "past" ? "#64748b" : "#15803d";
  return (
    <div style={{ minWidth: 0 }}>
      <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold small text-nowrap"
        style={{ color, background: `color-mix(in srgb, ${color} 10%, white)`, border: `1px solid color-mix(in srgb, ${color} 35%, white)` }}>
        <Icon icon="mdi:calendar-check-outline" width="15" height="15" />
        {st === "today" ? "Today" : fmtDate(job.appointmentDate)}{job.appointmentTime ? ` · ${job.appointmentTime}` : ""}
      </span>
      {(job.salesOfficer || job.appointmentDepartmentName) && (
        <div className="small text-muted mt-1 lh-sm">
          {job.salesOfficer && <div><Icon icon="mdi:account-tie-outline" width="13" height="13" style={{ color: "#c8102e" }} /> {job.salesOfficer}</div>}
          {job.appointmentDepartmentName && <div><Icon icon="mdi:domain" width="13" height="13" style={{ color: "#c8102e" }} /> {job.appointmentDepartmentName}</div>}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  // phones: smaller icon / number / padding and the label wraps instead of overflowing
  return (
    <Card className="h-100 border-0" style={{ borderRadius: 14, borderLeft: `5px solid ${color}`, boxShadow: "0 4px 14px -8px rgba(15,23,42,.35)" }}>
      <style>{`
        .dd-stat-body { gap: 12px; padding: 1rem; }
        .dd-stat-icon { width: 52px; height: 52px; }
        .dd-stat-val { font-size: 1.75rem; }
        @media (max-width: 575.98px) {
          .dd-stat-body { gap: 8px; padding: .6rem .6rem .6rem .5rem; }
          .dd-stat-icon { width: 36px; height: 36px; }
          .dd-stat-icon svg { width: 20px; height: 20px; }
          .dd-stat-val { font-size: 1.3rem; }
          .dd-stat-label { font-size: .7rem; }
        }
      `}</style>
      <Card.Body className="d-flex align-items-center dd-stat-body">
        <span
          className="dd-stat-icon rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
        >
          <Icon icon={icon} width="28" height="28" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="dd-stat-val fw-bold lh-1">{value}</div>
          <div className="dd-stat-label text-muted small mt-1" style={{ lineHeight: 1.2, overflowWrap: "anywhere" }}>{label}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

// Stage column: a coloured status chip with the stage name, and (for departments that use the Job Activation stage)
// whether the job is activated. No progress bar.
const tintOf = (c, a) => `color-mix(in srgb, ${c} ${a}%, white)`;
function StageCell({ job }) {
  const done = job.status === "COMPLETED", cancelled = job.status === "CANCELLED";
  const live = !done && !cancelled;
  const color = done ? "#16a34a" : cancelled ? "#64748b" : getDepartmentUi(job.departmentName).color;
  const icon = done ? "mdi:check-circle" : cancelled ? "mdi:close-circle" : "mdi:progress-clock";
  const name = done ? "Completed" : cancelled ? "Cancelled" : (job.stageName ?? "-");
  return (
    <div style={{ minWidth: 0, maxWidth: "100%" }}>
      {/* 1. the stage name (wraps inside its own box) */}
      <div className="d-flex align-items-start gap-2 rounded-3 px-2 py-1 fw-semibold small lh-sm" style={{ color, background: tintOf(color, 11), border: `1px solid ${tintOf(color, 28)}` }}>
        <Icon icon={icon} width="16" height="16" className="flex-shrink-0 mt-1" />
        <span className="text-break">{name}</span>
      </div>
      {/* 2. small facts, one per line */}
      {live && (
        <div className="d-flex flex-column gap-1 mt-1 align-items-start">
          <span className="small text-muted">Stage {job.stageNo}</span>
          <StageTime job={job} />
        </div>
      )}
      {job.activationEnabled && (job.activatedAt ? (
        <span className="d-inline-flex align-items-center gap-1 small fw-semibold rounded-pill px-2 mt-1" title={new Date(job.activatedAt).toLocaleString()} style={{ color: "#15803d", background: "#dcfce7" }}>
          <Icon icon="mdi:rocket-launch" width="14" height="14" /> Job activated
        </span>
      ) : live ? (
        <span className="d-inline-flex align-items-center gap-1 small rounded-pill px-2 mt-1" style={{ color: "#92400e", background: "#fef3c7" }}>
          <Icon icon="mdi:rocket-launch-outline" width="14" height="14" /> Not activated
        </span>
      ) : null)}
      <JobStartBadge job={job} />
    </div>
  );
}

/* ----------------------------- dashboard ----------------------------- */
// One dashboard for every department. `department` must match department.name in the database
// (e.g. "Mechanical", "Wash", "Detailing", "Accident Repair", "Tyre Center").
// "More actions" menu. The list is drawn on <body> (position: fixed) right under the ⋮ button, so the
// scrolling table never clips it or moves it to the top of the page.
export function ActionMenu({ id, actions, label, icon, variant = "outline-secondary", busy = false, block = false }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null); // { top, right } or null = closed

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btnRef.current.getBoundingClientRect();
    // a long list (many stages) must stay inside the screen: open upwards when there is more room above, and scroll inside the menu
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 240 && above > below;
    const right = Math.max(8, window.innerWidth - r.right);
    const small = window.innerWidth < 576;   // phones: smaller tiles
    setPos(up ? { bottom: window.innerHeight - r.top + 4, right, maxHeight: Math.max(120, above), small } : { top: r.bottom + 4, right, maxHeight: Math.max(120, below), small });
  };

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const grid = actions.length > 4;   // many stages: 3 columns (icon on top, label below) so the menu stays short
  return (
    <>
      <Button ref={btnRef} size="sm" variant={variant} className={label ? `text-nowrap ${block ? "w-100" : ""}` : "px-2"} disabled={busy} aria-label={label || "More actions"} aria-expanded={Boolean(pos)} id={`more-${id}`} onClick={toggle}>
        {label ? <>{busy ? <Spinner animation="border" size="sm" /> : <Icon icon={icon || "mdi:menu-down"} width="18" height="18" />} {label}</> : <Icon icon="mdi:dots-vertical" width="18" height="18" />}
      </Button>
      {pos &&
        createPortal(
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setPos(null)} />
            <div className={`bg-white border rounded-3 shadow ${grid ? "" : "py-1"}`} style={{ position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right, zIndex: 2000, minWidth: grid ? undefined : 180, width: grid ? (pos.small ? "min(calc(100vw - 16px), 264px)" : "min(calc(100vw - 16px), 340px)") : undefined, maxWidth: "calc(100vw - 16px)", maxHeight: pos.maxHeight, ...(grid ? { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: pos.small ? 3 : 4, padding: pos.small ? 4 : 6 } : {}), overflowY: "auto", overscrollBehavior: "contain" }} role="menu">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="menuitem"
                  className={grid
                    ? "btn btn-light text-decoration-none text-dark d-flex flex-column align-items-center justify-content-center gap-1 w-100 text-center px-1 py-2 border"
                    : "btn btn-link text-decoration-none text-dark d-flex align-items-center gap-2 w-100 text-start px-3 py-2 rounded-0"}
                  style={grid ? (pos.small ? { fontSize: ".66rem", lineHeight: 1.1, minHeight: 46, overflowWrap: "anywhere" } : { fontSize: ".74rem", lineHeight: 1.15, minHeight: 64, overflowWrap: "anywhere" }) : undefined}
                  onClick={() => { setPos(null); a.run(); }}
                >
                  <Icon icon={a.icon} width={grid ? (pos.small ? 17 : 22) : 18} height={grid ? (pos.small ? 17 : 22) : 18} /> {a.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export default function DepartmentDashboard({ department }) {
  const { can } = usePermissions();
  const ui = getDepartmentUi(department); // icon + colour of the department
  const COLOR = ui.color;

  // Only jobs whose department is this one. Refreshes itself every minute.
  const { data: jobs = [], isLoading, isFetching, isError, refetch, fulfilledTimeStamp } = useGetJobsQuery(department, {
    pollingInterval: 60000,
  });

  const [viewJobId, setViewJobId] = useState(null);
  const [complaintJobId, setComplaintJobId] = useState(null);
  const [complaintStartNow, setComplaintStartNow] = useState(false); // opened with "Start Job"
  const [teamJobId, setTeamJobId] = useState(null);
  const [evidenceJobId, setEvidenceJobId] = useState(null);
  const [inspJobId, setInspJobId] = useState(null);
  const [spareJobId, setSpareJobId] = useState(null);
  const [approvalJobId, setApprovalJobId] = useState(null);
  const [internalJobId, setInternalJobId] = useState(null);
  const [activationJobId, setActivationJobId] = useState(null);
  const [teamInspJobId, setTeamInspJobId] = useState(null);
  const [teamReviewJobId, setTeamReviewJobId] = useState(null);
  const [transferJobId, setTransferJobId] = useState(null);
  const [jobEndJobId, setJobEndJobId] = useState(null);
  const [handoverJobId, setHandoverJobId] = useState(null);
  const [deliveryJobId, setDeliveryJobId] = useState(null);
  const [freeInspJobId, setFreeInspJobId] = useState(null);
  const [invoiceJobId, setInvoiceJobId] = useState(null);
  const [extraJobId, setExtraJobId] = useState(null);
  const [preEvJobId, setPreEvJobId] = useState(null); // stage 4 "Vehicle Evidence" (view / customer link)
  const [bayJobId, setBayJobId] = useState(null);
  const [reportJobId, setReportJobId] = useState(null);
  const [checkJobId, setCheckJobId] = useState(null); // Wash: Vehicle Job Inspection checklist
  const { data: jcDept } = useGetJobCheckDepartmentQuery(department);
  const { data: drDept } = useGetDamageReportDepartmentQuery(department); // Mechanical: stage 8 damages report
  const [managingBays, setManagingBays] = useState(false);
  const { data: bayDept } = useGetBayDepartmentQuery(department); // Wash: bays only, no teams
  const { data: evDept } = useGetEvidenceDepartmentQuery(department); // does this department use Stage 7?
  const [managingTeams, setManagingTeams] = useState(false);

  // Does this department use teams and bays (Mechanical)?  Then the "Teams & Bays" button is shown.
  const { data: teamDept } = useGetTeamDepartmentQuery(department);
  const hasTeams = Boolean(teamDept?.hasTeamAllocation);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | IN_PROGRESS | COMPLETED
  const [stage, setStage] = useState(""); // stage no as string
  const [appointment, setAppointment] = useState(""); // "" | ANY | TODAY | UPCOMING | PAST | NONE
  const [overdue, setOverdue] = useState(false);       // only jobs whose current stage is open too long
  const [showFilters, setShowFilters] = useState(false); // phone: appointment + status filters hide behind the Filters button

  // ---- stats ----
  const stats = useMemo(
    () => ({
      total: jobs.length,
      inProgress: jobs.filter((j) => j.status === "IN_PROGRESS").length,
      completed: jobs.filter((j) => j.status === "COMPLETED").length,
      today: jobs.filter((j) => j.appointmentDate === todayStr()).length,
      overdue: jobs.filter(isOverdue).length,
    }),
    [jobs]
  );

  // ---- how many in-progress jobs are at each stage (clickable chips) ----
  const stageChips = useMemo(() => {
    const map = new Map();
    jobs
      .filter((j) => j.status === "IN_PROGRESS")
      .forEach((j) => {
        const cur = map.get(j.stageNo) || { name: j.stageName, count: 0 };
        cur.count += 1;
        map.set(j.stageNo, cur);
      });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [jobs]);

  // ---- filtered list ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, "");
    return jobs.filter((j) => {
      if (status !== "ALL" && j.status !== status) return false;
      if (stage && String(j.stageNo) !== stage) return false;
      if (overdue && !isOverdue(j)) return false;
      const a = apptState(j);
      if (appointment === "ANY" && !a) return false;
      if (appointment === "NONE" && a) return false;
      if (["TODAY", "UPCOMING", "PAST"].includes(appointment) && a !== appointment.toLowerCase()) return false;
      if (!q) return true;
      return [j.jobNo, j.customerName, j.contactNumber, j.regNo, j.salesOfficer].some((v) =>
        String(v ?? "").toLowerCase().replace(/[\s-]/g, "").includes(q)
      );
    });
  }, [jobs, query, status, stage, appointment, overdue]);
  const activeFilters = (status !== "ALL" ? 1 : 0) + (appointment ? 1 : 0) + (overdue ? 1 : 0) + (stage ? 1 : 0);
  const updatedText = fulfilledTimeStamp ? (Date.now() - fulfilledTimeStamp < 60000 ? "just now" : `${since(new Date(fulfilledTimeStamp).toISOString())} ago`) : "";

  // departments with team allocation (Mechanical): from the department lookup or the job row
  const hasTeam = (job) => Boolean(job.requiresTeam || teamDept?.hasTeamAllocation);
  const hasBay = (job) => Boolean(job.requiresBay || bayDept?.hasBayAllocation);

  // All actions of a job. Table: only the current-stage action (blue/green) + View + a "More" menu, so the
  // Action column stays narrow however many stages a department has. Cards: every action as a button.
  const actionsOf = (job) => {
    const list = [];
    const live = job.status !== "CANCELLED";
    // Wash: complaint saved earlier, job not started yet -> "Start Job"
    if (job.status === "IN_PROGRESS" && job.requiresStart && job.complaintSaved && job.bayAllocated && !job.startedAt) {
      list.push({ key: "start", label: "Start Job", icon: "mdi:play-circle-outline", current: true, variant: "success",
        run: () => { setComplaintStartNow(true); setComplaintJobId(job.id); } });
    }
    // Stage 5 = customer complaint
    if (job.stageNo >= 5 && live) {
      const open = job.stageNo === 5 && !job.complaintSaved;
      list.push({ key: "complaint", label: open ? "Record Complaint" : "Complaint", icon: "mdi:message-alert-outline", current: open,
        run: () => { setComplaintStartNow(false); setComplaintJobId(job.id); } });
    }
    // Stage 6 = team allocation (Mechanical)
    if (hasTeam(job) && job.stageNo >= 6 && live) {
      const open = job.stageNo === 6 && !job.teamAllocated;
      list.push({ key: "team", label: open ? "Allocate Team" : "Team", icon: "mdi:account-group-outline", current: open, run: () => setTeamJobId(job.id) });
    }
    // Stage 4 = common Vehicle Evidence (recorded before the department was chosen)
    if (job.stageNo >= 5 && live) {
      list.push({ key: "stage4", label: "Vehicle Evidence", icon: "mdi:car-search-outline", current: false, run: () => setPreEvJobId(job.id) });
    }
    // Stage 6 = bay allocation (Wash: a bay, no team)
    if (hasBay(job) && job.stageNo >= 6 && live) {
      const open = job.stageNo === 6 && !job.bayAllocated;
      list.push({ key: "bay", label: open ? "Allocate Bay" : "Bay", icon: "mdi:garage-variant", current: open, run: () => setBayJobId(job.id) });
    }
    // Stage 7 = Vehicle Job Inspection (Mechanical)
    const inspStage = evDept?.jobInspectionStageNo ?? 7;
    if (evDept?.hasJobInspection && job.stageNo >= inspStage && live) {
      const open = job.stageNo === inspStage;
      list.push({ key: "inspection", label: open ? "Job Inspection" : "Inspection", icon: "mdi:clipboard-check-outline", current: open, run: () => setInspJobId(job.id) });
    }
    // Stage 7 = vehicle evidence of damages (other departments)
    const evStage = evDept?.evidenceStageNo ?? 7; // Mechanical / Wash 7, Detailing 6
    if (evDept?.hasVehicleEvidence && job.stageNo >= evStage && live) {
      const open = job.stageNo === evStage;
      list.push({ key: "evidence", label: open ? "Record Evidence" : "Evidence", icon: "mdi:car-search-outline", current: open, run: () => setEvidenceJobId(job.id) });
    }
    // Stage 8 = vehicle damages report (Mechanical; can be skipped)
    const repStage = drDept?.damageReportStageNo ?? 8;
    if (drDept?.hasDamageReport && job.stageNo >= repStage && live) {
      const open = job.stageNo === repStage;
      list.push({ key: "report", label: open ? "Damages Report" : "Report", icon: "mdi:file-alert-outline", current: open, run: () => setReportJobId(job.id) });
    }
    // Wash: Vehicle Job Inspection checklist (the stage right after the damages report)
    const checkStage = jcDept?.jobCheckStageNo ?? 8;
    if (jcDept?.hasJobCheck && job.stageNo >= checkStage && live) {
      const open = job.stageNo === checkStage;
      list.push({ key: "jobcheck", label: open ? "Job Inspection" : "Inspection", icon: "mdi:clipboard-check-outline", current: open, run: () => setCheckJobId(job.id) });
    }
    // Spare Part Review & Order: the spare parts are part of the Vehicle Job Inspection window, so this stage has no button of its own.
    // It is only offered for a job that is still waiting at this stage (saved earlier), so that it can be completed.
    if (evDept?.hasSpareParts && evDept.spareStageNo && job.stageNo === evDept.spareStageNo && live) {
      const open = job.stageNo === evDept.spareStageNo;
      list.push({ key: "spare", label: open ? "Spare Parts" : "Parts", icon: "mdi:cog-transfer-outline", current: open, run: () => setSpareJobId(job.id) });
    }
    // Customer Approval (departments that use it: right after the spare parts stage)
    if (evDept?.hasCustomerApproval && evDept.approvalStageNo && job.stageNo >= evDept.approvalStageNo && live) {
      const open = job.stageNo === evDept.approvalStageNo;
      list.push({ key: "approval", label: open ? "Customer Approval" : "Approval", icon: "mdi:account-check-outline", current: open, run: () => setApprovalJobId(job.id) });
    }
    // Internal Inspection - 1 (after Customer Approval)
    if (evDept?.hasInternalInspection && evDept.internalStageNo && job.stageNo >= evDept.internalStageNo && live) {
      const open = job.stageNo === evDept.internalStageNo;
      list.push({ key: "internal", label: open ? "Internal Inspection" : "Inspection 1", icon: "mdi:clipboard-list-outline", current: open, run: () => setInternalJobId(job.id) });
    }
    // Job Activation (after Internal Inspection - 1)
    if (evDept?.hasJobActivation && evDept.activationStageNo && job.stageNo >= evDept.activationStageNo && live) {
      const open = job.stageNo === evDept.activationStageNo;
      list.push({ key: "activation", label: open ? "Job Activation" : "Activation", icon: "mdi:rocket-launch-outline", current: open, run: () => setActivationJobId(job.id) });
    }
    // Team Self-Inspection (after Job Activation)
    if (evDept?.hasTeamInspection && evDept.teamInspectionStageNo && job.stageNo >= evDept.teamInspectionStageNo && live) {
      const open = job.stageNo === evDept.teamInspectionStageNo;
      list.push({ key: "teaminsp", label: open ? "Team Self-Inspection" : "Self-Inspection", icon: "mdi:clipboard-check-multiple-outline", current: open, run: () => setTeamInspJobId(job.id) });
    }
    // Review Team Inspection Sheet (Department Head: Approved Yes / No)
    if (evDept?.hasTeamReview && evDept.teamReviewStageNo && job.stageNo >= evDept.teamReviewStageNo && live) {
      const open = job.stageNo === evDept.teamReviewStageNo;
      list.push({ key: "teamreview", label: open ? "Review Inspection" : "Review", icon: "mdi:clipboard-text-search-outline", current: open, run: () => setTeamReviewJobId(job.id) });
    }
    // Transfer to other departments (Wash / Detail), after the review
    if (evDept?.hasDeptTransfer && evDept.deptTransferStageNo && job.stageNo >= evDept.deptTransferStageNo && live) {
      const open = job.stageNo === evDept.deptTransferStageNo;
      list.push({ key: "transfer", label: open ? "Transfer Department" : "Transfer", icon: "mdi:swap-horizontal-bold", current: open, run: () => setTransferJobId(job.id) });
    }
    // Job Completed / copy the job card to the Account Department (after the transfer stage)
    if (evDept?.hasJobEnd && evDept.jobEndStageNo && job.stageNo >= evDept.jobEndStageNo && live) {
      const open = job.stageNo === evDept.jobEndStageNo;
      list.push({ key: "jobend", label: open ? "End Job" : "Job End", icon: "mdi:flag-checkered", current: open, run: () => setJobEndJobId(job.id) });
    }
    // Handover readiness (after Job Completed)
    if (evDept?.hasHandoverCheck && evDept.handoverCheckStageNo && job.stageNo >= evDept.handoverCheckStageNo && live) {
      const open = job.stageNo === evDept.handoverCheckStageNo;
      list.push({ key: "handover", label: open ? "Handover Check" : "Handover", icon: "mdi:car-key", current: open, run: () => setHandoverJobId(job.id) });
    }
    // Delivery Review (after Handover Readiness)
    if (evDept?.hasDeliveryReview && evDept.deliveryReviewStageNo && job.stageNo >= evDept.deliveryReviewStageNo && live) {
      const open = job.stageNo === evDept.deliveryReviewStageNo;
      list.push({ key: "delivery", label: open ? "Delivery Review" : "Delivery", icon: "mdi:truck-check-outline", current: open, run: () => setDeliveryJobId(job.id) });
    }
    // Free Inspection Schedule (after Delivery Review)
    if (evDept?.hasFreeInspection && evDept.freeInspectionStageNo && job.stageNo >= evDept.freeInspectionStageNo && live) {
      const open = job.stageNo === evDept.freeInspectionStageNo;
      list.push({ key: "freeinsp", label: open ? "Free Inspection" : "Free Insp.", icon: "mdi:calendar-check-outline", current: open, run: () => setFreeInspJobId(job.id) });
    }
    // Invoice (created when the Customer Approval stage is completed)
    if (evDept?.hasCustomerApproval && evDept.approvalStageNo && job.stageNo > evDept.approvalStageNo && live) {
      list.push({ key: "invoice", label: "Invoice", icon: "mdi:receipt-text-outline", current: false, run: () => setInvoiceJobId(job.id) });
    }
    // Extra Job Scope: only after the job is activated
    if (job.activationEnabled && job.activatedAt && live) {
      list.push({ key: "extra", label: "Extra Job Scope", icon: "mdi:playlist-plus", current: false, run: () => setExtraJobId(job.id) });
    }
    return list;
  };

  const ViewButton = ({ job, block }) => {
    const actions = actionsOf(job);
    const current = actions.find((a) => a.current);
    const extra = actions.find((a) => a.key === "extra"); // shown as its own button, not inside the menu
    const others = actions.filter((a) => a !== current && a !== extra);

    if (block) {
      return (
        <div className="d-flex flex-wrap gap-2">
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
          <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => setViewJobId(job.id)}>
            <Icon icon="mdi:eye-outline" width="18" height="18" /> View
          </Button>
          {others.length > 0 && <ActionMenu id={`m-${job.id}`} actions={others} label="More" icon="mdi:dots-horizontal" block />}
        </div>
      );
    }

    return (
      <div className="d-flex gap-1 justify-content-end align-items-center">
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
        <ActionMenu
          id={job.id}
          actions={[...others, { key: "view", label: "View", icon: "mdi:eye-outline", run: () => setViewJobId(job.id) }]}
        />
      </div>
    );
  };

  return (
    <div className="dd-root">
      <style>{`
        .dd-root .btn-primary, .dd-root .dd-dark { color: #fff !important; border: 0 !important; border-radius: 10px; font-weight: 600; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; }
        .dd-root .btn-primary:hover, .dd-root .dd-dark:hover { filter: brightness(1.25); }
        .dd-root .btn-outline-primary { color: #111; border-color: #111; border-radius: 10px; font-weight: 600; }
        .dd-root .btn-outline-primary:hover { background: #111; color: #fff; }
        .dd-root .form-control { min-height: 46px; border-radius: 0 12px 12px 0; border: 1.5px solid #c4c4ca; border-left: 0; }
        .dd-root .form-control:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .dd-root .input-group-text { min-height: 46px; border: 1.5px solid #c4c4ca; border-right: 0; border-radius: 12px 0 0 12px; background: #fde8ea; color: #c8102e; }
        .dd-chip { border-radius: 999px; font-weight: 600; border: 1.5px solid #c4c4ca; background: #fff; color: #111; }
        .dd-chip:hover { border-color: #111; background: #f4f4f5; color: #111; }
        .dd-chip.on { color: #fff !important; border-color: #000; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; }
        .dd-table { border-collapse: separate; border-spacing: 0; }
        .dd-table { width: 100%; font-size: .86rem; }
        .dd-table thead th { background: #111; color: #fff; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; padding: 11px 8px; border: 0; white-space: nowrap; }
        .dd-table thead th:first-child { box-shadow: inset 4px 0 0 #c8102e; }
        .dd-table tbody td { padding: 10px 8px; border-bottom: 1px solid #ececef; vertical-align: middle; background: #fff; }
        .dd-table tbody tr:nth-child(even) td { background: #fafafb; }
        .dd-table tbody tr:hover td { background: #fff1f2; }
        .dd-table tbody tr.dd-up td { background: #ecfdf3; }
        .dd-table tbody tr.dd-up td:first-child { box-shadow: inset 5px 0 0 #16a34a; }
        .dd-table tbody tr.dd-up:hover td { background: #d1fae5; }
        .dd-table tbody tr.dd-today td { background: #fff1f2; }
        .dd-table tbody tr.dd-today td:first-child { box-shadow: inset 5px 0 0 #c8102e; }
        .dd-table tbody tr.dd-today:hover td { background: #ffe0e4; }
        .dd-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 4px 10px; font-weight: 700; font-size: .82rem; box-shadow: inset 3px 0 0 #c8102e; }
        .dd-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 8px; font-weight: 800; font-size: .78rem; letter-spacing: .05em; white-space: nowrap; }
        .dd-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#111,#c8102e); color: #fff; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dd-m-card { border: 1px solid #e3e3e6; border-left: 4px solid #c8102e; border-radius: 12px; }
        .dd-m-card.dd-up { background: #ecfdf3 !important; border-left-color: #16a34a; }
        .dd-m-card.dd-today { background: #fff1f2 !important; }
        .dd-table { table-layout: fixed; }
        .dd-table td { overflow-wrap: anywhere; }
        .dd-table tbody td { vertical-align: top !important; }
        .dd-table td:last-child > div { flex-wrap: wrap; }
        .da-contact { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff !important; text-decoration: none; }
        .da-call { background: #111; box-shadow: inset 0 -2px 0 #c8102e; }
        .da-wa { background: #16a34a; }
        .da-stuck { color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; border-radius: 999px; padding: 0 8px; font-size: .75rem; font-weight: 700; }
        .dd-chip.late:not(.on) { color: #b91c1c; border-color: #fecaca; background: #fff5f5; }
        .dd-skel { position: relative; overflow: hidden; background: #ececef; border-radius: 8px; }
        .dd-skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.7), transparent); animation: dd-shimmer 1.2s infinite; }
        @keyframes dd-shimmer { 100% { transform: translateX(100%); } }
        .dd-sticky { background: #f6f6f7; }
        @media (max-width: 767.98px) {
          .dd-sticky { position: sticky; top: 0; z-index: 6; padding: 8px 0; box-shadow: 0 6px 10px -8px rgba(15,23,42,.35); }
          .dd-m-card .btn, .dd-m-card .dropdown-toggle { min-height: 44px; font-weight: 600; }
          .dd-chips-row { flex-wrap: nowrap !important; overflow-x: auto; scrollbar-width: none; padding-bottom: 6px; }
          .dd-chips-row::-webkit-scrollbar { display: none; }
          .dd-chips-row .dd-chip { flex: 0 0 auto; min-height: 40px; white-space: nowrap; }
        }
      `}</style>
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center gap-2 mb-3 px-3 px-md-4 py-3 text-white"
        style={{ background: "linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%)", borderRadius: 16, boxShadow: "0 10px 26px -12px rgba(200,16,46,.55)" }}
      >
        <h4 className="mb-0 text-white d-flex align-items-center gap-3">
          <Icon icon={ui.icon} width="34" height="34" />
          <span>
            {department}
            <small className="d-block fw-normal" style={{ color: "rgba(255,255,255,.75)", fontSize: ".75rem" }}>refreshes every minute{updatedText ? ` · updated ${updatedText}` : ""}</small>
          </span>
        </h4>
        <div className="d-flex gap-2">
          {bayDept?.hasBayAllocation && can("bay.manage") && (
            <Button variant="primary" className="d-inline-flex align-items-center gap-1" onClick={() => setManagingBays(true)}>
              <Icon icon="mdi:garage-variant" width="20" height="20" />
              <span className="d-none d-sm-inline">Bays</span>
            </Button>
          )}
          {hasTeams && (can("team.manage") || can("bay.manage")) && (
            <Button variant="primary" className="d-inline-flex align-items-center gap-1" onClick={() => setManagingTeams(true)}>
              <Icon icon="mdi:account-group-outline" width="20" height="20" />
              <span className="d-none d-sm-inline">Teams &amp; Bays</span>
            </Button>
          )}
          <Button variant="light" className="d-inline-flex align-items-center gap-1 px-3 fw-semibold border-0" style={{ minHeight: 40, borderRadius: 10 }} onClick={refetch} disabled={isFetching}>
            {isFetching ? <Spinner animation="border" size="sm" /> : <Icon icon="mdi:refresh" width="20" height="20" />}
            <span className="d-none d-sm-inline">Refresh</span>
          </Button>
        </div>
      </div>

      <JobsTabs />

      {/* Stats */}
      <Row className="g-3 mb-3">
        <Col xs={6} lg={3}><StatCard icon="mdi:clipboard-list-outline" label="Total jobs" value={stats.total} color="#111111" /></Col>
        <Col xs={6} lg={3}><StatCard icon="mdi:progress-wrench" label="In progress" value={stats.inProgress} color="#c8102e" /></Col>
        <Col xs={6} lg={3}><StatCard icon="mdi:check-circle-outline" label="Completed" value={stats.completed} color="#16a34a" /></Col>
        <Col xs={6} lg={3}><StatCard icon="mdi:calendar-today" label="Appointments today" value={stats.today} color="#d97706" /></Col>
      </Row>

      <Card className="border-0" style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px -14px rgba(15,23,42,.35)" }}>
        <Card.Header className="border-0" style={{ background: "#f6f6f7", borderBottom: "1px solid #e3e3e6" }}>
          {/* Overdue chip only (the per-stage count badges were removed) */}
          {(stats.overdue > 0 || overdue) && (
            <div className="d-flex flex-wrap gap-2 mb-3 dd-chips-row">
              <Button size="sm" variant="light" className={`dd-chip late ${overdue ? "on" : ""}`} onClick={() => setOverdue((v) => !v)}>
                <Icon icon="mdi:alert-circle-outline" width="16" height="16" /> Overdue {stats.overdue > 0 && <Badge bg={overdue ? "light" : "danger"} text={overdue ? "dark" : undefined} pill>{stats.overdue}</Badge>}
              </Button>
            </div>
          )}

          {/* Search + status */}
          <Row className="g-2 align-items-center">
            <Col xs={12} md={5}>
              <div className="dd-sticky d-flex gap-2">
                <InputGroup>
                  <InputGroup.Text>
                    <Icon icon="mdi:magnify" width="22" height="22" />
                  </InputGroup.Text>
                  <FormControl
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search job no / customer / mobile / vehicle / sales officer"
                  />
                </InputGroup>
                <Button variant={showFilters || activeFilters ? "dark" : "outline-dark"} className="d-md-none d-inline-flex align-items-center gap-1" style={{ minHeight: 46, borderRadius: 12 }} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
                  <Icon icon="mdi:filter-variant" width="20" height="20" />
                  {activeFilters > 0 && <span style={{ background: "#c8102e", color: "#fff", borderRadius: 999, padding: "0 7px", fontSize: ".72rem" }}>{activeFilters}</span>}
                </Button>
              </div>
            </Col>
            <Col xs={12} md={3} className={showFilters ? "" : "d-none d-md-block"}>
              <Form.Select value={appointment} onChange={(e) => setAppointment(e.target.value)} aria-label="Appointments" style={{ minHeight: 46, borderRadius: 12, border: "1.5px solid #c4c4ca", ...(appointment ? { borderColor: "#c8102e", fontWeight: 600 } : {}) }}>
                <option value="">Appointments: all jobs</option>
                <option value="ANY">With appointment</option>
                <option value="TODAY">Appointment today</option>
                <option value="UPCOMING">Upcoming appointments</option>
                <option value="PAST">Past appointments</option>
                <option value="NONE">Walk-in (no appointment)</option>
              </Form.Select>
            </Col>
            <Col xs={12} md={4} className={`justify-content-md-end ${showFilters ? "d-flex" : "d-none d-md-flex"}`}>
              <ButtonGroup className="w-100 w-md-auto">
                {[
                  ["ALL", "All"],
                  ["IN_PROGRESS", "In progress"],
                  ["COMPLETED", "Completed"],
                ].map(([key, label]) => (
                  <Button key={key} variant={status === key ? "primary" : "outline-primary"} className="px-3" style={{ minHeight: 46 }} onClick={() => setStatus(key)}>
                    {label}
                  </Button>
                ))}
              </ButtonGroup>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {isLoading ? (
            <div className="p-3 d-flex flex-column gap-3" aria-busy="true">
              {[0, 1, 2, 3, 4].map((n) => (
                <div key={n} className="d-flex gap-3 align-items-center">
                  <div className="dd-skel" style={{ height: 26, width: 80 }} />
                  <div className="dd-skel" style={{ height: 18, flex: 1 }} />
                  <div className="dd-skel d-none d-md-block" style={{ height: 18, width: 160 }} />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center text-danger py-5">
              Failed to load jobs. <Button size="sm" variant="outline-danger" className="ms-2" onClick={refetch}>Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-5">
              <Icon icon="mdi:clipboard-text-off-outline" width="40" height="40" />
              <div className="mt-2">
                {jobs.length === 0 ? `No ${department} jobs yet.` : "No jobs match your filters."}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop / tablet */}
              <div className="d-none d-xl-block">
                <Table responsive className="align-middle mb-0 dd-table">
                  <thead>
                    <tr>
                      <th style={{ width: 104 }}>Job</th>
                      <th style={{ width: "24%" }}>Customer / Vehicle</th>
                      <th style={{ width: "24%" }}>Stage</th>
                      <th style={{ width: "15%" }}>Appointment</th>
                      <th style={{ width: "16%" }}>Assigned to</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j) => (
                      <tr key={j.id} className={apptRowClass(j)}>
                        <td>
                          <span className="dd-jobno">{j.jobNo}</span>
                          <div><small className="text-muted">{fmtDate(j.createdAt)}</small></div>
                          {j.updatedAt && <div><small className="text-muted" title="Last updated">upd. {since(j.updatedAt)} ago</small></div>}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="dd-avatar">{(j.customerName || "?").trim().charAt(0).toUpperCase()}</span>
                            <div className="lh-sm flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="fw-bold text-break" style={{ color: "#0f172a" }}>{j.customerName}</div>
                              {j.regNo ? <span className="dd-plate mt-1">{j.regNo}</span> : <small className="text-muted">-</small>}
                              {j.customerMatter && <div className="small text-muted fst-italic text-truncate mt-1" title={j.customerMatter}>“{j.customerMatter}”</div>}
                            </div>
                            <ContactButtons job={j} size={32} />
                          </div>
                        </td>
                        <td><StageCell job={j} /></td>
                        <td><AppointmentCell job={j} /></td>
                        <td className="small lh-sm">
                          <div className="d-flex align-items-start gap-1"><Icon icon="mdi:account-tie-outline" width="15" height="15" className="text-muted mt-1 flex-shrink-0" /><span className="text-break">{j.consultantName || "-"}</span></div>
                          {j.consultantMobile && <div className="text-muted ms-4">{j.consultantMobile}</div>}
                          {(j.teamName || j.bayName) && (
                            <div className="d-flex align-items-start gap-1 mt-1 text-muted"><Icon icon="mdi:account-group-outline" width="15" height="15" className="mt-1 flex-shrink-0" /><span className="text-break">{[j.teamName, j.bayName].filter(Boolean).join(" · ")}</span></div>
                          )}
                        </td>
                        <td className="text-end"><ViewButton job={j} /></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Phone / small tablet: cards */}
              <div className="d-xl-none p-2 d-flex flex-column gap-2">
                {filtered.map((j) => (
                  <div key={j.id} className={`dd-m-card p-2 bg-white ${apptRowClass(j)}`}>
                    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="dd-jobno">{j.jobNo}</span>
                        {j.regNo && <span className="dd-plate">{j.regNo}</span>}
                      </div>
                      <small className="text-muted">{fmtDate(j.createdAt)}</small>
                    </div>
                    <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-bold text-truncate" style={{ color: "#0f172a" }}>{j.customerName}</div>
                        <small className="text-muted">{[j.teamName, j.bayName].filter(Boolean).join(" · ") || j.consultantName}</small>
                      </div>
                      <ContactButtons job={j} size={44} />
                    </div>
                    {j.appointmentDate && <div className="mt-2"><AppointmentCell job={j} /></div>}
                    {j.customerMatter && <div className="small fst-italic mt-2">“{j.customerMatter}”</div>}
                    <div className="mt-2"><StageCell job={j} /></div>
                    <div className="mt-2"><ViewButton job={j} block /></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <JobDetailsModal jobId={viewJobId} onHide={() => setViewJobId(null)} />
      {managingTeams && teamDept && <ManageTeamsBaysModal department={teamDept} onHide={() => setManagingTeams(false)} />}
      {teamJobId && <TeamAllocationModal key={teamJobId} jobId={teamJobId} onHide={() => setTeamJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasJobInspection) setInspJobId(jobId); }} />}
      {bayJobId && <BayAllocationModal key={bayJobId} jobId={bayJobId} onHide={() => setBayJobId(null)} onSaved={({ jobId, stageCompleted }) => {
        if (!stageCompleted) return;
        if (evDept?.hasJobInspection) { setInspJobId(jobId); return; }
        // Wash: bay allocated -> the Start Job window (approval Yes / No + confirmation) opens by itself
        const j = jobs.find((x) => x.id === jobId);
        if (j?.requiresStart && !j?.startedAt) { setComplaintStartNow(true); setComplaintJobId(jobId); }
      }} />}
      {managingBays && bayDept && <ManageTeamsBaysModal baysOnly department={bayDept} onHide={() => setManagingBays(false)} />}
      {spareJobId && <SparePartsModal key={spareJobId} jobId={spareJobId} onHide={() => setSpareJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted) { if (evDept?.hasCustomerApproval) setApprovalJobId(jobId); else if (drDept?.hasDamageReport) setReportJobId(jobId); } }} />}
      {approvalJobId && <CustomerApprovalModal key={`ca${approvalJobId}`} jobId={approvalJobId} onHide={() => setApprovalJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasInternalInspection) setInternalJobId(jobId); }} />}
      {internalJobId && <InternalInspectionModal key={`ii${internalJobId}`} jobId={internalJobId} onHide={() => setInternalJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasJobActivation) setActivationJobId(jobId); }} />}
      {activationJobId && <JobActivationModal key={`ja${activationJobId}`} jobId={activationJobId} onHide={() => setActivationJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasTeamInspection) setTeamInspJobId(jobId); }} />}
      {teamInspJobId && <TeamInspectionModal key={`ti${teamInspJobId}`} jobId={teamInspJobId} onHide={() => setTeamInspJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasTeamReview) setTeamReviewJobId(jobId); }} />}
      {teamReviewJobId && <TeamReviewModal key={`tr${teamReviewJobId}`} jobId={teamReviewJobId} onHide={() => setTeamReviewJobId(null)} onSaved={({ jobId, reopened, stageCompleted }) => { if (reopened) setTeamInspJobId(jobId); else if (stageCompleted && evDept?.hasDeptTransfer) setTransferJobId(jobId); }} />}
      {transferJobId && <DeptTransferModal key={`dt${transferJobId}`} jobId={transferJobId} onHide={() => setTransferJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasJobEnd) setJobEndJobId(jobId); }} />}
      {jobEndJobId && <JobEndModal key={`je${jobEndJobId}`} jobId={jobEndJobId} onHide={() => setJobEndJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasHandoverCheck) setHandoverJobId(jobId); }} />}
      {handoverJobId && <HandoverCheckModal key={`hc${handoverJobId}`} jobId={handoverJobId} onHide={() => setHandoverJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasDeliveryReview) setDeliveryJobId(jobId); }} />}
      {deliveryJobId && <DeliveryReviewModal key={`dr${deliveryJobId}`} jobId={deliveryJobId} onHide={() => setDeliveryJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasFreeInspection) setFreeInspJobId(jobId); }} />}
      {invoiceJobId && <InvoiceModal key={`inv${invoiceJobId}`} jobId={invoiceJobId} onHide={() => setInvoiceJobId(null)} />}
      {freeInspJobId && <FreeInspectionModal key={`fi${freeInspJobId}`} jobId={freeInspJobId} onHide={() => setFreeInspJobId(null)} />}
      {extraJobId && <ExtraJobScopeModal key={`ex${extraJobId}`} jobId={extraJobId} onHide={() => setExtraJobId(null)} />}
      {inspJobId && <VehicleJobInspectionModal key={inspJobId} jobId={inspJobId} onHide={() => setInspJobId(null)} onSaved={({ jobId, stageCompleted, spareCompleted }) => { if (!stageCompleted) return; /* spare parts are part of the inspection window now */ if (spareCompleted) { if (evDept?.hasCustomerApproval) setApprovalJobId(jobId); else if (drDept?.hasDamageReport) setReportJobId(jobId); } else if (evDept?.hasSpareParts) setSpareJobId(jobId); else if (drDept?.hasDamageReport) setReportJobId(jobId); }} />}
      {preEvJobId && <VehicleEvidenceModal key={`pre${preEvJobId}`} jobId={preEvJobId} preDepartment onHide={() => setPreEvJobId(null)} />}
      {evidenceJobId && (
        <VehicleEvidenceModal key={evidenceJobId} jobId={evidenceJobId} onHide={() => setEvidenceJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && drDept?.hasDamageReport) setReportJobId(jobId); }} />
      )}
      {reportJobId && <DamageReportModal key={reportJobId} jobId={reportJobId} onHide={() => setReportJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && jcDept?.hasJobCheck) setCheckJobId(jobId); }} />}
      {checkJobId && <VehicleJobCheckModal key={`jc${checkJobId}`} jobId={checkJobId} onHide={() => setCheckJobId(null)} />}
      <ComplaintModal
        jobId={complaintJobId}
        startNow={complaintStartNow}
        onSaved={({ jobId, stageCompleted, started }) => {
          // Wash: the job has just been started -> the Vehicle Damages Report window opens by itself
          if (started && drDept?.hasDamageReport) { setReportJobId(jobId); return; }
          // Complaint recording finished -> Team Allocation starts (departments with teams only)
          const j = jobs.find((x) => x.id === jobId);
          if (!stageCompleted) return;
          if (teamDept?.hasTeamAllocation || j?.requiresTeam) setTeamJobId(jobId);
          else if (bayDept?.hasBayAllocation || j?.requiresBay) setBayJobId(jobId); // Wash: Start Job confirmed -> Bay Allocation
          else if (evDept?.hasVehicleEvidence && (evDept.evidenceStageNo ?? 7) <= 6) setEvidenceJobId(jobId); // Detailing: complaint saved -> Vehicle Evidence
        }}
        onHide={() => {
          setComplaintJobId(null);
          setComplaintStartNow(false);
        }}
      />
    </div>
  );
}