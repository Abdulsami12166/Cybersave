import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { fetchWalletApi } from '../../api/client';

const BLUE = '#1768FF';
const BLUE_DARK = '#2443A8';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F4F7FB';
const GREEN = '#00A86B';
const RED = '#FF2D55';

const TxnRow = ({ icon, color, title, subtitle, amount, onPress }: any) => (
  <TouchableOpacity style={styles.txnRow} onPress={onPress} activeOpacity={0.82}>
    <View style={[styles.txnIcon, { backgroundColor: color + '18' }]}> 
      <MaterialCommunityIcons name={icon} size={18} color={color} />
    </View>
    <View style={styles.txnCopy}>
      <Text style={styles.txnTitle}>{title}</Text>
      <Text style={styles.txnSubtitle}>{subtitle}</Text>
    </View>
    <Text style={[styles.txnAmount, { color }]}>{amount}</Text>
  </TouchableOpacity>
);

const BottomNav = ({ navigation }: any) => {
  const items = [
    { icon: 'home-outline', label: 'Home', route: 'Home' },
    { icon: 'view-grid-outline', label: 'Services', route: 'ServicesHub' },
    { icon: 'file-document-outline', label: 'Applications', route: 'MyApplications' },
    { icon: 'wallet-outline', label: 'Wallet', route: 'Wallet', active: true },
    { icon: 'account-outline', label: 'Profile', route: 'Profile' },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(item => (
        <TouchableOpacity key={item.label} style={styles.navItem} onPress={() => navigation.navigate(item.route)} activeOpacity={0.82}>
          <View style={[styles.navIconWrap, item.active && styles.navIconActive]}>
            <MaterialCommunityIcons name={item.icon} size={22} color={item.active ? BLUE : '#6F7D93'} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.navLabel, item.active && styles.navLabelActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const WalletHomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(100.0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const loadWalletData = async () => {
      const userId = user?.id || 'default-user-id';
      const data = await fetchWalletApi(userId);
      if (data) {
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    };
    loadWalletData();
  }, [user]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.82}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>{'\u20B9'}{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            <View style={styles.securedRow}>
              <MaterialCommunityIcons name="lock-outline" size={12} color="#DDE8FF" />
              <Text style={styles.securedText}>Secured by Cybersave Digital Trust</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addCircle} onPress={() => navigation.navigate('AddMoney')} activeOpacity={0.82}>
            <MaterialCommunityIcons name="plus" size={22} color={BLUE} />
          </TouchableOpacity>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="history" size={32} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptySub}>Your wallet top-ups and service payments will appear here.</Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((txn: any, idx: number) => (
              <TxnRow
                key={txn.id || idx}
                icon={txn.type === 'CREDIT' ? 'plus-circle-outline' : 'receipt-text-outline'}
                color={txn.type === 'CREDIT' ? GREEN : RED}
                title={txn.description || (txn.type === 'CREDIT' ? 'Wallet Top-up' : 'Service Payment')}
                subtitle={txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : 'Recent'}
                amount={`${txn.type === 'CREDIT' ? '+' : '-'} \u20B9${txn.amount}`}
              />
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Linked Payment Methods</Text>
        <View style={styles.paymentMethodCard}>
          <View style={styles.bankIcon}>
            <MaterialCommunityIcons name="credit-card-outline" size={19} color="#33445E" />
          </View>
          <View style={styles.txnCopy}>
            <Text style={styles.txnTitle}>State Bank of India</Text>
            <Text style={styles.txnSubtitle}>Primary Account {'\u2022'} **********1204</Text>
          </View>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={GREEN} />
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { height: 104, backgroundColor: BLUE_DARK, paddingTop: 46, alignItems: 'center', paddingHorizontal: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 23, fontWeight: '900' },
  headerButton: { position: 'absolute', right: 18, top: 42, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 124 },
  balanceCard: { minHeight: 118, borderRadius: 17, backgroundColor: '#337BFF', padding: 18, marginTop: 0, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { color: '#DDE8FF', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  balanceValue: { marginTop: 5, color: '#FFFFFF', fontSize: 32, lineHeight: 39, fontWeight: '900' },
  securedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  securedText: { marginLeft: 5, color: '#DDE8FF', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  addCircle: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 16, lineHeight: 21, fontWeight: '900', marginBottom: 11 },
  viewAll: { color: BLUE, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  listCard: { marginBottom: 18 },
  txnRow: { minHeight: 70, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 11 },
  txnIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txnCopy: { flex: 1, minWidth: 0 },
  txnTitle: { color: TEXT, fontSize: 13.5, lineHeight: 18, fontWeight: '900' },
  txnSubtitle: { marginTop: 4, color: MUTED, fontSize: 10.5, lineHeight: 14, fontWeight: '600' },
  txnAmount: { fontSize: 12.5, lineHeight: 16, fontWeight: '900' },
  paymentMethodCard: { minHeight: 72, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  bankIcon: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#F2F6FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emptyCard: { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', padding: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { color: TEXT, fontSize: 13, fontWeight: '800', marginTop: 8 },
  emptySub: { color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 4 },
  bottomNav: { position: 'absolute', left: 16, right: 16, bottom: 20, height: 72, borderRadius: 23, backgroundColor: '#EAF1FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0 },
  navIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: '#FFFFFF' },
  navLabel: { marginTop: 4, color: '#6F7D93', fontSize: 9.2, lineHeight: 12, fontWeight: '800', textAlign: 'center', maxWidth: 66 },
  navLabelActive: { color: BLUE },
});






