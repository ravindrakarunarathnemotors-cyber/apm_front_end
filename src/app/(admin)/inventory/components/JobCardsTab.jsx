"use client";

import { useState } from "react";
import { Alert, Badge, Button, Modal, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useInvGetQuery } from "@/store/features/apiSlice";
import OrdersTab from "./OrdersTab";
import QuotesTab from "./QuotesTab";
import { Empty, Loader, Panel, StatusBadge, SubTabs, money, qtyFmt, when } from "./inventoryUi";

// Parts of the job that go on the invoice (issued - returned)
function InvoiceModal({ jobId, onClose }) {
  const { data } = useInvGetQuery(`jobs/${jobId}/invoice-parts`);
  const print = () => {
    if (!data) return;
    const rows = data.lines.map((l) => `<tr><td>${l.name}${l.partNo ? ` <small>(${l.partNo})</small>` : ""}</td><td style="text-align:right">${qtyFmt(l.qty)}</td><td style="text-align:right">${money(l.unitPrice)}</td><td style="text-align:right">${money(l.amount)}</td></tr>`).join("");
    const w = window.open("", "_blank", "width=800,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Parts ${data.job.jobNo}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style></head><body>
      <h2>Spare parts used · ${data.job.jobNo}</h2><p>Vehicle: <b>${data.job.regNo}</b> &nbsp; Customer: <b>${data.job.customerName}</b></p>
      <table><thead><tr><th>Part</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit price</th><th style="text-align:right">Amount (LKR)</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3" style="text-align:right"><b>Total</b></td><td style="text-align:right"><b>${money(data.total)}</b></td></tr></tfoot></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  return (
    <Modal show onHide={onClose} size="lg" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton><Modal.Title className="fs-5">Parts for the invoice{data && <div className="small text-muted fw-normal">{data.job.jobNo} · {data.job.regNo} · {data.job.customerName}</div>}</Modal.Title></Modal.Header>
      <Modal.Body>
        {!data ? <Loader /> : data.lines.length === 0 ? <Empty text="No issued parts" /> : (
          <Table responsive className="align-middle mb-0">
            <thead className="table-light"><tr><th>Part</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th className="text-end">Amount (LKR)</th></tr></thead>
            <tbody>{data.lines.map((l) => <tr key={l.id}><td><div className="fw-semibold">{l.name}</div><small className="text-muted">{[l.partNo, l.brand, l.quality].filter(Boolean).join(" · ")}</small></td><td className="text-end">{qtyFmt(l.qty)}</td><td className="text-end">{money(l.unitPrice)}</td><td className="text-end fw-semibold">{money(l.amount)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={3} className="text-end fw-semibold">Total</td><td className="text-end fw-bold">LKR {money(data.total)}</td></tr></tfoot>
          </Table>
        )}
        <Alert variant="light" className="border small mt-3 mb-0">Only issued parts (minus returned parts) are listed. An invoice module can read these lines from <code>GET /evidence/inventory/jobs/{jobId}/invoice-parts</code>.</Alert>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={print} disabled={!data?.lines.length}><Icon icon="mdi:printer-outline" width="18" height="18" /> Print</Button></Modal.Footer>
    </Modal>
  );
}
function InvoicePartsPanel() {
  const { data = [], isLoading, isError, refetch } = useInvGetQuery("invoice-parts");
  const [openId, setOpenId] = useState(null);
  return (
    <Panel title={<>Parts for invoice <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:receipt-text-outline">
      {isLoading ? <Loader /> : isError ? <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert> : data.length === 0 ? <Empty text="No jobs with issued parts yet" icon="mdi:receipt-text-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Job</th><th>Customer</th><th>Department</th><th className="text-end">Parts</th><th className="text-end">Amount (LKR)</th><th>Last issue</th><th>Job status</th><th /></tr></thead>
          <tbody>
            {data.map((j) => (
              <tr key={j.jobId}>
                <td><div className="fw-semibold">{j.jobNo}</div><small className="text-muted">{j.regNo}</small></td>
                <td>{j.customerName}</td><td className="small">{j.department}</td>
                <td className="text-end">{j.lines}</td><td className="text-end fw-semibold">{money(j.amount)}</td>
                <td className="small text-nowrap">{when(j.lastIssue)}</td>
                <td><StatusBadge status={j.status === "COMPLETED" ? "Completed" : "In progress"} /></td>
                <td className="text-end"><Button size="sm" variant="outline-primary" onClick={() => setOpenId(j.jobId)}>View / print</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {openId && <InvoiceModal jobId={openId} onClose={() => setOpenId(null)} />}
    </Panel>
  );
}

// Job card integration: parts reserve -> issue to technician -> return -> invoice. Third-party quotations too.
export default function JobCardsTab() {
  const [sub, setSub] = useState("orders");
  return (
    <>
      <SubTabs
        active={sub}
        onChange={setSub}
        tabs={[
          { key: "orders", label: "Spare part orders", icon: "mdi:clipboard-list-outline" },
          { key: "quotes", label: "Third-party quotes", icon: "mdi:file-document-edit-outline" },
          { key: "invoice", label: "Parts for invoice", icon: "mdi:receipt-text-outline" },
        ]}
      />
      {sub === "orders" && <OrdersTab />}
      {sub === "quotes" && <QuotesTab />}
      {sub === "invoice" && <InvoicePartsPanel />}
    </>
  );
}