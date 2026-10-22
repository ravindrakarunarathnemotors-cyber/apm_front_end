"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Col, Row } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { HOLIDAYS, daysBetween, iso, today } from "./hrData";
import { Empty, Panel } from "./hrUi";

const TYPE_STYLE = {
  Public: { bg: "primary", icon: "mdi:flag-outline" },
  Poya: { bg: "warning", icon: "mdi:moon-full" },
  Company: { bg: "success", icon: "mdi:office-building-outline" },
};

export default function HolidaysTab() {
  const [type, setType] = useState("");
  const todayISO = iso(today());

  const groups = useMemo(() => {
    const list = HOLIDAYS.filter((h) => !type || h.type === type).sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map();
    list.forEach((h) => {
      const key = h.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });
    return [...map.entries()];
  }, [type]);

  const next = HOLIDAYS.filter((h) => h.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <Row className="g-3">
      <Col xl={4} className="order-xl-2">
        <Panel title="Next holiday" icon="mdi:calendar-star">
          {next ? (
            <div className="text-center py-2">
              <div className="display-4 fw-bold text-primary lh-1">{new Date(next.date + "T00:00:00").getDate()}</div>
              <div className="text-uppercase text-muted">{new Date(next.date + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
              <h5 className="mt-3 mb-1">{next.name}</h5>
              <Badge bg={TYPE_STYLE[next.type].bg} text={next.type === "Poya" ? "dark" : undefined}>{next.type}</Badge>
              <div className="mt-2 text-muted">{daysBetween(todayISO, next.date) === 0 ? "Today" : `in ${daysBetween(todayISO, next.date)} days`}</div>
            </div>
          ) : (
            <Empty text="No upcoming holidays" />
          )}
        </Panel>
      </Col>

      <Col xl={8} className="order-xl-1">
        <Panel
          title="Holiday calendar"
          icon="mdi:calendar-month-outline"
          action={
            <div className="d-flex gap-1 flex-wrap">
              {["", "Public", "Poya", "Company"].map((t) => (
                <Button key={t} size="sm" variant={type === t ? "primary" : "outline-secondary"} className="rounded-pill" onClick={() => setType(t)}>{t || "All"}</Button>
              ))}
            </div>
          }
        >
          {groups.length === 0 && <Empty text="No holidays" />}
          {groups.map(([month, list]) => (
            <div key={month} className="mb-3">
              <div className="text-uppercase small fw-bold text-muted mb-2">
                {new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
              <div className="d-flex flex-column gap-2">
                {list.map((h) => {
                  const d = new Date(h.date + "T00:00:00");
                  const past = h.date < todayISO;
                  const left = daysBetween(todayISO, h.date);
                  const st = TYPE_STYLE[h.type];
                  return (
                    <div key={h.id} className="d-flex align-items-center gap-3 border rounded-3 p-2 px-3" style={past ? { opacity: 0.55 } : undefined}>
                      <div className="text-center rounded-3 bg-primary-subtle text-primary flex-shrink-0" style={{ width: 52, padding: "4px 0" }}>
                        <div className="fw-bold lh-1 fs-5">{d.getDate()}</div>
                        <div className="text-uppercase" style={{ fontSize: "0.65rem" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</div>
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-truncate">{h.name}</div>
                        <div className="small text-muted">{d.toLocaleDateString("en-GB", { weekday: "long" })}</div>
                      </div>
                      <Badge bg={st.bg} text={h.type === "Poya" ? "dark" : undefined} className="d-inline-flex align-items-center gap-1">
                        <Icon icon={st.icon} width="14" height="14" /> {h.type}
                      </Badge>
                      <div className="small text-muted text-end d-none d-sm-block" style={{ minWidth: 80 }}>
                        {past ? "Passed" : left === 0 ? "Today" : left === 1 ? "Tomorrow" : `in ${left} days`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="small text-muted">Sample holiday list. Replace it with your company calendar.</div>
        </Panel>
      </Col>
    </Row>
  );
}