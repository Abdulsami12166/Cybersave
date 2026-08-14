import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { storage } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

const BLUE = '#1768FF';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F4F7FB';

const languages = [
  { id: 'en', native: 'English', label: 'English' },
  { id: 'hi', native: '\u0939\u093F\u0928\u094D\u0926\u0940', label: 'Hindi' },
];

const Header = ({ title, subtitle }: any) => (
  <View style={styles.headerBlue}>
    <Text style={styles.headerTitle}>{title}</Text>
    {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
  </View>
);

const PrimaryButton = ({ title, onPress, style, loading }: any) => (
  <TouchableOpacity style={[styles.primaryButton, style]} onPress={onPress} activeOpacity={0.86} disabled={loading}>
    {loading ? (
      <ActivityIndicator color="#FFFFFF" size="small" />
    ) : (
      <Text style={styles.primaryButtonText}>{title}</Text>
    )}
  </TouchableOpacity>
);

export const LanguageScreen = ({ navigation }: any) => {
  const [selected, setSelected] = useState(() => storage.getString('language') || 'en');

  return (
    <SafeAreaView style={styles.lightContainer}>
      <StatusBar backgroundColor="#2443B7" barStyle="dark-content" />
      <Header title="Choose Your Language" />
      <View style={styles.languagePanel}>
        <View style={styles.languageGrid}>
          {languages.map(item => {
            const active = selected === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.languageOption, active && styles.languageOptionActive]}
                onPress={() => setSelected(item.id)}
                activeOpacity={0.82}
              >
                <View style={styles.languageCopy}>
                  <Text style={styles.languageNative} numberOfLines={1}>{item.native}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <PrimaryButton title="Continue" onPress={() => {
        storage.set('language', selected);
        navigation.navigate('Login');
      }} style={styles.fixedBottomButton} />
    </SafeAreaView>
  );
};

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleKeycloakLogin = async () => {
    setLoading(true);
    const success = await login();
    setLoading(false);
    if (success) {
      navigation.replace('Home');
    } else {
      Alert.alert('Login Failed', 'Authentication was cancelled or failed.');
    }
  };

  return (
    <SafeAreaView style={styles.lightContainer}>
      <StatusBar backgroundColor="#1768FF" barStyle="dark-content" />
      <Header title="Welcome Back" subtitle="Sign in to safely access your e-gov portal" />

      <View style={styles.loginCard}>
        <Text style={styles.authInfo}>
          Authentication is securely managed by National Identity Vault. You will be redirected to complete your SMS OTP verification.
        </Text>
        
        <PrimaryButton 
          title="Login with Phone / SMS OTP" 
          onPress={handleKeycloakLogin} 
          style={styles.sendOtpButton} 
          loading={loading} 
        />
      </View>
    </SafeAreaView>
  );
};

// ponytail: Removed OtpScreen and RegisterScreen as Keycloak handles these flows via the browser
export const RegisterScreen = LoginScreen;
export const OtpScreen = LoginScreen;

const styles = StyleSheet.create({
  lightContainer: { flex: 1, backgroundColor: BG },
  headerBlue: { height: 130, backgroundColor: BLUE, paddingTop: 45, paddingHorizontal: 22 },
  headerTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '800', textAlign: 'center' },
  headerSubtitle: { marginTop: 4, color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 17, fontWeight: '500', textAlign: 'center' },
  languagePanel: { position: 'absolute', left: 15, right: 15, top: 108, minHeight: 200, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 14, shadowColor: '#9CA8B8', shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  languageOption: { width: '48%', height: 54, borderRadius: 15, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', paddingLeft: 11, paddingRight: 9, marginBottom: 10 },
  languageOptionActive: { borderColor: BLUE, borderWidth: 2 },
  languageCopy: { flex: 1, minWidth: 0 },
  languageNative: { color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  radioActive: { backgroundColor: BLUE, borderColor: BLUE },
  fixedBottomButton: { position: 'absolute', left: 15, right: 15, bottom: 46 },
  primaryButton: { height: 47, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE, shadowColor: '#1E55C8', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 14, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  loginCard: { position: 'absolute', left: 17, right: 17, top: 115, borderRadius: 15, backgroundColor: '#FFFFFF', padding: 19, shadowColor: '#9CA8B8', shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  authInfo: { color: MUTED, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  sendOtpButton: { marginTop: 6 },
});
