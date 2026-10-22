"use client";

import { useState, useMemo } from "react";
import {
  useAddRoleMutation,
  useRefreshTokenMutation,
  useGetSidebarMenuItemsQuery,
} from "@/store/features/apiSlice";
import { Button, FormControl, FormLabel } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import Spinner from "@/components/Spinner";

export default function AddRoleForm({ title = "Add New Role", onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [roleName, setRoleName] = useState("");

  const [addRole, { isLoading }] = useAddRoleMutation();
  const { data: sidebar, isLoading: sidebarLoading, isError } = useGetSidebarMenuItemsQuery();
  const [refreshtoken] = useRefreshTokenMutation();

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

  // CHILD: check -> parent subtitle + main; uncheck -> child විතරයි
  const onToggleChild = (childId) => {
    const parentSubtitleId = maps.parentOf.get(childId);

    if (isSelected(childId)) {
      removeIds([childId]);
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

  const logoutUser = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/auth/login";
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

    const roleData = {
      roleName: roleName.trim(),
      privileges: selectedIds,
      dashboardAccess: selectedIds.includes(1) ? ["dashboard"] : [],
    };

    try {
      await addRole(roleData).unwrap();
      handleSuccess();
    } catch (err) {
      if (err?.status === 403 && err?.data?.message === "Access token expired") {
        const refresh_token = localStorage.getItem("refresh_token");
        if (!refresh_token) {
          logoutUser();
          return;
        }
        try {
          const response = await refreshtoken(refresh_token).unwrap();
          sessionStorage.setItem("access_token", response.access_token);
          await addRole(roleData).unwrap();
          handleSuccess();
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          logoutUser();
        }
        return; // retry එකෙන් පස්සේ පහළ error message එක පෙන්නන්න එපා
      }

      console.error("Error adding role:", err);
      showError("Failed to add role. Please try again.");
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

  return (
    <ComponentContainerCard title={title}>
      <div>
        <FormLabel className="col-form-label text-start">Role Name</FormLabel>
        <FormControl
          type="text"
          placeholder="Enter role name"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
        />
      </div>

      <FormLabel className="col-form-label text-start fw-bold fs-5 text-primary mt-3">
        Privileges
      </FormLabel>

      <div className="mb-3 border rounded p-2">
        {other.map((item) => (
          <label key={item.id} className="d-flex align-items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={isSelected(item.id)}
              onChange={() => handleToggle(item.id)}
            />
            {item.name}
          </label>
        ))}
      </div>

      {data.map((main) => (
        <div key={main.menu_id} className="mb-3 border rounded p-2">
          <label className="fw-bold text-primary d-flex align-items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected(main.menu_id)}
              onChange={() => onToggleMain(main.menu_id)}
            />
            {main.name} (Main)
          </label>

          <div className="ms-4 mt-2">
            {(main.children || []).map((sub) => (
              <div key={sub.menu_id} className="mb-2">
                <label className="d-flex align-items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected(sub.menu_id)}
                    onChange={() => onToggleSubtitle(sub.menu_id)}
                  />
                  {sub.name} (Subtitle)
                </label>

                {(sub.children || []).length > 0 && (
                  <div className="ms-4 mt-2">
                    {sub.children.map((child) => (
                      <label key={child.menu_id} className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected(child.menu_id)}
                          onChange={() => onToggleChild(child.menu_id)}
                        />
                        {child.name} (Child)
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <hr />
      <div>
        <strong>Selected IDs:</strong> [{selectedIds.join(", ")}]
      </div>

      <div className="d-flex justify-content-end">
        <Button type="button" disabled={isLoading} onClick={handleSubmit}>
          <Icon icon="material-symbols:group-add-rounded" width="24" height="24" />{" "}
          {isLoading ? "Adding..." : "Add Role"}
        </Button>
      </div>
    </ComponentContainerCard>
  );
}