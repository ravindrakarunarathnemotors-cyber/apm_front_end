"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useGetDepartmentsQuery, useGetJobsQuery } from "@/store/features/apiSlice";

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

const CSS = `
@keyframes jt-blink { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.55; transform:scale(1.12); } }
@keyframes jt-flash { 0% { transform:scale(1); } 30% { transform:scale(1.55); } 100% { transform:scale(1); } }
.jt-count { animation: jt-blink 1.6s ease-in-out infinite; }
.jt-count.jt-changed { animation: jt-flash .7s ease-out 2, jt-blink 1.6s ease-in-out .7s infinite; }
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
  // same list the dashboards use; refreshed every 30 seconds
  const { data: jobs = [] } = useGetJobsQuery(undefined, { pollingInterval: 30000 });

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
    return [...JOB_TABS, ...extra];
  }, [depts]);

  const counts = useMemo(() => {
    const open = jobs.filter((j) => j.status === "IN_PROGRESS");
    return tabs.map((t) => (t.match ? open.filter((j) => (j.departmentName || "").toLowerCase() === t.match).length : open.length));
  }, [jobs, tabs]);

  return (
    <nav className="mb-3 overflow-auto" aria-label="Departments">
      <style>{CSS}</style>
      <ul className="nav nav-pills flex-nowrap gap-2 pb-1 mb-0" style={{ whiteSpace: "nowrap" }}>
        {tabs.map((t, i) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li className="nav-item" key={t.href}>
              <Link
                href={t.href}
                className="nav-link d-inline-flex align-items-center gap-2 fw-semibold border shadow-sm"
                aria-current={active ? "page" : undefined}
                style={{
                  fontSize: 17, padding: "12px 20px", borderRadius: 12,
                  ...(active ? { backgroundColor: t.color, borderColor: t.color, color: "#fff" } : { color: t.color, backgroundColor: "#fff" }),
                }}
              >
                <Icon icon={t.icon} width="24" height="24" /> {t.label}
                <Count value={counts[i]} light={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}