"use client";

import { useEffect, useState } from "react";
import ButtonNavigation from "./components/ButtonNavigation";
import AddUserForm from "./components/AddUserForm";
import AddRoleForm from "./components/AddRoleForm";
import UserList from "./components/UserList";
import RoleList from "./components/RoleList";
import withAuthorization from "@/hoc/withAuthorization";

const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState("add_user"); // default: Add User
  const [isAdmin, setIsAdmin] = useState(false);          // roles are managed by the administrator only (the server checks it too)
  useEffect(() => { setIsAdmin(String(sessionStorage.getItem("role_id")) === "1"); }, []);

  // the two forms stay mounted (hidden) so a half-filled form is not lost when you look at a list; the lists are loaded fresh each time
  return (
    <>
      <ButtonNavigation active={activeTab} onChange={setActiveTab} isAdmin={isAdmin} />
      <div style={{ display: activeTab === "add_user" ? "block" : "none" }}><AddUserForm /></div>
      {isAdmin && <div style={{ display: activeTab === "add_role" ? "block" : "none" }}><AddRoleForm /></div>}
      {activeTab === "user_list" && <UserList />}
      {isAdmin && activeTab === "role_list" && <RoleList />}
    </>
  );
};

export default withAuthorization(UserManagementPage);