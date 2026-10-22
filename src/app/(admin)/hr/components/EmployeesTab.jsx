"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Card, Col, FormControl, FormSelect, InputGroup, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { DEPARTMENTS, fmtDate } from "./hrData";
import { Avatar, Empty, Panel, StatusBadge, fileUrl } from "./hrUi";
import EmployeeFormModal from "./EmployeeFormModal";

const yearsOf = (joined) => {
  if (!joined) return null;
  const m = (new Date() - new Date(joined)) / (365.25 * 86400000);
  return m < 1 ? `${Math.max(1, Math.round(m * 12))} months` : `${m.toFixed(1)} years`;
};

function EmployeeProfile({ e, onClose, onEdit }) {
  const dept = DEPARTMENTS.find((d) => d.name === e.department);
  const Line = ({ l, v }) => (
    <div className="d-flex justify-content-between gap-3 py-2 border-bottom">
      <span className="text-muted small flex-shrink-0">{l}</span>
      <span className="fw-semibold text-end" style={{ wordBreak: "break-word" }}>
        {v || <span className="text-muted fw-normal">-</span>}
      </span>
    </div>
  );

  return (
    <Modal show onHide={onClose} centered scrollable>
      <Modal.Header closeButton><Modal.Title className="fs-5">Employee profile</Modal.Title></Modal.Header>
      <Modal.Body>
        <div className="text-center mb-3">
          <Avatar name={e.name} size={80} src={fileUrl(e.profileImage)} />
          <h5 className="mt-2 mb-0">{e.salutation} {e.name}</h5>
          <div className="text-muted">{e.designation}</div>
          <div className="mt-2"><StatusBadge status={e.status} /></div>
        </div>
        <Line l="Employee ID" v={e.id} />
        <Line l="Department" v={e.department && <span style={{ color: dept?.color }}>{e.department}</span>} />
        <Line l="Branch" v={e.branchName} />
        <Line l="Reporting to" v={e.reportingTo} />
        <Line l="Joined" v={e.joined && `${fmtDate(e.joined)} (${yearsOf(e.joined)})`} />
        <Line l="Mobile" v={e.mobile} />
        <Line l="Alternative mobile" v={e.altMobile} />
        <Line l="Email" v={e.email} />
        <Line l="NIC" v={e.nic} />
        <Line l="Gender" v={e.gender} />
        <Line l="Date of birth" v={e.dob && fmtDate(e.dob)} />
        <Line l="Address" v={e.address} />
        <Line l="About" v={e.about} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={onEdit}><Icon icon="mdi:pencil-outline" width="18" height="18" /> Edit</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function EmployeesTab({ hr }) {
  const { employees, employeesLoading, employeesError, refetchEmployees } = hr;
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("table");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return employees.filter(
      (e) =>
        (!dept || e.department === dept) &&
        (!status || e.status === status) &&
        (!s || [e.name, e.id, e.mobile, e.designation, e.nic, e.email].some((v) => String(v ?? "").toLowerCase().includes(s)))
    );
  }, [employees, q, dept, status]);

  const deptColor = (name) => DEPARTMENTS.find((d) => d.name === name)?.color || "#64748b";
  const deptNames = useMemo(() => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(), [employees]);

  return (
    <Panel
      title={<>Employees <Badge bg="secondary" pill>{rows.length}</Badge></>}
      icon="mdi:account-group-outline"
      action={<Button size="sm" onClick={() => setAdding(true)}><Icon icon="mdi:account-plus-outline" width="18" height="18" /> Add employee</Button>}
    >
      <Row className="g-2 mb-3">
        <Col xs={12} md={5}>
          <InputGroup>
            <InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></InputGroup.Text>
            <FormControl value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / ID / mobile / NIC / designation" />
          </InputGroup>
        </Col>
        <Col xs={6} md={3}>
          <FormSelect value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {deptNames.map((d) => <option key={d}>{d}</option>)}
          </FormSelect>
        </Col>
        <Col xs={6} md={2}>
          <FormSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            {["Active", "Probation", "Resigned"].map((s) => <option key={s}>{s}</option>)}
          </FormSelect>
        </Col>
        <Col xs={12} md={2} className="d-flex justify-content-md-end">
          <ButtonGroup>
            <Button variant={view === "table" ? "primary" : "outline-secondary"} onClick={() => setView("table")} title="Table"><Icon icon="mdi:table" width="18" height="18" /></Button>
            <Button variant={view === "cards" ? "primary" : "outline-secondary"} onClick={() => setView("cards")} title="Cards"><Icon icon="mdi:view-grid-outline" width="18" height="18" /></Button>
          </ButtonGroup>
        </Col>
      </Row>

      {employeesLoading ? (
        <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading employees...</div>
      ) : employeesError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load employees.</span>
          <Button size="sm" variant="outline-danger" onClick={refetchEmployees}>Retry</Button>
        </Alert>
      ) : rows.length === 0 ? (
        <Empty text={employees.length === 0 ? "No employees yet. Click Add employee." : "No employees match your filters"} />
      ) : view === "table" ? (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light">
            <tr><th>Employee</th><th>Department</th><th>Contact</th><th>Joined</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.dbId || e.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={e.name} src={fileUrl(e.profileImage)} />
                    <div><div className="fw-semibold">{e.salutation} {e.name}</div><small className="text-muted">{e.designation} · {e.id}</small></div>
                  </div>
                </td>
                <td>
                  {e.department ? (
                    <span className="d-inline-flex align-items-center gap-2"><span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: deptColor(e.department) }} />{e.department}</span>
                  ) : "-"}
                </td>
                <td><div className="small">{e.mobile}</div><small className="text-muted">{e.email}</small></td>
                <td className="small text-nowrap">{e.joined ? fmtDate(e.joined) : "-"}</td>
                <td><StatusBadge status={e.status} /></td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setOpen(e)}>View</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => setEditing(e)} title="Edit"><Icon icon="mdi:pencil-outline" width="16" height="16" /> Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Row className="g-3">
          {rows.map((e) => (
            <Col key={e.dbId || e.id} sm={6} lg={4} xxl={3}>
              <Card className="h-100 border" role="button" onClick={() => setOpen(e)}>
                <Card.Body className="text-center">
                  <Avatar name={e.name} size={56} src={fileUrl(e.profileImage)} />
                  <div className="fw-semibold mt-2">{e.salutation} {e.name}</div>
                  <div className="small text-muted">{e.designation}</div>
                  <div className="small mt-1" style={{ color: deptColor(e.department) }}>{e.department}</div>
                  <div className="mt-2"><StatusBadge status={e.status} /></div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {adding && <EmployeeFormModal onClose={() => setAdding(false)} />}
      {editing && <EmployeeFormModal key={editing.dbId} employee={editing} onClose={() => setEditing(null)} />}
      {open && <EmployeeProfile e={open} onClose={() => setOpen(null)} onEdit={() => { setEditing(open); setOpen(null); }} />}
    </Panel>
  );
}