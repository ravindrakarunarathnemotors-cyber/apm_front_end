"use client";

import { useState } from "react";
import ButtonNavigation from "./components/ButtonNavigation";
import AddUserForm from "./components/AddUserForm";
import AddRoleForm from "./components/AddRoleForm";
import UserList from "./components/UserList";
import RoleList from "./components/RoleList";
import withAuthorization from "@/hoc/withAuthorization";

const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState("add_user"); // default: Add User

  const renderContent = () => {
    switch (activeTab) {
      case "add_user":
        return <AddUserForm />;
      case "add_role":
        return <AddRoleForm />;
      case "user_list":
        return <UserList />;
      case "role_list":
        return <RoleList />;
      default:
        return <AddUserForm />;
    }
  };

  return (
    <>
      <ButtonNavigation active={activeTab} onChange={setActiveTab} />
      {renderContent()}
    </>
  );
};

export default withAuthorization(UserManagementPage);