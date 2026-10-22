import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, FormLabel, FormControl, Row } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    useGetSystemColorsQuery,
    useUpdateSystemColorsMutation,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

const SystemColors = () => {
    // Fetch user details from sessionStorage
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    const { data, error, isLoading, refetch } = useGetSystemColorsQuery(
        { user_id, role_id }, { skip: !user_id || !role_id }
    );

    const [updateSystemColors, { isLoading: isLoadingUpdate }] = useUpdateSystemColorsMutation();
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

    // ✅ State for system colors
    const [formData, setFormData] = useState({
        primaryColor: '',
        secondaryColor: ''
    });

    // ✅ Load existing system colors into state
    useEffect(() => {
        if (data?.system_colors) {
            setFormData({
                primaryColor: data.system_colors.primary_color || '',
                secondaryColor: data.system_colors.secondary_color || ''
            });
        }
    }, [data]);

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ✅ Handle form submission to update system colors
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
            const response = await updateSystemColors({
                user_id,
                role_id,
                primaryColor: formData.primaryColor,
                secondaryColor: formData.secondaryColor
            }).unwrap();

            console.log("System colors updated successfully:", response);

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "System colors updated successfully",
                timer: 2000,
                showConfirmButton: false,
            });

        } catch (err) {
            console.error("Error updating system colors:", err);

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

            Swal.fire({
                icon: "error",
                title: "Update Failed",
                text: err?.data?.message || "Something went wrong. Please try again!",
            });
        }
    };

    return (
        <ComponentContainerCard title="System Colors">
            {isLoading ? <p>Loading...</p> : (
                <form>
                    <Row>
                        <Col md={6}>
                            <div className="mb-3">
                                <FormLabel htmlFor="primaryColor">Primary Color</FormLabel>
                                <FormControl
                                    type="text"
                                    id="primaryColor"
                                    name="primaryColor"
                                    placeholder="Enter Primary Color"
                                    value={formData.primaryColor}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="mb-3">
                                <FormLabel htmlFor="secondaryColor">Secondary Color</FormLabel>
                                <FormControl
                                    type="text"
                                    id="secondaryColor"
                                    name="secondaryColor"
                                    placeholder="Enter Secondary Color"
                                    value={formData.secondaryColor}
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

export default SystemColors;
