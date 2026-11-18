"use client";

// Inventory & Spare Parts   ->   src/app/(admin)/inventory/page.jsx
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import OverviewTab from "./components/OverviewTab";
import MasterTab from "./components/MasterTab";
import PurchasingTab from "./components/PurchasingTab";
import JobCardsTab from "./components/JobCardsTab";
import StockControlTab from "./components/StockControlTab";
import ReportsTab from "./components/ReportsTab";
import { useGetInventoryDashboardQuery } from "@/store/features/apiSlice";

// ADD A SECTION: write a *Tab component, then add one line to TABS.
// tone: "warn" = needs attention (amber), "info" = grey count
const TABS = [
  { key: "main", label: "Main", icon: "mdi:view-dashboard-outline", Component: OverviewTab },
  { key: "jobcards", label: "Job Orders", icon: "mdi:clipboard-list-outline", Component: JobCardsTab, badge: (s) => s.waitingLogistics + s.pendingQuotes, tone: "warn" },
  { key: "master", label: "Item Master", icon: "mdi:package-variant-closed", Component: MasterTab, badge: (s) => s.lowStock + s.outOfStock, tone: "warn" },
  { key: "purchasing", label: "Purchasing", icon: "mdi:truck-outline", Component: PurchasingTab },
  { key: "control", label: "Stock Control", icon: "mdi:tune-variant", Component: StockControlTab, badge: (s) => s.pendingAdjustments + s.expiringBatches, tone: "warn" },
  { key: "reports", label: "Reports", icon: "mdi:chart-box-outline", Component: ReportsTab },
];

// "needs attention" chips in the header: [label, icon, value from the summary, tab to open]
const ALERTS = [
  ["Low stock", "mdi:alert-outline", (s) => s.lowStock, "master"],
  ["Out of stock", "mdi:package-variant-remove", (s) => s.outOfStock, "master"],
  ["Waiting for logistics", "mdi:truck-delivery-outline", (s) => s.waitingLogistics, "jobcards"],
  ["Pending quotes", "mdi:file-clock-outline", (s) => s.pendingQuotes, "jobcards"],
  ["Pending adjustments", "mdi:clipboard-check-outline", (s) => s.pendingAdjustments, "control"],
  ["Expiring batches", "mdi:calendar-alert", (s) => s.expiringBatches, "control"],
];

const CSS = `
.inv-page { font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; width: 100%; max-width: none; }
.inv-hero { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 22px; border-radius: 16px; background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.14); }
.inv-hero-l { display: flex; align-items: center; gap: 14px; min-width: 0; } .inv-hero-ic { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,.12); display: grid; place-items: center; flex: none; }
.inv-hero h1 { font-size: 1.3rem; font-weight: 700; margin: 0; letter-spacing: -.01em; color: #fff; } .inv-hero small { color: #cbd5e1; }
.inv-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.inv-chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: #fff; padding: 6px 12px; border-radius: 999px; font-size: .84rem; cursor: pointer; transition: background .12s; } .inv-chip:hover { background: rgba(255,255,255,.18); }
.inv-chip b { background: #fbbf24; color: #1f2937; border-radius: 999px; padding: 0 8px; font-size: .78rem; min-width: 22px; text-align: center; }
.inv-chip.ok { cursor: default; color: #cbd5e1; } .inv-chip.ok:hover { background: rgba(255,255,255,.08); }
.inv-nav { position: sticky; top: 0; z-index: 20; margin: 16px 0; padding: 6px; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.inv-tabs { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; } .inv-tabs::-webkit-scrollbar { display: none; }
.inv-tab { position: relative; display: inline-flex; align-items: center; gap: 8px; border: 0; background: transparent; height: 44px; padding: 0 16px; border-radius: 10px; font-weight: 600; color: #475569; white-space: nowrap; cursor: pointer; transition: background .12s, color .12s; }
.inv-tab:hover { background: #f1f5f9; color: #0f172a; } .inv-tab:focus-visible { outline: 2px solid #0f172a; outline-offset: 2px; }
.inv-tab.on { background: #0f172a; color: #fff; }
.inv-badge { min-width: 22px; padding: 0 7px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: .74rem; font-weight: 700; line-height: 20px; text-align: center; } .inv-tab.on .inv-badge { background: #fbbf24; color: #1f2937; }
.inv-body { animation: invfade .18s ease-out; } @keyframes invfade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (max-width: 767px) { .inv-hero { padding: 14px 16px; } .inv-hero h1 { font-size: 1.1rem; } .inv-tab { padding: 0 12px; height: 42px; } .inv-hero-r { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .inv-body { animation: none; } }
`;

