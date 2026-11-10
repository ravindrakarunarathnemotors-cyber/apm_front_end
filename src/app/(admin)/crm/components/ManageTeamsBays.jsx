"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Col, Form, FormControl, FormSelect, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddBayMutation,
  useAddTeamMutation,
  useGetEmployeesQuery,
  useGetTeamDepartmentQuery,
  useGetTeamsBaysQuery,
  useUpdateBayMutation,
  useUpdateTeamMutation,
} from "@/store/features/apiSlice";
import { usePermissions } from "./permissionsApi"; // action permissions

// Teams and Bays of ONE department, managed together in one place (Add / Edit / Active-Inactive).
// A team = name + leader + sub leader (optional) + members (optional). The people are HR employees.
// Rendered inside the Team Allocation window (with onBack) or inside ManageTeamsBaysModal (no onBack).
// Props: departmentName ("Mechanical") and/or departmentId, onBack (optional)
// With only the NAME the id is looked up itself, so it also works when placed anywhere in a page.

const EMPTY_TEAM = { name: "", leaderId: "", subLeaderId: "", memberIds: [], bayId: "", newBay: "" }; // bayId: "" = none, "__new" = create the bay named newBay
const EMPTY_BAY = { name: "", sortOrder: "" };
const label = (e) => `${e.name} (${e.id})${e.designation ? ` · ${e.designation}` : ""}`;

