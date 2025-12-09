import { API_URL } from "../constants/api";

const BASE = `${API_URL}/activity-levels`;

export const getActivityLevels = async () => {
  const response = await fetch(BASE);
  if (!response.ok) throw new Error("Failed to load activity levels");
  return response.json();
};

export const createActivityLevel = async (payload) => {
  const response = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create activity level");
  return response.json();
};

export const updateActivityLevel = async (id, payload) => {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update activity level");
  return response.json();
};

export const deleteActivityLevel = async (id) => {
  const response = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete activity level");
  return response.json();
};
