import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { sendAiChatApi } from '../../api/client';

const BLUE = '#0877FF';
const BLUE_DARK = '#214CB4';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F2F6FC';

const HeaderBar = ({ title, back, rightLabel, navigation }: any) => (
  <View style={styles.headerBar}>
    {back ? (
      <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()} activeOpacity={0.78}>
        <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
      </TouchableOpacity>
    ) : null}
    <Text style={[styles.headerTitle, back && styles.headerTitleOffset]}>{title}</Text>
    {rightLabel ? <Text style={styles.headerRightText}>{rightLabel}</Text> : null}
  </View>
);

const ServiceIcon = ({ icon, label, color, onPress, variant = 'category' }: any) => {
  const quick = variant === 'quick';

  return (
    <TouchableOpacity style={[styles.serviceItem, quick ? styles.quickServiceItem : styles.categoryServiceItem]} onPress={onPress} activeOpacity={0.82}>
      <View
        style={[
          styles.serviceCircle,
          quick ? styles.quickServiceCircle : styles.categoryServiceCircle,
          quick ? [styles.quickServiceCircleTone, { borderColor: color }] : { backgroundColor: color + '14' },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={quick ? 21 : 22} color={color} />
      </View>
      <Text style={[styles.serviceLabel, quick && styles.quickServiceLabel]}>{label}</Text>
    </TouchableOpacity>
  );
};

const BottomNav = ({ active, navigation }: any) => {
  const items = [
    { key: 'Home', icon: 'home-outline', label: 'Home', route: 'Home' },
    { key: 'Services', icon: 'view-grid-outline', label: 'Services', route: 'ServicesHub' },
    { key: 'Applications', icon: 'file-document-outline', label: 'Applications', route: 'MyApplications' },
    { key: 'Wallet', icon: 'wallet-outline', label: 'Wallet', route: 'Wallet' },
    { key: 'Profile', icon: 'account-outline', label: 'Profile', route: 'Profile' },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(item => {
        const selected = active === item.key;
        return (
          <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => navigation.navigate(item.route)} activeOpacity={0.82}>
            <View style={[styles.navIconWrap, selected && styles.navIconActive]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={selected ? BLUE : '#6F7D93'} />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const userName = user?.fullName ? user.fullName.split(' ')[0] : user?.email ? user.email.split('@')[0] : 'Citizen';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.homeHero}>
        <View style={styles.avatar}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{userName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.greetingCopy}>
          <Text style={styles.greeting}>Welcome, {userName}</Text>
          <Text style={styles.location}>New Delhi, India</Text>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.82}>
          <MaterialCommunityIcons name="bell-outline" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={MUTED} />
          <Text style={styles.searchPlaceholder}>Search services...</Text>
        </View>

        <View style={styles.quickCard}>
          <Text style={styles.sectionTitleLight}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <ServiceIcon icon="shield-account-outline" label="Aadhaar" color="#2F6BFF" variant="quick" onPress={() => navigation.navigate('AadhaarServices')} />
            <ServiceIcon icon="card-account-details-outline" label="PAN Card" color="#00A86B" variant="quick" onPress={() => navigation.navigate('PanCardServices')} />
            <ServiceIcon icon="receipt-text-outline" label="Pay Bills" color="#FF9F1A" variant="quick" onPress={() => navigation.navigate('ServicesHub')} />
            <ServiceIcon icon="bank-outline" label="Banking" color="#FF5B73" variant="quick" onPress={() => navigation.navigate('ServicesHub')} />
          </View>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ServicesHub')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContainer}>
          <ServiceIcon icon="shield-account-outline" label="Aadhaar" color="#2F6BFF" onPress={() => navigation.navigate('AadhaarServices')} />
          <ServiceIcon icon="card-account-details-outline" label="PAN Card" color="#00A86B" onPress={() => navigation.navigate('PanCardServices')} />
          <ServiceIcon icon="certificate-outline" label="Certificates" color="#3D6FA8" onPress={() => navigation.navigate('Certificates')} />
          <ServiceIcon icon="receipt-text-outline" label="Utility Bills" color="#FF5B73" onPress={() => navigation.navigate('ServicesHub')} />
          <ServiceIcon icon="umbrella-outline" label="Insurance" color="#2AA779" onPress={() => navigation.navigate('ServicesHub')} />
          <ServiceIcon icon="book-open-page-variant-outline" label="Education" color="#6946D3" onPress={() => navigation.navigate('ServicesHub')} />
          <ServiceIcon icon="bank-outline" label="Banking" color="#D97706" onPress={() => navigation.navigate('ServicesHub')} />
          <ServiceIcon icon="heart-pulse-outline" label="Health" color="#EF4444" onPress={() => navigation.navigate('ServicesHub')} />
        </ScrollView>

        <Text style={styles.sectionTitle}>Popular Services</Text>
        <TouchableOpacity style={styles.popularCard} onPress={() => navigation.navigate('ServicesHub')} activeOpacity={0.84}>
          <Text style={styles.popularTitle}>Electricity Bill</Text>
          <Text style={styles.popularSubtitle}>Pay Central & State Utility bills</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.schemeBanner} onPress={() => navigation.navigate('Schemes')} activeOpacity={0.86}>
          <Text style={styles.schemeTag}>NEW SCHEME</Text>
          <Text style={styles.schemeTitle}>PM-Kisan Samman Nidhi</Text>
          <Text style={styles.schemeText}>Eligible farmers get {'\u20B9'}6,000 yearly directly into bank accounts. Apply easily today.</Text>
          <Text style={styles.schemeLink}>Check Eligibility  {'\u203A'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav active="Home" navigation={navigation} />
    </SafeAreaView>
  );
};

const notifications = [
  { icon: 'shield-check-outline', color: '#00A86B', title: 'Identity Verified Securely', time: '2 hours ago', body: 'Your recent KYC refresh using Aadhaar has been verified by state portal.' },
  { icon: 'file-document-outline', color: BLUE, title: 'Electricity Bill Due', time: '1 day ago', body: 'Your July consumer cycle invoice of \u20B91,420 has been generated. Pay to avoid fine.' },
  { icon: 'cog-outline', color: '#FF9F1A', title: 'System Update Scheduled', time: '2 days ago', body: 'National Vault systems will go down for major security maintenance on Sunday 02:00 AM.' },
];

export const NotificationsScreen = ({ navigation }: any) => (
  <SafeAreaView style={styles.screen}>
    <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
    <View style={styles.blueHeaderCompact}>
      <HeaderBar title="Notifications" back rightLabel="Mark all read" navigation={navigation} />
    </View>
    <View style={styles.panelHigh}>
      <View style={styles.tabRow}>
        {['All', 'Alerts', 'Updates', 'Payments'].map((tab, index) => (
          <View key={tab} style={[styles.tabPill, index === 0 && styles.tabActive]}>
            <Text style={[styles.tabText, index === 0 && styles.tabTextActive]}>{tab}</Text>
          </View>
        ))}
      </View>
      {notifications.map(item => (
        <View key={item.title} style={styles.notificationCard}>
          <View style={[styles.notificationIcon, { backgroundColor: item.color + '14' }]}> 
            <MaterialCommunityIcons name={item.icon} size={17} color={item.color} />
          </View>
          <View style={styles.notificationCopy}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationTime}>{item.time}</Text>
            </View>
            <Text style={styles.notificationBody}>{item.body}</Text>
          </View>
        </View>
      ))}
    </View>
  </SafeAreaView>
);

const schemesList = [
  { id: '1', title: 'PM SVANidhi Scheme', category: 'Finance', ministry: 'Ministry of Housing & Urban Affairs', text: 'Special Micro-Credit Facility scheme for providing affordable Working Capital loan to street vendors.', tag: 'Self-Employed', tagColor: '#FFB224' },
  { id: '2', title: 'Ayushman Bharat PM-JAY', category: 'Health', ministry: 'Ministry of Health & Family Welfare', text: 'Provides health cover up to \u20B95 Lakh per family per year for secondary and tertiary care hospitalization.', tag: 'BPL / EWS', tagColor: '#FF5B73' },
  { id: '3', title: 'Pradhan Mantri Awas Yojana', category: 'Finance', ministry: 'Ministry of Rural Development', text: 'Providing a pucca house with basic amenities to all homeless households in rural and urban areas.', tag: 'All Citizens', tagColor: '#7BA7FF' },
  { id: '4', title: 'PM-KISAN Samman Nidhi', category: 'Agriculture', ministry: 'Ministry of Agriculture', text: 'Direct benefit transfer of ₹6,000 per year in three equal installments to small and marginal farmer families.', tag: 'Farmers', tagColor: '#10B981' },
  { id: '5', title: 'National Scholarship Scheme', category: 'Education', ministry: 'Ministry of Education', text: 'Financial assistance to meritorious students from disadvantaged sections to pursue higher education.', tag: 'Students', tagColor: '#8B5CF6' },
];

export const SchemesScreen = ({ navigation }: any) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSchemes = schemesList.filter(item => {
    const matchesFilter = activeFilter === 'All' || item.category === activeFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.ministry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.blueHeaderCompact}>
        <HeaderBar title="Government Schemes" back navigation={navigation} />
      </View>
      <ScrollView style={styles.panelHigh} contentContainerStyle={styles.schemesContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBoxCompact}>
          <MaterialCommunityIcons name="magnify" size={17} color={MUTED} />
          <TextInput
            style={{ flex: 1, color: TEXT, fontSize: 12, paddingVertical: 0, marginLeft: 6 }}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search government schemes..."
            placeholderTextColor={MUTED}
          />
        </View>
        <View style={styles.filterRow}>
          {['All', 'Agriculture', 'Education', 'Health', 'Finance'].map((filter) => (
            <TouchableOpacity key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filterPill, activeFilter === filter && styles.filterActive]}>
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredSchemes.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 45 }}>
            <MaterialCommunityIcons name="folder-text-outline" size={48} color="#C4D1E3" style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>No schemes available in this category</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Try selecting another category or clear your search.</Text>
          </View>
        ) : (
          filteredSchemes.map(item => (
            <View key={item.id} style={styles.schemeCard}>
              <Text style={styles.schemeCardTitle}>{item.title}</Text>
              <Text style={styles.schemeMinistry}>{item.ministry}</Text>
              <Text style={styles.schemeCardText}>{item.text}</Text>
              <View style={styles.schemeCardFooter}>
                <View style={[styles.schemeChip, { backgroundColor: item.tagColor + '18' }]}> 
                  <Text style={[styles.schemeChipText, { color: item.tagColor }]}>{item.tag}</Text>
                </View>
                <TouchableOpacity style={styles.applyButton} onPress={() => navigation.navigate('ServiceDetail', { title: item.title })} activeOpacity={0.86}>
                  <Text style={styles.applyButtonText}>Apply Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Message = ({ mine, children, time }: any) => (
  <View style={[styles.messageWrap, mine && styles.messageWrapMine]}>
    <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
      <Text style={styles.messageText}>{children}</Text>
      <Text style={styles.messageTime}>{time}</Text>
    </View>
  </View>
);

export const CyberbotChatScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const userName = user?.fullName ? user.fullName.split(' ')[0] : user?.email ? user.email.split('@')[0] : 'Citizen';
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLogs, setChatLogs] = useState<any[]>([
    {
      id: '1',
      mine: false,
      text: `Namaste ${userName}! I am CyberBot, your AI digital assistant for National Government Services. How can I help you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputText;
    if (!prompt.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      mine: true,
      text: prompt.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatLogs(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    const res = await sendAiChatApi(prompt.trim());
    setLoading(false);

    const botReply = res?.reply || res?.message || 'You can update your address, check PAN status, or apply for government certificates directly from the Services tab.';
    setChatLogs(prev => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        mine: false,
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.chatScreen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.chatBack} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#BFD0FF" />
        </TouchableOpacity>
        <View style={styles.botAvatar}>
          <MaterialCommunityIcons name="shield-outline" size={23} color={BLUE} />
        </View>
        <View style={styles.botTitleBlock}>
          <Text style={styles.botTitle}>cyberbot AI</Text>
          <Text style={styles.botStatus}>Official Assistant {'\u2022'} Online</Text>
        </View>
        <TouchableOpacity style={styles.chatMore} activeOpacity={0.8}>
          <MaterialCommunityIcons name="dots-horizontal" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.todayPill}>TODAY</Text>
        {chatLogs.map(item => (
          <React.Fragment key={item.id}>
            <Text style={item.mine ? styles.youLabel : styles.senderLabel}>{item.mine ? 'You' : 'cyberbot AI'}</Text>
            <Message mine={item.mine} time={item.time}>{item.text}</Message>
          </React.Fragment>
        ))}
        {loading ? <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 10, alignSelf: 'flex-start' }} /> : null}
      </ScrollView>

      <View style={styles.quickPromptRow}>
        {[
          ['home-edit-outline', 'Update Address'],
          ['link-variant', 'Link PAN Card'],
          ['receipt-text-outline', 'Pay Bills'],
        ].map(item => (
          <TouchableOpacity key={item[1]} onPress={() => handleSendMessage(`How do I ${item[1]}?`)} style={styles.quickPrompt} activeOpacity={0.82}>
            <MaterialCommunityIcons name={item[0]} size={13} color={BLUE} />
            <Text style={styles.quickPromptText}>{item[1]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chatInputRow}>
        <TouchableOpacity style={styles.attachButton} activeOpacity={0.8}>
          <MaterialCommunityIcons name="paperclip" size={19} color={MUTED} />
        </TouchableOpacity>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me about Aadhaar, PAN, certificates..."
          placeholderTextColor="#8A98AE"
          style={styles.chatInput}
          onSubmitEditing={() => handleSendMessage()}
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSendMessage()} activeOpacity={0.86} disabled={loading}>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.homeIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  homeHero: { height: 90, backgroundColor: BLUE_DARK, paddingHorizontal: 18, paddingTop: 36, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F6FF', marginRight: 10 },
  greetingCopy: { flex: 1 },
  greeting: { color: '#FFFFFF', fontSize: 13.5, lineHeight: 17, fontWeight: '800', letterSpacing: 0 },
  location: { marginTop: 1, color: 'rgba(255,255,255,0.78)', fontSize: 9.5, lineHeight: 12, fontWeight: '600', letterSpacing: 0 },
  bellButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#123B95', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 3 },
  homeContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 126 },
  searchBox: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#DDE7F3', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 0, marginBottom: 17, shadowColor: '#163B82', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  searchPlaceholder: { marginLeft: 10, color: MUTED, fontSize: 12, lineHeight: 16 },
  quickCard: { borderRadius: 16, backgroundColor: BLUE, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 15, marginBottom: 18 },
  sectionTitleLight: { color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '900', marginBottom: 14, letterSpacing: 0 },
  quickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceItem: { alignItems: 'center', justifyContent: 'center' },
  serviceCircle: { alignItems: 'center', justifyContent: 'center' },
  quickServiceItem: { minWidth: 61 },
  quickServiceCircle: { width: 43, height: 43, borderRadius: 22, borderWidth: 1.5 },
  quickServiceCircleTone: { backgroundColor: '#FFFFFF' },
  categoryServiceItem: { width: 92, minHeight: 74, borderRadius: 14, borderWidth: 0.8, borderColor: '#DCE6F2', backgroundColor: '#FFFFFF', paddingHorizontal: 4, paddingVertical: 8 },
  categoryServiceCircle: { width: 36, height: 36, borderRadius: 18, marginTop: 2 },
  serviceLabel: { marginTop: 6, color: TEXT, fontSize: 10.5, lineHeight: 13, fontWeight: '800', textAlign: 'center', letterSpacing: 0 },
  quickServiceLabel: { marginTop: 8, color: '#FFFFFF', fontSize: 10, lineHeight: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 17, lineHeight: 22, fontWeight: '900', marginBottom: 12, letterSpacing: 0 },
  viewAll: { color: BLUE, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  categoryScrollContainer: { gap: 10, paddingRight: 10, marginBottom: 20 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', columnGap: 8, marginBottom: 22, paddingHorizontal: 0 },
  popularCard: { minHeight: 88, borderRadius: 17, borderWidth: 1, borderColor: '#DCE6F2', backgroundColor: '#FFFFFF', paddingHorizontal: 20, justifyContent: 'center', marginBottom: 28 },
  popularTitle: { color: TEXT, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  popularSubtitle: { marginTop: 7, color: MUTED, fontSize: 13, lineHeight: 18 },
  schemeBanner: { borderRadius: 18, backgroundColor: BLUE, paddingHorizontal: 20, paddingTop: 27, paddingBottom: 28, minHeight: 196, marginBottom: 14 },
  schemeTag: { alignSelf: 'flex-start', color: '#FFFFFF', fontSize: 11, lineHeight: 15, fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 13, paddingVertical: 6, borderRadius: 14, marginBottom: 18 },
  schemeTitle: { color: '#FFFFFF', fontSize: 21, lineHeight: 27, fontWeight: '900', letterSpacing: 0 },
  schemeText: { marginTop: 13, color: 'rgba(255,255,255,0.84)', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  schemeLink: { marginTop: 15, color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '900' },
  bottomNav: { position: 'absolute', left: 18, right: 18, bottom: 24, height: 82, borderRadius: 26, backgroundColor: '#E8F3FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, shadowColor: '#A9C8EA', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 8 },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0 },
  navIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: '#FFFFFF' },
  navLabel: { marginTop: 4, color: '#6F7D93', fontSize: 9.5, lineHeight: 12, fontWeight: '800', textAlign: 'center', maxWidth: 66 },
  navLabelActive: { color: BLUE },
  blueHeaderCompact: { height: 90, backgroundColor: BLUE_DARK, paddingTop: 43, paddingHorizontal: 18 },
  headerBar: { height: 34, flexDirection: 'row', alignItems: 'center' },
  headerIconButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { color: '#FFFFFF', fontSize: 15.5, lineHeight: 20, fontWeight: '900' },
  headerTitleOffset: { color: '#FFFFFF' },
  headerRightText: { marginLeft: 'auto', color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' },
  panelHigh: { position: 'absolute', left: 16, right: 16, top: 90, bottom: 0, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#FFFFFF', padding: 16 },
  tabRow: { height: 34, borderRadius: 12, backgroundColor: '#EDF2F8', flexDirection: 'row', alignItems: 'center', padding: 4, marginBottom: 18 },
  tabPill: { flex: 1, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { color: MUTED, fontSize: 10.5, fontWeight: '800' },
  tabTextActive: { color: TEXT },
  notificationCard: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 15, marginBottom: 13, backgroundColor: '#FFFFFF' },
  notificationIcon: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationCopy: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center' },
  notificationTitle: { flex: 1, color: TEXT, fontSize: 12.5, lineHeight: 17, fontWeight: '900' },
  notificationTime: { color: MUTED, fontSize: 9.5, lineHeight: 12 },
  notificationBody: { marginTop: 5, color: MUTED, fontSize: 11.5, lineHeight: 16 },
  schemesContent: { paddingBottom: 24 },
  searchBoxCompact: { height: 39, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 13 },
  filterRow: { flexDirection: 'row', marginBottom: 13 },
  filterPill: { height: 26, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#F1F5FA', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  filterActive: { backgroundColor: TEXT },
  filterText: { color: MUTED, fontSize: 9, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  schemeCard: { borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', padding: 16, marginBottom: 14 },
  schemeCardTitle: { color: TEXT, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  schemeMinistry: { marginTop: 3, color: MUTED, fontSize: 11, lineHeight: 15 },
  schemeCardText: { marginTop: 10, color: MUTED, fontSize: 12, lineHeight: 17 },
  schemeCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  schemeChip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  schemeChipText: { fontSize: 9, lineHeight: 12, fontWeight: '900' },
  applyButton: { height: 32, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE },
  applyButtonText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' },
  chatScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  chatHeader: { height: 100, backgroundColor: BLUE_DARK, borderBottomLeftRadius: 17, borderBottomRightRadius: 17, paddingTop: 48, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  chatBack: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  botAvatar: { width: 37, height: 37, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  botTitleBlock: { flex: 1 },
  botTitle: { color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '800' },
  botStatus: { color: 'rgba(255,255,255,0.76)', fontSize: 9, lineHeight: 12 },
  chatMore: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  chatContent: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 118 },
  todayPill: { alignSelf: 'center', color: MUTED, fontSize: 8, fontWeight: '800', backgroundColor: '#EDF2F8', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 11, marginBottom: 14 },
  senderLabel: { color: MUTED, fontSize: 9, marginBottom: 5 },
  youLabel: { alignSelf: 'flex-end', color: BLUE, fontSize: 9, marginBottom: 5 },
  messageWrap: { alignItems: 'flex-start', marginBottom: 14 },
  messageWrapMine: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '74%', borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 11, paddingVertical: 10 },
  messageBubbleMine: { backgroundColor: '#EDF4FF', borderColor: '#D8E7FF' },
  messageText: { color: TEXT, fontSize: 11, lineHeight: 16 },
  messageTime: { alignSelf: 'flex-end', color: MUTED, fontSize: 7, marginTop: 6 },
  quickPromptRow: { position: 'absolute', left: 14, right: 14, bottom: 65, flexDirection: 'row', justifyContent: 'space-between' },
  quickPrompt: { height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#D8E7FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#FFFFFF' },
  quickPromptText: { marginLeft: 4, color: TEXT, fontSize: 8, fontWeight: '800' },
  chatInputRow: { position: 'absolute', left: 15, right: 15, bottom: 28, height: 38, borderRadius: 19, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  attachButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  chatInput: { flex: 1, color: TEXT, fontSize: 12, paddingVertical: 0 },
  sendButton: { width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE_DARK, marginLeft: 9, marginRight: -9 },
  homeIndicator: { position: 'absolute', bottom: 8, alignSelf: 'center', width: 110, height: 4, borderRadius: 2, backgroundColor: '#0D1830' },
});














