import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const SignOutButton = () => {
  function handleSignOut() {
    // Placeholder sign out — replace with real signout logic.
    // For now simply log so the UI doesn't crash.
    console.log("Sign out pressed");
  }

  return (
    <TouchableOpacity onPress={handleSignOut} style={styles.btn}>
      <Text style={styles.text}>Sign out</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  text: { color: "#1f2937", fontWeight: "600" },
});

export default SignOutButton;
