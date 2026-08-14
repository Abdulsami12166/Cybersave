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
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const BLUE = '#0877FF';
const BLUE_DARK = '#214CB4';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F2F6FC';

// ─── Shared Components ────────────────────────────────────────────────────────

const HeaderWithSub = ({ title, subtitle, navigation, onHelpPress }: any) => (
  <View style={styles.blueHeaderWithSub}>
    <TouchableOpacity
      style={styles.circleIconButton}
      onPress={() => navigation.goBack()}
      activeOpacity={0.82}
    >
      <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
    </TouchableOpacity>
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerMainTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
    <TouchableOpacity
      style={styles.circleIconButton}
      onPress={onHelpPress}
      activeOpacity={0.82}
    >
      <MaterialCommunityIcons name="help-circle-outline" size={20} color={TEXT} />
    </TouchableOpacity>
  </View>
);

const ServiceCardItem = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.hubCard} onPress={onPress} activeOpacity={0.82}>
    <View style={[styles.hubIconCircle, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.hubCardLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
);

const FeatureCardItem = ({ icon, title, description, color, onPress }: any) => (
  <TouchableOpacity style={styles.featureCard} onPress={onPress} activeOpacity={0.84}>
    <View style={[styles.featureIconCircle, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={21} color={color} />
    </View>
    <Text style={styles.featureTitle} numberOfLines={1}>{title}</Text>
    <Text style={styles.featureDesc} numberOfLines={2}>{description}</Text>
  </TouchableOpacity>
);

const CertificateCardItem = ({ icon, title, processing, fee, color, onPress }: any) => (
  <TouchableOpacity style={styles.certCard} onPress={onPress} activeOpacity={0.84}>
    <View style={[styles.certIconCircle, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={21} color={color} />
    </View>
    <Text style={styles.certTitle} numberOfLines={2}>{title}</Text>
    <Text style={styles.certMeta}>Processing: {processing}</Text>
    <Text style={styles.certMeta}>Est Fee: {fee}</Text>
  </TouchableOpacity>
);

const BottomNav = ({ active, navigation }: any) => {
  const items = [
    { key: 'Home', icon: 'home-outline', label: 'Home', route: 'Home' },
    { key: 'Services', icon: 'view-grid-outline', label: 'Services', route: 'ServicesHub' },
    { key: 'Applications', icon: 'file-document-outline', label: 'Applications', route: 'Schemes' },
    { key: 'Wallet', icon: 'wallet-outline', label: 'Wallet', route: 'Wallet' },
    { key: 'Profile', icon: 'account-outline', label: 'Profile', route: 'Profile' },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(item => {
        const selected = active === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.82}
          >
            <View style={[styles.navIconWrap, selected && styles.navIconActive]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={selected ? BLUE : '#6F7D93'}
              />
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.navLabel, selected && styles.navLabelActive]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── 1. Services Hub Screen ("All Services") ──────────────────────────────────

export const ServicesHubScreen = ({ navigation }: any) => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Popular', 'Government', 'Finance'];

  const services = [
    { id: 'aadhaar', icon: 'shield-account-outline', label: 'Aadhaar', color: '#2F6BFF', category: 'Government', route: 'AadhaarServices' },
    { id: 'pan', icon: 'card-account-details-outline', label: 'PAN Card', color: '#00A86B', category: 'Government', route: 'PanCardServices' },
    { id: 'certificates', icon: 'certificate-outline', label: 'Certificates', color: '#FF9F1A', category: 'Government', route: 'Certificates' },
    { id: 'utility', icon: 'receipt-text-outline', label: 'Utility Bills', color: '#FF5B73', category: 'Finance', route: 'Schemes' },
    { id: 'banking', icon: 'bank-outline', label: 'Banking (AePS)', color: '#D97706', category: 'Finance', route: 'Schemes' },
    { id: 'insurance', icon: 'umbrella-outline', label: 'Insurance', color: '#0D9488', category: 'Finance', route: 'Schemes' },
    { id: 'education', icon: 'book-open-page-variant-outline', label: 'Education', color: '#8B5CF6', category: 'Popular', route: 'Schemes' },
    { id: 'agriculture', icon: 'leaf-outline', label: 'Agriculture', color: '#10B981', category: 'Popular', route: 'Schemes' },
    { id: 'health', icon: 'heart-pulse-outline', label: 'Health Services', color: '#EF4444', category: 'Popular', route: 'Schemes' },
    { id: 'gov_scheme', icon: 'bank-outline', label: 'Gov. Scheme', color: '#3B82F6', category: 'Government', route: 'Schemes' },
    { id: 'pension', icon: 'account-group-outline', label: 'Pension Plan', color: '#6366F1', category: 'Finance', route: 'Schemes' },
    { id: 'employment', icon: 'briefcase-outline', label: 'Employment', color: '#9333EA', category: 'Government', route: 'Schemes' },
    { id: 'tax', icon: 'calculator-variant-outline', label: 'Tax Services', color: '#475569', category: 'Finance', route: 'Schemes' },
  ];

  const filteredServices = services.filter(s => {
    if (activeFilter === 'All') return true;
    return s.category === activeFilter;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.blueHeaderCompact}>
        <TouchableOpacity
          style={styles.circleIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.82}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerCenterTitle}>All Services</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.hubContent} showsVerticalScrollIndicator={false}>
        {/* Filter Pills */}
        <View style={styles.filterBar}>
          {filters.map(filter => {
            const isSelected = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2-Column Grid */}
        <View style={styles.gridContainer}>
          {filteredServices.map(item => (
            <ServiceCardItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              color={item.color}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNav active="Services" navigation={navigation} />
    </SafeAreaView>
  );
};

export const AadhaarServicesScreen = ({ navigation }: any) => {
  const aadhaarServices = [
    { id: '1', icon: 'home-outline', title: 'Update Address', description: 'Change online with valid proof of address', color: '#2F6BFF' },
    { id: '2', icon: 'phone-outline', title: 'Update Mobile', description: 'Link your active number with bio verification', color: '#10B981' },
    { id: '3', icon: 'account-outline', title: 'Update Name', description: 'Correct name spelling errors securely', color: '#F59E0B' },
    { id: '4', icon: 'download-outline', title: 'Download e-Aadhaar', description: 'Get a secure digitally signed copy', color: '#8B5CF6' },
    { id: '5', icon: 'clock-outline', title: 'Check Status', description: 'Track biometric or demographic updates', color: '#EC4899' },
    { id: '6', icon: 'calendar-month-outline', title: 'Book Appointment', description: 'Reserve slot at closest Seva Kendra', color: '#06B6D4' },
    { id: '7', icon: 'shield-check-outline', title: 'Verify Aadhaar', description: 'Validate any Aadhaar number online', color: '#10B981' },
    { id: '8', icon: 'link-variant', title: 'Link Bank Account', description: 'Check status of NPCI mapping', color: '#3B82F6' },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithSub
        title="Aadhaar Services"
        subtitle="Verification & Official Services"
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.subHubContent} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBannerBlue}>
          <View style={styles.infoIconWrapBlue}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#2F6BFF" />
          </View>
          <Text style={styles.infoBannerTextBlue}>
            Keep your Aadhaar details updated. It is mandatory for linking bank accounts, filing ITR, and availing subsidy schemes.
          </Text>
        </View>

        <Text style={styles.sectionHeading}>Available Services</Text>
        <View style={styles.gridContainer}>
          {aadhaarServices.map(item => (
            <FeatureCardItem
              key={item.id}
              icon={item.icon}
              title={item.title}
              description={item.description}
              color={item.color}
              onPress={() => navigation.navigate('ServiceDetail', { title: item.title })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 3. PAN Card Services Screen ("PAN Card Services") ────────────────────────

export const PanCardServicesScreen = ({ navigation }: any) => {
  const panFeatures = [
    { id: '1', icon: 'plus-circle-outline', title: 'Apply New PAN', description: 'Issue fresh PAN card for individual or bu...', color: '#2F6BFF' },
    { id: '2', icon: 'square-edit-outline', title: 'Corrections', description: 'Modify name, DOB or signature details', color: '#F59E0B' },
    { id: '3', icon: 'content-copy', title: 'Reprint PAN', description: 'Order physical card replacement easily', color: '#10B981' },
    { id: '4', icon: 'link-variant', title: 'Link with Aadha...', description: 'Mandatory pairing for active validity', color: '#EC4899' },
    { id: '5', icon: 'eye-outline', title: 'PAN Status', description: 'Track processing of your application', color: '#8B5CF6' },
    { id: '6', icon: 'file-download-outline', title: 'e-PAN Download', description: 'Secure instant digital copy downlo...', color: '#EF4444' },
    { id: '7', icon: 'checkbox-marked-circle-outline', title: 'PAN Verification', description: 'Verify credentials of any PAN holder', color: '#14B8A6' },
    { id: '8', icon: 'briefcase-account-outline', title: 'TAN Application', description: 'Tax Deduction Account registration', color: '#F97316' },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithSub
        title="PAN Card Services"
        subtitle="Income Tax Department"
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.subHubContent} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={styles.infoBannerAmber}>
          <View style={styles.infoIconWrapAmber}>
            <MaterialCommunityIcons name="alert-outline" size={18} color="#D97706" />
          </View>
          <Text style={styles.infoBannerTextAmber}>
            Linking PAN with Aadhaar is mandatory. Unlinked PAN cards may become inoperative under Income Tax rules.
          </Text>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionHeading}>E-PAN & Utility Services</Text>

        <View style={styles.gridContainer}>
          {panFeatures.map(item => (
            <FeatureCardItem
              key={item.id}
              icon={item.icon}
              title={item.title}
              description={item.description}
              color={item.color}
              onPress={() => navigation.navigate('ServiceDetail', { title: item.title })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 4. Certificates Screen ("Certificates") ──────────────────────────────────

export const CertificatesScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');

  const certificates = [
    { id: '1', icon: 'baby-carriage', title: 'Birth Certificate', processing: '5-7 days', fee: 'Rs 50', color: '#2F6BFF' },
    { id: '2', icon: 'heart-outline', title: 'Death Certifica...', processing: '5-7 days', fee: 'Rs 50', color: '#8B5CF6' },
    { id: '3', icon: 'cards-heart-outline', title: 'Marriage Certifi...', processing: '10-15 days', fee: 'Rs 100', color: '#EC4899' },
    { id: '4', icon: 'trending-up', title: 'Income Certific...', processing: '7-10 days', fee: 'Rs 30', color: '#10B981' },
    { id: '5', icon: 'account-group-outline', title: 'Caste Certificate', processing: '10-12 days', fee: 'Rs 50', color: '#F59E0B' },
    { id: '6', icon: 'compass-outline', title: 'Domicile Certifi...', processing: '7-10 days', fee: 'Rs 40', color: '#06B6D4' },
    { id: '7', icon: 'shield-check-outline', title: 'Character Certi...', processing: '15 days', fee: 'Rs 100', color: '#6366F1' },
    { id: '8', icon: 'compass-rose', title: 'Residence Cert...', processing: '7 days', fee: 'Rs 30', color: '#F43F5E' },
  ];

  const filteredCerts = certificates.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithSub
        title="Certificates"
        subtitle="State & Revenue Departments"
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.subHubContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBoxCard}>
          <MaterialCommunityIcons name="magnify" size={18} color={MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search certificates..."
            placeholderTextColor={MUTED}
            style={styles.searchInput}
          />
        </View>

        {/* Section Title */}
        <Text style={styles.sectionHeading}>Popular Certificates</Text>

        <View style={styles.gridContainer}>
          {filteredCerts.map(item => (
            <CertificateCardItem
              key={item.id}
              icon={item.icon}
              title={item.title}
              processing={item.processing}
              fee={item.fee}
              color={item.color}
              onPress={() => navigation.navigate('ServiceDetail', { title: item.title })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Blue Header Compact (Services Hub)
  blueHeaderCompact: {
    height: 96,
    backgroundColor: BLUE_DARK,
    paddingTop: 42,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerCenterTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  circleIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  // Blue Header With Subtitle (Aadhaar, PAN, Certificates)
  blueHeaderWithSub: {
    height: 104,
    backgroundColor: BLUE_DARK,
    paddingTop: 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMainTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 10.5,
    fontWeight: '500',
  },

  // Filter Pills (Services Hub)
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#102A63',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: BLUE,
  },
  filterText: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Grid Layout
  hubContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 115,
  },
  subHubContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },

  // Service Hub Card (Square layout, 2-col)
  hubCard: {
    width: '48%',
    height: 106,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#0E2554',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  hubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  hubCardLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Info Banners
  infoBannerBlue: {
    backgroundColor: '#EBF3FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4E4FF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  infoIconWrapBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  infoBannerTextBlue: {
    flex: 1,
    color: '#214CB4',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  infoBannerAmber: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  infoIconWrapAmber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  infoBannerTextAmber: {
    flex: 1,
    color: '#B45309',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },

  // Section Heading
  sectionHeading: {
    color: TEXT,
    fontSize: 15.5,
    fontWeight: '900',
    marginBottom: 14,
  },

  // Feature Card Item (Aadhaar & PAN hubs)
  featureCard: {
    width: '48%',
    minHeight: 118,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 13,
    justifyContent: 'flex-start',
    shadowColor: '#0E2554',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    color: TEXT,
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  featureDesc: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 13.5,
    fontWeight: '500',
  },

  // Search Box (Certificates)
  searchBoxCard: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE7F3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 18,
    shadowColor: '#163B82',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: TEXT,
    fontSize: 12.5,
    paddingVertical: 0,
  },

  // Certificate Card Item
  certCard: {
    width: '48%',
    minHeight: 124,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 13,
    justifyContent: 'flex-start',
    shadowColor: '#0E2554',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  certIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  certTitle: {
    color: TEXT,
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  certMeta: {
    color: MUTED,
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '600',
  },

  // Floating Bottom Navigation
  bottomNav: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 24,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#E8F3FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#A9C8EA',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: '#FFFFFF',
  },
  navLabel: {
    marginTop: 4,
    color: '#6F7D93',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 66,
  },
  navLabelActive: {
    color: BLUE,
  },
});
