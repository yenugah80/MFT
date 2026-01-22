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
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { useState } from "react";
import { authStyles } from "../../assets/styles/auth.styles";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { parseClerkError } from "../../utils/errors";
import VerifyEmail from "./verify-email";

const SignUpScreen = () => {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword)
      return Alert.alert("Error", "All fields are required.");

    if (password !== confirmPassword)
      return Alert.alert("Error", "Passwords do not match.");

    if (!isLoaded) return;

    setLoading(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      const message = parseClerkError(err);

      if (err?.errors?.[0]?.code === "form_identifier_exists") {
        return Alert.alert("Email Already Registered", "Please sign in instead.");
      }

      Alert.alert("Error", message);
      console.log("CLERK SIGN-UP ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification)
    return (
      <VerifyEmail 
        email={email} 
        firstName={firstName}
        lastName={lastName}
        onBack={() => setPendingVerification(false)} 
      />
    );

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={authStyles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/images/app-logo.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          <Text style={authStyles.brandName}>MyFoodTracker</Text>
          <Text style={authStyles.title}>Create Account</Text>

          <View style={authStyles.formContainer}>
            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="First Name"
                placeholderTextColor={COLORS.textLight}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Last Name"
                placeholderTextColor={COLORS.textLight}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={authStyles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>

            <View style={authStyles.inputContainer}>
              <TextInput
                style={authStyles.textInput}
                placeholder="Confirm password"
                placeholderTextColor={COLORS.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={authStyles.buttonText}>{loading ? "Creating Account..." : "Sign Up"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={authStyles.linkContainer} onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={authStyles.linkText}>
                Already have an account? <Text style={authStyles.link}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignUpScreen;
