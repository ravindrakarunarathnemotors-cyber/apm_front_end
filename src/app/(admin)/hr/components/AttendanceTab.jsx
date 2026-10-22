"use client";

import { useMemo, useState } from "react";
import { Button, Col, FormControl, FormSelect, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { DEPARTMENTS, addDays, attendanceFor, fmtDate, iso, parseISO, today } from "./hrData";
import { Avatar, Empty, Panel, StatusBadge } from "./hrUi";

const SUMMARY = [
  { key: "Present", icon: "mdi:account-check-outline", color: "#059669" },
  { key: "Late", icon: "mdi:clock-alert-outline", color: "#d97706" },
  { key: "Absent", icon: "mdi:account-off-outline", color: "#dc2626" },
  { key: "On Leave", icon: "mdi:beach", color: "#7c3aed" },
];

export default function AttendanceTab({ hr }) {
  const { employees, leaves } = hr;
  const [date, setDate] = useState(iso(today()));
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");

  const all = useMemo(() => attendanceFor(date, employees, leaves), [date, employees, leaves]);
  const rows = all.filter((r) => (!dept || r.employee.department === dept) && (!status || r.status === status));
  const shift = (n) => setDate(iso(addDays(parseISO(date), n)));

  return (
    <Panel title="Attendance" icon="mdi:clock-check-outline">
      <Row className="g-2 mb-3 align-items-center">
        <Col xs={12} md="auto" className="d-flex align-items-center gap-2">
          <Button variant="outline-secondary" size="sm" onClick={() => shift(-1)}><Icon icon="mdi:chevron-left" width="18" height="18" /></Button>
          <FormControl type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ maxWidth: 170 }} />
          <Button variant="outline-secondary" size="sm" onClick={() => shift(1)}><Icon icon="mdi:chevron-right" width="18" height="18" /></Button>
          <Button variant="link" size="sm" onClick={() => setDate(iso(today()))}>Today</Button>
        </Col>
        <Col xs={6} md={3} className="ms-md-auto">
          <FormSelect value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.id}>{d.name}</option>)}
          </FormSelect>
        </Col>
        <Col xs={6} md={2}>
          <FormSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            {["Present", "Late", "Absent", "On Leave"].map((s) => <option key={s}>{s}</option>)}
          </FormSelect>
        </Col>
      </Row>

      <div className="text-muted small mb-2">{fmtDate(date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>

      <Row className="g-2 mb-3">
        {SUMMARY.map((s) => (
          <Col xs={6} md={3} key={s.key}>
            <div
              role="button"
              onClick={() => setStatus(status === s.key ? "" : s.key)}
              className="rounded-3 p-3 d-flex align-items-center gap-3 border"
              style={{ backgroundColor: status === s.key ? `color-mix(in srgb, ${s.color} 10%, white)` : "#fff", borderColor: status === s.key ? s.color : undefined }}
            >
              <Icon icon={s.icon} width="26" height="26" color={s.color} />
              <div><div className="fs-4 fw-bold lh-1">{all.filter((r) => r.status === s.key).length}</div><div className="small text-muted">{s.key}</div></div>
            </div>
          </Col>
        ))}
      </Row>

      {rows.length === 0 ? (
        <Empty text="No records" />
      ) : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light">
            <tr><th>Employee</th><th>Department</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map(({ employee: e, status: s, checkIn, checkOut, hours, note }) => (
              <tr key={e.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={e.name} size={32} />
                    <div><div className="fw-semibold">{e.name}</div><small className="text-muted">{e.id}</small></div>
                  </div>
                </td>
                <td className="small">{e.department}</td>
                <td className={s === "Late" ? "text-warning fw-semibold" : ""}>{checkIn || <span className="text-muted">-</span>}</td>
                <td>{checkOut || <span className="text-muted">{checkIn ? "Working" : "-"}</span>}</td>
                <td>{hours ? `${hours} h` : <span className="text-muted">-</span>}</td>
                <td><StatusBadge status={s} /> {note && <small className="text-muted ms-1">{note}</small>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="small text-muted mt-2">Sample data. Connect your attendance machine / API here.</div>
    </Panel>
  );
}