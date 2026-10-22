"use client";

import React, { useEffect, useMemo, useState } from "react";
import ContainerCardOnly from "@/components/ContainerCardOnly";
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
  useRefreshTokenMutation,
  useGetRolesMutation,
} from "@/store/features/apiSlice";
import useLogout from "@/hooks/useLogout";

const USERS_PER_PAGE = 25;

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
  });
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
  const [refreshtoken] = useRefreshTokenMutation();
  const [fetchRoles, { data: roles, isLoading: isRolesLoading, isError: isRolesError }] =
    useGetRolesMutation();
  const { Logout } = useLogout();

  useEffect(() => {
    fetchRoles();
  }, []);

  // Filter කරපු users (users වෙනස් වුණාමත් auto update වෙනවා)
  const filteredUsers = useMemo(() => {
    const text = appliedFilter.toLowerCase().trim();
    if (!text) return users;

    return users.filter((user) => {
      const id = user.id?.toString() ?? "";
      const first = user.first_name?.toLowerCase() ?? "";
      const last = user.last_name?.toLowerCase() ?? "";
      const username = user.username?.toLowerCase() ?? "";
      const mobile = user.mobile?.toString() ?? "";

      return (
        (!isNaN(text) && id.includes(text)) ||
        first.includes(text) ||
        last.includes(text) ||
        username.includes(text) ||
        mobile.includes(text)
      );
    });
  }, [users, appliedFilter]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  const handleSearch = () => {
    setAppliedFilter(filterText);
    setCurrentPage(1);
  };

  // Token expire වුණොත් එක පාරක් refresh කරලා retry කරන fetch helper
  const authPost = async (path, body, canRetry = true) => {
    const token = sessionStorage.getItem("access_token");
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if ((response.status === 401 || response.status === 403) && canRetry) {
      const refresh_token = localStorage.getItem("refresh_token");
      if (!refresh_token) {
        Logout();
        throw new Error("No refresh token");
      }
      try {
        const res = await refreshtoken(refresh_token).unwrap();
        sessionStorage.setItem("access_token", res.access_token);
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        Logout();
        throw refreshError;
      }
      return authPost(path, body, false);
    }
    return response;
  };

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
    });
    setSelectedRole(user.role_id ?? "");
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
      const { first_name, last_name, email, mobile } = formValues;
      if (!first_name.trim()) newErrors.first_name = "First Name is required.";
      if (!last_name.trim()) newErrors.last_name = "Last Name is required.";
      if (!email.trim()) newErrors.email = "Email is required.";
      else if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = "Invalid email format.";
      if (!String(mobile).trim()) newErrors.mobile = "Mobile number is required.";
      else if (!/^\d{10,15}$/.test(String(mobile))) newErrors.mobile = "Invalid mobile number.";
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

    const user_id = sessionStorage.getItem("user_id");
    if (!user_id) {
      Swal.fire({ title: "Error", text: "User is not logged in.", icon: "error" });
      return;
    }

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...(tabKey === "editDetails" ? formValues : passwordFormValues),
      user_id,
      selected_userId: selectedUser.id,
      selectedRole,
    };

    try {
      await updateUser({ data: payload }).unwrap();
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

      if (err?.status === 401 || err?.status === 403) {
        await Swal.fire({
          title: "Session Expired!",
          text: "Your session has expired. Please log in again.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        Logout();
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to update user. Please try again.",
          icon: "error",
        });
      }
    }
  };

  // Active / Inactive දෙකම එකම function එකකින්
  const handleStatusChange = async (id, activate) => {
    const label = activate ? "Active" : "Inactive";

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

      if (response.status === 200) {
        refetch();
        Swal.fire({ title: "Success!", icon: "success", confirmButtonColor: "#3085d6" });
      } else {
        const data = await response.json().catch(() => ({}));
        console.error(data.message);
        Swal.fire({ title: "Error", text: data.message || "Action failed.", icon: "error" });
      }
    } catch (err) {
      console.error(err);
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
    <ContainerCardOnly>
      <div className="d-flex justify-content-between mb-3">
        <h4>User List</h4>
        <div className="d-flex" style={{ gap: "10px" }}>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="form-control"
            placeholder="Search by ID, Name, or Mobile"
            style={{ width: "250px" }}
          />
          <Button onClick={handleSearch}>
            <Icon icon="material-symbols:search-rounded" width="24" height="20" />
            Search
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>UserName</th>
              <th>Role</th>
              <th>Name</th>
              <th>Mobile Number</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => {
                const isActive = user.status === "Active";
                return (
                  <tr key={user.id}>
                    <th>{user.id}</th>
                    <td>{user.username}</td>
                    <td>{user.role_name}</td>
                    <td>{`${user.first_name} ${user.last_name}`}</td>
                    <td>{user.mobile}</td>
                    <td>
                      <span className={`badge ${isActive ? "bg-success" : "bg-danger"} text-white`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="d-flex">
                      <Button
                        variant="secondary"
                        onClick={() => openViewModal(user)}
                        className="d-flex align-items-center justify-content-center gap-1"
                        style={actionBtnStyle}
                      >
                        <Icon icon="mdi:eye" width={20} height={20} />
                        <span style={{ fontSize: "0.75rem" }}>View</span>
                      </Button>

                      <Button
                        variant="primary"
                        onClick={() => openEditModal(user)}
                        className="d-flex align-items-center justify-content-center gap-1"
                        style={{ ...actionBtnStyle, minWidth: "120px" }}
                      >
                        <Icon icon="mdi:pencil" width={20} height={20} />
                        <span style={{ fontSize: "0.75rem" }}>Edit User</span>
                      </Button>

                      {isActive ? (
                        <Button
                          variant="danger"
                          onClick={() => handleStatusChange(user.id, false)}
                          className="d-flex align-items-center justify-content-center gap-1"
                          style={actionBtnStyle}
                        >
                          <Icon icon="carbon:error" width={20} height={20} />
                          <span style={{ fontSize: "0.75rem" }}>Inactive</span>
                        </Button>
                      ) : (
                        <Button
                          variant="success"
                          onClick={() => handleStatusChange(user.id, true)}
                          className="d-flex align-items-center justify-content-center gap-1"
                          style={actionBtnStyle}
                        >
                          <Icon icon="carbon:checkmark-outline" width={20} height={20} />
                          <span style={{ fontSize: "0.75rem" }}>Active</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-end">
        <Pagination>
          <Pagination.Prev
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          />
          {[...Array(totalPages)].map((_, index) => (
            <Pagination.Item
              key={index + 1}
              active={index + 1 === currentPage}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          />
        </Pagination>
      </div>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={closeViewModal}>
        <Modal.Header closeButton>
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className="px-2">
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Name:</Col>
                <Col xs={7}>{selectedUser.first_name} {selectedUser.last_name}</Col>
              </Row>
              <Row className="mb-2">
                <Col xs={5} className="fw-bold text-muted">Email:</Col>
                <Col xs={7}>{selectedUser.email}</Col>
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
      <Modal show={showEditModal} onHide={closeEditModal}>
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

                  <FormLabel className="mt-2">Select Role</FormLabel>
                  <FormSelect value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                    <option value="">Select Role</option>
                    {isRolesLoading && <option disabled>Loading roles...</option>}
                    {isRolesError && <option disabled>Error loading roles</option>}
                    {roles?.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.role_name}
                      </option>
                    ))}
                  </FormSelect>
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
    </ContainerCardOnly>
  );
}