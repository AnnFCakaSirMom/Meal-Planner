import { useState, useCallback, useEffect } from 'react';

export const useWakeLock = () => {
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                const lock = await navigator.wakeLock.request('screen');
                setWakeLock(lock);
            } catch (err: any) {
                console.warn(`Wake Lock request failed: ${err.name}, ${err.message}`);
            }
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLock !== null) {
            try {
                await wakeLock.release();
                setWakeLock(null);
            } catch (err: any) {
                console.warn(`Wake Lock release failed: ${err.name}, ${err.message}`);
            }
        }
    }, [wakeLock]);

    // Handle visibility changes (e.g., switching tabs)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [wakeLock, requestWakeLock, releaseWakeLock]);

    return { requestWakeLock, releaseWakeLock };
};
