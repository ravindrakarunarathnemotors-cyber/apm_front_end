"use client";

import { Modal, Button, Col, FormLabel, FormControl, Row, Form } from "react-bootstrap";
import { Icon } from "@iconify/react";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  useGetSMSActionsQuery,
  useUpdateSMSTemplateMutation,
  useRefreshTokenMutation,
} from "@/store/features/apiSlice";

const Edittemplate = ({ show, onClose, selectedTemplate }) => {
  const user_id = sessionStorage.getItem("user_id");
  const role_id = sessionStorage.getItem("role_id");

  // ✅ Fetch SMS Actions for dropdown
  const { data: smsActions, isLoading: isLoadingActions } = useGetSMSActionsQuery();

  // ✅ Mutation for updating SMS Template
  const [updateSMSTemplate, { isLoading }] = useUpdateSMSTemplateMutation();
      const [refreshToken] = useRefreshTokenMutation();
  
   // Logout function with safe storage clearing
   const logoutUser = () => {
    if (typeof window !== "undefined") {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/auth/login"; // Uncomment if needed
    }
};

// Function to refresh the access token
const handleTokenRefresh = async () => {
    if (typeof window === "undefined") return;

    const refreshTokenStored = localStorage.getItem("refresh_token");
    if (!refreshTokenStored) {
        console.log("No refresh token found, logging out...");
        logoutUser();
        return;
    }

    try {
        console.log("Refreshing access token...");
        const response = await refreshToken(refreshTokenStored).unwrap();
        sessionStorage.setItem("access_token", response.access_token);
        console.log("Token refreshed successfully, retrying data fetch...");
        refetch();
    } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        logoutUser();
    }
};

  // ✅ Local state for form fields
  const [formData, setFormData] = useState({
    sms: "",
    action: "", // ✅ This will store the selected action ID
    vendor: false,
    recipient: false,
    rider: false,
    status: "",
  });

  

  useEffect(() => {
    if (selectedTemplate) {
      // Find the action ID based on action_name
      const selectedAction = smsActions?.find(a => a.name === selectedTemplate.action_name);

      setFormData({
        sms: selectedTemplate.msg || "",
        action: selectedAction ? String(selectedAction.id) : "", // ✅ Store Action ID
        vendor: selectedTemplate.vendor === "Yes",
        recipient: selectedTemplate.recipient === "Yes",
        rider: selectedTemplate.rider === "Yes",
        status: selectedTemplate.status || "Active",
      });
    }
}, [selectedTemplate, smsActions]);




  // ✅ Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async () => {
    if (!formData.sms || !formData.action || !formData.status) {
      Swal.fire({ icon: "warning", title: "Missing Data", text: "Please fill all required fields!" });
      return;
    }

    try {
      await updateSMSTemplate({
        role_id,
        user_id,
        id: selectedTemplate.id,
        sms: formData.sms,
        action: formData.action, // ✅ Now correctly sending Action ID
        vendor: formData.vendor ? "Yes" : "No", // ✅ Always send "Yes" or "No"
        recipient: formData.recipient ? "Yes" : "No", // ✅ Always send "Yes" or "No"
        rider: formData.rider ? "Yes" : "No", // ✅ Always send "Yes" or "No"
        status: formData.status,
      }).unwrap();

      Swal.fire({ icon: "success", title: "Updated!", text: "SMS Template updated successfully", timer: 2000, showConfirmButton: false });

      onClose(); // ✅ Close modal after success

    } catch (err) {
      if (err?.status === 403 && err?.data?.message === "Access token expired") {
                     const refreshed = await handleTokenRefresh();
                     if (refreshed) {
                         await handleSetInactive(template); // Retry after token refresh
                     } else {
                         Swal.fire({
                             title: "Session Expired",
                             text: "Your session has expired. Please log in again.",
                             icon: "warning",
                             confirmButtonText: "OK",
                         }).then(() => logoutUser());
                     }
                     return;
                 }
         
                 if (err?.status === 401) {
                     Swal.fire({
                         title: "Session Expired",
                         text: "Your session has expired. Please log in again.",
                         icon: "warning",
                         confirmButtonText: "OK",
                     }).then(() => logoutUser());
                     return;
                 }
         
                 Swal.fire({
                     icon: "error",
                     title: "Update Failed",
                     text: "Something went wrong. Please try again!",
                 });
             }
         };



  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <h6 className="modal-title">Edit SMS Template - ID: {selectedTemplate?.id || "N/A"}</h6>
        <h6 className="modal-title">Edit SMS Template - ID: {selectedTemplate?.action_name || "N/A"}</h6>
      </Modal.Header>
      <Modal.Body className="px-5 max-w-4xl mx-auto">
        <Form>
          <Row className="mb-3">
            <FormLabel htmlFor="sms">SMS</FormLabel>
            <FormControl
              as="textarea"
              rows={3}
              id="sms"
              name="sms"
              value={formData.sms}
              onChange={handleChange}
              placeholder="Enter SMS Template"
            />
            <small className="text-muted d-block mt-1">
              {`Sample: "Hello [FName], your parcel [WaybillID] is out for delivery. Contact: [RiderMobile]."`}
            </small>

          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <FormLabel>Action</FormLabel>
              <Form.Select name="action" value={formData.action} onChange={handleChange}>
  <option value="">Select...</option>
  {isLoadingActions ? (
    <option>Loading...</option>
  ) : (
    smsActions?.map((action) => (
      <option key={action.id} value={action.id}>
        {action.name}
      </option>
    ))
  )}
</Form.Select>




            </Col>
            <Col md={6}>
              <FormLabel>Status</FormLabel>
              <Form.Select name="status" value={formData.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Check type="checkbox" label="Vendor" name="vendor" checked={formData.vendor} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Check type="checkbox" label="Recipient" name="recipient" checked={formData.recipient} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Check type="checkbox" label="Rider" name="rider" checked={formData.rider} onChange={handleChange} />
            </Col>
          </Row>

          <Row className="mt-4 mb-4">
            <Col sm={12} className="text-end">
              <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
                {isLoading ? "Saving..." : "Update"}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default Edittemplate;
