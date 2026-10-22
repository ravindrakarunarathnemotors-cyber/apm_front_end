"use client";

import { Button, Col, ListGroup, ProgressBar, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetInventoryDashboardQuery } from "@/store/features/apiSlice";
import { Empty, Loader, MoveBadge, Panel, StatCard, StatusBadge, money, qtyFmt, when } from "./inventoryUi";

// Overview = the inventory dashboard (everything at a glance)
export default function OverviewTab({ onNavigate }) {
  const { data, isLoading } = useGetInventoryDashboardQuery();
  if (isLoading || !data) return <Loader />;
  const maxVal = Math.max(1, ...data.categories.map((c) => c.value));

  return (
    <>
      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:package-variant-closed" label="Active items" value={data.items} sub={`${data.categories.length} categories`} color="#2563eb" onClick={() => onNavigate("master")} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:cash-multiple" label="Stock value" value={money(data.stockValue)} sub="LKR · at average cost" color="#059669" />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:alert-outline" label="Low / out of stock" value={data.lowStock + data.outOfStock} sub={`${data.lowStock} low · ${data.outOfStock} out of stock`} color="#d97706" onClick={() => onNavigate("master")} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon="mdi:clipboard-list-outline" label="Open spare part orders" value={data.openOrders} sub={`${data.waitingLogistics} waiting · ${data.pendingQuotes} quotations to answer`} color="#7c3aed" onClick={() => onNavigate("jobcards")} />
        </Col>
      </Row>

      <Row className="g-3">
        {/* LEFT (8/12) */}
        <Col xl={8}>
          <Panel
            title="Needs re-ordering"
            icon="mdi:alert-circle-outline"
            className="mb-3"
            action={<Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("master")}>View items</Button>}
          >
            {data.lowItems.length === 0 ? <Empty text="Everything is above its reorder level" icon="mdi:check-circle-outline" /> : (
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light"><tr><th>Item</th><th>Category</th><th className="text-end">Available</th><th className="text-end">Reorder at</th><th /></tr></thead>
                <tbody>
                  {data.lowItems.map((x) => (
                    <tr key={x.id}>
                      <td><div className="fw-semibold">{x.name}</div><small className="text-muted">{x.partNo}</small></td>
                      <td className="small">{x.categoryName}</td>
                      <td className="text-end fw-semibold">{qtyFmt(x.available)} <small className="text-muted fw-normal">{x.unit}</small></td>
                      <td className="text-end">{x.reorderLevel}</td>
                      <td className="text-end"><StatusBadge status={x.available <= 0 ? "Out of stock" : "Low"} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          <Panel title="Recent stock movements" icon="mdi:swap-horizontal" action={<Button variant="link" size="sm" className="p-0" onClick={() => onNavigate("control")}>View ledger</Button>}>
            {data.recent.length === 0 ? <Empty text="No movements yet" icon="mdi:history" /> : (
              <Table responsive hover className="align-middle mb-0">
                <thead className="table-light"><tr><th>When</th><th>Item</th><th>Type</th><th className="text-end">Qty</th><th>Job</th></tr></thead>
                <tbody>
                  {data.recent.map((m) => (
                    <tr key={m.id}>
                      <td className="small text-nowrap">{when(m.createdAt)}</td>
                      <td className="fw-semibold">{m.item}</td>
                      <td><MoveBadge type={m.type} /></td>
                      <td className={`text-end fw-bold ${m.qty < 0 ? "text-danger" : "text-success"}`}>{m.qty > 0 ? "+" : ""}{qtyFmt(m.qty)}</td>
                      <td className="small">{m.jobNo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </Col>

        {/* RIGHT (4/12) */}
        <Col xl={4}>
          <Panel title="Stock value by category" icon="mdi:shape-outline" className="mb-3">
            {data.categories.length === 0 ? <Empty text="No stock yet" /> : (
              <div className="d-flex flex-column gap-3">
                {data.categories.map((c) => (
                  <div key={c.name}>
                    <div className="d-flex justify-content-between small mb-1">
                      <span>{c.name} <span className="text-muted">· {c.items}</span></span>
                      <span className="fw-semibold">LKR {money(c.value)}</span>
                    </div>
                    <ProgressBar now={(c.value / maxVal) * 100} style={{ height: 7 }} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Needs attention" icon="mdi:bell-outline" bodyClassName="p-2">
            <ListGroup variant="flush">
              {[
                ["Waiting for Logistic & Stock", data.waitingLogistics, "jobcards", "mdi:clock-outline", "warning"],
                ["Quotations to answer", data.pendingQuotes, "jobcards", "mdi:file-document-edit-outline", "danger"],
                ["Adjustments waiting for approval", data.pendingAdjustments, "control", "mdi:tune-variant", "warning"],
                ["Batches expiring in 30 days", data.expiringBatches, "control", "mdi:calendar-alert-outline", "danger"],
                ["Out of stock items", data.outOfStock, "master", "mdi:package-variant-remove", "secondary"],
              ].map(([label, n, to, icon, color]) => (
                <ListGroup.Item key={label} action onClick={() => onNavigate(to)} className="d-flex align-items-center gap-2 border-0">
                  <Icon icon={icon} width="20" height="20" className="text-secondary" />
                  <span className="flex-grow-1">{label}</span>
                  <span className={`badge rounded-pill bg-${n > 0 ? color : "light"} ${n > 0 && color !== "warning" ? "" : "text-dark"}`}>{n}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Panel>
        </Col>
      </Row>
    </>
  );
}