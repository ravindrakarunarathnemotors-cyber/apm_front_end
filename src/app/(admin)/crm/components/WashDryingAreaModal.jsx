"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, FormControl, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddDryingFluidMutation,
  useAddDryingItemMutation,
  useGetDryingCheckQuery,
  useGetDryingItemsQuery,
  useGetDryingPricesQuery,
  useLazySearchDryingFilterPartsQuery,
  useSaveDryingCheckMutation,
  useUpdateDryingFilterTypeMutation,
  useUpdateDryingFluidMutation,
  useUpdateDryingItemMutation,
} from "./dryingCheckApi";
import { usePermissions } from "./permissionsApi";

// Wash "Drying Area": exterior drying inspection, fluid level inspection (price is generated from litres x price per litre),
// filters (cleaned / replace from the stock / not in stock = photo + request), "Go to Inspection" Yes / Not Yet.
// Props: jobId (null = closed), onHide, onSaved?({ jobId, stageCompleted })

const money = (n) => `Rs. ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const groupItems = (items) => {
  const groups = [];
  items.forEach((i) => {
    const name = i.groupName || "";
    let g = groups.find((x) => x.name === name);
    if (!g) { g = { name, items: [] }; groups.push(g); }
    g.items.push(i);
  });
  return groups;
};

/* ----------------------------- edit the checklist (add / rename / remove) ----------------------------- */
function ManageItems({ department, onHide }) {
  const { data, isLoading, isError, error } = useGetDryingItemsQuery(department.id, { refetchOnMountOrArgChange: true });
  const [addItem, { isLoading: adding }] = useAddDryingItemMutation();
  const [updateItem] = useUpdateDryingItemMutation();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const groups = [...new Set(items.map((i) => i.groupName).filter(Boolean))];

  const fail = (ex, msg) => Swal.fire({ title: "Failed", text: ex?.data?.message || msg, icon: "error" });
  const add = async () => {
    if (!name.trim()) return;
    try {
      await addItem({ departmentId: department.id, name, groupName: group }).unwrap();
      setName("");
    } catch (ex) { fail(ex, "Could not add the item."); }
  };

  return (
    <Modal show onHide={onHide} centered scrollable size="lg" backdrop="static" style={{ zIndex: 1065 }}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5"><Icon icon="mdi:playlist-edit" width="24" height="24" /> Edit checklist · {department.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        <div className="bg-white border rounded-3 p-3 mb-3">
          <div className="fw-bold mb-2">Add an item</div>
          <div className="d-flex flex-wrap gap-2">
            <FormControl style={{ flex: "2 1 220px" }} placeholder="Item (e.g. Door sills dry)" value={name} maxLength={300}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <FormControl style={{ flex: "1 1 160px" }} placeholder="Group (optional)" list="dc-groups" value={group} maxLength={100} onChange={(e) => setGroup(e.target.value)} />
            <datalist id="dc-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            <Button variant="dark" onClick={add} disabled={adding || !name.trim()}>
              <Icon icon="mdi:plus" width="20" height="20" /> {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>

        {isLoading && <div className="text-center text-muted py-3"><Spinner animation="border" size="sm" className="me-2" />Loading...</div>}
        {isError && <Alert variant="danger">{error?.data?.message || "Could not load the checklist."}</Alert>}
        <div className="d-grid gap-2">
          {items.map((i) => (
            <ItemRow key={`${i.id}-${i.name}-${i.groupName}-${i.isActive}`} item={i} busy={busy} setBusy={setBusy} updateItem={updateItem} fail={fail} />
          ))}
        </div>
        <div className="small text-muted mt-3">
          Rename = alternate an item. Remove hides it from new inspections (jobs already inspected keep what was ticked).
        </div>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}

function ItemRow({ item, busy, setBusy, updateItem, fail }) {
  const [name, setName] = useState(item.name);
  const [group, setGroup] = useState(item.groupName || "");
  const dirty = name.trim() !== item.name || group.trim() !== (item.groupName || "");
  const run = async (patch, msg) => {
    setBusy(true);
    try { await updateItem({ id: item.id, ...patch }).unwrap(); } catch (ex) { fail(ex, msg); } finally { setBusy(false); }
  };
  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 bg-white border rounded-3 p-2 px-3 ${item.isActive ? "" : "opacity-75"}`}>
      <FormControl size="sm" style={{ flex: "2 1 220px" }} value={name} maxLength={300} disabled={!item.isActive} onChange={(e) => setName(e.target.value)} aria-label="Item" />
      <FormControl size="sm" style={{ flex: "1 1 140px" }} value={group} maxLength={100} disabled={!item.isActive} placeholder="Group" onChange={(e) => setGroup(e.target.value)} aria-label="Group" />
      {item.isActive ? (
        <>
          <Button size="sm" variant="dark" disabled={!dirty || busy || !name.trim()} onClick={() => run({ name, groupName: group }, "Could not save.")}>Save</Button>
          <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => run({ isActive: false }, "Could not remove.")}><Icon icon="mdi:delete-outline" width="18" height="18" /> Remove</Button>
        </>
      ) : (
        <>
          <Badge bg="secondary">Removed</Badge>
          <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => run({ isActive: true }, "Could not restore.")}>Add back</Button>
        </>
      )}
    </div>
  );
}

