"use client";

import { useEffect, useState } from "react";
import { Button, Form, FormControl, FormSelect, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useAddCatalogPartMutation, useSearchSpareCatalogQuery, useUpdateCatalogPartMutation } from "@/store/features/apiSlice";

// Spare parts master (Logistic & Stock department): search, add, change price / stock, hide.
// Props: brands[], qualities[], onHide
const money = (n) => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const blank = { partNo: "", name: "", brand: "", quality: "", price: "", stockQty: "" };

export default function SparePartsCatalogModal({ brands = [], qualities = [], onHide }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { data = [], isFetching } = useSearchSpareCatalogQuery({ q: dq, all: true });
  const [addPart, { isLoading: adding }] = useAddCatalogPartMutation();
  const [updatePart] = useUpdateCatalogPartMutation();
  const [form, setForm] = useState({ ...blank, quality: qualities[0] || "" });
  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || fb, icon: "error" });

  const add = async () => {
    try { await addPart(form).unwrap(); setForm({ ...blank, quality: form.quality }); } catch (ex) { fail(ex, "Could not add the spare part."); }
  };
  // one row edit: price / stock / active
  const patch = async (p, change) => {
    try { await updatePart({ id: p.id, partNo: p.partNo, name: p.name, brand: p.brand, quality: p.quality, price: p.price, stockQty: p.stockQty, isActive: p.isActive, ...change }).unwrap(); }
    catch (ex) { fail(ex, "Could not save the change."); }
  };

  return (
    <Modal show onHide={onHide} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton><Modal.Title className="fs-6">Spare parts catalog · price &amp; stock</Modal.Title></Modal.Header>
      <Modal.Body>
        <div className="border rounded p-2 mb-3 bg-light">
          <div className="fw-semibold small mb-1">Add a spare part</div>
          <div className="row g-2">
            <div className="col-6 col-md-2"><FormControl size="sm" placeholder="Part no" value={form.partNo} onChange={(e) => setForm({ ...form, partNo: e.target.value })} /></div>
            <div className="col-12 col-md-3"><FormControl size="sm" placeholder="Spare part name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-6 col-md-2"><FormSelect size="sm" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}><option value="">Brand</option>{brands.map((b) => <option key={b}>{b}</option>)}</FormSelect></div>
            <div className="col-6 col-md-2"><FormSelect size="sm" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })}>{qualities.map((b) => <option key={b}>{b}</option>)}</FormSelect></div>
            <div className="col-3 col-md-1"><FormControl size="sm" type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="col-3 col-md-1"><FormControl size="sm" type="number" min="0" placeholder="Stock" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} /></div>
            <div className="col-12 col-md-1 d-grid"><Button size="sm" disabled={adding} onClick={add}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button></div>
          </div>
        </div>
        <FormControl className="mb-2" placeholder="Search name / brand / part no" value={q} onChange={(e) => setQ(e.target.value)} />
        {isFetching && <Spinner size="sm" />}
        <Table size="sm" responsive hover className="align-middle">
          <thead><tr><th>Part no</th><th>Name</th><th>Brand</th><th>Quality</th><th style={{ width: 130 }}>Price (Rs.)</th><th style={{ width: 90 }}>Stock</th><th>Active</th></tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={7} className="text-muted small">No spare parts.</td></tr>}
            {data.map((p) => (
              <tr key={`${p.id}-${p.price}-${p.stockQty}`} className={p.isActive ? "" : "text-muted"}>
                <td>{p.partNo || "-"}</td><td>{p.name}</td><td>{p.brand || "-"}</td><td>{p.quality}</td>
                <td><FormControl size="sm" type="number" min="0" step="0.01" defaultValue={p.price} onBlur={(e) => e.target.value !== String(p.price) && patch(p, { price: e.target.value })} title={money(p.price)} /></td>
                <td><FormControl size="sm" type="number" min="0" defaultValue={p.stockQty} onBlur={(e) => e.target.value !== String(p.stockQty) && patch(p, { stockQty: e.target.value })} /></td>
                <td><Form.Check type="switch" id={`act-${p.id}`} checked={p.isActive} onChange={(e) => patch(p, { isActive: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}