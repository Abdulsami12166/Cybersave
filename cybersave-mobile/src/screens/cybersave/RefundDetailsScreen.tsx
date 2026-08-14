import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const BLUE_DARK = '#2443A8';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F4F7FB';
const GREEN = '#00A86B';
const ORANGE = '#FF9F1A';

const DetailLine = ({ label, value }: any) => (
  <View style={styles.accountLine}>
    <Text style={styles.accountLabel}>{label}</Text>
    <Text style={styles.accountValue}>{value}</Text>
  </View>
);

const TimelineStep = ({ status, title, time, body, last }: any) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineRail}>
      <View style={[styles.timelineDot, status === 'done' && styles.dotDone, status === 'active' && styles.dotActive]} />
      {!last ? <View style={styles.timelineLine} /> : null}
    </View>
    <View style={styles.timelineCopy}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepTime}>{time}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  </View>
);

export const RefundDetailsScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <MaterialCommunityIcons name="arrow-left" size={19} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Status</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.refundCard}>
          <View style={styles.refundTopRow}>
            <Text style={styles.refundStatus}>REFUND IN PROGRESS</Text>
            <Text style={styles.refundRef}>Ref: REF8391823</Text>
          </View>
          <Text style={styles.refundLabel}>Estimated Credit Amount</Text>
          <Text style={styles.refundAmount}>{'\u20B9'}1,200.00</Text>
        </View>

        <Text style={styles.sectionTitle}>Refund Journey</Text>
        <View style={styles.timelineCard}>
          <TimelineStep status="done" title="Refund Initiated" time="Merchant accepted refund request" body="12 May, 04:00 PM" />
          <TimelineStep status="active" title="Processing by Bank" time="Awaiting clearance from partner bank" body="13 May, 10:30 AM" />
          <TimelineStep status="pending" title="Credited to Wallet" time="Funds will reflect in available balance" body="Expected: 15 May" last />
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.accountTitle}>Destination Account</Text>
          <DetailLine label="Bank Name" value="State Bank of India" />
          <DetailLine label="Account Number" value="**********1204" />
          <DetailLine label="Reference Number" value="REV-REF-39482910" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { height: 96, backgroundColor: BLUE_DARK, paddingTop: 43, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 33, height: 33, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, marginRight: 33, color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 0, paddingBottom: 32 },
  refundCard: { marginTop: -17, borderRadius: 13, backgroundColor: '#FFF2BA', paddingHorizontal: 15, paddingTop: 14, paddingBottom: 16, marginBottom: 17 },
  refundTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  refundStatus: { color: ORANGE, fontSize: 9.5, lineHeight: 13, fontWeight: '900' },
  refundRef: { color: MUTED, fontSize: 8.5, lineHeight: 12, fontWeight: '800' },
  refundLabel: { color: MUTED, fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  refundAmount: { marginTop: 3, color: TEXT, fontSize: 22, lineHeight: 28, fontWeight: '900' },
  sectionTitle: { color: TEXT, fontSize: 13, lineHeight: 18, fontWeight: '900', marginBottom: 10 },
  timelineCard: { marginBottom: 18 },
  timelineRow: { flexDirection: 'row', minHeight: 67 },
  timelineRail: { width: 22, alignItems: 'center' },
  timelineDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: '#CFD9E6', backgroundColor: '#FFFFFF' },
  dotDone: { borderColor: GREEN, backgroundColor: GREEN },
  dotActive: { borderColor: ORANGE, backgroundColor: ORANGE },
  timelineLine: { flex: 1, width: 1.2, backgroundColor: '#DDE6F0', marginVertical: 4 },
  timelineCopy: { flex: 1, paddingLeft: 5, paddingBottom: 11 },
  stepTitle: { color: TEXT, fontSize: 12.5, lineHeight: 16, fontWeight: '900' },
  stepTime: { marginTop: 2, color: MUTED, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  stepBody: { marginTop: 2, color: MUTED, fontSize: 9.5, lineHeight: 13, fontWeight: '600' },
  accountCard: { borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 13 },
  accountTitle: { color: TEXT, fontSize: 13, lineHeight: 18, fontWeight: '900', marginBottom: 10 },
  accountLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  accountLabel: { color: MUTED, fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  accountValue: { flex: 1, color: TEXT, fontSize: 10.5, lineHeight: 14, fontWeight: '900', textAlign: 'right' },
});

