"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Dropdown, FormControl, FormSelect, InputGroup, Pagination, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import JobStartBadge from "./JobStartBadge";
import Swal from "sweetalert2";
import VehicleEvidenceModal from "./VehicleEvidenceModal";
import PreDepartmentActions, { OPEN_COMPLAINT_EVENT } from "./PreDepartmentActions";
import ComplaintModal from "./ComplaintModal"; // Evidence first, then Select Department
import { getDepartmentUi } from "./departmentConfig";
import { useGetDepartmentsQuery, useSetJobDepartmentMutation } from "@/store/features/apiSlice";
import { useGetJobsPageQuery } from "./jobsPageApi";

// Stage 4 = "Department". A job waiting at this stage gets a "Select Department" option in the table.
const DEPARTMENT_STAGE_NO = 4;
const NO_DEPARTMENT = "__none__"; // filter value: jobs whose department is not selected yet

// Job object (from GET /api/jobs):
// { id, jobNo, customerName, contactNumber, regNo, consultantName,
//   consultantMobile, departmentName, stageNo, stageName, status, createdAt, totalStages, completedStages }

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "-";
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

function ConsultantCell({ name, mobile }) {
  if (!name) return <span className="text-muted">-</span>;
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span
        className="rounded-circle fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 30, height: 30, fontSize: "0.72rem", color: "#9b0d1f", background: "#fde8ea", border: "1px solid #f0a3ad" }}
      >
        {initials}
      </span>
      <span className="d-flex flex-column lh-sm">
        <span className="text-nowrap">{name}</span>
        {mobile && (
          <small className="text-muted text-nowrap">
            <Icon icon="mdi:phone-outline" width="12" height="12" /> {mobile}
          </small>
        )}
      </span>
    </span>
  );
}

// "today" | "upcoming" | "past" | "" (no appointment): used to tint the row
const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const apptState = (job) => {
  if (!job.appointmentDate) return "";
  const t = localToday();
  return job.appointmentDate === t ? "today" : job.appointmentDate > t ? "upcoming" : "past";
};

