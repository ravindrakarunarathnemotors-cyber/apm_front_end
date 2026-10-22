'use client'

import { Suspense, useEffect, useState } from "react";
import FallbackLoading from "@/components/FallbackLoading";
import LogoBox from "@/components/LogoBox";
import SimplebarReactClient from "@/components/wrappers/SimplebarReactClient";
import AppMenu from "./components/AppMenu";
import { useGetSidebarMenuQuery, useRefreshTokenMutation } from "@/store/features/apiSlice";
import { usePathname } from 'next/navigation';

const VerticalNavigationBar = () => {
  const roleId = sessionStorage.getItem("role_id");
  const { data: menus , isLoading, error, isError, refetch } = useGetSidebarMenuQuery(roleId); // Fetch menu items
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [refreshtoken] = useRefreshTokenMutation();

 
  const menuItems = menus && menus.menu ? menus.menu : []
  const mainItems = menus && menus.main ? menus.main : []
  const pathname = usePathname();

  useEffect(() => {
    if (error?.status === 403 && error?.data?.message === "Access token expired") {
      handleTokenRefresh();
    }
    console.log("sidebar")
  }, [error]);

  useEffect(() => {
    if (pathname === '/dashboard' || pathname === '/welcome_to_client') {
      refetch();             // ignore cache → hit the server
    }
  }, [pathname]);

  const handleTokenRefresh = async () => {
    try {
      console.log("Access token expired. Attempting refresh...");
      const refreshTokenValue = localStorage.getItem("refresh_token");

      if (refreshTokenValue) {
        const response = await refreshtoken(refreshTokenValue).unwrap();
        sessionStorage.setItem("access_token", response.access_token);
        console.log("Token refreshed successfully. Retrying API request...");
        refetch(); // Retry fetching the sidebar menu
      } else {
        console.log("No refresh token found. Logging out...");
        logoutUser();
      }
    } catch (refreshError) {
      console.error("Error refreshing token:", refreshError);
      logoutUser();
    }
  };

  const logoutUser = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = "/auth/login"; // Redirect to login page
  };

  return (
<div 
  className="startbar d-print-none" 
  style={{ 
    background: 'linear-gradient(0deg, #8B0000 0%, #200505 40%, #0d0d0d 100%)',
    borderRight: '1px solid rgba(239, 68, 68, 0.25)',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.6)'
  }}
>      <div className="brand">
        <LogoBox />
      </div>
      <div className="startbar-menu">
        <SimplebarReactClient className="startbar-collapse" id="startbarCollapse">
          <div className="d-flex align-items-start flex-column w-100">
            {isLoading && <FallbackLoading />}

            {!isLoading && !isError && (
              <Suspense fallback={<FallbackLoading />}>
                <AppMenu menuItems={menuItems} mainItems={mainItems}/>
              </Suspense>
            )}
          </div>
        </SimplebarReactClient>
      </div>
    </div>
  );
};

export default VerticalNavigationBar;
