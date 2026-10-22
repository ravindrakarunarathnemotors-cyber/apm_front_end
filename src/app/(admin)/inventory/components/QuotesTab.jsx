"use client";

import { useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import { useAnswerSpareQuoteMutation, useGetSpareQuotesQuery } from "@/store/features/apiSlice";
import { Empty, Loader, Panel, StatusBadge, money, when } from "./inventoryUi";

// Third-party quotation requests (photo + description) from all jobs
export default function QuotesTab() {
  const [status, setStatus] = useState("pending");
  const { data = [], isLoading, isError, refetch } = useGetSpareQuotesQuery(status);
  const [answer] = useAnswerSpareQuoteMutation();

  const reply = async (q) => {
    const r = await Swal.fire({
      title: `Quotation · ${q.jobNo}`, text: q.description, input: "number", inputLabel: "Quoted price (LKR)", inputValue: q.quotedPrice || "",
      inputAttributes: { min: 0, step: "any" }, showCancelButton: true, confirmButtonText: "Save price",
      inputValidator: (v) => (!(Number(v) > 0) ? "Enter a valid price" : undefined),
    });
    if (!r.isConfirmed) return;
    try { await answer({ id: q.id, price: r.value, note: q.quotedNote || "" }).unwrap(); }
    catch (ex) { Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not save the price.", icon: "error" }); }
  };

  return (
    <Panel
      title={<>Third-party quotations <Badge bg="secondary" pill>{data.length}</Badge></>}
      icon="mdi:file-document-edit-outline"
      action={
        <ButtonGroup size="sm">
          <Button variant={status === "pending" ? "primary" : "outline-secondary"} onClick={() => setStatus("pending")}>To answer</Button>
          <Button variant={status === "all" ? "primary" : "outline-secondary"} onClick={() => setStatus("all")}>All</Button>
        </ButtonGroup>
      }
    >
      {isLoading ? <Loader /> : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load quotations.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>
      ) : data.length === 0 ? <Empty text="No quotation requests" icon="mdi:file-document-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Job</th><th>Photo</th><th>Description</th><th>Requested</th><th>Status</th><th className="text-end">Quoted (LKR)</th><th /></tr></thead>
          <tbody>
            {data.map((q) => (
              <tr key={q.id}>
                <td><div className="fw-semibold">{q.jobNo}</div><small className="text-muted">{q.regNo}</small></td>
                <td>{q.photoUrl ? <a href={q.photoUrl} target="_blank" rel="noreferrer"><img src={q.photoUrl} alt="Part" className="rounded" style={{ width: 48, height: 48, objectFit: "cover" }} /></a> : "-"}</td>
                <td style={{ maxWidth: 320 }}>{q.description}</td>
                <td className="small text-nowrap">{when(q.createdAt)}</td>
                <td><StatusBadge status={q.status === "QUOTED" ? "Quoted" : "Waiting for price"} /></td>
                <td className="text-end fw-semibold">{q.quotedPrice != null ? money(q.quotedPrice) : "-"}</td>
                <td className="text-end"><Button size="sm" variant={q.status === "QUOTED" ? "outline-secondary" : "outline-primary"} onClick={() => reply(q)}>{q.status === "QUOTED" ? "Change price" : "Enter price"}</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}