import { Button, Col, Row, Card, CardBody, Modal, Spinner } from 'react-bootstrap';
import React, { useState, useRef, useEffect } from "react";
import Image from 'next/image';
import { Icon } from "@iconify/react";
import axios from "axios";
import {
    useGetSystemImagesQuery,
    useUpdateSystemImagesMutation,
    useRefreshTokenMutation,
} from '@/store/features/apiSlice';
import Swal from 'sweetalert2';

const SystemImage = () => {
    const user_id = sessionStorage.getItem("user_id");
    const role_id = sessionStorage.getItem("role_id");

    const [images, setImages] = useState([
        { id: 1, name: "Company Logo", role: "image size", img: "" },
        { id: 2, name: "White Logo", role: "image size", img: "" },
        { id: 3, name: "Fav Icon", role: "image size", img: "" },
        { id: 4, name: "Admin Welcome", role: "image size", img: "" },
        { id: 5, name: "Client Welcome", role: "image size", img: "" },
        { id: 6, name: "Client Maintenance", role: "image size", img: "" },
        { id: 7, name: "Loading Image", role: "image size", img: "" }
    ]);

    const fileInputRefs = useRef({});
    const [loading, setLoading] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const [updateSystemImages, { isLoading: isUpdating }] = useUpdateSystemImagesMutation();
    const [refreshToken] = useRefreshTokenMutation();

    // ✅ Fetch system images
    const { data, error, isLoading, refetch } = useGetSystemImagesQuery(
        { user_id, role_id }, { skip: !user_id || !role_id }
    );

    // ✅ Logout User
    const logoutUser = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/auth/login';
    };

    // ✅ Handle Token Refresh
    const handleTokenRefresh = async () => {
        const refreshTokenStored = localStorage.getItem("refresh_token");
        if (!refreshTokenStored) {
            logoutUser();
            return false;
        }

        try {
            const response = await refreshToken(refreshTokenStored).unwrap();
            sessionStorage.setItem("access_token", response.access_token);
            return true;
        } catch {
            logoutUser();
            return false;
        }
    };

    // ✅ Fetch images from API & update state
    useEffect(() => {
        if (data && data.system_images) {
            setImages(prevImages =>
                prevImages.map(img => ({
                    ...img,
                    img: data.system_images[img.name] || img.img // ✅ Keep existing img if API value is missing
                }))
            );
        }
    }, [data]);




    // ✅ Handle API errors (Token Expiry)
    useEffect(() => {
        if (error?.status === 403 && error?.data?.message === "Access token expired") {
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
    }, [error, refetch]);

    // ✅ Handle Image Upload
    const handleImageUpload = async (event, id) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(id);
        const selectedImage = images.find(img => img.id === id);
        if (!selectedImage) {
            setLoading(null);
            return;
        }

        const date = new Date().toISOString().replace(/[-:.T]/g, "").slice(0, 14);
        const fileExtension = file.name.split('.').pop();
        const newFileName = `${date}-${selectedImage.name.replace(/\s+/g, "_")}.${fileExtension}`;

        const formData = new FormData();
        formData.append("file", file, newFileName);

        try {
            const response = await axios.post((`${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.fileUrl) {
                let uploadedImageUrl = response.data.fileUrl.replace(
                    "https://i4i4.fra.idrivee2-52.com",
                    "https://d8y1.c2.e2-9.dev"
                );

                setImages(prevImages =>
                    prevImages.map(img =>
                        img.id === id ? { ...img, img: uploadedImageUrl } : img
                    )
                );
            }
        } catch (error) {
            console.error("Upload error:", error.response?.data || error.message);
        } finally {
            setLoading(null);
        }
    };

    const triggerFileInput = (id) => {
        if (fileInputRefs.current[id]) {
            fileInputRefs.current[id].click();
        }
    };

    const handlePreview = (img) => {
        setPreviewImage(img);
        setShowModal(true);
    };

    // ✅ Handle API Call for Updating Images
    const handleUpdateSystemImages = async () => {
        if (!user_id || !role_id) {
            Swal.fire({
                title: "User Not Found",
                text: "Please log in again.",
                icon: "warning",
                confirmButtonText: "OK"
            }).then(() => logoutUser());
            return;
        }

        const imagesPayload = images.map(image => ({
            id: image.id,
            name: image.name,
            imageUrl: image.img
        }));

        try {
            await updateSystemImages({ user_id, role_id, images: imagesPayload }).unwrap();
            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "System images updated successfully",
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error("Error updating system images:", err);

            if (err?.status === 403 && err?.data?.message === "Access token expired") {
                const refreshed = await handleTokenRefresh();
                if (refreshed) {
                    await handleUpdateSystemImages(); // Retry update after token refresh
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
        <>
            <Row>
                {images.map((user) => (
                    <Col md={4} key={user.id}>
                        <Card>
                            <CardBody>
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <Image width={138} height={138} src={user.img} alt="avatar" className="img-thumbnail" />
                                    </div>
                                    <div className="flex-grow-1 ms-3 text-truncate">
                                        <h4 className="mb-1 fw-semibold">{user.name}</h4>
                                        <p className="text-muted mb-3 font-13">{user.role}</p>

                                        <div className="mt-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={(el) => (fileInputRefs.current[user.id] = el)}
                                                style={{ display: "none" }}
                                                onChange={(e) => handleImageUpload(e, user.id)}
                                            />
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => triggerFileInput(user.id)}
                                                className="me-2"
                                                disabled={loading === user.id}
                                            >
                                                {loading === user.id ? (
                                                    <Spinner animation="border" size="sm" className="me-1" />
                                                ) : (
                                                    <Icon icon="mdi:upload" width={16} height={16} className="me-1" />
                                                )}
                                                {loading === user.id ? "Upload" : "Upload"}
                                            </Button>
                                            <Button variant="info" size="sm" onClick={() => handlePreview(user.img)}>
                                                <Icon icon="mdi:eye" width={16} height={16} className="me-1" />
                                                Preview
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row>
                <Col sm={12} className="text-end">
                    <Button variant="primary" onClick={handleUpdateSystemImages} disabled={isUpdating}>
                        <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
                        {isUpdating ? "Saving..." : "Save"}
                    </Button>
                </Col>
            </Row>

            {/* Modal for Image Preview */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Image Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {previewImage ? (
                        <Image width={400} height={400} src={previewImage} alt="Preview" className="img-fluid rounded" />
                    ) : (
                        <p className="text-muted">No image to preview.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

        </>


    );
};

export default SystemImage;
