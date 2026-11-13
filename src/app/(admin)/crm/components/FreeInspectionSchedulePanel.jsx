"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetScheduledFreeInspectionsQuery } from "./freeInspectionApi";

// Job Dashboard panel: the free inspections the customers agreed to (Free Inspection Schedule stage, Mechanical and Wash).
// Only shows them (read only). Refreshes every minute.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayLabel = (iso) => {
  const t = new Date(); const today = ymd(t);
  const tm = new Date(t); tm.setDate(t.getDate() + 1);
  if (iso === today) return "Today";
  if (iso === ymd(tm)) return "Tomorrow";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};
const hm = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function FreeInspectionSchedulePanel() {
  const { data = [], isLoading, isError } = useGetScheduledFreeInspectionsQuery(60, { pollingInterval: 60000, refetchOnMountOrArgChange: true });
  const [open, setOpen] = useState(true);
  const groups = useMemo(() => {
    const m = new Map();
    data.forEach((x) => { if (!m.has(x.schedDate)) m.set(x.schedDate, []); m.get(x.schedDate).push(x); });
    return [...m.entries()];
  }, [data]);
  const todayCount = data.filter((x) => x.schedDate === ymd(new Date())).length;

  return (
    <Card className="border-0 mb-3" style={{ borderRadius: 16, boxShadow: "0 10px 30px -14px rgba(15,23,42,.35)", borderLeft: "5px solid #c8102e" }}>
      <style>{`
        .fis-row { display: flex; align-items: center; gap: 12px; padding: 8px 6px; border-bottom: 1px solid #f1f1f3; }
        .fis-row:last-child { border-bottom: 0; }
        .fis-time { min-width: 76px; font-weight: 800; color: #111; }
        .fis-reg { background: #facc15; border: 2px solid #111; border-radius: 6px; padding: 0 8px; font-weight: 800; letter-spacing: .06em; font-size: .85rem; white-space: nowrap; }
        .fis-day { font-weight: 800; font-size: .78rem; letter-spacing: .05em; text-transform: uppercase; color: #6b7280; margin: 10px 6px 2px; }
      `}</style>
      <button type="button" className="btn text-start d-flex align-items-center gap-2 px-3 py-3" style={{ border: 0 }} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon icon="mdi:calendar-check-outline" width="24" height="24" style={{ color: "#c8102e" }} />
        <span className="fw-bold">Scheduled Free Inspections</span>
        <Badge bg="dark" pill>{data.length}</Badge>
        {todayCount > 0 && <Badge bg="danger" pill>{todayCount} today</Badge>}
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" className="ms-auto" />
      </button>
      {open && (
        <Card.Body className="pt-0 px-3 pb-3">
          {isLoading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
          {isError && <div className="text-danger small">Could not load the scheduled free inspections.</div>}
          {!isLoading && !isError && data.length === 0 && <div className="text-muted small py-2">No free inspections scheduled.</div>}
          {groups.map(([day, rows]) => (
            <div key={day}>
              <div className="fis-day">{dayLabel(day)} · {rows.length}</div>
              {rows.map((x) => (
                <div key={x.jobId} className="fis-row">
                  <div className="fis-time">{hm(x.schedTime)}</div>
                  <span className="fis-reg">{x.regNo}</span>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold text-truncate">{x.customerName} <span className="text-muted fw-normal small">· {x.jobNo}</span></div>
                    <div className="small text-muted text-truncate">
                      {x.contactNumber && <a href={`tel:${String(x.contactNumber).replace(/[^\d+]/g, "")}`} className="text-decoration-none text-muted me-2"><Icon icon="mdi:phone-outline" width="14" height="14" /> {x.contactNumber}</a>}
                      Booked from {x.fromDepartment || "-"}
                    </div>
                  </div>
                  <Badge bg="light" text="dark" className="border">{x.scheduleDepartment || "-"}</Badge>
                </div>
              ))}
            </div>
          ))}
        </Card.Body>
      )}
    </Card>
  );
}