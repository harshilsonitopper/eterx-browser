import { useState, useEffect } from 'react';

interface LocationState {
    coords: {
        latitude: number;
        longitude: number;
    } | null;
    city: string | null;
    error: string | null;
    loading: boolean;
}

export const useLocation = () => {
    const [location, setLocation] = useState<LocationState>({
        coords: null,
        city: null,
        error: null,
        loading: true
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, error: "Geolocation not supported", loading: false }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Optional: Reverse geocode here if using a real API (Google Maps, OpenStreetMap)
                // For now, we'll return coords and maybe a mock "City" or use an open API.
                // Let's try basic OpenStreetMap reverse geocoding if simple fetch is allowed.
                let city = "Unknown";
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    city = data.address.city || data.address.town || data.address.village || "Unknown Location";
                } catch (e) {
                    console.warn("Reverse geoding failed", e);
                }

                setLocation({
                    coords: { latitude, longitude },
                    city,
                    error: null,
                    loading: false
                });
            },
            (error) => {
                setLocation(prev => ({ ...prev, error: error.message, loading: false }));
            }
        );
    }, []);

    return location;
};
