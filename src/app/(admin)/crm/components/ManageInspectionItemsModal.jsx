"use client";

import { useState } from "react";
import { Alert, Button, Form, FormControl, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddInspectionItemMutation,
  useGetInspectionItemsQuery,
  useRemoveInspectionItemMutation,
  useUpdateInspectionItemMutation,
} from "@/store/features/apiSlice";

// Initial Vehicle Inspection checklist of a department: add / rename / active-inactive / remove.
// Props: department { id, name }, onHide

function Row({ item, busy, setBusy }) {
  const [name, setName] = useState(item.name);
  const [update] = useUpdateInspectionItemMutation();
  const [remove] = useRemoveInspectionItemMutation();
  const dirty = name.trim() !== item.name;

  const run = async (fn, fail) => {
    setBusy(true);
    try {
      await fn();
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || fail, icon: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 border rounded-3 p-2 px-3 bg-white ${item.isActive ? "" : "opacity-75"}`}>
      <FormControl size="sm" className="flex-grow-1" style={{ minWidth: 160, width: "auto" }} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-label="Item name" />
      <Form.Check
        type="switch"
        id={`item-${item.id}`}
        label={item.isActive ? "Active" : "Inactive"}
        checked={item.isActive}
        disabled={busy}
        onChange={(e) => run(() => update({ id: item.id, name: item.name, isActive: e.target.checked }).unwrap(), "Could not change the status.")}
      />
      <Button size="sm" disabled={busy || !dirty || !name.trim()} onClick={() => run(() => update({ id: item.id, name: name.trim(), isActive: item.isActive }).unwrap(), "Failed to save.")}>
        Save
      </Button>
      <Button
        size="sm"
        variant="outline-danger"
        disabled={busy}
        title="Remove from the checklist"
        onClick={async () => {
          const ask = await Swal.fire({
            title: `Remove "${item.name}"?`,
            text: "It is removed from the checklist. Jobs that already used it keep their saved result.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Remove",
          });
          if (ask.isConfirmed) run(() => remove(item.id).unwrap(), "Failed to remove.");
        }}
      >
        <Icon icon="mdi:trash-can-outline" width="16" height="16" />
      </Button>
    </div>
  );
}

export default function ManageInspectionItemsModal({ department, onHide }) {
  const { data, isLoading, isError, refetch } = useGetInspectionItemsQuery(department?.id, { skip: !department?.id });
  const [add] = useAddInspectionItemMutation();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Item name is required");
    setError("");
    setBusy(true);
    try {
      await add({ departmentId: department.id, name: name.trim() }).unwrap();
      setName("");
    } catch (ex) {
      setError(ex?.data?.message || "Failed to add the item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered scrollable backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Inspection checklist <span className="text-muted fw-normal">· {department?.name}</span></Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        {error && <Alert variant="danger" className="py-2" dismissible onClose={() => setError("")}>{error}</Alert>}
        <Form onSubmit={submit} className="d-flex gap-2 mb-3" noValidate>
          <FormControl value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="New checklist item, e.g. Windscreen" />
          <Button type="submit" disabled={busy} className="text-nowrap"><Icon icon="mdi:plus" width="18" height="18" /> Add</Button>
        </Form>

        {isLoading ? (
          <div className="text-center text-muted py-4"><Spinner animation="border" size="sm" className="me-2" /> Loading...</div>
        ) : isError ? (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>Failed to load.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        ) : (data?.items || []).length === 0 ? (
          <div className="text-center text-muted py-4">No items yet. Add the first one above.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {data.items.map((it) => <Row key={`${it.id}-${it.name}-${it.isActive}`} item={it} busy={busy} setBusy={setBusy} />)}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}