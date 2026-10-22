"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import MainTab from "./components/MainTab";
import EmployeesTab from "./components/EmployeesTab";
import LeavesTab from "./components/LeavesTab";
import ShiftRosterTab from "./components/ShiftRosterTab";
import AttendanceTab from "./components/AttendanceTab";
import HolidaysTab from "./components/HolidaysTab";
import DesignationsTab from "./components/DesignationsTab";
import DepartmentsTab from "./components/DepartmentsTab";
import BranchesTab from "./components/BranchesTab";
import AppreciationTab from "./components/AppreciationTab";
import { APPRECIATIONS, LEAVES } from "./components/hrData";
import { useGetEmployeesQuery } from "@/store/features/apiSlice";

const TABS = [
  { key: "main", label: "Main", icon: "mdi:view-dashboard-outline", Component: MainTab },
  { key: "employees", label: "Employees", icon: "mdi:account-group-outline", Component: EmployeesTab },
  { key: "leaves", label: "Leaves", icon: "mdi:beach", Component: LeavesTab, badge: (hr) => hr.leaves.filter((l) => l.status === "Pending").length },
  { key: "shift", label: "Shift Roster", icon: "mdi:calendar-clock-outline", Component: ShiftRosterTab },
  { key: "attendance", label: "Attendance", icon: "mdi:clock-check-outline", Component: AttendanceTab },
  { key: "holidays", label: "Holidays", icon: "mdi:calendar-star", Component: HolidaysTab },
  { key: "designations", label: "Designations", icon: "mdi:badge-account-horizontal-outline", Component: DesignationsTab },
  { key: "departments", label: "Departments", icon: "mdi:domain", Component: DepartmentsTab },
  { key: "branches", label: "Branches", icon: "mdi:store-marker-outline", Component: BranchesTab },
  { key: "appreciation", label: "Appreciation", icon: "mdi:star-circle-outline", Component: AppreciationTab },
];

const HrPage = () => {
  const [tab, setTab] = useState("main");

  // All HR data lives here and is passed to every tab as `hr`.
  // Employees come from the database. Leaves and appreciations are still SAMPLE data.
  const {
    data: employees = [],
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useGetEmployeesQuery();
  const [leaves, setLeaves] = useState(LEAVES);
  const [appreciations, setAppreciations] = useState(APPRECIATIONS);
  const hr = {
    employees,
    employeesLoading,
    employeesError,
    refetchEmployees,
    leaves,
    setLeaves,
    appreciations,
    setAppreciations,
  };

  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const Active = active.Component;
  const todayText = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      {/* Header */}
      <div
        className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 px-3 py-2 rounded border"
        style={{ backgroundColor: "#e5e7eb" }}
      >
        <h4 className="mb-0 text-dark d-flex align-items-center gap-2">
          <Icon icon="mdi:account-tie-outline" width="26" height="26" /> HR
        </h4>
        <span className="text-muted small">{todayText}</span>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3 shadow-sm p-2 mb-3">
        <div className="d-flex gap-1 overflow-auto flex-nowrap" role="tablist">
          {TABS.map((t) => {
            const isActive = t.key === active.key;
            const n = t.badge ? t.badge(hr) : 0;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.key)}
                className={`btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill text-nowrap border-0 ${
                  isActive ? "btn-primary" : "btn-light text-secondary"
                }`}
              >
                <Icon icon={t.icon} width="18" height="18" />
                {t.label}
                {n > 0 && (
                  <span className={`badge rounded-pill ${isActive ? "bg-white text-primary" : "bg-warning text-dark"}`}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab. "onNavigate" lets the Main tab jump to another tab. */}
      <Active hr={hr} onNavigate={setTab} />
    </>
  );
};

export default HrPage;