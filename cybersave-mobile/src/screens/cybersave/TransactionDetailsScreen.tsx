import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const BLUE = '#1768FF';
const BLUE_DARK = '#2443A8';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F4F7FB';
const GREEN = '#00A86B';

const DetailLine = ({ label, value }: any) => (
  <View style={styles.detailLine}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export const TransactionDetailsScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.82}>
          <MaterialCommunityIcons name="share-variant-outline" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.panel} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="check" size={30} color={GREEN} />
          </View>
          <Text style={styles.successLabel}>Payment Successful</Text>
          <Text style={styles.amount}>{'\u20B9'}2,450.00</Text>
          <View style={styles.refPill}>
            <Text style={styles.refText}>Ref: CS9824719</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <DetailLine label="Transaction ID" value="TXN839481029302" />
          <DetailLine label="Date & Time" value="12 May 2024, 02:30 PM" />
          <DetailLine label="Payment Method" value="SBI Bank Account" />
          <DetailLine label="Service Category" value="Digital Governance Fees" />
          <View style={styles.detailLineLast}>
            <Text style={styles.detailLabel}>Beneficiary Service</Text>
            <Text style={styles.detailValue}>Income Certificate Approval</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.receiptButton} activeOpacity={0.82}>
          <MaterialCommunityIcons name="download-outline" size={18} color={BLUE} />
          <Text style={styles.receiptText}>Download Official Receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { height: 94, backgroundColor: BLUE_DARK, paddingTop: 43, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  panel: { position: 'absolute', left: 17, right: 17, top: 94, bottom: 0, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#FFFFFF' },
  content: { padding: 17, paddingBottom: 30 },
  successCard: { minHeight: 198, borderRadius: 14, borderWidth: 1, borderColor: BORDER, alignItems: 'center', paddingTop: 24, backgroundColor: '#FFFFFF', marginBottom: 18 },
  successIcon: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#E9FFF5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  successLabel: { color: MUTED, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  amount: { marginTop: 3, color: TEXT, fontSize: 27, lineHeight: 34, fontWeight: '900' },
  refPill: { marginTop: 13, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#E9FFF5' },
  refText: { color: GREEN, fontSize: 10, lineHeight: 14, fontWeight: '900' },
  detailsCard: { borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', paddingHorizontal: 14, marginBottom: 18 },
  detailLine: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  detailLineLast: { paddingVertical: 10 },
  detailLabel: { color: MUTED, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  detailValue: { marginTop: 3, color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  receiptButton: { height: 43, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  receiptText: { marginLeft: 7, color: BLUE, fontSize: 12, lineHeight: 16, fontWeight: '900' },
});

