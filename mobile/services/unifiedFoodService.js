// services/unifiedFoodService.js
import { API_URL } from "../constants/api";

export const UnifiedFoodService = {
  async analyzePlate(base64Image, token) {
    const res = await fetch(`${API_URL}/food/analyze-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to analyze image: ${res.status} ${text}`);
    }

    return res.json();
  },

  async searchByBarcode(barcode, token) {
    const res = await fetch(`${API_URL}/food/barcode/${encodeURIComponent(barcode)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to lookup barcode: ${res.status} ${text}`);
    }

    return res.json();
  },
};
