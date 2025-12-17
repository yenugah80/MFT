import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

/**
 * This hook is intentionally SAFE for React Native / Expo.
 * No WebAudio, no window, no browser-only APIs.
 *
 * You can later replace the internals with Gemini streaming
 * without changing the Log screen.
 */

export function useLiveApi({ onDataReceived }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);

  const activeRef = useRef(false);

  /**
   * CONNECT
   * (Stub for now — safe on mobile)
   */
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Mark active session
      activeRef.current = true;

      /**
       * 🔒 IMPORTANT
       * We DO NOT start mic streams here yet.
       * This prevents Expo crashes.
       */
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      console.error("[useLiveApi] connect failed", err);
      setError("Failed to start live session");
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting]);

  /**
   * DISCONNECT
   */
  const disconnect = useCallback(() => {
    activeRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
    setVolume(0);
  }, []);

  /**
   * SIMULATED AI RESULT (DEV SAFE)
   * This lets your Log UI + backend work TODAY.
   */
  const simulateResult = useCallback(() => {
    if (!activeRef.current) return;

    const mockNutrition = {
      id: String(Date.now()),
      timestamp: Date.now(),
      foodName: "Grilled Chicken Bowl",
      calories: 520,
      protein: 42,
      carbs: 38,
      fat: 18,
      micros: {
        potassium: "620mg",
        iron: "3.1mg",
      },
      ingredients: [
        { name: "Chicken breast", amount: "150g" },
        { name: "Brown rice", amount: "1 cup" },
        { name: "Avocado", amount: "1/2" },
      ],
      healthScore: 82,
      summary: "High protein, balanced carbs, good fats.",
    };

    onDataReceived?.(mockNutrition);
  }, [onDataReceived]);

  /**
   * CLEANUP
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    volume,
    error,

    /**
     * DEV ONLY helper
     * Remove later when Gemini Live is wired
     */
    simulateResult,
  };
}
