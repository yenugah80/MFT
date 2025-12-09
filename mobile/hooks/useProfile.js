import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { fetchUserProfile, saveProfileBasics } from "../services/profileAPI";

export function useProfile() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Use a ref to track if we've already attempted to load to prevent loops
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      if (!isLoaded || !isSignedIn || hasLoaded) return;
      
      try {
        setIsLoading(true);
        const token = await getToken();
        const data = await fetchUserProfile(token);
        
        if (isMounted) {
          if (data) {
            setProfile(data);
            setFormData(data.basics || {});
          } else {
            console.log("No profile found for user.");
            setProfile(null);
            setFormData({});
          }
          setHasLoaded(true);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load profile", err);
          setError(err);
          // Even on error, mark as loaded to prevent infinite retry loop
          setHasLoaded(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]); // Intentionally removed getToken and hasLoaded to prevent loops

  // Expose a manual reload function if needed
  const reloadProfile = useCallback(() => {
    setHasLoaded(false);
  }, []);

  function openEditModal() {
    if (profile?.basics) {
      setFormData(profile.basics);
    }
    setIsEditModalVisible(true);
  }

  function closeEditModal() {
    setIsEditModalVisible(false);
  }

  function updateFormField(field, value) {
    setFormData((p) => ({ ...p, [field]: value }));
  }

  async function saveProfile(data) {
    try {
      setIsUpdating(true);
      const token = await getToken();
      const updatedBasics = await saveProfileBasics(token, data);
      
      // Update local state
      setProfile(prev => ({ ...prev, basics: updatedBasics }));
      setFormData(updatedBasics);
      closeEditModal();
      return { success: true, data: updatedBasics };
    } catch (err) {
      console.error("Failed to save profile", err);
      return { success: false, error: err };
    } finally {
      setIsUpdating(false);
    }
  }

  return {
    profile,
    isLoading,
    error,
    isEditModalVisible,
    openEditModal,
    closeEditModal,
    formData,
    saveProfile,
    updateFormField,
    isUpdating,
    refetch: reloadProfile,
  };
}
