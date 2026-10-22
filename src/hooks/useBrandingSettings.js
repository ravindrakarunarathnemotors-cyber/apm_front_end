import { useEffect, useState, useCallback } from "react";

const useBrandingSettings = () => {
    const [settings, setSettings] = useState(() => {
        // Get initial state from localStorage if available
        if (typeof window !== "undefined") {
            const storedSettings = sessionStorage.getItem("brandingSettings");
            return storedSettings ? JSON.parse(storedSettings) : null;
        }
        return null;
    });

    const [loading, setLoading] = useState(!settings); // Load only if settings are not in localStorage
    const [error, setError] = useState(null);

    // Fetch function
    const fetchBrandingSettings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/branding/settings`);
            if (!response.ok) {
                throw new Error("Failed to fetch settings");
            }

            const data = await response.json();
            const localSettings = data.data;

            // Save settings in localStorage
            if (typeof window !== "undefined") {
                sessionStorage.setItem("brandingSettings", JSON.stringify(localSettings));
            }

            setSettings(localSettings); // Update state

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount only if localStorage doesn't have settings
    useEffect(() => {
        if (!settings) {
            fetchBrandingSettings();
        }
    }, [fetchBrandingSettings, settings]);

    return { settings, loading, error, refetch: fetchBrandingSettings };
};

export default useBrandingSettings;
