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
const RED = '#FF2D55';

const Header = ({ navigation }: any) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
      <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Transaction History</Text>
    <TouchableOpacity style={styles.iconButton} activeOpacity={0.82}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={TEXT} />
    </TouchableOpacity>
  </View>
);

const FilterPill = ({ label, active }: any) => (
  <View style={[styles.filterPill, active && styles.filterPillActive]}>
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </View>
);

const TransactionItem = ({ icon, color, title, refId, time, amount, navigation, routeName = 'TransactionDetails' }: any) => (
  <TouchableOpacity style={styles.transactionItem} onPress={() => navigation.navigate(routeName)} activeOpacity={0.84}>
    <View style={[styles.itemIcon, { backgroundColor: color + '18' }]}> 
      <MaterialCommunityIcons name={icon} size={18} color={color} />
    </View>
    <View style={styles.itemCopy}>
      <Text style={styles.itemTitle}>{title}</Text>
      <Text style={styles.itemMeta}>{refId} {'\u2022'} {time}</Text>
    </View>
    <Text style={[styles.itemAmount, { color }]}>{amount}</Text>
  </TouchableOpacity>
);

export const TransactionHistoryScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header navigation={navigation} />
      <ScrollView style={styles.panel} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateRange}>
          <Text style={styles.dateText}>Showing: 01 May 2024 - 15 May 2024</Text>
          <MaterialCommunityIcons name="calendar-blank" size={16} color={BLUE} />
        </View>
        <View style={styles.filtersRow}>
          <FilterPill label="All" active />
          <FilterPill label="Credits" />
          <FilterPill label="Debits" />
          <FilterPill label="Refunds" />
        </View>

        <Text style={styles.groupTitle}>TODAY, 12 MAY</Text>
        <View style={styles.groupCard}>
          <TransactionItem navigation={navigation} icon="receipt-text-outline" color={RED} title="Electricity Bill Payment" refId="Ref: ELEC849204" time="2:30 PM" amount={'- \\u20B91,450.00'} />
          <TransactionItem navigation={navigation} icon="file-document-outline" color={RED} title="PAN Card Verification Fee" refId="Ref: PAN3948293" time="10:15 AM" amount={'- \\u20B9110.00'} />
        </View>

        <Text style={styles.groupTitle}>YESTERDAY, 11 MAY</Text>
        <View style={styles.groupCard}>
          <TransactionItem navigation={navigation} icon="plus-circle-outline" color={GREEN} title="Refund Received" refId="Ref: REF8391823" time="11:15 AM" amount={'+ \\u20B950.00'} routeName="RefundDetails" />
          <TransactionItem navigation={navigation} icon="receipt-text-outline" color={RED} title="Aadhaar Service Payment" refId="Ref: ADH3820194" time="9:00 AM" amount={'- \\u20B950.00'} />
        </View>
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
  dateRange: { height: 37, borderRadius: 10, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, marginBottom: 13 },
  dateText: { color: MUTED, fontSize: 11, lineHeight: 15, fontWeight: '500' },
  filtersRow: { flexDirection: 'row', marginBottom: 18 },
  filterPill: { height: 28, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: '#FFFFFF' },
  filterPillActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterText: { color: MUTED, fontSize: 10, lineHeight: 14, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  groupTitle: { color: '#465771', fontSize: 11, lineHeight: 15, fontWeight: '900', marginBottom: 9 },
  groupCard: { marginBottom: 17 },
  transactionItem: { minHeight: 64, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 10 },
  itemIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { color: TEXT, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  itemMeta: { marginTop: 3, color: MUTED, fontSize: 9, lineHeight: 12 },
  itemAmount: { fontSize: 11, lineHeight: 15, fontWeight: '900' },
});


