"use client";

import { useEffect, useState } from "react";
import { Accordion, Alert, Badge, Button, ButtonGroup, Card, Col, Dropdown, Form, FormControl, FormSelect, InputGroup, Modal, ProgressBar, Row, Spinner, Tab, Table, Tabs } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddInventoryItemMutation, useGetInventoryItemsQuery,
  useGetInventoryLookupsQuery, useGetInventoryMovementsQuery, useInvGetQuery, usePostInventoryMovementMutation, useUpdateInventoryItemMutation,
} from "@/store/features/apiSlice";
import { Empty, Loader, MoveBadge, Panel, StatusBadge, money, qtyFmt, useSend, when } from "./inventoryUi";

const Lbl = (t) => <Form.Label className="small text-muted mb-1">{t}</Form.Label>;
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];   // same storage-host fix as the other windows
const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || fb, icon: "error" });

/* ---------- Add / edit item (General | Compatible vehicles | Alternate part numbers | Batches) ---------- */
function VehiclesPane({ itemId, draft, setDraft }) {   // itemId = saved item; otherwise draft list is kept until the item is saved
  const { data: saved, isFetching } = useInvGetQuery(`items/${itemId}/details`, { skip: !itemId });
  const data = itemId ? saved : { fitments: draft.map((x, i) => ({ ...x, id: i })) };
  const [send, busy] = useSend();
  const blank = { make: "", model: "", yearFrom: "", yearTo: "", note: "" };
  const [f, setF] = useState(blank);
  const add = async () => {
    if (!itemId) { if (!f.make.trim() && !f.model.trim()) return; setDraft([...draft, f]); setF(blank); return; }
    if (await send(`items/${itemId}/fitments`, f)) setF(blank);
  };
  const remove = (x) => (itemId ? send(`fitments/${x.id}`, undefined, "DELETE") : setDraft(draft.filter((_, i) => i !== x.id)));
  return (
    <>
      <Row className="g-2 mb-3 align-items-end">
        <Form.Group as={Col} xs={6} md={3}>{Lbl("Make")}<FormControl placeholder="e.g. Toyota" value={f.make} onChange={(e) => setF({ ...f, make: e.target.value })} /></Form.Group>
        <Form.Group as={Col} xs={6} md={3}>{Lbl("Model")}<FormControl placeholder="e.g. Axio" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></Form.Group>
        <Form.Group as={Col} xs={4} md={2}>{Lbl("Year from")}<FormControl type="number" placeholder="2010" value={f.yearFrom} onChange={(e) => setF({ ...f, yearFrom: e.target.value })} /></Form.Group>
        <Form.Group as={Col} xs={4} md={2}>{Lbl("Year to")}<FormControl type="number" placeholder="2020" value={f.yearTo} onChange={(e) => setF({ ...f, yearTo: e.target.value })} /></Form.Group>
        <Col xs={4} md={2} className="d-grid"><Button disabled={busy} onClick={add}><Icon icon="mdi:plus" width="18" height="18" /> Add</Button></Col>
      </Row>
      {itemId && isFetching && !data ? <Loader /> : !data?.fitments.length ? <Empty text="No compatible vehicles added yet" icon="mdi:car-outline" /> : (
        <Table size="sm" className="align-middle mb-0">
          <thead className="table-light"><tr><th>Make</th><th>Model</th><th>Years</th><th /></tr></thead>
          <tbody>
            {data.fitments.map((x) => (
              <tr key={x.id}><td>{x.make}</td><td>{x.model}</td><td>{x.yearFrom || "any"} – {x.yearTo || "any"}</td>
                <td className="text-end"><Button size="sm" variant="outline-danger" onClick={() => remove(x)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button></td></tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
function AlternatesPane({ itemId, draft, setDraft }) {
  const { data: saved, isFetching } = useInvGetQuery(`items/${itemId}/details`, { skip: !itemId });
  const data = itemId ? saved : { alternates: draft.map((x, i) => ({ ...x, id: i })) };
  const [send, busy] = useSend();
  const blank = { altPartNo: "", brand: "", kind: "ALTERNATE", note: "" };
  const [f, setF] = useState(blank);
  const add = async () => {
    if (!itemId) { if (!f.altPartNo.trim()) return; setDraft([...draft, f]); setF(blank); return; }
    if (await send(`items/${itemId}/alternates`, f)) setF(blank);
  };
  const remove = (x) => (itemId ? send(`alternates/${x.id}`, undefined, "DELETE") : setDraft(draft.filter((_, i) => i !== x.id)));
  return (
    <>
      <Row className="g-2 mb-3 align-items-end">
        <Form.Group as={Col} xs={6} md={3}>{Lbl("Part number")}<FormControl placeholder="e.g. 04465-12345" value={f.altPartNo} onChange={(e) => setF({ ...f, altPartNo: e.target.value })} /></Form.Group>
        <Form.Group as={Col} xs={6} md={3}>{Lbl("Brand")}<FormControl placeholder="e.g. Bosch" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></Form.Group>
        <Form.Group as={Col} xs={6} md={3}>{Lbl("Type")}<FormSelect value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="ALTERNATE">Alternate</option><option value="SUPERSEDED">Superseded by</option></FormSelect></Form.Group>
        <Col xs={6} md={3} className="d-grid"><Button disabled={busy} onClick={add}><Icon icon="mdi:plus" width="18" height="18" /> Add</Button></Col>
      </Row>
      {itemId && isFetching && !data ? <Loader /> : !data?.alternates.length ? <Empty text="No alternate part numbers yet" icon="mdi:swap-horizontal" /> : (
        <Table size="sm" className="align-middle mb-0">
          <thead className="table-light"><tr><th>Part number</th><th>Brand</th><th>Type</th><th /></tr></thead>
          <tbody>
            {data.alternates.map((x) => (
              <tr key={x.id}><td className="fw-semibold">{x.altPartNo}</td><td>{x.brand || "-"}</td><td><StatusBadge status={x.kind === "SUPERSEDED" ? "Superseded" : "Alternate"} bg={x.kind === "SUPERSEDED" ? "dark" : "info"} /></td>
                <td className="text-end"><Button size="sm" variant="outline-danger" onClick={() => remove(x)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button></td></tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
function BatchesPane({ itemId }) {
  const { data, isFetching } = useInvGetQuery(`items/${itemId}/details`);
  if (isFetching && !data) return <Loader />;
  if (!data?.batches.length) return <Empty text="No batches in stock. Batches are recorded when stock is received." icon="mdi:barcode" />;
  return (
    <Table size="sm" className="align-middle mb-0">
      <thead className="table-light"><tr><th>Batch</th><th>Location</th><th>Expiry</th><th className="text-end">Qty</th></tr></thead>
      <tbody>{data.batches.map((x) => <tr key={x.id}><td>{x.batchNo}</td><td>{x.location}</td><td>{x.expiryDate ? x.expiryDate.slice(0, 10) : "-"}</td><td className="text-end">{qtyFmt(x.qty)}</td></tr>)}</tbody>
    </Table>
  );
}

/* ---------- Manage a list: add, rename, active / hidden  (categories, units of measure, quality) ---------- */
function ManageListModal({ title, subtitle, icon, listPath, createPath, createExtra, itemPath, addPlaceholder, onClose }) {
  const { data = [], isLoading } = useInvGetQuery(listPath);
  const [send, busy] = useSend();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const add = async () => { if (!name.trim()) return; if (await send(createPath, { ...createExtra, name: name.trim() })) setName(""); };
  const rename = async (c) => { if (!editName.trim()) return; if (await send(`${itemPath}/${c.id}`, { name: editName.trim(), isActive: c.isActive }, "PUT")) setEditId(null); };
  const toggle = (c) => send(`${itemPath}/${c.id}`, { name: c.name, isActive: !c.isActive }, "PUT");
  return (
    <Modal show onHide={onClose} centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary" style={{ width: 40, height: 40 }}><Icon icon={icon} width="22" height="22" /></span>
          <span>{title}<div className="small text-muted fw-normal">{subtitle}</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <InputGroup className="mb-3">
          <InputGroup.Text className="bg-light"><Icon icon="mdi:plus-circle-outline" width="18" height="18" /></InputGroup.Text>
          <FormControl value={name} onChange={(e) => setName(e.target.value)} placeholder={addPlaceholder} autoComplete="off" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button disabled={busy || !name.trim()} onClick={add}><Icon icon="mdi:plus" width="18" height="18" /> Add</Button>
        </InputGroup>
        {isLoading ? <Loader /> : data.length === 0 ? <Empty text="Nothing here yet" icon={icon} /> : (
          <div className="list-group">
            {data.map((c) => (
              <div key={c.id} className={`list-group-item d-flex align-items-center gap-2 ${c.isActive ? "" : "bg-light"}`}>
                {editId === c.id ? (
                  <>
                    <FormControl size="sm" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(c); if (e.key === "Escape") setEditId(null); }} />
                    <Button size="sm" variant="success" disabled={busy} onClick={() => rename(c)} title="Save"><Icon icon="mdi:check" width="16" height="16" /></Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setEditId(null)} title="Cancel"><Icon icon="mdi:close" width="16" height="16" /></Button>
                  </>
                ) : (
                  <>
                    <div className={`flex-grow-1 ${c.isActive ? "" : "text-muted"}`}>
                      <div className="fw-semibold">{c.name}</div>
                      <small className="text-muted">{c.itemCount} item{c.itemCount === 1 ? "" : "s"}{c.isActive ? "" : " · hidden"}</small>
                    </div>
                    <Button size="sm" variant="outline-secondary" onClick={() => { setEditId(c.id); setEditName(c.name); }} title="Rename"><Icon icon="mdi:pencil-outline" width="16" height="16" /></Button>
                    <Form.Check type="switch" id={`${itemPath}-${c.id}`} checked={c.isActive} disabled={busy} onChange={() => toggle(c)} title={c.isActive ? "Active - click to hide" : "Hidden - click to activate"} className="mb-0" />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <small className="text-muted d-block mt-3"><Icon icon="mdi:information-outline" width="14" height="14" /> Hidden entries are not offered for new items. Renaming also renames it on existing items.</small>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onClose}>Close</Button></Modal.Footer>
    </Modal>
  );
}
const CategoriesModal = ({ onClose }) => <ManageListModal title="Categories" subtitle="Add, rename or hide categories" icon="mdi:shape-outline" listPath="categories" createPath="categories" itemPath="categories" addPlaceholder="New category name" onClose={onClose} />;
const UnitsModal = ({ onClose }) => <ManageListModal title="Units of measure" subtitle="Nos, Litre, Set, Kg ..." icon="mdi:ruler" listPath="options?kind=UNIT" createPath="options" createExtra={{ kind: "UNIT" }} itemPath="options" addPlaceholder="New unit (e.g. Drum)" onClose={onClose} />;
const BinsModal = ({ onClose }) => <ManageListModal title="Bin / rack locations" subtitle="Rack A-3, Shelf 2, Tyre rack ..." icon="mdi:shelf" listPath="options?kind=BIN" createPath="options" createExtra={{ kind: "BIN" }} itemPath="options" addPlaceholder="New bin / rack (e.g. Rack A-3)" onClose={onClose} />;
const QualitiesModal = ({ onClose }) => <ManageListModal title="Quality" subtitle="Genuine, Recondition, Low quality ..." icon="mdi:medal-outline" listPath="options?kind=QUALITY" createPath="options" createExtra={{ kind: "QUALITY" }} itemPath="options" addPlaceholder="New quality (e.g. Aftermarket)" onClose={onClose} />;

/* Dropdown with a "+ Add new" option. New values are used when the item is saved and then show up in the list for every item. */
const UNITS = ["Nos", "Pcs", "Set", "Pair", "Kit", "Litre", "ml", "Gallon", "Can", "Bottle", "Drum", "Kg", "g", "Metre", "Roll", "Box", "Packet", "Tube"];
const BRANDS = ["Genuine (OEM)", "Toyota", "Nissan", "Honda", "Suzuki", "Mitsubishi", "Mazda", "Bosch", "Denso", "NGK", "Aisin", "KYB", "Monroe", "Brembo", "Akebono", "TRW", "Gates", "Mann", "Mahle", "Hella", "Philips", "Osram", "Castrol", "Mobil", "Shell", "Total", "Valvoline", "Liqui Moly", "Motul", "Michelin", "Bridgestone", "Dunlop", "Yokohama", "DSI", "Exide", "Amaron", "Lucas"];
function CreatableSelect({ value, onChange, options, extra = [], placeholder, addLabel, icon, onAdd, onManage }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const all = Array.from(new Set([...options, ...extra, ...(value ? [value] : [])].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const confirm = async () => { const v = text.trim(); if (!v) return; if (onAdd && (await onAdd(v)) === false) return; onChange(v); setText(""); setAdding(false); };
  if (adding) {
    return (
      <InputGroup>
        <InputGroup.Text className="bg-light"><Icon icon="mdi:plus-circle-outline" width="18" height="18" color="#198754" /></InputGroup.Text>
        <FormControl autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={addLabel} autoComplete="off"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirm(); } if (e.key === "Escape") setAdding(false); }} />
        <Button variant="success" onClick={confirm} title="Add"><Icon icon="mdi:check" width="18" height="18" /></Button>
        <Button variant="outline-secondary" onClick={() => { setAdding(false); setText(""); }} title="Cancel"><Icon icon="mdi:close" width="18" height="18" /></Button>
      </InputGroup>
    );
  }
  return (
    <InputGroup>
      <InputGroup.Text className="bg-light"><Icon icon={icon} width="18" height="18" /></InputGroup.Text>
      <FormSelect value={value || ""} onChange={(e) => (e.target.value === "__new" ? setAdding(true) : onChange(e.target.value))}>
        <option value="">{placeholder}</option>
        {all.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__new">+ Add new...</option>
      </FormSelect>
      {onManage && <Button variant="outline-secondary" onClick={onManage} title="Manage this list"><Icon icon="mdi:cog-outline" width="18" height="18" /></Button>}
    </InputGroup>
  );
}

function ItemModal({ item, lookups, onClose }) {
  const [addItem, { isLoading: adding }] = useAddInventoryItemMutation();
  const [updateItem, { isLoading: saving }] = useUpdateInventoryItemMutation();
  const [send] = useSend();
  const [manage, setManage] = useState(null);   // "UNIT" | "QUALITY"
  const addOption = async (kind, name) => (await send("options", { kind, name })) !== null;
  const [uploading, setUploading] = useState(false);
  const [mMode, setMMode] = useState("pct");   // profit entry mode: "pct" (% on cost) | "amt" (Rs.)
  const [mv, setMv] = useState(null);          // text typed in the profit box (null = show the value worked out from cost & price)
  const [fits, setFits] = useState([]);   // compatible vehicles / alternate numbers entered before the item is saved
  const [alts, setAlts] = useState([]);
  const [form, setForm] = useState(() => ({
    name: item?.name || "", partNo: item?.partNo || "", oemNo: item?.oemNo || "", sku: item?.sku || "", barcode: item?.barcode || "",
    categoryId: item?.categoryId || lookups.categories[0]?.id || "", brand: item?.brand || "", quality: item?.quality || "Standard", unit: item?.unit || "Nos",
    price: item?.price ?? "", costPrice: item?.costPrice ?? "", reorderLevel: item?.reorderLevel ?? 0, reorderQty: item?.reorderQty ?? 0,
    binLocation: item?.binLocation || "", description: item?.description || "", imageUrl: item?.imageUrl || "", supplierId: item?.supplierId || "", trackBatch: !!item?.trackBatch, isActive: item?.isActive !== false,
  }));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async () => {
    try {
      if (item) await updateItem({ id: item.id, ...form }).unwrap();
      else {
        const r = await addItem(form).unwrap();
        for (const x of fits) await send(`items/${r.id}/fitments`, x);
        for (const x of alts) await send(`items/${r.id}/alternates`, x);
      }
      onClose();
    } catch (ex) { fail(ex, "Could not save the item."); }
  };
  const L = Lbl;
  const pickImage = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return Swal.fire({ title: "Images only", text: "Choose a JPG, PNG or WEBP photo.", icon: "warning" });
    if (file.size > 8 * 1024 * 1024) return Swal.fire({ title: "File too large", text: "The photo must be under 8 MB.", icon: "warning" });
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
      setForm((f) => ({ ...f, imageUrl: URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl }));
    } catch (ex) { fail({ data: { message: ex.message } }, "Upload failed"); } finally { setUploading(false); }
  };
  const Ic = ({ icon, color }) => <InputGroup.Text className="bg-light"><Icon icon={icon} width="18" height="18" color={color} /></InputGroup.Text>;
  const Section = ({ icon, title }) => <Col xs={12}><div className="d-flex align-items-center gap-2 text-muted fw-semibold small text-uppercase mt-2"><Icon icon={icon} width="16" height="16" />{title}<hr className="flex-grow-1 m-0 ms-2" /></div></Col>;
  const cost = Number(form.costPrice) || 0, sell = Number(form.price) || 0;
  const profitAmt = sell > 0 && cost > 0 ? sell - cost : null;
  const profitPct = profitAmt !== null ? (profitAmt / cost) * 100 : null;
  const derived = profitAmt === null ? "" : String(Math.round((mMode === "pct" ? profitPct : profitAmt) * 100) / 100);
  const setProfit = (v) => {
    setMv(v);
    const n = Number(v);
    if (v === "" || !Number.isFinite(n) || cost <= 0) return;
    const price = mMode === "pct" ? cost * (1 + n / 100) : cost + n;
    setForm((f) => ({ ...f, price: String(Math.max(0, Math.round(price * 100) / 100)) }));
  };
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary" style={{ width: 40, height: 40 }}><Icon icon={item ? "mdi:package-variant-closed" : "mdi:package-variant-plus"} width="22" height="22" /></span>
          <span>{item ? "Edit item" : "Add item"}{item && <div className="small text-muted fw-normal">{item.name}</div>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs defaultActiveKey="general" className="mb-3" mountOnEnter>
          <Tab eventKey="general" title={<><Icon icon="mdi:clipboard-text-outline" width="16" height="16" /> General</>}>
            <Accordion alwaysOpen defaultActiveKey={["basic", "pricing"]} className="mb-2">
            <Accordion.Item eventKey="basic">
              <Accordion.Header><Icon icon="mdi:tag-outline" width="20" height="20" className="me-2 text-primary" /><span><span className="fw-semibold">Basic details</span><div className="small text-muted fw-normal">Name, category, part no, brand, unit</div></span></Accordion.Header>
              <Accordion.Body><Row className="g-3">
              <Form.Group as={Col} md={8}>{L("Item name *")}<InputGroup><Ic icon="mdi:cube-outline" /><FormControl value={form.name} onChange={set("name")} placeholder="e.g. Brake pad set - front" autoComplete="off" autoFocus /></InputGroup></Form.Group>
              <Form.Group as={Col} md={4}>
                {L("Category *")}
                <InputGroup><Ic icon="mdi:shape-outline" /><FormSelect value={form.categoryId} onChange={set("categoryId")}>{item && !lookups.categories.some((c) => c.id === item.categoryId) && <option value={item.categoryId}>{item.categoryName} (hidden)</option>}{lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</FormSelect></InputGroup>
              </Form.Group>
              <Form.Group as={Col} md={4}>{L("Part number (OEM)")}<InputGroup><Ic icon="mdi:pound" /><FormControl value={form.partNo} onChange={set("partNo")} autoComplete="off" /></InputGroup></Form.Group>
              <Form.Group as={Col} md={4}>{L("Internal SKU")}<InputGroup><Ic icon="mdi:identifier" /><FormControl value={form.sku} onChange={set("sku")} autoComplete="off" /></InputGroup></Form.Group>
              <Form.Group as={Col} md={4}>{L("Barcode")}<InputGroup><Ic icon="mdi:barcode" /><FormControl value={form.barcode} onChange={set("barcode")} autoComplete="off" /></InputGroup></Form.Group>
              <Form.Group as={Col} md={4}>
                {L("Brand")}
                <CreatableSelect value={form.brand} onChange={(v) => setForm((f) => ({ ...f, brand: v }))} options={BRANDS} extra={lookups.brands} placeholder="Select brand" addLabel="New brand name" icon="mdi:star-circle-outline" />
              </Form.Group>
              <Form.Group as={Col} md={4}>
                {L("Quality")}
                <CreatableSelect value={form.quality} onChange={(v) => setForm((f) => ({ ...f, quality: v }))} options={["Standard", ...lookups.qualities]} placeholder="Select quality" addLabel="New quality (e.g. Aftermarket)" icon="mdi:medal-outline" onAdd={(v) => addOption("QUALITY", v)} onManage={() => setManage("QUALITY")} />
              </Form.Group>
              <Form.Group as={Col} md={4}>
                {L("Unit of measure")}
                <CreatableSelect value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} options={lookups.units?.length ? lookups.units : UNITS} placeholder="Select unit" addLabel="New unit (e.g. Drum)" icon="mdi:ruler" onAdd={(v) => addOption("UNIT", v)} onManage={() => setManage("UNIT")} />
              </Form.Group>

            </Row></Accordion.Body></Accordion.Item>
            <Accordion.Item eventKey="pricing">
              <Accordion.Header><Icon icon="mdi:cash-multiple" width="20" height="20" className="me-2 text-primary" /><span><span className="fw-semibold">Pricing</span><div className="small text-muted fw-normal">Cost, profit, selling price and supplier</div></span></Accordion.Header>
              <Accordion.Body><Row className="g-3">
              <Form.Group as={Col} xs={6} md={4}>{L("Cost price")}<InputGroup><InputGroup.Text className="bg-light small">Rs.</InputGroup.Text><FormControl type="number" min="0" value={form.costPrice} onChange={(e) => { setMv(null); set("costPrice")(e); }} /></InputGroup></Form.Group>
              <Form.Group as={Col} xs={6} md={4}>{L("Selling price")}<InputGroup><InputGroup.Text className="bg-light small">Rs.</InputGroup.Text><FormControl type="number" min="0" value={form.price} onChange={(e) => { setMv(null); set("price")(e); }} /></InputGroup></Form.Group>
              <Form.Group as={Col} xs={12} md={4}>
                {L("Profit - sets the selling price")}
                <InputGroup>
                  <Ic icon="mdi:trending-up" color="#198754" />
                  <FormControl type="number" min="0" step="any" value={mv ?? derived} onChange={(e) => setProfit(e.target.value)} disabled={cost <= 0} placeholder={cost <= 0 ? "Enter cost first" : "0"} />
                  <Button variant={mMode === "pct" ? "primary" : "outline-secondary"} onClick={() => { setMMode("pct"); setMv(null); }}>%</Button>
                  <Button variant={mMode === "amt" ? "primary" : "outline-secondary"} onClick={() => { setMMode("amt"); setMv(null); }}>Rs.</Button>
                </InputGroup>
                {profitAmt !== null && <small className={profitAmt >= 0 ? "text-success" : "text-danger"}>Profit Rs. {profitAmt.toFixed(2)} · {profitPct.toFixed(1)}% on cost · margin {((profitAmt / sell) * 100).toFixed(1)}% of price</small>}
              </Form.Group>

            
              <Form.Group as={Col} xs={12} md={6}>
                {L("Preferred supplier")}
                <InputGroup><Ic icon="mdi:truck-outline" /><FormSelect value={form.supplierId} onChange={set("supplierId")}>
                  <option value="">No default supplier</option>
                  {(lookups.suppliers || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </FormSelect></InputGroup>
                <small className="text-muted">Used as the default when you order this item. Add suppliers in Purchasing.</small>
              </Form.Group>
            </Row></Accordion.Body></Accordion.Item>
            <Accordion.Item eventKey="stock">
              <Accordion.Header><Icon icon="mdi:warehouse" width="20" height="20" className="me-2 text-primary" /><span><span className="fw-semibold">Stock settings</span> <Badge bg="light" text="muted" className="border ms-2 fw-normal">Optional</Badge><div className="small text-muted fw-normal">Reorder level, bin, batch tracking</div></span></Accordion.Header>
              <Accordion.Body><Row className="g-3">
              <Form.Group as={Col} xs={6} md={4}>{L("Reorder level")}<InputGroup><Ic icon="mdi:alert-outline" color="#fd7e14" /><FormControl type="number" min="0" value={form.reorderLevel} onChange={set("reorderLevel")} /></InputGroup></Form.Group>
              <Form.Group as={Col} xs={6} md={4}>{L("Reorder qty")}<InputGroup><Ic icon="mdi:cart-arrow-down" /><FormControl type="number" min="0" value={form.reorderQty} onChange={set("reorderQty")} /></InputGroup></Form.Group>
              <Form.Group as={Col} md={4}>{L("Bin / rack location")}<CreatableSelect value={form.binLocation} onChange={(v) => setForm((f) => ({ ...f, binLocation: v }))} options={lookups.bins || []} placeholder="Select bin / rack" addLabel="New bin / rack (e.g. Rack A-3)" icon="mdi:shelf" onAdd={(v) => addOption("BIN", v)} onManage={() => setManage("BIN")} /></Form.Group>
              <Col xs={12} md={6}><div className="rounded border p-2 px-3"><Form.Check type="switch" id="inv-batch" label={<><Icon icon="mdi:calendar-clock-outline" width="18" height="18" /> Track batch &amp; expiry <small className="text-muted">(oil, coolant, brake fluid ...)</small></>} checked={form.trackBatch} onChange={set("trackBatch")} /></div></Col>
              {item && <Col xs={12} md={6}><div className="rounded border p-2 px-3"><Form.Check type="switch" id="inv-active" label={<><Icon icon="mdi:eye-outline" width="18" height="18" /> Active <small className="text-muted">(visible in Spare Part Review)</small></>} checked={form.isActive} onChange={set("isActive")} /></div></Col>}
            </Row></Accordion.Body></Accordion.Item>
            <Accordion.Item eventKey="desc">
              <Accordion.Header><Icon icon="mdi:image-text" width="20" height="20" className="me-2 text-primary" /><span><span className="fw-semibold">Description & photo</span> <Badge bg="light" text="muted" className="border ms-2 fw-normal">Optional</Badge><div className="small text-muted fw-normal">Notes and an item photo</div></span></Accordion.Header>
              <Accordion.Body><Row className="g-3">
              <Form.Group as={Col} md={8}>
                {L("Description")}
                <FormControl as="textarea" rows={5} maxLength={2000} value={form.description} onChange={set("description")} placeholder="Specification, fitting notes, warranty, anything the counter staff should know..." />
                <div className="text-end small text-muted">{form.description.length}/2000</div>
              </Form.Group>
              <Form.Group as={Col} md={4}>
                {L("Item photo")}
                <div className="border rounded d-flex flex-column align-items-center justify-content-center text-center p-2" style={{ minHeight: 140 }}>
                  {form.imageUrl ? (
                    <>
                      <a href={form.imageUrl} target="_blank" rel="noreferrer"><img src={form.imageUrl} alt="Item" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain" }} /></a>
                      <Button size="sm" variant="outline-danger" className="mt-2" onClick={() => setForm({ ...form, imageUrl: "" })}><Icon icon="mdi:delete-outline" width="16" height="16" /> Remove</Button>
                    </>
                  ) : (
                    <label className="w-100 py-3 text-muted" style={{ cursor: "pointer" }}>
                      {uploading ? <Spinner size="sm" /> : <Icon icon="mdi:image-plus-outline" width="34" height="34" />}
                      <div className="small mt-1">{uploading ? "Uploading..." : "Click to upload a photo"}</div>
                      <input type="file" accept="image/*" hidden disabled={uploading} onChange={pickImage} />
                    </label>
                  )}
                </div>
              </Form.Group>
            </Row></Accordion.Body></Accordion.Item>
            </Accordion>
              {!item && <div><small className="text-muted"><Icon icon="mdi:information-outline" width="14" height="14" /> New items start with 0 stock. Use Receive (or a Purchase Order) to add stock. Compatible vehicles and alternate part numbers can be added in their tabs; they are saved together with the item.</small></div>}
          </Tab>
          <Tab eventKey="vehicles" title={<><Icon icon="mdi:car-outline" width="16" height="16" /> Compatible vehicles{!item && fits.length > 0 ? ` (${fits.length})` : ""}</>}><VehiclesPane itemId={item?.id} draft={fits} setDraft={setFits} /></Tab>
          <Tab eventKey="alternates" title={<><Icon icon="mdi:swap-horizontal" width="16" height="16" /> Alternate part numbers{!item && alts.length > 0 ? ` (${alts.length})` : ""}</>}><AlternatesPane itemId={item?.id} draft={alts} setDraft={setAlts} /></Tab>
          {item && <Tab eventKey="batches" title={<><Icon icon="mdi:barcode" width="16" height="16" /> Batches</>}><BatchesPane itemId={item.id} /></Tab>}
        </Tabs>
      </Modal.Body>
      {manage === "UNIT" && <UnitsModal onClose={() => setManage(null)} />}
      {manage === "QUALITY" && <QualitiesModal onClose={() => setManage(null)} />}
      {manage === "BIN" && <BinsModal onClose={() => setManage(null)} />}
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}><Icon icon="mdi:close" width="18" height="18" /> Close</Button>
        <Button disabled={adding || saving || uploading} onClick={save}><Icon icon="mdi:content-save-outline" width="18" height="18" /> {adding || saving ? "Saving..." : item ? "Save changes" : "Save item"}</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ---------- Receive / Issue / Return / Adjust / Scrap ---------- */
// Adjust / scrap / found / lost are NOT done here: they need approval (Stock Control > Adjustments).
const MOVES = {
  GRN: { title: "Receive stock (GRN)", sub: "Stock comes in from a supplier", icon: "mdi:package-down", tone: "success", cost: true, ref: "Supplier invoice / GRN no", sign: 1, btn: "Receive stock" },
  ISSUE: { title: "Issue stock", sub: "Stock goes out to a job or department", icon: "mdi:package-up", tone: "warning", ref: "Department / job no", sign: -1, btn: "Issue stock" },
  RETURN: { title: "Return to stock", sub: "Unused stock comes back", icon: "mdi:undo-variant", tone: "info", ref: "Reference (job no ...)", sign: 1, btn: "Return to stock" },
};
function MovementModal({ item, type, lookups, onClose }) {
  const cfg = MOVES[type];
  const [post, { isLoading }] = usePostInventoryMovementMutation();
  const [f, setF] = useState({ locationId: lookups.locations[0]?.id || "", qty: "", unitCost: item.avgCost || item.costPrice || "", refNo: "", note: "", technician: "", batchNo: "", expiryDate: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const qty = Number(f.qty) || 0;
  const change = qty * cfg.sign;
  const after = item.onHand + change;
  const value = qty * (Number(f.unitCost) || 0);
  const ready = qty > 0 && after >= 0 && (!cfg.cost || Number(f.unitCost) > 0);
  const save = async () => {
    try { await post({ partId: item.id, type, ...f }).unwrap(); onClose(); } catch (ex) { fail(ex, "Could not update the stock."); }
  };
  const th = "bg-light text-muted fw-semibold small";
  const SectionHead = ({ icon, title }) => (
    <div className="d-flex align-items-center gap-2 px-3 py-2 bg-light border-bottom fw-semibold"><Icon icon={icon} width="18" height="18" className="text-primary" />{title}</div>
  );
  return (
    <Modal show onHide={onClose} size="lg" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-${cfg.tone}-subtle text-${cfg.tone}-emphasis`} style={{ width: 40, height: 40 }}><Icon icon={cfg.icon} width="22" height="22" /></span>
          <span>{cfg.title}<div className="small text-muted fw-normal">{cfg.sub}</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {/* 1. item */}
        <div className="border rounded bg-white mb-3 p-3 d-flex align-items-center gap-3">
          {item.imageUrl ? <img src={item.imageUrl} alt="" width="52" height="52" className="rounded border flex-shrink-0" style={{ objectFit: "cover" }} /> : <span className="d-inline-flex align-items-center justify-content-center rounded bg-light text-muted border flex-shrink-0" style={{ width: 52, height: 52 }}><Icon icon="mdi:image-outline" width="24" height="24" /></span>}
          <div className="flex-grow-1">
            <div className="fw-semibold">{item.name}</div>
            <small className="text-muted">{[item.partNo, item.brand, item.categoryName].filter(Boolean).join(" | ")}</small>
          </div>
          <div className="text-end"><div className="small text-muted">On hand</div><div className="fw-bold fs-5 lh-1">{qtyFmt(item.onHand)} <small className="text-muted fw-normal fs-6">{item.unit}</small></div></div>
        </div>

        {/* 2. details */}
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <SectionHead icon="mdi:clipboard-edit-outline" title="Details" />
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr>
                <th className={th} style={{ width: 150 }}>Quantity ({item.unit}) *</th>
                <td><FormControl type="number" min="0" step="any" value={f.qty} onChange={set("qty")} autoFocus isInvalid={f.qty !== "" && qty <= 0} /></td>
                <th className={th} style={{ width: 150 }}>Location</th>
                <td><FormSelect value={f.locationId} onChange={set("locationId")}>{lookups.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</FormSelect></td>
              </tr>
              {cfg.cost && (
                <tr>
                  <th className={th}>Unit cost (LKR) *</th>
                  <td><FormControl type="number" min="0" step="any" value={f.unitCost} onChange={set("unitCost")} isInvalid={f.unitCost !== "" && !(Number(f.unitCost) > 0)} /><small className="text-muted">per {item.unit}, what you paid the supplier</small></td>
                  <th className={th}>Total value</th>
                  <td className="fw-bold fs-5">LKR {money(value)}</td>
                </tr>
              )}
              <tr>
                <th className={th}>{cfg.ref}</th>
                <td colSpan={type === "ISSUE" ? 1 : 3}><FormControl value={f.refNo} onChange={set("refNo")} autoComplete="off" /></td>
                {type === "ISSUE" && <><th className={th}>Technician</th><td><InputGroup><InputGroup.Text className="bg-light"><Icon icon="mdi:account-wrench-outline" width="18" height="18" /></InputGroup.Text><FormControl value={f.technician} onChange={set("technician")} placeholder="Who takes the part" autoComplete="off" /></InputGroup></td></>}
              </tr>
              {item.trackBatch && type === "GRN" && (
                <tr>
                  <th className={th}>Batch no</th><td><FormControl value={f.batchNo} onChange={set("batchNo")} autoComplete="off" /></td>
                  <th className={th}>Expiry date</th><td><FormControl type="date" value={f.expiryDate} onChange={set("expiryDate")} /></td>
                </tr>
              )}
              <tr><th className={th}>Note</th><td colSpan={3}><FormControl value={f.note} onChange={set("note")} autoComplete="off" placeholder="Optional" /></td></tr>
            </tbody>
          </Table>
        </div>

        {/* 3. effect */}
        <div className={`rounded border p-3 d-flex align-items-center justify-content-around text-center ${after < 0 ? "border-danger bg-danger-subtle" : "bg-white"}`}>
          <div><div className="small text-muted">On hand now</div><div className="fs-5 fw-bold">{qtyFmt(item.onHand)}</div></div>
          <Icon icon="mdi:arrow-right" width="22" height="22" className="text-muted" />
          <div><div className="small text-muted">{type === "ISSUE" ? "Issued" : "Added"}</div><div className={`fs-5 fw-bold ${change < 0 ? "text-danger" : change > 0 ? "text-success" : "text-muted"}`}>{change > 0 ? "+" : ""}{qtyFmt(change)}</div></div>
          <Icon icon="mdi:arrow-right" width="22" height="22" className="text-muted" />
          <div><div className="small text-muted">After</div><div className={`fs-5 fw-bold ${after < 0 ? "text-danger" : ""}`}>{qtyFmt(after)} <small className="text-muted fw-normal">{item.unit}</small></div></div>
        </div>
        {after < 0 && <div className="small text-danger mt-2">Not enough stock to issue this quantity.</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}><Icon icon="mdi:close" width="18" height="18" /> Cancel</Button>
        <Button variant={cfg.tone} disabled={isLoading || !ready} onClick={save}><Icon icon={cfg.icon} width="18" height="18" /> {isLoading ? "Saving..." : cfg.btn}</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ---------- History ---------- */
function HistoryModal({ item, onClose }) {
  const { data, isFetching } = useGetInventoryMovementsQuery(item.id);
  const [f, setF] = useState({ type: "", from: "", to: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const all = data?.movements || [];
  const balances = data?.balances || [];
  const onHand = balances.reduce((sum, b) => sum + b.onHand, 0);
  const reserved = balances.reduce((sum, b) => sum + (b.reserved || 0), 0);
  // balance after each movement: work backwards from today's on hand (newest first)
  let run = onHand;
  const withBalance = all.map((m) => { const row = { ...m, balance: run }; run -= m.qty; return row; });
  const types = Array.from(new Set(all.map((m) => m.type)));
  const rows = withBalance.filter((m) => {
    if (f.type && m.type !== f.type) return false;
    const day = String(m.createdAt || "").slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
  const totalIn = rows.filter((m) => m.qty > 0).reduce((sum, m) => sum + m.qty, 0);
  const totalOut = rows.filter((m) => m.qty < 0).reduce((sum, m) => sum + m.qty, 0);
  const filtered = Object.values(f).some(Boolean);
  const Stat = ({ icon, label, value, tone = "primary" }) => (
    <div className="flex-fill border rounded bg-white p-2 px-3 d-flex align-items-center gap-2">
      <span className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-${tone}-subtle text-${tone}`} style={{ width: 36, height: 36 }}><Icon icon={icon} width="20" height="20" /></span>
      <div><div className="small text-muted">{label}</div><div className="fw-bold lh-1">{value}</div></div>
    </div>
  );
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-info-subtle text-info-emphasis" style={{ width: 40, height: 40 }}><Icon icon="mdi:history" width="22" height="22" /></span>
          <span>Stock history<div className="small text-muted fw-normal">{item.name}{item.partNo ? ` · ${item.partNo}` : ""}</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {/* 1. summary */}
        <div className="d-flex flex-wrap gap-2 mb-2">
          <Stat icon="mdi:package-variant-closed" label="On hand" value={`${qtyFmt(onHand)} ${item.unit}`} />
          <Stat icon="mdi:lock-outline" label="Reserved" value={qtyFmt(reserved)} tone="warning" />
          <Stat icon="mdi:check-circle-outline" label="Available" value={qtyFmt(onHand - reserved)} tone="success" />
          <Stat icon="mdi:cash-multiple" label="Stock value (avg cost)" value={`LKR ${money(onHand * (item.avgCost || 0))}`} tone="info" />
        </div>
        {balances.length > 1 && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {balances.map((b) => <Badge key={b.location} bg="light" text="dark" className="border fw-semibold"><Icon icon="mdi:warehouse" width="14" height="14" /> {b.location}: {qtyFmt(b.onHand)}{b.reserved > 0 && ` (reserved ${qtyFmt(b.reserved)})`}</Badge>)}
          </div>
        )}

        {/* 2. filters */}
        <div className="border rounded p-2 mb-3 bg-light">
          <Row className="g-2 align-items-end">
            <Form.Group as={Col} xs={12} md={4}><Form.Label className="small text-muted mb-1">Movement type</Form.Label><FormSelect value={f.type} onChange={set("type")}><option value="">All types</option>{types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</FormSelect></Form.Group>
            <Form.Group as={Col} xs={6} md={3}><Form.Label className="small text-muted mb-1">Date From</Form.Label><FormControl type="date" value={f.from} max={f.to || undefined} onChange={set("from")} /></Form.Group>
            <Form.Group as={Col} xs={6} md={3}><Form.Label className="small text-muted mb-1">Date To</Form.Label><FormControl type="date" value={f.to} min={f.from || undefined} onChange={set("to")} /></Form.Group>
            <Col xs={12} md={2} className="d-grid"><Button variant="outline-secondary" disabled={!filtered} onClick={() => setF({ type: "", from: "", to: "" })}><Icon icon="mdi:filter-off-outline" width="18" height="18" /> Clear</Button></Col>
          </Row>
        </div>

        {/* 3. movements */}
        {isFetching && !data ? <Loader /> : rows.length === 0 ? <div className="bg-white border rounded p-3"><Empty text={filtered ? "No movements match the filters" : "No movements yet"} icon="mdi:history" /></div> : (
          <div className="border rounded bg-white overflow-hidden">
            <Table responsive bordered hover className="align-middle mb-0">
              <thead className="table-light"><tr><th>Date</th><th>Type</th><th className="text-end">In / Out</th><th className="text-end">Balance</th><th className="text-end">Unit cost (LKR)</th><th>Location</th><th>Job / Ref</th><th>By</th><th>Note</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="small text-nowrap">{when(m.createdAt)}</td>
                    <td><MoveBadge type={m.type} /></td>
                    <td className={`text-end fw-bold text-nowrap ${m.qty < 0 ? "text-danger" : "text-success"}`}><Icon icon={m.qty < 0 ? "mdi:arrow-up" : "mdi:arrow-down"} width="14" height="14" /> {m.qty > 0 ? "+" : ""}{qtyFmt(m.qty)}</td>
                    <td className="text-end fw-semibold">{qtyFmt(m.balance)}</td>
                    <td className="text-end">{money(m.unitCost)}</td>
                    <td className="small">{m.location}</td>
                    <td className="small">{m.jobNo || m.refNo || "-"}{m.technician && <div className="text-muted">{m.technician}</div>}</td>
                    <td className="small">{m.by || "-"}</td>
                    <td className="small text-muted">{m.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr><td colSpan={2} className="text-end fw-semibold">{filtered ? "Filtered totals" : "Totals"} ({rows.length})</td>
                  <td className="text-end text-nowrap"><span className="text-success fw-bold">+{qtyFmt(totalIn)}</span> <span className="text-danger fw-bold ms-2">{qtyFmt(totalOut)}</span></td><td colSpan={6} /></tr>
              </tfoot>
            </Table>
          </div>
        )}
        {all.length >= 200 && <small className="text-muted d-block mt-2">Showing the latest 200 movements.</small>}
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onClose}>Close</Button></Modal.Footer>
    </Modal>
  );
}

/* ---------- Items & Stock tab ---------- */
export default function ItemsTab() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState("");      // "" | "low"
  const [showHidden, setShowHidden] = useState(false);
  const [view, setView] = useState("table");
  const [modal, setModal] = useState(null);                 // { kind: 'item'|'move'|'history', item?, type? }
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const { data: lookups } = useGetInventoryLookupsQuery();
  const { data, isFetching, isError, refetch } = useGetInventoryItemsQuery({ q: dq, categoryId, low: stockFilter === "low", all: showHidden });
  const [catOpen, setCatOpen] = useState(false);
  const [listOpen, setListOpen] = useState(null);   // "UNIT" | "QUALITY"
  const items = data?.items || [];
  const open = (kind, item, type) => setModal({ kind, item, type });

  const stockBadge = (x) => (x.available <= 0 ? <StatusBadge status="Out of stock" /> : x.isLow ? <StatusBadge status="Low" /> : null);
  const tone = (x) => (x.available <= 0 ? "danger" : x.isLow ? "warning" : "success");

  return (
    <Panel
      title={<>Items &amp; stock <Badge bg="secondary" pill>{items.length}</Badge></>}
      icon="mdi:package-variant-closed"
      action={
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-secondary" onClick={() => setCatOpen(true)}><Icon icon="mdi:shape-plus-outline" width="18" height="18" /> <span className="d-none d-sm-inline">Category</span></Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setListOpen("UNIT")}><Icon icon="mdi:ruler" width="18" height="18" /> <span className="d-none d-sm-inline">Units</span></Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setListOpen("QUALITY")}><Icon icon="mdi:medal-outline" width="18" height="18" /> <span className="d-none d-sm-inline">Quality</span></Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setListOpen("BIN")}><Icon icon="mdi:shelf" width="18" height="18" /> <span className="d-none d-sm-inline">Bins</span></Button>
          <Button size="sm" onClick={() => open("item")} disabled={!lookups}><Icon icon="mdi:plus" width="18" height="18" /> Add item</Button>
        </div>
      }
    >
      <Row className="g-2 mb-3">
        <Col xs={12} md={4}>
          <InputGroup>
            <InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></InputGroup.Text>
            <FormControl value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / part no / OEM / SKU / barcode" autoComplete="off" />
          </InputGroup>
        </Col>
        <Col xs={6} md={3}>
          <FormSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {(lookups?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FormSelect>
        </Col>
        <Col xs={6} md={2}>
          <FormSelect value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="">All stock</option>
            <option value="low">Low &amp; out</option>
          </FormSelect>
        </Col>
        <Col xs={7} md={2} className="d-flex align-items-center">
          <Form.Check type="switch" id="inv-hidden" label="Show hidden" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
        </Col>
        <Col xs={5} md={1} className="d-flex justify-content-end">
          <ButtonGroup>
            <Button variant={view === "table" ? "primary" : "outline-secondary"} onClick={() => setView("table")} title="Table"><Icon icon="mdi:table" width="18" height="18" /></Button>
            <Button variant={view === "cards" ? "primary" : "outline-secondary"} onClick={() => setView("cards")} title="Cards"><Icon icon="mdi:view-grid-outline" width="18" height="18" /></Button>
          </ButtonGroup>
        </Col>
      </Row>

      {!lookups || (isFetching && !data) ? (
        <Loader text="Loading items..." />
      ) : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load items.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
        </Alert>
      ) : items.length === 0 ? (
        <Empty text={dq || categoryId || stockFilter ? "No items match your filters" : "No items yet. Click Add item."} />
      ) : view === "table" ? (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light">
            <tr><th>Item</th><th>Brand / quality</th><th className="text-end">On hand</th><th className="text-end">Reserved</th><th className="text-end">Available</th><th className="text-end">Avg cost</th><th className="text-end">Price</th><th className="text-end">Actions</th></tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} className={!x.isActive ? "opacity-50" : ""}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    {x.imageUrl ? <img src={x.imageUrl} alt="" width="40" height="40" className="rounded border flex-shrink-0" style={{ objectFit: "cover" }} /> : <span className="d-inline-flex align-items-center justify-content-center rounded bg-light text-muted border flex-shrink-0" style={{ width: 40, height: 40 }}><Icon icon="mdi:image-outline" width="20" height="20" /></span>}
                    <div>
                      <div className="fw-semibold">{x.name} {stockBadge(x)}</div>
                      <small className="text-muted">{[x.partNo, x.categoryName, x.binLocation && `Bin ${x.binLocation}`, x.supplierName].filter(Boolean).join(" · ")}</small>
                    </div>
                  </div>
                </td>
                <td className="small">{[x.brand, x.quality].filter(Boolean).join(" · ") || "-"}</td>
                <td className="text-end text-nowrap">{qtyFmt(x.onHand)} <small className="text-muted">{x.unit}</small></td>
                <td className="text-end">{qtyFmt(x.reserved)}</td>
                <td className="text-end">
                  <div className={`fw-bold text-${tone(x)}`}>{qtyFmt(x.available)}</div>
                  <ProgressBar now={x.reorderLevel > 0 ? Math.min(100, (x.available / (x.reorderLevel * 2)) * 100) : x.available > 0 ? 100 : 0} variant={tone(x)} style={{ height: 4, width: 64 }} className="ms-auto mt-1" />
                </td>
                <td className="text-end">{money(x.avgCost)}</td>
                <td className="text-end">{money(x.price)}</td>
                <td className="text-end text-nowrap">
                  <div className="d-inline-flex gap-1">
                    <Button size="sm" variant="primary" onClick={() => open("move", x, "GRN")} title="Receive stock"><Icon icon="mdi:package-down" width="16" height="16" /> Receive</Button>
                    <Button size="sm" variant="outline-warning" onClick={() => open("move", x, "ISSUE")} title="Issue stock"><Icon icon="mdi:package-up" width="16" height="16" /></Button>
                    <Button size="sm" variant="outline-success" onClick={() => open("move", x, "RETURN")} title="Return to stock"><Icon icon="mdi:undo-variant" width="16" height="16" /></Button>
                    <Button size="sm" variant="outline-info" onClick={() => open("history", x)} title="Stock history"><Icon icon="mdi:history" width="16" height="16" /></Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => open("item", x)} title="Edit item"><Icon icon="mdi:pencil-outline" width="16" height="16" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Row className="g-3">
          {items.map((x) => (
            <Col key={x.id} sm={6} lg={4} xxl={3}>
              <Card className={`h-100 border ${!x.isActive ? "opacity-50" : ""}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-truncate">{x.name}</div>
                      <small className="text-muted">{[x.partNo, x.categoryName].filter(Boolean).join(" · ")}</small>
                    </div>
                    {stockBadge(x)}
                  </div>
                  <div className="d-flex justify-content-between align-items-end mt-3">
                    <div><div className="small text-muted">Available</div><div className={`fs-4 fw-bold lh-1 text-${tone(x)}`}>{qtyFmt(x.available)} <small className="fs-6 text-muted fw-normal">{x.unit}</small></div></div>
                    <div className="text-end"><div className="small text-muted">Price</div><div className="fw-semibold">LKR {money(x.price)}</div></div>
                  </div>
                  <div className="small text-muted mt-2">{[x.brand, x.quality].filter(Boolean).join(" · ")}</div>
                </Card.Body>
                <Card.Footer className="bg-transparent border-0 pt-0 d-flex gap-1">
                  <Button size="sm" variant="primary" className="flex-fill" onClick={() => open("move", x, "GRN")}><Icon icon="mdi:package-down" width="16" height="16" /> Receive</Button>
                  <Button size="sm" variant="outline-warning" onClick={() => open("move", x, "ISSUE")} title="Issue stock"><Icon icon="mdi:package-up" width="16" height="16" /></Button>
                  <Button size="sm" variant="outline-success" onClick={() => open("move", x, "RETURN")} title="Return to stock"><Icon icon="mdi:undo-variant" width="16" height="16" /></Button>
                  <Button size="sm" variant="outline-info" onClick={() => open("history", x)} title="Stock history"><Icon icon="mdi:history" width="16" height="16" /></Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => open("item", x)} title="Edit item"><Icon icon="mdi:pencil-outline" width="16" height="16" /></Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      {isFetching && data && <div className="text-center mt-2"><Spinner animation="border" size="sm" /></div>}

      {catOpen && <CategoriesModal onClose={() => setCatOpen(false)} />}
      {listOpen === "UNIT" && <UnitsModal onClose={() => setListOpen(null)} />}
      {listOpen === "QUALITY" && <QualitiesModal onClose={() => setListOpen(null)} />}
      {listOpen === "BIN" && <BinsModal onClose={() => setListOpen(null)} />}
      {modal?.kind === "item" && <ItemModal item={modal.item} lookups={lookups} onClose={() => setModal(null)} />}
      {modal?.kind === "move" && <MovementModal item={modal.item} type={modal.type} lookups={lookups} onClose={() => setModal(null)} />}
      {modal?.kind === "history" && <HistoryModal item={modal.item} onClose={() => setModal(null)} />}
    </Panel>
  );
}