export default function ManageTeamsBays({ departmentId: idProp, departmentName: nameProp, onBack, baysOnly = false }) {
  const needLookup = !idProp && Boolean(nameProp);
  const { data: dept, isLoading: lookingUp, isError: lookupFailed } = useGetTeamDepartmentQuery(nameProp || "", { skip: !needLookup });
  const departmentId = idProp || dept?.id;
  const departmentName = nameProp || dept?.name || "";

  const { data, isLoading: loadingLists, isError, refetch } = useGetTeamsBaysQuery(departmentId, { skip: !departmentId });
  const { data: allEmployees = [] } = useGetEmployeesQuery(); // HR employees (dbId, id = EMP-000N, name, departmentId, status ...)
  const isLoading = lookingUp || loadingLists;

  const [addTeam, { isLoading: addingTeam }] = useAddTeamMutation();
  const [updateTeam, { isLoading: updatingTeam }] = useUpdateTeamMutation();
  const [addBay, { isLoading: addingBay }] = useAddBayMutation();
  const [updateBay, { isLoading: updatingBay }] = useUpdateBayMutation();
  const busy = addingTeam || updatingTeam || addingBay || updatingBay;

  const [tab, setTab] = useState(baysOnly ? "bays" : "teams"); // teams | bays  (baysOnly: no teams, e.g. Wash)
  const [team, setTeam] = useState(EMPTY_TEAM);
  const [bay, setBay] = useState(EMPTY_BAY);
  const [editId, setEditId] = useState(null);
  const [onlyDept, setOnlyDept] = useState(true); // only employees of this department in the pickers
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const isTeams = tab === "teams";
  // team.manage -> teams, bay.manage -> bays. Without the permission the add / edit parts are not shown.
  const { can, ready } = usePermissions();
  const canTeams = can("team.manage"), canBays = can("bay.manage");
  const canWrite = isTeams ? canTeams : canBays;
  useEffect(() => { if (ready && !baysOnly && tab === "teams" && !canTeams && canBays) setTab("bays"); }, [ready, baysOnly, tab, canTeams, canBays]);
  const rows = (isTeams ? data?.teams : data?.bays) || [];

  /* ---------------- people pickers ---------------- */
  const people = useMemo(() => allEmployees.filter((e) => e.status !== "Resigned"), [allEmployees]);
  const byId = useMemo(() => new Map(allEmployees.map((e) => [String(e.dbId), e])), [allEmployees]);
  const selectedIds = new Set([team.leaderId, team.subLeaderId, ...team.memberIds.map(String)].filter(Boolean));
  // the picker list: department filter, but anyone already chosen always stays visible
  const pool = people.filter((e) => !onlyDept || !departmentId || e.departmentId === departmentId || selectedIds.has(String(e.dbId)));

  const setLeader = (id) =>
    setTeam((t) => ({
      ...t,
      leaderId: id,
      subLeaderId: t.subLeaderId === id ? "" : t.subLeaderId,
      memberIds: t.memberIds.filter((m) => String(m) !== id),
    }));
  const setSubLeader = (id) =>
    setTeam((t) => ({ ...t, subLeaderId: id, memberIds: t.memberIds.filter((m) => String(m) !== id) }));
  const toggleMember = (id) =>
    setTeam((t) => ({
      ...t,
      memberIds: t.memberIds.map(String).includes(id) ? t.memberIds.filter((m) => String(m) !== id) : [...t.memberIds, id],
    }));

  const memberChoices = pool.filter(
    (e) =>
      String(e.dbId) !== team.leaderId &&
      String(e.dbId) !== team.subLeaderId &&
      (!search.trim() || label(e).toLowerCase().includes(search.trim().toLowerCase()))
  );

  /* ---------------- form helpers ---------------- */
  const reset = () => {
    setEditId(null);
    setTeam(EMPTY_TEAM);
    setBay(EMPTY_BAY);
    setSearch("");
    setError("");
  };
  const switchTab = (t) => {
    if (baysOnly) return;
    setTab(t);
    reset();
  };

  const startEdit = (r) => {
    setEditId(r.id);
    setError("");
    if (isTeams) {
      setTeam({
        name: r.name,
        leaderId: r.leaderId ? String(r.leaderId) : "",
        subLeaderId: r.subLeaderId ? String(r.subLeaderId) : "",
        memberIds: (r.memberIds || []).map(String),
        bayId: r.bayId ? String(r.bayId) : "",
        newBay: "",
      });
    } else {
      setBay({ name: r.name, sortOrder: String(r.sortOrder ?? "") });
    }
  };

  const teamBody = (isActive) => ({
    name: team.name.trim(),
    leaderId: Number(team.leaderId),
    subLeaderId: team.subLeaderId ? Number(team.subLeaderId) : null,
    memberIds: team.memberIds.map(Number),
    isActive,
    // default bay: an existing one, or a new bay that the server creates together with the team
    ...(team.bayId === "__new" ? { newBayName: team.newBay.trim() } : { bayId: team.bayId ? Number(team.bayId) : null }),
  });

  const save = async () => {
    setError("");
    try {
      if (isTeams) {
        if (!team.name.trim()) return setError("Team name is required");
        if (!team.leaderId) return setError("Select the team leader");
        if (team.bayId === "__new" && !team.newBay.trim()) return setError("Enter the name of the new bay");
        if (editId) {
          const cur = rows.find((r) => r.id === editId);
          await updateTeam({ id: editId, ...teamBody(cur ? cur.isActive : true) }).unwrap();
        } else {
          await addTeam({ departmentId, ...teamBody(true) }).unwrap();
        }
      } else {
        if (!bay.name.trim()) return setError("Bay name is required");
        if (bay.sortOrder.trim() !== "" && !/^-?\d+$/.test(bay.sortOrder.trim())) return setError("Sort order must be a whole number");
        const body = { name: bay.name.trim(), sortOrder: bay.sortOrder.trim() };
        if (editId) {
          const cur = rows.find((r) => r.id === editId);
          await updateBay({ id: editId, ...body, isActive: cur ? cur.isActive : true }).unwrap();
        } else {
          await addBay({ departmentId, ...body, isActive: true }).unwrap();
        }
      }
      reset();
    } catch (ex) {
      setError(ex?.data?.message || "Failed to save.");
    }
  };

  const toggleActive = async (r, next) => {
    if (!next) {
      const ask = await Swal.fire({
        title: `Deactivate "${r.name}"?`,
        text: isTeams
          ? "It can no longer be selected for new allocations. Jobs that already use it are not changed."
          : "It will show as Inactive and cannot be selected. Jobs that already use it are not changed.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Deactivate",
      });
      if (!ask.isConfirmed) return;
    }
    try {
      if (isTeams) {
        // old teams without a leader employee cannot be saved until a leader is chosen
        if (!r.leaderId) return Swal.fire({ title: "Choose a leader first", text: "Edit this team, choose the team leader and save.", icon: "info" });
        await updateTeam({
          id: r.id, name: r.name, leaderId: r.leaderId, subLeaderId: r.subLeaderId, memberIds: r.memberIds, bayId: r.bayId ?? null, isActive: next,
        }).unwrap();
      } else {
        await updateBay({ id: r.id, name: r.name, sortOrder: String(r.sortOrder ?? ""), isActive: next }).unwrap();
      }
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not change the status.", icon: "error" });
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        {onBack && (
          <Button variant="outline-secondary" size="sm" onClick={onBack}>
            <Icon icon="mdi:arrow-left" width="18" height="18" /> Back
          </Button>
        )}
        <h6 className="fw-bold mb-0">{baysOnly ? "Manage bays" : "Manage teams and bays"} <span className="text-muted fw-normal">· {departmentName}</span></h6>
      </div>

      {!departmentId && !lookingUp ? (
        <Alert variant="warning">
          {lookupFailed
            ? `Department "${nameProp}" was not found, or the server could not be reached.`
            : "No department selected. Use <ManageTeamsBays departmentName=\"Mechanical\" />."}
        </Alert>
      ) : (
        <>
          <div className={`d-flex gap-2 mb-3 ${baysOnly ? "d-none" : ""}`}>
            {[["teams", "Teams", "mdi:account-group-outline", data?.teams?.length], ["bays", "Bays", "mdi:garage-variant", data?.bays?.length]].filter(([key]) => (key === "teams" ? canTeams : canBays)).map(([key, text, icon, n]) => (
              <Button key={key} variant={tab === key ? "primary" : "outline-primary"} onClick={() => switchTab(key)}>
                <Icon icon={icon} width="18" height="18" /> {text} {n !== undefined && <Badge bg={tab === key ? "light" : "primary"} text={tab === key ? "dark" : undefined} pill>{n}</Badge>}
              </Button>
            ))}
          </div>

          {error && <Alert variant="danger" className="py-2" dismissible onClose={() => setError("")}>{error}</Alert>}

          {/* Add / Edit form */}
          <div className={`border rounded-3 p-3 bg-white mb-3 ${canWrite ? "" : "d-none"}`}>
            <div className="fw-semibold small mb-2">{editId ? `Edit ${isTeams ? "team" : "bay"}` : `Add ${isTeams ? "team" : "bay"}`}</div>
            <Form noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
              {isTeams ? (
                <Row className="g-3">
                  <Col xs={12}>
                    <Form.Label className="small mb-1">Team name <span className="text-danger">*</span></Form.Label>
                    <FormControl value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} placeholder="e.g. Team A" />
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Label className="small mb-1">Team leader <span className="text-danger">*</span></Form.Label>
                    <FormSelect aria-label="Team leader" value={team.leaderId} onChange={(e) => setLeader(e.target.value)}>
                      <option value="">Select team leader</option>
                      {pool.filter((e) => String(e.dbId) !== team.subLeaderId).map((e) => <option key={e.dbId} value={e.dbId}>{label(e)}</option>)}
                    </FormSelect>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Label className="small mb-1">Sub leader</Form.Label>
                    <FormSelect aria-label="Sub leader" value={team.subLeaderId} onChange={(e) => setSubLeader(e.target.value)}>
                      <option value="">No sub leader</option>
                      {pool.filter((e) => String(e.dbId) !== team.leaderId).map((e) => <option key={e.dbId} value={e.dbId}>{label(e)}</option>)}
                    </FormSelect>
                  </Col>

                  <Col xs={12} md={team.bayId === "__new" ? 6 : 12}>
                    <Form.Label className="small mb-1">Bay</Form.Label>
                    <FormSelect aria-label="Bay" value={team.bayId} onChange={(e) => setTeam({ ...team, bayId: e.target.value, newBay: "" })}>
                      <option value="">No bay</option>
                      {(data?.bays || [])
                        .filter((b) => b.isActive || String(b.id) === team.bayId)
                        .map((b) => <option key={b.id} value={b.id}>{b.name}{b.isActive ? "" : " (inactive)"}</option>)}
                      <option value="__new">+ Create a new bay</option>
                    </FormSelect>
                  </Col>
                  {team.bayId === "__new" && (
                    <Col xs={12} md={6}>
                      <Form.Label className="small mb-1">New bay name <span className="text-danger">*</span></Form.Label>
                      <FormControl value={team.newBay} onChange={(e) => setTeam({ ...team, newBay: e.target.value })} placeholder="e.g. BAY - 7" maxLength={50} />
                    </Col>
                  )}

                  <Col xs={12}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <Form.Label className="small mb-0">
                        Team members <Badge bg="secondary" pill>{team.memberIds.length}</Badge>
                      </Form.Label>
                      <Form.Check
                        type="switch"
                        id="only-dept"
                        className="small"
                        label={`Only ${departmentName || "this department"} employees`}
                        checked={onlyDept}
                        onChange={(e) => setOnlyDept(e.target.checked)}
                      />
                    </div>
                    <FormControl size="sm" className="mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees" />
                    <div className="border rounded-2" style={{ maxHeight: 190, overflowY: "auto" }}>
                      {memberChoices.length === 0 ? (
                        <div className="text-muted small p-3 text-center">
                          {people.length === 0 ? "No employees found. Add employees in HR first." : "No employees to show."}
                        </div>
                      ) : (
                        memberChoices.map((e) => (
                          <Form.Check
                            key={e.dbId}
                            type="checkbox"
                            id={`member-${e.dbId}`}
                            className="px-3 py-2 border-bottom ms-0 d-flex gap-2 align-items-center"
                            label={label(e)}
                            checked={team.memberIds.map(String).includes(String(e.dbId))}
                            onChange={() => toggleMember(String(e.dbId))}
                          />
                        ))
                      )}
                    </div>
                    {/* chosen members that are hidden by the filter / search stay listed here */}
                    {team.memberIds.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {team.memberIds.map((id) => (
                          <Badge key={id} bg="light" text="dark" className="border fw-normal d-inline-flex align-items-center gap-1">
                            {byId.get(String(id))?.name || `#${id}`}
                            <Icon icon="mdi:close" width="14" height="14" role="button" aria-label="Remove member" onClick={() => toggleMember(String(id))} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Col>
                </Row>
              ) : (
                <Row className="g-2">
                  <Col xs={12} md={6}>
                    <Form.Label className="small mb-1">Bay name <span className="text-danger">*</span></Form.Label>
                    <FormControl value={bay.name} onChange={(e) => setBay({ ...bay, name: e.target.value })} placeholder="e.g. BAY - 5" />
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Label className="small mb-1">Sort order</Form.Label>
                    <FormControl value={bay.sortOrder} onChange={(e) => setBay({ ...bay, sortOrder: e.target.value })} placeholder="Empty = at the end" inputMode="numeric" />
                  </Col>
                </Row>
              )}

              <div className="d-flex gap-2 mt-3">
                <Button type="submit" disabled={busy}>
                  {busy ? <Spinner animation="border" size="sm" /> : editId ? "Update" : isTeams ? "Add team" : "Add bay"}
                </Button>
                {editId && <Button variant="secondary" onClick={reset} disabled={busy}>Cancel</Button>}
              </div>
            </Form>
          </div>

          {/* list */}
          {isLoading ? (
            <div className="text-center text-muted py-4"><Spinner animation="border" size="sm" className="me-2" /> Loading...</div>
          ) : isError ? (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center">
              <span>Failed to load.</span>
              <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
            </Alert>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted py-4">{isTeams ? "No teams yet. Add the first team above." : "No bays yet. Add the first bay above."}</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {rows.map((r) => (
                <div key={r.id} className={`border rounded-3 p-2 px-3 bg-white d-flex flex-wrap align-items-start gap-2 ${r.isActive ? "" : "text-muted"}`}>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold">{r.name}</div>
                    {isTeams && (
                      <div className="small text-muted">
                        <div>
                          <Icon icon="mdi:account-star-outline" width="15" height="15" /> Leader: {r.leaderName || <em>not set</em>}
                          {r.subLeaderName && <> · <Icon icon="mdi:account-outline" width="15" height="15" /> Sub leader: {r.subLeaderName}</>}
                        </div>
                        <div><Icon icon="mdi:garage-variant" width="15" height="15" /> Bay: {r.bayName || <em>not set</em>}</div>
                        <div>
                          <Icon icon="mdi:account-multiple-outline" width="15" height="15" /> {r.memberIds?.length || 0} member{(r.memberIds?.length || 0) === 1 ? "" : "s"}
                          {(r.members || []).filter((m) => m.role === "MEMBER").length > 0 && (
                            <>: {(r.members || []).filter((m) => m.role === "MEMBER").map((m) => m.name).join(", ")}</>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Form.Check
                    type="switch"
                    id={`${tab}-${r.id}`}
                    disabled={busy || !canWrite}
                    checked={r.isActive}
                    onChange={(e) => toggleActive(r, e.target.checked)}
                    label={r.isActive ? "Active" : "Inactive"}
                  />
                  {canWrite && (
                    <Button size="sm" variant="outline-secondary" onClick={() => startEdit(r)} disabled={busy}>
                      <Icon icon="mdi:pencil-outline" width="16" height="16" /> Edit
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}