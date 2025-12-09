import React, { useRef, useEffect, useState } from "react";
import { View, Text, Animated, StyleSheet, Dimensions, ImageBackground, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

const Floating = ({ children, delay = 0, distance = 8, style }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });

  return <Animated.View style={[{ transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

export default function Wallpaper({
  mural = require("../assets/styles/images/mural_signup.png"),
  floatA = require("../assets/styles/images/float1.png"),
  floatB = require("../assets/styles/images/chef-3d.png"),
  showBlur = false,
  style,
  children,
}) {
  // Accept either a local module (require) or a URI string for each image.
  const muralSource = typeof mural === "string" ? { uri: mural } : mural;
  const floatASource = typeof floatA === "string" ? { uri: floatA } : floatA;
  const floatBSource = typeof floatB === "string" ? { uri: floatB } : floatB;

  return (
    <ImageBackground source={muralSource} style={[styles.background, style]} imageStyle={styles.image}>
      <LinearGradient colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]} style={StyleSheet.absoluteFill} />
      {showBlur && Platform.OS !== "web" && <BlurView intensity={20} style={StyleSheet.absoluteFill} />}

      <Floating delay={0} distance={6} style={styles.floatTopRight}>
        <Image source={floatASource} style={styles.floatA} />
      </Floating>

      <Floating delay={1200} distance={10} style={styles.floatBottomLeft}>
        <Image source={floatBSource} style={styles.floatB} />
      </Floating>

      {children}
    </ImageBackground>
  );
}

export function ZenMuralBackground({ children, tagline, style }) {
  return (
    <ImageBackground source={require("../assets/styles/images/mural_signup.png")} style={[styles.mural, style]} resizeMode="cover">
      <LinearGradient colors={["rgba(20,16,40,0.08)", "rgba(255,255,255,0.02)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.centerContent} pointerEvents="box-none">
        {children}
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
      </View>
    </ImageBackground>
  );
}

export function FlowingQuotesBanner({ quotes = [], interval = 4000 }) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(interval - 1200),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        setIndex((i) => (i + 1) % Math.max(1, quotes.length));
      });
    };

    animate();
    const id = setInterval(animate, interval);
    return () => clearInterval(id);
  }, [interval, quotes.length]);

  const current = quotes.length ? quotes[index % quotes.length] : "Welcome";

  return (
    <View style={styles.quotesWrap}>
      <LinearGradient colors={["#f6f2ff", "#eef6ff"]} style={styles.quotesBackground} />
      <Animated.Text style={[styles.quoteText, { opacity }]} numberOfLines={2}>
        {current}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    width: "100%",
    height: 360,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { resizeMode: "cover" },
  floatTopRight: { position: "absolute", top: 28, right: 18 },
  floatBottomLeft: { position: "absolute", bottom: 8, left: 18 },
  floatA: { width: 64, height: 64, opacity: 0.95 },
  floatB: { width: 74, height: 74, opacity: 0.95 },
  mural: { width: "100%", height: 300, justifyContent: "center" },
  centerContent: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  tagline: { color: "rgba(255,255,255,0.92)", marginTop: 12, fontSize: 14, textAlign: "center" },
  quotesWrap: { width: "100%", alignItems: "center", paddingVertical: 18, backgroundColor: "transparent" },
  quotesBackground: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0.9 },
  quoteText: { maxWidth: width - 80, textAlign: "center", fontSize: 16, color: "#2a2a2a", fontWeight: "600", paddingHorizontal: 20 },
});
