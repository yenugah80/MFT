import React from "react";
import { View, Text, StyleSheet } from "react-native";

const PostsList = ({ username }) => {
  // Minimal placeholder. Replace with real posts rendering.
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {username ? `No posts yet for ${username}` : "No posts to show"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  text: { color: "#374151" },
});

export default PostsList;
