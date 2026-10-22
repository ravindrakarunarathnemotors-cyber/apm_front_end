// src/hoc/withAuthorization.js
'use client'

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "react-bootstrap";

// Create a context for privileges
const PrivilegesContext = createContext({ privileges: [], loading: true });

export const usePrivileges = () => useContext(PrivilegesContext);

const withAuthorization = (WrappedComponent) => {
    const WithAuthorization = (props) => {
        const [loading, setLoading] = useState(true);
        const [privileges, setPrivileges] = useState([]);
        const router = useRouter();
        const pathname = usePathname();

        const logoutUser = () => {
            // Clear non-sensitive data
            sessionStorage.clear();
            localStorage.clear();
            
            // Call logout API to clear cookies
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            }).catch(console.error);
            
            window.location.href = "/auth/login";
        };

        useEffect(() => {
            const checkPrivileges = async () => {
                // ✅ Check if user is logged in using sessionStorage (non-sensitive data)
                const userId = sessionStorage.getItem("user_id");
                
                if (!userId) {
                    console.log("No user found, redirecting to login");
                    setLoading(false);
                    router.push("/auth/login");
                    return;
                }

                try {
                    setLoading(true);

                    // ✅ Use credentials: 'include' to send cookies automatically
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/privileges`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                            // ✅ No Authorization header needed - cookies handle it
                        },
                        credentials: 'include', // ✅ Important: Send cookies
                        body: JSON.stringify({
                            path: pathname
                        })
                    });

                    // ✅ Handle 401 Unauthorized (token expired)
                    if (response.status === 401) {
                        console.log("Token expired, attempting refresh...");
                        
                        // Try to refresh token (cookies handle this automatically)
                        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/refresh-token`, {
                            method: 'POST',
                            credentials: 'include'
                        });

                        if (refreshResponse.ok) {
                            // Refresh successful, retry privileges check
                            console.log("Token refreshed, retrying...");
                            return checkPrivileges();
                        } else {
                            console.log("Refresh failed, logging out");
                            logoutUser();
                            return;
                        }
                    }

                    // Handle 403 Forbidden
                    if (response.status === 403) {
                        console.warn("Access forbidden for:", pathname);
                        router.push("/unauthorized");
                        return;
                    }

                    // Handle other errors
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (response.status === 200) {
                        const userPrivileges = data.privileges || [];
                        console.log("Fetched privileges:", userPrivileges);
                        setPrivileges(userPrivileges);
                        
                        // Store privileges in localStorage for quick access (not sensitive)
                        localStorage.setItem('user_privileges', JSON.stringify(userPrivileges));

                        // Check if user has access to this path
                        const isAuthorized = userPrivileges.includes(pathname);
                        if (!isAuthorized) {
                            console.warn("Access denied for:", pathname);
                            router.push("/unauthorized");
                        }
                    } else {
                        router.push("/unauthorized");
                    }
                } catch (error) {
                    console.error("Error fetching privileges:", error);
                    router.push("/unauthorized");
                } finally {
                    setLoading(false);
                }
            };

            checkPrivileges();
        }, [pathname, router]);

        if (loading) {
            return (
                <div className="d-flex justify-content-center my-4">
                    <Spinner animation="border" variant="primary" />
                </div>
            );
        }

        return (
            <PrivilegesContext.Provider value={{ privileges, loading: false }}>
                <WrappedComponent {...props} />
            </PrivilegesContext.Provider>
        );
    };

    WithAuthorization.displayName = `withAuthorization(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

    return WithAuthorization;
}

export default withAuthorization;
export { PrivilegesContext };