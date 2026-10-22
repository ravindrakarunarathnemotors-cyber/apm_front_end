"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, ButtonGroup, Card, Col, FormControl, InputGroup, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
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
import DamageReportModal from "./DamageReportModal"; // Stage 8: vehicle damages report (can be skipped)
import TeamAllocationModal from "./TeamAllocationModal"; // Stage 6: team allocation (team, bay, team leader, PPE ...)
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

const todayStr = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time

/* ----------------------------- small components ----------------------------- */
function StatCard({ icon, label, value, color }) {
  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body className="d-flex align-items-center gap-3">
        <span
          className="rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 52, height: 52, color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
        >
          <Icon icon={icon} width="28" height="28" />
        </span>
        <div>
          <div className="fs-3 fw-bold lh-1">{value}</div>
          <div className="text-muted small mt-1">{label}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

function StageCell({ job }) {
  const total = job.totalStages || 0;
  const completed = job.completedStages || 0;
  const done = job.status === "COMPLETED";
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div style={{ minWidth: 180 }}>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <Badge bg={done ? "success" : "primary"} className="fw-semibold">
          {done ? "Completed" : `Stage ${job.stageNo} · ${job.stageName ?? "-"}`}
        </Badge>
        <small className="text-muted ms-2">{completed}/{total}</small>
      </div>
      <ProgressBar now={pct} variant={done ? "success" : "primary"} style={{ height: 6 }} />
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
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
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

  return (
    <>
      <Button ref={btnRef} size="sm" variant={variant} className={label ? `text-nowrap ${block ? "w-100" : ""}` : "px-2"} disabled={busy} aria-label={label || "More actions"} aria-expanded={Boolean(pos)} id={`more-${id}`} onClick={toggle}>
        {label ? <>{busy ? <Spinner animation="border" size="sm" /> : <Icon icon={icon || "mdi:menu-down"} width="18" height="18" />} {label}</> : <Icon icon="mdi:dots-vertical" width="18" height="18" />}
      </Button>
      {pos &&
        createPortal(
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setPos(null)} />
            <div className="bg-white border rounded-3 shadow py-1" style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 2000, minWidth: 180 }} role="menu">
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="menuitem"
                  className="btn btn-link text-decoration-none text-dark d-flex align-items-center gap-2 w-100 text-start px-3 py-2 rounded-0"
                  onClick={() => { setPos(null); a.run(); }}
                >
                  <Icon icon={a.icon} width="18" height="18" /> {a.label}
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
  const ui = getDepartmentUi(department); // icon + colour of the department
  const COLOR = ui.color;

  // Only jobs whose department is this one. Refreshes itself every minute.
  const { data: jobs = [], isLoading, isFetching, isError, refetch } = useGetJobsQuery(department, {
    pollingInterval: 60000,
  });

  const [viewJobId, setViewJobId] = useState(null);
  const [complaintJobId, setComplaintJobId] = useState(null);
  const [complaintStartNow, setComplaintStartNow] = useState(false); // opened with "Start Job"
  const [teamJobId, setTeamJobId] = useState(null);
  const [evidenceJobId, setEvidenceJobId] = useState(null);
  const [inspJobId, setInspJobId] = useState(null);
  const [spareJobId, setSpareJobId] = useState(null);
  const [preEvJobId, setPreEvJobId] = useState(null); // stage 4 "Vehicle Evidence" (view / customer link)
  const [bayJobId, setBayJobId] = useState(null);
  const [reportJobId, setReportJobId] = useState(null);
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

  // ---- stats ----
  const stats = useMemo(
    () => ({
      total: jobs.length,
      inProgress: jobs.filter((j) => j.status === "IN_PROGRESS").length,
      completed: jobs.filter((j) => j.status === "COMPLETED").length,
      today: jobs.filter((j) => j.appointmentDate === todayStr()).length,
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
      if (!q) return true;
      return [j.jobNo, j.customerName, j.contactNumber, j.regNo].some((v) =>
        String(v ?? "").toLowerCase().replace(/[\s-]/g, "").includes(q)
      );
    });
  }, [jobs, query, status, stage]);

  // departments with team allocation (Mechanical): from the department lookup or the job row
  const hasTeam = (job) => Boolean(job.requiresTeam || teamDept?.hasTeamAllocation);
  const hasBay = (job) => Boolean(job.requiresBay || bayDept?.hasBayAllocation);

  // All actions of a job. Table: only the current-stage action (blue/green) + View + a "More" menu, so the
  // Action column stays narrow however many stages a department has. Cards: every action as a button.
  const actionsOf = (job) => {
    const list = [];
    const live = job.status !== "CANCELLED";
    // Wash: complaint saved earlier, job not started yet -> "Start Job"
    if (job.status === "IN_PROGRESS" && job.requiresStart && job.complaintSaved && !job.startedAt) {
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
    // Spare Part Review & Order (all departments that use it)
    if (evDept?.hasSpareParts && evDept.spareStageNo && job.stageNo >= evDept.spareStageNo && live) {
      const open = job.stageNo === evDept.spareStageNo;
      list.push({ key: "spare", label: open ? "Spare Parts" : "Parts", icon: "mdi:cog-transfer-outline", current: open, run: () => setSpareJobId(job.id) });
    }
    return list;
  };

  const ViewButton = ({ job, block }) => {
    const actions = actionsOf(job);
    const current = actions.find((a) => a.current);
    const others = actions.filter((a) => a !== current);

    if (block) {
      return (
        <div className="d-flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.key} size="sm" variant={a.current ? a.variant || "primary" : "outline-secondary"} className="flex-fill" onClick={a.run}>
              <Icon icon={a.icon} width="18" height="18" /> {a.label}
            </Button>
          ))}
          <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => setViewJobId(job.id)}>
            <Icon icon="mdi:eye-outline" width="18" height="18" /> View
          </Button>
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
        <ActionMenu
          id={job.id}
          actions={[...others, { key: "view", label: "View", icon: "mdi:eye-outline", run: () => setViewJobId(job.id) }]}
        />
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center gap-2 mb-2 px-3 py-2 rounded border"
        style={{ backgroundColor: "#e5e7eb" }}
      >
        <h4 className="mb-0 text-dark d-flex align-items-center gap-2">
          <Icon icon={ui.icon} width="26" height="26" color={COLOR} /> {department}
        </h4>
        <div className="d-flex gap-2">
          {bayDept?.hasBayAllocation && (
            <Button variant="primary" className="d-inline-flex align-items-center gap-1" onClick={() => setManagingBays(true)}>
              <Icon icon="mdi:garage-variant" width="20" height="20" />
              <span className="d-none d-sm-inline">Bays</span>
            </Button>
          )}
          {hasTeams && (
            <Button variant="primary" className="d-inline-flex align-items-center gap-1" onClick={() => setManagingTeams(true)}>
              <Icon icon="mdi:account-group-outline" width="20" height="20" />
              <span className="d-none d-sm-inline">Teams &amp; Bays</span>
            </Button>
          )}
          <Button variant="outline-dark" className="d-inline-flex align-items-center gap-1" onClick={refetch} disabled={isFetching}>
            {isFetching ? <Spinner animation="border" size="sm" /> : <Icon icon="mdi:refresh" width="20" height="20" />}
            <span className="d-none d-sm-inline">Refresh</span>
          </Button>
        </div>
      </div>

      <JobsTabs />

      {/* Stats */}
      <Row className="g-3 mb-3">
        <Col xs={6} lg={3}><StatCard icon="mdi:clipboard-list-outline" label="Total jobs" value={stats.total} color={COLOR} /></Col>
        <Col xs={6} lg={3}><StatCard icon="mdi:progress-wrench" label="In progress" value={stats.inProgress} color="#d97706" /></Col>
        <Col xs={6} lg={3}><StatCard icon="mdi:check-circle-outline" label="Completed" value={stats.completed} color="#16a34a" /></Col>
        <Col xs={6} lg={3}><StatCard icon="mdi:calendar-today" label="Appointments today" value={stats.today} color="#7c3aed" /></Col>
      </Row>

      <Card>
        <Card.Header className="bg-transparent">
          {/* Stage chips: in-progress jobs per stage */}
          {stageChips.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button
                size="sm"
                variant={stage === "" ? "primary" : "outline-secondary"}
                className="rounded-pill"
                onClick={() => setStage("")}
              >
                All stages
              </Button>
              {stageChips.map(([no, { name, count }]) => (
                <Button
                  key={no}
                  size="sm"
                  variant={stage === String(no) ? "primary" : "outline-secondary"}
                  className="rounded-pill"
                  onClick={() => setStage(stage === String(no) ? "" : String(no))}
                >
                  Stage {no} · {name} <Badge bg={stage === String(no) ? "light" : "secondary"} text={stage === String(no) ? "dark" : undefined} pill>{count}</Badge>
                </Button>
              ))}
            </div>
          )}

          {/* Search + status */}
          <Row className="g-2 align-items-center">
            <Col xs={12} md={7}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Icon icon="mdi:magnify" width="20" height="20" />
                </InputGroup.Text>
                <FormControl
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search job no / customer / mobile / vehicle"
                />
              </InputGroup>
            </Col>
            <Col xs={12} md={5} className="d-flex justify-content-md-end">
              <ButtonGroup className="w-100 w-md-auto">
                {[
                  ["ALL", "All"],
                  ["IN_PROGRESS", "In progress"],
                  ["COMPLETED", "Completed"],
                ].map(([key, label]) => (
                  <Button key={key} variant={status === key ? "primary" : "outline-primary"} onClick={() => setStatus(key)}>
                    {label}
                  </Button>
                ))}
              </ButtonGroup>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center text-muted py-5">
              <Spinner animation="border" size="sm" className="me-2" /> Loading jobs...
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
              <div className="d-none d-lg-block">
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Job No</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Appointment</th>
                      <th>Customer matter</th>
                      <th>Consultant</th>
                      <th>Current stage</th>
                      <th>In stage for</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((j) => (
                      <tr key={j.id}>
                        <td className="text-nowrap">
                          <div className="fw-semibold">{j.jobNo}</div>
                          <small className="text-muted">{fmtDate(j.createdAt)}</small>
                        </td>
                        <td>
                          <div className="fw-semibold">{j.customerName}</div>
                          <small className="text-muted">{j.contactNumber}</small>
                        </td>
                        <td className="text-nowrap">
                          <Icon icon="mdi:car-outline" width="16" height="16" className="me-1 text-muted" />
                          {j.regNo}
                        </td>
                        <td className="small text-nowrap">
                          {j.appointmentDate ? (
                            <>
                              {fmtDate(j.appointmentDate)}
                              <div className="text-muted">{j.appointmentTime}</div>
                            </>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <div className="small text-truncate" title={j.customerMatter || ""}>
                            {j.customerMatter || <span className="text-muted">-</span>}
                          </div>
                        </td>
                        <td>
                          <div className="text-nowrap">{j.consultantName}</div>
                          {j.consultantMobile && <small className="text-muted">{j.consultantMobile}</small>}
                        </td>
                        <td><StageCell job={j} /></td>
                        <td className="small text-nowrap">
                          {j.status === "IN_PROGRESS" ? since(j.stageStartedAt) : <span className="text-muted">-</span>}
                        </td>
                        <td className="text-end"><ViewButton job={j} /></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Phone / small tablet: cards */}
              <div className="d-lg-none p-2 d-flex flex-column gap-2">
                {filtered.map((j) => (
                  <div key={j.id} className="border rounded p-2 bg-white">
                    <div className="d-flex justify-content-between align-items-start">
                      <strong>{j.jobNo}</strong>
                      <small className="text-muted">{fmtDate(j.createdAt)}</small>
                    </div>
                    <div className="mt-1 fw-semibold">{j.customerName}</div>
                    <div className="small text-muted mb-1">
                      <Icon icon="mdi:phone-outline" width="14" height="14" /> {j.contactNumber}
                      {" · "}
                      <Icon icon="mdi:car-outline" width="14" height="14" /> {j.regNo}
                    </div>
                    {j.appointmentDate && (
                      <div className="small mb-1">
                        <Icon icon="mdi:calendar-clock-outline" width="14" height="14" /> {fmtDate(j.appointmentDate)} {j.appointmentTime}
                      </div>
                    )}
                    {j.customerMatter && <div className="small fst-italic mb-2">“{j.customerMatter}”</div>}
                    <StageCell job={j} />
                    {j.status === "IN_PROGRESS" && (
                      <div className="small text-muted mt-1">In this stage for {since(j.stageStartedAt)}</div>
                    )}
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
      {bayJobId && <BayAllocationModal key={bayJobId} jobId={bayJobId} onHide={() => setBayJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && evDept?.hasJobInspection) setInspJobId(jobId); }} />}
      {managingBays && bayDept && <ManageTeamsBaysModal baysOnly department={bayDept} onHide={() => setManagingBays(false)} />}
      {spareJobId && <SparePartsModal key={spareJobId} jobId={spareJobId} onHide={() => setSpareJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && drDept?.hasDamageReport) setReportJobId(jobId); }} />}
      {inspJobId && <VehicleJobInspectionModal key={inspJobId} jobId={inspJobId} onHide={() => setInspJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted) { if (evDept?.hasSpareParts) setSpareJobId(jobId); else if (drDept?.hasDamageReport) setReportJobId(jobId); } }} />}
      {preEvJobId && <VehicleEvidenceModal key={`pre${preEvJobId}`} jobId={preEvJobId} preDepartment onHide={() => setPreEvJobId(null)} />}
      {evidenceJobId && (
        <VehicleEvidenceModal key={evidenceJobId} jobId={evidenceJobId} onHide={() => setEvidenceJobId(null)} onSaved={({ jobId, stageCompleted }) => { if (stageCompleted && drDept?.hasDamageReport) setReportJobId(jobId); }} />
      )}
      {reportJobId && <DamageReportModal key={reportJobId} jobId={reportJobId} onHide={() => setReportJobId(null)} />}
      <ComplaintModal
        jobId={complaintJobId}
        startNow={complaintStartNow}
        onSaved={({ jobId, stageCompleted }) => {
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
    </>
  );
}