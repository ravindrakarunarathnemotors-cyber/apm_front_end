import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, FormLabel, FormControl, Row } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    useGetCompanyDetailsQuery,
    useUpdateCompanyDetailsMutation,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

const CompanyDetails = () => {
    // Fetch user details from sessionStorage
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    const { data, error, isLoading, refetch } = useGetCompanyDetailsQuery(
        { user_id, role_id }, { skip: !user_id || !role_id }
    );

    const [updateGeneralSettings, { data: dataUpdate, error: errorUpdate, isLoading: isLoadingUpdate }] = useUpdateCompanyDetailsMutation();
    const [refreshToken] = useRefreshTokenMutation();

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

    // State for form fields
    const [formData, setFormData] = useState({
        companyName: '',
        address1: '',
        address2: '',
        phone: '',
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        website: '',
        clientPortal: '',
        adminPortal: '',
        hubUrl: ''
    });

    // ✅ Load existing settings into state
    useEffect(() => {
        if (data?.settings) {
            setFormData({
                companyName: data.settings.company_name || '',
                address1: data.settings.company_address_1 || '',
                address2: data.settings.company_address_2 || '',
                phone: data.settings.phone || '',
                facebook: data.settings.facebook || '',
                twitter: data.settings.twitter || '',
                instagram: data.settings.instagram || '',
                linkedin: data.settings.linkedin || '',
                website: data.settings.website || '',
                clientPortal: data.settings.clientportal || '',
                adminPortal: data.settings.adminportal || '',
                hubUrl: data.settings.huburl || ''
            });
        }
    }, [data]);

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle form submission
    // ✅ Correctly update company details
    const handleUpdateSettings = async () => {
        const user_id = sessionStorage.getItem("user_id");
        const role_id = sessionStorage.getItem("role_id");
        const accessToken = sessionStorage.getItem("access_token");

        if (!user_id || !role_id) {
            Swal.fire({
                title: "Missing User Data",
                text: "User ID or Role ID is missing. Please log in again.",
                icon: "warning",
                confirmButtonText: "OK"
            }).then(() => logoutUser());
            return;
        }

       

        try {
            const response = await updateGeneralSettings({
                user_id,
                role_id,
                companyName: formData.companyName,
                address1: formData.address1,
                address2: formData.address2,
                phone: formData.phone,
                facebook: formData.facebook,
                twitter: formData.twitter,
                instagram: formData.instagram,
                linkedin: formData.linkedin,
                website: formData.website,
                clientPortal: formData.clientPortal,
                adminPortal: formData.adminPortal,
                hubUrl: formData.hubUrl
            }).unwrap();

            console.log("Settings updated successfully:", response);

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "Company settings updated successfully",
                timer: 2000, // Auto-close after 2 seconds
                showConfirmButton: false,
            });

        } catch (err) {
            console.error("Error updating settings:", err);

            if (err?.status === 403 && err?.data?.message === "Access token expired") {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    console.log("Token refreshed. Retrying update...");
                    await handleUpdateSettings(); // ✅ Retry update after token refresh
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
                    title: "Unauthorized Access",
                    text: "Your session has expired or you do not have permission. Please log in again.",
                    icon: "warning",
                    confirmButtonText: "OK",
                }).then(() => logoutUser());
                return;
            }

            Swal.fire({
                icon: "error",
                title: "Update Failed",
                text: err?.data?.message || "Something went wrong. Please try again!",
            });
        }
    };


    return (
        <ComponentContainerCard title="Company Details">
            {isLoading ? <p>Loading...</p> : (
                <form onSubmit={handleUpdateSettings}>
                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="companyName">Company Name</FormLabel>
                                <FormControl
                                    type="text"
                                    id="companyName"
                                    name="companyName"
                                    placeholder="Enter Company Name"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="address1">Address 1</FormLabel>
                                <FormControl
                                    type="text"
                                    id="address1"
                                    name="address1"
                                    placeholder="Enter Address 1"
                                    value={formData.address1}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="address2">Address 2</FormLabel>
                                <FormControl
                                    type="text"
                                    id="address2"
                                    name="address2"
                                    placeholder="Enter Address 2"
                                    value={formData.address2}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="phone">Phone</FormLabel>
                                <FormControl
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    placeholder="Enter Phone Number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="facebook">Facebook</FormLabel>
                                <FormControl
                                    type="text"
                                    id="facebook"
                                    name="facebook"
                                    placeholder="Enter Facebook URL"
                                    value={formData.facebook}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="twitter">Twitter</FormLabel>
                                <FormControl
                                    type="text"
                                    id="twitter"
                                    name="twitter"
                                    placeholder="Enter Twitter URL"
                                    value={formData.twitter}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="instagram">Instagram</FormLabel>
                                <FormControl
                                    type="text"
                                    id="instagram"
                                    name="instagram"
                                    placeholder="Enter Instagram URL"
                                    value={formData.instagram}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="linkedin">LinkedIn</FormLabel>
                                <FormControl
                                    type="text"
                                    id="linkedin"
                                    name="linkedin"
                                    placeholder="Enter LinkedIn URL"
                                    value={formData.linkedin}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="website">Website</FormLabel>
                                <FormControl
                                    type="text"
                                    id="website"
                                    name="website"
                                    placeholder="Enter Website URL"
                                    value={formData.website}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    {/* New Fields for Client Portal, Admin Portal, and Hub URL */}
                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="clientPortal">Client Portal URL</FormLabel>
                                <FormControl
                                    type="text"
                                    id="clientPortal"
                                    name="clientPortal"
                                    placeholder="Enter Client Portal URL"
                                    value={formData.clientPortal}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="adminPortal">Admin Portal URL</FormLabel>
                                <FormControl
                                    type="text"
                                    id="adminPortal"
                                    name="adminPortal"
                                    placeholder="Enter Admin Portal URL"
                                    value={formData.adminPortal}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="hubUrl">API URL</FormLabel>
                                <FormControl
                                    type="text"
                                    id="hubUrl"
                                    name="hubUrl"
                                    placeholder="Enter Hub URL"
                                    value={formData.hubUrl}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col sm={12} className="text-end">

                            <Button variant="primary" onClick={handleUpdateSettings} disabled={isLoadingUpdate}>
                                <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
                                {isLoadingUpdate ? "Saving..." : "Save"}
                            </Button>
                        </Col>
                    </Row>
                </form>
            )}
        </ComponentContainerCard>
    );
};

export default CompanyDetails;
