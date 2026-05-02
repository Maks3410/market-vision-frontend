import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { refreshToken } from "../api/auth";
import { WS_BASE_URL } from "../api/config";

type CalculationEvent = {
    event: string;
    calculation?: {
        id: number;
        status: string;
        startDateTime: string;
        endDateTime: string | null;
        portfolioId: number;
    };
    error?: string;
};

type CalculationEventsContextValue = {
    isConnected: boolean;
    lastEvent: CalculationEvent | null;
};

const CalculationEventsContext = createContext<CalculationEventsContextValue>({
    isConnected: false,
    lastEvent: null,
});

export const CalculationEventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<CalculationEvent | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!localStorage.getItem("access_token")) {
            setIsConnected(false);
            setLastEvent(null);
            return;
        }

        let isDisposed = false;
        let socket: WebSocket | null = null;
        let isRefreshing = false;

        const scheduleReconnect = (delay = 2000) => {
            if (isDisposed) {
                return;
            }

            reconnectTimeoutRef.current = window.setTimeout(() => {
                void connect();
            }, delay);
        };

        const connect = async () => {
            const currentToken = localStorage.getItem("access_token");
            if (!currentToken) {
                setIsConnected(false);
                setLastEvent(null);
                return;
            }

            socket = new WebSocket(`${WS_BASE_URL}/ws/calculations/?token=${encodeURIComponent(currentToken)}`);

            socket.onopen = () => {
                if (!isDisposed) {
                    setIsConnected(true);
                }
            };

            socket.onmessage = (message) => {
                if (isDisposed) {
                    return;
                }

                try {
                    const parsed = JSON.parse(message.data) as CalculationEvent;
                    setLastEvent(parsed);
                } catch (error) {
                    console.error("Failed to parse calculation websocket event", error);
                }
            };

            socket.onclose = async (event) => {
                if (isDisposed) {
                    return;
                }

                setIsConnected(false);

                if ((event.code === 4401 || event.code === 1006) && !isRefreshing) {
                    isRefreshing = true;
                    try {
                        await refreshToken();
                    } catch (error) {
                        console.error("Failed to refresh websocket token", error);
                        setLastEvent(null);
                        return;
                    } finally {
                        isRefreshing = false;
                    }
                }

                scheduleReconnect();
            };

            socket.onerror = () => {
                socket?.close();
            };
        };

        void connect();

        return () => {
            isDisposed = true;
            setIsConnected(false);
            if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current);
            }
            socket?.close();
        };
    }, []);

    const contextValue = useMemo(
        () => ({
            isConnected,
            lastEvent,
        }),
        [isConnected, lastEvent],
    );

    return (
        <CalculationEventsContext.Provider value={contextValue}>
            {children}
        </CalculationEventsContext.Provider>
    );
};

export const useCalculationEvents = () => useContext(CalculationEventsContext);
