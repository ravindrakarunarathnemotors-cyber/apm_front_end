"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Col, FormControl, FormSelect, InputGroup, Pagination, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetJobsPageQuery, useGetJobsSummaryQuery } from "./jobsPageApi";
import JobActionsCell from "./JobActionsCell"; // stage buttons of the job's own department
import JobsTabs from "./JobsTabs";
import RepairTypeModal from "./RepairTypeModal";
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
      <Card.Body className="d-flex align-items-center gap-2 gap-md-3 py-2 py-md-3 px-2 px-md-3">
        <span
          className="da-kpi-icon rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
        >
          <Icon icon={icon} width="24" height="24" />
        </span>
        <div>
          <div className="da-kpi-value fw-bold lh-1">{value}</div>
          <div className="text-muted small mt-1 text-truncate">{label}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

function DepartmentCard({ name, stat, selected, onSelect, onOpen }) {
  const ui = getDepartmentUi(name);
  const s0 = stat || { active: 0, done: 0, avgProgress: 0, stages: [] };
  const active = { length: s0.active };
  const done = s0.done;
  const avg = s0.avgProgress;
  const stages = (s0.stages || []).map((x) => ({ no: x.stageNo, name: x.stageName ?? "-", n: x.n }));

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
    </div>
  );
}

/* ----------------------------- dashboard ----------------------------- */
// Overview of every department in one page. Counts: GET /jobs/summary. Table: GET /jobs/page (one page at a time).
export default function AllDepartmentsDashboard() {
  const router = useRouter();
  const [dept, setDept] = useState("ALL");     // department filter ("ALL" or a department name)
  const [status, setStatus] = useState("ALL"); // ALL | IN_PROGRESS | COMPLETED | CANCELLED | TODAY
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showRepairTypes, setShowRepairTypes] = useState(false);
  const [showDepts, setShowDepts] = useState(false); // department cards: closed by default, open with the arrow
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [dept, status, debouncedQ, pageSize]);

  // Counts (KPIs, department cards) come from GET /jobs/summary; the table loads ONE page at a time from GET /jobs/page
  const { data: summary, isLoading, isError: summaryError, refetch: refetchSummary } = useGetJobsSummaryQuery(undefined, { pollingInterval: 30000 });
  const { data: pageData, isFetching, isError: pageError, refetch: refetchPage } = useGetJobsPageQuery(
    { page, pageSize, search: debouncedQ, department: dept === "ALL" ? "" : dept === NONE ? "__none__" : dept, status: status === "ALL" ? "" : status },
    { pollingInterval: 30000 }
  );
  const isError = summaryError || pageError;
  const refetch = () => { refetchSummary(); refetchPage(); };

  const rows = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const pageRows = rows;

  // departments: the known ones first, then any other department found in the data
  const deptNames = useMemo(() => {
    const found = (summary?.departments ?? []).map((d) => d.name).filter(Boolean);
    const known = DEPARTMENTS.map((d) => d.label);
    return [...known, ...found.filter((n) => !known.some((k) => k.toLowerCase() === n.toLowerCase()))];
  }, [summary]);
  const statOf = (n) => (summary?.departments ?? []).find((d) => (d.name || "").toLowerCase() === n.toLowerCase());

  const kpi = { total: summary?.total ?? 0, active: summary?.active ?? 0, done: summary?.done ?? 0, today: summary?.today ?? 0, noDept: summary?.noDept ?? 0 };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const firstShown = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastShown = Math.min(current * pageSize, total);
  const pageNumbers = useMemo(() => {
    const out = [];
    for (let n = 1; n <= pageCount; n++) if (n === 1 || n === pageCount || Math.abs(n - current) <= 1) out.push(n);
    return out;
  }, [pageCount, current]);

  const reset = () => { setDept("ALL"); setStatus("ALL"); setQ(""); };

  return (
    <>
      <style>{`
        .da-kpi-icon { width: 48px; height: 48px; }
        .da-kpi-value { font-size: 1.75rem; }
        .da-title { font-size: 1.5rem; }
        @media (max-width: 767.98px) {
          .da-kpi-icon { width: 36px; height: 36px; }
          .da-kpi-value { font-size: 1.35rem; }
          .da-title { font-size: 1.2rem; }
          .da-kpi-icon svg { width: 20px; height: 20px; }
          .da-count { text-align: left !important; }
          .da-footer { justify-content: center !important; }
        }
      `}</style>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 px-2 px-md-3 py-2 rounded border" style={{ backgroundColor: "#e5e7eb" }}>
        <div>
          <h4 className="da-title mb-0 text-dark">Jobs Dashboard</h4>
          <small className="text-muted">All departments · refreshes every 30 seconds</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" size="sm" className="d-inline-flex align-items-center gap-1" onClick={() => setShowRepairTypes(true)}>
            <Icon icon="mdi:wrench-cog-outline" width="18" height="18" /> Repair Type
          </Button>
          <Button variant="outline-dark" size="sm" className="d-inline-flex align-items-center gap-1" onClick={refetch} disabled={isFetching}>
            {isFetching ? <Spinner size="sm" /> : <Icon icon="mdi:refresh" width="18" height="18" />} <span className="d-none d-sm-inline">Refresh</span>
          </Button>
        </div>
      </div>

      {showRepairTypes && <RepairTypeModal onHide={() => setShowRepairTypes(false)} />}

      <JobsTabs />

      {isError && <div className="alert alert-danger py-2">Could not load the jobs. <Button size="sm" variant="link" onClick={refetch}>Try again</Button></div>}

      {/* KPI row (click to filter the table) */}
      <Row className="g-2 g-md-3 mb-3">
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
                stat={statOf(n)}
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
        <Card.Body className="p-2 p-md-3">
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
            <Col xs={12} md={2} className="da-count text-md-end">
              <span className="text-muted small me-2">{total} job{total === 1 ? "" : "s"}</span>
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
                {pageRows.map((j) => (
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
            {pageRows.map((j) => (
              <Card key={j.id} className="border">
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div><div className="fw-semibold">{j.jobNo}</div><small className="text-muted">{j.customerName} · {j.regNo || "-"}</small></div>
                    <Badge bg={(STATUS[j.status] || STATUS.IN_PROGRESS).bg}>{(STATUS[j.status] || {}).label || j.status}</Badge>
                  </div>
                  <div className="my-2"><DeptBadge name={j.departmentName} /></div>
                  <StageCell job={j} />
                  <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-1">
                    <small className="text-muted">{[j.teamName, j.bayName].filter(Boolean).join(" · ") || j.consultantName}</small>
                  </div>
                  <div className="mt-2"><JobActionsCell job={j} block /></div>
                </Card.Body>
              </Card>
            ))}
          </div>

          {total > 0 && (
            <div className="da-footer d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
                <span>Rows</span>
                <FormSelect size="sm" style={{ width: 80 }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label="Rows per page">
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
            </div>
          )}
        </Card.Body>
      </Card>

    </>
  );
}