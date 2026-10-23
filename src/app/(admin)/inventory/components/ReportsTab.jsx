"use client";

import { useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Col, FormControl, FormSelect, ProgressBar, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useInvGetQuery } from "@/store/features/apiSlice";
import { Empty, Loader, Panel, StatCard, StatusBadge, SubTabs, money, qtyFmt, when } from "./inventoryUi";

const Err = ({ retry }) => <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load the report.</span><Button size="sm" variant="outline-danger" onClick={retry}>Retry</Button></Alert>;

// download rows as a CSV file (opens in Excel)
function exportCsv(name, columns, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.map((c) => esc(c.label)).join(","), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
const CsvButton = ({ onClick, disabled }) => <Button size="sm" variant="outline-secondary" onClick={onClick} disabled={disabled}><Icon icon="mdi:file-excel-outline" width="18" height="18" /> Export CSV</Button>;

/* ---------- Low stock / reorder ---------- */
function ReorderReport() {
  const { data = [], isLoading, isError, refetch } = useInvGetQuery("reports/reorder");
  const cols = [
    { label: "Item", value: (r) => r.name }, { label: "Part no", value: (r) => r.partNo }, { label: "Category", value: (r) => r.categoryName },
    { label: "Available", value: (r) => r.available }, { label: "Reorder level", value: (r) => r.reorderLevel }, { label: "On order", value: (r) => r.onOrder },
    { label: "Suggested order qty", value: (r) => r.suggested }, { label: "Last supplier", value: (r) => r.lastSupplier }, { label: "Last cost", value: (r) => r.lastCost },
  ];
  return (
    <Panel title={<>Low stock &amp; reorder <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:alert-circle-outline" action={<CsvButton onClick={() => exportCsv("reorder", cols, data)} disabled={!data.length} />}>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} /> : data.length === 0 ? <Empty text="Everything is above its reorder level" icon="mdi:check-circle-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Item</th><th>Category</th><th className="text-end">Available</th><th className="text-end">Reorder level</th><th className="text-end">On order</th><th className="text-end">Suggested qty</th><th>Last supplier</th><th>Status</th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td><div className="fw-semibold">{r.name}</div><small className="text-muted">{[r.partNo, r.binLocation && `Bin ${r.binLocation}`].filter(Boolean).join(" · ")}</small></td>
                <td className="small">{r.categoryName}</td>
                <td className={`text-end fw-bold ${r.available <= 0 ? "text-danger" : "text-warning"}`}>{qtyFmt(r.available)} <small className="text-muted fw-normal">{r.unit}</small></td>
                <td className="text-end">{r.reorderLevel}</td><td className="text-end">{r.onOrder > 0 ? <Badge bg="info" text="dark">{qtyFmt(r.onOrder)}</Badge> : "-"}</td>
                <td className="text-end fw-semibold">{qtyFmt(r.suggested)}</td>
                <td className="small">{r.lastSupplier || "-"}{r.lastCost != null && <div className="text-muted">LKR {money(r.lastCost)}</div>}</td>
                <td><StatusBadge status={r.available <= 0 ? "Out of stock" : "Low"} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

/* ---------- Stock valuation ---------- */
function ValuationReport() {
  const { data, isLoading, isError, refetch } = useInvGetQuery("reports/valuation");
  const cols = [{ label: "Item", value: (r) => r.name }, { label: "Part no", value: (r) => r.partNo }, { label: "Category", value: (r) => r.categoryName }, { label: "Qty", value: (r) => r.qty }, { label: "Avg cost", value: (r) => r.avgCost }, { label: "Value", value: (r) => r.value }];
  if (isLoading) return <Loader />;
  if (isError || !data) return <Err retry={refetch} />;
  const max = Math.max(1, ...data.byCategory.map((c) => c.value));
  return (
    <>
      <Row className="g-3 mb-3">
        <Col xs={12} md={4}><StatCard icon="mdi:cash-multiple" label="Total stock value" value={`LKR ${money(data.total)}`} sub="at average cost" color="#059669" /></Col>
        {data.byLocation.map((l) => <Col key={l.name} xs={6} md={2}><StatCard icon="mdi:warehouse" label={l.name} value={money(l.value)} color="#2563eb" /></Col>)}
      </Row>
      <Row className="g-3">
        <Col xl={4}>
          <Panel title="By category" icon="mdi:shape-outline">
            <div className="d-flex flex-column gap-3">
              {data.byCategory.map((c) => (
                <div key={c.name}><div className="d-flex justify-content-between small mb-1"><span>{c.name} <span className="text-muted">· {c.items} items</span></span><span className="fw-semibold">LKR {money(c.value)}</span></div><ProgressBar now={(c.value / max) * 100} style={{ height: 7 }} /></div>
              ))}
              {data.byCategory.length === 0 && <Empty text="No stock yet" />}
            </div>
          </Panel>
        </Col>
        <Col xl={8}>
          <Panel title="By item" icon="mdi:package-variant-closed" action={<CsvButton onClick={() => exportCsv("stock-valuation", cols, data.items)} disabled={!data.items.length} />}>
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light"><tr><th>Item</th><th>Category</th><th className="text-end">Qty</th><th className="text-end">Avg cost</th><th className="text-end">Value (LKR)</th></tr></thead>
              <tbody>{data.items.map((r) => <tr key={r.id}><td className="fw-semibold">{r.name}</td><td className="small">{r.categoryName}</td><td className="text-end">{qtyFmt(r.qty)} <small className="text-muted">{r.unit}</small></td><td className="text-end">{money(r.avgCost)}</td><td className="text-end fw-semibold">{money(r.value)}</td></tr>)}</tbody>
            </Table>
          </Panel>
        </Col>
      </Row>
    </>
  );
}

/* ---------- Fast / slow / dead stock ---------- */
function MoversReport() {
  const [days, setDays] = useState(90);
  const [view, setView] = useState("ALL");
  const { data, isLoading, isError, refetch } = useInvGetQuery(`reports/movers?days=${days}`);
  const rows = (data?.rows || []).filter((r) => view === "ALL" || r.status === view);
  const count = (s) => (data?.rows || []).filter((r) => r.status === s).length;
  const deadValue = (data?.rows || []).filter((r) => r.status === "DEAD").reduce((s, r) => s + r.value, 0);
  const cols = [{ label: "Item", value: (r) => r.name }, { label: "Category", value: (r) => r.categoryName }, { label: "Used in period", value: (r) => r.used }, { label: "On hand", value: (r) => r.onHand }, { label: "Value", value: (r) => r.value }, { label: "Last issue", value: (r) => r.lastIssue }, { label: "Class", value: (r) => r.status }];
  return (
    <>
      <Row className="g-3 mb-3">
        <Col xs={6} xl={3}><StatCard icon="mdi:rocket-launch-outline" label="Fast moving" value={count("FAST")} sub="top 25% by usage" color="#059669" /></Col>
        <Col xs={6} xl={3}><StatCard icon="mdi:tortoise" label="Slow moving" value={count("SLOW")} color="#d97706" /></Col>
        <Col xs={6} xl={3}><StatCard icon="mdi:package-variant-remove" label="Dead stock" value={count("DEAD")} sub={`LKR ${money(deadValue)} tied up`} color="#dc2626" /></Col>
        <Col xs={6} xl={3}><StatCard icon="mdi:calendar-range" label="Period" value={`${days} days`} sub="no issue = dead stock" color="#2563eb" /></Col>
      </Row>
      <Panel
        title="Fast / slow / dead stock"
        icon="mdi:speedometer"
        action={
          <div className="d-flex gap-2 flex-wrap">
            <FormSelect size="sm" style={{ width: 130 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}</FormSelect>
            <ButtonGroup size="sm">{[["ALL", "All"], ["FAST", "Fast"], ["SLOW", "Slow"], ["DEAD", "Dead"]].map(([k, l]) => <Button key={k} variant={view === k ? "primary" : "outline-secondary"} onClick={() => setView(k)}>{l}</Button>)}</ButtonGroup>
            <CsvButton onClick={() => exportCsv("fast-slow-dead", cols, rows)} disabled={!rows.length} />
          </div>
        }
      >
        {isLoading ? <Loader /> : isError ? <Err retry={refetch} /> : rows.length === 0 ? <Empty text="Nothing to show" /> : (
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light"><tr><th>Item</th><th>Category</th><th className="text-end">Used ({days}d)</th><th className="text-end">On hand</th><th className="text-end">Stock value</th><th>Last issue</th><th>Class</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td className="fw-semibold">{r.name}</td><td className="small">{r.categoryName}</td><td className="text-end">{qtyFmt(r.used)}</td><td className="text-end">{qtyFmt(r.onHand)} <small className="text-muted">{r.unit}</small></td>
                <td className="text-end">{money(r.value)}</td><td className="small text-nowrap">{r.lastIssue ? when(r.lastIssue) : "never"}</td><td><StatusBadge status={r.status} /></td></tr>
            ))}</tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}

/* ---------- Parts usage (by job / technician / vehicle type / item) ---------- */
const USAGE = [
  ["job", "By job", "Job", "Vehicle"],
  ["technician", "By technician", "Technician", ""],
  ["vehicle", "By vehicle type", "Vehicle type", ""],
  ["item", "By item", "Item", "Part no"],
];
function UsageReport() {
  const [by, setBy] = useState("job");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isError, refetch } = useInvGetQuery(`reports/usage?by=${by}&from=${from}&to=${to}`);
  const rows = data?.rows || [];
  const meta = USAGE.find((u) => u[0] === by);
  const cols = [{ label: meta[2], value: (r) => r.label }, { label: "Jobs", value: (r) => r.jobs }, { label: "Items", value: (r) => r.items }, { label: "Qty used", value: (r) => r.qty }, { label: "Cost", value: (r) => r.cost }];
  return (
    <Panel
      title="Parts usage"
      icon="mdi:wrench-cog-outline"
      action={
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <FormControl size="sm" type="date" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
          <FormControl size="sm" type="date" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} title="To" />
          <CsvButton onClick={() => exportCsv(`usage-${by}`, cols, rows)} disabled={!rows.length} />
        </div>
      }
    >
      <ButtonGroup size="sm" className="mb-3 flex-wrap">{USAGE.map(([k, l]) => <Button key={k} variant={by === k ? "primary" : "outline-secondary"} onClick={() => setBy(k)}>{l}</Button>)}</ButtonGroup>
      {by === "technician" && <Alert variant="light" className="border small py-2">The technician name comes from the Issue form. Issues without a technician are listed as “(not recorded)”.</Alert>}
      {by === "vehicle" && <Alert variant="light" className="border small py-2">Grouped by the vehicle type saved on the job (Car, Van, ...). Add make / model fields to the vehicle form if you need model-wise numbers.</Alert>}
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} /> : rows.length === 0 ? <Empty text="No parts were issued in this period" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>{meta[2]}</th><th className="text-end">Jobs</th><th className="text-end">Items</th><th className="text-end">Qty used</th><th className="text-end">Cost (LKR)</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td><div className="fw-semibold">{r.label}</div>{r.sub && <small className="text-muted">{r.sub}</small>}</td><td className="text-end">{r.jobs}</td><td className="text-end">{r.items}</td><td className="text-end">{qtyFmt(r.qty)}</td><td className="text-end fw-semibold">{money(r.cost)}</td></tr>)}</tbody>
        </Table>
      )}
    </Panel>
  );
}

