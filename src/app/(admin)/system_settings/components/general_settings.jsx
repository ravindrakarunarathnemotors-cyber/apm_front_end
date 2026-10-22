import ComponentContainerCard from '@/components/ComponentContainerCard';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Button, Col, FormLabel, FormSelect, Row } from 'react-bootstrap';
import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Icon } from "@iconify/react";
import {
    useGetGeneralSettingsQuery,
    useUpdateGeneralSettingsMutation,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';


dayjs.extend(utc);
dayjs.extend(timezone);

const timezones = [
    "Asia/Colombo",
    "UTC",
    "America/New_York",
    "Europe/London",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Australia/Sydney"
];

const dateFormats = [
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },//2025-02-21
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },//21/02/2025
    { value: "MM-DD-YYYY", label: "MM-DD-YYYY" },//02-21-2025
    { value: "MMMM D, YYYY", label: "MMMM D, YYYY" },//February 21, 2025
    { value: "ddd, MMM D YYYY", label: "ddd, MMM D YYYY" }//Fri, Feb 21 2025
];

const currencies = [
    { code: "LKR", label: "LKR - Sri Lankan Rupee (Rs)" },
    { code: "USD", label: "USD - US Dollar ($)" },
    { code: "EUR", label: "EUR - Euro (€)" },
    { code: "GBP", label: "GBP - British Pound (£)" },
    { code: "INR", label: "INR - Indian Rupee (₹)" },
    { code: "JPY", label: "JPY - Japanese Yen (¥)" },
    { code: "AUD", label: "AUD - Australian Dollar (A$)" },
    { code: "CAD", label: "CAD - Canadian Dollar (C$)" }
];

const logoutOptions = [
    { value: "5min", label: "5 Minutes" },
    { value: "10min", label: "10 Minutes" },
    { value: "30min", label: "30 Minutes" },
    { value: "never", label: "Never" }
];

const GeneralSettings = () => {
    const [initialSettings, setInitialSettings] = useState(null);


    const [selectedFormat, setSelectedFormat] = useState("YYYY-MM-DD");
    const currentDate = dayjs();
    const [selectedTimezone, setSelectedTimezone] = useState("Asia/Colombo");
    const [selectedCurrency, setSelectedCurrency] = useState("LKR");
    const [selectedLogoutTime, setSelectedLogoutTime] = useState("");
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    const { data, error, isLoading, refetch } = useGetGeneralSettingsQuery({ user_id, role_id }, {
        skip: !user_id || !role_id
    });
    const [updateGeneralSettings, { data: dataUpdate, error: errorUpdate, isLoading: isLoadingUpdate }] = useUpdateGeneralSettingsMutation();
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


    // Prevent double fetching in Strict Mode


    useEffect(() => {
    if (data?.settings) {
        const newSettings = {
            date_format: data.settings.date_format || "YYYY-MM-DD",
            timezone: data.settings.timezone || "Asia/Colombo",
            default_currency: data.settings.default_currency || "LKR",
            auto_logout_time: data.settings.auto_logout_time || "",
        };

        setSelectedFormat(newSettings.date_format);
        setSelectedTimezone(newSettings.timezone);
        setSelectedCurrency(newSettings.default_currency);
        setSelectedLogoutTime(newSettings.auto_logout_time);

        setInitialSettings(JSON.stringify(newSettings)); // Save for later comparison
    }
}, [data]);

const currentSettings = JSON.stringify({
    date_format: selectedFormat,
    timezone: selectedTimezone,
    default_currency: selectedCurrency,
    auto_logout_time: selectedLogoutTime,
});

const hasChanges = currentSettings !== initialSettings;


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

    // Function to update settings

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
                timezone: selectedTimezone,
                date_format: selectedFormat,
                default_currency: selectedCurrency,
                auto_logout_time: selectedLogoutTime,
            }).unwrap();

            console.log("Settings updated successfully:", response);

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "General settings updated successfully",
                timer: 2000, // Auto-close after 2 seconds
                showConfirmButton: false,
            });
setInitialSettings(currentSettings); // Reset initial snapshot after save

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






    return <ComponentContainerCard title="General Settings">
        <form>
            <Row>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="timezoneSelect">Default Timezone</FormLabel>
                        <FormSelect
                            id="timezoneSelect"
                            onChange={(e) => setSelectedTimezone(e.target.value)}
                            value={selectedTimezone}
                        >
                            {timezones.map((tz) => (
                                <option key={tz} value={tz}>
                                    {tz}
                                </option>
                            ))}
                        </FormSelect>
                        {/* <p className="mt-2">Current Time: {dayjs().tz(selectedTimezone).format("YYYY-MM-DD HH:mm:ss")}</p> */}
                    </div>
                </Col>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="dateFormatSelect">Date Format</FormLabel>
                        <FormSelect
                            id="dateFormatSelect"
                            onChange={(e) => setSelectedFormat(e.target.value)}
                            value={selectedFormat}
                        >
                            {dateFormats.map((format) => (
                                <option key={format.value} value={format.value}>
                                    {format.label}
                                </option>
                            ))}
                        </FormSelect>
                        {/* <p className="mt-2">Formatted Date: {currentDate.format(selectedFormat)}</p> */}
                    </div>
                </Col>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="currencySelect">Currency</FormLabel>
                        <FormSelect
                            id="currencySelect"
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            value={selectedCurrency}
                        >
                            {currencies.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.label}
                                </option>
                            ))}
                        </FormSelect>
                        {/* <p className="mt-2">Selected Currency: {selectedCurrency}</p> */}
                    </div>
                </Col>
            </Row>
            <Row>
                <Col md={4}>
                    <div className="mb-3">
                        <FormLabel htmlFor="autoLogoutSelect">Auto Logout Time</FormLabel>
                        <FormSelect
                            id="autoLogoutSelect"
                            onChange={(e) => setSelectedLogoutTime(e.target.value)} // ✅ Updates state on change
                            value={selectedLogoutTime} // ✅ Dynamically set from API response
                        >
                            {logoutOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </FormSelect>


                    </div>
                </Col>
            </Row>
            <Row>
                <Col sm={12} className="text-end">

                   <Button
  variant="primary"
  onClick={handleUpdateSettings}
  disabled={isLoadingUpdate || !hasChanges}
>
  <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
  {isLoadingUpdate ? "Saving..." : "Save"}
</Button>

                </Col>
            </Row>
        </form>
    </ComponentContainerCard>;
};

export default GeneralSettings;