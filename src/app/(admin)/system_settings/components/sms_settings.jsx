import ComponentContainerCard from '@/components/ComponentContainerCard';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Button, Col, FormLabel, FormSelect, Row, FormControl, FormCheck } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import TestSms from './send_test_sms';
import { Icon } from "@iconify/react";
import {
    useUpdateSmsSettingsMutation,
    useGetSMSSettingsQuery,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

const SMSGatewaySettings = () => {

    const [selectedGateway, setSelectedGateway] = useState("");
    const [apiEndpoint, setApiEndpoint] = useState("");
    const [userId, setUserId] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [senderId, setSenderId] = useState("");
    const [smsNotifications, setSmsNotifications] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");
    const [initialSettings, setInitialSettings] = useState(null);


    const { data, error, isLoading, refetch } = useGetSMSSettingsQuery({ user_id, role_id }, {
        skip: !user_id || !role_id
    });
    const [refreshToken] = useRefreshTokenMutation();
    const [updateSmsSettings, { data: dataUpdate, error: errorUpdate, isLoading: isLoadingUpdate }] = useUpdateSmsSettingsMutation();

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

   useEffect(() => {
    if (data?.settings) {
        const parsed = {
            sms_sender_id: data.settings.sms_sender_id || "",
            sms_api_key: data.settings.sms_api_key || "",
            sms_user_id: data.settings.sms_user_id || "",
            sms_gateway_provider: data.settings.sms_gateway_provider || "",
            sms_notification_status: data.settings.sms_notification_status === "1",
            sms_api_endpoint: data.settings.sms_api_endpoint || "",
        };

        setSenderId(parsed.sms_sender_id);
        setApiKey(parsed.sms_api_key);
        setUserId(parsed.sms_user_id);
        setSelectedGateway(parsed.sms_gateway_provider);
        setSmsNotifications(parsed.sms_notification_status);
        setApiEndpoint(parsed.sms_api_endpoint);

        setInitialSettings(JSON.stringify(parsed)); // Save snapshot
    }
}, [data]);

const currentSettings = JSON.stringify({
    sms_sender_id: senderId,
    sms_api_key: apiKey,
    sms_user_id: userId,
    sms_gateway_provider: selectedGateway,
    sms_notification_status: smsNotifications,
    sms_api_endpoint: apiEndpoint,
});

const hasChanges = initialSettings !== currentSettings;


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
    }, [error, handleTokenRefresh, logoutUser, refetch]);


    // Function to toggle modal
    const [testSmsConfig, setTestSmsConfig] = useState({
        sms_sender_id: "",
        sms_api_key: "",
        sms_user_id: "",
        sms_api_endpoint: ""
    });

    const toggleModal = () => {
    setTestSmsConfig({
        sms_sender_id: senderId,
        sms_api_key: apiKey,
        sms_user_id: userId,
        sms_api_endpoint: apiEndpoint
    });
    setIsModalOpen(!isModalOpen);
};


    const handleTestSMS = () => {
        if (!smsNotifications) {
            alert("SMS Notifications are turned OFF. Enable them to send a test SMS.");
            return;
        }

        // Logic to send a test SMS (this should call an API)
        alert("Test SMS sent successfully!");
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
                const response = await updateSmsSettings({
                    user_id,
                    role_id,
                    sms_gateway_provider: selectedGateway,
                    sms_api_key: apiKey,
                    sms_sender_id: senderId,
                    sms_user_id: userId,
                    sms_notification_status: smsNotifications ? "1" : "0",
                    sms_api_endpoint: apiEndpoint,
                }).unwrap();
    
                console.log("SMS Settings updated successfully:", response);
    
                Swal.fire({
                    icon: "success",
                    title: "Updated!",
                    text: "SMS settings updated successfully",
                    timer: 2000, // Auto-close after 2 seconds
                    showConfirmButton: false,
                });
    setInitialSettings(currentSettings); // Sync current to initial after save

            } catch (err) {
                console.error("Error updating SMS settings:", err);
    
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




    return <ComponentContainerCard title="SMS Settings">
        <form>
            <Row>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="smsGateway">SMS Gateway</FormLabel>
                        <FormSelect
                            id="smsGateway"
                            value={selectedGateway}
                            onChange={(e) => setSelectedGateway(e.target.value)}
                        >
                            <option value="ozoneSender">OZoneSender</option>
                            {/* Future Expansion: Add more gateways here */}
                        </FormSelect>
                    </div>
                </Col>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="userId">User ID</FormLabel>
                        <FormControl
                            type="text"
                            id="userId"
                            placeholder="Enter User ID"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        />
                    </div>

                </Col>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="senderId">Sender ID</FormLabel>
                        <FormControl
                            type="text"
                            id="senderId"
                            placeholder="Enter Sender ID"
                            value={senderId}
                            onChange={(e) => setSenderId(e.target.value)}
                        />
                    </div>
                </Col>
            </Row>
            <Row>
            <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="apiEndpoint">API End Point</FormLabel>
                        <FormControl
                            type="text"
                            id="apiEndpoint"
                            placeholder="Enter API End Point"
                            value={apiEndpoint}
                            onChange={(e) => setApiEndpoint(e.target.value)}
                        />
                    </div>
                </Col>

                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="apiKey">API Key</FormLabel>
                        <FormControl
                            type="text"
                            id="apiKey"
                            placeholder="Enter API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </div>
                </Col>

                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel>Enable SMS Notifications</FormLabel>
                        <FormCheck
                            type="switch"
                            id="smsNotificationsToggle"
                            label=""
                            checked={smsNotifications}
                            onChange={() => setSmsNotifications((prev) => !prev)}
                        />
                    </div>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className="text-end">
                    {/* Save Button */}
                    <Button
  variant="primary"
  onClick={handleUpdateSettings}
  disabled={isLoadingUpdate || !hasChanges}
  className="px-2 me-2"
>
  <Icon icon="mdi:content-save" width={20} height={20} className="ms-2" />
  {isLoadingUpdate ? "Saving..." : "Save"}
</Button>

                    {/* Test SMS Button */}
                    <Button variant="secondary" onClick={toggleModal}>
    <Icon icon="mdi:send" width={20} height={20} className="me-1" />
    Test Send SMS
</Button>

{/* Render the TestSms Modal and pass control functions and SMS settings */}
<TestSms 
    show={isModalOpen} 
    handleClose={toggleModal} 
    smsConfig={testSmsConfig} 
/>
                </Col>

            </Row>
        </form>
    </ComponentContainerCard>;
};

export default SMSGatewaySettings;