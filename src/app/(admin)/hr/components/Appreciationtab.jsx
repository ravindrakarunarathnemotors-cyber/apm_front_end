"use client";

import { useState } from "react";
import { Button, Col, Form, FormControl, FormSelect, Modal, Row } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { APPRECIATION_BADGES, fmtDate, iso, today } from "./hrData";
import { Avatar, Empty, Panel } from "./hrUi";

function GiveForm({ hr, onClose }) {
  const people = hr.employees.filter((e) => e.status !== "Resigned");
  const [to, setTo] = useState("");
  const [badge, setBadge] = useState("Star Performer");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    if (!to) return setError("Select the employee");
    if (message.trim().length < 5) return setError("Write a short message");
    hr.setAppreciations((prev) => [
      { id: Date.now(), to, from: "EMP-008", badge, message: message.trim(), date: iso(today()) }, // from = logged-in HR user (sample)
      ...prev,
    ]);
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton><Modal.Title className="fs-5">Give appreciation</Modal.Title></Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <Form.Label className="small mb-1">Employee</Form.Label>
        <FormSelect className="mb-3" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Select employee</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.department}</option>)}
        </FormSelect>

        <Form.Label className="small mb-1">Badge</Form.Label>
        <Row className="g-2 mb-3">
          {Object.entries(APPRECIATION_BADGES).map(([name, b]) => (
            <Col xs={6} key={name}>
              <div
                role="button"
                onClick={() => setBadge(name)}
                className="border rounded-3 p-2 d-flex align-items-center gap-2"
                style={{ borderColor: badge === name ? b.color : undefined, backgroundColor: badge === name ? `color-mix(in srgb, ${b.color} 10%, white)` : "#fff", borderWidth: 2 }}
              >
                <Icon icon={b.icon} width="22" height="22" color={b.color} /> <span className="small fw-semibold">{name}</span>
              </div>
            </Col>
          ))}
        </Row>

        <Form.Label className="small mb-1">Message</Form.Label>
        <FormControl as="textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why does this person deserve it?" />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Send</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function AppreciationTab({ hr }) {
  const { employees, appreciations } = hr;
  const [giving, setGiving] = useState(false);
  const nameOf = (id) => employees.find((e) => e.id === id)?.name || id;
  const deptOf = (id) => employees.find((e) => e.id === id)?.department || "";

  return (
    <Panel
      title="Appreciation"
      icon="mdi:star-circle-outline"
      action={<Button size="sm" onClick={() => setGiving(true)}><Icon icon="mdi:plus" width="18" height="18" /> Give appreciation</Button>}
    >
      {appreciations.length === 0 ? (
        <Empty text="No appreciation yet" icon="mdi:star-outline" />
      ) : (
        <Row className="g-3">
          {appreciations.map((a) => {
            const b = APPRECIATION_BADGES[a.badge];
            return (
              <Col key={a.id} md={6} xl={4}>
                <div className="border rounded-3 p-3 h-100 bg-white d-flex flex-column">
                  <div className="d-flex align-items-center gap-2 mb-3" style={{ color: b.color }}>
                    <Icon icon={b.icon} width="30" height="30" />
                    <strong>{a.badge}</strong>
                    <small className="text-muted ms-auto">{fmtDate(a.date, { day: "2-digit", month: "short" })}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Avatar name={nameOf(a.to)} size={40} />
                    <div><div className="fw-semibold">{nameOf(a.to)}</div><small className="text-muted">{deptOf(a.to)}</small></div>
                  </div>
                  <p className="mb-3 flex-grow-1 text-body-secondary">“{a.message}”</p>
                  <div className="small text-muted border-top pt-2">
                    <Icon icon="mdi:account-arrow-right-outline" width="16" height="16" /> From {nameOf(a.from)}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
      {giving && <GiveForm hr={hr} onClose={() => setGiving(false)} />}
    </Panel>
  );
}