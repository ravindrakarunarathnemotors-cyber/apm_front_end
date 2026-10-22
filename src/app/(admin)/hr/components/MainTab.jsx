"use client";

import { useMemo } from "react";
import { Button, Col, ProgressBar, Row } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { APPRECIATION_BADGES, DEPARTMENTS, HOLIDAYS, addDays, attendanceFor, daysBetween, fmtDate, iso, leaveOn, today } from "./hrData";
import { Avatar, Empty, Panel, StatCard, StatusBadge } from "./hrUi";

// Main tab = the employee dashboard (overview of everything at a glance)
export default function MainTab({ hr, onNavigate }) {
  const { employees, leaves, setLeaves, appreciations } = hr;
  const todayISO = iso(today());
  const working = employees.filter((e) => e.status !== "Resigned");

  const todayRows = useMemo(() => attendanceFor(todayISO, employees, leaves), [todayISO, employees, leaves]);
  const count = (s) => todayRows.filter((r) => r.status === s).length;
  const present = count("Present") + count("Late");
  const isSunday = new Date().getDay() === 0;
  const rate = todayRows.length && !isSunday ? Math.round((present / (todayRows.length - count("On Leave"))) * 100) : 0;

  // last 7 days
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today(), i - 6);
        const rows = attendanceFor(iso(d), employees, leaves);
        const c = (s) => rows.filter((r) => r.status === s).length;
        return {
          label: d.toLocaleDateString("en-GB", { weekday: "short" }),
          date: d.getDate(),
          present: c("Present"),
          late: c("Late"),
          absent: c("Absent"),
          leave: c("On Leave"),
          off: d.getDay() === 0,
        };
      }),
    [employees, leaves]
  );
  const maxWeek = Math.max(1, ...week.map((d) => d.present + d.late + d.absent + d.leave));

  const pending = leaves.filter((l) => l.status === "Pending");
  const onLeaveToday = working.map((e) => ({ e, l: leaveOn(e.id, todayISO, leaves) })).filter((x) => x.l);
  const upcoming = HOLIDAYS.filter((h) => h.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const byDept = DEPARTMENTS.map((d) => ({ ...d, count: working.filter((e) => e.department === d.name).length }));
  const maxDept = Math.max(1, ...byDept.map((d) => d.count));
  const nameOf = (id) => employees.find((e) => e.id === id)?.name || id;
  const decide = (id, status) => setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));

  return (
    <>
      {/* KPI row */}
      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:account-group-outline" label="Total employees" value={working.length} sub={`${employees.filter((e) => e.status === "Probation").length} on probation`} color="#2563eb" />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:account-check-outline" label="Present today" value={isSunday ? "-" : present} sub={isSunday ? "Weekly off" : `${rate}% attendance · ${count("Late")} late`} color="#059669" />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:beach" label="On leave today" value={onLeaveToday.length} sub={`${count("Absent")} absent without leave`} color="#7c3aed" />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:clipboard-clock-outline" label="Pending leave requests" value={pending.length} sub="Waiting for approval" color="#d97706" />
        </Col>
      </Row>

      <Row className="g-3">
        {/* LEFT (8/12) */}
        <Col xl={8}>
          <Panel
            title="Attendance - last 7 days"
            icon="mdi:chart-bar"
            className="mb-3"
            action={
              <Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("attendance")}>
                View attendance
              </Button>
            }
          >
            <div className="d-flex align-items-end gap-2 gap-sm-3" style={{ height: 190 }}>
              {week.map((d, i) => {
                const total = d.present + d.late + d.absent + d.leave;
                const seg = (n, c) => ({ height: `${(n / maxWeek) * 100}%`, backgroundColor: c });
                return (
                  <div key={i} className="flex-fill d-flex flex-column align-items-center h-100 justify-content-end">
                    {d.off ? (
                      <div className="text-muted small mb-2">Off</div>
                    ) : (
                      <>
                        <div className="small fw-semibold mb-1">{d.present + d.late}</div>
                        <div className="w-100 d-flex flex-column justify-content-end rounded overflow-hidden" style={{ height: `${(total / maxWeek) * 100}%`, maxWidth: 44, margin: "0 auto" }}>
                          <div style={seg(d.absent, "#ef4444")} title={`Absent ${d.absent}`} />
                          <div style={seg(d.leave, "#8b5cf6")} title={`On leave ${d.leave}`} />
                          <div style={seg(d.late, "#f59e0b")} title={`Late ${d.late}`} />
                          <div style={seg(d.present, "#10b981")} title={`Present ${d.present}`} />
                        </div>
                      </>
                    )}
                    <div className="small text-muted mt-2 text-center lh-sm">
                      {d.label}
                      <div className="fw-semibold text-body">{d.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="d-flex flex-wrap gap-3 small text-muted mt-3">
              {[["Present", "#10b981"], ["Late", "#f59e0b"], ["On leave", "#8b5cf6"], ["Absent", "#ef4444"]].map(([l, c]) => (
                <span key={l} className="d-inline-flex align-items-center gap-1">
                  <span className="rounded-circle d-inline-block" style={{ width: 10, height: 10, backgroundColor: c }} /> {l}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Employees by department" icon="mdi:domain" action={<Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("departments")}>All departments</Button>}>
            <div className="d-flex flex-column gap-3">
              {byDept.map((d) => (
                <div key={d.id}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="d-inline-flex align-items-center gap-2 fw-semibold">
                      <Icon icon={d.icon} width="18" height="18" color={d.color} /> {d.name}
                    </span>
                    <span className="text-muted">{d.count}</span>
                  </div>
                  <ProgressBar now={(d.count / maxDept) * 100} style={{ height: 8, "--bs-progress-bar-bg": d.color }} />
                </div>
              ))}
            </div>
          </Panel>
        </Col>

        {/* RIGHT (4/12) */}
        <Col xl={4}>
          <Panel title="Pending leave requests" icon="mdi:clipboard-clock-outline" className="mb-3" action={<Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("leaves")}>View all</Button>}>
            {pending.length === 0 ? (
              <Empty text="No pending requests" icon="mdi:check-circle-outline" />
            ) : (
              <div className="d-flex flex-column gap-3">
                {pending.slice(0, 3).map((l) => (
                  <div key={l.id} className="d-flex align-items-center gap-2">
                    <Avatar name={nameOf(l.employeeId)} size={36} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold small text-truncate">{nameOf(l.employeeId)}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {l.type} · {fmtDate(l.from, { day: "2-digit", month: "short" })}
                        {l.days > 1 ? ` (${l.days} days)` : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="outline-success" className="px-2" title="Approve" onClick={() => decide(l.id, "Approved")}>
                      <Icon icon="mdi:check" width="16" height="16" />
                    </Button>
                    <Button size="sm" variant="outline-danger" className="px-2" title="Reject" onClick={() => decide(l.id, "Rejected")}>
                      <Icon icon="mdi:close" width="16" height="16" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Who is on leave today" icon="mdi:beach" className="mb-3">
            {onLeaveToday.length === 0 ? (
              <Empty text="Everyone is in today" icon="mdi:account-check-outline" />
            ) : (
              <div className="d-flex flex-column gap-2">
                {onLeaveToday.map(({ e, l }) => (
                  <div key={e.id} className="d-flex align-items-center gap-2">
                    <Avatar name={e.name} size={32} />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="small fw-semibold text-truncate">{e.name}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{e.department}</div>
                    </div>
                    <StatusBadge status="On Leave" />
                    <small className="text-muted text-nowrap">until {fmtDate(l.to, { day: "2-digit", month: "short" })}</small>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Upcoming holidays" icon="mdi:calendar-star" className="mb-3" action={<Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("holidays")}>View all</Button>}>
            <div className="d-flex flex-column gap-2">
              {upcoming.map((h) => {
                const d = new Date(h.date + "T00:00:00");
                const left = daysBetween(todayISO, h.date);
                return (
                  <div key={h.id} className="d-flex align-items-center gap-3">
                    <div className="text-center rounded-3 bg-primary-subtle text-primary flex-shrink-0" style={{ width: 48, padding: "4px 0" }}>
                      <div className="fw-bold lh-1 fs-5">{d.getDate()}</div>
                      <div className="text-uppercase" style={{ fontSize: "0.65rem" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</div>
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="small fw-semibold text-truncate">{h.name}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{left === 0 ? "Today" : left === 1 ? "Tomorrow" : `in ${left} days`}</div>
                    </div>
                  </div>
                );
              })}
              {upcoming.length === 0 && <Empty text="No upcoming holidays" />}
            </div>
          </Panel>

          <Panel title="Latest appreciation" icon="mdi:star-circle-outline" action={<Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("appreciation")}>View all</Button>}>
            <div className="d-flex flex-column gap-3">
              {appreciations.slice(0, 3).map((a) => {
                const b = APPRECIATION_BADGES[a.badge];
                return (
                  <div key={a.id} className="d-flex gap-2">
                    <Icon icon={b.icon} width="28" height="28" color={b.color} className="flex-shrink-0" />
                    <div style={{ minWidth: 0 }}>
                      <div className="small fw-semibold">{nameOf(a.to)} <span className="text-muted fw-normal">· {a.badge}</span></div>
                      <div className="small text-muted text-truncate-2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {a.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              {appreciations.length === 0 && <Empty text="No appreciation yet" />}
            </div>
          </Panel>
        </Col>
      </Row>
    </>
  );
}