"use client";

import React, { useEffect, useMemo, useState } from "react";
import UmCard from "./UmCard";
import {
  Table,
  Pagination,
  Button,
  Modal,
  Form,
  FormLabel,
  FormControl,
  FormSelect,
  Spinner,
  Tab,
  Nav,
  Row,
  Col,
} from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useGetClientStaffQuery,
  useUpdateUserMutation,
  useGetRolesMutation,
  useGetBranchesMutation,
} from "@/store/features/apiSlice";
import useLogout from "@/hooks/useLogout";
import useAuthRetry from "./authRetry";

const USERS_PER_PAGE = 25;

// 1 … 4 5 [6] 7 8 … 20   (all page numbers used to be shown, which overflows with many users)
const pageWindow = (current, total) => {
  const pages = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => { if (i > 0 && p - list[i - 1] > 1) out.push("…"); out.push(p); });
  return out;
};

const actionBtnStyle = {
  minWidth: "auto",
  marginLeft: 3,
  paddingTop: "0.5rem",
  paddingBottom: "0.5rem",
  fontSize: "1rem",
  height: "30px",
  borderRadius: "15px",
};

export default function UserList() {
  const [filterText, setFilterText] = useState("");
  const [appliedFilter, setAppliedFilter] = useState(""); // Search click කරාම විතරක් apply වෙනවා
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tabKey, setTabKey] = useState("editDetails");

  const [selectedRole, setSelectedRole] = useState("");
  const [errors, setErrors] = useState({});
  const [formValues, setFormValues] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    nic: "",
  });
  const [selectedBranch, setSelectedBranch] = useState("");
  const [me, setMe] = useState({ id: null, isAdmin: false });   // the logged-in user (the server checks every action again)
  const [passwordFormValues, setPasswordFormValues] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const {
    data: users = [],
    error,
    isLoading: isFetchingUsers,
    refetch,
  } = useGetClientStaffQuery();
  const { run } = useAuthRetry();
  const [fetchBranches, { data: branches }] = useGetBranchesMutation();
  const [fetchRoles, { data: roles, isLoading: isRolesLoading, isError: isRolesError }] =
    useGetRolesMutation();
  const { Logout } = useLogout();

  useEffect(() => {
    setMe({ id: sessionStorage.getItem("user_id"), isAdmin: String(sessionStorage.getItem("role_id")) === "1" });
    fetchRoles();
    fetchBranches();
  }, []);

  const branchName = (id) => branches?.find((b) => String(b.branch_id) === String(id))?.branch_name || (id ? `Branch ${id}` : "-");

  // Filter කරපු users (users වෙනස් වුණාමත් auto update වෙනවා)
  const filteredUsers = useMemo(() => {
    const text = appliedFilter.toLowerCase().trim();
    if (!text) return users;

    return users.filter((user) => {
      const id = user.id?.toString() ?? "";
      const first = user.first_name?.toLowerCase() ?? "";
      const nic = user.nic?.toLowerCase() ?? "";
      const last = user.last_name?.toLowerCase() ?? "";
      const username = user.username?.toLowerCase() ?? "";
      const mobile = user.mobile?.toString() ?? "";

      return (
        (!isNaN(text) && id.includes(text)) ||
        first.includes(text) ||
        last.includes(text) ||
        username.includes(text) ||
        nic.includes(text) ||
        mobile.includes(text)
      );
    });
  }, [users, appliedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  // after a search / status change the page can be past the end
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  const handleSearch = () => {
    setAppliedFilter(filterText);
    setCurrentPage(1);
  };

  // POST with the bearer token; an expired token is refreshed once and the call is repeated (authRetry.js)
  const authPost = (path, body) =>
    run(async () => {
      const token = sessionStorage.getItem("access_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        const data = await response.clone().json().catch(() => ({}));
        throw { status: 401, data };       // "Access token expired" -> run() refreshes and calls again
      }
      return response;
    });

  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedUser(null);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormValues({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      mobile: user.mobile ?? "",
      nic: user.nic ?? "",
    });
    setSelectedRole(user.role_id ?? "");
    setSelectedBranch(user.branch_id ?? "");
    setPasswordFormValues({ newPassword: "", confirmPassword: "" });
    setErrors({});
    setTabKey("editDetails");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};

    if (tabKey === "editDetails") {
      const { first_name, last_name, email, mobile, nic } = formValues;
      const nameRe = /^[\p{L}\s.'-]+$/u;
      if (!first_name.trim()) newErrors.first_name = "First Name is required.";
      else if (!nameRe.test(first_name.trim())) newErrors.first_name = "First name can only contain letters.";
      if (!last_name.trim()) newErrors.last_name = "Last Name is required.";
      else if (!nameRe.test(last_name.trim())) newErrors.last_name = "Last name can only contain letters.";
      if (!email.trim()) newErrors.email = "Email is required.";
      else if (!/^\S+@\S+\.\S+$/.test(email.trim())) newErrors.email = "Invalid email format.";
      if (!String(mobile).trim()) newErrors.mobile = "Mobile number is required.";
      else if (!/^(07\d{8}|947\d{8}|7\d{8})$/.test(String(mobile).trim())) newErrors.mobile = "Enter 07XXXXXXXX or 947XXXXXXXX.";
      if (String(nic).trim() && !/^(\d{9}[VvXx]|\d{12})$/.test(String(nic).trim())) newErrors.nic = "Invalid NIC (old: 9 digits + V/X, new: 12 digits).";
      if (me.isAdmin && !String(selectedRole).trim()) newErrors.role = "Select the role.";
    } else {
      const { newPassword, confirmPassword } = passwordFormValues;
      if (!newPassword || !confirmPassword) {
        newErrors.newPassword = "Please enter and confirm the new password.";
      } else {
        if (newPassword.length < 8) {
          newErrors.newPassword = "Password must be at least 8 characters long.";
        }
        if (newPassword !== confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match.";
        }
      }
    }
    return newErrors;
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // the server knows who is logged in from the token; only the user being edited is sent. Role / branch are used for an administrator only.
    const payload =
      tabKey === "editDetails"
        ? { ...formValues, selected_userId: selectedUser.id, selectedRole, selectedBranch }
        : { ...passwordFormValues, selected_userId: selectedUser.id };

    try {
      await run(() => updateUser({ data: payload }).unwrap());
      closeEditModal();
      await Swal.fire({
        title: "Success!",
        text: "User details updated successfully!",
        icon: "success",
        confirmButtonText: "OK",
      });
      refetch();
    } catch (err) {
      console.error("Error updating user:", err);

      if (err?.status === 401) {
        await Swal.fire({ title: "Session Expired!", text: "Your session has expired. Please log in again.", icon: "warning", confirmButtonText: "OK" });
        Logout();
      } else {
        Swal.fire({ title: "Error", text: err?.data?.message || "Failed to update user. Please try again.", icon: "error" });
      }
    }
  };

  // Active / Inactive දෙකම එකම function එකකින්
  const handleStatusChange = async (id, activate) => {
    const label = activate ? "Active" : "Inactive";
    if (!activate && String(id) === String(me.id)) {
      Swal.fire({ title: "Not allowed", text: "You cannot make your own account inactive.", icon: "info" });
      return;
    }

    const result = await Swal.fire({
      title: `User ${label}`,
      text: `Are you sure you want to make this user ${label.toLowerCase()}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirm",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await authPost(
        activate ? "/api/admin_active" : "/api/admin_inactive",
        { id }
      );

      if (response.ok) {
        refetch();
        Swal.fire({ title: "Success!", icon: "success", confirmButtonColor: "#3085d6", timer: 1200, showConfirmButton: false });
      } else {
        const data = await response.json().catch(() => ({}));
        Swal.fire({ title: "Error", text: data.message || "Action failed.", icon: "error" });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ title: "Error", text: "Could not reach the server. Please try again.", icon: "error" });
    }
  };

  if (isFetchingUsers) {
    return (
      <div className="d-flex justify-content-center my-4">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-danger p-3">
        Failed to load users. Please refresh the page.
      </div>
    );
  }

  return (
    <UmCard>
      <div className="ul-bar">
        <div className="um-title" style={{ margin: 0 }}>User List <span className="text-muted" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 600 }}>({filteredUsers.length})</span></div>
        <div className="ul-search">
          <div className="au-wrap" style={{ flex: 1 }}>
            <Icon icon="mdi:magnify" className="au-ico" width="19" height="19" />
            <input
              className="au-ctl"
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by ID, name, username, NIC or mobile"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </div>

      <div className="ul-list">
        {paginatedUsers.length > 0 ? (
          paginatedUsers.map((user) => {
            const isActive = user.status === "Active";
            const initials = `${(user.first_name || "?")[0]}${(user.last_name || "")[0] || ""}`.toUpperCase();
            return (
              <div className="ul-row" key={user.id}>
                <div className="ul-av">{initials}</div>
                <div className="ul-main">
                  <div className="ul-name">{user.first_name} {user.last_name}</div>
                  <div className="ul-sub">@{user.username} · ID {user.id}</div>
                </div>
                <div className="ul-col"><div className="ul-lab">Role</div><div className="ul-val">{user.role_name}</div></div>
                <div className="ul-col"><div className="ul-lab">Mobile</div><div className="ul-val">{user.mobile}</div></div>
                <div className="ul-col"><span className={`ul-pill ${isActive ? "on" : "off"}`}>{isActive ? "Active" : "Inactive"}</span></div>
                <div className="ul-act">
                  <button type="button" className="ul-btn" onClick={() => openViewModal(user)}><Icon icon="mdi:eye-outline" width={18} height={18} /> View</button>
                  <button type="button" className="ul-btn dark" onClick={() => openEditModal(user)}><Icon icon="mdi:pencil-outline" width={18} height={18} /> Edit</button>
                  {isActive ? (
                    <button type="button" className="ul-btn red" disabled={String(user.id) === String(me.id)} title={String(user.id) === String(me.id) ? "You cannot make your own account inactive" : undefined} onClick={() => handleStatusChange(user.id, false)}>
                      <Icon icon="mdi:account-off-outline" width={18} height={18} /> Inactive
                    </button>
                  ) : (
                    <button type="button" className="ul-btn green" onClick={() => handleStatusChange(user.id, true)}>
                      <Icon icon="mdi:account-check-outline" width={18} height={18} /> Active
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-muted py-4">No users found</div>
        )}
      </div>

      <div className="d-flex justify-content-end mt-3">
        <Pagination>
          <Pagination.Prev
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          />
          {pageWindow(currentPage, totalPages).map((p, i) =>
            p === "…" ? (
              <Pagination.Ellipsis key={`e${i}`} disabled />
            ) : (
              <Pagination.Item key={p} active={p === currentPage} onClick={() => setCurrentPage(p)}>{p}</Pagination.Item>
            )
          )}
          <Pagination.Next
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          />
        </Pagination>
      </div>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={closeViewModal} className="um-modal">
        <Modal.Header closeButton>
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className="px-2">
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Username:</Col>
                <Col xs={7}>{selectedUser.username}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Name:</Col>
                <Col xs={7}>{selectedUser.first_name} {selectedUser.last_name}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">NIC:</Col>
                <Col xs={7}>{selectedUser.nic || "-"}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Email:</Col>
                <Col xs={7}>{selectedUser.email || "-"}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Branch:</Col>
                <Col xs={7}>{branchName(selectedUser.branch_id)}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Mobile Number:</Col>
                <Col xs={7}>{selectedUser.mobile}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Status:</Col>
                <Col xs={7}>
                  <span className={`badge ${selectedUser.status === "Active" ? "bg-success" : "bg-danger"}`}>
                    {selectedUser.status}
                  </span>
                </Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Role:</Col>
                <Col xs={7}>{selectedUser.role_name}</Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeViewModal}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={closeEditModal} className="um-modal">
        <Modal.Header closeButton>
          <Modal.Title>Edit User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ paddingTop: "30px" }}>
          <Tab.Container activeKey={tabKey} onSelect={(k) => setTabKey(k)}>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="editDetails">Edit User Details</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="changePassword">Change Password</Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content style={{ marginTop: "15px" }}>
              <Tab.Pane eventKey="editDetails">
                <Form>
                  <Form.Group controlId="first_name">
                    <FormLabel>First Name</FormLabel>
                    <FormControl type="text" name="first_name" value={formValues.first_name} onChange={handleInputChange} />
                    {errors.first_name && <small className="text-danger">{errors.first_name}</small>}
                  </Form.Group>

                  <Form.Group controlId="last_name">
                    <FormLabel>Last Name</FormLabel>
                    <FormControl type="text" name="last_name" value={formValues.last_name} onChange={handleInputChange} />
                    {errors.last_name && <small className="text-danger">{errors.last_name}</small>}
                  </Form.Group>

                  <Form.Group controlId="email">
                    <FormLabel>Email</FormLabel>
                    <FormControl type="email" name="email" value={formValues.email} onChange={handleInputChange} />
                    {errors.email && <small className="text-danger">{errors.email}</small>}
                  </Form.Group>

                  <Form.Group controlId="mobile">
                    <FormLabel>Mobile</FormLabel>
                    <FormControl type="text" name="mobile" value={formValues.mobile} onChange={handleInputChange} />
                    {errors.mobile && <small className="text-danger">{errors.mobile}</small>}
                  </Form.Group>

                  <Form.Group controlId="nic">
                    <FormLabel>NIC</FormLabel>
                    <FormControl type="text" name="nic" value={formValues.nic} onChange={handleInputChange} />
                    {errors.nic && <small className="text-danger">{errors.nic}</small>}
                  </Form.Group>

                  <FormLabel className="mt-2">Select Role {!me.isAdmin && <small className="text-muted">(only an administrator can change it)</small>}</FormLabel>
                  <FormSelect value={selectedRole} disabled={!me.isAdmin || String(selectedUser?.id) === String(me.id)} onChange={(e) => { setSelectedRole(e.target.value); setErrors((p) => ({ ...p, role: "" })); }}>
                    <option value="">Select Role</option>
                    {isRolesLoading && <option disabled>Loading roles...</option>}
                    {isRolesError && <option disabled>Error loading roles</option>}
                    {roles?.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role_name}
                      </option>
                    ))}
                  </FormSelect>
                  {errors.role && <small className="text-danger">{errors.role}</small>}

                  {me.isAdmin && (
                    <>
                      <FormLabel className="mt-2">Select Branch</FormLabel>
                      <FormSelect value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                        <option value="">Keep the current branch</option>
                        {branches?.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                      </FormSelect>
                    </>
                  )}
                </Form>
              </Tab.Pane>

              <Tab.Pane eventKey="changePassword">
                <Form>
                  <Form.Group controlId="new_password">
                    <FormLabel>New Password</FormLabel>
                    <FormControl
                      type="password"
                      value={passwordFormValues.newPassword}
                      onChange={(e) => {
                        setPasswordFormValues((p) => ({ ...p, newPassword: e.target.value }));
                        setErrors((p) => ({ ...p, newPassword: "" }));
                      }}
                    />
                    {errors.newPassword && <small className="text-danger">{errors.newPassword}</small>}
                  </Form.Group>

                  <Form.Group controlId="confirm_password">
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl
                      type="password"
                      value={passwordFormValues.confirmPassword}
                      onChange={(e) => {
                        setPasswordFormValues((p) => ({ ...p, confirmPassword: e.target.value }));
                        setErrors((p) => ({ ...p, confirmPassword: "" }));
                      }}
                    />
                    {errors.confirmPassword && <small className="text-danger">{errors.confirmPassword}</small>}
                  </Form.Group>
                </Form>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Submit"}
          </Button>
        </Modal.Footer>
      </Modal>
    </UmCard>
  );
}