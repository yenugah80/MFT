import { API_URL } from "../constants/api";
import { getToken } from "../utils/auth";

const BASE = `${API_URL}/profile/notifications`;

export async function fetchNotifications() {
  const token = await getToken();
  const res = await fetch(BASE, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load notification settings");
  return res.json();
}

export async function saveNotifications(settings) {
  const token = await getToken();
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notifications: settings }),
  });
  if (!res.ok) throw new Error("Failed to save notification settings");
  return res.json();
}
