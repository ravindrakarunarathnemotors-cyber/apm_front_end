"use client";

import { useState } from "react";
import { Alert, Badge, Button, FormControl, InputGroup, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useGetComplaintListsQuery,
  useAddComplaintOptionMutation,
  useUpdateComplaintOptionMutation,
  useRemoveComplaintOptionMutation,
} from "@/store/features/apiSlice";

// Add / alter / remove the items of a department's type lists.
// The server only allows users whose role is listed in MANAGE_LIST_ROLE_IDS (backend/complaint.routes.js).

const showsPrice = () => true;   // every list: child types have a price
const priceLabel = (list) => (/repair/i.test(list.title) ? "Labour price" : "Price");
const isRepairList = (list) => list.code === "REPAIR_TYPE" || /repair type/i.test(list.title);
const errText = (err, fallback) => err?.data?.message || fallback;

function OptionRow({ option, hasPrice, groupsId, list }) {
  const [name, setName] = useState(option.name);
  const [group, setGroup] = useState(option.groupName || "");
  const [price, setPrice] = useState(option.price ?? "");

  const [update, { isLoading: saving }] = useUpdateComplaintOptionMutation();
  const [remove, { isLoading: removing }] = useRemoveComplaintOptionMutation();

  const dirty =
    name.trim() !== option.name ||
    group.trim() !== (option.groupName || "") ||
    (hasPrice && String(price) !== String(option.price ?? ""));

  const save = async () => {
    const dup = list && findDup(list, name, group, option.id); if (dup) return dupAlert(dup);
    try {
      await update({
        id: option.id,
        name,
        groupName: group,
        ...(hasPrice ? { price } : {}),
      }).unwrap();
    } catch (err) {
      Swal.fire({ title: "Error", text: errText(err, "Failed to update."), icon: "error" });
    }
  };

  const toggleActive = async () => {
    if (option.isActive) {
      const ok = await Swal.fire({
        title: "Remove this item?",
        text: `"${option.name}" will no longer be shown. Jobs that already used it keep their record.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, remove",
      });
      if (!ok.isConfirmed) return;
    }
    try {
      if (option.isActive) await remove(option.id).unwrap();
      else await update({ id: option.id, isActive: true }).unwrap();
    } catch (err) {
      Swal.fire({ title: "Error", text: errText(err, "Failed."), icon: "error" });
    }
  };

  return (
    <tr className={option.isActive ? "" : "table-secondary"} style={option.isActive ? undefined : { opacity: 0.7 }}>
      <td style={{ minWidth: 220 }}>
        <FormControl size="sm" value={name} onChange={(e) => setName(e.target.value)} disabled={!option.isActive} />
      </td>
      <td style={{ minWidth: 150 }}>
        <FormControl size="sm" list={groupsId} value={group} onChange={(e) => setGroup(e.target.value)} placeholder="(no group)" disabled={!option.isActive} />
      </td>
      {hasPrice && (
        <td style={{ width: 140 }}>
          <FormControl size="sm" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Labour Rs." disabled={!option.isActive} />
        </td>
      )}
      <td className="text-end text-nowrap">
        {option.isActive && dirty && (
          <Button size="sm" variant="primary" className="me-1" onClick={save} disabled={saving}>
            {saving ? "..." : "Save"}
          </Button>
        )}
        <Button size="sm" variant={option.isActive ? "outline-danger" : "outline-success"} onClick={toggleActive} disabled={removing}>
          {option.isActive ? (
            <>
              <Icon icon="mdi:delete-outline" width="16" height="16" /> Remove
            </>
          ) : (
            <>
              <Icon icon="mdi:restore" width="16" height="16" /> Restore
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

function AddRow({ list, groupsId }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [price, setPrice] = useState("");
  const [add, { isLoading }] = useAddComplaintOptionMutation();

  const submit = async () => {
    if (!name.trim()) return;
    const dup = findDup(list, name, group); if (dup) return dupAlert(dup);
    try {
      await add({ listId: list.id, name, groupName: group, ...(list.hasPrice ? { price } : {}) }).unwrap();
      setName("");
      setGroup("");
      setPrice("");
    } catch (err) {
      Swal.fire({ title: "Error", text: errText(err, "Failed to add."), icon: "error" });
    }
  };

  return (
    <tr className="table-light">
      <td>
        <FormControl size="sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="New item name" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </td>
      <td>
        <FormControl size="sm" list={groupsId} value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group (pick one or type a new group)" />
      </td>
      {list.hasPrice && (
        <td>
          <FormControl size="sm" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Rs." />
        </td>
      )}
      <td className="text-end">
        <Button size="sm" variant="success" onClick={submit} disabled={isLoading || !name.trim()}>
          <Icon icon="mdi:plus" width="16" height="16" /> Add
        </Button>
      </td>
    </tr>
  );
}

/* ---------- Parent type > child types (Repair Type): the price is only on the child types ---------- */
// the same name cannot be used twice inside the same parent type (upper / lower case ignored); other parents may reuse it
const findDup = (list, name, group, exceptId) => {
  const n = String(name || "").trim().toLowerCase();
  const g = String(group || "").trim().toLowerCase();
  return list.options.find((o) => o.id !== exceptId && o.name.trim().toLowerCase() === n && String(o.groupName || "").trim().toLowerCase() === g);
};
const dupAlert = (dup) => Swal.fire({
  title: "Already added",
  text: `"${dup.name}" already exists${dup.groupName ? ` under "${dup.groupName}"` : ""}${dup.isActive ? "." : " but it was removed. Restore it instead of adding it again."}`,
  icon: "warning",
});
const swalErr = (err, fallback) => Swal.fire({ title: "Error", text: errText(err, fallback), icon: "error" });
const rs = (n) => (n == null || n === "" ? null : `Rs. ${Number(n).toLocaleString("en-LK")}`);

function ChildRow({ option, list }) {
  const [name, setName] = useState(option.name);
  const [price, setPrice] = useState(option.price ?? "");
  const [update, { isLoading: saving }] = useUpdateComplaintOptionMutation();
  const [remove, { isLoading: removing }] = useRemoveComplaintOptionMutation();
  const dirty = name.trim() !== option.name || (showsPrice(list) && String(price) !== String(option.price ?? ""));

  const save = async () => {
    const dup = findDup(list, name, option.groupName, option.id); if (dup) return dupAlert(dup);
    try { await update({ id: option.id, name, ...(showsPrice(list) ? { price } : {}) }).unwrap(); } catch (err) { swalErr(err, "Failed to update."); } };
  const toggle = async () => {
    try { if (option.isActive) await remove(option.id).unwrap(); else await update({ id: option.id, isActive: true }).unwrap(); }
    catch (err) { swalErr(err, "Failed."); }
  };

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 p-2 mb-2 bg-white rounded-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15,23,42,.08)", ...(option.isActive ? {} : { opacity: 0.6 }) }}>
      <Icon icon="mdi:subdirectory-arrow-right" width="18" height="18" className="text-muted flex-shrink-0" />
      <FormControl size="sm" className="flex-grow-1" style={{ minWidth: 180, flexBasis: 220 }} value={name} onChange={(e) => setName(e.target.value)} disabled={!option.isActive} aria-label="Child type" />
      {showsPrice(list) && (
        <InputGroup size="sm" style={{ width: 170 }}>
          <InputGroup.Text className="bg-white text-muted">Rs.</InputGroup.Text>
          <FormControl type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={priceLabel(list)} disabled={!option.isActive} aria-label={priceLabel(list)} />
        </InputGroup>
      )}
      <div className="d-flex gap-1 ms-auto">
        {option.isActive && dirty && <Button size="sm" variant="primary" onClick={save} disabled={saving}><Icon icon="mdi:content-save-outline" width="16" height="16" /> {saving ? "..." : "Save"}</Button>}
        <Button size="sm" variant={option.isActive ? "outline-danger" : "outline-success"} onClick={toggle} disabled={removing} title={option.isActive ? "Remove" : "Restore"} aria-label={option.isActive ? "Remove" : "Restore"}>
          <Icon icon={option.isActive ? "mdi:delete-outline" : "mdi:restore"} width="16" height="16" />
        </Button>
      </div>
    </div>
  );
}

function AddChildRow({ list, parent }) {
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [add, { isLoading }] = useAddComplaintOptionMutation();
  const submit = async () => {
    if (!name.trim()) return;
    const dup = findDup(list, name, parent); if (dup) return dupAlert(dup);
    try { await add({ listId: list.id, name, groupName: parent, ...(showsPrice(list) ? { price } : {}) }).unwrap(); setName(""); setPrice(""); }
    catch (err) { swalErr(err, "Failed to add."); }
  };
  if (!openForm) {
    return (
      <Button size="sm" variant="outline-success" className="mt-1 d-inline-flex align-items-center gap-1" onClick={() => setOpenForm(true)}>
        <Icon icon="mdi:plus" width="16" height="16" /> Add child type
      </Button>
    );
  }
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mt-1 p-2 rounded-3 bg-white" style={{ border: "1px solid #86efac", boxShadow: "0 2px 6px rgba(22,163,74,.12)" }}>
      <FormControl size="sm" autoFocus className="flex-grow-1" style={{ minWidth: 180, flexBasis: 220 }} value={name} onChange={(e) => setName(e.target.value)} placeholder={`New child type of "${parent}"`} onKeyDown={(e) => e.key === "Enter" && submit()} />
      {showsPrice(list) && (
        <InputGroup size="sm" style={{ width: 170 }}>
          <InputGroup.Text className="bg-white text-muted">Rs.</InputGroup.Text>
          <FormControl type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={priceLabel(list)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        </InputGroup>
      )}
      <div className="d-flex gap-1 ms-auto">
        <Button size="sm" variant="success" onClick={submit} disabled={isLoading || !name.trim()}><Icon icon="mdi:check" width="16" height="16" /> Add</Button>
        <Button size="sm" variant="outline-secondary" onClick={() => { setOpenForm(false); setName(""); setPrice(""); }} aria-label="Cancel"><Icon icon="mdi:close" width="16" height="16" /></Button>
      </div>
    </div>
  );
}

function ParentBlock({ list, parent, parentOption, children, open, onToggle, color }) {
  const [name, setName] = useState(parent);
  const [update, { isLoading: saving }] = useUpdateComplaintOptionMutation();
  const [remove] = useRemoveComplaintOptionMutation();
  const active = parentOption ? parentOption.isActive : true;
  const dirty = parentOption && name.trim() && name.trim() !== parent;
  const activeKids = children.filter((c) => c.isActive);
  const prices = activeKids.map((c) => c.price).filter((v) => v != null);

  const rename = async () => {
    const dup = findDup(list, name, "", parentOption.id); if (dup) return dupAlert(dup);
    try {
      await update({ id: parentOption.id, name }).unwrap();
      for (const c of children) await update({ id: c.id, groupName: name }).unwrap();   // the children follow the new parent name
    } catch (err) { swalErr(err, "Failed to rename."); }
  };
  const removeParent = async () => {
    const ok = await Swal.fire({
      title: "Remove this parent type?",
      text: `"${parent}"${activeKids.length ? ` and its ${activeKids.length} child type${activeKids.length === 1 ? "" : "s"}` : ""} will no longer be shown. Jobs that already used them keep their record.`,
      icon: "warning", showCancelButton: true, confirmButtonText: "Yes, remove",
    });
    if (!ok.isConfirmed) return;
    try { for (const c of activeKids) await remove(c.id).unwrap(); await remove(parentOption.id).unwrap(); }
    catch (err) { swalErr(err, "Failed."); }
  };
  const restoreParent = async () => { try { await update({ id: parentOption.id, isActive: true }).unwrap(); } catch (err) { swalErr(err, "Failed."); } };

  return (
    <div className="bg-white rounded-3 mb-3 overflow-hidden" style={{ border: "1px solid #e2e8f0", borderLeft: `5px solid ${active ? color : "#94a3b8"}`, boxShadow: "0 2px 8px rgba(15,23,42,.08)", opacity: active ? 1 : 0.7 }}>
      <div className="d-flex flex-wrap align-items-center gap-2 p-2 px-3" role="button" onClick={onToggle} aria-expanded={open} style={{ background: active ? `color-mix(in srgb, ${color} ${open ? 14 : 8}%, white)` : "#f1f5f9" }}>
        <Icon icon={open ? "mdi:chevron-down" : "mdi:chevron-right"} width="22" height="22" className="text-muted flex-shrink-0" />
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 32, height: 32, color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
          <Icon icon="mdi:folder-outline" width="18" height="18" />
        </span>
        {open && parentOption ? (
          <FormControl size="sm" className="fw-semibold" style={{ maxWidth: 320 }} value={name} onClick={(e) => e.stopPropagation()} onChange={(e) => setName(e.target.value)} disabled={!active} aria-label="Parent type name" />
        ) : (
          <span className="fw-semibold">{parent}</span>
        )}
        <Badge bg="light" text="dark" className="border fw-normal">{activeKids.length} child type{activeKids.length === 1 ? "" : "s"}</Badge>
        {showsPrice(list) && prices.length > 0 && <Badge bg="success-subtle" text="success-emphasis" className="fw-normal">{rs(Math.min(...prices))}{Math.min(...prices) !== Math.max(...prices) ? ` - ${rs(Math.max(...prices))}` : ""}</Badge>}
        {!active && <Badge bg="secondary">Removed</Badge>}
        <div className="ms-auto d-flex gap-1" onClick={(e) => e.stopPropagation()}>
          {dirty && <Button size="sm" variant="primary" onClick={rename} disabled={saving}><Icon icon="mdi:content-save-outline" width="16" height="16" /> {saving ? "..." : "Save name"}</Button>}
          {parentOption && (active
            ? <Button size="sm" variant="outline-danger" onClick={removeParent} title="Remove parent type" aria-label="Remove parent type"><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>
            : <Button size="sm" variant="outline-success" onClick={restoreParent} title="Restore" aria-label="Restore"><Icon icon="mdi:restore" width="16" height="16" /></Button>)}
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-3" style={{ background: "#f8fafc", borderTop: `2px solid color-mix(in srgb, ${color} 35%, white)` }}>
          {children.length === 0 && <div className="text-muted small pb-2">No child types yet.</div>}
          {children.map((c) => <ChildRow key={`${c.id}-${c.name}-${c.isActive}-${c.price}`} option={c} list={list} />)}
          {active && <AddChildRow list={list} parent={parent} />}
        </div>
      )}
    </div>
  );
}

function AddParentRow({ list }) {
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState("");
  const [add, { isLoading }] = useAddComplaintOptionMutation();
  const submit = async () => {
    if (!name.trim()) return;
    const dup = findDup(list, name, ""); if (dup) return dupAlert(dup);
    try { await add({ listId: list.id, name }).unwrap(); setName(""); }
    catch (err) { swalErr(err, "Failed to add."); }
  };
  if (!openForm) {
    return (
      <Button variant="primary" className="mb-3 d-inline-flex align-items-center gap-1" style={{ boxShadow: "0 2px 6px rgba(37,99,235,.25)" }} onClick={() => setOpenForm(true)}>
        <Icon icon="mdi:folder-plus-outline" width="18" height="18" /> New parent type
      </Button>
    );
  }
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 p-3 rounded-3 mb-3 bg-white" style={{ border: "1px solid #bfdbfe", boxShadow: "0 2px 8px rgba(37,99,235,.15)" }}>
      <FormControl autoFocus className="flex-grow-1" style={{ minWidth: 220, flexBasis: 260 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Parent type name, e.g. Engine Overhaul" onKeyDown={(e) => e.key === "Enter" && submit()} />
      <Button variant="primary" className="text-nowrap" onClick={submit} disabled={isLoading || !name.trim()}><Icon icon="mdi:check" width="18" height="18" /> Add parent</Button>
      <Button variant="outline-secondary" onClick={() => { setOpenForm(false); setName(""); }} aria-label="Cancel"><Icon icon="mdi:close" width="18" height="18" /></Button>
    </div>
  );
}

// Repair Type: parent types (no group) with their child types (group = parent name). Price is on the child types only.
function TreeList({ list, query = "", color = "#2563eb" }) {
  const [openSet, setOpenSet] = useState(() => new Set());
  const needle = query.trim().toLowerCase();
  const parents = list.options.filter((o) => !(o.groupName || "").trim());
  const kidsOf = (name) => list.options.filter((o) => (o.groupName || "").trim().toLowerCase() === name.toLowerCase());
  const known = new Set(parents.map((p) => p.name.toLowerCase()));
  const orphanGroups = [...new Set(list.options.map((o) => (o.groupName || "").trim()).filter((g) => g && !known.has(g.toLowerCase())))];
  const blocks = [
    ...parents.map((p) => ({ key: `p${p.id}`, name: p.name, option: p, kids: kidsOf(p.name) })),
    ...orphanGroups.map((g) => ({ key: `g${g}`, name: g, option: null, kids: kidsOf(g) })),
  ].filter((b) => !needle || b.name.toLowerCase().includes(needle) || b.kids.some((k) => k.name.toLowerCase().includes(needle)));
  const toggle = (k) => setOpenSet((cur) => { const n = new Set(cur); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const allOpen = blocks.length > 0 && blocks.every((b) => openSet.has(b.key));

  return (
    <>
      <AddParentRow list={list} />
      {blocks.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-muted small">{blocks.length} parent type{blocks.length === 1 ? "" : "s"}{needle ? " found" : ""}</span>
          <Button size="sm" variant="link" className="p-0" onClick={() => setOpenSet(allOpen ? new Set() : new Set(blocks.map((b) => b.key)))}>{allOpen ? "Collapse all" : "Expand all"}</Button>
        </div>
      )}
      {blocks.map((b) => (
        <ParentBlock 
  key={`${b.key}-${b.name}-${b.option?.isActive}`} 
  list={list} 
  parent={b.name} 
  parentOption={b.option}
  open={!!needle || openSet.has(b.key)} 
  onToggle={() => toggle(b.key)} 
  color={color}
>
  {b.kids}
</ParentBlock>
      ))}
      {blocks.length === 0 && (
        <div className="text-center text-muted py-4 bg-white border rounded-3">
          <Icon icon="mdi:folder-open-outline" width="34" height="34" />
          <div className="mt-1">{needle ? "No types match your search." : "No parent types yet. Add the first one above."}</div>
        </div>
      )}
    </>
  );
}

// The lists of one department (add / alter / remove). Used by the "Manage lists" window and by the dashboard "Repair Type" window.
export function ManageListsBody({ departmentId, query = "", color = "#2563eb" }) {
  const { data: lists = [], isLoading, isError, error, refetch } = useGetComplaintListsQuery(departmentId, { skip: !departmentId });

  return (
    <>
      {isLoading && (
        <div className="text-center text-muted py-4">
          <Spinner animation="border" size="sm" className="me-2" /> Loading...
        </div>
      )}

      {isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>{error?.data?.message || "Failed to load the lists."}</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
        </Alert>
      )}

      {lists.map((list) => {
                return (
          <div key={list.id} className="mb-4">
            <h6 className="fw-bold d-flex align-items-center gap-2 flex-wrap">
              <Icon icon="mdi:format-list-bulleted-type" width="20" height="20" style={{ color: color || "#2563eb" }} />
              {list.title}
              <Badge bg="light" text="dark" className="border fw-normal">
                {list.selection === "SINGLE" ? "select one" : "select many"}
              </Badge>
            </h6>
            <TreeList list={list} query={query} color={color} />
          </div>
        );
      })}

      {!isLoading && !isError && lists.length === 0 && (
        <Alert variant="warning" className="mb-0">No lists for this department yet.</Alert>
      )}
    </>
  );
}

export default function ManageOptionsModal({ departmentId, departmentName, onHide }) {
  return (
    <Modal show onHide={onHide} size="xl" scrollable centered fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          <Icon icon="mdi:playlist-edit" width="24" height="24" className="me-2" />
          Manage lists / {departmentName}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
        <ManageListsBody departmentId={departmentId} />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}