'use client'

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import avatar9 from '@/assets/images/users/avatar-9.jpg';
import Image from 'next/image';
import { useRefreshTokenMutation, useChangePasswordMutation, useUpdateProfilePictureMutation, useGetUserProfileQuery, useLazyGetUserProfileQuery } from '@/store/features/apiSlice'
import useLogout from '@/hooks/useLogout'
import { useForm } from 'react-hook-form'
import Swal from 'sweetalert2';
import withAuthorization from '@/hoc/withAuthorization'
import { FaUserCircle } from 'react-icons/fa';
// Premium Interface SVGs & Icons
const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const LockHeaderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const ChecklistCircle = ({ active }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#10b981" : "#94a3b8"} strokeWidth={active ? "3" : "2"} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', transition: 'all 0.2s' }}>
        {active ? (
            <>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </>
        ) : (
            <circle cx="12" cy="12" r="10" />
        )}
    </svg>
);

const ProfilePage = () => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [profilePicture, setProfilePicture] = useState(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [profileImageUrl, setProfileImageUrl] = useState(null)

    // Password visibility toggle states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [changePassword, { isLoading }] = useChangePasswordMutation();
    const [updateProfilePicture] = useUpdateProfilePictureMutation();
    const [getUserProfile] = useLazyGetUserProfileQuery();

    // Dynamic criteria validator states
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        uppercase: false,
        number: false,
        special: false
    });

    const [refreshtoken] = useRefreshTokenMutation()
    const { Logout } = useLogout()

    let token = ''
    if (typeof window !== 'undefined') {
        token = sessionStorage.getItem('access_token')
    }

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch
    } = useForm({
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            mobile: '',
        },
    })

    // Watch values to display real-time values on the left side profile summary card view
    const watchedFirstName = watch('first_name');
    const watchedLastName = watch('last_name');
    const watchedEmail = watch('email');
    const watchedMobile = watch('mobile');

    useEffect(() => {
        fetchUserProfile()
    }, [])

    // Real-time criteria checker engine
    useEffect(() => {
        setPasswordCriteria({
            length: newPassword.length >= 8,
            uppercase: /[A-Z]/.test(newPassword),
            number: /\d/.test(newPassword),
            special: /[^A-Za-z0-9]/.test(newPassword)
        });
    }, [newPassword]);

    const completedRulesCount = Object.values(passwordCriteria).filter(Boolean).length;

    const fetchUserProfile = async () => {
        try {
            const data = await getUserProfile().unwrap();

            setValue('first_name', data.result.first_name);
            setValue('last_name', data.result.last_name);
            setValue('email', data.result.email);
            setValue('mobile', data.result.mobile);

            if (data.result.profile_image) {
                setProfileImageUrl(data.result.profile_image);
            }
        } catch (error) {
            console.error(error);

            Swal.fire({
                title: 'Error',
                text: error?.data?.message || 'Failed to fetch profile data',
                icon: 'error',
            });
        }
    };

    const onSubmit = async (data) => {
        Swal.fire({
            title: 'Update Profile?',
            text: "Are you sure you want to update your profile?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/settings/update-user-details`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(data),
                    })

                    if (response.status === 403 || response.status === 401) {
                        const refreshToken = localStorage.getItem('refresh_token')
                        if (refreshToken) {
                            try {
                                const response = await refreshtoken(refreshToken).unwrap()
                                sessionStorage.setItem('access_token', response.access_token)
                                token = response.access_token
                                return onSubmit(data)
                            } catch (refreshError) {
                                console.error('Error refreshing token:', refreshError)
                                Logout()
                            }
                        }
                    }

                    if (response.status === 200) {
                        Swal.fire({ title: 'Profile Updated', text: 'Your profile has been updated successfully!', icon: 'success' })
                        fetchUserProfile()
                    } else {
                        const errorData = await response.json()
                        Swal.fire({ title: 'Error', text: errorData.message || 'Failed to update profile', icon: 'error' })
                    }
                } catch (error) {
                    console.log(error)
                    Swal.fire({ title: 'Error', text: 'An error occurred while updating profile', icon: 'error' })
                }
            }
        })
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({ title: 'Error', text: 'Please select a valid image file (JPEG, PNG, or GIF)', icon: 'error' })
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({ title: 'Error', text: 'File size should be less than 5MB', icon: 'error' })
                return;
            }
            setProfilePicture(file);
            const previewUrl = URL.createObjectURL(file);
            setProfileImageUrl(previewUrl);

            setTimeout(() => { uploadProfilePictureDirect(file); }, 100);
        }
    };

    const uploadProfilePictureDirect = async (selectedFile) => {
        const fileToUpload = selectedFile || profilePicture;
        if (!fileToUpload) return;

        setUploadingLogo(true);
        const formData = new FormData();
        formData.append("file", fileToUpload);

        try {
            const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`, {
                method: "POST",
                body: formData,
            });

            const uploadData = await uploadRes.json();

            if (uploadData.fileUrl) {
                const cleanUrl = uploadData.fileUrl.replace(
                    "https://i4i4.fra.idrivee2-52.com",
                    "https://d8y1.c2.e2-9.dev"
                );

                const result = await updateProfilePicture({
                    profile_image: cleanUrl,
                }).unwrap();

                if (updateRes.status === 200) {
                    Swal.fire({ title: 'Success', text: 'Profile picture updated successfully!', icon: 'success' })
                    setProfileImageUrl(result.profile_image || cleanUrl);
                    setProfilePicture(null);
                } else {
                    Swal.fire({ title: 'Error', text: result.message || 'Failed to update profile picture', icon: 'error' })
                }
            }
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            Swal.fire({
                title: 'Error',
                text: 'Please fill in all the fields',
                icon: 'error',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            Swal.fire({
                title: 'Error',
                text: 'New password and confirm password do not match',
                icon: 'error',
            });
            return;
        }

        try {
            const response = await changePassword({
                current_password: currentPassword,
                new_password: newPassword,
            }).unwrap();

            Swal.fire({
                title: 'Password Updated',
                text: response.message || 'Your password has been changed successfully!',
                icon: 'success',
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: error?.data?.message || 'Failed to update password',
                icon: 'error',
            });
        }
    };

    useEffect(() => {
        return () => {
            if (profileImageUrl && profileImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    return (
        <>
            <style>{`
                body {
                    background-color: #f3f4f6 !important;
                }
                .lux-layout-container {
                    padding: 2.5rem 1.5rem;
                }
                /* Left Column Profile Summary Dynamic Styling Card */
                .premium-summary-card {
                    background: #ffffff;
                    border: none;
                    border-radius: 20px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.02);
                    overflow: hidden;
                }
                .summary-card-hero {
                    background: linear-gradient(135deg, #b90606 0%, #5e0404 100%);
                    height: 150px;
                    position: relative;
                }
                .summary-status-badge {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: #10b981;
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 4px 12px;
                    border-radius: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .summary-avatar-outer-wrapper {
                    position: absolute;
                    bottom: -45px;
                    left: 50%;
                    transform: translateX(-50%);
                }
                .summary-avatar {
                    border: 4px solid #ffffff;
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    object-fit: cover;
                }
                .summary-cam-edit-badge {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    background: #4f46e5;
                    border: 2px solid #ffffff;
                    color: #ffffff;
                    border-radius: 50%;
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                    transition: transform 0.2s;
                }
                .summary-cam-edit-badge:hover {
                    transform: scale(1.08);
                }
                .summary-info-block {
                    margin-top: 55px;
                    padding: 20px;
                }
                .summary-name-label {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                    text-align: center;
                }
                .summary-role-pill-box {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #eef2ff;
                    color: #4f46e5;
                    font-weight: 600;
                    font-size: 13px;
                    padding: 6px 16px;
                    border-radius: 30px;
                    margin-top: 6px;
                }
                .summary-strips-group {
                    margin-top: 24px;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 16px;
                }
                .summary-info-strip-row {
                    display: flex;
                    align-items: center;
                    padding: 12px 14px;
                    background: #ffffff;
                    margin-bottom: 8px;
                    font-size: 14px;
                    color: #475569;
                }
                .summary-strip-icon-container {
                    width: 32px;
                    height: 32px;
                    background: #eff6ff;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 14px;
                    color: #2563eb;
                    flex-shrink: 0;
                }
                .summary-strip-text-field {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: 500;
                }
                /* Right Workspace Dashboard Card Styling Base */
                .lux-card {
                    background: #ffffff;
                    border: none;
                    border-radius: 20px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.01);
                    overflow: hidden;
                }
                .lux-card-header {
                    background: #ffffff;
                    border-bottom: none;
                    padding: 2rem 2rem 0.5rem 2rem;
                    display: flex;
                    align-items: center;
                }
                .lux-icon-badge {
                    width: 44px;
                    height: 44px;
                    background: #1e3a8a;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 16px;
                }
                .lux-card-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }
                .lux-card-subtitle {
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 2px;
                }
                .lux-card-body {
                    padding: 2rem;
                }
                .lux-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 8px;
                }
                .lux-input {
                    font-size: 14px;
                    padding: 0.75rem 1rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    color: #334155;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .lux-input:focus {
                    border-color: #94a3b8;
                    box-shadow: none;
                }
                .lux-input-group {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .lux-input-group .lux-input {
                    padding-right: 2.75rem;
                    width: 100%;
                }
                .lux-eye-btn {
                    position: absolute;
                    right: 14px;
                    background: none;
                    border: none;
                    color: #94a3b8;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    z-index: 5;
                }
                .lux-eye-btn:hover {
                    color: #64748b;
                }
                .lux-requirements-box {
                    background: #f1f5f9;
                    border-radius: 14px;
                    padding: 1.5rem;
                    margin-top: 1.5rem;
                }
                .lux-req-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e3a8a;
                    margin-bottom: 14px;
                }
                .lux-req-item {
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    color: #94a3b8;
                    font-weight: 500;
                    transition: color 0.2s;
                }
                .lux-req-item.valid {
                    color: #10b981;
                }
                .lux-strength-container {
                    display: flex;
                    gap: 6px;
                    margin-top: 10px;
                }
                .lux-strength-bar {
                    height: 5px;
                    flex: 1;
                    background: #e2e8f0;
                    border-radius: 10px;
                    transition: background 0.3s ease;
                }
                .lux-strength-bar.active {
                    background: #10b981;
                }
                .lux-strength-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #10b981;
                    margin-top: 6px;
                    display: block;
                }
                .lux-btn-submit {
                    background: #94a3b8;
                    border: none;
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 600;
                    padding: 0.75rem 1.75rem;
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: opacity 0.2s;
                }
                .lux-btn-submit:hover {
                    opacity: 0.9;
                }
            `}</style>

            <Container fluid className="lux-layout-container" style={{ maxWidth: '1440px' }}>
                <Row className="g-4">
                    {/* Left Column Section Component: Dynamic Profile Visual Summary View */}
                    <Col lg={4}>
                        <Card className="premium-summary-card">
                            <div className="summary-card-hero">
                                <span className="summary-status-badge">Active</span>
                                <div className="summary-avatar-outer-wrapper">
                                    {profileImageUrl ? (
                                        <Image
                                            src={profileImageUrl}
                                            alt="Avatar frame"
                                            height={100}
                                            width={100}
                                            className="summary-avatar"
                                        />
                                    ) : (
                                        <FaUserCircle
                                            size={100}
                                            className="summary-avatar"
                                            style={{
                                                color: '#cbd5e1',
                                                background: '#ffffff',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    )}
                                    <label htmlFor="summary-avatar-file-input" className="summary-cam-edit-badge">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </label>
                                    <input
                                        type="file"
                                        id="summary-avatar-file-input"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                    />
                                </div>
                            </div>

                            <div className="summary-info-block text-center">
                                <h4 className="summary-name-label">
                                    {watchedFirstName || watchedLastName ? `${watchedFirstName} ${watchedLastName}` : 'admin devadmin'}
                                </h4>
                                <div className="summary-role-pill-box">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                    Super Admin
                                </div>

                                <div className="summary-strips-group text-start">
                                    <div className="summary-info-strip-row">
                                        <div className="summary-strip-icon-container">
                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="summary-strip-text-field">{watchedEmail || 'admin@example.com'}</div>
                                    </div>



                                    <div className="summary-info-strip-row">
                                        <div className="summary-strip-icon-container">
                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="summary-strip-text-field">{watchedMobile || '94752822982'}</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* Right Column Section Component: Password Modification Form Workspace Container Panel */}
                    <Col lg={8}>
                        <Card className="lux-card">
                            <div className="lux-card-header">
                                <div className="lux-icon-badge">
                                    <LockHeaderIcon />
                                </div>
                                <div>
                                    <h3 className="lux-card-title">Change Password</h3>
                                    <div className="lux-card-subtitle">Choose a strong password to protect your account</div>
                                </div>
                            </div>
                            <Card.Body className="lux-card-body">
                                <Form onSubmit={handlePasswordChange}>
                                    <Row className="g-3 mb-3">
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="lux-label">Current Password</Form.Label>
                                                <div className="lux-input-group">
                                                    <Form.Control
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        className="lux-input"
                                                        placeholder="Enter current password"
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                    />
                                                    <button type="button" className="lux-eye-btn" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                                        <EyeIcon />
                                                    </button>
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="lux-label">New Password</Form.Label>
                                                <div className="lux-input-group">
                                                    <Form.Control
                                                        type={showNewPassword ? "text" : "password"}
                                                        className="lux-input"
                                                        placeholder="Enter new password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                    />
                                                    <button type="button" className="lux-eye-btn" onClick={() => setShowNewPassword(!showNewPassword)}>
                                                        <EyeIcon />
                                                    </button>
                                                </div>

                                                {/* Live Strength Segment Indicator Bars */}
                                                {newPassword && (
                                                    <>
                                                        <div className="lux-strength-container">
                                                            <div className={`lux-strength-bar ${completedRulesCount >= 1 ? 'active' : ''}`}></div>
                                                            <div className={`lux-strength-bar ${completedRulesCount >= 2 ? 'active' : ''}`}></div>
                                                            <div className={`lux-strength-bar ${completedRulesCount >= 3 ? 'active' : ''}`}></div>
                                                            <div className={`lux-strength-bar ${completedRulesCount === 4 ? 'active' : ''}`}></div>
                                                        </div>
                                                        {completedRulesCount === 4 && <span className="lux-strength-label">Strong</span>}
                                                    </>
                                                )}
                                            </Form.Group>
                                        </Col>

                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="lux-label">Confirm Password</Form.Label>
                                                <div className="lux-input-group">
                                                    <Form.Control
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        className="lux-input"
                                                        placeholder="Repeat new password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                    />
                                                    <button type="button" className="lux-eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                        <EyeIcon />
                                                    </button>
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Security Validation Requirements Checklist Panel Container */}
                                    <div className="lux-requirements-box">
                                        <div className="lux-req-title">Password requirements:</div>
                                        <Row className="g-2">
                                            <Col sm={6}>
                                                <div className={`lux-req-item ${passwordCriteria.length ? 'valid' : ''}`}>
                                                    <ChecklistCircle active={passwordCriteria.length} /> At least 8 characters
                                                </div>
                                            </Col>
                                            <Col sm={6}>
                                                <div className={`lux-req-item ${passwordCriteria.uppercase ? 'valid' : ''}`}>
                                                    <ChecklistCircle active={passwordCriteria.uppercase} /> One uppercase letter
                                                </div>
                                            </Col>
                                            <Col sm={6}>
                                                <div className={`lux-req-item ${passwordCriteria.number ? 'valid' : ''}`}>
                                                    <ChecklistCircle active={passwordCriteria.number} /> One number
                                                </div>
                                            </Col>
                                            <Col sm={6}>
                                                <div className={`lux-req-item ${passwordCriteria.special ? 'valid' : ''}`}>
                                                    <ChecklistCircle active={passwordCriteria.special} /> One special character
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>

                                    <div className="d-flex justify-content-end mt-4">
                                        <button className="lux-btn-submit" type="submit">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: 'translateY(-1px)' }}>
                                                <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                                            </svg>
                                            Update Password
                                        </button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default withAuthorization(ProfilePage);