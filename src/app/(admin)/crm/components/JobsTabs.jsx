"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useGetDepartmentsQuery } from "@/store/features/apiSlice";
import { useGetJobsSummaryQuery } from "./jobsPageApi";
import { useGetScheduledFreeInspectionsQuery } from "./freeInspectionApi";

// Tab bar shared by the Jobs Dashboard (ALL) and every department page. Each tab is a link to that page.
// Each tab shows the number of jobs still in progress; the number blinks softly, and flashes when it changes.
// `match` = department.name in the database (used to count the jobs). ALL counts every job.
export const JOB_TABS = [
  { href: "/job-dashboard", label: "ALL", match: null, icon: "mdi:view-dashboard-outline", color: "#475569" },
  { href: "/mechanical", label: "Mechanical", match: "mechanical", icon: "mdi:engine-outline", color: "#2563eb" },
  { href: "/wash", label: "Wash", match: "wash", icon: "mdi:car-wash", color: "#0891b2" },
  { href: "/detailing", label: "Detailing", match: "detailing", icon: "mdi:auto-fix", color: "#7c3aed" },
  { href: "/accident-repair", label: "Accident Repairs", match: "accident repair", icon: "mdi:car-emergency", color: "#dc2626" },
  { href: "/tyre-center", label: "Tyre Center", match: "tyre center", icon: "mdi:tire", color: "#d97706" },
];
// Extra tab (not a department): the scheduled free inspections. Its number = how many are scheduled.
const FREE_TAB = { href: "/free-inspections", label: "Free Inspections", match: null, key: "fi", icon: "mdi:calendar-check-outline", color: "#c8102e" };

const SHORT = { "Accident Repairs": "Accident", "Tyre Center": "Tyre", "Free Inspections": "Free Insp." }; // shorter labels on a phone

const CSS = `
@keyframes jt-blink { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.55; transform:scale(1.12); } }
@keyframes jt-flash { 0% { transform:scale(1); } 30% { transform:scale(1.55); } 100% { transform:scale(1); } }
.jt-count { animation: jt-blink 1.6s ease-in-out infinite; }
.jt-count.jt-changed { animation: jt-flash .7s ease-out 2, jt-blink 1.6s ease-in-out .7s infinite; }
.jt-nav { -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-snap-type: x proximity; }
.jt-nav::-webkit-scrollbar { display: none; }
.jt-nav .nav-item { scroll-snap-align: start; }
.jt-link { font-size: 17px; padding: 12px 20px; border-radius: 12px; }
@media (max-width: 767.98px) {
  .jt-link { font-size: 13px; padding: 7px 10px; border-radius: 10px; gap: 5px !important; }
  .jt-link svg { width: 18px; height: 18px; }
  .jt-count { min-width: 22px !important; height: 22px !important; font-size: 12px !important; padding: 0 6px !important; }
}
@media (prefers-reduced-motion: reduce) { .jt-count, .jt-count.jt-changed { animation: none; } }
`;

function Count({ value, light }) {
  const prev = useRef(value);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setChanged(true);
      const t = setTimeout(() => setChanged(false), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [value]);
  return (
    <span
      className={`jt-count ${changed ? "jt-changed" : ""} d-inline-flex align-items-center justify-content-center rounded-pill fw-bold`}
      style={{
        minWidth: 26, height: 26, padding: "0 8px", fontSize: 14,
        backgroundColor: light ? "#fff" : "#dc2626", color: light ? "#111827" : "#fff",
        animationPlayState: value > 0 ? "running" : "paused",
      }}
      title={`${value} job${value === 1 ? "" : "s"} in progress`}
    >
      {value}
    </span>
  );
}

export default function JobsTabs() {
  const pathname = usePathname() || "";
  // counts only (GET /jobs/summary), refreshed every 30 seconds
  const { data: summary } = useGetJobsSummaryQuery(undefined, { pollingInterval: 30000 });

  // any other active department (added later in the department master) also gets its own tab, so no tab goes missing
  const { data: depts = [] } = useGetDepartmentsQuery();
  const tabs = useMemo(() => {
    const known = new Set(JOB_TABS.map((t) => t.match).filter(Boolean));
    const extra = (Array.isArray(depts) ? depts : [])
      .filter((d) => d?.name && !known.has(String(d.name).trim().toLowerCase()) && d.isActive !== false && d.is_active !== false)
      .map((d) => ({
        href: `/${String(d.name).trim().toLowerCase().replace(/\s+/g, "-")}`,
        label: d.name, match: String(d.name).trim().toLowerCase(), icon: "mdi:domain", color: "#0f766e",
      }));
    return [...JOB_TABS, ...extra, FREE_TAB];
  }, [depts]);

  const { data: freeList } = useGetScheduledFreeInspectionsQuery(60, { pollingInterval: 60000 });
  const freeCount = Array.isArray(freeList) ? freeList.length : 0;
  const counts = useMemo(() => {
    const deps = summary?.departments ?? [];
    return tabs.map((t) => (t.key === "fi" ? freeCount : t.match ? (deps.find((d) => (d.name || "").toLowerCase() === t.match)?.active ?? 0) : (summary?.active ?? 0)));
  }, [summary, tabs, freeCount]);

  return (
    <nav className="jt-nav mb-3" aria-label="Departments">
      <style>{CSS}</style>
      <ul className="nav nav-pills flex-wrap gap-2 pb-1 mb-0">
        {tabs.map((t, i) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li className="nav-item" key={t.href}>
              <Link
                href={t.href}
                className="jt-link nav-link d-inline-flex align-items-center gap-2 fw-semibold border shadow-sm"
                aria-current={active ? "page" : undefined}
                style={{
                  ...(active
                    ? { background: "linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%)", borderColor: "#000", color: "#fff", boxShadow: `inset 0 -4px 0 ${t.href === "/job-dashboard" ? "#c8102e" : t.color}` }
                    : { color: t.color, backgroundColor: "#fff" }),
                }}
              >
                <Icon icon={t.icon} width="24" height="24" />
                <span className="d-none d-md-inline">{t.label}</span>
                <span className="d-md-none">{SHORT[t.label] || t.label}</span>
                <Count value={counts[i]} light={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}