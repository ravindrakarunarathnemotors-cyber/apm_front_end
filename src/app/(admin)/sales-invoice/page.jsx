"use client";

// Finance > Sales Invoice   ->   src\app\sales-invoice\page.jsx   (route /sales-invoice)
// Lists every invoice (one per job). Click a row to open the invoice / payments window.
import { useEffect, useState } from "react";
import { Alert, Badge, Button, ButtonGroup, FormControl, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetSalesInvoicesQuery } from "./salesInvoiceApi";             // <- place salesInvoiceApi.js next to this page.jsx
import NewSaleModal from "./NewSaleModal";                          // <- place NewSaleModal.jsx next to this page.jsx
import InvoiceModal from "../crm/components/InvoiceModal";   // src/app/(admin)/crm/components/InvoiceModal.jsx

const money = (n) => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const STATUS = {
  UNPAID: { label: "Unpaid", bg: "#fee2e2", fg: "#991b1b" },
  PARTIAL: { label: "Partially paid", bg: "#fef3c7", fg: "#92400e" },
  PAID: { label: "Paid", bg: "#dcfce7", fg: "#166534" },
  CANCELLED: { label: "Cancelled", bg: "#e5e7eb", fg: "#4b5563" },
};
const FILTERS = [["", "All"], ["UNPAID", "Unpaid"], ["PARTIAL", "Partial"], ["PAID", "Paid"], ["CANCELLED", "Cancelled"]];
const Pill = ({ s }) => { const x = STATUS[s] || { label: s, bg: "#e5e7eb", fg: "#374151" }; return <span style={{ background: x.bg, color: x.fg, fontWeight: 600, fontSize: ".75rem", padding: "2px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{x.label}</span>; };

export default function SalesInvoicePage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQd] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openJob, setOpenJob] = useState(null);
  const [newSale, setNewSale] = useState(false);
  useEffect(() => { const h = setTimeout(() => { setQd(q.trim()); setPage(1); }, 350); return () => clearTimeout(h); }, [q]);

  // use the full content width while this page is open (other pages are not affected)
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-sales-invoice-wide", "1");
    style.textContent = ".page-content > .container-xxl { max-width: 100% !important; }";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const { data, isLoading, isFetching, isError, refetch } = useGetSalesInvoicesQuery({ q: qDebounced, status, from, to, page, pageSize: 20 }, { refetchOnMountOrArgChange: true });
  const rows = data?.invoices || [];
  const S = data?.summary || { count: 0, invoiced: 0, collected: 0, outstanding: 0, open: 0 };
  const todayText = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const setF = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <div className="container-fluid px-0" style={{ width: "100%", maxWidth: "none" }}>
      <style>{`
        .si-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
        .si-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
        .si-kpi .ic { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; flex: 0 0 40px; background: #111827; color: #fff; }
        .si-kpi small { color: #6b7280; display: block; } .si-kpi b { font-size: 1.15rem; }
        .si-plate { font-weight: 700; font-size: .74rem; letter-spacing: .04em; padding: 0 7px; border: 1.5px solid #374151; border-radius: 5px; background: #fefce8; color: #111827; white-space: nowrap; }
        .si-lock { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; font-size: .68rem; font-weight: 700; white-space: nowrap; }
        .si-table tbody tr { cursor: pointer; } .si-table tbody tr:hover { background: #f3f4f6; }
        .si-table thead th { background: #111827 !important; color: #fff !important; white-space: nowrap; font-weight: 600; font-size: .8rem; }
        @media (max-width: 991.98px) { .si-kpis { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 575.98px) { .si-kpis { grid-template-columns: 1fr; } }
      `}</style>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 px-3 py-2 rounded border" style={{ backgroundColor: "#e5e7eb" }}>
        <h4 className="mb-0 text-dark d-flex align-items-center gap-2"><Icon icon="mdi:receipt-text-outline" width="26" height="26" /> Sales Invoice</h4>
        <div className="d-flex align-items-center gap-3"><span className="text-muted small">{todayText}</span><Button variant="dark" size="sm" className="d-flex align-items-center gap-1" onClick={() => setNewSale(true)}><Icon icon="mdi:plus" width="18" height="18" /> Create Invoice</Button></div>
      </div>

      <div className="si-kpis">
        <div className="si-kpi"><span className="ic"><Icon icon="mdi:file-document-multiple-outline" width="22" height="22" /></span><div><small>Invoices</small><b>{S.count}</b></div></div>
        <div className="si-kpi"><span className="ic"><Icon icon="mdi:cash-register" width="22" height="22" /></span><div><small>Invoiced (LKR)</small><b>{money(S.invoiced)}</b></div></div>
        <div className="si-kpi"><span className="ic"><Icon icon="mdi:cash-check" width="22" height="22" /></span><div><small>Collected (LKR)</small><b>{money(S.collected)}</b></div></div>
        <div className="si-kpi"><span className="ic"><Icon icon="mdi:cash-clock" width="22" height="22" /></span><div><small>Outstanding (LKR) · {S.open} open</small><b>{money(S.outstanding)}</b></div></div>
      </div>

      <div className="bg-white rounded-3 shadow-sm p-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="position-relative" style={{ width: 300, maxWidth: "100%" }}>
            <Icon icon="mdi:magnify" width="18" height="18" className="position-absolute text-muted" style={{ left: 10, top: 9 }} />
            <FormControl size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice no, job, vehicle, customer" style={{ paddingLeft: 32 }} />
          </div>
          <ButtonGroup size="sm">
            {FILTERS.map(([k, l]) => <Button key={k || "all"} variant={status === k ? "dark" : "outline-secondary"} onClick={() => setF(setStatus)(k)}>{l}</Button>)}
          </ButtonGroup>
          <div className="d-flex align-items-center gap-1 ms-auto">
            <FormControl size="sm" type="date" value={from} max={to || undefined} onChange={(e) => setF(setFrom)(e.target.value)} aria-label="From" style={{ width: 150 }} />
            <span className="text-muted small">to</span>
            <FormControl size="sm" type="date" value={to} min={from || undefined} onChange={(e) => setF(setTo)(e.target.value)} aria-label="To" style={{ width: 150 }} />
            {(from || to) && <Button size="sm" variant="outline-secondary" onClick={() => { setFrom(""); setTo(""); setPage(1); }}>Clear</Button>}
            <Button size="sm" variant="outline-secondary" onClick={refetch} title="Refresh">{isFetching ? <Spinner size="sm" /> : <Icon icon="mdi:refresh" width="18" height="18" />}</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-5"><Spinner /></div>
        ) : isError ? (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-0"><span>Failed to load the invoices.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted py-5"><Icon icon="mdi:receipt-text-outline" width="44" height="44" /><div>No invoices found</div></div>
        ) : (
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0 si-table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Job</th><th>Vehicle</th><th>Customer</th><th className="text-end">Total</th><th className="text-end">Paid</th><th className="text-end">Balance</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpenJob(r.ref)}>
                    <td className="fw-semibold">{r.invoiceNo}</td>
                    <td>{day(r.createdAt)}</td>
                    <td>{r.isSale ? <span className="badge bg-secondary">Counter sale</span> : <>{r.jobNo}{r.isCancelFee && <div><span className="si-lock"><Icon icon="mdi:cancel" width="12" height="12" /> Cancellation fee</span></div>}</>}</td>
                    <td><span className="si-plate">{r.regNo || "-"}</span></td>
                    <td style={{ maxWidth: 220 }} className="text-truncate">{r.customerName || "-"}</td>
                    <td className="text-end">{money(r.total)}</td>
                    <td className="text-end text-success">{money(r.paid)}{r.lastPaidAt && <div className="small text-muted">{day(r.lastPaidAt)}</div>}</td>
                    <td className="text-end fw-semibold" style={{ color: r.balance > 0 && r.status !== "CANCELLED" ? "#b45309" : "#6b7280" }}>{money(r.balance)}</td>
                    <td>
                      <Pill s={r.status} />
                      {!r.isSale && !r.isCancelFee && r.jobStatus !== "COMPLETED" && (
                        <div className="mt-1"><span className="si-lock" title={r.jobStatus === "CANCELLED" ? "The job was cancelled - this invoice is cancelled" : "Payments can be recorded after the job is completed"}><Icon icon={r.jobStatus === "CANCELLED" ? "mdi:cancel" : "mdi:lock-outline"} width="12" height="12" /> {r.jobStatus === "CANCELLED" ? "Job cancelled" : "Job not completed yet"}</span></div>
                      )}
                    </td>
                    <td className="text-end">{!r.isSale && !r.isCancelFee && r.jobStatus !== "COMPLETED" && r.jobStatus !== "CANCELLED"
                      ? <Button size="sm" variant="outline-secondary" title="View only - payments open after the job is completed" onClick={(e) => { e.stopPropagation(); setOpenJob(r.ref); }}><Icon icon="mdi:eye-outline" width="15" height="15" /> View</Button>
                      : <Button size="sm" variant="outline-dark" onClick={(e) => { e.stopPropagation(); setOpenJob(r.ref); }}>Open</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">Page {data.page} of {data.totalPages} · {S.count} invoices</small>
            <ButtonGroup size="sm">
              <Button variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}><Icon icon="mdi:chevron-left" width="18" height="18" /> Prev</Button>
              <Button variant="outline-secondary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next <Icon icon="mdi:chevron-right" width="18" height="18" /></Button>
            </ButtonGroup>
          </div>
        )}
      </div>

      {newSale && <NewSaleModal onHide={() => setNewSale(false)} onCreated={(ref) => { setNewSale(false); setOpenJob(ref); }} />}
      {openJob && <InvoiceModal key={`inv${openJob}`} jobId={openJob} editable onHide={() => setOpenJob(null)} onOpenInvoice={(ref) => setOpenJob(ref)} />}
    </div>
  );
}