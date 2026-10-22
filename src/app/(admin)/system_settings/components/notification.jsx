import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, FormLabel, FormCheck, Row, FormControl, Alert, Spinner } from 'react-bootstrap';
import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from "@iconify/react";
import {
    useUpdateSMSNotificationMutation,
    useGetSMSNotificationQuery,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

// ---------- Helpers ----------
// Find duplicates. keyFn lets us do case-insensitive checks for emails
const findDuplicates = (list, keyFn = (v) => v) => {
    const seen = new Set();
    const dups = new Set();
    for (const v of list) {
        const key = keyFn(v);
        if (seen.has(key)) dups.add(v);
        else seen.add(key);
    }
    return Array.from(dups);
};


const sanitizeCommaList = (v = '') =>
    v.replace(/\s+/g, '')           // remove spaces
        .replace(/,+/g, ',')           // collapse multiple commas
        .replace(/^,|,$/g, '');        // trim edge commas

const splitCommaList = (v = '') =>
    sanitizeCommaList(v).split(',').filter(Boolean);

// Strict mobile format: 94 + 9 digits (total 11)
const slMobileStrictRegex = /^94\d{9}$/;

// Normalize to 94XXXXXXXXX from common inputs
const normalizeTo94 = (raw = '') => {
    if (!raw) return '';
    if (raw.startsWith('+94')) return '94' + raw.slice(3);
    if (raw.startsWith('0') && raw.length === 10) return '94' + raw.slice(1);
    return raw;
};

const limitTo10 = (list) => Array.isArray(list) ? list.slice(0, 10) : [];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Notification = () => {
    const [initialSettings, setInitialSettings] = useState(null);

    // session
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    // queries
    const { data, isLoading, refetch } = useGetSMSNotificationQuery(
        { user_id, role_id },
        { skip: !user_id || !role_id }
    );

    // mutations
    const [updateSmsSettings] = useUpdateSMSNotificationMutation();
    const [refreshToken] = useRefreshTokenMutation();

    // toggles
    const [registerSMS, setRegisterSMS] = useState(true);
    const [registerEmail, setRegisterEmail] = useState(true);
    const [activationSMS, setActivationSMS] = useState(true);
    const [activationEmail, setActivationEmail] = useState(true);

    // Admin Alert toggles + lists
    const [adminSmsEnabled, setAdminSmsEnabled] = useState(false);
    const [adminEmailEnabled, setAdminEmailEnabled] = useState(false);
    const [adminMobiles, setAdminMobiles] = useState(''); // comma-separated
    const [adminEmails, setAdminEmails] = useState('');   // comma-separated

    // errors
    const [mobileErrors, setMobileErrors] = useState([]);
    const [emailErrors, setEmailErrors] = useState([]);
    const [mobileCountError, setMobileCountError] = useState(false);
    const [emailCountError, setEmailCountError] = useState(false);

    const [isLoadingUpdate, setIsLoadingUpdate] = useState(false);

    const [mobileDupes, setMobileDupes] = useState([]);
    const [emailDupes, setEmailDupes] = useState([]);


    // --------- Load from API ----------
    useEffect(() => {
        if (data?.settings) {
            const s = data.settings;
            const fetchedSettings = {
                registerSMS: s.registerSMS === "1",
                registerEmail: s.registerEmail === "1",
                activationSMS: s.activationSMS === "1",
                activationEmail: s.activationEmail === "1",
                adminSmsEnabled: s.adminSmsEnabled === "1",
                adminEmailEnabled: s.adminEmailEnabled === "1",
                adminMobiles: s.adminMobiles || "",
                adminEmails: s.adminEmails || ""
            };

            setRegisterSMS(fetchedSettings.registerSMS);
            setRegisterEmail(fetchedSettings.registerEmail);
            setActivationSMS(fetchedSettings.activationSMS);
            setActivationEmail(fetchedSettings.activationEmail);

            setAdminSmsEnabled(fetchedSettings.adminSmsEnabled);
            setAdminEmailEnabled(fetchedSettings.adminEmailEnabled);
            setAdminMobiles(sanitizeCommaList(fetchedSettings.adminMobiles));
            setAdminEmails(sanitizeCommaList(fetchedSettings.adminEmails));

            setInitialSettings(fetchedSettings);
        }
    }, [data]);

    // --------- Validation ----------
    const validateMobiles = (raw) => {
        let list = splitCommaList(raw).map(normalizeTo94);

        // duplicates (exact match after normalization)
        const dups = findDuplicates(list);
        setMobileDupes(dups);

        setMobileCountError(list.length > 10);
        const bad = list.filter(num => !slMobileStrictRegex.test(num));
        setMobileErrors(bad);

        return bad.length === 0 && list.length <= 10 && dups.length === 0;
    };

    const validateEmails = (raw) => {
        const list = splitCommaList(raw);

        // duplicates (case-insensitive)
        const dups = findDuplicates(list, (v) => v.toLowerCase());
        setEmailDupes(dups);

        setEmailCountError(list.length > 10);
        const bad = list.filter(mail => !emailRegex.test(mail));
        setEmailErrors(bad);

        return bad.length === 0 && list.length <= 10 && dups.length === 0;
    };

    useEffect(() => {
        if (adminSmsEnabled) validateMobiles(adminMobiles);
        else { setMobileErrors([]); setMobileCountError(false); }
    }, [adminMobiles, adminSmsEnabled]);

    useEffect(() => {
        if (adminEmailEnabled) validateEmails(adminEmails);
        else { setEmailErrors([]); setEmailCountError(false); }
    }, [adminEmails, adminEmailEnabled]);

    // --------- Change detection ----------
    const hasChanges = useMemo(() => {
        if (!initialSettings) return false;
        return (
            registerSMS !== initialSettings.registerSMS ||
            registerEmail !== initialSettings.registerEmail ||
            activationSMS !== initialSettings.activationSMS ||
            activationEmail !== initialSettings.activationEmail ||
            adminSmsEnabled !== initialSettings.adminSmsEnabled ||
            adminEmailEnabled !== initialSettings.adminEmailEnabled ||
            sanitizeCommaList(adminMobiles) !== sanitizeCommaList(initialSettings.adminMobiles || '') ||
            sanitizeCommaList(adminEmails) !== sanitizeCommaList(initialSettings.adminEmails || '')
        );
    }, [
        initialSettings,
        registerSMS, registerEmail,
        activationSMS, activationEmail,
        adminSmsEnabled, adminEmailEnabled,
        adminMobiles, adminEmails
    ]);

    const hasErrors =
        (adminSmsEnabled && (mobileErrors.length > 0 || mobileCountError || mobileDupes.length > 0)) ||
        (adminEmailEnabled && (emailErrors.length > 0 || emailCountError || emailDupes.length > 0));


    // --------- Auth helpers ----------
    const logoutUser = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/auth/login';
    };

    const handleTokenRefresh = async () => {
        const refreshTokenStored = localStorage.getItem("refresh_token");
        if (!refreshTokenStored) {
            logoutUser();
            return false;
        }
        try {
            const response = await refreshToken(refreshTokenStored).unwrap();
            sessionStorage.setItem("access_token", response.access_token);
            refetch();
            return true;
        } catch {
            logoutUser();
            return false;
        }
    };

    // --------- Save ----------
    const handleUpdateSettings = async () => {
        if (hasErrors) return;

        // normalize & cap again
        const finalMobiles = limitTo10(splitCommaList(adminMobiles).map(normalizeTo94)).join(',');
        const finalEmails = limitTo10(splitCommaList(adminEmails)).join(',');

        setIsLoadingUpdate(true);
        try {
            await updateSmsSettings({
                user_id,
                role_id,
                registerSMS: registerSMS ? "1" : "0",
                registerEmail: registerEmail ? "1" : "0",
                activationSMS: activationSMS ? "1" : "0",
                activationEmail: activationEmail ? "1" : "0",
                adminSmsEnabled: adminSmsEnabled ? "1" : "0",
                adminEmailEnabled: adminEmailEnabled ? "1" : "0",
                adminMobiles: finalMobiles,
                adminEmails: finalEmails,
            }).unwrap();

            Swal.fire("Updated!", "Notification setting updated successfully", "success");
        } catch (err) {
            if (err?.status === 403 && err?.data?.message === "Access token expired") {
                const refreshed = await handleTokenRefresh();
                if (refreshed) return handleUpdateSettings();
                return;
            }
            Swal.fire("Error", err?.data?.message || "Something went wrong!", "error");
        } finally {
            setIsLoadingUpdate(false);
        }
    };

    // --------- UI ----------
    if (isLoading) {
        return (
            <ComponentContainerCard title="Notification">
                <div className="d-flex align-items-center gap-2">
                    <Spinner animation="border" size="sm" /> Loading...
                </div>
            </ComponentContainerCard>
        );
    }

    return (
        <ComponentContainerCard title="Notification">
            <form>
               

                {/* Admin Alert */}
                <Row className="pb-3 border-bottom mb-3">
                    <Col md={12}>
                        <h5 className="mb-3">Admin Alert</h5>

                        {/* Enable SMS */}
                        <Row className="align-items-center mb-2">
                            <Col xs={2}>
                                <FormLabel className="mb-0">Enable SMS</FormLabel>
                            </Col>
                            <Col xs="auto">
                                <FormCheck
                                    type="switch"
                                    id="adminAlertSmsEnabled"
                                    checked={adminSmsEnabled}
                                    onChange={() => setAdminSmsEnabled(v => !v)}
                                />
                            </Col>
                        </Row>


                        {/* Mobile input only when SMS is ON */}
                        {adminSmsEnabled && (
                            <div className="mb-3">
                                <FormLabel>Enter Mobile Number(s)</FormLabel>
                                <FormControl
                                    placeholder="Enter up to 10 mobile numbers (format: 94XXXXXXXXX), separated by commas"
                                    value={adminMobiles}
                                    onChange={(e) => setAdminMobiles(e.target.value)}
                                    onBlur={(e) => {
                                        const list = limitTo10(splitCommaList(e.target.value).map(normalizeTo94));
                                        const joined = list.join(',');
                                        setAdminMobiles(joined);
                                        validateMobiles(joined);
                                    }}
                                />
                                {(mobileErrors.length > 0 || mobileCountError || mobileDupes.length > 0) && (
                                    <Alert variant="warning" className="mt-2 py-2">
                                        {mobileCountError && <div>Maximum 10 mobile numbers allowed.</div>}
                                        {mobileDupes.length > 0 && (
                                            <div>Duplicate mobile(s) not allowed: {mobileDupes.join(', ')}</div>
                                        )}
                                        {mobileErrors.length > 0 && (
                                            <div>
                                                Invalid mobile(s): {mobileErrors.join(', ')}<br />
                                                Required format: <code>94XXXXXXXXX</code>
                                            </div>
                                        )}
                                    </Alert>
                                )}

                            </div>
                        )}

                        {/* Enable Email */}
                        <Row className="align-items-center mb-2">
                            <Col xs={2}>
                                <FormLabel className="mb-0">Enable Email</FormLabel>
                            </Col>
                            <Col xs={4}>
                                <FormCheck
                                    type="switch"
                                    id="adminAlertEmailEnabled"
                                    checked={adminEmailEnabled}
                                    onChange={() => setAdminEmailEnabled(v => !v)}
                                />
                            </Col>
                        </Row>


                        {/* Email input only when Email is ON */}
                        {adminEmailEnabled && (
                            <div className="mb-3">
                                <FormLabel>Enter Email Address(es)</FormLabel>
                                <FormControl
                                    placeholder="Enter up to 10 emails, separated by commas"
                                    value={adminEmails}
                                    onChange={(e) => setAdminEmails(e.target.value)}
                                    onBlur={(e) => {
                                        const list = limitTo10(splitCommaList(e.target.value));
                                        const joined = list.join(',');
                                        setAdminEmails(joined);
                                        validateEmails(joined);
                                    }}
                                />
                                {(emailErrors.length > 0 || emailCountError || emailDupes.length > 0) && (
                                    <Alert variant="warning" className="mt-2 py-2">
                                        {emailCountError && <div>Maximum 10 email addresses allowed.</div>}
                                        {emailDupes.length > 0 && (
                                            <div>Duplicate email(s) not allowed: {emailDupes.join(', ')}</div>
                                        )}
                                        {emailErrors.length > 0 && (
                                            <div>Invalid email(s): {emailErrors.join(', ')}</div>
                                        )}
                                    </Alert>
                                )}

                            </div>
                        )}

                        {(adminSmsEnabled || adminEmailEnabled) && (
                            <small className="text-muted d-block mt-2">
                                ⚠️ Do not use spaces between numbers or emails. Separate multiple entries only with commas.
                            </small>
                        )}
                    </Col>
                </Row>

                {/* Save Button */}
                <Row>
                    <Col sm={12} className="text-end">
                        <Button
                            variant="primary"
                            onClick={handleUpdateSettings}
                            disabled={isLoadingUpdate || !hasChanges || hasErrors}
                            className="px-3"
                        >
                            <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
                            {isLoadingUpdate ? "Saving..." : "Save"}
                        </Button>
                    </Col>
                </Row>
            </form>
        </ComponentContainerCard>
    );
};

export default Notification;
