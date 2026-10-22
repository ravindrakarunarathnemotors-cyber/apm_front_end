// hooks/usePrivileges.js
import { useSelector } from 'react-redux';

export const usePrivileges = () => {
    const user = useSelector(state => state.auth?.user);
    const userPrivileges = user?.role?.privileges || [];

    console.log('User Privileges from Redux:', userPrivileges);

    const hasRoutePrivilege = (route) => {
        const has = userPrivileges.includes(route);
        console.log(`Checking route ${route}:`, has);
        return has;
    };

    return {
        hasRoutePrivilege,
        userPrivileges
    };
};