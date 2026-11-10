"use client";

import React, { useCallback, useEffect, useState } from "react";
import UmCard from "./UmCard";
import { Table, Pagination, Button, Form, Spinner } from "react-bootstrap";
import {
  useGetRolesTableMutation,
  useUpdateRoleStatusMutation,
} from "@/store/features/apiSlice";
import useAuthRetry from "./authRetry";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import RedCard from "@/components/Redcard";
import EditRole from "@/components/Role/EditRole";

const ROLES_PER_PAGE = 25;

const actionBtnStyle = {
  minWidth: "auto",
  marginLeft: 3,
  paddingTop: "0.5rem",
  paddingBottom: "0.5rem",
  fontSize: "1rem",
  height: "30px",
  borderRadius: "15px",
};

export default function RoleList() {
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(null);

  const [fetchRoles, { data: roles, isLoading }] = useGetRolesTableMutation();
  const [updateRoleStatus] = useUpdateRoleStatusMutation();
  const { run } = useAuthRetry();

  const totalPages = Math.max(Number(roles?.totalPages) || 1, 1);

  // sessionStorage is read on the client only (no SSR / hydration problem)
  useEffect(() => {
    setClientId(sessionStorage.getItem("user_id"));
  }, []);

  const withTokenRetry = run;   // one shared refresh-and-retry (authRetry.js)

  const fetchRolesForPage = useCallback(
    async (pageNumber, search = searchText) => {
      if (!clientId) return;
      try {
        setLoading(true);
        await withTokenRetry(() =>
          fetchRoles({
            client_id: clientId,
            page: pageNumber,
            limit: ROLES_PER_PAGE,
            search,
          }).unwrap()
        );
        setCurrentPage(pageNumber);
      } catch (err) {
        console.error("Error fetching roles:", err);
      } finally {
        setLoading(false);
      }
    },
    [clientId, searchText]
  );

  useEffect(() => {
    if (clientId) fetchRolesForPage(1, "");
  }, [clientId]);

  const toggleStatus = async (roleId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to change the role status to ${newStatus}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, change it!",
      cancelButtonText: "No, cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await withTokenRetry(() => updateRoleStatus({ roleId, status: newStatus }).unwrap());

      await Swal.fire({
        title: "Success!",
        text: `Role status changed to ${newStatus}`,
        icon: "success",
        confirmButtonText: "OK",
      });

      // දැනට ඉන්න page එකම refresh කරනවා
      fetchRolesForPage(currentPage);
    } catch (err) {
      console.error("Error updating role status:", err);
      Swal.fire({
        title: "Error",
        text: err?.data?.message || "Failed to update role status.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  return (
    <UmCard>
      <div className="ul-bar">
        <div className="um-title" style={{ margin: 0 }}>Role List</div>
        <div className="ul-search">
          <div className="au-wrap" style={{ flex: 1 }}>
            <Icon icon="mdi:magnify" className="au-ico" width="19" height="19" />
            <input
              className="au-ctl"
              type="text"
              placeholder="Search by ID or name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRolesForPage(1)}
            />
          </div>
          <Button onClick={() => fetchRolesForPage(1)}>Search</Button>
        </div>
      </div>

      {isLoading || loading ? (
        <div className="d-flex justify-content-center my-4"><Spinner animation="border" variant="primary" /></div>
      ) : roles?.roles?.length > 0 ? (
        <>
          <div className="rl-grid">
            {roles.roles.map((role) => {
              const isActive = role.status === "active";
              const isAdminRole = Number(role.id) === 1;
              const count = Array.isArray(role.privileges) ? role.privileges.length : 0;
              return (
                <div className="rl-card" key={role.id}>
                  <div className="rl-top">
                    <div className="rl-ico"><Icon icon="mdi:shield-account-outline" width={22} height={22} /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="rl-name">{role.role_name}</div>
                      <div className="rl-meta">ID {role.id} · {count} privilege{count === 1 ? "" : "s"}</div>
                    </div>
                    <span className={`ul-pill ${isActive ? "on" : "off"}`}>{isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="ul-act" style={{ justifyContent: "flex-start" }}>
                    <button type="button" className="ul-btn dark" onClick={() => openEditModal(role)}>
                      <Icon icon="mdi:pencil-outline" width={18} height={18} /> Edit privileges
                    </button>
                    <button
                      type="button"
                      className={`ul-btn ${isActive ? "red" : "green"}`}
                      disabled={isAdminRole}
                      title={isAdminRole ? "The administrator role cannot be deactivated" : undefined}
                      onClick={() => toggleStatus(role.id, role.status)}
                    >
                      <Icon icon={isActive ? "mdi:account-off-outline" : "mdi:account-check-outline"} width={18} height={18} /> {isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="d-flex justify-content-end mt-3">
            <Pagination>
              <Pagination.Prev
                disabled={currentPage <= 1}
                onClick={() => fetchRolesForPage(currentPage - 1)}
              />
              <Pagination.Item active>{currentPage}</Pagination.Item>
              <Pagination.Next
                disabled={currentPage >= totalPages}
                onClick={() => fetchRolesForPage(currentPage + 1)}
              />
            </Pagination>
          </div>
        </>
      ) : (
        <RedCard />
      )}

      <EditRole showModal={showModal} setShowModal={setShowModal} selectedRole={selectedRole} />
    </UmCard>
  );
}