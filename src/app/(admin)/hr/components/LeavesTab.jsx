"use client";

import { useMemo, useState } from "react";
import { Button, Col, FormSelect, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { LEAVE_TYPES, fmtDate } from "./hrData";
import { Avatar, Empty, Panel, StatusBadge } from "./hrUi";

const CHIPS = [
  { key: "", label: "All", color: "#475569" },
  { key: "Pending", label: "Pending", color: "#d97706" },
  { key: "Approved", label: "Approved", color: "#059669" },
  { key: "Rejected", label: "Rejected", color: "#dc2626" },
];

export default function LeavesTab({ hr }) {
  const { employees, leaves, setLeaves } = hr;
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const nameOf = (id) => employees.find((e) => e.id === id)?.name || id;
  const deptOf = (id) => employees.find((e) => e.id === id)?.department || "";

  const rows = useMemo(
    () => leaves.filter((l) => (!status || l.status === status) && (!type || l.type === type)).sort((a, b) => b.from.localeCompare(a.from)),
    [leaves, status, type]
  );
  const decide = (id, s) => setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status: s } : l)));

  return (
    <Panel title="Leave requests" icon="mdi:beach">
      <Row className="g-2 mb-3 align-items-center">
        <Col xs={12} md>
          <div className="d-flex flex-wrap gap-2">
            {CHIPS.map((c) => {
              const n = c.key ? leaves.filter((l) => l.status === c.key).length : leaves.length;
              const active = status === c.key;
              return (
                <Button
                  key={c.label}
                  size="sm"
                  variant="light"
                  className="rounded-pill border fw-semibold"
                  style={active ? { backgroundColor: c.color, color: "#fff", borderColor: c.color } : { color: c.color }}
                  onClick={() => setStatus(c.key)}
                >
                  {c.label} <span className="opacity-75">{n}</span>
                </Button>
              );
            })}
          </div>
        </Col>
        <Col xs={12} md={3}>
          <FormSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All leave types</option>
            {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </FormSelect>
        </Col>
      </Row>

      {rows.length === 0 ? (
        <Empty text="No leave requests" />
      ) : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light">
            <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th className="text-end">Action</th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={nameOf(l.employeeId)} size={32} />
                    <div><div className="fw-semibold">{nameOf(l.employeeId)}</div><small className="text-muted">{deptOf(l.employeeId)}</small></div>
                  </div>
                </td>
                <td>{l.type}</td>
                <td className="small text-nowrap">
                  {fmtDate(l.from, { day: "2-digit", month: "short" })}
                  {l.to !== l.from && ` - ${fmtDate(l.to, { day: "2-digit", month: "short" })}`}
                </td>
                <td>{l.days}</td>
                <td className="small text-muted" style={{ maxWidth: 220 }}>{l.reason}</td>
                <td><StatusBadge status={l.status} /></td>
                <td className="text-end text-nowrap">
                  {l.status === "Pending" ? (
                    <>
                      <Button size="sm" variant="success" className="me-1" onClick={() => decide(l.id, "Approved")}><Icon icon="mdi:check" width="16" height="16" /> Approve</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => decide(l.id, "Rejected")}><Icon icon="mdi:close" width="16" height="16" /> Reject</Button>
                    </>
                  ) : (
                    <span className="text-muted small">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}