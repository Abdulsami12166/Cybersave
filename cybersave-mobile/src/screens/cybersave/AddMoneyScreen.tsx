import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Alert, TextInput } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { addMoneyApi } from '../../api/client';

const BLUE = '#1768FF';
const BLUE_DARK = '#2443A8';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F4F7FB';

const amounts = ['+ \\u20B9500', '+ \\u20B91,000', '+ \\u20B92,000', '+ \\u20B95,000'];

const PaymentSource = ({ icon, title, subtitle, active }: any) => (
  <TouchableOpacity style={[styles.sourceCard, active && styles.sourceCardActive]} activeOpacity={0.84}>
    <View style={styles.sourceIcon}>
      <MaterialCommunityIcons name={icon} size={19} color={active ? BLUE : '#65748B'} />
    </View>
    <View style={styles.sourceCopy}>
      <Text style={styles.sourceTitle}>{title}</Text>
      <Text style={styles.sourceSubtitle}>{subtitle}</Text>
    </View>
    <View style={[styles.radio, active && styles.radioActive]} />
  </TouchableOpacity>
);

export const AddMoneyScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState('+ \\u20B92,000');
  const [amountStr, setAmountStr] = useState('2500');
  const [adding, setAdding] = useState(false);

  const handleAddMoney = async () => {
    if (!amountStr || isNaN(Number(amountStr))) return;
    setAdding(true);
    const amount = Number(amountStr);
    const userId = user?.id || 'default-user-id';
    const res = await addMoneyApi(userId, amount, 'UPI');
    setAdding(false);
    if (res && !res.error) {
      navigation.goBack();
    } else {
      Alert.alert('Error', res?.error || 'Failed to add money');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money</Text>
      </View>

      <View style={styles.balanceStrip}>
        <Text style={styles.balanceLabel}>Current Wallet Balance</Text>
        <Text style={styles.balanceValue}>{'\u20B9'}3,250.00</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.fieldLabel}>Enter Amount</Text>
        <View style={styles.amountBox}>
          <Text style={styles.rupee}>{'\u20B9'}</Text>
          <TextInput 
            style={styles.amountText} 
            value={amountStr}
            onChangeText={setAmountStr}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.amountChipsRow}>
          {amounts.map(amount => {
            const active = selectedAmount === amount;
            return (
              <TouchableOpacity 
                key={amount} 
                style={[styles.amountChip, active && styles.amountChipActive]} 
                onPress={() => {
                  setSelectedAmount(amount);
                  const numStr = amount.replace(/[^0-9]/g, '');
                  setAmountStr(numStr);
                }} 
                activeOpacity={0.84}
              >
                <Text style={[styles.amountChipText, active && styles.amountChipTextActive]}>{amount}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Select Payment Source</Text>
        <PaymentSource active icon="credit-card-outline" title="SBI Bank Account" subtitle="Primary {'\\u2022'} **********1204" />
        <PaymentSource icon="qrcode-scan" title="UPI Payment" subtitle="Google Pay, PhonePe, BHIM" />
        <PaymentSource icon="card-bulleted-outline" title="Debit / Credit Card" subtitle="Visa, MasterCard, RuPay" />

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.86} onPress={handleAddMoney} disabled={adding}>
          <Text style={styles.primaryButtonText}>
            {adding ? 'Adding...' : `Add \\u20B9${amountStr || '0'} to Wallet`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { height: 127, backgroundColor: BLUE_DARK, paddingTop: 53, paddingHorizontal: 18, alignItems: 'center' },
  iconButton: { position: 'absolute', left: 18, top: 51, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 5 },
  balanceStrip: { position: 'absolute', left: 17, right: 17, top: 111, height: 45, borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  balanceLabel: { color: BLUE, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  balanceValue: { color: BLUE, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  content: { paddingHorizontal: 17, paddingTop: 52 },
  fieldLabel: { color: TEXT, fontSize: 11, lineHeight: 15, fontWeight: '800', marginBottom: 9 },
  amountBox: { height: 61, borderRadius: 13, borderWidth: 2, borderColor: BLUE, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, marginBottom: 13 },
  rupee: { color: BLUE, fontSize: 25, lineHeight: 31, fontWeight: '900', marginRight: 12 },
  amountText: { color: TEXT, fontSize: 28, lineHeight: 35, fontWeight: '900' },
  amountChipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  amountChip: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  amountChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  amountChipText: { color: TEXT, fontSize: 11, lineHeight: 15, fontWeight: '900' },
  amountChipTextActive: { color: '#FFFFFF' },
  sectionTitle: { color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: '800', marginBottom: 10 },
  sourceCard: { minHeight: 61, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 12 },
  sourceCardActive: { borderColor: BLUE, borderWidth: 2 },
  sourceIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#F2F6FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceTitle: { color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  sourceSubtitle: { marginTop: 3, color: MUTED, fontSize: 9, lineHeight: 12, fontWeight: '500' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: BORDER },
  radioActive: { backgroundColor: BLUE, borderColor: BLUE },
  primaryButton: { height: 48, borderRadius: 13, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontWeight: '900' },
});