// Appointment column: the booked date / time (highlighted when it is today), sales officer and the department
function AppointmentCell({ job }) {
  if (!job.appointmentDate) return <span className="small text-muted">Walk-in</span>;
  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; // local date
  const isToday = job.appointmentDate === today;
  const past = job.appointmentDate < today;
  const color = isToday ? "#c8102e" : past ? "#64748b" : "#15803d";
  const d = new Date(`${job.appointmentDate}T00:00:00`);
  const dateText = isNaN(d) ? job.appointmentDate : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div style={{ minWidth: 150 }}>
      <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold small text-nowrap"
        style={{ color, background: `color-mix(in srgb, ${color} 10%, white)`, border: `1px solid color-mix(in srgb, ${color} 35%, white)` }}>
        <Icon icon="mdi:calendar-check-outline" width="15" height="15" />
        {isToday ? "Today" : dateText}{job.appointmentTime ? ` · ${job.appointmentTime}` : ""}
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

function DeptBadge({ name }) {
  if (!name) return <span className="text-muted small">Not selected</span>;
  const ui = getDepartmentUi(name);
  return (
    <span
      className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill small fw-semibold text-nowrap"
      style={{ color: ui.color, backgroundColor: `color-mix(in srgb, ${ui.color} 10%, white)`, border: `1px solid ${ui.color}55` }}
    >
      <Icon icon={ui.icon} width="16" height="16" /> {name}
    </span>
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
  return (
    <div style={{ minWidth: 200, maxWidth: "100%" }}>
      <div className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-semibold small" style={{ color, background: tintOf(color, 11), border: `1px solid ${tintOf(color, 28)}` }}>
        <Icon icon={icon} width="16" height="16" />
        {done ? "Completed" : cancelled ? "Cancelled" : (job.stageName ?? "-")}
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
        {live && <span className="small text-muted">Stage {job.stageNo}</span>}
        {job.activationEnabled && (job.activatedAt ? (
          <span className="d-inline-flex align-items-center gap-1 small fw-semibold rounded-pill px-2" title={new Date(job.activatedAt).toLocaleString()} style={{ color: "#15803d", background: "#dcfce7" }}>
            <Icon icon="mdi:rocket-launch" width="14" height="14" /> Job activated
          </span>
        ) : live ? (
          <span className="d-inline-flex align-items-center gap-1 small rounded-pill px-2" style={{ color: "#92400e", background: "#fef3c7" }}>
            <Icon icon="mdi:rocket-launch-outline" width="14" height="14" /> Not activated
          </span>
        ) : null)}
      </div>
      <JobStartBadge job={job} />
    </div>
  );
}

export default function JobsTable({ onView }) {
  const [query, setQuery] = useState("");
  const [consultant, setConsultant] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(""); // "" = all, NO_DEPARTMENT = not selected yet
  const [stage, setStage] = useState("");
  const [appointment, setAppointment] = useState(""); // "" = all, ANY / TODAY / UPCOMING / PAST / NONE
  const [busyJobId, setBusyJobId] = useState(null);
  const [complaintJobId, setComplaintJobId] = useState(null); // opens by itself after a department is selected
  useEffect(() => {
    const onOpen = (e) => setComplaintJobId(e.detail?.jobId ?? null);
    window.addEventListener(OPEN_COMPLAINT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COMPLAINT_EVENT, onOpen);
  }, []);
  const [preEvJobId, setPreEvJobId] = useState(null); // stage 4 Vehicle Evidence (view / customer link)

  // Departments (shown in the "Select Department" option) + the save call
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [setJobDepartment] = useSetJobDepartmentMutation();

  const handlePickDepartment = async (job, dept) => {
    const confirm = await Swal.fire({
      title: "Select department?",
      text: `${job.jobNo} will be assigned to ${dept.name}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, assign",
    });
    if (!confirm.isConfirmed) return;

    setBusyJobId(job.id);
    try {
      await setJobDepartment({ id: job.id, departmentId: dept.id }).unwrap(); // table refreshes automatically
      Swal.fire({ title: "Done!", text: `${dept.name} selected.`, icon: "success", timer: 1300, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: "Error", text: err?.data?.message || "Failed to select the department.", icon: "error" });
    } finally {
      setBusyJobId(null);
    }
  };

  // The Action column has only the View button (Evidence / Select Department are done from the Jobs Dashboard)
  const renderActions = (j, block = false) => (
    <div className={`d-flex gap-2 ${block ? "flex-column" : "justify-content-end"}`}>
      <Button size="sm" className="jt-btn-view px-3" style={{ minHeight: 38 }} onClick={() => onView?.(j)}>
        <Icon icon="mdi:eye-outline" width="18" height="18" /> View
      </Button>
    </div>
  );

  // Server-side paging + filtering: only the current page is loaded from the database
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => { setPage(1); }, [debounced, consultant, departmentFilter, stage, appointment, pageSize]);

  const { data, isLoading: loading, isFetching } = useGetJobsPageQuery(
    { page, pageSize, search: debounced, consultant, department: departmentFilter, stage, appointment },
    { pollingInterval: 30000 }
  );
  const pageRows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const consultants = data?.filters?.consultants ?? [];
  const departmentNames = data?.filters?.departments ?? [];
  const stages = (data?.filters?.stages ?? []).map((s) => [s.stageNo, s.stageName]);
  const firstShown = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastShown = Math.min(current * pageSize, total);
  const pageNumbers = useMemo(() => {
    const out = [];
    for (let n = 1; n <= pageCount; n++) if (n === 1 || n === pageCount || Math.abs(n - current) <= 1) out.push(n);
    return out;
  }, [pageCount, current]);

  const hasFilters = query || consultant || departmentFilter || stage || appointment;
  const clearFilters = () => {
    setQuery("");
    setConsultant("");
    setDepartmentFilter("");
    setStage("");
    setAppointment("");
  };

  return (
    <Card className="mt-4 jt-card border-0" style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px -14px rgba(15,23,42,.35)" }}>
      <style>{`
        .jt-card .jt-filters .form-control, .jt-card .jt-filters .form-select { min-height: 46px; border-radius: 12px; border: 1.5px solid #c4c4ca; background-color: #fff; }
        .jt-card .jt-filters .form-control:focus, .jt-card .jt-filters .form-select:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .jt-card .jt-filters .input-group-text { min-height: 46px; border: 1.5px solid #c4c4ca; border-right: 0; border-radius: 12px 0 0 12px; background: #fde8ea; color: #c8102e; }
        .jt-card .jt-filters .input-group .form-control { border-left: 0; border-radius: 0 12px 12px 0; }
        .jt-card .jt-filters .jt-clear { min-height: 46px; border-radius: 12px; font-weight: 600; }
        .jt-table { border-collapse: separate; border-spacing: 0; }
        .jt-table thead th { background: #111; color: #fff; font-size: .74rem; letter-spacing: .07em; text-transform: uppercase; font-weight: 700; padding: 13px 14px; border: 0; white-space: nowrap; }
        .jt-table thead th:first-child { box-shadow: inset 4px 0 0 #c8102e; }
        .jt-table tbody td { padding: 14px; border-bottom: 1px solid #ececef; vertical-align: middle; background: #fff; }
        .jt-table tbody tr:nth-child(even) td { background: #fafafb; }
        .jt-table tbody tr:hover td { background: #fff1f2; }
        .jt-table tbody tr.jt-up td { background: #ecfdf3; }
        .jt-table tbody tr.jt-up td:first-child { box-shadow: inset 5px 0 0 #16a34a; }
        .jt-table tbody tr.jt-up:hover td { background: #d1fae5; }
        .jt-table tbody tr.jt-today td { background: #fff1f2; }
        .jt-table tbody tr.jt-today td:first-child { box-shadow: inset 5px 0 0 #c8102e; }
        .jt-table tbody tr.jt-today:hover td { background: #ffe0e4; }
        .jt-m-card.jt-up { background: #ecfdf3 !important; border-left-color: #16a34a; }
        .jt-m-card.jt-today { background: #fff1f2 !important; }
        .jt-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 4px 10px; font-weight: 700; font-size: .82rem; letter-spacing: .03em; box-shadow: inset 3px 0 0 #c8102e; }
        .jt-plate { display: inline-flex; align-items: center; gap: 4px; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 2px 9px; font-weight: 800; font-size: .82rem; letter-spacing: .05em; white-space: nowrap; }
        .jt-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg,#111,#c8102e); color: #fff; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .jt-btn-view { background: linear-gradient(135deg,#0a0a0a,#7a0a14 55%,#c8102e); color: #fff !important; border: 0; border-radius: 10px; font-weight: 600; }
        .jt-btn-view:hover { filter: brightness(1.15); }
        .jt-m-card { border: 1px solid #e3e3e6; border-left: 4px solid #c8102e; border-radius: 12px; }
        .jt-card .pagination .page-item.active .page-link { background: #c8102e; border-color: #c8102e; color: #fff; }
        .jt-card .pagination .page-link { color: #111; }
      `}</style>
      <Card.Header className="border-0 text-white" style={{ background: "linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%)" }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="mb-0 text-white d-flex align-items-center gap-2">
            <Icon icon="mdi:clipboard-list-outline" width="26" height="26" />
            Jobs <Badge pill bg="light" text="dark">{total}</Badge>{isFetching && !loading && <Spinner animation="border" size="sm" className="ms-1" />}
          </h5>
        </div>
      </Card.Header>
      <div className="jt-filters px-3 pb-3 pt-3" style={{ background: "#f6f6f7", borderBottom: "1px solid #e3e3e6" }}>

        {/* Filters */}
        <Row className="g-2">
          <Col xs={12} md={6} lg={3}>
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
          </Col>
          <Col xs={6} md={3} lg={2}>
            <FormSelect value={consultant} onChange={(e) => setConsultant(e.target.value)}>
              <option value="">All consultants</option>
              {consultants.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </FormSelect>
          </Col>
          <Col xs={6} md={3} lg={2}>
            <FormSelect value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="">All departments</option>
              {departmentNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value={NO_DEPARTMENT}>Not selected yet</option>
            </FormSelect>
          </Col>
          <Col xs={6} md={6} lg={2}>
            <FormSelect value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All stages</option>
              {stages.map(([no, name]) => (
                <option key={no} value={no}>Stage {no} · {name}</option>
              ))}
            </FormSelect>
          </Col>
          <Col xs={6} md={6} lg={2}>
            <FormSelect value={appointment} onChange={(e) => setAppointment(e.target.value)} style={appointment ? { borderColor: "#c8102e", fontWeight: 600 } : undefined}>
              <option value="">Appointments: all jobs</option>
              <option value="ANY">With appointment</option>
              <option value="TODAY">Appointment today</option>
              <option value="UPCOMING">Upcoming appointments</option>
              <option value="PAST">Past appointments</option>
              <option value="NONE">Walk-in (no appointment)</option>
            </FormSelect>
          </Col>
          <Col xs={12} md={6} lg={1} className="d-grid">
            <Button variant="outline-dark" className="jt-clear" onClick={clearFilters} disabled={!hasFilters} title="Clear filters">
              <Icon icon="mdi:filter-off-outline" width="20" height="20" /><span className="d-lg-none ms-1">Clear</span>
            </Button>
          </Col>
        </Row>
      </div>

      <Card.Body className="p-0">
        {loading ? (
          <div className="text-center text-muted py-5">
            <Spinner animation="border" size="sm" className="me-2" /> Loading jobs...
          </div>
        ) : total === 0 ? (
          <div className="text-center text-muted py-5">
            <Icon icon="mdi:clipboard-text-off-outline" width="40" height="40" />
            <div className="mt-2">{hasFilters ? "No jobs match your filters." : "No jobs created yet."}</div>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="d-none d-md-block">
              <Table responsive className="align-middle mb-0 jt-table">
                <thead>
                  <tr>
                    <th>Job No / Created</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Consultant</th>
                    <th>Appointment</th>
                    <th>Department</th>
                    <th>Current Stage</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((j) => (
                    <tr key={j.id} className={apptState(j) === "upcoming" ? "jt-up" : apptState(j) === "today" ? "jt-today" : ""}>
                      <td className="text-nowrap">
                        <span className="jt-jobno">{j.jobNo}</span>
                        <div className="small mt-1" style={{ color: "#475569" }}><Icon icon="mdi:calendar-clock-outline" width="14" height="14" style={{ color: "#c8102e" }} /> {fmtDate(j.createdAt)}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="jt-avatar">{(j.customerName || "?").trim().charAt(0).toUpperCase()}</span>
                          <div className="lh-sm">
                            <div className="fw-bold" style={{ color: "#0f172a" }}>{j.customerName}</div>
                            <small className="text-muted"><Icon icon="mdi:phone-outline" width="13" height="13" style={{ color: "#c8102e" }} /> {j.contactNumber}</small>
                          </div>
                        </div>
                      </td>
                      <td className="text-nowrap"><span className="jt-plate">{j.regNo}</span></td>
                      <td><ConsultantCell name={j.consultantName} mobile={j.consultantMobile} /></td>
                      <td><AppointmentCell job={j} /></td>
                      <td><DeptBadge name={j.departmentName} /></td>
                      <td><StageCell job={j} /></td>
                      <td className="text-end">{renderActions(j)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Phone: cards */}
            <div className="d-md-none p-2 d-flex flex-column gap-2">
              {pageRows.map((j) => (
                <div key={j.id} className={`jt-m-card p-2 bg-white ${apptState(j) === "upcoming" ? "jt-up" : apptState(j) === "today" ? "jt-today" : ""}`}>
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="jt-jobno">{j.jobNo}</span>
                    <small className="text-muted">{fmtDate(j.createdAt)}</small>
                  </div>
                  <div className="mt-1 fw-semibold">{j.customerName}</div>
                  <div className="small text-muted mb-2">
                    <Icon icon="mdi:phone-outline" width="14" height="14" /> {j.contactNumber}
                    {" · "}
                    <span className="jt-plate">{j.regNo}</span>
                  </div>
                  <div className="mb-2"><ConsultantCell name={j.consultantName} mobile={j.consultantMobile} /></div>
                  {j.appointmentDate && <div className="mb-2"><AppointmentCell job={j} /></div>}
                  <div className="mb-2"><DeptBadge name={j.departmentName} /></div>
                  <StageCell job={j} />
                  <div className="mt-2">{renderActions(j, true)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card.Body>
      {!loading && total > 0 && (
        <Card.Footer className="d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ background: "#f6f6f7", borderTop: "1px solid #e3e3e6" }}>
          <div className="d-flex align-items-center gap-2 small text-muted">
            <span>Rows</span>
            <FormSelect size="sm" style={{ width: 80 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </FormSelect>
            <span>Showing {firstShown}-{lastShown} of {total}</span>
          </div>
          {pageCount > 1 && (
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev disabled={current === 1} onClick={() => setPage(current - 1)} />
              {pageNumbers.map((n, i) => (
                <span key={n} className="d-inline-flex">
                  {i > 0 && n - pageNumbers[i - 1] > 1 && <Pagination.Ellipsis disabled />}
                  <Pagination.Item active={n === current} onClick={() => setPage(n)}>{n}</Pagination.Item>
                </span>
              ))}
              <Pagination.Next disabled={current === pageCount} onClick={() => setPage(current + 1)} />
            </Pagination>
          )}
        </Card.Footer>
      )}
      {complaintJobId && <ComplaintModal key={`c${complaintJobId}`} jobId={complaintJobId} onHide={() => setComplaintJobId(null)} />}
      {preEvJobId && <VehicleEvidenceModal key={`pre${preEvJobId}`} jobId={preEvJobId} preDepartment onHide={() => setPreEvJobId(null)} />}
    </Card>
  );
}