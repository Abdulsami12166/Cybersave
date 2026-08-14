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
  TextInput,
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

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

  const handleRegister = async () => {
    if (!form.email || !form.password) return Alert.alert('Error', 'Email and password required');
    setLoading(true);
    const success = await register(form.email, form.password, form.fullName);
    setLoading(false);
    if (success) {
      Alert.alert('Success', 'Registration complete. Please log in.');
      navigation.navigate('Login');
    } else {
      Alert.alert('Registration Failed', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.lightContainer}>
      <StatusBar backgroundColor="#1768FF" barStyle="dark-content" />
      <Header title="Create Account" subtitle="Join Cybersave Platform" />
      <View style={styles.loginCard}>
        <TextInput style={styles.input} placeholder="Full Name" value={form.fullName} onChangeText={t => setForm({ ...form, fullName: t })} />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={t => setForm({ ...form, email: t })} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={form.password} onChangeText={t => setForm({ ...form, password: t })} />
        <PrimaryButton title="Register" onPress={handleRegister} loading={loading} />
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Email and password required');
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigation.navigate('OTP', { email });
    } else {
      Alert.alert('Login Failed', 'Invalid credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.lightContainer}>
      <StatusBar backgroundColor="#1768FF" barStyle="dark-content" />
      <Header title="Welcome Back" subtitle="Sign in with Email and Password" />
      <View style={styles.loginCard}>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <PrimaryButton title="Login" onPress={handleLogin} loading={loading} />
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
          <Text style={styles.linkText}>New here? Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export const OtpScreen = ({ route, navigation }: any) => {
  const { verifyOtp, resendOtp } = useAuth();
  const { email } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');

  const handleVerify = async () => {
    if (!otp) return Alert.alert('Error', 'OTP required');
    setLoading(true);
    const success = await verifyOtp(email, otp);
    setLoading(false);
    if (success) {
      // AuthContext will update and navigate to Home automatically via RootNavigator
    } else {
      Alert.alert('Error', 'Invalid OTP.');
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const success = await resendOtp(email);
    setLoading(false);
    if (success) {
      Alert.alert('Success', 'OTP resent to your email.');
    } else {
      Alert.alert('Error', 'Failed to resend OTP.');
    }
  };

  return (
    <SafeAreaView style={styles.lightContainer}>
      <StatusBar backgroundColor="#1768FF" barStyle="dark-content" />
      <Header title="Verify OTP" subtitle={`Sent to ${email}`} />
      <View style={styles.loginCard}>
        <TextInput style={styles.input} placeholder="Enter 6-digit OTP" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />
        <PrimaryButton title="Verify OTP" onPress={handleVerify} loading={loading} />
        <TouchableOpacity onPress={handleResend} style={styles.linkButton} disabled={loading}>
          <Text style={styles.linkText}>Resend OTP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  input: { height: 48, backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, color: TEXT, borderColor: BORDER, borderWidth: 1 },
  linkButton: { marginTop: 15, alignItems: 'center' },
  linkText: { color: BLUE, fontSize: 13, fontWeight: '600' },
});
