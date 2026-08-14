import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const onboardingShield = require('../../assets/cybersave/onboarding-secure-shield.png');
const onboardingPhone = require('../../assets/cybersave/onboarding-services-phone.png');
const onboardingVault = require('../../assets/cybersave/onboarding-safe-vault.png');

const screens = [
  {
    route: 'Onboarding1',
    title: 'Welcome to Cybersave',
    titlePrefix: 'Welcome to ',
    titleBrand: 'Cybersave',
    description: 'Access 500+ central and state government services securely from your phone.',
    image: onboardingShield,
    imageWidthRatio: 0.98,
    imageMaxWidth: 382,
    imageTopRatio: 0.082,
    imageAspectRatio: 1024 / 1536,
  },
  {
    route: 'Onboarding2',
    title: 'All Services in One Place',
    description: 'Aadhaar, PAN, Certificates, Bills, Banking & more. Safe digital storage for daily life.',
    image: onboardingPhone,
    imageWidthRatio: 0.88,
    imageMaxWidth: 350,
    imageTopRatio: 0.088,
    imageAspectRatio: 1024 / 1536,
  },
  {
    route: 'Onboarding3',
    title: 'Safe & Secure',
    description: 'Bank-grade encryption protects your documents and personal identity data.',
    image: onboardingVault,
    imageWidthRatio: 0.96,
    imageMaxWidth: 372,
    imageTopRatio: 0.086,
    imageAspectRatio: 1024 / 1536,
  },
];

type OnboardingItem = (typeof screens)[number];

const getScreenIndex = (routeName: string, fallbackStep?: number) => {
  if (typeof fallbackStep === 'number') {
    return Math.max(0, Math.min(fallbackStep, screens.length - 1));
  }

  const index = screens.findIndex(item => item.route === routeName);
  return index >= 0 ? index : 0;
};

const OnboardingDots = ({ activeIndex }: { activeIndex: number }) => (
  <View style={styles.dotsRow}>
    {screens.map((item, index) => (
      <View key={item.route} style={[styles.dot, activeIndex === index && styles.dotActive]} />
    ))}
  </View>
);

const OnboardingTitle = ({ item }: { item: OnboardingItem }) => {
  if (item.titleBrand) {
    return (
      <Text style={styles.title}>
        {item.titlePrefix}
        <Text style={styles.titleBrand}>{item.titleBrand}</Text>
      </Text>
    );
  }

  return <Text style={styles.title}>{item.title}</Text>;
};

const OnboardingPage = ({ item, width, height }: { item: OnboardingItem; width: number; height: number }) => {
  const imageMetrics = useMemo(() => {
    const imageWidth = Math.min(width * item.imageWidthRatio, item.imageMaxWidth);
    return {
      width: imageWidth,
      height: imageWidth * item.imageAspectRatio,
    };
  }, [item.imageAspectRatio, item.imageMaxWidth, item.imageWidthRatio, width]);

  return (
    <View style={[styles.page, { width }]}> 
      <View style={styles.header}>
        <OnboardingTitle item={item} />
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <View style={[styles.imageWrap, { marginTop: height * item.imageTopRatio, minHeight: height * 0.32 }]}> 
        <Image source={item.image} resizeMode="contain" style={imageMetrics} />
      </View>
    </View>
  );
};

export const CyberOnboardingScreen = ({ navigation, route }: any) => {
  const { width, height } = useWindowDimensions();
  const initialIndex = getScreenIndex(route.name, route.params?.step);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    });
  }, [initialIndex, width]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, translate]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(nextIndex, screens.length - 1)));
  };

  const onNext = () => {
    if (activeIndex >= screens.length - 1) {
      navigation.navigate('Language');
      return;
    }

    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };

  const onSkip = () => navigation.navigate('Language');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: translate }] }]}> 
        {activeIndex < screens.length - 1 ? (
          <TouchableOpacity style={styles.skipHit} activeOpacity={0.72} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipSpace} />
        )}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {screens.map(item => (
            <OnboardingPage key={item.route} item={item} width={width} height={height} />
          ))}
        </ScrollView>

        <View style={[styles.bottomBlock, { bottom: Math.max(64, height * 0.095) }]}> 
          <OnboardingDots activeIndex={activeIndex} />
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.86} onPress={onNext}>
            <Text style={styles.primaryButtonText}>{activeIndex === screens.length - 1 ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  skipHit: {
    position: 'absolute',
    top: 49,
    right: 22,
    zIndex: 3,
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  skipSpace: {
    position: 'absolute',
    top: 49,
    right: 22,
    width: 38,
    height: 32,
    zIndex: 3,
  },
  skipText: {
    color: '#1768FF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 86,
    alignItems: 'center',
  },
  title: {
    color: '#141B2D',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  titleBrand: {
    color: '#0642B7',
  },
  description: {
    marginTop: 12,
    maxWidth: 318,
    color: '#687792',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0,
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBlock: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  dotsRow: {
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DEE7F0',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 20,
    height: 6,
    backgroundColor: '#1768FF',
  },
  primaryButton: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1768FF',
    shadowColor: '#1E55C8',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
});


