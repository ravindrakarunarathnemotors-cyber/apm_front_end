"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Col, FormControl, FormSelect, InputGroup, Pagination, ProgressBar, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetJobsPageQuery, useGetJobsSummaryQuery } from "./jobsPageApi";
import JobActionsCell from "./JobActionsCell"; // stage buttons of the job's own department
import JobsTabs from "./JobsTabs";
import RepairTypeModal from "./RepairTypeModal";
import { usePermissions } from "./permissionsApi"; // action permissions (button shown only when allowed)
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

// minutes -> "1d 3h" / "4h 10m" / "12m"
const fmtMins = (mins) => {
  if (!Number.isFinite(mins) || mins < 0) return "-";
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${mins % 60}m` : `${mins}m`;
};
const minsSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 60000) : NaN);
// Sri Lankan numbers: 0771234567 -> 94771234567 (wa.me needs the country code, digits only)
const waNumber = (n) => {
  const d = String(n || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("94")) return d;
  return d.startsWith("0") ? `94${d.slice(1)}` : `94${d}`;
};

const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
// "today" | "upcoming" | "past" | "" (walk-in): used for the Appointment column and to tint the row
const apptState = (job) => {
  if (!job.appointmentDate) return "";
  const t = localToday();
  return job.appointmentDate === t ? "today" : job.appointmentDate > t ? "upcoming" : "past";
};
const apptRowClass = (j) => (apptState(j) === "upcoming" ? "da-up" : apptState(j) === "today" ? "da-today" : "");

/* ----------------------------- small components ----------------------------- */
function AppointmentCell({ job }) {
  const st = apptState(job);
  if (!st) return <span className="small text-muted">Walk-in</span>;
  const color = st === "today" ? "#c8102e" : st === "past" ? "#64748b" : "#15803d";
  const d = new Date(`${job.appointmentDate}T00:00:00`);
  const dateText = isNaN(d) ? job.appointmentDate : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div style={{ minWidth: 0 }}>
      <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold small text-nowrap"
        style={{ color, background: `color-mix(in srgb, ${color} 10%, white)`, border: `1px solid color-mix(in srgb, ${color} 35%, white)` }}>
        <Icon icon="mdi:calendar-check-outline" width="15" height="15" />
        {st === "today" ? "Today" : dateText}{job.appointmentTime ? ` · ${job.appointmentTime}` : ""}
      </span>
      {(job.salesOfficer || job.appointmentDepartmentName) && (
        <div className="small text-muted mt-1 lh-sm">
          {job.salesOfficer && <div><Icon icon="mdi:account-tie-outline" width="13" height="13" style={{ color: "#c8102e" }} /> {job.salesOfficer}</div>}
          {job.appointmentDepartmentName && <div><Icon icon="mdi:domain" width="13" height="13" style={{ color: "#c8102e" }} /> {job.appointmentDepartmentName}</div>}
        </div>
      )}
    </div>
  );
}

// One tap: call or WhatsApp the customer
function ContactButtons({ job, size = 40 }) {
  const tel = String(job.contactNumber || "").replace(/[^\d+]/g, "");
  if (!tel) return null;
  const stop = (e) => e.stopPropagation();
  const style = { width: size, height: size };
  return (
    <span className="d-inline-flex gap-1 flex-shrink-0">
      <a href={`tel:${tel}`} onClick={stop} className="da-contact da-call" style={style} title={`Call ${job.contactNumber}`} aria-label="Call customer">
        <Icon icon="mdi:phone" width="20" height="20" />
      </a>
      <a href={`https://wa.me/${waNumber(job.contactNumber)}`} target="_blank" rel="noopener noreferrer" onClick={stop} className="da-contact da-wa" style={style} title="WhatsApp" aria-label="WhatsApp customer">
        <Icon icon="mdi:whatsapp" width="20" height="20" />
      </a>
    </span>
  );
}

