'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import FallbackLoading from '../FallbackLoading';

const AuthProtectionWrapper = ({ children }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const userId = sessionStorage.getItem('user_id');

        if (!userId) {
            router.replace(`/auth/login?redirectTo=${pathname}`);
        } else {
            setIsChecking(false);
        }
    }, [router, pathname]);

    if (isChecking) {
        return <FallbackLoading />;
    }

    return <>{children}</>;
};

export default AuthProtectionWrapper;
