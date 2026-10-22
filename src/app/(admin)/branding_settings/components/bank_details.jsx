import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, FormLabel, FormControl, Row } from 'react-bootstrap';
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
    useGetBankDetailsQuery,
    useUpdateBankDetailsMutation,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

const BankDetails = () => {
    // Fetch user details from sessionStorage
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    const { data, error, isLoading, refetch } = useGetBankDetailsQuery(
        { user_id, role_id }, { skip: !user_id || !role_id }
    );

    const [updateBankDetails, { isLoading: isLoadingUpdate }] = useUpdateBankDetailsMutation();
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

    // ✅ State for form fields (Only Bank Details)
    const [formData, setFormData] = useState({
        accountName: '',
        bankName: '',
        bankAddress: '',
        accountNumber: '',
        branchName: '',
        swiftCode: ''
    });

    // ✅ Load existing bank details into state
    useEffect(() => {
        if (data?.bank_details) {
            setFormData({
                accountName: data.bank_details.bank_account_name || '',
                bankName: data.bank_details.bank_name || '',
                bankAddress: data.bank_details.bank_address || '',
                accountNumber: data.bank_details.bank_account_number || '',
                branchName: data.bank_details.bank_branch_name || '',
                swiftCode: data.bank_details.bank_swift_code || ''
            });
        }
    }, [data]);

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ✅ Handle form submission to update bank details
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
            const response = await updateBankDetails({
                user_id,
                role_id,
                bankAccountName: formData.accountName,
                bankName: formData.bankName,
                bankAddress: formData.bankAddress,
                bankAccountNumber: formData.accountNumber,
                bankBranchName: formData.branchName,
                bankSwiftCode: formData.swiftCode
            }).unwrap();

            console.log("Bank details updated successfully:", response);

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "Bank details updated successfully",
                timer: 2000,
                showConfirmButton: false,
            });

        } catch (err) {
            console.error("Error updating bank details:", err);

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
        <ComponentContainerCard title="Bank Details">
            {isLoading ? <p>Loading...</p> : (
                <form onSubmit={handleUpdateSettings}>
                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="accountName">Account Name</FormLabel>
                                <FormControl
                                    type="text"
                                    id="accountName"
                                    name="accountName"
                                    placeholder="Enter Account Name"
                                    value={formData.accountName}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="bankName">Bank Name</FormLabel>
                                <FormControl
                                    type="text"
                                    id="bankName"
                                    name="bankName"
                                    placeholder="Enter Bank Name"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="bankAddress">Bank Address</FormLabel>
                                <FormControl
                                    type="text"
                                    id="bankAddress"
                                    name="bankAddress"
                                    placeholder="Enter Bank Address"
                                    value={formData.bankAddress}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="accountNumber">Account Number</FormLabel>
                                <FormControl
                                    type="text"
                                    id="accountNumber"
                                    name="accountNumber"
                                    placeholder="Enter Account Number"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="branchName">Branch Name</FormLabel>
                                <FormControl
                                    type="text"
                                    id="branchName"
                                    name="branchName"
                                    placeholder="Enter Branch Name"
                                    value={formData.branchName}
                                    onChange={handleChange}
                                />
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="mb-3">
                                <FormLabel htmlFor="swiftCode">SWIFT Code</FormLabel>
                                <FormControl
                                    type="text"
                                    id="swiftCode"
                                    name="swiftCode"
                                    placeholder="Enter SWIFT Code"
                                    value={formData.swiftCode}
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

export default BankDetails;
