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
        className="rounded-circle bg-primary-subtle text-primary fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 28, height: 28, fontSize: "0.7rem" }}
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

  // "Select Department" option (only for jobs waiting at stage 4), plus the View button
  const renderActions = (j, block = false) => {
    const waitingForDepartment = j.status === "IN_PROGRESS" && j.stageNo === DEPARTMENT_STAGE_NO;
    return (
      <div className={`d-flex gap-2 ${block ? "flex-column" : "justify-content-end"}`}>
        {waitingForDepartment && <PreDepartmentActions job={j} block={block} />}
        {j.stageNo > DEPARTMENT_STAGE_NO && (
          <Button size="sm" variant="outline-warning" className="text-nowrap" onClick={() => setPreEvJobId(j.id)}>
            <Icon icon="mdi:car-search-outline" width="18" height="18" /> Evidence
          </Button>
        )}
        <Button size="sm" variant="outline-primary" onClick={() => onView?.(j)}>
          <Icon icon="mdi:eye-outline" width="18" height="18" /> View
        </Button>
      </div>
    );
  };

  // Server-side paging + filtering: only the current page is loaded from the database
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => { setPage(1); }, [debounced, consultant, departmentFilter, stage, pageSize]);

  const { data, isLoading: loading, isFetching } = useGetJobsPageQuery(
    { page, pageSize, search: debounced, consultant, department: departmentFilter, stage },
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

  const hasFilters = query || consultant || departmentFilter || stage;
  const clearFilters = () => {
    setQuery("");
    setConsultant("");
    setDepartmentFilter("");
    setStage("");
  };

  return (
    <Card className="mt-4">
      <Card.Header className="bg-transparent">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="mb-0">
            <Icon icon="mdi:clipboard-list-outline" width="22" height="22" className="me-1" />
            Jobs <Badge bg="secondary" pill>{total}</Badge>{isFetching && !loading && <Spinner animation="border" size="sm" className="ms-2" />}
          </h5>
        </div>

        {/* Filters */}
        <Row className="g-2 mt-2">
          <Col xs={12} md={6} lg={3}>
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
          <Col xs={6} md={6} lg={3}>
            <FormSelect value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All stages</option>
              {stages.map(([no, name]) => (
                <option key={no} value={no}>Stage {no} · {name}</option>
              ))}
            </FormSelect>
          </Col>
          <Col xs={6} md={6} lg={2} className="d-grid">
            <Button variant="outline-secondary" onClick={clearFilters} disabled={!hasFilters} title="Clear filters">
              <Icon icon="mdi:filter-off-outline" width="20" height="20" /> Clear
            </Button>
          </Col>
        </Row>
      </Card.Header>

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
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Job No</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Consultant</th>
                    <th>Department</th>
                    <th>Current Stage</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((j) => (
                    <tr key={j.id}>
                      <td className="fw-semibold text-nowrap">{j.jobNo}</td>
                      <td>
                        <div className="fw-semibold">{j.customerName}</div>
                        <small className="text-muted">{j.contactNumber}</small>
                      </td>
                      <td className="text-nowrap">
                        <Icon icon="mdi:car-outline" width="16" height="16" className="me-1 text-muted" />
                        {j.regNo}
                      </td>
                      <td><ConsultantCell name={j.consultantName} mobile={j.consultantMobile} /></td>
                      <td><DeptBadge name={j.departmentName} /></td>
                      <td><StageCell job={j} /></td>
                      <td className="small text-muted text-nowrap">{fmtDate(j.createdAt)}</td>
                      <td className="text-end">{renderActions(j)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Phone: cards */}
            <div className="d-md-none p-2 d-flex flex-column gap-2">
              {pageRows.map((j) => (
                <div key={j.id} className="border rounded p-2 bg-white">
                  <div className="d-flex justify-content-between align-items-start">
                    <strong>{j.jobNo}</strong>
                    <small className="text-muted">{fmtDate(j.createdAt)}</small>
                  </div>
                  <div className="mt-1 fw-semibold">{j.customerName}</div>
                  <div className="small text-muted mb-2">
                    <Icon icon="mdi:phone-outline" width="14" height="14" /> {j.contactNumber}
                    {" · "}
                    <Icon icon="mdi:car-outline" width="14" height="14" /> {j.regNo}
                  </div>
                  <div className="mb-2"><ConsultantCell name={j.consultantName} mobile={j.consultantMobile} /></div>
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
        <Card.Footer className="bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2">
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