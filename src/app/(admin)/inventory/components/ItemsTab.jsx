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
// Categories are main (parentId null) > sub. An item points to ONE category: its sub category when chosen, else the main one.
const catLabel = (cats, id) => { const c = (cats || []).find((x) => x.id === id); if (!c) return ""; const p = c.parentId ? (cats || []).find((x) => x.id === c.parentId) : null; return p ? `${p.name} > ${c.name}` : c.name; };
const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || fb, icon: "error" });

/* ---------- Add / edit item (General | Batches) ---------- */
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
const COUNTRIES = ["Japan", "Germany", "India", "China", "Thailand", "South Korea", "Malaysia", "Indonesia", "Taiwan", "United Kingdom", "United States", "France", "Italy", "Czech Republic", "Turkey", "Sri Lanka", "UAE", "Vietnam", "Brazil", "Mexico", "Spain", "Poland"];
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

// The Profit / On cost / Margin strip under the pricing fields is hidden for now. Set to true to show it again.
const SHOW_PROFIT_STRIP = false;
const ImSection = ({ icon, title, hint, children }) => (
  <section className="im-card">
    <div className="im-card-h"><Icon icon={icon} width="18" height="18" /> {title}{hint && <small>{hint}</small>}</div>
    {children}
  </section>
);
const IM_CSS = `
.modal-backdrop.im-blur { background: rgba(15,23,42,.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); } .modal-backdrop.im-blur.show { opacity: 1; }
.modal-dialog.im-dialog { max-width: min(1500px, 97vw); width: 97vw; margin: 1rem auto; } .im-dialog .modal-content { height: calc(100vh - 2rem); border: 0; border-radius: 18px; overflow: hidden; background: #f1f5f9; color: #0f172a; font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 1rem; }
.im-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 28px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.im-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; } .im-ic { width: 42px; height: 42px; border-radius: 12px; background: #0f172a; color: #fff; display: grid; place-items: center; flex: none; }
.im-title { font-weight: 700; font-size: 1.2rem; } .im-sub { color: #64748b; font-size: .82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw; }
.im-x { width: 38px; height: 38px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; display: grid; place-items: center; cursor: pointer; flex: none; } .im-x:hover { background: #f1f5f9; }
.im-dialog .modal-body.im-body { padding: 20px 28px 12px; overflow-y: auto; background: #f1f5f9; }
.im-tabs.nav-tabs { border: 0; gap: 6px; margin-bottom: 14px; } .im-tabs .nav-link { border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; color: #334155; font-weight: 600; padding: 8px 20px; font-size: 1rem; display: inline-flex; align-items: center; gap: 6px; } .im-tabs .nav-link.active { background: #0f172a; border-color: #0f172a; color: #fff; }
.im-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 24px; align-items: start; }
.im-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; } .im-side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 0; }
.im-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px 26px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.im-card-h { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; margin-bottom: 18px; } .im-card-h small { color: #94a3b8; font-weight: 500; margin-left: 4px; }
.im-f { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px 18px; align-items: start; }
.im-f .s3 { grid-column: span 3; } .im-f .s4 { grid-column: span 4; } .im-f .s6 { grid-column: span 6; } .im-f .s12 { grid-column: span 12; }
.im-lbl { display: block; font-size: .74rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; } .im-lbl i, .im-req i { color: #0f172a; font-style: normal; margin-left: 3px; }
.im-dialog .form-control, .im-dialog .form-select { height: 46px; border-radius: 10px; border-color: #cbd5e1; font-size: 1rem; box-shadow: none; } .im-dialog textarea.form-control { height: auto; }
.im-dialog .form-control:focus, .im-dialog .form-select:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.12); }
.im-dialog .input-group > .form-control, .im-dialog .input-group > .form-select, .im-dialog .input-group > .btn, .im-dialog .input-group-text { height: 46px; } .im-dialog .input-group-text { background: #f8fafc; border-color: #cbd5e1; }
.im-add { display: flex; gap: 6px; } .im-add > .form-control, .im-add > .form-select { flex: 1 1 auto; min-width: 0; }
.im-ibtn { width: 46px; height: 46px; flex: none; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; display: grid; place-items: center; cursor: pointer; color: #0f172a; } .im-ibtn:hover:not(:disabled) { background: #f1f5f9; } .im-ibtn:disabled { opacity: .45; cursor: not-allowed; } .im-ibtn.ok { background: #0f172a; color: #fff; border-color: #0f172a; }
.im-money { display: flex; align-items: center; height: 46px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; overflow: hidden; } .im-money:focus-within { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.12); }
.im-money > span { padding: 0 10px; color: #64748b; font-size: .8rem; font-weight: 600; background: #f8fafc; height: 100%; display: grid; place-items: center; border-right: 1px solid #e2e8f0; }
.im-money input { flex: 1 1 auto; min-width: 0; border: 0; outline: 0; padding: 0 12px; height: 100%; font-size: 1rem; background: transparent; } .im-money input:disabled { background: #f1f5f9; }
.im-seg { display: inline-flex; height: 100%; border-left: 1px solid #e2e8f0; } .im-seg button { border: 0; background: #f8fafc; padding: 0 12px; font-weight: 700; color: #475569; cursor: pointer; } .im-seg button.on { background: #0f172a; color: #fff; }
.im-profit { display: flex; gap: 22px; flex-wrap: wrap; padding: 10px 14px; border-radius: 12px; background: #f1f5f9; } .im-profit span small { display: block; font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; color: #64748b; font-weight: 700; } .im-profit b { font-size: 1rem; } .im-profit.pos b { color: #15803d; } .im-profit.neg b { color: #b45309; }
.im-hint { color: #94a3b8; font-size: .78rem; margin-top: 4px; }
.im-switch { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; margin: 0; background: #f8fafc; height: 100%; }
.im-switch input { position: absolute; opacity: 0; } .im-switch i { width: 38px; height: 22px; border-radius: 999px; background: #cbd5e1; position: relative; flex: none; transition: background .15s; }
.im-switch i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 3px rgba(0,0,0,.25); } .im-switch input:checked + i { background: #0f172a; } .im-switch input:checked + i::after { transform: translateX(16px); }
.im-switch input:focus-visible + i { box-shadow: 0 0 0 3px rgba(15,23,42,.25); } .im-switch span b { display: block; font-weight: 600; } .im-switch span small { color: #64748b; }
.im-photo { text-align: center; } .im-photo img { max-width: 100%; max-height: 190px; object-fit: contain; border-radius: 10px; } .im-link { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: #475569; margin-top: 8px; cursor: pointer; } .im-link:hover { color: #0f172a; text-decoration: underline; }
.im-drop { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; padding: 26px 10px; border: 2px dashed #cbd5e1; border-radius: 14px; color: #64748b; cursor: pointer; margin: 0; } .im-drop:hover { border-color: #0f172a; background: #f8fafc; } .im-drop b { color: #0f172a; font-weight: 600; font-size: .9rem; } .im-drop small { font-size: .76rem; }
.im-preview { background: linear-gradient(145deg, #0f172a, #1e293b); border: 0; color: #fff; } .im-preview .im-card-h { color: #e2e8f0; }
.im-pname { font-size: 1.2rem; font-weight: 700; overflow-wrap: anywhere; } .im-pmeta { color: #cbd5e1; font-size: .82rem; margin: 2px 0 12px; } .im-ph { color: #64748b; font-weight: 500; }
.im-prow { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.12); color: #cbd5e1; font-size: .86rem; } .im-prow b { color: #fff; font-variant-numeric: tabular-nums; } .im-preview .im-hint { color: #94a3b8; }
.im-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 28px; background: #fff; border-top: 1px solid #e2e8f0; } .im-req { color: #64748b; font-size: .82rem; } .im-foot-r { display: flex; gap: 8px; }
.im-btn { height: 46px; padding: 0 26px; font-size: 1rem; border: 0; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; } .im-btn:hover:not(:disabled) { background: #1e293b; } .im-btn:disabled { opacity: .5; cursor: not-allowed; } .im-btn.ghost { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; } .im-btn.ghost:hover { background: #f1f5f9; }
@media (max-width: 991px) { .im-grid { grid-template-columns: 1fr; } .im-side { position: static; } .im-f .s3, .im-f .s4 { grid-column: span 6; } }
@media (max-width: 1199px) { .im-grid { grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; } }
@media (max-width: 575px) { .modal-dialog.im-dialog { width: 100vw; margin: 0; max-width: none; } .im-dialog .modal-content { height: 100vh; border-radius: 0; } .im-dialog .modal-body.im-body { padding: 12px; } .im-head, .im-foot { padding: 12px 14px; } .im-f .s3, .im-f .s4, .im-f .s6 { grid-column: span 12; } .im-card { padding: 14px; } }
`;

