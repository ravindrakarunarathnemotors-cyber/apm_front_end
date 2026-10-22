"use client";

import { Badge, Card } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { hash } from "./hrData";

/* ---------- avatar with initials ---------- */
const AVATAR_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#dc2626", "#d97706", "#059669", "#db2777", "#475569"];

export const colorOf = (name) => AVATAR_COLORS[hash(String(name)) % AVATAR_COLORS.length];

// Profile images are stored by the backend as "/uploads/employees/xxx.jpg".
// NEXT_PUBLIC_API_URL = the backend address (leave it empty when the frontend proxies /uploads to the backend).
export const fileUrl = (path) => (path ? `${process.env.NEXT_PUBLIC_API_URL || ""}${path}` : null);

export function Avatar({ name, size = 36, src }) {
  const initials = String(name)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const c = colorOf(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-circle flex-shrink-0"
        style={{ width: size, height: size, objectFit: "cover" }}
      />
    );
  }
  return (
    <span
      className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: c,
        backgroundColor: `color-mix(in srgb, ${c} 14%, white)`,
      }}
    >
      {initials}
    </span>
  );
}

/* ---------- status badge (employee / attendance / leave) ---------- */
const STATUS_STYLE = {
  Active: "success",
  Probation: "info",
  Resigned: "secondary",
  Present: "success",
  Late: "warning",
  Absent: "danger",
  "On Leave": "primary",
  Weekend: "secondary",
  Upcoming: "light",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
};

export function StatusBadge({ status }) {
  const bg = STATUS_STYLE[status] || "secondary";
  const darkText = bg === "warning" || bg === "light" || bg === "info";
  return (
    <Badge bg={bg} text={darkText ? "dark" : undefined} className="fw-semibold">
      {status}
    </Badge>
  );
}

/* ---------- KPI card ---------- */
export function StatCard({ icon, label, value, sub, color = "#2563eb" }) {
  return (
    <Card className="border-0 shadow-sm h-100">
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