const InventoryPage = () => {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(() => (TABS.some((t) => t.key === searchParams.get("tab")) ? searchParams.get("tab") : "main"));
  // a notification link such as /inventory?tab=jobcards&job=74 opens that tab (also when the page is already open)
  const tabParam = searchParams.get("tab");
  useEffect(() => { if (tabParam && TABS.some((t) => t.key === tabParam)) setTab(tabParam); }, [tabParam]);

  // The admin layout wraps every page in <div className="container-xxl"> (max 1320px).
  // While this page is open, lift that limit so the inventory uses the full content width. Other pages are not affected.
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-inventory-wide", "1");
    style.textContent = ".page-content > .container-xxl { max-width: 100% !important; }";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  const { data: summary } = useGetInventoryDashboardQuery(undefined, { refetchOnMountOrArgChange: true });

  const active = TABS.find((t) => t.key === tab) || TABS[0];
  const Active = active.Component;
  const todayText = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const alerts = summary ? ALERTS.map(([label, icon, get, to]) => ({ label, icon, to, n: Number(get(summary)) || 0 })).filter((a) => a.n > 0) : [];
  const tabsRef = useRef(null);

  // left / right arrow keys move between the tabs
  const onKey = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.key === active.key);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.key);
    requestAnimationFrame(() => tabsRef.current?.querySelector(`[data-tab="${next.key}"]`)?.focus());
  };

  return (
    <div className="inv-page">
      <style>{CSS}</style>

      <div className="inv-hero">
        <div className="inv-hero-l">
          <span className="inv-hero-ic"><Icon icon="mdi:warehouse" width="26" height="26" /></span>
          <div><h1>Inventory &amp; Spare Parts</h1><small>{todayText}</small></div>
        </div>
        <div className="inv-hero-r inv-chips" aria-label="Needs attention">
          {summary && alerts.length === 0 && <span className="inv-chip ok"><Icon icon="mdi:check-circle-outline" width="16" height="16" /> Nothing needs attention</span>}
          {alerts.map((a) => (
            <button key={a.label} type="button" className="inv-chip" onClick={() => setTab(a.to)} title={`Open ${TABS.find((t) => t.key === a.to)?.label}`}>
              <Icon icon={a.icon} width="16" height="16" /> {a.label} <b>{a.n}</b>
            </button>
          ))}
        </div>
      </div>

      <nav className="inv-nav" aria-label="Inventory sections">
        <div className="inv-tabs" role="tablist" ref={tabsRef} onKeyDown={onKey}>
          {TABS.map((t) => {
            const isActive = t.key === active.key;
            const n = t.badge && summary ? t.badge(summary) : 0;
            return (
              <button key={t.key} data-tab={t.key} type="button" role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1} onClick={() => setTab(t.key)} className={`inv-tab ${isActive ? "on" : ""}`}>
                <Icon icon={t.icon} width="19" height="19" />
                {t.label}
                {n > 0 && <span className="inv-badge" aria-label={`${n} need attention`}>{n}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active tab. "onNavigate" lets the Main tab jump to another tab. */}
      <div className="inv-body" key={active.key} role="tabpanel">
        <Active onNavigate={setTab} summary={summary} />
      </div>
    </div>
  );
};

// useSearchParams needs a Suspense boundary in the Next.js app router
const InventoryPageWithParams = () => (
  <Suspense fallback={null}>
    <InventoryPage />
  </Suspense>
);

export default InventoryPageWithParams;