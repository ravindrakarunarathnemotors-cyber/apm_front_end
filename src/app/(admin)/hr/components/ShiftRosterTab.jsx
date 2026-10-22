"use client";

import { useMemo, useState } from "react";
import { Button, Col, FormSelect, Row } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { DEPARTMENTS, SHIFTS, addDays, fmtDate, iso, mondayOf, shiftFor, today } from "./hrData";
import { Avatar, Panel } from "./hrUi";

export default function ShiftRosterTab({ hr }) {
  const { employees, leaves } = hr;
  const [weekStart, setWeekStart] = useState(mondayOf(today()));
  const [dept, setDept] = useState("");

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayISO = iso(today());
  const rows = useMemo(
    () => employees.filter((e) => e.status !== "Resigned" && (!dept || e.department === dept)),
    [employees, dept]
  );

  return (
    <Panel title="Shift roster" icon="mdi:calendar-clock-outline">
      <Row className="g-2 mb-3 align-items-center">
        <Col xs={12} md="auto" className="d-flex align-items-center gap-2">
          <Button variant="outline-secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}><Icon icon="mdi:chevron-left" width="18" height="18" /></Button>
          <div className="fw-semibold text-center" style={{ minWidth: 190 }}>
            {fmtDate(iso(days[0]), { day: "2-digit", month: "short" })} - {fmtDate(iso(days[6]), { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}><Icon icon="mdi:chevron-right" width="18" height="18" /></Button>
          <Button variant="link" size="sm" onClick={() => setWeekStart(mondayOf(today()))}>This week</Button>
        </Col>
        <Col xs={12} md={3} className="ms-md-auto">
          <FormSelect value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.id}>{d.name}</option>)}
          </FormSelect>
        </Col>
      </Row>

      <div className="d-flex flex-wrap gap-3 mb-3 small">
        {Object.entries(SHIFTS).map(([k, s]) => (
          <span key={k} className="d-inline-flex align-items-center gap-1">
            <Icon icon={s.icon} width="16" height="16" color={s.color} /> <strong>{s.label}</strong> <span className="text-muted">{s.time}</span>
          </span>
        ))}
      </div>

      <div className="table-responsive border rounded">
        <table className="table align-middle mb-0" style={{ minWidth: 820 }}>
          <thead className="table-light">
            <tr>
              <th style={{ minWidth: 200, position: "sticky", left: 0, background: "var(--bs-table-bg, #f8f9fa)", zIndex: 1 }}>Employee</th>
              {days.map((d) => {
                const isT = iso(d) === todayISO;
                return (
                  <th key={iso(d)} className="text-center" style={isT ? { background: "color-mix(in srgb, #2563eb 10%, white)" } : undefined}>
                    <div>{d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                    <div className={`fw-normal small ${isT ? "text-primary fw-bold" : "text-muted"}`}>{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td style={{ position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={e.name} size={30} />
                    <div style={{ minWidth: 0 }}><div className="fw-semibold small text-truncate">{e.name}</div><small className="text-muted">{e.department}</small></div>
                  </div>
                </td>
                {days.map((d) => {
                  const s = SHIFTS[shiftFor(e, iso(d), leaves)];
                  return (
                    <td key={iso(d)} className="text-center p-1">
                      <span
                        className="d-inline-flex align-items-center justify-content-center gap-1 rounded-2 px-2 py-1 small fw-semibold"
                        style={{ color: s.color, backgroundColor: `color-mix(in srgb, ${s.color} 12%, white)`, minWidth: 82 }}
                      >
                        <Icon icon={s.icon} width="14" height="14" /> {s.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small text-muted mt-2">Sample pattern: morning and evening shifts alternate every week, Sunday is the weekly off.</div>
    </Panel>
  );
}