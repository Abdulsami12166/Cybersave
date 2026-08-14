import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { sendAadhaarOtpApi, verifyAadhaarOtpApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const BLUE = '#2F6BFF';
const BLUE_LIGHT = '#F4F7FB';
const TEXT = '#1E293B';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const GREEN = '#10B981';
const RED = '#EF4444';

export const AadhaarOkycScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [referenceId, setReferenceId] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [verifiedData, setVerifiedData] = useState<any>(null);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (aadhaarNumber.length !== 12) {
      return Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number.');
    }
    if (!consent) {
      return Alert.alert('Consent Required', 'You must provide consent to proceed with KYC.');
    }

    setLoading(true);
    const res = await sendAadhaarOtpApi(aadhaarNumber, 'Y');
    setLoading(false);

    if (res?.error) {
      Alert.alert('Request Failed', res.error);
    } else if (res?.success) {
      setReferenceId(res.data.referenceId);
      setStep(2);
      setCountdown(30);
    } else {
      Alert.alert('Error', 'Unable to process OTP request.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      return Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP received on your mobile.');
    }

    setLoading(true);
    const res = await verifyAadhaarOtpApi(referenceId, otp);
    setLoading(false);

    if (res?.error) {
      Alert.alert('Verification Failed', res.error);
    } else if (res?.success) {
      setVerifiedData(res.data.kyc);
      setStep(3); // Success step
    } else {
      Alert.alert('Error', 'Unable to verify OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtp('');
    await handleSendOtp();
  };

  const handleSaveToProfile = () => {
    Alert.alert('Download Complete', 'Your Aadhaar Card has been securely downloaded to your device storage.');
    navigation.navigate('ServiceHub');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor="#2F6BFF" barStyle="light-content" />
      <View style={{ height: 56, backgroundColor: '#2F6BFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="chevron-left" size={25} color="#fff" />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginRight: 40 }}>Verify Aadhaar</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-account-outline" size={32} color={BLUE} />
            </View>
            <Text style={styles.title}>Aadhaar Paperless KYC</Text>
            <Text style={styles.desc}>
              Verify your identity instantly using an OTP sent to your Aadhaar-linked mobile number.
            </Text>
            
            <Text style={styles.label}>12-Digit Aadhaar Number</Text>
            <TextInput
              style={styles.input}
              placeholder="XXXX XXXX XXXX"
              keyboardType="number-pad"
              maxLength={12}
              value={aadhaarNumber}
              onChangeText={setAadhaarNumber}
              editable={!loading}
            />

            <TouchableOpacity 
              style={styles.consentRow} 
              onPress={() => setConsent(!consent)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={consent ? "checkbox-marked" : "checkbox-blank-outline"} 
                size={24} 
                color={consent ? BLUE : MUTED} 
              />
              <Text style={styles.consentText}>
                I hereby provide my consent to fetch my Aadhaar KYC data for identity verification purposes.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnPrimary, (!consent || aadhaarNumber.length < 12) && styles.btnDisabled]} 
              onPress={handleSendOtp} 
              disabled={loading || !consent || aadhaarNumber.length < 12}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Generate OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="message-processing-outline" size={32} color={BLUE} />
            </View>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.desc}>
              A 6-digit OTP has been sent to the mobile number linked with your Aadhaar.
            </Text>

            <Text style={styles.label}>6-Digit OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={!loading}
            />

            <TouchableOpacity 
              style={styles.resendBtn} 
              onPress={handleResendOtp}
              disabled={countdown > 0 || loading}
            >
              <Text style={[styles.resendText, countdown > 0 && { color: MUTED }]}>
                {countdown > 0 ? `Resend OTP in 00:${countdown.toString().padStart(2, '0')}` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnPrimary, otp.length < 6 && styles.btnDisabled]} 
              onPress={handleVerifyOtp} 
              disabled={loading || otp.length < 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Verify Aadhaar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && verifiedData && (
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
              <MaterialCommunityIcons name="check-decagram" size={32} color={GREEN} />
            </View>
            <Text style={styles.title}>Aadhaar Verified</Text>
            <Text style={styles.desc}>Your identity has been successfully verified through UIDAI.</Text>
            
            <View style={styles.dataBox}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Name:</Text>
                <Text style={styles.dataValue}>{verifiedData.name || 'N/A'}</Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>DOB:</Text>
                <Text style={styles.dataValue}>{verifiedData.dateOfBirth || 'N/A'}</Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Gender:</Text>
                <Text style={styles.dataValue}>{verifiedData.gender || 'N/A'}</Text>
              </View>
              
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Aadhaar:</Text>
                <Text style={[styles.dataValue, { fontFamily: 'monospace' }]}>{verifiedData.maskedAadhaar || 'XXXX XXXX XXXX'}</Text>
              </View>

              <View style={styles.dataRowAddress}>
                <Text style={styles.dataLabel}>Address:</Text>
                <Text style={[styles.dataValue, { marginTop: 4, lineHeight: 20 }]}>{verifiedData.address || 'N/A'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnPrimaryDown} onPress={handleSaveToProfile}>
              <MaterialCommunityIcons name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnPrimaryText}>Download Aadhaar Card</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16 },
  card: { padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 8 },
  desc: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  label: { width: '100%', fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },
  input: { width: '100%', height: 52, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FAFAFA', paddingHorizontal: 16, fontSize: 18, fontWeight: '600', marginBottom: 20, letterSpacing: 2 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, paddingRight: 8 },
  consentText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 18, marginLeft: 10 },
  btnPrimary: { width: '100%', height: 52, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnPrimaryDown: { width: '100%', height: 52, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row' },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendBtn: { padding: 10, marginBottom: 16 },
  resendText: { color: BLUE, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  dataBox: { width: '100%', padding: 16, borderRadius: 12, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER, marginBottom: 24 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  dataRowAddress: { flexDirection: 'column', paddingVertical: 8 },
  dataLabel: { fontSize: 13, fontWeight: '600', color: MUTED },
  dataValue: { fontSize: 15, fontWeight: '600', color: TEXT, textAlign: 'right' },
});