/* ---------- Profit margin per part ---------- */
function MarginReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isError, refetch } = useInvGetQuery(`reports/margin?from=${from}&to=${to}`);
  const rows = data?.rows || [];
  const cols = [{ label: "Item", value: (r) => r.name }, { label: "Category", value: (r) => r.categoryName }, { label: "Qty sold", value: (r) => r.qty }, { label: "Revenue", value: (r) => r.revenue }, { label: "Cost", value: (r) => r.cost }, { label: "Margin", value: (r) => r.margin }, { label: "Margin %", value: (r) => r.pct.toFixed(1) }];
  const pct = data && data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
  return (
    <>
      <Row className="g-3 mb-3">
        <Col xs={12} md={4}><StatCard icon="mdi:cash-plus" label="Revenue (issued parts)" value={`LKR ${money(data?.revenue)}`} color="#2563eb" /></Col>
        <Col xs={6} md={4}><StatCard icon="mdi:cash-minus" label="Cost" value={`LKR ${money(data?.cost)}`} color="#d97706" /></Col>
        <Col xs={6} md={4}><StatCard icon="mdi:chart-line" label="Margin" value={`LKR ${money((data?.revenue || 0) - (data?.cost || 0))}`} sub={`${pct.toFixed(1)}%`} color="#059669" /></Col>
      </Row>
      <Panel
        title="Profit margin per part"
        icon="mdi:chart-line"
        action={
          <div className="d-flex gap-2 flex-wrap">
            <FormControl size="sm" type="date" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
            <FormControl size="sm" type="date" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} title="To" />
            <CsvButton onClick={() => exportCsv("margin", cols, rows)} disabled={!rows.length} />
          </div>
        }
      >
        {isLoading ? <Loader /> : isError ? <Err retry={refetch} /> : rows.length === 0 ? <Empty text="No issued parts in this period" /> : (
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light"><tr><th>Item</th><th>Category</th><th className="text-end">Qty</th><th className="text-end">Revenue</th><th className="text-end">Cost</th><th className="text-end">Margin</th><th className="text-end">%</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td className="fw-semibold">{r.name}</td><td className="small">{r.categoryName}</td><td className="text-end">{qtyFmt(r.qty)}</td><td className="text-end">{money(r.revenue)}</td><td className="text-end">{money(r.cost)}</td>
                <td className={`text-end fw-semibold ${r.margin < 0 ? "text-danger" : "text-success"}`}>{money(r.margin)}</td><td className={`text-end ${r.pct < 10 ? "text-warning" : ""}`}>{r.pct.toFixed(1)}%</td></tr>
            ))}</tbody>
          </Table>
        )}
        <small className="text-muted d-block mt-2">Revenue = issued qty × the job s unit price. Cost = average cost at the time of issue.</small>
      </Panel>
    </>
  );
}

export default function ReportsTab() {
  const [sub, setSub] = useState("reorder");
  return (
    <>
      <SubTabs
        active={sub}
        onChange={setSub}
        tabs={[
          { key: "reorder", label: "Low stock & reorder", icon: "mdi:alert-circle-outline" },
          { key: "valuation", label: "Stock valuation", icon: "mdi:cash-multiple" },
          { key: "movers", label: "Fast / slow / dead", icon: "mdi:speedometer" },
          { key: "usage", label: "Parts usage", icon: "mdi:wrench-cog-outline" },
          { key: "margin", label: "Profit margin", icon: "mdi:chart-line" },
        ]}
      />
      {sub === "reorder" && <ReorderReport />}
      {sub === "valuation" && <ValuationReport />}
      {sub === "movers" && <MoversReport />}
      {sub === "usage" && <UsageReport />}
      {sub === "margin" && <MarginReport />}
    </>
  );
}