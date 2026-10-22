"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Nav, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useInvSendMutation } from "@/store/features/apiSlice";

// Shared UI for the Inventory module. Same look as the HR module (hrUi.jsx): StatCard, Panel, Empty, StatusBadge.

export const money = (n) => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const qtyFmt = (n) => Number(n || 0).toLocaleString("en-LK", { maximumFractionDigits: 2 });
export const when = (d) => (d ? new Date(d).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" }) : "");

export const MOVE_META = {
  OPENING: { bg: "secondary", icon: "mdi:flag-outline", label: "Opening" },
  GRN: { bg: "success", icon: "mdi:truck-delivery-outline", label: "Received" },
  RETURN: { bg: "success", icon: "mdi:undo-variant", label: "Returned" },
  ISSUE: { bg: "warning", icon: "mdi:package-up", label: "Issued" },
  ADJUST: { bg: "info", icon: "mdi:tune-variant", label: "Adjusted" },
  SCRAP: { bg: "danger", icon: "mdi:delete-outline", label: "Scrapped" },
  TRANSFER_OUT: { bg: "primary", icon: "mdi:arrow-right-bold-outline", label: "Transfer out" },
  TRANSFER_IN: { bg: "primary", icon: "mdi:arrow-left-bold-outline", label: "Transfer in" },
  SUPPLIER_RETURN: { bg: "dark", icon: "mdi:truck-remove-outline", label: "Supplier return" },
};

/* ---------- status badge ---------- */
const STATUS_STYLE = {
  "Out of stock": "danger",
  Low: "warning",
  "In stock": "success",
  Completed: "success",
  "In progress": "info",
  "Waiting for Logistic & Stock": "warning",
  "No parts needed": "secondary",
  Quoted: "success",
  "Waiting for price": "warning",
  "in stock": "success",
  "out of stock": "danger",
  unknown: "secondary",
  DRAFT: "secondary", ORDERED: "primary", PARTIAL: "warning", RECEIVED: "success", CANCELLED: "dark",
  PENDING: "warning", APPROVED: "success", REJECTED: "danger", OPEN: "warning", COMPLETED: "success", CREDITED: "success",
  FAST: "success", SLOW: "warning", DEAD: "danger", "NO STOCK": "secondary",
  Expired: "danger", "Expiring soon": "warning", OK: "success",
};
export function StatusBadge({ status, bg }) {
  const color = bg || STATUS_STYLE[status] || "secondary";
  const darkText = color === "warning" || color === "light" || color === "info";
  return <Badge bg={color} text={darkText ? "dark" : undefined} className="fw-semibold">{status}</Badge>;
}
export function MoveBadge({ type }) {
  const m = MOVE_META[type];
  return <StatusBadge status={m?.label || type} bg={m?.bg} />;
}

/* ---------- KPI card ---------- */
export function StatCard({ icon, label, value, sub, color = "#2563eb", onClick }) {
  return (
    <Card className="border-0 shadow-sm h-100" role={onClick ? "button" : undefined} onClick={onClick}>
      <Card.Body className="d-flex align-items-center gap-3">
        <span
          className="rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 52, height: 52, color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
        >
          <Icon icon={icon} width="28" height="28" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="text-muted small">{label}</div>
          <div className="fs-3 fw-bold lh-1">{value}</div>
          {sub && <div className="small text-muted mt-1 text-truncate">{sub}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

/* ---------- panel with header ---------- */
export function Panel({ title, icon, action, children, className = "", bodyClassName = "" }) {
  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      {(title || action) && (
        <Card.Header className="bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center gap-2">
          <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
            {icon && <Icon icon={icon} width="20" height="20" className="text-primary" />}
            {title}
          </h6>
          {action}
        </Card.Header>
      )}
      <Card.Body className={bodyClassName}>{children}</Card.Body>
    </Card>
  );
}

export function Empty({ text = "Nothing to show", icon = "mdi:inbox-outline" }) {
  return (
    <div className="text-center text-muted py-4">
      <Icon icon={icon} width="36" height="36" />
      <div className="mt-1 small">{text}</div>
    </div>
  );
}
export function Loader({ text = "Loading..." }) {
  return <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> {text}</div>;
}

/* ---------- second-level tabs inside a main tab ---------- */
export function SubTabs({ tabs, active, onChange }) {
  return (
    <Card className="border-0 shadow-sm mb-3">
      <Card.Body className="py-0 px-2">
        <Nav variant="tabs" activeKey={active} onSelect={(k) => k && onChange(k)} className="border-0 flex-nowrap overflow-auto">
          {tabs.map((t) => (
            <Nav.Item key={t.key}>
              <Nav.Link eventKey={t.key} className="d-inline-flex align-items-center gap-2 text-nowrap py-3">
                {t.icon && <Icon icon={t.icon} width="18" height="18" />}
                {t.label}
                {t.badge > 0 && <Badge bg="warning" text="dark" pill>{t.badge}</Badge>}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </Card.Body>
    </Card>
  );
}

/* ---------- small hooks ---------- */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
// const [send, busy] = useSend();   const ok = await send("suppliers", body, "POST")   -> response, or null after showing the error
export function useSend() {
  const [mutate, { isLoading }] = useInvSendMutation();
  const send = async (url, body, method = "POST") => {
    try { return await mutate({ url, method, body }).unwrap(); } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Something went wrong.", icon: "error" });
      return null;
    }
  };
  return [send, isLoading];
}
export const toast = (title) => Swal.fire({ toast: true, position: "top-end", icon: "success", title, showConfirmButton: false, timer: 2200 });
export const today = () => new Date().toISOString().slice(0, 10);