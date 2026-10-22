"use client";

import React, { useCallback, useEffect, useState } from "react";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { Table, Pagination, Button, Form, Spinner } from "react-bootstrap";
import {
  useGetRolesTableMutation,
  useUpdateRoleStatusMutation,
  useRefreshTokenMutation,
} from "@/store/features/apiSlice";
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
  const [refreshtoken] = useRefreshTokenMutation();

  const totalPages = Math.max(Number(roles?.totalPages) || 1, 1);

  const logoutUser = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/auth/login";
  };

  // sessionStorage කියවන්නේ client එකේ විතරයි (SSR/hydration ප්‍රශ්න නැති වෙන්න)
  useEffect(() => {
    setClientId(sessionStorage.getItem("user_id"));
  }, []);

  // Token expire වුණොත් එක පාරක් refresh කරලා retry කරන helper
  const withTokenRetry = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 403 && err?.data?.message === "Access token expired") {
        const refresh_token = localStorage.getItem("refresh_token");
        if (!refresh_token) {
          logoutUser();
          throw err;
        }
        try {
          const res = await refreshtoken(refresh_token).unwrap();
          sessionStorage.setItem("access_token", res.access_token);
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          logoutUser();
          throw refreshError;
        }
        return await fn();
      }
      throw err;
    }
  };

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
        text: "Failed to update role status.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setShowModal(true);
  };

  if (isLoading || loading) {
    return (
      <div className="d-flex justify-content-center my-4">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <ComponentContainerCard>
      <div className="d-flex justify-content-between mb-3">
        <h4>Role List</h4>
        <div className="d-flex" style={{ gap: "5px" }}>
          <Form.Control
            type="text"
            placeholder="Search by Role ID"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRolesForPage(1)}
            className="me-2"
            style={{ maxWidth: "180px" }}
          />
          <Button variant="primary" onClick={() => fetchRolesForPage(1)}>
            <Icon icon="material-symbols:search-rounded" width="24" height="20" /> Search
          </Button>
        </div>
      </div>

      {roles?.roles?.length > 0 ? (
        <>
          <Table striped bordered hover>
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Role Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {roles.roles.map((role) => {
                const isActive = role.status === "active";
                return (
                  <tr key={role.id}>
                    <td>{role.id}</td>
                    <td>{role.role_name}</td>
                    <td>
                      <span className={`badge ${isActive ? "bg-success" : "bg-danger"} text-white`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="d-flex">
                      <Button
                        variant={isActive ? "danger" : "success"}
                        onClick={() => toggleStatus(role.id, role.status)}
                        className="d-flex align-items-center gap-1"
                        style={actionBtnStyle}
                      >
                        <Icon
                          icon={isActive ? "mdi:account-off" : "mdi:account-check"}
                          width={20}
                          height={20}
                        />
                        <span style={{ fontSize: "0.75rem" }}>
                          {isActive ? "Deactivate" : "Activate"}
                        </span>
                      </Button>

                      <Button
                        variant="primary"
                        onClick={() => openEditModal(role)}
                        className="d-flex align-items-center gap-1"
                        style={actionBtnStyle}
                      >
                        <Icon icon="mdi:pencil" width={20} height={20} />
                        <span style={{ fontSize: "0.75rem" }}>Edit Privilege</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <div className="d-flex justify-content-end">
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
    </ComponentContainerCard>
  );
}