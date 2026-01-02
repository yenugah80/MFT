import { useSignUp, useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authStyles } from "../../assets/styles/auth.styles";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import { useRef } from "react";
import { saveProfileBasics } from "../../services/profileAPI";

const VerifyEmail = ({ email, firstName, lastName, onBack }) => {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const attemptedCodes = useRef(new Set());

  const handleVerification = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const sanitizedCode = (code || "").toString().trim();

      // Prevent re-using the same code multiple times (avoid "already been verified" errors)
      if (attemptedCodes.current.has(sanitizedCode)) {
        Alert.alert("Error", "This verification code has already been used. If you requested a new code, please enter the new one.");
        setLoading(false);
        return;
      }

      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code: sanitizedCode });

      // Safe logging helper for debugging objects that may contain circular refs
      const safeStringify = (obj) => {
        try {
          const seen = new WeakSet();
          return JSON.stringify(obj, (k, v) => {
            if (v && typeof v === "object") {
              if (seen.has(v)) return "[Circular]";
              seen.add(v);
            }
            return v;
          }, 2);
        } catch (e) {
          return String(obj);
        }
      };

      console.log("signUpAttempt:", signUpAttempt);

      if (signUpAttempt?.status === "complete") {
        // mark this code as consumed so we don't try it again
        attemptedCodes.current.add(sanitizedCode);
        await setActive({ session: signUpAttempt.createdSessionId });

        // Create profile in backend
        try {
          // Small delay to ensure session is propagated
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry getting token a few times if needed
          let token = await getToken();
          let retries = 3;
          while (!token && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            token = await getToken();
            retries--;
          }

          if (token) {
            await saveProfileBasics(token, {
              fullName: `${firstName} ${lastName}`.trim(),
              email: email
            });
            console.log("Profile created successfully in backend");

            // Clear any stale onboarding drafts for fresh start
            try {
              await AsyncStorage.removeItem('@onboarding_draft');
              await AsyncStorage.removeItem('@onboarding_current_step');
            } catch (storageErr) {
              console.warn("Could not clear onboarding draft:", storageErr);
            }

            // Redirect to onboarding flow
            router.replace("/onboarding/step-1");
          } else {
            console.warn("Could not get token to create backend profile after retries");
            Alert.alert("Profile Error", "Account created but failed to initialize profile. Please contact support.");
          }
        } catch (profileErr) {
          console.error("Failed to create backend profile:", profileErr);
          Alert.alert("Profile Error", "Account created but failed to save profile data.");
        }
      } else {
        const status = signUpAttempt?.status || "unknown";
        const serverMessage = signUpAttempt?.errors?.[0]?.message || signUpAttempt?.fullMessage || null;
        
        // Detailed debugging for missing requirements
        if (status === "missing_requirements") {
            console.error("Missing Requirements:", JSON.stringify({
                missingFields: signUpAttempt.missingFields,
                unverifiedFields: signUpAttempt.unverifiedFields,
            }, null, 2));
            
            Alert.alert(
                "Verification Incomplete", 
                `Please complete the following requirements: ${signUpAttempt.missingFields?.join(", ") || "Unknown requirements"}`
            );
        } else {
            Alert.alert(
              "Verification failed",
              serverMessage || `Verification did not complete (status: ${status}). Please try again.`
            );
        }
        
        const debug = safeStringify(signUpAttempt);
        console.error("signUpAttempt (debug):", debug);
      }
    } catch (err) {
      Alert.alert("Error", err?.errors?.[0]?.message || err?.message || "Verification failed");
      console.error("verifyEmailError", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Container */}
          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/styles/images/i3.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          {/* Title */}
          <Text style={authStyles.title}>Verify Your Email</Text>
          <Text style={authStyles.subtitle}>We&apos;ve sent a verification code to {email}</Text>

          <View style={authStyles.formContainer}>
            {/* Verification Code Input */}
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter verification code"
                placeholderTextColor={COLORS.textLight}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleVerification}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={authStyles.buttonText}>{loading ? "Verifying..." : "Verify Email"}</Text>
            </TouchableOpacity>

            {/* Back to Sign Up */}
            <TouchableOpacity style={authStyles.linkContainer} onPress={onBack}>
              <Text style={authStyles.linkText}>
                <Text style={authStyles.link}>Back to Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
export default VerifyEmail;