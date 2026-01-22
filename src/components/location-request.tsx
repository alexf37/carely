"use client";

import { MapPinIcon, Loader2Icon, XCircleIcon, CheckCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useState, useCallback, useEffect, useRef } from "react";

type LocationRequestProps = {
    reason: string;
    onLocationGranted: (coords: { latitude: number; longitude: number; city?: string }) => void;
    onLocationDenied: (error: string) => void;
    status?: "idle" | "requesting" | "granted" | "denied";
};

export function LocationRequest({
    reason,
    onLocationGranted,
    onLocationDenied,
    status = "idle",
}: LocationRequestProps) {
    const [internalStatus, setInternalStatus] = useState<"idle" | "requesting" | "granted" | "denied">(status);
    const [errorMessage, setErrorMessage] = useState<string>("");
    
    const onLocationGrantedRef = useRef(onLocationGranted);
    const onLocationDeniedRef = useRef(onLocationDenied);
    const hasRequestedRef = useRef(false);
    
    useEffect(() => {
        onLocationGrantedRef.current = onLocationGranted;
        onLocationDeniedRef.current = onLocationDenied;
    });

    const requestLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setInternalStatus("denied");
            setErrorMessage("Geolocation is not supported by your browser");
            onLocationDeniedRef.current("Geolocation is not supported by your browser");
            return;
        }

        setInternalStatus("requesting");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                let city: string | undefined;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
                    }
                } catch (e) {
                    console.log("[LocationRequest] Reverse geocoding failed:", e);
                }

                setInternalStatus("granted");
                onLocationGrantedRef.current({ latitude, longitude, city });
            },
            (error) => {
                setInternalStatus("denied");
                let message = "Unable to get your location";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = "Location permission denied";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = "Location unavailable";
                        break;
                    case error.TIMEOUT:
                        message = "Request timed out";
                        break;
                }
                setErrorMessage(message);
                onLocationDeniedRef.current(message);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    }, []);

    useEffect(() => {
        if (status === "idle" && !hasRequestedRef.current) {
            hasRequestedRef.current = true;
            requestLocation();
        }
    }, [status, requestLocation]);

    function getContent() {
        switch (internalStatus) {
            case "requesting":
                return {
                    icon: <Loader2Icon className="size-4 animate-spin" />,
                    text: "Getting your location...",
                    className: "text-muted-foreground",
                };
            case "granted":
                return {
                    icon: <CheckCircleIcon className="size-4 text-green-500" />,
                    text: "Location found",
                    className: "text-green-600 dark:text-green-400",
                };
            case "denied":
                return {
                    icon: <XCircleIcon className="size-4 text-destructive" />,
                    text: errorMessage,
                    className: "text-destructive",
                };
            default:
                return {
                    icon: <MapPinIcon className="size-4" />,
                    text: reason,
                    className: "text-muted-foreground",
                };
        }
    }

    const content = getContent();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={cn(
                "flex items-center gap-2 text-sm py-1",
                content.className
            )}
        >
            {content.icon}
            <span>{content.text}</span>
        </motion.div>
    );
}
