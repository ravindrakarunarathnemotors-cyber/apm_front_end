"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Dropdown, FormControl, FormSelect, InputGroup, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import JobStartBadge from "./JobStartBadge";
import Swal from "sweetalert2";
import VehicleEvidenceModal from "./VehicleEvidenceModal";
import PreDepartmentActions, { OPEN_COMPLAINT_EVENT } from "./PreDepartmentActions";
import ComplaintModal from "./ComplaintModal"; // Evidence first, then Select Department
import { getDepartmentUi } from "./departmentConfig";
import { useGetDepartmentsQuery, useSetJobDepartmentMutation } from "@/store/features/apiSlice";

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

function StageCell({ job }) {
  const total = job.totalStages || 0;
  const completed = job.completedStages || 0;
  const done = job.status === "COMPLETED";
  const cancelled = job.status === "CANCELLED";
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ minWidth: 190 }}>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <Badge bg={cancelled ? "danger" : done ? "success" : "primary"} className="fw-semibold">
          {cancelled ? "Cancelled" : done ? "Completed" : `Stage ${job.stageNo} · ${job.stageName ?? "-"}`}
        </Badge>
        <small className="text-muted ms-2">
          {completed}/{total}
        </small>
      </div>
      <ProgressBar now={pct} variant={cancelled ? "danger" : done ? "success" : "primary"} style={{ height: 6 }} />
      <JobStartBadge job={job} />
    </div>
  );
}

export default function JobsTable({ jobs = [], loading = false, onView }) {
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

  // Filter options built from the jobs themselves
  const departmentNames = useMemo(
    () => [...new Set(jobs.map((j) => j.departmentName).filter(Boolean))].sort(),
    [jobs]
  );
  const consultants = useMemo(
    () => [...new Set(jobs.map((j) => j.consultantName).filter(Boolean))].sort(),
    [jobs]
  );
  const stages = useMemo(() => {
    const map = new Map();
    jobs.forEach((j) => map.set(j.stageNo, j.stageName));
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s-]/g, "");
    return jobs.filter((j) => {
      if (consultant && j.consultantName !== consultant) return false;
      if (departmentFilter === NO_DEPARTMENT && j.departmentName) return false;
      if (departmentFilter && departmentFilter !== NO_DEPARTMENT && j.departmentName !== departmentFilter) return false;
      if (stage && String(j.stageNo) !== stage) return false;
      if (!q) return true;
      return [j.jobNo, j.customerName, j.contactNumber, j.regNo].some((v) =>
        String(v ?? "").toLowerCase().replace(/[\s-]/g, "").includes(q)
      );
    });
  }, [jobs, query, consultant, departmentFilter, stage]);

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
            Jobs <Badge bg="secondary" pill>{filtered.length}</Badge>
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
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted py-5">
            <Icon icon="mdi:clipboard-text-off-outline" width="40" height="40" />
            <div className="mt-2">{jobs.length === 0 ? "No jobs created yet." : "No jobs match your filters."}</div>
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
                  {filtered.map((j) => (
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
              {filtered.map((j) => (
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
      {complaintJobId && <ComplaintModal key={`c${complaintJobId}`} jobId={complaintJobId} onHide={() => setComplaintJobId(null)} />}
      {preEvJobId && <VehicleEvidenceModal key={`pre${preEvJobId}`} jobId={preEvJobId} preDepartment onHide={() => setPreEvJobId(null)} />}
    </Card>
  );
}