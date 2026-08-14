import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUserApplicationsApi } from '../../api/client';
import {
  Alert,
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
const GREEN = '#00A86B';
const RED = '#FF3B30';
const AMBER = '#FF9F1A';
const CYAN = '#06B6D4';

// ─── Shared Components ────────────────────────────────────────────────────────

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

// ─── 1. My Applications List Screen ("My Applications") ─────────────────────────

export const MyApplicationsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [realApps, setRealApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true);
      const userId = user?.id || 'default-user-id';
      const data = await fetchUserApplicationsApi(userId);
      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map((item: any) => ({
          id: item.id || `CS${Math.floor(100000 + Math.random() * 900000)}`,
          title: item.serviceTitle || item.title || 'Government Application',
          submitted: item.createdAt ? `Submitted ${new Date(item.createdAt).toLocaleDateString()}` : 'Submitted Today',
          status: item.status === 'SUBMITTED' ? 'Applied' : (item.status || 'Pending'),
          statusColor: item.status === 'Approved' ? GREEN : item.status === 'Rejected' ? RED : AMBER,
          statusBg: item.status === 'Approved' ? '#ECFDF5' : item.status === 'Rejected' ? '#FEF2F2' : '#FFF7ED',
          downloadable: item.status === 'Approved',
          route: item.status === 'Approved' ? 'ViewCertificate' : item.status === 'Rejected' ? 'ApplicationRejected' : 'ApplicationStatus',
        }));
        setRealApps(formatted);
      } else {
        setRealApps([]);
      }
      setLoading(false);
    };
    loadApplications();
  }, [user]);

  const filters = ['All', 'Pending', 'Approved', 'Rejected'];

  const filteredApps = realApps.filter(app => {
    const matchesFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Pending' && (app.status === 'Pending' || app.status === 'In Progress' || app.status === 'Applied')) ||
      app.status.toLowerCase() === activeFilter.toLowerCase();

    const matchesSearch =
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.blueHeaderCompact}>
        <View style={{ width: 34 }} />
        <Text style={styles.headerCenterTitle}>My Applications</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBoxCard}>
          <MaterialCommunityIcons name="magnify" size={18} color={MUTED} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search applications..."
            placeholderTextColor={MUTED}
            style={styles.searchInput}
          />
        </View>

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

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No Applications Found</Text>
            <Text style={styles.emptyStateSub}>You have not submitted any government applications under this category yet.</Text>
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 16, width: '100%' }]}
              onPress={() => navigation.navigate('ServicesHub')}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryButtonText}>Browse All Services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredApps.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.appCard}
              onPress={() => navigation.navigate(item.route, { appId: item.id, title: item.title, status: item.status })}
              activeOpacity={0.85}
            >
              <View style={styles.appCardTopRow}>
                <View style={styles.appIconCircle}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color={BLUE} />
                </View>
                <View style={styles.appCopy}>
                  <Text style={styles.appTitle}>{item.title}</Text>
                  <Text style={styles.appMeta}>ID: {item.id} • {item.submitted}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.statusBg }]}>
                  <Text style={[styles.statusBadgeText, { color: item.statusColor }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {item.downloadable ? (
                <TouchableOpacity
                  style={styles.downloadButtonInline}
                  onPress={() => navigation.navigate('ViewCertificate', { title: item.title })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.downloadInlineText}>Download Certificate</Text>
                  <MaterialCommunityIcons name="download-outline" size={16} color={BLUE} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomNav active="Applications" navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── 2. Rejected Application Screen ("Application Detail") ──────────────────────

export const ApplicationRejectedScreen = ({ route, navigation }: any) => {
  const title = route?.params?.title || 'Income Certificate';
  const appId = route?.params?.appId || 'CS9824721';

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
        <Text style={styles.headerCenterTitle}>Application Detail</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Red Rejected Hero Card */}
        <View style={styles.rejectedHeroCard}>
          <View style={styles.rejectedIconCircle}>
            <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.rejectedHeroTextCol}>
            <Text style={styles.rejectedHeroTitle}>Application Rejected</Text>
            <Text style={styles.rejectedHeroSub}>{title} • {appId}</Text>
          </View>
        </View>

        {/* Rejection Reason Box */}
        <View style={styles.rejectionReasonBox}>
          <Text style={styles.rejectionReasonTitle}>Rejection Reason</Text>
          <Text style={styles.rejectionReasonBody}>
            Document mismatch. The signature on the submitted Aadhaar Card does not match the signature on the self-declaration form. Please re-submit with clear signatures.
          </Text>
        </View>

        {/* Summary Card */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>Summary</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted Date</Text>
            <Text style={styles.detailValue}>08 May 2024</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>Revenue Department</Text>
          </View>
        </View>

        {/* Submitted Documents Card */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>Submitted Documents</Text>
          <View style={styles.submittedDocBox}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={BLUE} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.submittedDocName}>Aadhaar_Card.pdf</Text>
              <Text style={styles.submittedDocSize}>840 KB</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ServiceDetail', { title })}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Re-Apply Application</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => Alert.alert('Appeal Filed', 'Your rejection appeal has been lodged with the Nodal Officer.')}
          activeOpacity={0.84}
        >
          <Text style={styles.outlineButtonText}>Appeal Rejection</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 3. In-Progress Application Status Screen ("Application Status") ─────────────

export const ApplicationStatusScreen = ({ route, navigation }: any) => {
  const title = route?.params?.title || 'Birth Certificate';
  const appId = route?.params?.appId || 'CS9824719';
  const status = route?.params?.status || 'In Progress';

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
        <Text style={styles.headerCenterTitle}>Application Status</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Top Hero Status Banner */}
        <View style={styles.statusHeroCard}>
          <View style={styles.statusIconCircle}>
            <MaterialCommunityIcons name="compass-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.statusHeroTextCol}>
            <Text style={styles.statusHeroTitle}>Application {status}</Text>
            <Text style={styles.statusHeroSub}>{title} • {appId}</Text>
          </View>
        </View>

        {/* Vertical Timeline Card */}
        <View style={styles.timelineCard}>
          {/* Step 1 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={[styles.timelineNodeCircle, styles.timelineNodeDone]}>
                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.timelineLine, styles.timelineLineDone]} />
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineStepTitleDone}>Application Submitted</Text>
              <Text style={styles.timelineStepMeta}>12 May 2024, 10:30 AM</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={[styles.timelineNodeCircle, styles.timelineNodeDone]}>
                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.timelineLine, styles.timelineLineDone]} />
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineStepTitleDone}>Document Verification</Text>
              <Text style={styles.timelineStepMeta}>13 May 2024, 04:15 PM</Text>
            </View>
          </View>

          {/* Step 3 (Active) */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={[styles.timelineNodeCircle, styles.timelineNodeActive]}>
                <View style={styles.timelineActiveDot} />
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineStepTitleActive}>Under Processing</Text>
              <Text style={styles.timelineStepMetaActive}>Est. Completion: 18 May 2024</Text>
            </View>
          </View>

          {/* Step 4 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={styles.timelineNodeCircle}>
                <View style={styles.timelinePendingDot} />
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineStepTitlePending}>Official Approval</Text>
            </View>
          </View>

          {/* Step 5 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeftCol}>
              <View style={styles.timelineNodeCircle}>
                <View style={styles.timelinePendingDot} />
              </View>
            </View>
            <View style={styles.timelineRightCol}>
              <Text style={styles.timelineStepTitlePending}>Certificate Generated</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 4. Pending Application Details Screen ("Application Details") ─────────────

export const ApplicationDetailsScreen = ({ route, navigation }: any) => {
  const title = route?.params?.title || 'Aadhaar Address Update';
  const appId = route?.params?.appId || 'CS9824722';

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
        <Text style={styles.headerCenterTitle}>Application Details</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Header Details Card */}
        <View style={styles.infoSectionCard}>
          <View style={styles.cardHeaderWithBadge}>
            <View style={{ flex: 1 }}>
              <Text style={styles.appMainTitle}>{title}</Text>
              <Text style={styles.appSubMeta}>{appId} • 05 May 2024</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#ECFEFF' }]}>
              <Text style={[styles.statusBadgeText, { color: CYAN }]}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Applicant Information */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>Applicant Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>Rajesh Kumar</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>+91 98765 43210</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>New Address</Text>
            <Text style={styles.detailValue}>Sector 4, New Delhi</Text>
          </View>
        </View>

        {/* Process Info */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>Process Info</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fee Paid</Text>
            <Text style={[styles.detailValue, { color: GREEN }]}>₹50.00 (Success)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned Officer</Text>
            <Text style={styles.detailValue}>Officer Sharma (SDM)</Text>
          </View>
        </View>

        {/* Download Receipt Action */}
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => Alert.alert('Payment Receipt', 'Receipt for #CS9824722 downloaded successfully.')}
          activeOpacity={0.84}
        >
          <Text style={styles.outlineButtonText}>Download Payment Receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 5. View Certificate Screen ("View Certificate") ───────────────────────────

export const ViewCertificateScreen = ({ route, navigation }: any) => {
  const title = route?.params?.title || 'PAN Card';

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
        <Text style={styles.headerCenterTitle}>View Certificate</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Official Document Card Preview */}
        <View style={styles.certificateDocumentCard}>
          <View style={styles.certWatermarkBox}>
            <MaterialCommunityIcons name="file-certificate-outline" size={32} color="#CBD5E1" />
            <Text style={styles.certGovTitle}>GOVERNMENT OF INDIA</Text>
            <Text style={styles.certGovSub}>Aadhaar Certified Watermark</Text>
          </View>

          <Text style={styles.certHolderName}>Rajesh Kumar</Text>
          <Text style={styles.certNumberMeta}>Certificate No: PAN-8812A-98</Text>
          <Text style={styles.certIssuedDate}>Issued on: 12 May 2024</Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => Alert.alert('Download PDF', 'Official PDF certificate downloaded to your Downloads folder.')}
          activeOpacity={0.86}
        >
          <MaterialCommunityIcons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Download PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => Alert.alert('Share Certificate', 'Certificate link generated for sharing.')}
          activeOpacity={0.84}
        >
          <MaterialCommunityIcons name="share-variant-outline" size={18} color={BLUE} style={{ marginRight: 8 }} />
          <Text style={styles.outlineButtonText}>Share Certificate</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Compact Header
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

  // Search Box & Filters
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 115,
  },
  detailContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  searchBoxCard: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE7F3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
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

  // Applications List Cards
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0E2554',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  appCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appCopy: { flex: 1, marginRight: 8 },
  appTitle: { color: TEXT, fontSize: 14, fontWeight: '800' },
  appMeta: { marginTop: 3, color: MUTED, fontSize: 10.5, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 10.5, fontWeight: '800' },
  downloadButtonInline: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F5FC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  downloadInlineText: { marginRight: 6, color: BLUE, fontSize: 11.5, fontWeight: '800' },

  // Rejected Screen Styles
  rejectedHeroCard: {
    backgroundColor: RED,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: RED,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  rejectedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rejectedHeroTextCol: { flex: 1 },
  rejectedHeroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  rejectedHeroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },

  rejectionReasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    marginBottom: 14,
  },
  rejectionReasonTitle: { color: RED, fontSize: 13.5, fontWeight: '900', marginBottom: 6 },
  rejectionReasonBody: { color: '#991B1B', fontSize: 12, lineHeight: 17, fontWeight: '500' },

  // Shared Detail Cards
  infoSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0E2554',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  cardSectionTitle: { color: TEXT, fontSize: 14.5, fontWeight: '800', marginBottom: 12 },
  cardHeaderWithBadge: { flexDirection: 'row', alignItems: 'center' },
  appMainTitle: { color: TEXT, fontSize: 16, fontWeight: '900' },
  appSubMeta: { color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { color: MUTED, fontSize: 12, fontWeight: '600' },
  detailValue: { color: TEXT, fontSize: 12, fontWeight: '800' },

  submittedDocBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EAF4',
    padding: 12,
  },
  submittedDocName: { color: TEXT, fontSize: 12.5, fontWeight: '700' },
  submittedDocSize: { color: MUTED, fontSize: 10.5, fontWeight: '500', marginTop: 2 },

  // Status Screen Styles
  statusHeroCard: {
    backgroundColor: BLUE,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statusHeroTextCol: { flex: 1 },
  statusHeroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  statusHeroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },

  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 20,
    marginBottom: 14,
    shadowColor: '#0E2554',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  timelineRow: { flexDirection: 'row', minHeight: 64 },
  timelineLeftCol: { width: 28, alignItems: 'center' },
  timelineNodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineNodeDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  timelineNodeActive: {
    borderColor: AMBER,
    backgroundColor: '#FFFFFF',
  },
  timelineActiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER },
  timelinePendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: -2 },
  timelineLineDone: { backgroundColor: GREEN },
  timelineRightCol: { flex: 1, marginLeft: 14, paddingTop: 2 },
  timelineStepTitleDone: { color: TEXT, fontSize: 13, fontWeight: '800' },
  timelineStepMeta: { color: MUTED, fontSize: 10.5, fontWeight: '600', marginTop: 2 },
  timelineStepTitleActive: { color: AMBER, fontSize: 13, fontWeight: '900' },
  timelineStepMetaActive: { color: AMBER, fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  timelineStepTitlePending: { color: MUTED, fontSize: 13, fontWeight: '600' },

  // Certificate View Styles
  certificateDocumentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE7F3',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0E2554',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  certWatermarkBox: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFCFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  certGovTitle: { color: BLUE, fontSize: 13, fontWeight: '900', letterSpacing: 0.6, marginTop: 8 },
  certGovSub: { color: MUTED, fontSize: 10, fontWeight: '600', marginTop: 2 },
  certHolderName: { color: TEXT, fontSize: 20, fontWeight: '900', marginBottom: 6 },
  certNumberMeta: { color: MUTED, fontSize: 11.5, fontWeight: '700', marginBottom: 2 },
  certIssuedDate: { color: MUTED, fontSize: 11, fontWeight: '500' },

  // Buttons
  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  outlineButton: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  outlineButtonText: { color: BLUE, fontSize: 14, fontWeight: '800' },

  // Bottom Navigation
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
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  emptyStateTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSub: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
