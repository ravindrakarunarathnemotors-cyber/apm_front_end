import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, FormLabel, FormSelect, Row, FormControl, FormCheck, Card } from 'react-bootstrap';
import React, { useState, useEffect, useCallback } from "react";
import TestMail from './send_test_mail';
import { Icon } from "@iconify/react";
import Swal from 'sweetalert2';

import {
    useUpdateEmailSettingsMutation,
    useGetEMAILSettingsQuery,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';

const EmailGatewaySettings = () => {
    const [initialSettings, setInitialSettings] = useState(null);

    const [formData, setFormData] = useState({
        billingEmail: "",
        systemEmail: "",
        supportEmail: "",
        enableEmailNotifications: false,
        postmarkServerToken: "",
        smtpHost: "",
        smtpPort: "",
        smtpUsername: "",
        smtpPassword: "",
        smtpEncryption: "none"
    });

    const [isModalOpen, setIsModalOpen] = useState(false);

    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    const { data, error, isLoading, refetch } = useGetEMAILSettingsQuery({ user_id, role_id }, {
        skip: !user_id || !role_id
    });
    const [updateEmailSettings, { data: dataUpdate, error: errorUpdate, isLoading: isLoadingUpdate }] = useUpdateEmailSettingsMutation();

    const [refreshToken] = useRefreshTokenMutation();

    // Logout User
    const logoutUser = useCallback(() => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/auth/login';
    }, []);

    // Function to refresh the access token
    const handleTokenRefresh = useCallback(async () => {
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
    }, [logoutUser, refreshToken, refetch]);

    useEffect(() => {
        if (data?.settings) {
            const newFormData = {
                billingEmail: data.settings.billing_email_address || "",
                systemEmail: data.settings.system_email_address || "",
                supportEmail: data.settings.support_email_address || "",
                enableEmailNotifications: data.settings.enable_email_notifications_status === "true",
                postmarkServerToken: data.settings.postmark_server_token || "",
                smtpHost: data.settings.smtp_host || "",
                smtpPort: data.settings.smtp_port || "",
                smtpUsername: data.settings.smtp_username || "",
                smtpPassword: data.settings.smtp_password || "",
                smtpEncryption: data.settings.smtp_encryption || "none",
            };

            setFormData(newFormData);
            setInitialSettings(JSON.stringify(newFormData)); // Save snapshot for comparison
        }
    }, [data]);

    const hasChanges = JSON.stringify(formData) !== initialSettings;



    useEffect(() => {
        if (error?.status === 403 && error?.data?.message === "Access token expired") {
            console.warn("Token expired. Attempting to refresh...");
            handleTokenRefresh().then((refreshed) => {
                if (refreshed) {
                    refetch();
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
    }, [error, handleTokenRefresh, logoutUser, refetch]);

    // Function to handle input change
    const handleChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: type === "checkbox" ? checked : value
        }));
    };

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
            const response = await updateEmailSettings({
                user_id,
                role_id,
                billing_email_address: formData.billingEmail,
                system_email_address: formData.systemEmail,
                support_email_address: formData.supportEmail,
                enable_email_notifications_status: formData.enableEmailNotifications ? "true" : "false",
                postmark_server_token: formData.postmarkServerToken,
                smtp_host: formData.smtpHost,
                smtp_port: formData.smtpPort,
                smtp_username: formData.smtpUsername,
                smtp_password: formData.smtpPassword,
                smtp_encryption: formData.smtpEncryption
            }).unwrap();

            console.log("Email settings updated successfully:", response);

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "Email settings updated successfully",
                timer: 2000, // Auto-close after 2 seconds
                showConfirmButton: false,
            });

            await refetch(); // ✅ Refresh settings after update

        } catch (err) {
            console.error("Error updating email settings:", err);

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


    // Function to toggle modal
    const toggleModal = () => setIsModalOpen(!isModalOpen);
    return (
        <ComponentContainerCard title="Mail Settings">
            <form >
                {/* Email Addresses */}
                <Card>
                    <h5>Email Settings</h5>
                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="billingEmail">Billing Email Address</FormLabel>
                                <FormControl
                                    type="email"
                                    id="billingEmail"
                                    placeholder="Enter Billing Email"
                                    value={formData.billingEmail}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="systemEmail">System Email Address</FormLabel>
                                <FormControl
                                    type="email"
                                    id="systemEmail"
                                    placeholder="Enter System Email"
                                    value={formData.systemEmail}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="supportEmail">Support Email Address</FormLabel>
                                <FormControl
                                    type="email"
                                    id="supportEmail"
                                    placeholder="Enter Support Email"
                                    value={formData.supportEmail}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel>Enable Email Notifications</FormLabel>
                                <FormCheck
                                    type="switch"
                                    id="enableEmailNotifications"
                                    checked={formData.enableEmailNotifications}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                {/* Postmark Settings */}
                <Card>
                    <h5>Postmark Settings</h5>
                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="postmarkServerToken">Postmark Server Token</FormLabel>
                                <FormControl
                                    type="text"
                                    id="postmarkServerToken"
                                    placeholder="Enter Postmark Server Token"
                                    value={formData.postmarkServerToken}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>
                </Card>

                {/* SMTP Settings */}
                <Card>
                    <h5>SMTP Settings</h5>
                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="smtpHost">SMTP Host</FormLabel>
                                <FormControl
                                    type="text"
                                    id="smtpHost"
                                    placeholder="Enter SMTP Host"
                                    value={formData.smtpHost}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="smtpPort">SMTP Port</FormLabel>
                                <FormControl
                                    type="number"
                                    id="smtpPort"
                                    placeholder="Enter SMTP Port"
                                    value={formData.smtpPort}
                                    onChange={handleChange}
                                    min="1"
                                    max="65535"
                                />
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="smtpUsername">SMTP Username</FormLabel>
                                <FormControl
                                    type="text"
                                    id="smtpUsername"
                                    placeholder="Enter SMTP Username"
                                    value={formData.smtpUsername}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="smtpPassword">SMTP Password</FormLabel>
                                <FormControl
                                    type="text"
                                    id="smtpPassword"
                                    placeholder="Enter SMTP Password"
                                    value={formData.smtpPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>

                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="smtpEncryption">SMTP Encryption</FormLabel>
                                <FormSelect
                                    id="smtpEncryption"
                                    value={formData.smtpEncryption}
                                    onChange={handleChange}
                                >
                                    <option value="none">None</option>
                                    <option value="ssl">SSL</option>
                                    <option value="tls">TLS</option>
                                </FormSelect>
                            </div>
                        </Col>
                    </Row>

                    {/* Save & Test Buttons */}
                    <Row>
                        <Col sm={12} className="text-end">
                            <Button
                                variant="primary"
                                onClick={handleUpdateSettings}
                                disabled={isLoadingUpdate || !hasChanges}
                                className="px-2 me-2"
                            >
                                <Icon icon="mdi:content-save" width={20} height={20} className="ms-2" />
                                {isLoadingUpdate ? "Saving..." : "Save"}
                            </Button>


                            <Button variant="secondary" onClick={toggleModal}>
                                <Icon icon="mdi:email-send" width={20} height={20} className="me-1" />
                                Test Email
                            </Button>

                            {/* TestMail Modal */}
                            <TestMail show={isModalOpen} handleClose={toggleModal} />
                        </Col>
                    </Row>
                </Card>
            </form>
        </ComponentContainerCard>
    );
};

export default EmailGatewaySettings;