// "In stage 3h 10m"; turns red once the stage is open longer than overdueHours (set by the server, 24h)
function StageTime({ job, overdueHours }) {
  if (job.status !== "IN_PROGRESS" || !job.stageStartedAt) return null;
  const mins = minsSince(job.stageStartedAt);
  if (!Number.isFinite(mins) || mins < 0) return null;
  const late = mins >= (overdueHours || 24) * 60;
  return late ? (
    <span className="da-stuck d-inline-flex align-items-center gap-1" title="This stage has been open for a long time">
      <Icon icon="mdi:alert-circle" width="14" height="14" /> Overdue · {fmtMins(mins)}
    </span>
  ) : (
    <span className="small text-muted d-inline-flex align-items-center gap-1"><Icon icon="mdi:timer-sand" width="14" height="14" /> in stage {fmtMins(mins)}</span>
  );
}

function Kpi({ icon, label, value, color, active, onClick }) {
  return (
    <Card
      className="h-100 border-0 da-kpi"
      role="button"
      onClick={onClick}
      style={{ cursor: "pointer", borderRadius: 14, borderLeft: `5px solid ${color}`, boxShadow: active ? `0 0 0 2px ${color}, 0 10px 24px -12px ${color}` : "0 4px 14px -8px rgba(15,23,42,.35)", background: active ? `color-mix(in srgb, ${color} 6%, white)` : "#fff" }}
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
    <Card className="h-100 border-0" style={{ borderRadius: 14, borderTop: `4px solid ${ui.color}`, boxShadow: selected ? `0 0 0 2px ${ui.color}, 0 10px 24px -12px ${ui.color}` : "0 4px 14px -8px rgba(15,23,42,.35)" }}>
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
        <ProgressBar now={avg} style={{ height: 6 }} className="da-bar" />

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
function StageCell({ job, overdueHours }) {
  const done = job.status === "COMPLETED", cancelled = job.status === "CANCELLED";
  const live = !done && !cancelled;
  const color = done ? "#16a34a" : cancelled ? "#64748b" : getDepartmentUi(job.departmentName).color;
  const icon = done ? "mdi:check-circle" : cancelled ? "mdi:close-circle" : "mdi:progress-clock";
  const name = done ? "Completed" : cancelled ? "Cancelled" : (job.stageName ?? "-");
  return (
    <div className="da-stage" style={{ minWidth: 0, maxWidth: "100%" }}>
      {/* 1. the stage name (wraps inside its own box, never pushes the other lines around) */}
      <div className="d-flex align-items-start gap-2 rounded-3 px-2 py-1 fw-semibold small lh-sm" style={{ color, background: tintOf(color, 11), border: `1px solid ${tintOf(color, 28)}` }}>
        <Icon icon={icon} width="16" height="16" className="flex-shrink-0 mt-1" />
        <span className="text-break">{name}</span>
      </div>
      {/* 2. small facts, one per line so they always line up */}
      {live && (
        <div className="d-flex flex-column gap-1 mt-1 align-items-start">
          <span className="small text-muted">Stage {job.stageNo}</span>
          <StageTime job={job} overdueHours={overdueHours} />
        </div>
      )}
      {job.activationEnabled && (job.activatedAt ? (
        <span className="d-inline-flex align-items-center gap-1 small fw-semibold rounded-pill px-2 mt-1" title={new Date(job.activatedAt).toLocaleString()} style={{ color: "#15803d", background: "#dcfce7" }}>
          <Icon icon="mdi:rocket-launch" width="14" height="14" /> Job activated
        </span>
      ) : live ? (
        <span className="d-inline-flex align-items-center gap-1 small rounded-pill px-2 mt-1" style={{ color: "#92400e", background: "#fef3c7" }}>
          <Icon icon="mdi:rocket-launch-outline" width="14" height="14" /> Not activated
        </span>
      ) : null)}
    </div>
  );
}

/* ----------------------------- dashboard ----------------------------- */
// Overview of every department in one page. Counts: GET /jobs/summary. Table: GET /jobs/page (one page at a time).
export default function AllDepartmentsDashboard() {
  const router = useRouter();
  const [dept, setDept] = useState("ALL");     // department filter ("ALL" or a department name)
  const [status, setStatus] = useState("ALL"); // ALL | IN_PROGRESS | COMPLETED | CANCELLED | TODAY
  const [appointment, setAppointment] = useState(""); // "" | ANY | TODAY | UPCOMING | PAST | NONE
  const [overdue, setOverdue] = useState(false);       // only jobs whose current stage is open too long
  const [showFilters, setShowFilters] = useState(false); // phone: the filter selects are hidden behind the Filters button
  const [, setTick] = useState(0);                       // re-renders "updated 2 min ago"
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const { can } = usePermissions();
  const [showRepairTypes, setShowRepairTypes] = useState(false);
  const [showDepts, setShowDepts] = useState(false); // department cards: closed by default, open with the arrow
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [dept, status, appointment, overdue, debouncedQ, pageSize]);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  // Counts (KPIs, department cards) come from GET /jobs/summary; the table loads ONE page at a time from GET /jobs/page
  const { data: summary, isLoading, isError: summaryError, refetch: refetchSummary } = useGetJobsSummaryQuery(undefined, { pollingInterval: 30000 });
  const { data: pageData, isFetching, isError: pageError, refetch: refetchPage, fulfilledTimeStamp } = useGetJobsPageQuery(
    { page, pageSize, search: debouncedQ, department: dept === "ALL" ? "" : dept === NONE ? "__none__" : dept, status: status === "ALL" ? "" : status, appointment, overdue: overdue ? "1" : "" },
    { pollingInterval: 30000 }
  );
  const isError = summaryError || pageError;
  const refetch = () => { refetchSummary(); refetchPage(); };

  const loadingFirst = !pageData && isFetching;             // first load: show skeletons instead of an empty table
  const overdueHours = pageData?.overdueHours ?? summary?.overdueHours ?? 24;
  const ownJobsOnly = pageData?.scope === "own";             // a consultant sees only his / her own jobs
  const updatedText = fulfilledTimeStamp ? (Date.now() - fulfilledTimeStamp < 60000 ? "just now" : `${fmtMins(Math.floor((Date.now() - fulfilledTimeStamp) / 60000))} ago`) : "";
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

  const kpi = { total: summary?.total ?? 0, active: summary?.active ?? 0, done: summary?.done ?? 0, today: summary?.today ?? 0, noDept: summary?.noDept ?? 0, overdue: summary?.overdue ?? 0 };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const firstShown = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastShown = Math.min(current * pageSize, total);
  const pageNumbers = useMemo(() => {
    const out = [];
    for (let n = 1; n <= pageCount; n++) if (n === 1 || n === pageCount || Math.abs(n - current) <= 1) out.push(n);
    return out;
  }, [pageCount, current]);

  const reset = () => { setDept("ALL"); setStatus("ALL"); setAppointment(""); setOverdue(false); setQ(""); };
  const activeFilters = (dept !== "ALL" ? 1 : 0) + (status !== "ALL" ? 1 : 0) + (appointment ? 1 : 0) + (overdue ? 1 : 0);
  // quick tabs: one tap sets the filters
  const quick = [
    { key: "all", label: "All", icon: "mdi:format-list-bulleted", on: status === "ALL" && !appointment && !overdue, go: () => { setStatus("ALL"); setAppointment(""); setOverdue(false); } },
    { key: "live", label: "In progress", icon: "mdi:progress-wrench", count: kpi.active, on: status === "IN_PROGRESS" && !appointment && !overdue, go: () => { setStatus("IN_PROGRESS"); setAppointment(""); setOverdue(false); } },
    { key: "late", label: "Overdue", icon: "mdi:alert-circle-outline", count: kpi.overdue, danger: true, on: overdue, go: () => { setStatus("ALL"); setAppointment(""); setOverdue(true); } },
    { key: "appt", label: "Appointment today", icon: "mdi:calendar-check-outline", on: appointment === "TODAY" && !overdue, go: () => { setStatus("ALL"); setAppointment("TODAY"); setOverdue(false); } },
    { key: "walk", label: "Walk-in", icon: "mdi:walk", on: appointment === "NONE" && !overdue, go: () => { setStatus("ALL"); setAppointment("NONE"); setOverdue(false); } },
  ];

  return (
    <>
      <style>{`
        .da-kpi-icon { width: 48px; height: 48px; }
        .da-kpi-value { font-size: 1.75rem; }
        .da-title { font-size: 1.5rem; }
        .da-bar .progress-bar { background: linear-gradient(90deg,#c8102e,#111); }
        .da-filters .form-control, .da-filters .form-select { min-height: 46px; border-radius: 12px; border: 1.5px solid #c4c4ca; background-color: #fff; }
        .da-filters .form-control:focus, .da-filters .form-select:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .da-filters .input-group-text { min-height: 46px; border: 1.5px solid #c4c4ca; border-right: 0; border-radius: 12px 0 0 12px; background: #fde8ea; color: #c8102e; }
        .da-filters .input-group .form-control { border-left: 0; border-radius: 0 12px 12px 0; }
        .da-btn-dark { color: #fff !important; border: 0 !important; border-radius: 10px; font-weight: 600; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e; }
        .da-btn-dark:hover { filter: brightness(1.25); }
        .da-table { border-collapse: separate; border-spacing: 0; }
        .da-table { width: 100%; font-size: .86rem; table-layout: fixed; }
        .da-table td { overflow-wrap: anywhere; }
        .da-table td:last-child > div { flex-wrap: wrap; }   /* action buttons wrap instead of overflowing */
        .da-table tbody td { vertical-align: top !important; }
        .da-table thead th { background: #111; color: #fff; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; padding: 11px 8px; border: 0; white-space: nowrap; }
        .da-table thead th:first-child { box-shadow: inset 4px 0 0 #c8102e; }
        .da-table tbody td { padding: 10px 8px; border-bottom: 1px solid #ececef; vertical-align: middle; background: #fff; }
        .da-table tbody tr:nth-child(even) td { background: #fafafb; }
        .da-table tbody tr:hover td { background: #fff1f2; }
        .da-table tbody tr.da-up td { background: #ecfdf3; }
        .da-table tbody tr.da-up td:first-child { box-shadow: inset 5px 0 0 #16a34a; }
        .da-table tbody tr.da-up:hover td { background: #d1fae5; }
        .da-table tbody tr.da-today td { background: #fff1f2; }
        .da-table tbody tr.da-today td:first-child { box-shadow: inset 5px 0 0 #c8102e; }
        .da-table tbody tr.da-today:hover td { background: #ffe0e4; }
        .da-m-card.da-up { background: #ecfdf3 !important; border-left-color: #16a34a !important; }
        .da-m-card.da-today { background: #fff1f2 !important; }
        .da-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 4px 10px; font-weight: 700; font-size: .82rem; box-shadow: inset 3px 0 0 #c8102e; }
        .da-plate { display: inline-flex; background: #facc15; color: #111; border: 1.5px solid #111; border-radius: 6px; padding: 1px 8px; font-weight: 800; font-size: .78rem; letter-spacing: .05em; white-space: nowrap; }
        .da-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#111,#c8102e); color: #fff; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .da-m-card { border: 1px solid #e3e3e6 !important; border-left: 4px solid #c8102e !important; border-radius: 12px !important; }
        .da-page .pagination .page-item.active .page-link { background: #c8102e; border-color: #c8102e; color: #fff; }
        .da-page .pagination .page-link { color: #111; }
        .da-contact { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff !important; text-decoration: none; }
        .da-call { background: #111; box-shadow: inset 0 -2px 0 #c8102e; }
        .da-wa { background: #16a34a; }
        .da-stuck { color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; border-radius: 999px; padding: 0 8px; font-size: .75rem; font-weight: 700; }
        .da-chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 10px; scrollbar-width: none; }
        .da-chips::-webkit-scrollbar { display: none; }
        .da-chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1.5px solid #c4c4ca; background: #fff; color: #111; font-weight: 600; font-size: .85rem; white-space: nowrap; }
        .da-chip.on { background: #111; color: #fff; border-color: #111; box-shadow: inset 0 -3px 0 #c8102e; }
        .da-chip.danger:not(.on) { color: #b91c1c; border-color: #fecaca; background: #fff5f5; }
        .da-chip .da-n { background: #c8102e; color: #fff; border-radius: 999px; padding: 0 7px; font-size: .72rem; line-height: 18px; }
        .da-skel { position: relative; overflow: hidden; background: #ececef; border-radius: 8px; }
        .da-skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.7), transparent); animation: da-shimmer 1.2s infinite; }
        @keyframes da-shimmer { 100% { transform: translateX(100%); } }
        .da-sticky { background: #fff; }
        @media (max-width: 767.98px) {
          .da-sticky { position: sticky; top: 0; z-index: 6; padding: 8px 0; margin-top: -8px; box-shadow: 0 6px 10px -8px rgba(15,23,42,.35); }
          .da-m-card .btn, .da-m-card .dropdown-toggle { min-height: 44px; font-weight: 600; }
          .da-filter-btn { min-height: 46px; border-radius: 12px; white-space: nowrap; }
          .da-kpi-icon { width: 36px; height: 36px; }
          .da-kpi-value { font-size: 1.35rem; }
          .da-title { font-size: 1.2rem; }
          .da-kpi-icon svg { width: 20px; height: 20px; }
          .da-count { text-align: left !important; }
          .da-footer { justify-content: center !important; }
        }
      `}</style>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 px-3 px-md-4 py-3 text-white" style={{ background: "linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%)", borderRadius: 16, boxShadow: "0 10px 26px -12px rgba(200,16,46,.55)" }}>
        <div className="d-flex align-items-center gap-3">
          <Icon icon="mdi:view-dashboard-outline" width="34" height="34" />
          <div>
            <h4 className="da-title mb-0 text-white">Jobs Dashboard</h4>
            <small style={{ color: "rgba(255,255,255,.75)" }}>{ownJobsOnly ? "Your jobs" : "All departments"} · refreshes every 30 seconds{updatedText ? ` · updated ${updatedText}` : ""}</small>
          </div>
        </div>
        <div className="d-flex gap-2">
          {can("repairtype.manage") && (
            <Button size="sm" className="da-btn-dark d-inline-flex align-items-center gap-1 px-3" style={{ minHeight: 40 }} onClick={() => setShowRepairTypes(true)}>
              <Icon icon="mdi:wrench-cog-outline" width="18" height="18" /> Repair Type
            </Button>
          )}
          <Button variant="light" size="sm" className="d-inline-flex align-items-center gap-1 px-3 fw-semibold border-0" style={{ minHeight: 40, borderRadius: 10 }} onClick={refetch} disabled={isFetching}>
            {isFetching ? <Spinner size="sm" /> : <Icon icon="mdi:refresh" width="18" height="18" />} <span className="d-none d-sm-inline">Refresh</span>
          </Button>
        </div>
      </div>

      {showRepairTypes && can("repairtype.manage") && <RepairTypeModal onHide={() => setShowRepairTypes(false)} />}

      <JobsTabs />

      {isError && <div className="alert alert-danger py-2">Could not load the jobs. <Button size="sm" variant="link" onClick={refetch}>Try again</Button></div>}

      {/* KPI row (click to filter the table) */}
      <Row className="g-2 g-md-3 mb-3">
        <Col xs={6} md={3}><Kpi icon="mdi:clipboard-list-outline" label="All jobs" value={kpi.total} color="#111111" active={status === "ALL"} onClick={() => setStatus("ALL")} /></Col>
        <Col xs={6} md={3}><Kpi icon="mdi:progress-wrench" label="In progress" value={kpi.active} color="#c8102e" active={status === "IN_PROGRESS"} onClick={() => setStatus("IN_PROGRESS")} /></Col>
        <Col xs={6} md={3}><Kpi icon="mdi:check-circle-outline" label="Completed" value={kpi.done} color="#16a34a" active={status === "COMPLETED"} onClick={() => setStatus("COMPLETED")} /></Col>
        <Col xs={6} md={3}><Kpi icon="mdi:calendar-today" label="Created today" value={kpi.today} color="#d97706" active={status === "TODAY"} onClick={() => setStatus("TODAY")} /></Col>
      </Row>

      {/* One card per department (closed by default) */}
      <button
        type="button"
        className="btn da-btn-dark w-100 d-flex align-items-center gap-2 mb-3 text-start px-3"
        style={{ minHeight: 48 }}
        aria-expanded={showDepts}
        onClick={() => setShowDepts((v) => !v)}
      >
        <Icon icon="mdi:domain" width="20" height="20" />
        <span className="fw-semibold">Departments overview</span>
        <span className="small" style={{ color: "rgba(255,255,255,.7)" }}>{deptNames.length} departments</span>
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
      <Card className="border-0 da-page" style={{ borderRadius: 16, boxShadow: "0 10px 30px -14px rgba(15,23,42,.35)" }}>
        <Card.Body className="p-2 p-md-3 da-filters">
          {/* quick tabs: one tap sets the filters (swipe sideways on a phone) */}
          <div className="da-chips" role="tablist" aria-label="Quick filters">
            {quick.map((c) => (
              <button key={c.key} type="button" role="tab" aria-selected={c.on} className={`da-chip ${c.on ? "on" : ""} ${c.danger ? "danger" : ""}`} onClick={c.go}>
                <Icon icon={c.icon} width="18" height="18" /> {c.label}
                {c.count > 0 && <span className="da-n">{c.count}</span>}
              </button>
            ))}
          </div>
          <Row className="g-2 align-items-center mb-3">
            <Col xs={12} md={3}>
              <div className="da-sticky d-flex gap-2">
                <InputGroup>
                  <InputGroup.Text><Icon icon="mdi:magnify" width="18" height="18" /></InputGroup.Text>
                  <FormControl placeholder="Search job no, customer, vehicle, consultant, team, bay…" value={q} onChange={(e) => setQ(e.target.value)} />
                </InputGroup>
                <Button variant={showFilters || activeFilters ? "dark" : "outline-dark"} className="d-md-none da-filter-btn d-inline-flex align-items-center gap-1" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
                  <Icon icon="mdi:filter-variant" width="20" height="20" />
                  {activeFilters > 0 && <span className="da-n" style={{ background: "#c8102e", color: "#fff", borderRadius: 999, padding: "0 7px", fontSize: ".72rem" }}>{activeFilters}</span>}
                </Button>
              </div>
            </Col>
            <Col xs={6} md={2} className={showFilters ? "" : "d-none d-md-block"}>
              <FormSelect value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
                <option value="ALL">All departments</option>
                {deptNames.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value={NONE}>No department yet ({kpi.noDept})</option>
              </FormSelect>
            </Col>
            <Col xs={6} md={2} className={showFilters ? "" : "d-none d-md-block"}>
              <FormSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
                <option value="ALL">Any status</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="TODAY">Created today</option>
              </FormSelect>
            </Col>
            <Col xs={12} md={3} className={showFilters ? "" : "d-none d-md-block"}>
              <FormSelect value={appointment} onChange={(e) => setAppointment(e.target.value)} aria-label="Appointments" style={appointment ? { borderColor: "#c8102e", fontWeight: 600 } : undefined}>
                <option value="">Appointments: all jobs</option>
                <option value="ANY">With appointment</option>
                <option value="TODAY">Appointment today</option>
                <option value="UPCOMING">Upcoming appointments</option>
                <option value="PAST">Past appointments</option>
                <option value="NONE">Walk-in (no appointment)</option>
              </FormSelect>
            </Col>
            <Col xs={12} md={2} className="da-count text-md-end">
              <span className="text-muted small me-2">{total} job{total === 1 ? "" : "s"}</span>
              {(dept !== "ALL" || status !== "ALL" || appointment || overdue || q) && <Button size="sm" variant="link" onClick={reset}>Clear</Button>}
            </Col>
          </Row>

          {/* Desktop table */}
          <div className="d-none d-xl-block">
            <Table align="middle" className="mb-0 da-table">
              <thead>
                <tr><th style={{ width: 104 }}>Job</th><th style={{ width: "20%" }}>Customer / Vehicle</th><th style={{ width: "21%" }}>Department &amp; Stage</th><th style={{ width: "14%" }}>Appointment</th><th style={{ width: "14%" }}>Assigned to</th><th className="text-end">Action</th></tr>
              </thead>
              <tbody>
                {loadingFirst && [0, 1, 2, 3, 4, 5].map((n) => (
                  <tr key={`sk${n}`}>{[70, 150, 160, 100, 110, 110].map((w, i) => <td key={i}><div className="da-skel" style={{ height: 16, width: w, maxWidth: "100%" }} /></td>)}</tr>
                ))}
                {!loadingFirst && rows.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No jobs match the filters</td></tr>}
                {!loadingFirst && pageRows.map((j) => (
                  <tr key={j.id} className={apptRowClass(j)}>
                    <td>
                      <span className="da-jobno">{j.jobNo}</span>
                      <div><small className="text-muted">{j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "-"}</small></div>
                      {j.updatedAt && <div><small className="text-muted" title="Last updated">upd. {ago(j.updatedAt)} ago</small></div>}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="da-avatar">{(j.customerName || "?").trim().charAt(0).toUpperCase()}</span>
                        <div className="lh-sm flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="fw-bold text-break" style={{ color: "#0f172a" }}>{j.customerName}</div>
                          {j.regNo ? <span className="da-plate mt-1">{j.regNo}</span> : <small className="text-muted">-</small>}
                        </div>
                        <ContactButtons job={j} size={32} />
                      </div>
                    </td>
                    <td>
                      <div className="mb-2"><DeptBadge name={j.departmentName} /></div>
                      <StageCell job={j} overdueHours={overdueHours} />
                    </td>
                    <td><AppointmentCell job={j} /></td>
                    <td className="small lh-sm">
                      <div className="d-flex align-items-start gap-1"><Icon icon="mdi:account-tie-outline" width="15" height="15" className="text-muted mt-1 flex-shrink-0" /><span className="text-break">{j.consultantName || "-"}</span></div>
                      {(j.teamName || j.bayName) && (
                        <div className="d-flex align-items-start gap-1 mt-1 text-muted"><Icon icon="mdi:account-group-outline" width="15" height="15" className="mt-1 flex-shrink-0" /><span className="text-break">{[j.teamName, j.bayName].filter(Boolean).join(" · ")}</span></div>
                      )}
                    </td>
                    <td className="text-end"><JobActionsCell job={j} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Mobile / tablet cards: job no + plate + stage + time in stage, one tap to call / WhatsApp, one main action button */}
          <div className="d-xl-none d-flex flex-column gap-2">
            {loadingFirst && [0, 1, 2].map((n) => (
              <Card key={`msk${n}`} className="da-m-card"><Card.Body className="d-flex flex-column gap-2">
                <div className="da-skel" style={{ height: 20, width: "55%" }} />
                <div className="da-skel" style={{ height: 16, width: "75%" }} />
                <div className="da-skel" style={{ height: 28, width: "40%" }} />
                <div className="da-skel" style={{ height: 44, width: "100%" }} />
              </Card.Body></Card>
            ))}
            {!loadingFirst && rows.length === 0 && <div className="text-center text-muted py-4">No jobs match the filters</div>}
            {!loadingFirst && pageRows.map((j) => (
              <Card key={j.id} className={`da-m-card ${apptRowClass(j)}`}>
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="da-jobno">{j.jobNo}</span>
                      {j.regNo && <span className="da-plate">{j.regNo}</span>}
                    </div>
                    <Badge bg={(STATUS[j.status] || STATUS.IN_PROGRESS).bg}>{(STATUS[j.status] || {}).label || j.status}</Badge>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-2 mt-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-bold text-truncate" style={{ color: "#0f172a" }}>{j.customerName}</div>
                      <small className="text-muted">{[j.teamName, j.bayName].filter(Boolean).join(" · ") || j.consultantName}</small>
                    </div>
                    <ContactButtons job={j} size={44} />
                  </div>
                  {j.appointmentDate && <div className="mt-2"><AppointmentCell job={j} /></div>}
                  <div className="my-2 d-flex flex-wrap align-items-center gap-2"><DeptBadge name={j.departmentName} /></div>
                  <StageCell job={j} overdueHours={overdueHours} />
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