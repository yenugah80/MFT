// services/loggingService.js
import { API_URL } from "../constants/api";

export const LoggingService = {
  async logMeal(token, payload) {
    const res = await fetch(`${API_URL}/log/meal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to log meal: ${res.status} ${txt}`);
    }

    return res.json();
  },

  async logWater(token, amountLiters) {
    const res = await fetch(`${API_URL}/log/water`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amountLiters }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to log water: ${res.status} ${txt}`);
    }

    return res.json();
  },

  async logMood(token, { mood, note, source }) {
    const res = await fetch(`${API_URL}/log/mood`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mood, note, source }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to log mood: ${res.status} ${txt}`);
    }

    return res.json();
  },
};
