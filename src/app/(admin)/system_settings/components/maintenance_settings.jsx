import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, FormLabel, Row, FormCheck, FormControl, Card } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    useGetMaintenanceSettingsQuery,
    useRefreshTokenMutation,
    useUpdateMaintenanceSettingsMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

const settingKeyLabels = {
    client_api_maintenance: 'Client API Maintenance',
    hub_maintenance: 'Hub Maintenance',
    client_panel_maintenance: 'Client Panel Maintenance',
    client_mobile_app_maintenance: 'Client Mobile App Maintenance',
    system_wide_maintenance: 'System-Wide Maintenance',
    rider_app_maintenance: 'Rider App Maintenance',
    website_maintenance: 'Website Maintenance',
};

const MaintenanceSettings = () => {
    const [initialSettings, setInitialSettings] = useState([]);

    // ✅ State for switches, titles, and messages
    const [settings, setSettings] = useState([]);

    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    // ✅ Fetch maintenance settings
    const { data, error, isLoading, refetch } = useGetMaintenanceSettingsQuery({ user_id, role_id }, {
        skip: !user_id || !role_id
    });

    // ✅ Mutation for updating settings
    const [updateMaintenanceSettings, { isLoading: isLoadingUpdate }] = useUpdateMaintenanceSettingsMutation();

    // ✅ Refresh token mutation
    const [refreshToken] = useRefreshTokenMutation();

    // ✅ Logout User
    const logoutUser = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/auth/login';
    };

    // ✅ Refresh Access Token on Expiry
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

    // ✅ Fetch and set Maintenance Settings
    useEffect(() => {
        if (!data?.settings) return;
        setSettings(data.settings);
        setInitialSettings(JSON.stringify(data.settings)); // Save as JSON string for deep comparison
    }, [data]);

    const hasChanges = JSON.stringify(settings) !== initialSettings;


    // ✅ Handle API errors and token expiry
    useEffect(() => {
        if (error?.status === 403 && error?.data?.message === "Access token expired") {
            handleTokenRefresh().then((refreshed) => {
                if (refreshed) refetch();
                else logoutUser();
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
    }, [error, handleTokenRefresh, refetch]);

    const handleToggle = (id) => {
        setSettings(prevSettings =>
            prevSettings.map(setting =>
                setting.id === id
                    ? { ...setting, setting_value: setting.setting_value === '1' ? '0' : '1' }
                    : setting
            )
        );

        // Optional: Call backend API here with updated value
    };

    // ✅ Handle Input Change (Title & Message)
    const handleInputChange = (id, field, value) => {
        setSettings((prevSettings) =>
            prevSettings.map((setting) =>
                setting.id === id
                    ? { ...setting, [field]: value }
                    : setting
            )
        );
    };

    // ✅ Handle Save Function
    const handleUpdateSettings = async () => {
        if (!user_id || !role_id) {
            Swal.fire({
                title: "Missing User Data",
                text: "User ID or Role ID is missing. Please log in again.",
                icon: "warning",
                confirmButtonText: "OK"
            }).then(() => logoutUser());
            return;
        }
        console.log(settings)
        try {
            await updateMaintenanceSettings({
                user_id,
                role_id,
                settings: settings
            }).unwrap();

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "Maintenance settings updated successfully",
                timer: 2000,
                showConfirmButton: false,
            });

        } catch (err) {
            if (err?.status === 403 && err?.data?.message === "Access token expired") {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    await handleUpdateSettings();
                } else {
                    logoutUser();
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

    console.log(settings)
    return (
        <ComponentContainerCard title="Maintenance Settings">
            <form>

                {settings.map((setting) => (
                    <Card key={setting.id} className="p-3 mb-3">

                        <FormCheck
                            type="switch"
                            id={`switch-${setting.setting_key}`}
                            label={settingKeyLabels[setting.setting_key] || setting.setting_key}
                            checked={setting.setting_value === '1'}
                            onChange={() => handleToggle(setting.id)}
                        />
                        {setting.setting_value === '1' && (
                            <>
                                <FormLabel>Title</FormLabel>
                                <FormControl type="text" value={setting.title} onChange={(e) => handleInputChange(setting.id, "title", e.target.value)} />
                                <FormLabel>Message</FormLabel>
                                <FormControl as="textarea" value={setting.message} onChange={(e) => handleInputChange(setting.id, "message", e.target.value)} rows={3} />
                            </>
                        )}
                    </Card>
                ))}
                <Row className="mt-4">
                    <Col className="text-end">
                        <Button
                            variant="primary"
                            onClick={handleUpdateSettings}
                            disabled={isLoadingUpdate || !hasChanges}
                        >
                            <Icon icon="mdi:content-save" width={20} height={20} />
                            {isLoadingUpdate ? "Saving..." : "Save"}
                        </Button>

                    </Col>
                </Row>
            </form>
        </ComponentContainerCard>
    );
};

export default MaintenanceSettings;
