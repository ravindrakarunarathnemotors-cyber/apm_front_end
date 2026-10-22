'use client';

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button, Col, Form, FormControl, FormLabel, FormCheck, Row, Alert, Modal } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import Spinner from '@/components/Spinner';
import { useAddRoleMutation, useRefreshTokenMutation, useGetSidebarMenuItemsQuery, useUpdateRolePrivilegesMutation } from "@/store/features/apiSlice";

const EditRole = ({ setShowModal, selectedRole, showModal }) => {
    const [selectedIds, setSelectedIds] = useState([]); // array of IDs

  
    const { data: sidebar, isLoading: sidebarLoading, isError } = useGetSidebarMenuItemsQuery();
    const [refreshtoken] = useRefreshTokenMutation();
     const [updateRolePrivileges] = useUpdateRolePrivilegesMutation();

    const data = sidebar ? sidebar?.menuItems : []
    const other = sidebar ? sidebar?.otherResult : []
    console.log(data);

    useEffect(() => {
        if (showModal && Array.isArray(selectedRole?.privileges)) {
            const intArray = selectedRole.privileges.map((v) => Number(v))
            setSelectedIds(Array.from(new Set(intArray))); // dedupe just in case
        }
    }, [showModal, selectedRole]);



    // Quick lookup maps
    const maps = useMemo(() => {
        const byId = new Map();
        const parentOf = new Map(); // childId -> parentId
        const subtitlesByMain = new Map(); // mainId -> [subtitleIds]
        const childrenBySubtitle = new Map(); // subtitleId -> [childIds]

        const visit = (node, parent = null) => {
            byId.set(node.menu_id, node);
            if (parent) parentOf.set(node.menu_id, parent.menu_id);
            if (node.children?.length) {
                node.children.forEach((c) => visit(c, node));
            }
        };
        data.forEach((root) => visit(root));

        // Build level-specific maps
        data.forEach((main) => {
            const subs = (main.children || []).map((s) => s.menu_id);
            subtitlesByMain.set(main.menu_id, subs);
            (main.children || []).forEach((sub) => {
                const kids = (sub.children || []).map((c) => c.menu_id);
                childrenBySubtitle.set(sub.menu_id, kids);
            });
        });

        return { byId, parentOf, subtitlesByMain, childrenBySubtitle };
    }, [data]);

    const isSelected = (id) => selectedIds.includes(id);

    const addIds = (ids) =>
        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));

    const removeIds = (ids) =>
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));

    // Toggle MAIN: affects [main + its subtitles] only
    const onToggleMain = (mainId) => {
        const subs = maps.subtitlesByMain.get(mainId) || [];
        const bundle = [mainId, ...subs];

        const allOn = bundle.every(isSelected);
        if (allOn) {
            // turning OFF: remove main + its subtitles
            removeIds(bundle);
        } else {
            // turning ON: add main + its subtitles
            addIds(bundle);
        }
    };

    // Toggle SUBTITLE: when ON -> ensure main is in; when OFF -> maybe remove main if no other subs
    const onToggleSubtitle = (subtitleId) => {
        const mainId = maps.parentOf.get(subtitleId);
        if (!mainId) return;

        if (isSelected(subtitleId)) {
            // turning OFF
            removeIds([subtitleId]);
            const otherSubs = (maps.subtitlesByMain.get(mainId) || []).filter(
                (id) => id !== subtitleId
            );
            const otherOn = otherSubs.some(isSelected);
            if (!otherOn) {
                // no other subtitles selected -> remove main too
                removeIds([mainId]);
            }
        } else {
            // turning ON
            addIds([subtitleId, mainId]);
        }
    };

    // Toggle CHILD: independent (parents untouched)
    const onToggleChild = (childId) => {
        if (isSelected(childId)) removeIds([childId]);
        else addIds([childId]);
    };

    const handleToggle = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const logoutUser = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/auth/login"; // Redirect to login page
    };

    const savePrivileges = async () => {
        try {
            const updatedPrivileges = Array.from(selectedIds);
            await updateRolePrivileges({ roleId: selectedRole.id, privileges: updatedPrivileges }).unwrap();
            Swal.fire({ title: "Success!", text: "Privileges updated successfully", icon: "success", confirmButtonText: "OK" });
            setShowModal(false);
        } catch (error) {
            Swal.fire({ title: "Error", text: "Failed to update privileges", icon: "error", confirmButtonText: "OK" });
        }
    };

    console.log(selectedIds)


    if (sidebarLoading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <Spinner animation="border" variant="primary" />
        </div>
    )

    return (
        <div>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Privileges for {selectedRole?.role_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>


                        <FormLabel className="col-sm-4 col-form-label text-start fw-bold fs-5 text-primary mt-3">
                            Privileges
                        </FormLabel>


                        <div className="mb-3 border rounded p-2">
                            {other.map((item) => (
                                <label key={item.id} className="d-flex align-items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(item.id)}
                                        onChange={() => handleToggle(item.id)}
                                    />
                                    {item.name}
                                </label>
                            ))}
                        </div>

                        {data.map((main) => (
                            <div key={main.menu_id} className="mb-3 border rounded p-2">
                                {/* MAIN */}
                                <label className="fw-bold text-primary d-flex align-items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={isSelected(main.menu_id)}
                                        onChange={() => onToggleMain(main.menu_id)}
                                    />
                                    {main.name} (Main)
                                </label>

                                {/* SUBTITLES */}
                                <div className="ms-4 mt-2">
                                    {(main.children || []).map((sub) => (
                                        <div key={sub.menu_id} className="mb-2">
                                            <label className="d-flex align-items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected(sub.menu_id)}
                                                    onChange={() => onToggleSubtitle(sub.menu_id)}
                                                />
                                                {sub.name} (Subtitle)
                                            </label>

                                            {/* CHILDREN */}
                                            {(sub.children || []).length > 0 && (
                                                <div className="ms-4 mt-2">
                                                    {sub.children.map((child) => (
                                                        <label
                                                            key={child.menu_id}
                                                            className="d-flex align-items-center gap-2"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected(child.menu_id)}
                                                                onChange={() => onToggleChild(child.menu_id)}
                                                            />
                                                            {child.name} (Child)
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}


                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={savePrivileges}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default EditRole