function ItemModal({ item, lookups, onClose }) {
  const [addItem, { isLoading: adding }] = useAddInventoryItemMutation();
  const [updateItem, { isLoading: saving }] = useUpdateInventoryItemMutation();
  const [send] = useSend();
  const [manage, setManage] = useState(null);   // "UNIT" | "QUALITY"
  const addOption = async (kind, name) => (await send("options", { kind, name })) !== null;
  const [uploading, setUploading] = useState(false);
  const [mMode, setMMode] = useState("pct");   // profit entry mode: "pct" (% on cost) | "amt" (Rs.)
  const [mv, setMv] = useState(null);          // text typed in the profit box (null = show the value worked out from cost & price)
  const cats = lookups.categories || [];
  const { refetch: refetchLookups } = useGetInventoryLookupsQuery();
  const startCat = cats.find((c) => c.id === item?.categoryId);
  const [mainId, setMainId] = useState(() => (startCat?.parentId ? startCat.parentId : item?.categoryId || cats.find((c) => !c.parentId)?.id || ""));
  const [subId, setSubId] = useState(() => (startCat?.parentId ? startCat.id : ""));
  const [addCat, setAddCat] = useState(null);        // null | "main" | "sub"  (typing a new category name)
  const [catText, setCatText] = useState("");
  const [pendingCat, setPendingCat] = useState(null); // { name, level } selected as soon as the refreshed list has it
  useEffect(() => {
    if (!pendingCat) return;
    const c = cats.find((x) => x.name.toLowerCase() === pendingCat.name.toLowerCase());
    if (!c) return;
    if (pendingCat.level === "main") { setMainId(c.id); setSubId(""); } else setSubId(c.id);
    setPendingCat(null);
  }, [cats, pendingCat]);
  const subs = cats.filter((c) => c.parentId === Number(mainId));
  const confirmCat = async () => {
    const name = catText.trim();
    if (!name) return;
    if (addCat === "sub" && !mainId) return fail({ data: { message: "Select the main category first." } }, "");
    const ok = await send("categories", { name, ...(addCat === "sub" ? { parentId: Number(mainId) } : {}) });
    if (ok === null || ok === false) return;
    setPendingCat({ name, level: addCat }); setCatText(""); setAddCat(null); refetchLookups();
  };
  const [form, setForm] = useState(() => ({
    name: item?.name || "", partNo: item?.partNo || "", oemNo: item?.oemNo || "", sku: item?.sku || "", barcode: item?.barcode || "",
    categoryId: "", brand: item?.brand || "", quality: item?.quality || "Standard", unit: item?.unit || "Nos",
    price: item?.price ?? "", costPrice: item?.costPrice ?? "", reorderLevel: item?.reorderLevel ?? 0, reorderQty: item?.reorderQty ?? 0,
    binLocation: item?.binLocation || "", manufacturer: item?.manufacturer || "", country: item?.country || "", hsCode: item?.hsCode || "", qrCode: item?.qrCode || "", warrantyMonths: item?.warrantyMonths ?? "", classification: item?.classification || "", dailyDemand: item?.dailyDemand ?? "", leadTimeDays: item?.leadTimeDays ?? "", safetyStock: item?.safetyStock ?? "", rackNo: item?.rackNo || "", rackRow: item?.rackRow || "", description: item?.description || "", imageUrl: item?.imageUrl || "", supplierId: item?.supplierId || "", trackBatch: !!item?.trackBatch, isActive: item?.isActive !== false,
  }));
  const [codeTouched, setCodeTouched] = useState(() => !!item?.binLocation && item.binLocation !== [item?.rackNo, item?.rackRow].filter(Boolean).join("-"));   // true once the code is typed by hand
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setRack = (k) => (v) => {          // rack number / row: the location code follows them until it is typed by hand
    setForm((f) => { const n = { ...f, [k]: v }; if (!codeTouched) n.binLocation = [n.rackNo, n.rackRow].map((x) => String(x).trim()).filter(Boolean).join("-"); return n; });
  };
  const save = async () => {
    try {
      const payload = { ...form, categoryId: subId || mainId, ...(ropOn ? { reorderLevel: rop } : {}) };
      if (!payload.categoryId) return fail({ data: { message: "Select the category." } }, "");
      if (item) await updateItem({ id: item.id, ...payload }).unwrap();
      else await addItem(payload).unwrap();
      onClose();
    } catch (ex) { fail(ex, "Could not save the item."); }
  };
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
  // Reorder point: ROP = (daily demand x supplier lead time) + safety stock. With daily demand and lead time filled the level follows the formula.
  const ropOn = form.dailyDemand !== "" && form.leadTimeDays !== "" && Number(form.dailyDemand) >= 0 && Number(form.leadTimeDays) >= 0;
  const rop = ropOn ? Math.ceil(Number(form.dailyDemand) * Number(form.leadTimeDays) + (Number(form.safetyStock) || 0)) : null;
  const canSave = form.name.trim() && (subId || mainId);
  const lbl = (t, req) => <label className="im-lbl">{t}{req && <i>*</i>}</label>;
  const catBox = (level) => {
    const main = level === "main";
    if (addCat === level) {
      return (
        <div className="im-add">
          <input autoFocus className="form-control" value={catText} onChange={(e) => setCatText(e.target.value)} placeholder={main ? "New main category" : "New sub category"} autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmCat(); } if (e.key === "Escape") setAddCat(null); }} />
          <button type="button" className="im-ibtn ok" onClick={confirmCat} title="Add"><Icon icon="mdi:check" width="18" height="18" /></button>
          <button type="button" className="im-ibtn" onClick={() => { setAddCat(null); setCatText(""); }} title="Cancel"><Icon icon="mdi:close" width="18" height="18" /></button>
        </div>
      );
    }
    return (
      <div className="im-add">
        {main ? (
          <FormSelect value={mainId} onChange={(e) => { setMainId(e.target.value === "" ? "" : Number(e.target.value)); setSubId(""); }}>
            {mainId && !cats.some((c) => c.id === Number(mainId)) && <option value={mainId}>{item?.categoryName || "Category"} (hidden)</option>}
            {!mainId && <option value="">Select main category</option>}
            {cats.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FormSelect>
        ) : (
          <FormSelect value={subId} onChange={(e) => setSubId(e.target.value === "" ? "" : Number(e.target.value))} disabled={!mainId}>
            <option value="">{subs.length ? "None" : "No sub categories yet"}</option>
            {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FormSelect>
        )}
        <button type="button" className="im-ibtn" disabled={!main && !mainId} onClick={() => setAddCat(level)} title={main ? "Add a main category" : "Add a sub category"}><Icon icon="mdi:plus" width="18" height="18" /></button>
      </div>
    );
  };
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false} dialogClassName="im-dialog" backdropClassName="im-blur">
      <style>{IM_CSS}</style>
      <div className="im-head">
        <div className="im-head-l">
          <span className="im-ic"><Icon icon={item ? "mdi:package-variant-closed" : "mdi:package-variant-plus"} width="22" height="22" /></span>
          <div><div className="im-title">{item ? "Edit item" : "Add item"}</div><div className="im-sub">{item ? item.name : "Create a new item in the Item Master"}</div></div>
        </div>
        <button type="button" className="im-x" onClick={onClose} aria-label="Close"><Icon icon="mdi:close" width="20" height="20" /></button>
      </div>
      <Modal.Body className="im-body">
        <Tabs defaultActiveKey="general" className="im-tabs" mountOnEnter>
          <Tab eventKey="general" title={<><Icon icon="mdi:clipboard-text-outline" width="16" height="16" /> General</>}>
            <div className="im-grid">
              <div className="im-main">
                <ImSection icon="mdi:tag-outline" title="Basic details" hint="What the item is and how to find it">
                  <div className="im-f">
                    <div className="s12">{lbl("Item name", true)}<FormControl value={form.name} onChange={set("name")} placeholder="e.g. Brake pad set - front" autoComplete="off" autoFocus /></div>
                    <div className="s6">{lbl("Main category", true)}{catBox("main")}</div>
                    <div className="s6">{lbl("Sub category")}{catBox("sub")}</div>
                    <div className="s4">{lbl("Part number (OEM)")}<FormControl value={form.partNo} onChange={set("partNo")} autoComplete="off" /></div>
                    <div className="s4">{lbl("Internal SKU")}<FormControl value={form.sku} onChange={set("sku")} autoComplete="off" /></div>
                    <div className="s4">{lbl("Barcode")}<FormControl value={form.barcode} onChange={set("barcode")} autoComplete="off" /></div>
                    <div className="s4">{lbl("Brand")}<CreatableSelect value={form.brand} onChange={(v) => setForm((f) => ({ ...f, brand: v }))} options={BRANDS} extra={lookups.brands} placeholder="Select brand" addLabel="New brand name" icon="mdi:star-circle-outline" /></div>
                    <div className="s4">{lbl("Quality")}<CreatableSelect value={form.quality} onChange={(v) => setForm((f) => ({ ...f, quality: v }))} options={["Standard", ...lookups.qualities]} placeholder="Select quality" addLabel="New quality (e.g. Aftermarket)" icon="mdi:medal-outline" onAdd={(v) => addOption("QUALITY", v)} onManage={() => setManage("QUALITY")} /></div>
                    <div className="s4">{lbl("Unit of measure")}<CreatableSelect value={form.unit} onChange={(v) => setForm((f) => ({ ...f, unit: v }))} options={lookups.units?.length ? lookups.units : UNITS} placeholder="Select unit" addLabel="New unit (e.g. Drum)" icon="mdi:ruler" onAdd={(v) => addOption("UNIT", v)} onManage={() => setManage("UNIT")} /></div>
                    <div className="s12">{lbl("Material classification")}<CreatableSelect value={form.classification} onChange={(v) => setForm((f) => ({ ...f, classification: v }))} options={[]} extra={lookups.classifications || []} placeholder="Select classification" addLabel="New classification (e.g. Genuine part, Consumable)" icon="mdi:sitemap-outline" /></div>
                  </div>
                </ImSection>

                <ImSection icon="mdi:shield-check-outline" title="Origin, codes & warranty" hint="Optional: manufacturer, customs and warranty details">
                  <div className="im-f">
                    <div className="s6">{lbl("Manufacturer")}<CreatableSelect value={form.manufacturer} onChange={(v) => setForm((f) => ({ ...f, manufacturer: v }))} options={[]} extra={lookups.manufacturers || []} placeholder="Select manufacturer" addLabel="New manufacturer name" icon="mdi:factory" /></div>
                    <div className="s6">{lbl("Country of origin")}<CreatableSelect value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} options={COUNTRIES} extra={lookups.countries || []} placeholder="Select country" addLabel="New country" icon="mdi:earth" /></div>
                    <div className="s4">{lbl("HS code")}<FormControl value={form.hsCode} onChange={set("hsCode")} placeholder="e.g. 8708.30" autoComplete="off" /></div>
                    <div className="s4">{lbl("QR code")}<FormControl value={form.qrCode} onChange={set("qrCode")} placeholder="Value printed in the QR code" autoComplete="off" /></div>
                    <div className="s4">{lbl("Warranty period")}<div className="im-money"><input type="number" min="0" max="600" step="1" value={form.warrantyMonths} onChange={set("warrantyMonths")} placeholder="0" /><span style={{ borderRight: 0, borderLeft: "1px solid #e2e8f0" }}>months</span></div></div>
                  </div>
                </ImSection>

                <ImSection icon="mdi:cash-multiple" title="Pricing" hint="Cost, profit and the selling price">
                  <div className="im-f">
                    <div className="s4">{lbl("Cost price")}<div className="im-money"><span>Rs.</span><input type="number" min="0" value={form.costPrice} onChange={(e) => { setMv(null); set("costPrice")(e); }} /></div></div>
                    <div className="s4">{lbl("Selling price")}<div className="im-money"><span>Rs.</span><input type="number" min="0" value={form.price} onChange={(e) => { setMv(null); set("price")(e); }} /></div></div>
                    <div className="s4">
                      {lbl("Profit (sets the selling price)")}
                      <div className="im-money">
                        <input type="number" min="0" step="any" value={mv ?? derived} onChange={(e) => setProfit(e.target.value)} disabled={cost <= 0} placeholder={cost <= 0 ? "Enter cost first" : "0"} />
                        <div className="im-seg"><button type="button" className={mMode === "pct" ? "on" : ""} onClick={() => { setMMode("pct"); setMv(null); }}>%</button><button type="button" className={mMode === "amt" ? "on" : ""} onClick={() => { setMMode("amt"); setMv(null); }}>Rs.</button></div>
                      </div>
                    </div>
                    {SHOW_PROFIT_STRIP && profitAmt !== null && (
                      <div className="s12"><div className={`im-profit ${profitAmt >= 0 ? "pos" : "neg"}`}>
                        <span><small>Profit</small><b>Rs. {profitAmt.toFixed(2)}</b></span>
                        <span><small>On cost</small><b>{profitPct.toFixed(1)}%</b></span>
                        <span><small>Margin</small><b>{((profitAmt / sell) * 100).toFixed(1)}%</b></span>
                      </div></div>
                    )}
                    <div className="s6">
                      {lbl("Preferred supplier")}
                      <FormSelect value={form.supplierId} onChange={set("supplierId")}>
                        <option value="">No default supplier</option>
                        {(lookups.suppliers || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </FormSelect>
                      <div className="im-hint">Used as the default when you order this item. Add suppliers in Purchasing.</div>
                    </div>
                  </div>
                </ImSection>

                <ImSection icon="mdi:warehouse" title="Stock settings" hint="Optional: reorder points and where the item is stored">
                  <div className="im-f">
                    <div className="s4">{lbl("Daily demand")}<div className="im-money"><input type="number" min="0" step="any" value={form.dailyDemand} onChange={set("dailyDemand")} placeholder="0" /><span style={{ borderRight: 0, borderLeft: "1px solid #e2e8f0" }}>/ day</span></div></div>
                    <div className="s4">{lbl("Supplier lead time")}<div className="im-money"><input type="number" min="0" step="1" value={form.leadTimeDays} onChange={set("leadTimeDays")} placeholder="0" /><span style={{ borderRight: 0, borderLeft: "1px solid #e2e8f0" }}>days</span></div></div>
                    <div className="s4">{lbl("Safety stock")}<div className="im-money"><input type="number" min="0" step="any" value={form.safetyStock} onChange={set("safetyStock")} placeholder="0" /><span style={{ borderRight: 0, borderLeft: "1px solid #e2e8f0" }}>units</span></div></div>
                    <div className="s6">
                      {lbl("Reorder level (ROP)")}
                      <div className="im-money"><input type="number" min="0" value={ropOn ? rop : form.reorderLevel} readOnly={ropOn} onChange={set("reorderLevel")} /><span style={{ borderRight: 0, borderLeft: "1px solid #e2e8f0" }}>units</span></div>
                      <div className="im-hint">{ropOn ? `ROP = (${Number(form.dailyDemand)} \u00D7 ${Number(form.leadTimeDays)}) + ${Number(form.safetyStock) || 0} = ${rop} units. A Reorder alert shows when the available stock reaches ${rop}.` : "Enter the daily demand and the supplier lead time to calculate it, or type a level yourself."}</div>
                    </div>
                    <div className="s6">{lbl("Reorder qty")}<FormControl type="number" min="0" value={form.reorderQty} onChange={set("reorderQty")} /><div className="im-hint">How many to order when the alert shows.</div></div>
                    <div className="s4">{lbl("Rack number")}<CreatableSelect value={form.rackNo} onChange={setRack("rackNo")} options={[]} extra={lookups.racks || []} placeholder="Select rack" addLabel="New rack number (e.g. A3)" icon="mdi:shelf" /></div>
                    <div className="s4">{lbl("Row in the rack")}<CreatableSelect value={form.rackRow} onChange={setRack("rackRow")} options={[]} extra={lookups.rackRows || []} placeholder="Select row" addLabel="New row (e.g. 2)" icon="mdi:table-row" /></div>
                    <div className="s4">{lbl("Location code")}<CreatableSelect value={form.binLocation} onChange={(v) => { setCodeTouched(true); setForm((f) => ({ ...f, binLocation: v })); }} options={lookups.bins || []} extra={lookups.locationCodes || []} placeholder="Select location code" addLabel="New location code (e.g. A3-2)" icon="mdi:map-marker-outline" /><div className="im-hint">Auto-filled as rack-row. Pick another or add a new code if you need to.</div></div>
                    {item && <div className="s12"><label className="im-switch"><input type="checkbox" checked={form.isActive} onChange={set("isActive")} /><i /><span><b>Active</b><small>Visible in Spare Part Review</small></span></label></div>}
                  </div>
                </ImSection>

                <ImSection icon="mdi:text-box-outline" title="Description" hint="Optional notes for the counter staff">
                  <FormControl as="textarea" rows={4} maxLength={2000} value={form.description} onChange={set("description")} placeholder="Specification, fitting notes, warranty, anything the counter staff should know..." />
                  <div className="im-hint text-end">{form.description.length}/2000</div>
                </ImSection>
              </div>

              <aside className="im-side">
                <div className="im-card">
                  <div className="im-card-h"><Icon icon="mdi:image-outline" width="18" height="18" /> Item photo</div>
                  <div className="im-photo">
                    {form.imageUrl ? (
                      <>
                        <a href={form.imageUrl} target="_blank" rel="noreferrer"><img src={form.imageUrl} alt="Item" /></a>
                        <button type="button" className="im-link" onClick={() => setForm({ ...form, imageUrl: "" })}><Icon icon="mdi:delete-outline" width="16" height="16" /> Remove photo</button>
                      </>
                    ) : (
                      <label className="im-drop">
                        {uploading ? <Spinner size="sm" /> : <Icon icon="mdi:image-plus-outline" width="34" height="34" />}
                        <b>{uploading ? "Uploading..." : "Click to upload a photo"}</b><small>JPG, PNG or WEBP, up to 8 MB</small>
                        <input type="file" accept="image/*" hidden disabled={uploading} onChange={pickImage} />
                      </label>
                    )}
                  </div>
                </div>
                <div className="im-card im-preview">
                  <div className="im-card-h"><Icon icon="mdi:eye-outline" width="18" height="18" /> Summary</div>
                  <div className="im-pname">{form.name.trim() || <span className="im-ph">Item name</span>}</div>
                  <div className="im-pmeta">{[catLabel(cats, Number(subId || mainId)), form.brand, form.quality].filter(Boolean).join(" · ") || <span className="im-ph">Category · brand · quality</span>}</div>
                  <div className="im-prow"><span>Selling price</span><b>Rs. {sell > 0 ? sell.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</b></div>
                  <div className="im-prow"><span>Cost price</span><b>Rs. {cost > 0 ? cost.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</b></div>
                  {Number(form.warrantyMonths) > 0 && <div className="im-prow"><span>Warranty</span><b>{form.warrantyMonths} months</b></div>}
                  <div className="im-prow"><span>Reorder level</span><b>{ropOn ? rop : form.reorderLevel || 0} {form.unit}</b></div>
                  {!item && <div className="im-hint mt-2">New items start with 0 stock. Use Receive (or a Purchase Order) to add stock.</div>}
                </div>
              </aside>
            </div>
          </Tab>
          {item && <Tab eventKey="batches" title={<><Icon icon="mdi:barcode" width="16" height="16" /> Batches</>}><div className="im-card"><BatchesPane itemId={item.id} /></div></Tab>}
        </Tabs>
      </Modal.Body>
      {manage === "UNIT" && <UnitsModal onClose={() => setManage(null)} />}
      {manage === "QUALITY" && <QualitiesModal onClose={() => setManage(null)} />}
      {manage === "BIN" && <BinsModal onClose={() => setManage(null)} />}
      <div className="im-foot">
        <span className="im-req"><i>*</i> Required</span>
        <div className="im-foot-r">
          <button type="button" className="im-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="im-btn" disabled={adding || saving || uploading || !canSave} onClick={save}><Icon icon="mdi:content-save-outline" width="18" height="18" /> {adding || saving ? "Saving..." : item ? "Save changes" : "Save item"}</button>
        </div>
      </div>
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
const layerOf = (x) => (x.layers && x.layers[0]) || {};

function MovementModal({ item, type, lookups, onClose }) {
  const cfg = MOVES[type];
  const [post, { isLoading }] = usePostInventoryMovementMutation();
  const [sp, setSp] = useState("");   // selling price for THIS received stock (per layer)
  const [f, setF] = useState({ locationId: lookups.locations[0]?.id || "", qty: "", unitCost: item.avgCost || item.costPrice || "", refNo: "", note: "", technician: "", batchNo: "", expiryDate: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const qty = Number(f.qty) || 0;
  const change = qty * cfg.sign;
  const after = item.onHand + change;
  const value = qty * (Number(f.unitCost) || 0);
  const ready = qty > 0 && after >= 0 && (!cfg.cost || Number(f.unitCost) > 0);
  // Receive only: every receipt is its own cost layer with its own selling price (FIFO) - old stock keeps its old price.
  const newCost = Number(f.unitCost) || 0;
  const layers = (item.layers || []).filter((l) => l.qty > 0);
  const lastLayer = layers[layers.length - 1];
  const refCost = lastLayer?.cost > 0 ? lastLayer.cost : item.costPrice > 0 ? item.costPrice : item.avgCost || 0;
  const refPrice = lastLayer?.price > 0 ? lastLayer.price : item.price || 0;
  const curMarkup = refCost > 0 && refPrice > 0 ? (refPrice - refCost) / refCost : null;
  const suggested = newCost > 0 && curMarkup !== null ? Math.round(newCost * (1 + curMarkup) * 100) / 100 : refPrice;   // same markup on the new cost
  const newPrice = sp === "" ? suggested : Number(sp);
  const marginNew = newPrice > 0 && newCost > 0 ? ((newPrice - newCost) / newPrice) * 100 : null;
  const costDiff = newCost - refCost;
  const showLayers = type === "GRN";
  const save = async () => {
    try {
      await post({ partId: item.id, type, ...f, ...(type === "GRN" && newPrice > 0 ? { sellPrice: newPrice } : {}) }).unwrap();
      onClose();
    } catch (ex) { fail(ex, "Could not update the stock."); }
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

        {/* stock layers + selling price of the new stock */}
        {showLayers && (
          <div className="border rounded bg-white mb-3 overflow-hidden">
            <SectionHead icon="mdi:layers-outline" title="Stock cost & selling price (FIFO)" />
            <div className="p-3">
              <div className="table-responsive">
                <Table size="sm" className="mb-2 align-middle">
                  <thead><tr><th className={th}>Stock</th><th className={`${th} text-end`}>Qty</th><th className={`${th} text-end`}>Cost</th><th className={`${th} text-end`}>Selling price</th><th className={`${th} text-end`}>Margin</th></tr></thead>
                  <tbody>
                    {layers.length === 0 && <tr><td colSpan={5} className="text-muted small">No earlier stock layers. Current price Rs. {money(item.price)}.</td></tr>}
                    {layers.map((l, i) => (
                      <tr key={i}>
                        <td>{i === 0 ? "Sold first (old stock)" : `Older batch ${i + 1}`}</td>
                        <td className="text-end">{qtyFmt(l.qty)}</td><td className="text-end">{money(l.cost)}</td><td className="text-end"><b>{money(l.price)}</b></td>
                        <td className="text-end">{l.price > 0 && l.cost > 0 ? `${(((l.price - l.cost) / l.price) * 100).toFixed(1)}%` : "-"}</td>
                      </tr>
                    ))}
                    <tr className="table-active">
                      <td><b>This stock (new)</b></td><td className="text-end">{qty > 0 ? qtyFmt(qty) : "-"}</td><td className="text-end">{newCost > 0 ? money(newCost) : "-"}</td>
                      <td className="text-end"><b>{newPrice > 0 ? money(newPrice) : "-"}</b></td><td className="text-end">{marginNew !== null ? `${marginNew.toFixed(1)}%` : "-"}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              {layers.length > 0 && newCost > 0 && Math.abs(costDiff) >= 0.005 && (
                <div className="small mb-2">New cost Rs. <b>{money(newCost)}</b> is {costDiff > 0 ? "higher" : "lower"} than the last cost Rs. <b>{money(refCost)}</b>
                  <span className={costDiff > 0 ? "text-danger" : "text-success"}> ({costDiff > 0 ? "+" : ""}{((costDiff / refCost) * 100).toFixed(1)}%)</span>.</div>
              )}
              <div className="d-flex flex-wrap align-items-center gap-3">
                <InputGroup style={{ maxWidth: 300 }}><InputGroup.Text className="bg-light small">Selling price for this stock Rs.</InputGroup.Text>
                  <FormControl type="number" min="0" step="any" value={sp === "" ? suggested || "" : sp} onChange={(e) => setSp(e.target.value)} /></InputGroup>
                <small className="text-muted">Suggested {money(suggested)} (same markup on the new cost). Old stock keeps its old price; the new price starts once the old stock is sold out.</small>
              </div>
            </div>
          </div>
        )}

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

/* ---------- Manage lists: categories (main > sub), units, quality, brands, location codes and the other typed values ---------- */
const ML_CSS = `
.ml-dialog .modal-content { border: 0; border-radius: 18px; overflow: hidden; background: #f1f5f9; font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; height: min(86vh, 820px); }
.ml-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.ml-head b { font-size: 1.1rem; } .ml-head small { display: block; color: #64748b; }
.ml-x { width: 38px; height: 38px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; display: grid; place-items: center; cursor: pointer; } .ml-x:hover { background: #f1f5f9; }
.ml-body { display: grid; grid-template-columns: 230px minmax(0, 1fr); min-height: 0; flex: 1 1 auto; }
.ml-nav { background: #fff; border-right: 1px solid #e2e8f0; padding: 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.ml-nav button { display: flex; align-items: center; gap: 10px; border: 0; background: transparent; text-align: left; padding: 10px 12px; border-radius: 10px; font-weight: 600; color: #334155; cursor: pointer; } .ml-nav button:hover { background: #f1f5f9; } .ml-nav button.on { background: #0f172a; color: #fff; }
.ml-pane { padding: 18px 22px; overflow-y: auto; min-width: 0; }
.ml-bar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; } .ml-bar .form-control, .ml-bar .form-select { height: 42px; border-radius: 10px; max-width: 360px; }
.ml-btn { height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; } .ml-btn:disabled { opacity: .5; cursor: not-allowed; }
.ml-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
.ml-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid #eef2f6; } .ml-row:first-child { border-top: 0; } .ml-row.sub { padding-left: 44px; background: #fcfdff; } .ml-row.off .nm { color: #94a3b8; }
.ml-row .nm { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow-wrap: anywhere; } .ml-row .nm small { display: block; font-weight: 500; color: #64748b; }
.ml-ib { width: 34px; height: 34px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #334155; display: grid; place-items: center; cursor: pointer; flex: none; } .ml-ib:hover:not(:disabled) { background: #0f172a; border-color: #0f172a; color: #fff; } .ml-ib:disabled { opacity: .45; }
.ml-cnt { background: #e2e8f0; color: #334155; border-radius: 999px; padding: 1px 10px; font-size: .75rem; font-weight: 700; flex: none; }
.ml-sw { display: inline-flex; align-items: center; cursor: pointer; margin: 0; flex: none; } .ml-sw input { position: absolute; opacity: 0; } .ml-sw i { width: 38px; height: 22px; border-radius: 999px; background: #cbd5e1; position: relative; transition: background .15s; } .ml-sw i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 3px rgba(0,0,0,.25); } .ml-sw input:checked + i { background: #0f172a; } .ml-sw input:checked + i::after { transform: translateX(16px); }
.ml-inline { display: flex; gap: 6px; flex: 1 1 auto; } .ml-inline .form-control, .ml-inline .form-select { height: 36px; border-radius: 9px; }
.ml-empty { padding: 34px; text-align: center; color: #64748b; } .ml-note { color: #64748b; font-size: .84rem; margin-top: 10px; }
@media (max-width: 767px) { .ml-body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); } .ml-nav { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid #e2e8f0; } .ml-nav button { white-space: nowrap; } .ml-row.sub { padding-left: 24px; } }
`;
const ML_TABS = [
  ["categories", "Categories", "mdi:shape-outline"], ["UNIT", "Units", "mdi:ruler"], ["QUALITY", "Quality", "mdi:medal-outline"], ["BRAND", "Brands", "mdi:star-circle-outline"],
  ["BIN", "Location codes", "mdi:shelf"], ["values", "Other lists", "mdi:format-list-bulleted"],
];
const Switch = ({ checked, onChange, disabled, title }) => <label className="ml-sw" title={title}><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} /><i /></label>;

function MlCategories() {
  const { data = [], isLoading } = useInvGetQuery("lists/categories");
  const [send, busy] = useSend();
  const [add, setAdd] = useState(null);          // { parentId: null | id, text }
  const [edit, setEdit] = useState(null);        // { id, text }
  const mains = data.filter((c) => !c.parentId);
  const subsOf = (id) => data.filter((c) => c.parentId === id);
  const total = (c) => c.itemCount + subsOf(c.id).reduce((s, x) => s + x.itemCount, 0);
  const put = (id, body) => send(`lists/categories/${id}`, body, "PUT");
  const create = async () => { if (!add?.text.trim()) return; if (await send("categories", { name: add.text.trim(), ...(add.parentId ? { parentId: add.parentId } : {}) })) setAdd(null); };
  const rename = async () => { if (!edit?.text.trim()) return; if (await put(edit.id, { name: edit.text.trim() })) setEdit(null); };
  const Name = ({ c, sub }) => (edit?.id === c.id ? (
    <div className="ml-inline"><FormControl autoFocus value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setEdit(null); }} />
      <button type="button" className="ml-ib" onClick={rename} disabled={busy} title="Save"><Icon icon="mdi:check" width="18" height="18" /></button>
      <button type="button" className="ml-ib" onClick={() => setEdit(null)} title="Cancel"><Icon icon="mdi:close" width="18" height="18" /></button></div>
  ) : <div className="nm">{sub && <Icon icon="mdi:subdirectory-arrow-right" width="16" height="16" className="me-1 text-muted" />}{c.name}{!c.isActive && <small>Hidden</small>}</div>);
  const AddBox = ({ parentId, label }) => (add && add.parentId === parentId ? (
    <div className={`ml-row ${parentId ? "sub" : ""}`}><div className="ml-inline"><FormControl autoFocus value={add.text} placeholder={label} onChange={(e) => setAdd({ ...add, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setAdd(null); }} />
      <button type="button" className="ml-btn" style={{ height: 36 }} onClick={create} disabled={busy || !add.text.trim()}>Add</button>
      <button type="button" className="ml-ib" onClick={() => setAdd(null)} title="Cancel"><Icon icon="mdi:close" width="18" height="18" /></button></div></div>
  ) : null);
  if (isLoading) return <Loader />;
  return (
    <>
      <div className="ml-bar"><button type="button" className="ml-btn" onClick={() => setAdd({ parentId: null, text: "" })}><Icon icon="mdi:plus" width="18" height="18" /> Main category</button></div>
      <div className="ml-card">
        <AddBox parentId={null} label="New main category" />
        {mains.length === 0 && !add && <div className="ml-empty">No categories yet</div>}
        {mains.map((c) => (
          <div key={c.id}>
            <div className={`ml-row ${c.isActive ? "" : "off"}`}>
              <Name c={c} />
              <span className="ml-cnt" title="Items in this category and its sub categories">{total(c)} item{total(c) === 1 ? "" : "s"}</span>
              <button type="button" className="ml-ib" onClick={() => setAdd({ parentId: c.id, text: "" })} title="Add a sub category"><Icon icon="mdi:plus" width="18" height="18" /></button>
              <button type="button" className="ml-ib" onClick={() => setEdit({ id: c.id, text: c.name })} title="Rename"><Icon icon="mdi:pencil-outline" width="16" height="16" /></button>
              <Switch checked={c.isActive} disabled={busy} onChange={() => put(c.id, { isActive: !c.isActive })} title={c.isActive ? "Active: click to hide" : "Hidden: click to show"} />
            </div>
            <AddBox parentId={c.id} label={`New sub category under ${c.name}`} />
            {subsOf(c.id).map((x) => (
              <div key={x.id} className={`ml-row sub ${x.isActive ? "" : "off"}`}>
                <Name c={x} sub />
                <span className="ml-cnt">{x.itemCount} item{x.itemCount === 1 ? "" : "s"}</span>
                <FormSelect size="sm" style={{ width: 170 }} value={x.parentId} disabled={busy} title="Move to another main category" onChange={(e) => put(x.id, { parentId: Number(e.target.value) })}>
                  {mains.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </FormSelect>
                <button type="button" className="ml-ib" onClick={() => setEdit({ id: x.id, text: x.name })} title="Rename"><Icon icon="mdi:pencil-outline" width="16" height="16" /></button>
                <Switch checked={x.isActive} disabled={busy} onChange={() => put(x.id, { isActive: !x.isActive })} title={x.isActive ? "Active: click to hide" : "Hidden: click to show"} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="ml-note">Items keep their category when you rename or move it. Hidden categories are not offered for new items. Add sub categories with the + button of a main category.</div>
    </>
  );
}

function MlOptions({ kind, label }) {
  const { data = [], isLoading } = useInvGetQuery(`lists/options?kind=${kind}`);
  const [send, busy] = useSend();
  const [text, setText] = useState("");
  const [edit, setEdit] = useState(null);
  const add = async () => { if (!text.trim()) return; if (await send("lists/options", { kind, name: text.trim() })) setText(""); };
  const rename = async () => { if (!edit?.text.trim()) return; if (await send(`lists/options/${edit.id}`, { name: edit.text.trim() }, "PUT")) setEdit(null); };
  if (isLoading) return <Loader />;
  return (
    <>
      <div className="ml-bar">
        <FormControl value={text} onChange={(e) => setText(e.target.value)} placeholder={`New ${label.toLowerCase()}`} autoComplete="off" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button type="button" className="ml-btn" onClick={add} disabled={busy || !text.trim()}><Icon icon="mdi:plus" width="18" height="18" /> Add</button>
      </div>
      <div className="ml-card">
        {data.length === 0 && <div className="ml-empty">Nothing here yet</div>}
        {data.map((o) => (
          <div key={o.id} className={`ml-row ${o.isActive ? "" : "off"}`}>
            {edit?.id === o.id ? (
              <div className="ml-inline"><FormControl autoFocus value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setEdit(null); }} />
                <button type="button" className="ml-ib" onClick={rename} disabled={busy} title="Save"><Icon icon="mdi:check" width="18" height="18" /></button>
                <button type="button" className="ml-ib" onClick={() => setEdit(null)} title="Cancel"><Icon icon="mdi:close" width="18" height="18" /></button></div>
            ) : <div className="nm">{o.name}{!o.isActive && <small>Hidden</small>}</div>}
            <span className="ml-cnt">{o.itemCount} item{o.itemCount === 1 ? "" : "s"}</span>
            <button type="button" className="ml-ib" onClick={() => setEdit({ id: o.id, text: o.name })} title="Rename"><Icon icon="mdi:pencil-outline" width="16" height="16" /></button>
            <Switch checked={o.isActive} disabled={busy} onChange={() => send(`lists/options/${o.id}`, { isActive: !o.isActive }, "PUT")} title={o.isActive ? "Active: click to hide" : "Hidden: click to show"} />
          </div>
        ))}
      </div>
      <div className="ml-note">Renaming also renames it on every item that uses it. Hidden entries are not offered for new items.</div>
    </>
  );
}

const VALUE_FIELDS = [["classification", "Material classification"], ["manufacturer", "Manufacturer"], ["country", "Country of origin"], ["rackNo", "Rack number"], ["rackRow", "Row in the rack"]];
function MlValues() {
  const [field, setField] = useState("classification");
  const { data = [], isLoading } = useInvGetQuery(`lists/values?field=${field}`);
  const [send, busy] = useSend();
  const [edit, setEdit] = useState(null);
  const rename = async () => { if (!edit?.text.trim() || edit.text.trim() === edit.from) return setEdit(null); if (await send("lists/values", { field, from: edit.from, to: edit.text.trim() }, "PUT")) setEdit(null); };
  const clear = async (v) => {
    const c = await Swal.fire({ title: "Clear this value?", text: `"${v.name}" will be removed from ${v.itemCount} item${v.itemCount === 1 ? "" : "s"}. The items are kept.`, icon: "warning", showCancelButton: true, confirmButtonText: "Clear", confirmButtonColor: "#111" });
    if (c.isConfirmed) send("lists/values", { field, from: v.name, to: "" }, "PUT");
  };
  return (
    <>
      <div className="ml-bar"><FormSelect value={field} onChange={(e) => { setField(e.target.value); setEdit(null); }}>{VALUE_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect></div>
      {isLoading ? <Loader /> : (
        <div className="ml-card">
          {data.length === 0 && <div className="ml-empty">No values yet. They appear here when items use them.</div>}
          {data.map((v) => (
            <div key={v.name} className="ml-row">
              {edit?.from === v.name ? (
                <div className="ml-inline"><FormControl autoFocus value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setEdit(null); }} />
                  <button type="button" className="ml-ib" onClick={rename} disabled={busy} title="Save"><Icon icon="mdi:check" width="18" height="18" /></button>
                  <button type="button" className="ml-ib" onClick={() => setEdit(null)} title="Cancel"><Icon icon="mdi:close" width="18" height="18" /></button></div>
              ) : <div className="nm">{v.name}</div>}
              <span className="ml-cnt">{v.itemCount} item{v.itemCount === 1 ? "" : "s"}</span>
              <button type="button" className="ml-ib" onClick={() => setEdit({ from: v.name, text: v.name })} title="Rename"><Icon icon="mdi:pencil-outline" width="16" height="16" /></button>
              <button type="button" className="ml-ib" onClick={() => clear(v)} disabled={busy} title="Clear from items"><Icon icon="mdi:delete-outline" width="17" height="17" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="ml-note">These values are typed on the items. Renaming changes them on every item. Renaming to a name that already exists merges them. New values are added from the Add item window.</div>
    </>
  );
}

function ManageListsModal({ onClose }) {
  const [tab, setTab] = useState("categories");
  return (
    <Modal show onHide={onClose} size="xl" centered enforceFocus={false} dialogClassName="ml-dialog">
      <style>{ML_CSS}</style>
      <div className="ml-head">
        <div><b>Manage lists</b><small>Categories, units, quality, brands, location codes and more</small></div>
        <button type="button" className="ml-x" onClick={onClose} aria-label="Close"><Icon icon="mdi:close" width="20" height="20" /></button>
      </div>
      <div className="ml-body">
        <nav className="ml-nav">{ML_TABS.map(([k, l, ic]) => <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon icon={ic} width="19" height="19" />{l}</button>)}</nav>
        <div className="ml-pane">
          {tab === "categories" && <MlCategories />}
          {tab === "UNIT" && <MlOptions key="UNIT" kind="UNIT" label="Unit" />}
          {tab === "QUALITY" && <MlOptions key="QUALITY" kind="QUALITY" label="Quality" />}
          {tab === "BRAND" && <MlOptions key="BRAND" kind="BRAND" label="Brand" />}
          {tab === "BIN" && <MlOptions key="BIN" kind="BIN" label="Location code" />}
          {tab === "values" && <MlValues />}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Items & Stock tab ---------- */
const LIST_CSS = `
.it-wrap { font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
.it-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.it-title { display: flex; align-items: center; gap: 12px; } .it-title .ic { width: 44px; height: 44px; border-radius: 12px; background: #0f172a; color: #fff; display: grid; place-items: center; }
.it-title h2 { font-size: 1.25rem; font-weight: 700; margin: 0; } .it-title small { color: #64748b; }
.it-actions { display: flex; gap: 8px; align-items: center; }
.it-btn { height: 42px; padding: 0 18px; border: 0; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; } .it-btn:hover:not(:disabled) { background: #1e293b; } .it-btn:disabled { opacity: .5; }
.it-btn.ghost { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; } .it-btn.ghost:hover { background: #f1f5f9; }
.it-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.it-kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.it-kpi .ic { width: 40px; height: 40px; border-radius: 10px; background: #f1f5f9; color: #334155; display: grid; place-items: center; flex: none; }
.it-kpi small { display: block; color: #64748b; font-size: .74rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; } .it-kpi b { font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.it-kpi.warn .ic { background: #fef3c7; color: #92400e; } .it-kpi.bad .ic { background: #e5e7eb; color: #111827; }
.it-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04); overflow: hidden; }
.it-filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.it-search { position: relative; flex: 1 1 280px; max-width: 420px; } .it-search svg { position: absolute; left: 12px; top: 12px; color: #94a3b8; }
.it-in { height: 42px; width: 100%; padding: 0 36px 0 38px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; outline: 0; font-size: .95rem; } .it-in:focus, .it-sel:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.12); }
.it-clear { position: absolute; right: 6px; top: 6px; width: 30px; height: 30px; border: 0; background: transparent; border-radius: 8px; color: #94a3b8; cursor: pointer; } .it-clear:hover { background: #f1f5f9; color: #0f172a; }
.it-sel { height: 42px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; padding: 0 12px; font-size: .92rem; min-width: 190px; max-width: 280px; outline: 0; }
.it-seg { display: inline-flex; padding: 3px; background: #e2e8f0; border-radius: 10px; } .it-seg button { border: 0; background: transparent; height: 36px; padding: 0 14px; border-radius: 8px; font-weight: 600; color: #475569; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; } .it-seg button.on { background: #0f172a; color: #fff; }
.it-chk { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; color: #334155; font-weight: 500; } .it-chk input { width: 18px; height: 18px; accent-color: #0f172a; }
.it-spacer { flex: 1 1 auto; }
.it-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.it-table th { position: sticky; top: 0; background: #fff; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.it-table td { padding: 12px 16px; border-bottom: 1px solid #eef2f6; vertical-align: middle; } .it-table tbody tr:hover { background: #f8fafc; } .it-table tr.off { opacity: .55; }
.it-table .r { text-align: right; }
.it-prod { display: flex; align-items: center; gap: 12px; min-width: 260px; } .it-thumb { width: 48px; height: 48px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f1f5f9; object-fit: cover; flex: none; display: grid; place-items: center; color: #94a3b8; }
.it-zoom { position: relative; border: 0; padding: 0; background: transparent; border-radius: 10px; flex: none; cursor: zoom-in; overflow: hidden; } .it-zoom .it-thumb { display: block; }
.it-zoom-ic { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(15,23,42,.5); color: #fff; opacity: 0; transition: opacity .12s; } .it-zoom:hover .it-zoom-ic, .it-zoom:focus-visible .it-zoom-ic { opacity: 1; } .it-zoom:focus-visible { outline: 2px solid #0f172a; outline-offset: 2px; }
.modal-backdrop.it-lb-bd { background: #0f172a; } .modal-backdrop.it-lb-bd.show { opacity: .85; }
.it-lb .modal-content { background: transparent; border: 0; } .it-lb-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.it-lb-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px 10px 18px; border-bottom: 1px solid #e2e8f0; } .it-lb-bar b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .it-lb-bar span { display: inline-flex; gap: 6px; flex: none; }
.it-lb-btn { width: 36px; height: 36px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #334155; display: grid; place-items: center; cursor: pointer; text-decoration: none; } .it-lb-btn:hover { background: #f1f5f9; color: #0f172a; }
.it-lb-img { background: #f1f5f9; display: grid; place-items: center; padding: 14px; } .it-lb-img img { max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: 8px; }
.it-name { font-weight: 600; } .it-meta { color: #64748b; font-size: .82rem; overflow-wrap: anywhere; } .it-tag { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: .68rem; font-weight: 700; vertical-align: middle; }
.it-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px; font-size: .74rem; font-weight: 700; } .it-pill.ok { background: #dcfce7; color: #166534; } .it-pill.low { background: #fef3c7; color: #92400e; } .it-pill.out { background: #e5e7eb; color: #111827; }
.it-qty b { font-size: 1.05rem; font-variant-numeric: tabular-nums; } .it-qty small { color: #64748b; }
.it-bar { height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden; width: 90px; margin-top: 5px; } .it-bar i { display: block; height: 100%; background: #0f172a; border-radius: 999px; } .it-bar.low i { background: #d97706; } .it-bar.out i { background: #9ca3af; }
.it-price b { font-variant-numeric: tabular-nums; } .it-price small { display: block; color: #94a3b8; font-variant-numeric: tabular-nums; }
.it-acts { display: inline-flex; gap: 6px; align-items: center; }
.it-ibtn { width: 36px; height: 36px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #334155; display: grid; place-items: center; cursor: pointer; } .it-ibtn:hover { background: #0f172a; border-color: #0f172a; color: #fff; }
.it-recv { height: 36px; padding: 0 14px; border: 0; border-radius: 9px; background: #0f172a; color: #fff; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; } .it-recv:hover { background: #1e293b; }
.it-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; padding: 16px; }
.it-tile { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 12px; } .it-tile:hover { box-shadow: 0 8px 24px rgba(15,23,42,.08); } .it-tile.off { opacity: .55; }
.it-tile .row2 { display: flex; justify-content: space-between; align-items: flex-end; }
.it-empty { text-align: center; padding: 60px 20px; color: #64748b; } .it-empty svg { color: #cbd5e1; margin-bottom: 8px; } .it-empty b { display: block; color: #0f172a; font-size: 1.05rem; }
.it-skel { height: 64px; margin: 8px 16px; border-radius: 10px; background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%; animation: itsk 1.2s infinite; } @keyframes itsk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.it-foot { padding: 10px 16px; color: #64748b; font-size: .85rem; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; }
@media (max-width: 991px) { .it-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .it-hide-md { display: none; } }
@media (max-width: 575px) { .it-sel { min-width: 0; flex: 1 1 140px; } .it-search { max-width: none; } .it-kpi b { font-size: 1.1rem; } }
`;
const stockState = (x) => (x.available <= 0 ? "out" : x.isLow ? "low" : "ok");
const STATE_LABEL = { ok: "In stock", low: "Low", out: "Out of stock" };

export default function ItemsTab() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState("");      // "" | "low"
  const [showHidden, setShowHidden] = useState(false);
  const [view, setView] = useState("table");
  const [modal, setModal] = useState(null);                 // { kind: 'item'|'move'|'history', item?, type? }
  const [manageOpen, setManageOpen] = useState(false);
  const [preview, setPreview] = useState(null);             // { url, name } photo shown big
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);

  const { data: lookups } = useGetInventoryLookupsQuery();
  const { data, isFetching, isError, refetch } = useGetInventoryItemsQuery({ q: dq, categoryId, low: stockFilter === "low", all: showHidden });
  const items = data?.items || [];
  const open = (kind, item, type) => setModal({ kind, item, type });
  const cats = lookups?.categories || [];
  const filtered = !!(dq || categoryId || stockFilter);
  const lowCount = items.filter((x) => x.isActive && x.available > 0 && x.isLow).length;
  const outCount = items.filter((x) => x.isActive && x.available <= 0).length;
  const loading = !lookups || (isFetching && !data);

  const level = (x) => (x.reorderLevel > 0 ? Math.min(100, (x.available / (x.reorderLevel * 2)) * 100) : x.available > 0 ? 100 : 0);
  const Acts = ({ x }) => (
    <div className="it-acts">
      <button type="button" className="it-recv" onClick={() => open("move", x, "GRN")} title="Receive stock"><Icon icon="mdi:package-down" width="17" height="17" /> Receive</button>
      <button type="button" className="it-ibtn" onClick={() => open("move", x, "ISSUE")} title="Issue stock" aria-label="Issue stock"><Icon icon="mdi:package-up" width="18" height="18" /></button>
      <button type="button" className="it-ibtn" onClick={() => open("move", x, "RETURN")} title="Return to stock" aria-label="Return to stock"><Icon icon="mdi:undo-variant" width="18" height="18" /></button>
      <button type="button" className="it-ibtn" onClick={() => open("history", x)} title="Stock history" aria-label="Stock history"><Icon icon="mdi:history" width="18" height="18" /></button>
      <button type="button" className="it-ibtn" onClick={() => open("item", x)} title="Edit item" aria-label="Edit item"><Icon icon="mdi:pencil-outline" width="18" height="18" /></button>
    </div>
  );
  const Thumb = ({ x, size = 48 }) => (x.imageUrl ? <button type="button" className="it-zoom" style={{ width: size, height: size }} onClick={() => setPreview({ url: x.imageUrl, name: x.name })} title="View photo" aria-label={`View photo of ${x.name}`}><img src={x.imageUrl} alt="" className="it-thumb" style={{ width: size, height: size }} /><span className="it-zoom-ic"><Icon icon="mdi:magnify-plus-outline" width="18" height="18" /></span></button> : <span className="it-thumb" style={{ width: size, height: size }}><Icon icon="mdi:image-outline" width="22" height="22" /></span>);
  const Meta = ({ x }) => <div className="it-meta">{[x.partNo, catLabel(cats, x.categoryId) || x.categoryName, x.binLocation && `Bin ${x.binLocation}`].filter(Boolean).join(" · ")}</div>;

  return (
    <div className="it-wrap">
      <style>{LIST_CSS}</style>
      <div className="it-head">
        <div className="it-title">
          <span className="ic"><Icon icon="mdi:package-variant-closed" width="24" height="24" /></span>
          <div><h2>Items &amp; stock</h2><small>{loading ? "Loading..." : `${items.length} item${items.length === 1 ? "" : "s"}${filtered ? " match your filters" : ""}`}</small></div>
        </div>
        <div className="it-actions">
          <button type="button" className="it-btn ghost" onClick={() => setManageOpen(true)}><Icon icon="mdi:tune-variant" width="18" height="18" /> Manage lists</button>
          <button type="button" className="it-btn" onClick={() => open("item")} disabled={!lookups}><Icon icon="mdi:plus" width="20" height="20" /> Add item</button>
        </div>
      </div>

      <div className="it-kpis">
        <div className="it-kpi"><span className="ic"><Icon icon="mdi:package-variant-closed" width="22" height="22" /></span><div><small>Items</small><b>{items.length}</b></div></div>
        <div className="it-kpi"><span className="ic"><Icon icon="mdi:cash-multiple" width="22" height="22" /></span><div><small>Stock value (LKR)</small><b>{money(data?.stockValue || 0)}</b></div></div>
        <div className="it-kpi warn"><span className="ic"><Icon icon="mdi:alert-outline" width="22" height="22" /></span><div><small>Low stock</small><b>{lowCount}</b></div></div>
        <div className="it-kpi bad"><span className="ic"><Icon icon="mdi:package-variant-remove" width="22" height="22" /></span><div><small>Out of stock</small><b>{outCount}</b></div></div>
      </div>

      <div className="it-card">
        <div className="it-filters">
          <div className="it-search">
            <Icon icon="mdi:magnify" width="18" height="18" />
            <input className="it-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, part no, OEM, SKU, barcode" autoComplete="off" />
            {q && <button type="button" className="it-clear" onClick={() => setQ("")} aria-label="Clear search"><Icon icon="mdi:close" width="16" height="16" /></button>}
          </div>
          <select className="it-sel" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {cats.filter((c) => !c.parentId).flatMap((c) => [<option key={c.id} value={c.id}>{c.name}</option>, ...cats.filter((x) => x.parentId === c.id).map((x) => <option key={x.id} value={x.id}>{"  └ "}{x.name}</option>)])}
          </select>
          <div className="it-seg" role="tablist">
            <button type="button" className={!stockFilter ? "on" : ""} onClick={() => setStockFilter("")}>All stock</button>
            <button type="button" className={stockFilter === "low" ? "on" : ""} onClick={() => setStockFilter("low")}>Low &amp; out</button>
          </div>
          <label className="it-chk"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show hidden</label>
          <span className="it-spacer" />
          {isFetching && data && <Spinner animation="border" size="sm" />}
          {filtered && <button type="button" className="it-btn ghost" style={{ height: 38 }} onClick={() => { setQ(""); setCategoryId(""); setStockFilter(""); }}><Icon icon="mdi:filter-off-outline" width="18" height="18" /> Clear</button>}
          <div className="it-seg">
            <button type="button" className={view === "table" ? "on" : ""} onClick={() => setView("table")} title="Table" aria-label="Table view"><Icon icon="mdi:table" width="18" height="18" /></button>
            <button type="button" className={view === "cards" ? "on" : ""} onClick={() => setView("cards")} title="Cards" aria-label="Card view"><Icon icon="mdi:view-grid-outline" width="18" height="18" /></button>
          </div>
        </div>

        {loading ? (
          <div className="py-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="it-skel" />)}</div>
        ) : isError ? (
          <div className="it-empty"><Icon icon="mdi:alert-circle-outline" width="44" height="44" /><b>Could not load the items</b><button type="button" className="it-btn mt-3" onClick={refetch}>Retry</button></div>
        ) : items.length === 0 ? (
          <div className="it-empty"><Icon icon="mdi:package-variant" width="52" height="52" />
            <b>{filtered ? "No items match your filters" : "No items yet"}</b>
            {filtered ? <span>Try a different search or clear the filters.</span> : <span>Add your first item to start tracking stock.</span>}
            {!filtered && <div><button type="button" className="it-btn mt-3" onClick={() => open("item")}><Icon icon="mdi:plus" width="20" height="20" /> Add item</button></div>}
          </div>
        ) : view === "table" ? (
          <div className="table-responsive">
            <table className="it-table">
              <thead><tr><th>Item</th><th className="it-hide-md">Brand / quality</th><th>Stock</th><th className="r it-hide-md">Cost</th><th className="r">Price</th><th className="r">Actions</th></tr></thead>
              <tbody>
                {items.map((x) => {
                  const st = stockState(x);
                  return (
                    <tr key={x.id} className={x.isActive ? "" : "off"}>
                      <td><div className="it-prod"><Thumb x={x} /><div><div className="it-name">{x.name}{!x.isActive && <span className="it-tag">Hidden</span>}</div><Meta x={x} /></div></div></td>
                      <td className="it-hide-md"><span className="it-meta" style={{ fontSize: ".9rem" }}>{[x.brand, x.quality].filter(Boolean).join(" · ") || "-"}</span></td>
                      <td>
                        <div className="it-qty"><b>{qtyFmt(x.available)}</b> <small>{x.unit} available</small></div>
                        <div className="it-meta">{qtyFmt(x.onHand)} on hand{x.reserved > 0 ? ` · ${qtyFmt(x.reserved)} reserved` : ""}</div>
                        <span className={`it-pill ${st}`}>{STATE_LABEL[st]}</span>
                        <div className={`it-bar ${st}`}><i style={{ width: `${level(x)}%` }} /></div>
                      </td>
                      <td className="r it-price it-hide-md"><b>{money(x.avgCost)}</b><small>avg cost</small></td>
                      <td className="r it-price"><b>{money(x.price)}</b>{(x.layers || []).length > 1 && <small>{qtyFmt(x.layers[0].qty)} left @ this price, then {money(x.layers[1].price)}</small>}</td>
                      <td className="r"><Acts x={x} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="it-grid">
            {items.map((x) => {
              const st = stockState(x);
              return (
                <div key={x.id} className={`it-tile ${x.isActive ? "" : "off"}`}>
                  <div className="it-prod" style={{ minWidth: 0 }}><Thumb x={x} size={56} /><div style={{ minWidth: 0 }}><div className="it-name">{x.name}{!x.isActive && <span className="it-tag">Hidden</span>}</div><Meta x={x} /></div></div>
                  <div className="row2">
                    <div className="it-qty"><b style={{ fontSize: "1.4rem" }}>{qtyFmt(x.available)}</b> <small>{x.unit}</small><div><span className={`it-pill ${st}`}>{STATE_LABEL[st]}</span></div><div className={`it-bar ${st}`}><i style={{ width: `${level(x)}%` }} /></div></div>
                    <div className="it-price r" style={{ textAlign: "right" }}><small>Price</small><b style={{ fontSize: "1.1rem" }}>LKR {money(x.price)}</b></div>
                  </div>
                  <div className="it-meta">{[x.brand, x.quality].filter(Boolean).join(" · ")}</div>
                  <Acts x={x} />
                </div>
              );
            })}
          </div>
        )}
        {!loading && !isError && items.length > 0 && <div className="it-foot"><span>Showing {items.length} item{items.length === 1 ? "" : "s"}</span><span>Stock value LKR {money(data?.stockValue || 0)}</span></div>}
      </div>

      {preview && (
        <Modal show onHide={() => setPreview(null)} centered size="lg" dialogClassName="it-lb" backdropClassName="it-lb-bd">
          <div className="it-lb-card">
            <div className="it-lb-bar"><b>{preview.name}</b>
              <span><a href={preview.url} target="_blank" rel="noreferrer" className="it-lb-btn" title="Open the photo in a new tab"><Icon icon="mdi:open-in-new" width="18" height="18" /></a>
                <button type="button" className="it-lb-btn" onClick={() => setPreview(null)} aria-label="Close"><Icon icon="mdi:close" width="20" height="20" /></button></span></div>
            <div className="it-lb-img"><img src={preview.url} alt={preview.name} /></div>
          </div>
        </Modal>
      )}
      {manageOpen && <ManageListsModal onClose={() => setManageOpen(false)} />}
      {modal?.kind === "item" && <ItemModal item={modal.item} lookups={lookups} onClose={() => setModal(null)} />}
      {modal?.kind === "move" && <MovementModal item={modal.item} type={modal.type} lookups={lookups} onClose={() => setModal(null)} />}
      {modal?.kind === "history" && <HistoryModal item={modal.item} onClose={() => setModal(null)} />}
    </div>
  );
}