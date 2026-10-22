"use client";

import { Button, Col, FormLabel, FormControl, Row, Card, Table, Pagination, Spinner, Form } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    useGetSmsTemplateQuery,
    useGetSMSActionsQuery,
    useRefreshTokenMutation,
    useUpdatesmstempStatusMutation,
} from '@/store/features/apiSlice';
import Edittemplate from "./edit_template"; // ✅ Import Edit Modal Component
import Swal from "sweetalert2";
import withAuthorization from '@/hoc/withAuthorization'


const SMSTemplate = () => {
    const [selectedAction, setSelectedAction] = useState("");
    const [searchAction, setSearchAction] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // ✅ State for Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // ✅ Fetch SMS Actions for Dropdown
    const { data: smsActions, isLoading: isLoadingActions,error  } = useGetSMSActionsQuery();
    const [refreshToken] = useRefreshTokenMutation();
    const [updateClientStatus] = useUpdatesmstempStatusMutation();

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

    // ✅ Fetch SMS Templates filtered by Action ID
    const { data, isLoading, refetch } = useGetSmsTemplateQuery({
        page: currentPage,
        limit: itemsPerPage,
        action: searchAction,
    });

    const totalPages = data?.totalPages || 1;

    // ✅ Handle Action Selection Change
    const handleActionChange = (e) => {
        setSelectedAction(e.target.value);
    };

    // ✅ Handle Search Button Click
    const handleSearch = () => {
        setSearchAction(selectedAction);
        refetch();
    };

    const handleShowEditModal = (template) => {
        setSelectedTemplate(template);
        setShowEditModal(true);
        refetch();
    };


    // ✅ Close Edit Modal
    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedTemplate(null);
        refetch();

    };

    const handleSetInactive = async (template) => {
        const userId = sessionStorage.getItem("user_id");
        const accessToken = sessionStorage.getItem("access_token");
    
        if (!accessToken) {
            Swal.fire({
                title: "Session Expired",
                text: "Your session has expired. Please log in again.",
                icon: "warning",
                confirmButtonText: "OK",
            }).then(() => logoutUser());
            return;
        }
    
        if (!userId) {
            console.error("User ID is missing. Check sessionStorage.");
            return;
        }
    
        // ✅ Determine the new status ("Active" -> "Inactive", "Inactive" -> "Active")
        const newStatus = template.status === "Active" ? "Inactive" : "Active";
    
        // ✅ Ask for confirmation before updating
        const result = await Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to mark this SMS template as ${newStatus}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: template.status === "Active" ? "#d33" : "#3085d6", // Red for deactivating, Blue for activating
            cancelButtonColor: "#3085d6",
            confirmButtonText: `Yes, mark as ${newStatus}`,
        });
    
        if (!result.isConfirmed) return; // Exit early if user cancels
    
        try {
            await updateClientStatus({
                tempid: template.id, // ✅ Pass correct template ID
                status: newStatus, // ✅ Pass "Active" or "Inactive"
                user_id: userId,
            }).unwrap();
    
            Swal.fire({
                title: "Updated!",
                text: `The SMS template is now marked as ${newStatus}.`,
                icon: "success",
            });
    
            refetch(); // ✅ Refresh data to reflect status update
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
    
    
        useEffect(() => {
                if (error?.status === 403 && error?.data?.message === "Access token expired") {
                    console.warn("Token expired. Attempting to refresh...");
                    handleTokenRefresh().then((refreshed) => {
                        if (refreshed) {
                            refetch(); // ✅ Retry fetching settings after refreshing token
                        } else {
                            Swal.fire({
                                title: "Session Expired",
                                text: "Your session has expired. Please log in again.",
                                icon: "warning",
                                confirmButtonText: "OK",
                            }).then(() => logoutUser());
                        }
                    });
                }
        
                if (error?.status === 401) {
                    Swal.fire({
                        title: "Unauthorized Access",
                        text: "Your session has expired. Please log in again.",
                        icon: "error",
                        confirmButtonText: "OK",
                    }).then(() => logoutUser());
                }
            }, [error, refetch]);


    return (
        <>
            <Card className="mt-3">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">SMS Template</h5>
                        <div className="d-flex align-items-center" style={{ gap: "8px" }}>

                            {/* ✅ Dropdown for Selecting Action */}
                            <Form.Select
                                name="action"
                                value={selectedAction}
                                onChange={handleActionChange}
                                className="form-control-sm"
                            >
                                <option value="">All</option>
                                {isLoadingActions ? (
                                    <option>Loading...</option>
                                ) : (
                                    smsActions?.map((action) => (
                                        <option key={action.id} value={action.id}>{action.name}</option>
                                    ))
                                )}
                            </Form.Select>

                            {/* ✅ Search Button */}
                            <Button
                                onClick={handleSearch}
                                variant="primary"
                                className="d-flex align-items-center me-2"
                                // disabled={!selectedAction}
                            >
                                <Icon icon="material-symbols:search-rounded" width="18" height="18" className="me-1" /> Search
                            </Button>

                        </div>
                    </div>

                    {isLoading ? (
                        <div className="d-flex justify-content-center align-items-center">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th style={{ width: "30%" }}>Message</th>
                                        <th>Action</th>
                                        <th>Vendor</th>
                                        <th>Recipient</th>
                                        <th>Rider</th>
                                        <th>Status</th>
                                        <th>Added By</th>
                                        <th style={{ whiteSpace: "nowrap", width: "15%" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.smsTemplates.length > 0 ? (
                                        data.smsTemplates.map((template) => (
                                            <tr key={template.id}>
                                                <td>{template.id}</td>
                                                <td style={{
                                                    maxWidth: "300px",
                                                    wordBreak: "break-word",
                                                    whiteSpace: "normal",
                                                }}>
                                                    {template.msg}
                                                </td>
                                                <td>{template.action_name}</td>
                                                <td>{template.vendor || "No"}</td>
                                                <td>{template.recipient || "No"}</td>
                                                <td>{template.rider || "No"}</td>
                                                <td>
                                                    <span className={`badge ${template.status === "Active" ? 'bg-success' : 'bg-danger'}`}>
                                                        {template.status}
                                                    </span>
                                                </td>
                                                <td>{template.addby}</td>

                                                {/* ✅ Actions */}
                                                <td style={{ whiteSpace: "nowrap" }}>
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => handleShowEditModal(template)} // ✅ Open Edit Modal
                                                    >
                                                        <Icon icon="mdi:pen" width={18} height={18} /> Edit
                                                    </Button>
                                                    <Button
    variant={template.status === "Active" ? "danger" : "info"} // 🔥 Change color based on status
    size="sm"
    className="me-2"
    onClick={() => handleSetInactive(template)} // ✅ Pass the entire template object
>
    <Icon icon="mdi:close-circle" width={18} height={18} className="me-1" />
    {template.status === "Active" ? "Inactive" : "Active"} {/* 🔥 Change text based on status */}
</Button>


                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="9" className="text-center">No SMS Templates found</td></tr>
                                    )}
                                </tbody>
                            </Table>

                        </>
                    )}

                    {/* Pagination */}
                    <div className="d-flex justify-content-end">
                        <Pagination>
                            <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} />
                            {[...Array(totalPages)].map((_, index) => (
                                <Pagination.Item key={index + 1} active={index + 1 === currentPage} onClick={() => setCurrentPage(index + 1)}>
                                    {index + 1}
                                </Pagination.Item>
                            ))}
                            <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} />
                        </Pagination>
                    </div>
                </Card.Body>
            </Card>

            {/* ✅ Edit Modal (Opens when Edit Button is Clicked) */}
            <Edittemplate
                show={showEditModal}
                onClose={handleCloseEditModal}
                selectedTemplate={selectedTemplate}
            />
        </>
    );
};

// export default SMSTemplate;
export default withAuthorization(SMSTemplate);
