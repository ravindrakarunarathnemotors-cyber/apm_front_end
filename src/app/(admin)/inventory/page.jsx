"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import OverviewTab from "./components/OverviewTab";
import MasterTab from "./components/MasterTab";
import PurchasingTab from "./components/PurchasingTab";
import JobCardsTab from "./components/JobCardsTab";
import StockControlTab from "./components/StockControlTab";
import ReportsTab from "./components/ReportsTab";
import { useGetInventoryDashboardQuery } from "@/store/features/apiSlice";

// Same layout as the HR page. ADD A SECTION: write a *Tab component, then add one line to TABS.
const TABS = [
  { key: "main", label: "Main", icon: "mdi:view-dashboard-outline", Component: OverviewTab },
  { key: "master", label: "Item Master", icon: "mdi:package-variant-closed", Component: MasterTab, badge: (s) => s.lowStock + s.outOfStock },
  { key: "purchasing", label: "Purchasing", icon: "mdi:truck-outline", Component: PurchasingTab },
  { key: "jobcards", label: "Job Cards", icon: "mdi:clipboard-list-outline", Component: JobCardsTab, badge: (s) => s.waitingLogistics + s.pendingQuotes },
  { key: "control", label: "Stock Control", icon: "mdi:tune-variant", Component: StockControlTab, badge: (s) => s.pendingAdjustments + s.expiringBatches },
  { key: "reports", label: "Reports", icon: "mdi:chart-box-outline", Component: ReportsTab },
];

const InventoryPage = () => {
  const [tab, setTab] = useState("main");
  const { data: summary } = useGetInventoryDashboardQuery();

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
          <Icon icon="mdi:warehouse" width="26" height="26" /> Inventory &amp; Spare Parts
        </h4>
        <span className="text-muted small">{todayText}</span>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3 shadow-sm p-2 mb-3">
        <div className="d-flex gap-1 overflow-auto flex-nowrap" role="tablist">
          {TABS.map((t) => {
            const isActive = t.key === active.key;
            const n = t.badge && summary ? t.badge(summary) : 0;
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
      <Active onNavigate={setTab} summary={summary} />
    </>
  );
};

export default InventoryPage;