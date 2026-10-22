"use client";

import { Button, Col, FormLabel, FormControl, Row, Card, Table, Pagination, Spinner, Form } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    useGetSmsTemplogQuery,
    useGetSMSActionsQuery,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from "sweetalert2";

const SMSTemplate = () => {
    const [selectedAction, setSelectedAction] = useState("");
    const [searchAction, setSearchAction] = useState("");
    const [mobileNo, setMobileNo] = useState("");
    const [status, setStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // ✅ Fetch SMS Actions for Dropdown
    const { data: smsActions, isLoading: isLoadingActions, error } = useGetSMSActionsQuery();
    const [refreshToken] = useRefreshTokenMutation();

    // ✅ Fetch SMS Templates filtered by multiple criteria
    const { data, isLoading, refetch } = useGetSmsTemplogQuery({
        page: currentPage,
        limit: itemsPerPage,
        action: searchAction,
        mobileNo,
        status,
        startDate,
        endDate,
    });

    const totalPages = data?.totalPages || 1;

    // ✅ Handle Search Button Click
    const handleSearch = () => {
        setSearchAction(selectedAction);
        refetch();
    };

    // Logout User
    const logoutUser = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/auth/login';
    };

    // Function to refresh the access token
    const handleTokenRefresh = async () => {
        if (typeof window === "undefined") return;

        const refreshTokenStored = localStorage.getItem("refresh_token");
        if (!refreshTokenStored) {
            console.log("No refresh token found, logging out...");
            logoutUser();
            return false;
        }

        try {
            console.log("Refreshing access token...");
            const response = await refreshToken(refreshTokenStored).unwrap();
            sessionStorage.setItem("access_token", response.access_token);
            console.log("Token refreshed successfully.");
            return true;
        } catch (refreshError) {
            console.error("Error refreshing token:", refreshError);
            logoutUser();
            return false;
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
            <Card >
                <Card.Body>
                    <div className="card p-3">
                       
                        {/* Filter Section */}
                        <div className="row g-2 align-items-center">

                            {/* Start Date Picker */}
                            <div className="col-md-3">
                                <Form.Label className="form-label-sm">Start Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="form-control-sm"
                                    style={{ height: "40px" }} // Increased height
                                />
                            </div>

                            {/* End Date Picker */}
                            <div className="col-md-3">
                                <Form.Label className="form-label-sm">End Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="form-control-sm"
                                    style={{ height: "40px" }} // Increased height
                                />
                            </div>
                            {/* Action Dropdown */}
                            <div className="col-md-3">
                                <Form.Label className="form-label-sm">Action</Form.Label>

                                <Form.Select
                                    name="action"
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value)}
                                    className="form-control-sm"
                                >
                                    <option value="" disabled hidden>All Actions</option>
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
                            </div>

                            {/* Status Dropdown */}
                            <div className="col-md-3">
                                <Form.Label className="form-label-sm">Status</Form.Label>
                                <Form.Select
                                    name="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="form-control-sm"
                                >
                                    <option value="">All Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Sent">Sent</option>
                                </Form.Select>
                            </div>
                            {/* Mobile Number Input */}
                            <div className="col-md-3">
                                <Form.Label className="form-label-sm">Mobile Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Mobile No"
                                    value={mobileNo}
                                    onChange={(e) => setMobileNo(e.target.value)}
                                    className="form-control-sm"
                                    style={{ height: "40px" }} // Increased height
                                />
                            </div>



                            {/* Search Button */}
                           {/* Search and Reset Buttons */}
<div className="col-md-3 d-flex gap-2 mt-4">
     <Button
    onClick={() => {
      setSelectedAction('');
      setSearchAction('');
      setMobileNo('');
      setStatus('');
      setStartDate('');
      setEndDate('');
      setCurrentPage(1);
      refetch(); // Re-fetch with cleared filters
    }}
    variant="danger"
    className="w-100"
  >
    <Icon icon="material-symbols:restart-alt-rounded" width="18" height="18" className="me-1" />
    Reset
  </Button>

  <Button onClick={handleSearch} variant="primary" className="w-100">
    <Icon icon="material-symbols:search-rounded" width="18" height="18" className="me-1" />
    Search
  </Button>
 
</div>
                            
                        </div>
                    </div>

                    {/* ✅ Loading Spinner */}
                    {isLoading ? (
                        <div className="d-flex justify-content-center align-items-center">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <>
                            {/* ✅ SMS Logs Table */}
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Mobile No</th>
                                        <th>Message</th>
                                        <th>Date</th>
                                        <th>Sent Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.smsTemplates.length > 0 ? (
                                        data.smsTemplates.map((template) => (
                                            <tr key={template.id}>
                                                <td>{template.id}</td>
                                                <td>{template.mobileno}</td>
                                                <td style={{
                                                    maxWidth: "300px",
                                                    wordBreak: "break-word",
                                                    whiteSpace: "normal",
                                                }}>
                                                    {template.msg}
                                                </td>
                                                <td>{new Date(template.date).toLocaleDateString()}</td>
                                                <td>
                                                    {template.sentdate
                                                        ? new Date(template.sentdate).toISOString().slice(0, 19).replace("T", " ")
                                                        : "Not Sent"}
                                                </td>
                                                <td>{template.status}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="text-center">No SMS Logs found</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </>
                    )}

                    {/* ✅ Pagination */}
                    <div className="d-flex justify-content-end">
                        <Pagination>
                            <Pagination.Prev
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            />

                            {Array.from({ length: totalPages }, (_, index) => index + 1)
                                .filter((page) => {
                                    if (totalPages <= 3) return true;
                                    if (currentPage <= 2) return page <= 3;
                                    if (currentPage >= totalPages - 1) return page >= totalPages - 2;
                                    return Math.abs(page - currentPage) <= 1;
                                })
                                .map((page) => (
                                    <Pagination.Item
                                        key={page}
                                        active={page === currentPage}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Pagination.Item>
                                ))}

                            <Pagination.Next
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            />
                        </Pagination>

                    </div>
                </Card.Body>
            </Card>
        </>
    );
};

export default SMSTemplate;
