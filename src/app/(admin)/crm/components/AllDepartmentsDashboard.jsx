"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Col, FormControl, FormSelect, InputGroup, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetJobsQuery } from "@/store/features/apiSlice";
import JobActionsCell from "./JobActionsCell"; // stage buttons of the job's own department
import JobsTabs from "./JobsTabs";
import { DEPARTMENTS, getDepartmentUi } from "./departmentConfig";

/* ----------------------------- helpers ----------------------------- */
const NONE = "__NONE__"; // jobs that have no department yet (waiting at stage 4)
const slugOf = (name) => String(name || "").trim().toLowerCase().replace(/\s+/g, "-"); // "Accident Repair" -> /accident-repair
const isToday = (iso) => !!iso && new Date(iso).toLocaleDateString("sv-SE") === new Date().toLocaleDateString("sv-SE");
const ago = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return "-";
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${mins % 60}m` : `${mins}m`;
};
const pctOf = (j) => (j.totalStages ? Math.round(((j.completedStages || 0) / j.totalStages) * 100) : 0);
const STATUS = {
  IN_PROGRESS: { label: "In progress", bg: "primary" },
  COMPLETED: { label: "Completed", bg: "success" },
  CANCELLED: { label: "Cancelled", bg: "secondary" },
};

/* ----------------------------- small components ----------------------------- */
function Kpi({ icon, label, value, color, active, onClick }) {
  return (
    <Card
      className="h-100 border-0 shadow-sm"
      role="button"
      onClick={onClick}
      style={{ cursor: "pointer", outline: active ? `2px solid ${color}` : "none" }}
    >
      <Card.Body className="d-flex align-items-center gap-3 py-3">
        <span
          className="rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
        >
          <Icon icon={icon} width="26" height="26" />
        </span>
        <div>
          <div className="fs-3 fw-bold lh-1">{value}</div>
          <div className="text-muted small mt-1">{label}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

function DepartmentCard({ name, jobs, selected, onSelect, onOpen }) {
  const ui = getDepartmentUi(name);
  const active = jobs.filter((j) => j.status === "IN_PROGRESS");
  const done = jobs.filter((j) => j.status === "COMPLETED").length;
  // how many active jobs sit in each stage right now
  const stages = useMemo(() => {
    const m = new Map();
    active.forEach((j) => {
      const k = `${j.stageNo}|${j.stageName ?? "-"}`;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return [...m.entries()].map(([k, n]) => ({ no: Number(k.split("|")[0]), name: k.split("|")[1], n })).sort((a, b) => a.no - b.no);
  }, [active]);
  const avg = active.length ? Math.round(active.reduce((s, j) => s + pctOf(j), 0) / active.length) : 0;

  return (
    <Card className="h-100 border-0 shadow-sm" style={{ borderTop: `4px solid ${ui.color}`, outline: selected ? `2px solid ${ui.color}` : "none" }}>
      <Card.Body className="d-flex flex-column gap-2">
        <div className="d-flex align-items-center gap-2" role="button" onClick={onSelect}>
          <span
            className="rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 40, height: 40, color: ui.color, backgroundColor: `color-mix(in srgb, ${ui.color} 12%, white)` }}
          >
            <Icon icon={ui.icon} width="22" height="22" />
          </span>
          <div className="flex-grow-1 fw-semibold text-truncate">{name}</div>
          <Button size="sm" variant="link" className="p-0 text-muted" title={`Open ${name} dashboard`} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <Icon icon="mdi:open-in-new" width="18" height="18" />
          </Button>
        </div>

        <div className="d-flex gap-3 align-items-end">
          <div><div className="fs-2 fw-bold lh-1">{active.length}</div><div className="text-muted small">Active</div></div>
          <div><div className="fs-5 fw-semibold lh-1 text-success">{done}</div><div className="text-muted small">Done</div></div>
          <div className="ms-auto text-end"><div className="fw-semibold">{avg}%</div><div className="text-muted small">Avg progress</div></div>
        </div>
        <ProgressBar now={avg} style={{ height: 6 }} variant="primary" />

        <div className="d-flex flex-wrap gap-1 mt-1" style={{ minHeight: 24 }}>
          {stages.length === 0 && <span className="text-muted small">No active jobs</span>}
          {stages.map((s) => (
            <Badge key={s.no} bg="light" text="dark" className="border fw-normal" title={`Stage ${s.no}`}>
              {s.name} <strong className="ms-1" style={{ color: ui.color }}>{s.n}</strong>
            </Badge>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

function DeptBadge({ name }) {
  const ui = getDepartmentUi(name);
  return (
    <span className="d-inline-flex align-items-center gap-1 fw-semibold small" style={{ color: ui.color }}>
      <Icon icon={ui.icon} width="16" height="16" /> {name || "-"}
    </span>
  );
}

function StageCell({ job }) {
  const done = job.status === "COMPLETED";
  return (
    <div style={{ minWidth: 190 }}>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <Badge bg={done ? "success" : job.status === "CANCELLED" ? "secondary" : "primary"} className="fw-semibold">
          {done ? "Completed" : job.status === "CANCELLED" ? "Cancelled" : `Stage ${job.stageNo} · ${job.stageName ?? "-"}`}
        </Badge>
        <small className="text-muted ms-2">{job.completedStages || 0}/{job.totalStages || 0}</small>
      </div>
      <ProgressBar now={pctOf(job)} variant={done ? "success" : "primary"} style={{ height: 6 }} />
    </div>
  );
}

/* ----------------------------- dashboard ----------------------------- */
// Overview of every department in one page. Uses the same GET /jobs list as the department dashboards (no department filter).
export default function AllDepartmentsDashboard() {
  const router = useRouter();
  const { data: jobs = [], isLoading, isFetching, isError, refetch } = useGetJobsQuery(undefined, { pollingInterval: 30000 });

  const [dept, setDept] = useState("ALL");     // department filter ("ALL" or a department name)
  const [status, setStatus] = useState("ALL"); // ALL | IN_PROGRESS | COMPLETED | TODAY
  const [q, setQ] = useState("");
  const [showDepts, setShowDepts] = useState(false); // department cards: closed by default, open with the arrow

  // departments: the known ones first, then any other department found in the data
  const deptNames = useMemo(() => {
    const found = [...new Set(jobs.map((j) => j.departmentName).filter(Boolean))];
    const known = DEPARTMENTS.map((d) => d.label);
    return [...known, ...found.filter((n) => !known.some((k) => k.toLowerCase() === n.toLowerCase()))];
  }, [jobs]);

  const kpi = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter((j) => j.status === "IN_PROGRESS").length,
    done: jobs.filter((j) => j.status === "COMPLETED").length,
    today: jobs.filter((j) => isToday(j.createdAt)).length,
    noDept: jobs.filter((j) => !j.departmentName).length,
  }), [jobs]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (dept === NONE) { if (j.departmentName) return false; }
      else if (dept !== "ALL" && (j.departmentName || "").toLowerCase() !== dept.toLowerCase()) return false;
      if (status === "TODAY" ? !isToday(j.createdAt) : status !== "ALL" && j.status !== status) return false;
      if (!needle) return true;
      return [j.jobNo, j.customerName, j.regNo, j.contactNumber, j.consultantName, j.teamName, j.bayName]
        .some((v) => String(v ?? "").toLowerCase().includes(needle));
    });
  }, [jobs, dept, status, q]);

  const reset = () => { setDept("ALL"); setStatus("ALL"); setQ(""); };

  return (
    <>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 px-3 py-2 rounded border" style={{ backgroundColor: "#e5e7eb" }}>
        <div>
          <h4 className="mb-0 text-dark">Jobs Dashboard</h4>
          <small className="text-muted">All departments · refreshes every 30 seconds</small>
        </div>
        <Button variant="outline-dark" size="sm" className="d-inline-flex align-items-center gap-1" onClick={refetch} disabled={isFetching}>
          {isFetching ? <Spinner size="sm" /> : <Icon icon="mdi:refresh" width="18" height="18" />} Refresh
        </Button>
      </div>

      <JobsTabs />

      {isError && <div className="alert alert-danger py-2">Could not load the jobs. <Button size="sm" variant="link" onClick={refetch}>Try again</Button></div>}

      {/* KPI row (click to filter the table) */}
      <Row className="g-3 mb-3">
        <Col xs={6} md={3}><Kpi icon="mdi:clipboard-list-outline" label="All jobs" value={kpi.total} color="#475569" active={status === "ALL"} onClick={() => setStatus("ALL")} /></Col>
        <Col xs={6} md={3}><Kpi icon="mdi:progress-wrench" label="In progress" value={kpi.active} color="#2563eb" active={status === "IN_PROGRESS"} onClick={() => setStatus("IN_PROGRESS")} /></Col>
        <Col xs={6} md={3}><Kpi icon="mdi:check-circle-outline" label="Completed" value={kpi.done} color="#16a34a" active={status === "COMPLETED"} onClick={() => setStatus("COMPLETED")} /></Col>
        <Col xs={6} md={3}><Kpi icon="mdi:calendar-today" label="Created today" value={kpi.today} color="#d97706" active={status === "TODAY"} onClick={() => setStatus("TODAY")} /></Col>
      </Row>

      {/* One card per department (closed by default) */}
      <button
        type="button"
        className="btn btn-light border w-100 d-flex align-items-center gap-2 mb-3 text-start"
        aria-expanded={showDepts}
        onClick={() => setShowDepts((v) => !v)}
      >
        <Icon icon="mdi:domain" width="20" height="20" />
        <span className="fw-semibold">Departments overview</span>
        <span className="text-muted small">{deptNames.length} departments</span>
        <Icon icon={showDepts ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" className="ms-auto" />
      </button>
      {!showDepts ? null : isLoading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : (
        <Row className="g-3 mb-4">
          {deptNames.map((n) => (
            <Col key={n} xs={12} md={6} xl={4} xxl>
              <DepartmentCard
                name={n}
                jobs={jobs.filter((j) => (j.departmentName || "").toLowerCase() === n.toLowerCase())}
                selected={dept.toLowerCase() === n.toLowerCase()}
                onSelect={() => setDept((cur) => (cur.toLowerCase() === n.toLowerCase() ? "ALL" : n))}
                onOpen={() => router.push(`/${slugOf(n)}`)}
              />
            </Col>
          ))}
        </Row>
      )}

      {kpi.noDept > 0 && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2 py-2">
          <Icon icon="mdi:domain-off" width="20" height="20" />
          <span><strong>{kpi.noDept}</strong> job{kpi.noDept === 1 ? " has" : "s have"} no department yet.</span>
          <Button size="sm" variant="warning" className="ms-auto" onClick={() => { setDept(NONE); setStatus("ALL"); }}>Show them &amp; select a department</Button>
        </div>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Row className="g-2 align-items-center mb-3">
            <Col xs={12} md={5}>
              <InputGroup>
                <InputGroup.Text><Icon icon="mdi:magnify" width="18" height="18" /></InputGroup.Text>
                <FormControl placeholder="Search job no, customer, vehicle, consultant, team, bay…" value={q} onChange={(e) => setQ(e.target.value)} />
              </InputGroup>
            </Col>
            <Col xs={6} md={3}>
              <FormSelect value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
                <option value="ALL">All departments</option>
                {deptNames.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value={NONE}>No department yet ({kpi.noDept})</option>
              </FormSelect>
            </Col>
            <Col xs={6} md={2}>
              <FormSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                <option value="ALL">Any status</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="TODAY">Created today</option>
              </FormSelect>
            </Col>
            <Col xs={12} md={2} className="text-md-end">
              <span className="text-muted small me-2">{rows.length} job{rows.length === 1 ? "" : "s"}</span>
              {(dept !== "ALL" || status !== "ALL" || q) && <Button size="sm" variant="link" onClick={reset}>Clear</Button>}
            </Col>
          </Row>

          {/* Desktop table */}
          <div className="d-none d-lg-block table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr><th>Job</th><th>Customer / Vehicle</th><th>Department</th><th>Stage</th><th>Team / Bay</th><th>Consultant</th><th>Updated</th><th className="text-end">Action</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No jobs match the filters</td></tr>}
                {rows.map((j) => (
                  <tr key={j.id}>
                    <td><div className="fw-semibold">{j.jobNo}</div><small className="text-muted">{j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "-"}</small></td>
                    <td><div>{j.customerName}</div><small className="text-muted">{j.regNo || "-"}</small></td>
                    <td><DeptBadge name={j.departmentName} /></td>
                    <td><StageCell job={j} /></td>
                    <td><div className="small">{j.teamName || "-"}</div><small className="text-muted">{j.bayName || ""}</small></td>
                    <td className="small">{j.consultantName}</td>
                    <td className="small text-muted text-nowrap">{j.updatedAt ? `${ago(j.updatedAt)} ago` : "-"}</td>
                    <td className="text-end"><JobActionsCell job={j} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="d-lg-none d-flex flex-column gap-2">
            {rows.length === 0 && <div className="text-center text-muted py-4">No jobs match the filters</div>}
            {rows.map((j) => (
              <Card key={j.id} className="border">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div><div className="fw-semibold">{j.jobNo}</div><small className="text-muted">{j.customerName} · {j.regNo || "-"}</small></div>
                    <Badge bg={(STATUS[j.status] || STATUS.IN_PROGRESS).bg}>{(STATUS[j.status] || {}).label || j.status}</Badge>
                  </div>
                  <div className="my-2"><DeptBadge name={j.departmentName} /></div>
                  <StageCell job={j} />
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">{[j.teamName, j.bayName].filter(Boolean).join(" · ") || j.consultantName}</small>
                  </div>
                  <div className="mt-2"><JobActionsCell job={j} block /></div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Card.Body>
      </Card>

    </>
  );
}