"use client";

import { useState } from "react";
import { Alert, Badge, Button, FormControl, Modal, Spinner, Table } from "react-bootstrap";
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

const errText = (err, fallback) => err?.data?.message || fallback;

function OptionRow({ option, hasPrice }) {
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
        <FormControl size="sm" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="(no group)" disabled={!option.isActive} />
      </td>
      {hasPrice && (
        <td style={{ width: 140 }}>
          <FormControl size="sm" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Rs." disabled={!option.isActive} />
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

function AddRow({ list }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [price, setPrice] = useState("");
  const [add, { isLoading }] = useAddComplaintOptionMutation();

  const submit = async () => {
    if (!name.trim()) return;
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
        <FormControl size="sm" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group (optional)" />
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

export default function ManageOptionsModal({ departmentId, departmentName, onHide }) {
  const { data: lists = [], isLoading, isError, error, refetch } = useGetComplaintListsQuery(departmentId);

  return (
    <Modal show onHide={onHide} size="xl" scrollable centered fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          <Icon icon="mdi:playlist-edit" width="24" height="24" className="me-2" />
          Manage lists / {departmentName}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
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

        {lists.map((list) => (
          <div key={list.id} className="bg-white border rounded p-3 mb-3">
            <h6 className="fw-bold">
              {list.title}{" "}
              <Badge bg="light" text="dark" className="border fw-normal">
                {list.selection === "SINGLE" ? "select one" : "select many"}
              </Badge>
            </h6>
            <Table responsive size="sm" className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Group</th>
                  {list.hasPrice && <th>Price (Rs.)</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.options.map((o) => (
                  <OptionRow key={`${o.id}-${o.name}-${o.isActive}-${o.price}-${o.groupName}`} option={o} hasPrice={list.hasPrice} />
                ))}
                <AddRow list={list} />
              </tbody>
            </Table>
          </div>
        ))}

        {!isLoading && !isError && lists.length === 0 && (
          <Alert variant="warning" className="mb-0">No lists for this department yet.</Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}