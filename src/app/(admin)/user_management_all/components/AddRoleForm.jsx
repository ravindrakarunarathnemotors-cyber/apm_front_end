"use client";

import { useState, useMemo } from "react";
import {
  useAddRoleMutation,
  useGetSidebarMenuItemsQuery,
} from "@/store/features/apiSlice";
import { Button, FormControl, FormLabel, Spinner } from "react-bootstrap";
import useAuthRetry from "./authRetry";
import UmCard from "./UmCard";
import { Field, Section } from "./UmFields";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";

export default function AddRoleForm({ title = "Add New Role", onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [open, setOpen] = useState(() => new Set());     // expanded groups
  const [q, setQ] = useState("");                         // search in the privileges

  const [addRole, { isLoading }] = useAddRoleMutation();
  const { data: sidebar, isLoading: sidebarLoading, isError } = useGetSidebarMenuItemsQuery();
  const { run } = useAuthRetry();

  // render වෙන හැම වෙලාවකම අලුත් array එකක් හැදෙන එක නවත්තන්න useMemo
  const data = useMemo(() => sidebar?.menuItems ?? [], [sidebar]);
  const other = useMemo(() => sidebar?.otherResult ?? [], [sidebar]);

  // Quick lookup maps
  const maps = useMemo(() => {
    const parentOf = new Map(); // childId -> parentId
    const subtitlesByMain = new Map(); // mainId -> [subtitleIds]
    const childrenBySubtitle = new Map(); // subtitleId -> [childIds]

    data.forEach((main) => {
      const subs = main.children || [];
      subtitlesByMain.set(main.menu_id, subs.map((s) => s.menu_id));
      subs.forEach((sub) => {
        parentOf.set(sub.menu_id, main.menu_id);
        const kids = sub.children || [];
        childrenBySubtitle.set(sub.menu_id, kids.map((c) => c.menu_id));
        kids.forEach((c) => parentOf.set(c.menu_id, sub.menu_id));
      });
    });

    return { parentOf, subtitlesByMain, childrenBySubtitle };
  }, [data]);

  const isSelected = (id) => selectedIds.includes(id);

  const addIds = (ids) =>
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));

  const removeIds = (ids) =>
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));

  // MAIN: main + subtitles + children ඔක්කොම එකට on/off
  const onToggleMain = (mainId) => {
    const subs = maps.subtitlesByMain.get(mainId) || [];
    const allChildren = subs.flatMap((subId) => maps.childrenBySubtitle.get(subId) || []);
    const bundle = [mainId, ...subs, ...allChildren];

    if (bundle.every(isSelected)) removeIds(bundle);
    else addIds(bundle);
  };

  // SUBTITLE: check -> children + main; uncheck -> children, ඉතුරු එකක්වත් නැත්නම් main එකත්
  const onToggleSubtitle = (subtitleId) => {
    const mainId = maps.parentOf.get(subtitleId);
    if (!mainId) return;

    const children = maps.childrenBySubtitle.get(subtitleId) || [];

    if (isSelected(subtitleId)) {
      removeIds([subtitleId, ...children]);

      const otherSubs = (maps.subtitlesByMain.get(mainId) || []).filter((id) => id !== subtitleId);
      const hasOtherSelected = otherSubs.some(
        (subId) =>
          isSelected(subId) ||
          (maps.childrenBySubtitle.get(subId) || []).some(isSelected)
      );

      if (!hasOtherSelected) removeIds([mainId]);
    } else {
      addIds([subtitleId, mainId, ...children]);
    }
  };

  // CHILD: check -> parent subtitle + main; uncheck -> the child, and the subtitle / main too when nothing is left under them
  const onToggleChild = (childId) => {
    const parentSubtitleId = maps.parentOf.get(childId);

    if (isSelected(childId)) {
      const remaining = (maps.childrenBySubtitle.get(parentSubtitleId) || []).filter((id) => id !== childId && isSelected(id));
      const gone = [childId];
      if (parentSubtitleId && remaining.length === 0) {
        gone.push(parentSubtitleId);
        const mainId = maps.parentOf.get(parentSubtitleId);
        const otherSubs = (maps.subtitlesByMain.get(mainId) || []).filter((id) => id !== parentSubtitleId);
        const hasOther = otherSubs.some((subId) => isSelected(subId) || (maps.childrenBySubtitle.get(subId) || []).some(isSelected));
        if (mainId && !hasOther) gone.push(mainId);
      }
      removeIds(gone);
      return;
    }

    const mainId = parentSubtitleId ? maps.parentOf.get(parentSubtitleId) : null;
    addIds([childId, parentSubtitleId, mainId].filter(Boolean));
  };

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const showError = (text) =>
    Swal.fire({ title: "Error", text, icon: "error", confirmButtonText: "OK" });

  const handleSuccess = () => {
    Swal.fire({
      title: "Success!",
      text: "Role added successfully!",
      icon: "success",
      confirmButtonText: "OK",
    });
    setRoleName("");
    setSelectedIds([]);
    onSuccess?.();
  };

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      showError("Please enter a role name");
      return;
    }
    if (selectedIds.length === 0) {
      showError("Please select at least one privilege");
      return;
    }

    // the dashboard menu is found by its name / route (it used to be "menu id 1", which breaks if the ids change)
    const dash = data.find((m) => /^dashboard$/i.test(m.name || "") || /dashboard/i.test(m.route || ""));
    const roleData = {
      roleName: roleName.trim(),
      privileges: selectedIds,
      dashboardAccess: dash && selectedIds.includes(dash.menu_id) ? ["dashboard"] : [],
    };

    try {
      await run(() => addRole(roleData).unwrap());
      handleSuccess();
    } catch (err) {
      console.error("Error adding role:", err);
      showError(err?.data?.message || "Failed to add role. Please try again.");
    }
  };

  if (sidebarLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-danger p-3">Failed to load privileges. Please refresh the page.</p>;
  }

  // ---- view helpers ----
  const term = q.trim().toLowerCase();
  const hit = (name) => !term || String(name || "").toLowerCase().includes(term);
  const groupIds = (main) => {
    const subs = main.children || [];
    return [main.menu_id, ...subs.map((x) => x.menu_id), ...subs.flatMap((x) => (x.children || []).map((c) => c.menu_id))];
  };
  const allIds = [...other.map((o) => o.id), ...data.flatMap(groupIds)];
  const toggleOpen = (id) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const visibleMains = data.filter((main) => hit(main.name) || (main.children || []).some((sub) => hit(sub.name) || (sub.children || []).some((c) => hit(c.name))));

  return (
    <UmCard title={title}>
      <Section no="1" title="Role" sub="The name of the role" plain>
        <div className="au-grid">
          <Field label="Role name" icon="mdi:shield-account-outline" hint="e.g. Branch Manager, Accountant">
            <input className="au-ctl" type="text" placeholder="Enter role name" value={roleName} maxLength={60} onChange={(e) => setRoleName(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section no="2" title="Privileges" sub="The menus this role can open. Ticking a page ticks the menu above it." plain>
        <div className="pv-bar">
          <div className="au-wrap" style={{ flex: "1 1 240px", maxWidth: 380 }}>
            <Icon icon="mdi:magnify" className="au-ico" width="19" height="19" />
            <input className="au-ctl" type="text" placeholder="Search privileges" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <span className="pv-chip">{selectedIds.length} selected</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedIds(allIds)}>Select all</Button>
          <Button type="button" variant="secondary" size="sm" disabled={selectedIds.length === 0} onClick={() => setSelectedIds([])}>Clear</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(open.size ? new Set() : new Set(data.map((m) => m.menu_id)))}>{open.size ? "Collapse all" : "Expand all"}</Button>
        </div>

        {other.filter((o) => hit(o.name)).length > 0 && (
          <div className="pv-group">
            <div className="pv-head" style={{ cursor: "default" }}><span className="pv-title">General</span></div>
            <div className="pv-body">
              <div className="pv-other">
                {other.filter((o) => hit(o.name)).map((item) => (
                  <label key={item.id} className={`pv-kid ${isSelected(item.id) ? "on" : ""}`}>
                    <input type="checkbox" checked={isSelected(item.id)} onChange={() => handleToggle(item.id)} /> {item.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {visibleMains.map((main) => {
          const ids = groupIds(main);
          const n = ids.filter(isSelected).length;
          const expanded = term ? true : open.has(main.menu_id);
          return (
            <div key={main.menu_id} className="pv-group">
              <div className="pv-head" onClick={() => toggleOpen(main.menu_id)} role="button" aria-expanded={expanded}>
                <input
                  type="checkbox"
                  checked={n === ids.length}
                  ref={(el) => { if (el) el.indeterminate = n > 0 && n < ids.length; }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleMain(main.menu_id)}
                  aria-label={`Select ${main.name}`}
                />
                <span className="pv-title">{main.name}</span>
                <span className={`pv-count ${n > 0 ? "on" : ""}`}>{n}/{ids.length}</span>
                <Icon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" />
              </div>
              {expanded && (
                <div className="pv-body">
                  {(main.children || []).filter((sub) => !term || hit(main.name) || hit(sub.name) || (sub.children || []).some((c) => hit(c.name))).map((sub) => (
                    <div key={sub.menu_id} className="pv-sub">
                      <label className="pv-check">
                        <input type="checkbox" checked={isSelected(sub.menu_id)} onChange={() => onToggleSubtitle(sub.menu_id)} /> {sub.name}
                      </label>
                      {(sub.children || []).length > 0 && (
                        <div className="pv-kids">
                          {sub.children.filter((c) => !term || hit(main.name) || hit(sub.name) || hit(c.name)).map((child) => (
                            <label key={child.menu_id} className={`pv-kid ${isSelected(child.menu_id) ? "on" : ""}`}>
                              <input type="checkbox" checked={isSelected(child.menu_id)} onChange={() => onToggleChild(child.menu_id)} /> {child.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {term && visibleMains.length === 0 && <div className="text-muted small">No privilege matches &quot;{q}&quot;.</div>}
      </Section>

      <div className="au-foot">
        <Button type="button" variant="secondary" disabled={isLoading} onClick={() => { setRoleName(""); setSelectedIds([]); setQ(""); }}>Clear</Button>
        <Button type="button" disabled={isLoading} onClick={handleSubmit}>
          <Icon icon="material-symbols:group-add-rounded" width="22" height="22" /> {isLoading ? "Adding..." : "Add Role"}
        </Button>
      </div>
    </UmCard>
  );
}