/* ----------------------------- prices (fluids per litre, cleaning of the filters) ----------------------------- */
function PriceRow({ label, value, onSave, extra }) {
  const [v, setV] = useState(String(value ?? 0));
  const dirty = Number(v) !== Number(value);
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 bg-white border rounded-3 p-2 px-3">
      <div className="flex-grow-1 fw-semibold" style={{ minWidth: 160 }}>{label}</div>
      <div className="input-group" style={{ maxWidth: 190 }}>
        <span className="input-group-text">Rs.</span>
        <FormControl type="number" min="0" step="0.01" value={v} onChange={(e) => setV(e.target.value)} aria-label={label} />
      </div>
      <Button size="sm" variant="dark" disabled={!dirty || v === "" || Number(v) < 0} onClick={() => onSave(Number(v))}>Save</Button>
      {extra}
    </div>
  );
}

function ManagePrices({ onHide }) {
  const { data, isLoading, isError, error } = useGetDryingPricesQuery(undefined, { refetchOnMountOrArgChange: true });
  const [addFluid, { isLoading: adding }] = useAddDryingFluidMutation();
  const [updFluid] = useUpdateDryingFluidMutation();
  const [updFilter] = useUpdateDryingFilterTypeMutation();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const fail = (ex, msg) => Swal.fire({ title: "Failed", text: ex?.data?.message || msg, icon: "error" });
  const run = async (fn, msg) => { try { await fn().unwrap(); } catch (ex) { fail(ex, msg); } };

  return (
    <Modal show onHide={onHide} centered scrollable size="lg" backdrop="static" style={{ zIndex: 1065 }}>
      <Modal.Header closeButton><Modal.Title className="fs-5"><Icon icon="mdi:cash-edit" width="24" height="24" /> Prices · Drying Area</Modal.Title></Modal.Header>
      <Modal.Body className="bg-light">
        {isLoading && <div className="text-center text-muted py-3"><Spinner animation="border" size="sm" className="me-2" />Loading...</div>}
        {isError && <Alert variant="danger">{error?.data?.message || "Could not load the prices."}</Alert>}
        {data && (
          <>
            <div className="fw-bold mb-2">Fluids · price per litre</div>
            <div className="d-grid gap-2 mb-3">
              {data.fluids.map((f) => (
                <PriceRow key={`${f.id}-${f.pricePerLitre}`} label={f.name} value={f.pricePerLitre}
                  onSave={(p) => run(() => updFluid({ id: f.id, pricePerLitre: p }), "Could not save.")}
                  extra={f.isActive
                    ? <Button size="sm" variant="outline-danger" onClick={() => run(() => updFluid({ id: f.id, isActive: false }), "Could not remove.")}><Icon icon="mdi:delete-outline" width="18" height="18" /> Remove</Button>
                    : <><Badge bg="secondary">Removed</Badge><Button size="sm" variant="outline-secondary" onClick={() => run(() => updFluid({ id: f.id, isActive: true }), "Could not restore.")}>Add back</Button></>}
                />
              ))}
            </div>
            <div className="bg-white border rounded-3 p-3 mb-4">
              <div className="fw-bold mb-2">Add a fluid</div>
              <div className="d-flex flex-wrap gap-2">
                <FormControl style={{ flex: "2 1 200px" }} placeholder="Fluid (e.g. Brake fluid)" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
                <FormControl style={{ flex: "1 1 140px" }} type="number" min="0" step="0.01" placeholder="Rs. per litre" value={price} onChange={(e) => setPrice(e.target.value)} />
                <Button variant="dark" disabled={adding || !name.trim()} onClick={async () => { await run(() => addFluid({ name, pricePerLitre: Number(price || 0) }), "Could not add."); setName(""); setPrice(""); }}>
                  <Icon icon="mdi:plus" width="20" height="20" /> Add
                </Button>
              </div>
            </div>
            <div className="fw-bold mb-2">Filters · price of “Cleaned”</div>
            <div className="d-grid gap-2">
              {data.filters.map((f) => (
                <PriceRow key={`${f.kind}-${f.cleanPrice}`} label={f.label} value={f.cleanPrice} onSave={(p) => run(() => updFilter({ kind: f.kind, cleanPrice: p }), "Could not save.")} />
              ))}
            </div>
            <div className="small text-muted mt-3">A new price is used from the next save. Jobs already saved keep the price they had.</div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}

/* ----------------------------- fluid level inspection ----------------------------- */
function FluidRow({ f, opt, value, onChange, disabled }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const setAction = (a) => onChange({ ...value, action: a, litres: a ? (opt.defaultLitres[a] ?? 0) : 0 });
  const amount = Math.round(Number(value.litres || 0) * f.pricePerLitre * 100) / 100;
  const Sel = ({ label, k, list, onPick }) => (
    <div className="dc-cell">
      <label className="dc-lbl">{label}</label>
      <select className="form-select" disabled={disabled} value={value[k] ?? ""} onChange={(e) => (onPick ? onPick(e.target.value) : set(k, e.target.value))}>
        <option value="">Select...</option>
        {list.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
  return (
    <div className="dc-fluid">
      <div className="fw-bold mb-2">{f.name} <span className="small fw-normal text-muted">· {money(f.pricePerLitre)} / litre</span></div>
      <div className="dc-grid">
        <Sel label="Quality" k="quality" list={opt.quality} />
        <Sel label="Fluid Level" k="level" list={opt.level} />
        <Sel label="Action" k="action" list={opt.action} onPick={setAction} />
        <div className="dc-cell">
          <label className="dc-lbl">Litres</label>
          <select className="form-select" disabled={disabled || !value.action || value.action === "None"} value={String(value.litres ?? 0)} onChange={(e) => set("litres", Number(e.target.value))}>
            {opt.litres.map((l) => <option key={l} value={String(l)}>{l === 0 ? "None" : l}</option>)}
          </select>
        </div>
        <div className="dc-cell">
          <label className="dc-lbl">Price (auto)</label>
          <div className="dc-price">{money(amount)}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- filters ----------------------------- */
// downsize a photo in the browser so the request stays small
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

function FilterCard({ f, value, onChange, disabled }) {
  const [search, { isFetching }] = useLazySearchDryingFilterPartsQuery();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [mode, setMode] = useState(value.partId ? "STOCK" : value.priceSource === "MANUAL" ? "MANUAL" : "STOCK");
  const set = (patch) => onChange({ ...value, ...patch });

  useEffect(() => {
    if (value.action !== "REPLACE" || mode !== "STOCK") return undefined;
    const t = setTimeout(async () => {
      try { setResults(await search({ kind: f.kind, q }).unwrap()); } catch (_) { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, mode, value.action]); // eslint-disable-line react-hooks/exhaustive-deps

  const price = value.action === "CLEANED" ? f.cleanPrice : Number(value.price || 0);
  const pickPart = (p) => set({ partId: p.id, partName: p.name, price: p.price, priceSource: "CATALOG", requested: false, photo: "", description: "" });
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try { set({ photo: await readPhoto(file) }); } catch (_) { Swal.fire({ title: "Photo", text: "Could not read this image.", icon: "error" }); }
  };

  return (
    <div className="dc-fluid">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <div className="fw-bold me-auto">{f.label}</div>
        <div className="dc-yn">
          <button type="button" disabled={disabled} className={value.action === "CLEANED" ? "on" : ""} onClick={() => set({ action: "CLEANED", partId: null, priceSource: "SERVICE" })}>Cleaned</button>
          <button type="button" disabled={disabled} className={value.action === "REPLACE" ? "on red" : ""} onClick={() => set({ action: "REPLACE", priceSource: value.partId ? "CATALOG" : value.priceSource === "MANUAL" ? "MANUAL" : "" })}>Replace</button>
        </div>
        <div className="dc-price" style={{ minWidth: 130 }}>{value.action ? money(price) : "—"}</div>
      </div>

      {value.action === "REPLACE" && (
        <div className="mt-2">
          <div className="dc-tabs mb-2">
            <button type="button" disabled={disabled} className={mode === "STOCK" ? "on" : ""} onClick={() => setMode("STOCK")}><Icon icon="mdi:warehouse" width="18" height="18" /> Search in stock</button>
            <button type="button" disabled={disabled} className={mode === "MANUAL" ? "on" : ""} onClick={() => { setMode("MANUAL"); set({ partId: null, priceSource: "MANUAL" }); }}><Icon icon="mdi:cash-edit" width="18" height="18" /> Not in stock / manual price</button>
          </div>

          {mode === "STOCK" && (
            <>
              {value.partId && (
                <div className="dc-picked mb-2"><Icon icon="mdi:check-circle" width="20" height="20" /> <strong className="me-auto">{value.partName}</strong> {money(value.price)}</div>
              )}
              <div className="input-group mb-2">
                <span className="input-group-text bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></span>
                <FormControl disabled={disabled} placeholder={`Search ${f.label.toLowerCase()} (name, brand, part no)`} value={q} onChange={(e) => setQ(e.target.value)} />
                {isFetching && <span className="input-group-text bg-white"><Spinner animation="border" size="sm" /></span>}
              </div>
              <div className="dc-list">
                {results && results.length === 0 && <div className="p-3 text-muted small">No filter found in the stock list. Use “Not in stock / manual price”.</div>}
                {(results || []).map((p) => (
                  <button key={p.id} type="button" disabled={disabled || p.stockQty <= 0} className={`dc-part ${value.partId === p.id ? "on" : ""}`} onClick={() => pickPart(p)}>
                    <span className="flex-grow-1 text-start">
                      <span className="d-block fw-semibold lh-sm">{p.name}</span>
                      <span className="small text-muted">{[p.brand, p.quality, p.partNo].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="fw-bold">{money(p.price)}</span>
                    <Badge bg={p.stockQty > 0 ? "success" : "secondary"}>{p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}</Badge>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "MANUAL" && (
            <div className="d-grid gap-2">
              <FormControl disabled={disabled} placeholder="Filter name / part no" maxLength={200} value={value.partName || ""} onChange={(e) => set({ partName: e.target.value, partId: null, priceSource: "MANUAL" })} />
              <div className="input-group" style={{ maxWidth: 260 }}>
                <span className="input-group-text">Rs.</span>
                <FormControl disabled={disabled} type="number" min="0" step="0.01" placeholder="Price" value={value.price ?? ""} onChange={(e) => set({ price: e.target.value, partId: null, priceSource: "MANUAL" })} />
              </div>
              <FormControl as="textarea" rows={2} disabled={disabled} placeholder="Description" maxLength={1000} value={value.description || ""} onChange={(e) => set({ description: e.target.value })} />
              <div className="d-flex flex-wrap align-items-center gap-2">
                <label className={`btn btn-outline-dark ${disabled ? "disabled" : ""}`}>
                  <Icon icon="mdi:camera-plus-outline" width="20" height="20" /> {value.photo ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" hidden disabled={disabled} onChange={onPhoto} />
                </label>
                {value.photo && (
                  <>
                    <img src={value.photo} alt="Filter" style={{ height: 64, borderRadius: 8, border: "1px solid #e3e3e6" }} />
                    {!disabled && <Button size="sm" variant="outline-secondary" onClick={() => set({ photo: "" })}><Icon icon="mdi:close" width="16" height="16" /></Button>}
                  </>
                )}
              </div>
              <label className="d-flex align-items-center gap-2">
                <input type="checkbox" className="form-check-input mt-0" disabled={disabled} checked={Boolean(value.requested)} onChange={(e) => set({ requested: e.target.checked })} />
                <span className="small fw-semibold">Request from Logistic and Stock department{value.requestedAt ? ` (requested ${new Date(value.requestedAt).toLocaleString()})` : ""}</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const blankFilter = (f) => {
  const s = f.saved;
  return s
    ? { action: s.action || "", partId: s.partId || null, partName: s.partName || "", price: s.price ?? "", priceSource: s.priceSource || "", description: s.description || "", photo: s.photo || "", requested: Boolean(s.requestedAt), requestedAt: s.requestedAt || null }
    : { action: "", partId: null, partName: "", price: "", priceSource: "", description: "", photo: "", requested: false, requestedAt: null };
};

/* ----------------------------- the form ----------------------------- */
function DryingForm({ data, onHide, onSaved }) {
  const { job, items, fluids, filters, options, saved, canRecord, locked } = data;
  const { can } = usePermissions();
  const canEdit = can("dryingcheck.manage");

  const [checked, setChecked] = useState(() => items.filter((i) => i.checked).map((i) => i.id));
  const [fluidVals, setFluidVals] = useState(() => Object.fromEntries(fluids.map((f) => [f.id, { quality: f.quality, level: f.level, action: f.action, litres: f.litres }])));
  const [filterVals, setFilterVals] = useState(() => Object.fromEntries(filters.map((f) => [f.kind, blankFilter(f)])));
  const [goInspection, setGoInspection] = useState(saved?.goInspection === true ? true : saved?.goInspection === false ? false : null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [save, { isLoading: saving }] = useSaveDryingCheckMutation();
  const errRef = useRef(null);

  const validIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const done = checked.filter((id) => validIds.has(id)).length;
  const total = items.length;
  const all = total > 0 && done === total;
  const readOnly = !canRecord;

  const charge = useMemo(() => {
    const fl = fluids.reduce((s, f) => s + Math.round(Number(fluidVals[f.id]?.litres || 0) * f.pricePerLitre * 100) / 100, 0);
    const fi = filters.reduce((s, f) => {
      const v = filterVals[f.kind];
      return s + (v?.action === "CLEANED" ? f.cleanPrice : v?.action === "REPLACE" ? Number(v.price || 0) : 0);
    }, 0);
    return { fl, fi, sum: fl + fi };
  }, [fluids, filters, fluidVals, filterVals]);

  useEffect(() => { if (tick) errRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [tick]);
  const fail = (m) => { setError(m); setTick((t) => t + 1); };
  const toggle = (id) => { setError(""); setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const setAll = (on) => { setError(""); setChecked(on ? items.map((i) => i.id) : []); };

  const submit = async (complete) => {
    setError("");
    if (complete) {
      if (!all) return fail("Tick every item of the exterior drying inspection.");
      for (const f of fluids) {
        const v = fluidVals[f.id] || {};
        if (!v.quality || !v.level || !v.action) return fail(`Select the quality, fluid level and action of ${f.name}.`);
      }
      for (const f of filters) {
        const v = filterVals[f.kind];
        if (!v?.action) return fail(`Select Cleaned or Replace for ${f.label}.`);
        if (v.action === "REPLACE" && !v.partId && !(v.partName?.trim() && Number(v.price) > 0)) return fail(`${f.label}: select the filter from the stock, or enter its name and price.`);
      }
      if (goInspection !== true) return fail("Select Yes for “Go to Inspection”.");
    }
    try {
      const res = await save({
        jobId: job.id,
        checkedItemIds: checked.filter((id) => validIds.has(id)),
        fluids: fluids.map((f) => ({ fluidId: f.id, ...fluidVals[f.id] })),
        filters: filters.map((f) => {
          const v = filterVals[f.kind];
          return { kind: f.kind, action: v.action || undefined, partId: v.partId || undefined, partName: v.partName || undefined, price: v.priceSource === "MANUAL" ? v.price : undefined, priceSource: v.priceSource || undefined, description: v.description || undefined, photo: v.photo || undefined, requested: v.requested };
        }),
        goInspection: goInspection === true,
        complete,
      }).unwrap();
      await Swal.fire({
        title: complete ? "Drying area completed!" : "Saved",
        text: complete ? (res.stageCompleted ? `${job.jobNo} moved to the next stage.` : "Updated.") : "You can complete it later.",
        icon: "success", timer: 1600, showConfirmButton: false,
      });
      onSaved?.({ jobId: job.id, stageCompleted: Boolean(res.stageCompleted) });
      onHide();
    } catch (ex) {
      fail(ex?.data?.message || "Failed to save.");
    }
  };

  return (
    <>
      <style>{`
        .jc-card { background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 4px 14px -10px rgba(15,23,42,.45); }
        .jc-title { font-weight: 800; letter-spacing: .04em; text-transform: uppercase; font-size: .85rem; color: #111; display: flex; align-items: center; gap: 8px; }
        .jc-title svg { color: #c8102e; }
        .jc-group { font-weight: 700; font-size: .78rem; text-transform: uppercase; color: #6b7280; letter-spacing: .05em; margin: 12px 0 6px; }
        .jc-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; min-height: 52px; padding: 8px 14px; margin-bottom: 8px; border: 2px solid #e3e3e6; border-radius: 12px; background: #fff; transition: all .12s; }
        .jc-row:hover:not(:disabled) { border-color: #111; }
        .jc-row.on { border-color: #16a34a; background: #f0fdf4; }
        .jc-box { width: 26px; height: 26px; border-radius: 8px; border: 2px solid #9ca3af; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
        .jc-row.on .jc-box { background: #16a34a; border-color: #16a34a; }
        .jc-label { font-weight: 600; color: #111; flex: 1; }
        .dc-fluid { border: 1.5px solid #e3e3e6; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; background: #fafafa; }
        .dc-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        @media (max-width: 767px) { .dc-grid { grid-template-columns: repeat(2, 1fr); } }
        .dc-lbl { display: block; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 3px; }
        .dc-price { min-height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: #111; color: #fff; font-weight: 800; box-shadow: inset 0 -3px 0 #c8102e; padding: 0 12px; white-space: nowrap; }
        .dc-yn { display: flex; gap: 8px; }
        .dc-yn button, .dc-tabs button { min-height: 44px; padding: 0 18px; border-radius: 12px; border: 2px solid #d4d4d8; background: #fff; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
        .dc-yn button.on, .dc-tabs button.on { background: #16a34a; border-color: #16a34a; color: #fff; }
        .dc-yn button.on.red { background: #c8102e; border-color: #c8102e; }
        .dc-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
        .dc-tabs button.on { background: #111; border-color: #111; }
        .dc-list { max-height: 240px; overflow-y: auto; border: 1px solid #e3e3e6; border-radius: 12px; background: #fff; }
        .dc-part { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; border-bottom: 1px solid #f1f1f3; background: #fff; padding: 8px 12px; }
        .dc-part:hover:not(:disabled) { background: #f4f4f5; }
        .dc-part:disabled { opacity: .55; }
        .dc-part.on { background: #f0fdf4; }
        .dc-picked { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; border: 2px solid #16a34a; background: #f0fdf4; color: #166534; }
        .tc-yn { display: flex; gap: 10px; }
        .tc-yn button { flex: 1; min-height: 52px; border-radius: 12px; border: 2px solid #d4d4d8; background: #fff; font-weight: 800; letter-spacing: .04em; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .tc-yn button:hover:not(:disabled) { border-color: #111; }
        .tc-yn button.yes.on { background: #16a34a; border-color: #16a34a; color: #fff; }
        .tc-yn button.no.on { background: #f59e0b; border-color: #f59e0b; color: #111; }
      `}</style>
      <Modal.Body className="bg-light">
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <span className="d-inline-flex px-3 py-1 fw-bolder" style={{ background: "#facc15", border: "2px solid #111", borderRadius: 8, letterSpacing: ".08em", fontSize: "1.1rem" }}>{job.regNo}</span>
          <div className="me-auto">
            <div className="fw-bold">{job.jobNo}</div>
            <div className="small text-muted">{job.customerName}</div>
          </div>
          {saved?.completedAt && <Badge bg="success" className="py-2 px-3"><Icon icon="mdi:check-decagram" width="16" height="16" /> Completed</Badge>}
          {canEdit && <Button size="sm" variant="outline-dark" onClick={() => setShowPrices(true)}><Icon icon="mdi:cash-edit" width="18" height="18" /> Prices</Button>}
        </div>

        {locked && <Alert variant="info" className="py-2">This stage is completed. Only the administrator can change it.</Alert>}
        {!locked && !canRecord && <Alert variant="info" className="py-2">This job has not reached this stage yet.</Alert>}
        {error && <Alert ref={errRef} variant="danger" className="py-2" dismissible onClose={() => setError("")}>{error}</Alert>}

        {/* b. Exterior drying inspection */}
        <div className="jc-card">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <div className="jc-title me-auto"><Icon icon="mdi:car-wash" width="20" height="20" /> Exterior Drying Inspection</div>
            {!readOnly && (
              <>
                <Button size="sm" variant="outline-dark" onClick={() => setAll(!all)}>{all ? "Clear all" : "Tick all"}</Button>
                {canEdit && <Button size="sm" variant="dark" onClick={() => setShowEdit(true)}><Icon icon="mdi:playlist-edit" width="18" height="18" /> Edit checklist</Button>}
              </>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <ProgressBar now={total ? (done / total) * 100 : 0} variant={all ? "success" : "dark"} style={{ height: 8, flex: 1 }} />
            <span className="small fw-bold">{done} / {total}</span>
          </div>
          {total === 0 && <Alert variant="warning" className="py-2 small mb-0">No items in the checklist yet.{canEdit ? " Use “Edit checklist” to add them." : ""}</Alert>}
          {groupItems(items).map((g) => (
            <div key={g.name || "_"}>
              {g.name && <div className="jc-group">{g.name}</div>}
              {g.items.map((i) => {
                const on = checked.includes(i.id);
                return (
                  <button key={i.id} type="button" className={`jc-row ${on ? "on" : ""}`} disabled={readOnly} onClick={() => toggle(i.id)} aria-pressed={on}>
                    <span className="jc-box">{on && <Icon icon="mdi:check-bold" width="18" height="18" />}</span>
                    <span className="jc-label">{i.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* c. Fluid level inspection */}
        <div className="jc-card">
          <div className="jc-title mb-3"><Icon icon="mdi:oil-level" width="20" height="20" /> Fluid Level Inspection</div>
          {fluids.length === 0 && <Alert variant="warning" className="py-2 small mb-0">No fluids set up.</Alert>}
          {fluids.map((f) => (
            <FluidRow key={f.id} f={f} opt={options} disabled={readOnly} value={fluidVals[f.id]} onChange={(v) => { setError(""); setFluidVals((p) => ({ ...p, [f.id]: v })); }} />
          ))}
        </div>

        {/* D. Filters */}
        <div className="jc-card">
          <div className="jc-title mb-3"><Icon icon="mdi:air-filter" width="20" height="20" /> Check Filters</div>
          {filters.map((f) => (
            <FilterCard key={f.kind} f={f} disabled={readOnly} value={filterVals[f.kind]} onChange={(v) => { setError(""); setFilterVals((p) => ({ ...p, [f.kind]: v })); }} />
          ))}
        </div>

        {/* summary + go to inspection */}
        <div className="jc-card">
          <div className="jc-title mb-2"><Icon icon="mdi:receipt-text-outline" width="20" height="20" /> Extra charges found</div>
          <div className="d-flex justify-content-between py-1 border-bottom"><span className="text-muted">Fluids</span><strong>{money(charge.fl)}</strong></div>
          <div className="d-flex justify-content-between py-1 border-bottom"><span className="text-muted">Filters</span><strong>{money(charge.fi)}</strong></div>
          <div className="d-flex justify-content-between py-2 fs-5"><span className="fw-bold">Total</span><strong>{money(charge.sum)}</strong></div>

          <div className="jc-title mt-3 mb-2"><Icon icon="mdi:arrow-right-bold-circle-outline" width="20" height="20" /> Go to Inspection</div>
          <div className="tc-yn">
            <button type="button" className={`yes ${goInspection === true ? "on" : ""}`} disabled={readOnly} onClick={() => { setError(""); setGoInspection(true); }}><Icon icon="mdi:check-circle-outline" width="22" height="22" /> YES</button>
            <button type="button" className={`no ${goInspection === false ? "on" : ""}`} disabled={readOnly} onClick={() => { setError(""); setGoInspection(false); }}><Icon icon="mdi:clock-outline" width="22" height="22" /> NOT YET</button>
          </div>
          {goInspection === false && <div className="small text-muted mt-2">The job stays in the drying area. Save now and complete it when it is ready for the inspection.</div>}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" className="cm-cancel" onClick={onHide} disabled={saving}>Cancel</Button>
        {!readOnly && (
          <>
            <Button variant="outline-success" onClick={() => submit(false)} disabled={saving}><Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : "Save"}</Button>
            <Button variant="success" onClick={() => submit(true)} disabled={saving}><Icon icon="mdi:check-circle-outline" width="20" height="20" /> Complete & go to Inspection</Button>
          </>
        )}
      </Modal.Footer>

      {showEdit && <ManageItems department={{ id: job.departmentId, name: job.departmentName }} onHide={() => setShowEdit(false)} />}
      {showPrices && <ManagePrices onHide={() => setShowPrices(false)} />}
    </>
  );
}

/* ----------------------------- the window ----------------------------- */
export default function WashDryingAreaModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error, refetch } = useGetDryingCheckQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  return (
    <Modal show={Boolean(jobId)} onHide={onHide} size="xl" fullscreen="md-down" scrollable centered backdrop="static" dialogClassName="cm-modal">
      <style>{`
        @media (min-width: 992px) { .modal-dialog.cm-modal { --bs-modal-width: 860px; } }
        .cm-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
        .cm-modal .cm-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .cm-modal .modal-body { background: #f6f6f7 !important; padding: 18px 22px; }
        .cm-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 22px; }
        .cm-modal .btn-outline-success { color: #111; border: 1.5px solid #111; border-radius: 12px; font-weight: 600; background: #fff; min-height: 46px; padding: 0 20px; }
        .cm-modal .btn-outline-success:hover { color: #fff; background: #111; border-color: #111; }
        .cm-modal .modal-footer .btn-success { color: #fff !important; border: 0 !important; border-radius: 12px; font-weight: 700; min-height: 46px; padding: 0 22px; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e, 0 8px 18px -8px rgba(0,0,0,.6); }
        .cm-modal .cm-cancel { border-radius: 12px; min-height: 46px; padding: 0 20px; font-weight: 600; background: #fff; color: #111; border: 1.5px solid #c4c4ca; }
        .cm-modal .form-control { border-radius: 12px; border: 1.5px solid #c4c4ca; min-height: 46px; }
        .cm-modal .form-control:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .cm-modal .form-check-input:checked { background-color: #16a34a; border-color: #16a34a; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="cm-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-white">
          <Icon icon="mdi:car-wash" width="28" height="28" />
          Drying Area
          {data && <span className="fw-normal small" style={{ color: "rgba(255,255,255,.75)" }}>· {data.job.departmentName}</span>}
        </Modal.Title>
      </Modal.Header>

      {isLoading && <Modal.Body className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading...</Modal.Body>}
      {isError && (
        <Modal.Body>
          <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-0">
            <span>{error?.data?.message || "Failed to load the drying area stage."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        </Modal.Body>
      )}
      {data && <DryingForm key={data.job.id} data={data} onHide={onHide} onSaved={onSaved} />}
    </Modal>
  );
}