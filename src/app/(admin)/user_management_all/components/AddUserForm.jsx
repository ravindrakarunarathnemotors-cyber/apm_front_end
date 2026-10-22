"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useAddUserMutation,
  useRefreshTokenMutation,
  useGetRolesMutation,
  useGetBranchesMutation, // <-- aluth (apiSlice ekata add karanna)
  useCheckUsernameMutation,
} from "@/store/features/apiSlice";
import { Button, Col, Form, FormControl, FormLabel, FormSelect, Row } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react/dist/iconify.js";
import { debounce } from "lodash";

const schema = yup.object({
  username: yup.string().required("Username is required"),
  firstName: yup
    .string()
    .matches(/^[A-Za-z\s]+$/, "First name can only contain letters")
    .required("First Name is required"),
  lastName: yup
    .string()
    .matches(/^[A-Za-z\s]+$/, "Last name can only contain letters")
    .required("Last Name is required"),
  nic: yup
    .string()
    .matches(
      /^(\d{9}[VvXx]|\d{12})$/,
      "Invalid NIC (old: 9 digits + V/X, new: 12 digits)"
    )
    .required("NIC is required"),
  email: yup.string().email("Invalid email"),
  phone: yup
    .string()
    .matches(/^\d{10,11}$/, "Phone number must be between 10 and 11 digits")
    .required("Phone is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  role: yup.string().required("Role is required"),
  branch: yup.string().required("Branch is required"),
});

export default function AddUserForm({ title = "Add New User", onSuccess }) {
  const [addUser, { isLoading: isAddingUser }] = useAddUserMutation();
  const [fetchRoles, { data: roles, isLoading: isRolesLoading, isError: isRolesError }] =
    useGetRolesMutation();
  const [
    fetchBranches,
    { data: branches, isLoading: isBranchesLoading, isError: isBranchesError },
  ] = useGetBranchesMutation();
  const [checkUsername] = useCheckUsernameMutation();
  const [refreshToken] = useRefreshTokenMutation();
  const [usernameError, setUsernameError] = useState("");

  // Session storage eken role_id & branch_id
  const [sessionRoleId, setSessionRoleId] = useState(null);
  const [sessionBranchId, setSessionBranchId] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({ resolver: yupResolver(schema), mode: "onChange" });

  // Admin (role_id = 1) nam branch select karanna puluwan
  const isAdmin = String(sessionRoleId) === "1";

  useEffect(() => {
    setSessionRoleId(sessionStorage.getItem("role_id"));
    setSessionBranchId(sessionStorage.getItem("branch_id"));
    fetchRoles();
    fetchBranches();
  }, []);

  // Admin nemei nam branch eka session eke branch_id ekata set karanna
  useEffect(() => {
    if (sessionRoleId !== null && !isAdmin && sessionBranchId) {
      setValue("branch", String(sessionBranchId), { shouldValidate: true });
    }
  }, [sessionRoleId, sessionBranchId, isAdmin, setValue]);

  const debouncedCheck = useMemo(
    () =>
      debounce(async (username) => {
        if (username.length > 2) {
          try {
            const response = await checkUsername(username).unwrap();
            setUsernameError(response.exists ? "Username already exists" : "");
          } catch {
            setUsernameError("Error checking username");
          }
        } else {
          setUsernameError("");
        }
      }, 500),
    [checkUsername]
  );

  useEffect(() => {
    return () => debouncedCheck.cancel();
  }, [debouncedCheck]);

  const usernameField = register("username");

  const logoutUser = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/auth/login";
  };

  const handleTokenRefresh = async () => {
    const refresh_token = localStorage.getItem("refresh_token");
    if (!refresh_token) {
      console.error("No refresh token found.");
      return null;
    }
    try {
      const res = await refreshToken({ refresh_token }).unwrap();
      if (res.access_token) {
        sessionStorage.setItem("access_token", res.access_token);
        return res.access_token;
      }
      return null;
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError);
      logoutUser();
      return null;
    }
  };

  const showError = (title, text) =>
    Swal.fire({ title, text, icon: "error", confirmButtonText: "OK" });

  const handleSuccess = () => {
    Swal.fire({
      title: "Success!",
      text: "User added successfully!",
      icon: "success",
      confirmButtonText: "OK",
    });
    reset();
    setUsernameError("");
    // reset() ekata passe admin nemei nam branch eka ayeth set karanna
    if (!isAdmin && sessionBranchId) {
      setValue("branch", String(sessionBranchId));
    }
    onSuccess?.();
  };

  const onSubmit = async (data) => {
    if (usernameError) return;

    const user_id = sessionStorage.getItem("user_id");

    // Admin nemei nam, user kenek DOM eka edit kara kala kiyala
    // session branch_id eka force karanawa
    const branch = isAdmin ? data.branch : String(sessionBranchId);

    const requestdata = { ...data, branch, user_id };

    try {
      const response = await addUser(requestdata).unwrap();
      if (response.message === "sameuser") {
        showError("Username Exist", "Same User Found");
      } else {
        handleSuccess();
      }
    } catch (err) {
      if (err.status === 403) {
        const newToken = await handleTokenRefresh();
        if (newToken) {
          try {
            await addUser(requestdata).unwrap();
            handleSuccess();
          } catch {
            showError("Error", "Failed to add user. Please try again.");
          }
        } else {
          showError("Session Expired", "Your session has expired. Please log in again.");
        }
      } else {
        console.error("Error adding user:", err);
        showError("Error", "Failed to add user. Please try again.");
      }
    }
  };

  return (
    <Row className="justify-content-center">
      <Col>
        <ComponentContainerCard title={title}>
          <Form onSubmit={handleSubmit(onSubmit)}>
            <Row className="mb-1">
              <Col md="6">
                <FormLabel className="col-form-label text-start">Username</FormLabel>
                <FormControl
                  type="text"
                  {...usernameField}
                  onChange={(e) => {
                    usernameField.onChange(e);
                    debouncedCheck(e.target.value.trim());
                  }}
                  placeholder="Enter Username"
                />
                <p className="text-danger">{errors.username?.message || usernameError}</p>
              </Col>
              <Col md="6">
                <FormLabel className="col-form-label text-start">Password</FormLabel>
                <FormControl type="password" {...register("password")} placeholder="Enter password" />
                <p className="text-danger">{errors.password?.message}</p>
              </Col>
            </Row>

            <Row className="mb-1">
              <Col md="6">
                <FormLabel className="col-form-label text-start">First Name</FormLabel>
                <FormControl type="text" {...register("firstName")} placeholder="Enter first name" />
                <p className="text-danger">{errors.firstName?.message}</p>
              </Col>
              <Col md="6">
                <FormLabel className="col-form-label text-start">Last Name</FormLabel>
                <FormControl type="text" {...register("lastName")} placeholder="Enter last name" />
                <p className="text-danger">{errors.lastName?.message}</p>
              </Col>
            </Row>

            <Row className="mb-1">
              <Col md="6">
                <FormLabel className="col-form-label text-start">NIC</FormLabel>
                <FormControl
                  type="text"
                  {...register("nic")}
                  placeholder="Enter NIC (e.g. 199012345678 or 901234567V)"
                />
                <p className="text-danger">{errors.nic?.message}</p>
              </Col>
              <Col md="6">
                <FormLabel className="col-form-label text-start">Email</FormLabel>
                <FormControl type="email" {...register("email")} placeholder="Enter email" />
                <p className="text-danger">{errors.email?.message}</p>
              </Col>
            </Row>

            <Row className="mb-1">
              <Col md="6">
                <FormLabel className="col-form-label text-start">Mobile Number</FormLabel>
                <FormControl
                  type="tel"
                  {...register("phone")}
                  placeholder="Enter Mobile number 947xxxxxxxx"
                />
                <p className="text-danger">{errors.phone?.message}</p>
              </Col>
              <Col md="6">
                <FormLabel className="col-form-label text-start">Select Role</FormLabel>
                <FormSelect {...register("role")}>
                  <option value="">Select Role</option>
                  {isRolesLoading && <option disabled>Loading roles...</option>}
                  {isRolesError && <option disabled>Error loading roles</option>}
                  {roles?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name}
                    </option>
                  ))}
                </FormSelect>
                <p className="text-danger">{errors.role?.message}</p>
              </Col>
            </Row>

            <Row className="mb-1">
              <Col md="6">
                <FormLabel className="col-form-label text-start">Select Branch</FormLabel>
                <FormSelect {...register("branch")} disabled={!isAdmin}>
                  <option value="">Select Branch</option>
                  {isBranchesLoading && <option disabled>Loading branches...</option>}
                  {isBranchesError && <option disabled>Error loading branches</option>}
                  {branches?.map((branch) => (
  <option key={branch.branch_id} value={branch.branch_id}>
    {branch.branch_name}
  </option>
))}
                </FormSelect>
                <p className="text-danger">{errors.branch?.message}</p>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col className="text-end">
                <Button type="submit" disabled={isAddingUser || !!usernameError}>
                  <Icon icon="material-symbols:group-add-rounded" width="24" height="24" />{" "}
                  {isAddingUser ? "Adding..." : "Add User"}
                </Button>
              </Col>
            </Row>
          </Form>
        </ComponentContainerCard>
      </Col>
    </Row>
  );
}