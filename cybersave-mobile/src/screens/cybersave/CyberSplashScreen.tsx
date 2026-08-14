import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const logo = require('../../assets/cybersave/logo.png');

const DESIGN_WIDTH = 402;
const DESIGN_HEIGHT = 874;

const scaleFromDesign = (screenWidth: number, value: number) => (screenWidth / DESIGN_WIDTH) * value;

export const CyberSplashScreen = ({ navigation }: any) => {
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => navigation.replace('Onboarding1'), 2300);
    return () => clearTimeout(timer);
  }, [fade, navigation, scale, translateY]);

  const logoSize = Math.min(scaleFromDesign(width, 210), height * 0.255);
  const logoTop = height * (274 / DESIGN_HEIGHT);
  const copyTop = height * (462 / DESIGN_HEIGHT);
  const pillWidth = Math.min(scaleFromDesign(width, 166), width - 96);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="splashGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.24" stopColor="#EEF3FB" />
            <Stop offset="0.43" stopColor="#A9BBDD" />
            <Stop offset="0.62" stopColor="#315A9F" />
            <Stop offset="1" stopColor="#01236D" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#splashGradient)" />
      </Svg>

      <Animated.View
        style={[
          styles.logoWrap,
          {
            top: logoTop,
            opacity: fade,
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        <Image source={logo} resizeMode="contain" style={{ width: logoSize, height: logoSize }} />
      </Animated.View>

      <Animated.View
        style={[
          styles.copyWrap,
          {
            top: copyTop,
            opacity: fade,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.title}>All Government Services, One App</Text>
        <Text style={styles.subtitle}>Ministry of Electronics &amp; IT Initiative</Text>
        <View style={[styles.digitalIndiaPill, { width: pillWidth }]}>
          <View style={[styles.flagMark, styles.saffron]} />
          <View style={[styles.flagMark, styles.white]} />
          <View style={[styles.flagMark, styles.green]} />
          <Text style={styles.digitalIndiaText}>DIGITAL INDIA</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#01236D',
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  copyWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    marginBottom:70,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 9,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0,
  },
  digitalIndiaPill: {
    marginTop: 28,
    height: 31,
    borderRadius: 16,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  flagMark: {
    width: 10,
    height: 3,
    borderRadius: 2,
    marginRight: 7,
  },
  saffron: { backgroundColor: '#FF9933' },
  white: { backgroundColor: '#FFFFFF' },
  green: { backgroundColor: '#138808', marginRight: 12 },
  digitalIndiaText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
});

