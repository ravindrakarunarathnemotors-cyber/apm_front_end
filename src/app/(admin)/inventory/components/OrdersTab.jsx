"use client";

import { Fragment, useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetSpareOrdersQuery } from "@/store/features/apiSlice";
import { Empty, Loader, Panel, StatusBadge, money } from "./inventoryUi";

const FILTERS = [["open", "Open"], ["waiting", "Waiting"], ["done", "Completed"], ["all", "All"]];

// Spare part requirement lists of all jobs
export default function OrdersTab() {
  const [status, setStatus] = useState("open");
  const [openId, setOpenId] = useState(null);
  const { data = [], isLoading, isError, refetch } = useGetSpareOrdersQuery(status);

  return (
    <Panel
      title={<>Spare part orders <Badge bg="secondary" pill>{data.length}</Badge></>}
      icon="mdi:clipboard-list-outline"
      action={
        <ButtonGroup size="sm">
          {FILTERS.map(([k, l]) => <Button key={k} variant={status === k ? "primary" : "outline-secondary"} onClick={() => setStatus(k)}>{l}</Button>)}
        </ButtonGroup>
      }
    >
      {isLoading ? <Loader /> : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load orders.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>
      ) : data.length === 0 ? <Empty text="No spare part orders here" icon="mdi:clipboard-text-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Job</th><th>Customer</th><th>Department</th><th className="text-end">Lines</th><th className="text-end">Total (LKR)</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.map((o) => {
              const st = o.completedAt ? "Completed" : o.noParts ? "No parts needed" : o.linkSentAt && !o.logisticsUpdatedAt ? "Waiting for Logistic & Stock" : "In progress";
              const isOpen = openId === o.jobId;
              return (
                <Fragment key={o.jobId}>
                  <tr>
                    <td><div className="fw-semibold">{o.jobNo}</div><small className="text-muted">{o.regNo}</small></td>
                    <td>{o.customerName}</td>
                    <td className="small">{o.department}</td>
                    <td className="text-end">{o.lines.length}</td>
                    <td className="text-end fw-semibold">{money(o.total)}</td>
                    <td>
                      <StatusBadge status={st} />{o.pendingQuotes > 0 && <> <Badge bg="danger" pill>{o.pendingQuotes} quotation</Badge></>}
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-primary" onClick={() => setOpenId(isOpen ? null : o.jobId)}>
                        {isOpen ? "Hide parts" : "View parts"} <Icon icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} width="16" height="16" />
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="bg-light">
                        {o.lines.length === 0 ? <span className="text-muted small">No parts added yet.</span> : (
                          <Table responsive size="sm" className="mb-0 align-middle">
                            <thead><tr><th>Part</th><th>Brand / quality</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th>Stock</th></tr></thead>
                            <tbody>
                              {o.lines.map((l, i) => (
                                <tr key={i}>
                                  <td className="fw-semibold">{l.name}</td>
                                  <td className="small">{[l.brand, l.quality].filter(Boolean).join(" · ") || "-"}</td>
                                  <td className="text-end">{l.qty}</td>
                                  <td className="text-end">{money(l.unitPrice)}</td>
                                  <td><StatusBadge status={l.stockStatus.replace(/_/g, " ").toLowerCase()} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}