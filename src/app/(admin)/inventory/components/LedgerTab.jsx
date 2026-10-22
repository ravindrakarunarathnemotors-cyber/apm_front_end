"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Col, FormControl, FormSelect, InputGroup, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetStockLedgerQuery } from "@/store/features/apiSlice";
import { Empty, Loader, MOVE_META, MoveBadge, Panel, money, qtyFmt, when } from "./inventoryUi";

// The whole stock ledger (every movement)
export default function LedgerTab() {
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { data = [], isLoading, isError, refetch } = useGetStockLedgerQuery({ type, q: dq });

  return (
    <Panel title={<>Stock ledger <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:book-open-variant">
      <Row className="g-2 mb-3">
        <Col xs={12} md={5}>
          <InputGroup>
            <InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></InputGroup.Text>
            <FormControl value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item / job / reference" autoComplete="off" />
          </InputGroup>
        </Col>
        <Col xs={12} md={3}>
          <FormSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All movement types</option>
            {Object.entries(MOVE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </FormSelect>
        </Col>
      </Row>

      {isLoading ? <Loader /> : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load the ledger.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>
      ) : data.length === 0 ? <Empty text="No movements found" icon="mdi:book-open-variant" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Date</th><th>Type</th><th>Item</th><th className="text-end">Qty</th><th className="text-end">Unit cost</th><th>Location</th><th>Job / Ref</th><th>Technician</th><th>By</th><th>Note</th></tr></thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td className="small text-nowrap">{when(m.createdAt)}</td>
                <td><MoveBadge type={m.type} /></td>
                <td className="fw-semibold">{m.item}</td>
                <td className={`text-end fw-bold text-nowrap ${m.qty < 0 ? "text-danger" : "text-success"}`}>{m.qty > 0 ? "+" : ""}{qtyFmt(m.qty)} <small className="text-muted fw-normal">{m.unit}</small></td>
                <td className="text-end">{money(m.unitCost)}</td>
                <td className="small">{m.location}</td>
                <td className="small">{m.jobNo || m.refNo || "-"}</td>
                <td className="small">{m.technician || "-"}</td>
                <td className="small">{m.by || "-"}</td>
                <td className="small text-muted">{m.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}