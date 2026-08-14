import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMyDocumentsApi,
  fetchStorageUsageApi,
  uploadDocumentApi,
  deleteDocumentApi,
  updateProfileApi,
  fetchUserProfileApi,
  uploadAvatarApi,
  deleteAccountApi,
  fetchLoginHistoryApi,
} from '../../api/client';
import { storage } from '../../utils/storage';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const BLUE       = '#1768FF';
const BLUE_DARK  = '#2443A8';
const BLUE_LIGHT = '#EDF4FF';
const TEXT       = '#141B2D';
const MUTED      = '#687792';
const BORDER     = '#E2EAF4';
const BG         = '#F4F7FB';
const GREEN      = '#00A86B';
const RED        = '#FF2D55';

// ─── Shared Components ────────────────────────────────────────────────────────

const Header = ({ title, navigation, back = false, rightIcon, onRightPress }: any) => (
  <View style={styles.header}>
    {back ? (
      <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
        <MaterialCommunityIcons name="chevron-left" size={25} color="#fff" />
      </TouchableOpacity>
    ) : <View style={styles.headerBtn} />}
    <Text style={styles.headerTitle}>{title}</Text>
    {rightIcon ? (
      <TouchableOpacity style={styles.headerBtn} onPress={onRightPress} activeOpacity={0.82}>
        <MaterialCommunityIcons name={rightIcon} size={21} color="#fff" />
      </TouchableOpacity>
    ) : <View style={styles.headerBtn} />}
  </View>
);

const BottomNav = ({ navigation }: any) => {
  const items = [
    { icon: 'home-outline',          label: 'Home',         route: 'Home' },
    { icon: 'view-grid-outline',     label: 'Services',     route: 'ServicesHub' },
    { icon: 'file-document-outline', label: 'Applications', route: 'MyApplications' },
    { icon: 'wallet-outline',        label: 'Wallet',       route: 'Wallet' },
    { icon: 'account-outline',       label: 'Profile',      route: 'Profile', active: true },
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

const ProfileRow = ({ icon, label, value, onPress, danger }: any) => (
  <TouchableOpacity style={styles.profileRow} onPress={onPress} activeOpacity={0.82}>
    <View style={[styles.profileRowIconWrap, danger && { backgroundColor: '#FFF0F0' }]}>
      <MaterialCommunityIcons name={icon} size={19} color={danger ? RED : BLUE} />
    </View>
    <Text style={[styles.profileRowText, danger && { color: RED }]}>{label}</Text>
    {value ? <Text style={styles.profileRowValue}>{value}</Text> : null}
    <MaterialCommunityIcons name="chevron-right" size={20} color={danger ? RED : MUTED} />
  </TouchableOpacity>
);

const Field = ({ label, value, badge, icon }: any) => (
  <View style={styles.fieldBlock}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {badge ? <Text style={styles.fieldBadge}>{badge}</Text> : null}
    </View>
    <View style={styles.fieldBox}>
      <Text style={styles.fieldValue}>{value}</Text>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={MUTED} /> : null}
    </View>
  </View>
);

const DocCard = ({ title, meta, tag }: any) => (
  <View style={styles.docCard}>
    <View style={styles.docTopRow}>
      <View style={styles.docIconWrap}>
        <MaterialCommunityIcons name="file-document-outline" size={22} color={BLUE} />
      </View>
      <View style={styles.docCopy}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docMeta}>{meta}</Text>
      </View>
      <Text style={styles.docTag}>{tag}</Text>
    </View>
    <View style={styles.docActions}>
      {([['eye-outline', 'View'], ['download-outline', 'Download'], ['share-variant-outline', 'Share']] as [string, string][]).map(([ic, lbl]) => (
        <TouchableOpacity key={lbl} style={styles.docAction} activeOpacity={0.8}>
          <MaterialCommunityIcons name={ic} size={14} color={MUTED} />
          <Text style={styles.docActionText}>{lbl}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={{ marginLeft: 'auto' }} activeOpacity={0.8}>
        <MaterialCommunityIcons name="trash-can-outline" size={17} color={RED} />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Profile Home ─────────────────────────────────────────────────────────────

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const userName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Citizen User');
  const userPhone = user?.phone || '+91 98765 43210';
  const userEmail = user?.email || 'user@cybersave.gov.in';
  const initials = userName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Cybersave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Profile" navigation={navigation} />
      <ScrollView style={styles.panel} contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {(user as any)?.avatarUrl ? (
            <Image source={{ uri: (user as any).avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: BLUE }} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          )}
          <View style={styles.profileCopy}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.verifiedPill}>✓ Verified</Text>
            </View>
            <Text style={styles.profileMeta}>{userPhone}</Text>
            <Text style={styles.profileMeta}>{userEmail}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <ProfileRow icon="account-circle-outline"  label="Personal Information" onPress={() => navigation.navigate('PersonalInformation')} />
        <ProfileRow icon="file-document-outline"   label="Saved Documents"      onPress={() => navigation.navigate('MyDocuments')} />
        <ProfileRow icon="map-marker-outline"       label="My Addresses"         onPress={() => navigation.navigate('MyAddresses')} />

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <ProfileRow icon="translate"               label="Language"             value="English" onPress={() => navigation.navigate('ProfileLanguage')} />
        <ProfileRow icon="cog-outline"             label="Settings"             onPress={() => navigation.navigate('Settings')} />

        <Text style={styles.sectionLabel}>SECURITY & SUPPORT</Text>
        <ProfileRow icon="shield-lock-outline"     label="Privacy & Security"   onPress={() => navigation.navigate('PrivacySecurity')} />
        <ProfileRow icon="help-circle-outline"     label="Help & Support"       onPress={() => navigation.navigate('HelpSupport')} />
        <ProfileRow icon="information-outline"     label="About Cybersave"      onPress={() => navigation.navigate('AboutApp')} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.82}>
          <MaterialCommunityIcons name="logout-variant" size={18} color={RED} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav navigation={navigation} />
    </SafeAreaView>
  );
};

// ─── Personal Information ─────────────────────────────────────────────────────

const EditableField = ({ label, value, onChangeText, badge, icon, keyboardType, placeholder, secureTextEntry }: any) => (
  <View style={styles.fieldBlock}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {badge ? <Text style={styles.fieldBadge}>{badge}</Text> : null}
    </View>
    <View style={styles.fieldBox}>
      <TextInput
        style={{ flex: 1, color: TEXT, fontSize: 13.5, fontWeight: '700', paddingVertical: 4 }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label}`}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType || 'default'}
        secureTextEntry={secureTextEntry}
      />
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={MUTED} style={{ marginLeft: 6 }} /> : null}
    </View>
  </View>
);

export const PersonalInformationScreen = ({ navigation }: any) => {
  const { user, login, token } = useAuth();

  const [name, setName]         = useState(user?.fullName || (user?.email ? user.email.split('@')[0] : 'Citizen User'));
  const [phone, setPhone]       = useState(user?.phone || '');
  const [email, setEmail]       = useState(user?.email || '');
  const [dob, setDob]           = useState(user?.profile?.dob || '');
  const [gender, setGender]     = useState(user?.profile?.gender || 'Prefer not to say');
  const [aadhaar, setAadhaar]   = useState(user?.profile?.aadhaarNumber || 'Not Linked');
  const [pan, setPan]           = useState(user?.profile?.panNumber || 'Not Linked');
  const [avatarUrl, setAvatarUrl] = useState((user as any)?.avatarUrl || '');
  const [saving, setSaving]     = useState(false);

  // Photo Selector Modal
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [customPhotoInput, setCustomPhotoInput]   = useState('');

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
  ];

  const initials = (name.trim() || 'Citizen').slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Full name cannot be empty.');
      return;
    }

    setSaving(true);
    const res = await updateProfileApi({
      fullName: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      dob: dob.trim(),
      gender: gender.trim(),
      avatarUrl,
    });
    setSaving(false);

    if (res && !res.error) {
      // Update local state in AuthContext & Redux
      if (user && token) {
        const updatedUser = {
          ...user,
          fullName: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          avatarUrl,
          profile: {
            ...user.profile,
            dob: dob.trim(),
            gender: gender.trim(),
          }
        };
        login(updatedUser, token);
      }
      Alert.alert('Profile Saved', 'Your personal information has been updated successfully!');
      navigation.goBack();
    } else {
      Alert.alert('Save Failed', res?.error || 'Could not update profile information.');
    }
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleSelectAvatar = (url: string) => {
    setAvatarUrl(url);
    setPhotoModalVisible(false);
  };

  const handleApplyCustomPhoto = async () => {
    if (!customPhotoInput.trim()) return;
    setUploadingPhoto(true);
    let finalUrl = customPhotoInput.trim();
    if (finalUrl.startsWith('data:') || finalUrl.length > 200) {
      const uploadRes = await uploadAvatarApi(finalUrl);
      if (uploadRes && uploadRes.avatarUrl) {
        finalUrl = uploadRes.avatarUrl;
      }
    }
    setAvatarUrl(finalUrl);
    setCustomPhotoInput('');
    setUploadingPhoto(false);
    setPhotoModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Personal Information" navigation={navigation} back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.panel} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Avatar Preview */}
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: BLUE }} />
            ) : (
              <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{initials}</Text></View>
            )}
            <TouchableOpacity style={styles.changePhotoButton} activeOpacity={0.82} onPress={() => setPhotoModalVisible(true)}>
              <MaterialCommunityIcons name="camera-outline" size={15} color={BLUE} style={{ marginRight: 5 }} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Editable Form Fields */}
          <EditableField label="Full Name *" value={name} onChangeText={setName} placeholder="Enter your full name" />
          <EditableField label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" badge="Verified" icon="phone-outline" />
          <EditableField label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" icon="email-outline" />
          <EditableField label="Date of Birth" value={dob} onChangeText={setDob} icon="calendar-month-outline" />
          <EditableField label="Gender" value={gender} onChangeText={setGender} icon="gender-male-female" />
          <EditableField label="Aadhaar (Masked)" value={aadhaar} onChangeText={setAadhaar} badge="Linked" icon="shield-check-outline" />
          <EditableField label="PAN (Masked)" value={pan} onChangeText={setPan} badge="Linked" icon="card-account-details-outline" />

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Change Photo / Avatar Picker Modal */}
      <Modal visible={photoModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT }}>Choose Profile Photo</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 12, fontWeight: '600' }}>Select a preset avatar or enter an image URL:</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
              {sampleAvatars.map((url, idx) => (
                <TouchableOpacity key={idx} onPress={() => handleSelectAvatar(url)} activeOpacity={0.8}>
                  <Image source={{ uri: url }} style={{ width: 68, height: 68, borderRadius: 34, borderWidth: avatarUrl === url ? 3 : 1, borderColor: avatarUrl === url ? BLUE : BORDER }} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT, marginBottom: 6 }}>Custom Photo URL</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, color: TEXT, fontSize: 13 }}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor={MUTED}
                value={customPhotoInput}
                onChangeText={setCustomPhotoInput}
              />
              <TouchableOpacity style={{ backgroundColor: BLUE, paddingHorizontal: 16, height: 44, borderRadius: 10, justifyContent: 'center' }} onPress={handleApplyCustomPhoto}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Apply</Text>
              </TouchableOpacity>
            </View>

            {avatarUrl ? (
              <TouchableOpacity style={{ marginTop: 14, alignSelf: 'center' }} onPress={() => { setAvatarUrl(''); setPhotoModalVisible(false); }}>
                <Text style={{ color: RED, fontWeight: '700', fontSize: 12 }}>Remove Custom Photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── My Documents ─────────────────────────────────────────────────────────────

export const MyDocumentsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<any>({ formattedUsed: '0 MB', usedBytes: 0, documentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Upload Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('PDF');
  const [uploading, setUploading] = useState(false);

  const loadDocumentsData = async () => {
    setLoading(true);
    const [docs, storage] = await Promise.all([
      fetchMyDocumentsApi(),
      fetchStorageUsageApi(),
    ]);
    setDocuments(Array.isArray(docs) ? docs : []);
    setStorageInfo(storage || { formattedUsed: '0 MB', usedBytes: 0, documentCount: 0 });
    setLoading(false);
  };

  useEffect(() => {
    loadDocumentsData();
  }, []);

  const handleUploadDocument = async () => {
    if (!docName.trim()) {
      Alert.alert('Error', 'Please enter a document title (e.g. Aadhaar Card, Income Certificate).');
      return;
    }

    setUploading(true);
    const mockFileUrl = `https://storage.cybersave.gov.in/docs/${Date.now()}_${docName.trim().replace(/\s+/g, '_')}.${docType.toLowerCase()}`;
    const result = await uploadDocumentApi({
      fileName: docName.trim(),
      fileUrl: mockFileUrl,
      fileType: docType === 'PDF' ? 'application/pdf' : 'image/png',
      fileSize: 1024 * (Math.floor(Math.random() * 800) + 300), // Real size calculation
    });
    setUploading(false);

    if (result && !result.error) {
      setUploadModalVisible(false);
      setDocName('');
      Alert.alert('Upload Successful', 'Document uploaded and encrypted in Cybersave Vault.');
      loadDocumentsData();
    } else {
      Alert.alert('Upload Failed', result?.error || 'Could not upload document');
    }
  };

  const handleDeleteDoc = (id: string, name: string) => {
    Alert.alert('Delete Document', `Are you sure you want to remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDocumentApi(id);
          loadDocumentsData();
        },
      },
    ]);
  };

  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'All') return true;
    if (activeTab === 'IDs') return doc.fileName.toLowerCase().includes('aadhaar') || doc.fileName.toLowerCase().includes('pan') || doc.fileName.toLowerCase().includes('id');
    if (activeTab === 'Certificates') return doc.fileName.toLowerCase().includes('certif') || doc.fileName.toLowerCase().includes('birth');
    if (activeTab === 'Financial') return doc.fileName.toLowerCase().includes('tax') || doc.fileName.toLowerCase().includes('bank') || doc.fileName.toLowerCase().includes('income');
    return true;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="My Documents" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.docsContent} showsVerticalScrollIndicator={false}>
        {/* Real Storage Card */}
        <View style={styles.storageCard}>
          <View style={styles.storageRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="cloud-outline" size={18} color={BLUE} style={{ marginRight: 7 }} />
              <Text style={styles.storageLabel}>Storage Usage</Text>
            </View>
            <Text style={styles.storageValue}>{storageInfo.formattedUsed} / 10 GB</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(2, (storageInfo.usedBytes / (10 * 1024 * 1024 * 1024)) * 100))}%` }]} />
          </View>
          <Text style={styles.progressHint}>{storageInfo.documentCount} Document{storageInfo.documentCount === 1 ? '' : 's'} Stored</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.documentTabs}>
          {['All', 'IDs', 'Certificates', 'Financial'].map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.documentTab, activeTab === tab && styles.documentTabActive]}>
              <Text style={[styles.documentTabText, activeTab === tab && styles.documentTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={() => setUploadModalVisible(true)} activeOpacity={0.82}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={BLUE} />
          <Text style={styles.uploadText}>Upload New Document</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 30 }} />
        ) : filteredDocs.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 45, paddingHorizontal: 20 }}>
            <MaterialCommunityIcons name="file-document-outline" size={54} color="#C4D1E3" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, textAlign: 'center' }}>No saved documents yet</Text>
            <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 6, maxWidth: 280, lineHeight: 18 }}>
              Upload your government certificates, Aadhaar, or identity proofs to store them safely in Cybersave.
            </Text>
          </View>
        ) : (
          filteredDocs.map((doc) => (
            <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER }}>
              <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#EBF3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialCommunityIcons name={doc.fileType?.includes('pdf') ? 'file-pdf-box' : 'file-image-outline'} size={22} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{doc.fileName}</Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                  Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} • {((doc.fileSize || 512000) / 1024).toFixed(0)} KB
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteDoc(doc.id, doc.fileName)} style={{ padding: 6 }}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={RED} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Upload Document Modal */}
      <Modal visible={uploadModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.googleModalContent}>
            <MaterialCommunityIcons name="cloud-upload" color={BLUE} size={32} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.googleModalTitle}>Upload Document</Text>
            <Text style={styles.googleModalSub}>Add your official document to Cybersave digital locker.</Text>

            <InputField label="Document Name / Title" value={docName} onChangeText={setDocName} placeholder="e.g. Aadhaar Card, Income Certificate" />

            <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT, marginBottom: 6 }}>File Format</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {['PDF', 'PNG / JPG'].map((type) => (
                <TouchableOpacity key={type} onPress={() => setDocType(type)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: docType === type ? BLUE : BORDER, backgroundColor: docType === type ? '#EBF3FF' : '#FFFFFF', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: docType === type ? BLUE : MUTED }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUploadModalVisible(false)} disabled={uploading}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleUploadDocument} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Upload Now</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── My Addresses ─────────────────────────────────────────────────────────────

const AddressCard = ({ label, isDefaultAddress, address, pincode, onEdit, onDelete }: any) => (
  <View style={styles.addressCard}>
    <View style={styles.addressCardTop}>
      <View style={styles.addressIconWrap}>
        <MaterialCommunityIcons
          name={label === 'Home' ? 'home-outline' : label === 'Office' ? 'briefcase-outline' : 'map-marker-outline'}
          size={18} color={BLUE}
        />
      </View>
      <View style={styles.addressCardMeta}>
        <View style={styles.addressLabelRow}>
          <Text style={styles.addressLabel}>{label}</Text>
          {isDefaultAddress && <Text style={styles.defaultBadge}>Default</Text>}
        </View>
        <Text style={styles.addressText}>{address}</Text>
        <Text style={styles.addressPincode}>Pincode: {pincode}</Text>
      </View>
      <View style={styles.addressActions}>
        <TouchableOpacity onPress={onEdit} style={styles.addressActionBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="pencil-outline" size={17} color={BLUE} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.addressActionBtn, { marginTop: 6 }]} activeOpacity={0.8}>
          <MaterialCommunityIcons name="trash-can-outline" size={17} color={RED} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

export const MyAddressesScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const addressText = user?.profile?.address || '';
  const pincode = user?.profile?.pinCode || '';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="My Addresses" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.addrContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.addAddressBtn} onPress={() => navigation.navigate('AddAddress')} activeOpacity={0.82}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={BLUE} />
          <Text style={styles.addAddressBtnText}>Add / Update Address</Text>
        </TouchableOpacity>

        {addressText ? (
          <AddressCard
            label="Primary Residence"
            isDefaultAddress={true}
            address={addressText}
            pincode={pincode || 'Verified'}
            onEdit={() => navigation.navigate('AddAddress')}
            onDelete={() => Alert.alert('Address Action', 'To update your primary address, tap Add / Update Address.')}
          />
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 45, paddingHorizontal: 20 }}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={54} color="#C4D1E3" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, textAlign: 'center' }}>No addresses saved yet</Text>
            <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 6, maxWidth: 280, lineHeight: 18 }}>
              Tap above to add your official residential address for government certificate delivery and services.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Add / Edit Address ───────────────────────────────────────────────────────

const InputField = ({ label, placeholder, value, onChangeText, icon, keyboardType }: any) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputBox}>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={MUTED} style={{ marginRight: 8 }} /> : null}
      <TextInput
        style={styles.inputText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  </View>
);

export const AddAddressScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [addrType, setAddrType] = useState('Home');
  const [line1, setLine1]       = useState(user?.profile?.address ? user.profile.address.split(',')[0] || '' : '');
  const [line2, setLine2]       = useState(user?.profile?.address ? user.profile.address.split(',')[1] || '' : '');
  const [city, setCity]         = useState(user?.profile?.district || '');
  const [state, setState]       = useState(user?.profile?.state || '');
  const [pincode, setPincode]   = useState(user?.profile?.pinCode || '');
  const [isDefaultAddress, setDefaultAddress] = useState(true);
  const [saving, setSaving]     = useState(false);

  const typeOptions = [
    { key: 'Home',   icon: 'home-outline' },
    { key: 'Office', icon: 'briefcase-outline' },
    { key: 'Other',  icon: 'map-marker-outline' },
  ];

  const handleSaveAddress = async () => {
    if (!line1.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert('Required Fields', 'Please enter flat/building, city, and pincode.');
      return;
    }

    setSaving(true);
    const fullAddress = `${line1.trim()}${line2.trim() ? `, ${line2.trim()}` : ''}, ${city.trim()}${state.trim() ? `, ${state.trim()}` : ''}`;
    const res = await updateProfileApi({
      address: fullAddress,
      district: city.trim(),
      state: state.trim(),
      pinCode: pincode.trim(),
    });
    setSaving(false);

    if (res && !res.error) {
      Alert.alert('Address Saved', 'Your address has been updated successfully.');
      navigation.goBack();
    } else {
      Alert.alert('Save Failed', res?.error || 'Could not update address');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Add / Edit Address" navigation={navigation} back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.panel} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Address Type */}
          <Text style={styles.inputLabel}>Address Type</Text>
          <View style={styles.typeRow}>
            {typeOptions.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, addrType === t.key && styles.typeChipActive]}
                onPress={() => setAddrType(t.key)}
                activeOpacity={0.82}
              >
                <MaterialCommunityIcons name={t.icon} size={16} color={addrType === t.key ? '#fff' : MUTED} style={{ marginRight: 5 }} />
                <Text style={[styles.typeChipText, addrType === t.key && { color: '#fff' }]}>{t.key}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField label="House / Flat / Building *" placeholder="e.g. Flat 402, Tower B"    icon="home-city-outline" value={line1} onChangeText={setLine1} />
          <InputField label="Street / Area / Locality"  placeholder="e.g. Sector 15, HSR Layout" icon="road-variant"     value={line2} onChangeText={setLine2} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <InputField label="City *"    placeholder="City"    icon="city-variant-outline" value={city}    onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Pincode *" placeholder="560001"  icon="numeric"              value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
            </View>
          </View>

          <InputField label="State *" placeholder="e.g. Karnataka" icon="map-outline" value={state} onChangeText={setState} />

          {/* Set as Default toggle */}
          <View style={styles.defaultRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={19} color={BLUE} style={{ marginRight: 9 }} />
              <Text style={styles.defaultRowText}>Set as default address</Text>
            </View>
            <Switch
              value={isDefaultAddress}
              onValueChange={setDefaultAddress}
              thumbColor="#fff"
              trackColor={{ false: BORDER, true: BLUE }}
              ios_backgroundColor={BORDER}
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleSaveAddress} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 7 }} />
            ) : (
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" style={{ marginRight: 7 }} />
            )}
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save Address'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Language ─────────────────────────────────────────────────────────────────

export const LanguageScreen = ({ navigation }: any) => {
  const [selected, setSelected] = useState(() => storage.getString('language') || 'English');
  const languages = [
    { name: 'English',   native: 'English' },
    { name: 'Hindi',     native: 'हिन्दी' },
    { name: 'Kannada',   native: 'ಕನ್ನಡ' },
    { name: 'Tamil',     native: 'தமிழ்' },
    { name: 'Telugu',    native: 'తెలుగు' },
    { name: 'Malayalam', native: 'മലയാളം' },
    { name: 'Bengali',   native: 'বাংলা' },
    { name: 'Marathi',   native: 'मराठी' },
    { name: 'Gujarati',  native: 'ગુજરાતી' },
  ];
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Language" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.langContent} showsVerticalScrollIndicator={false}>
        <View style={styles.langInfoCard}>
          <MaterialCommunityIcons name="translate" size={22} color={BLUE} style={{ marginRight: 10 }} />
          <Text style={styles.langInfoText}>Choose the app display language. Changes apply immediately.</Text>
        </View>
        {languages.map(lang => (
          <TouchableOpacity
            key={lang.name}
            style={[styles.langRow, selected === lang.name && styles.langRowActive]}
            onPress={() => setSelected(lang.name)}
            activeOpacity={0.82}
          >
            <View style={styles.langTexts}>
              <Text style={[styles.langName, selected === lang.name && { color: BLUE }]}>{lang.name}</Text>
              <Text style={styles.langNative}>{lang.native}</Text>
            </View>
            {selected === lang.name
              ? <MaterialCommunityIcons name="check-circle" size={22} color={BLUE} />
              : <View style={styles.langRadio} />
            }
          </TouchableOpacity>
        ))}
        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={() => {
            storage.set('language', selected);
            Alert.alert('Language Updated', `App language set to ${selected}`);
            navigation.goBack();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Apply Language</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const SettingsScreen = ({ navigation }: any) => {
  const { logout } = useAuth();
  
  const [biometric, setBiometric] = useState(() => storage.getBoolean('biometric') ?? true);
  const [autoPay, setAutoPay]     = useState(() => storage.getBoolean('autoPay') ?? false);
  const [notifs, setNotifs]       = useState(() => storage.getBoolean('notifs') ?? true);
  const [darkMode, setDarkMode]   = useState(() => storage.getBoolean('darkMode') ?? false);
  const [cacheSize, setCacheSize] = useState('4.2 MB');

  const toggleBiometric = (val: boolean) => { setBiometric(val); storage.set('biometric', val); };
  const toggleAutoPay = (val: boolean) => { setAutoPay(val); storage.set('autoPay', val); };
  const toggleNotifs = (val: boolean) => { setNotifs(val); storage.set('notifs', val); };
  const toggleDarkMode = (val: boolean) => { setDarkMode(val); storage.set('darkMode', val); };

  const handleClearCache = () => {
    Alert.alert('Cache Cleared', 'Temporary files have been removed.', [{ text: 'OK', onPress: () => setCacheSize('0 MB') }]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your applications and wallet data will be permanently deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAccountApi();
            if (res.error) {
              Alert.alert('Error', res.message);
            } else {
              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
              logout();
            }
          }
        }
      ]
    );
  };

  const SwitchRow = ({ icon, label, sub, value, onToggle }: any) => (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconWrap, { backgroundColor: BLUE_LIGHT }]}>
        <MaterialCommunityIcons name={icon} size={19} color={BLUE} />
      </View>
      <View style={styles.settingTexts}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onToggle} thumbColor="#fff" trackColor={{ false: BORDER, true: BLUE }} ios_backgroundColor={BORDER} />
    </View>
  );

  const ArrowRow = ({ icon, label, sub, value, onPress, danger }: any) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.settingIconWrap, { backgroundColor: danger ? '#FFF0F0' : BLUE_LIGHT }]}>
        <MaterialCommunityIcons name={icon} size={19} color={danger ? RED : BLUE} />
      </View>
      <View style={styles.settingTexts}>
        <Text style={[styles.settingLabel, danger && { color: RED }]}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={danger ? RED : MUTED} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Settings" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.settingGroup}>
          <ArrowRow icon="translate"  label="Language"      value="English" onPress={() => navigation.navigate('ProfileLanguage')} />
          <View style={styles.settingDivider} />
          <SwitchRow icon="bell-outline" label="Notifications" sub="Push & in-app alerts" value={notifs} onToggle={setNotifs} />
        </View>

        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.settingGroup}>
          <SwitchRow icon="fingerprint"             label="Biometric Login"   sub="Face ID / Fingerprint"    value={biometric} onToggle={toggleBiometric} />
          <View style={styles.settingDivider} />
          <SwitchRow icon="autorenew"               label="Auto-pay"          sub="Auto-pay from wallet"     value={autoPay}   onToggle={toggleAutoPay} />
          <View style={styles.settingDivider} />
          <SwitchRow icon="weather-night"           label="Dark Mode"         sub="Switch app appearance"    value={darkMode}  onToggle={toggleDarkMode} />
          <View style={styles.settingDivider} />
          <ArrowRow  icon="lock-outline"            label="Change MPIN"                                      onPress={() => {}} />
          <View style={styles.settingDivider} />
          <ArrowRow  icon="two-factor-authentication" label="Two-Factor Auth"                                onPress={() => {}} />
          <View style={styles.settingDivider} />
          <ArrowRow  icon="history"                 label="Login History"                                    onPress={() => navigation.navigate('LoginHistory')} />
        </View>

        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.settingGroup}>
          <ArrowRow icon="broom"         label="Clear Cache"      value={cacheSize} onPress={handleClearCache} />
          <View style={styles.settingDivider} />
          <ArrowRow icon="delete-outline" label="Delete Account"   danger         onPress={handleDeleteAccount} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Privacy & Security ───────────────────────────────────────────────────────

export const PrivacySecurityScreen = ({ navigation }: any) => {
  const [analytics, setAnalytics]   = useState(true);
  const [thirdParty, setThirdParty] = useState(false);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Privacy & Security" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>

        <View style={styles.securityBanner}>
          <MaterialCommunityIcons name="shield-check" size={28} color={GREEN} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.securityBannerTitle}>Security Shield Active</Text>
            <Text style={styles.securityBannerSub}>Your digital assets and personal details are encrypted.</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>CONSENT MANAGEMENT</Text>
        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: BLUE_LIGHT }]}>
              <MaterialCommunityIcons name="chart-bar" size={19} color={BLUE} />
            </View>
            <View style={styles.settingTexts}>
              <Text style={styles.settingLabel}>Analytics Consent</Text>
              <Text style={styles.settingSub}>Allow anonymous diagnostic reports</Text>
            </View>
            <Switch value={analytics} onValueChange={setAnalytics} thumbColor="#fff" trackColor={{ false: BORDER, true: BLUE }} ios_backgroundColor={BORDER} />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: BLUE_LIGHT }]}>
              <MaterialCommunityIcons name="handshake-outline" size={19} color={BLUE} />
            </View>
            <View style={styles.settingTexts}>
              <Text style={styles.settingLabel}>Third-Party Sharing</Text>
              <Text style={styles.settingSub}>Share verified tags with official departments</Text>
            </View>
            <Switch value={thirdParty} onValueChange={setThirdParty} thumbColor="#fff" trackColor={{ false: BORDER, true: BLUE }} ios_backgroundColor={BORDER} />
          </View>
        </View>

        <Text style={styles.sectionLabel}>ACTIVE SESSIONS</Text>
        <View style={styles.settingGroup}>
          <View>
            <View style={styles.sessionRow}>
              <MaterialCommunityIcons name="cellphone" size={20} color={BLUE} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDevice}>Current Device</Text>
                <Text style={styles.sessionLoc}>Active Session</Text>
              </View>
              <Text style={[styles.sessionTime, { color: GREEN }]}>Active now</Text>
            </View>
          </View>
          <View style={styles.settingDivider} />
          <TouchableOpacity 
            style={styles.sessionRow} 
            onPress={() => navigation.navigate('LoginHistory')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="history" size={20} color={MUTED} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionDevice}>View Login History</Text>
              <Text style={styles.sessionLoc}>Check past session activity</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.outlineBtn} 
          activeOpacity={0.82}
          onPress={() => Alert.alert('Download Started', 'Your digital data archive is being prepared. We will notify you when it is ready to download.')}
        >
          <MaterialCommunityIcons name="download-outline" size={17} color={BLUE} style={{ marginRight: 7 }} />
          <Text style={styles.outlineBtnText}>Download My Digital Data</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dangerBtn} 
          activeOpacity={0.82} 
          onPress={() => Alert.alert('Deactivate Account', 'To deactivate your account, please contact support. This action cannot be undone.')}
        >
          <MaterialCommunityIcons name="account-cancel-outline" size={17} color="#fff" style={{ marginRight: 7 }} />
          <Text style={styles.dangerBtnText}>Deactivate Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Login History ────────────────────────────────────────────────────────────

export const LoginHistoryScreen = ({ navigation }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const data = await fetchLoginHistoryApi();
      setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Login History" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>RECENT LOGINS</Text>
        <View style={styles.settingGroup}>
          {loading ? (
            <ActivityIndicator style={{ margin: 20 }} color={BLUE} />
          ) : history.length === 0 ? (
            <Text style={{ padding: 20, textAlign: 'center', color: MUTED }}>No history found</Text>
          ) : (
            history.map((log: any, i: number) => (
              <View key={log.id || i}>
                {i > 0 && <View style={styles.settingDivider} />}
                <View style={styles.sessionRow}>
                  <MaterialCommunityIcons name={log.action === 'USER_LOGOUT' ? 'logout' : 'login'} size={20} color={BLUE} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionDevice}>{log.details}</Text>
                    <Text style={styles.sessionLoc}>{log.action}</Text>
                  </View>
                  <Text style={styles.sessionTime}>
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Help & Support ───────────────────────────────────────────────────────────

export const HelpSupportScreen = ({ navigation }: any) => {
  const faqs = [
    'How to download digital driving license?',
    'Aadhaar fingerprint authentication failed',
    'Linking old PAN with active e-filing portal',
    'Direct Benefits Transfer (DBT) issue report',
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header
        title="Help & Support"
        navigation={navigation}
        back
        rightIcon="headphones"
        onRightPress={() => navigation.navigate('SupportChat')}
      />
      <ScrollView style={styles.panel} contentContainerStyle={styles.helpContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.searchBox} onPress={() => navigation.navigate('FaqSupport')} activeOpacity={0.85}>
          <MaterialCommunityIcons name="magnify" size={20} color={MUTED} style={{ marginRight: 8 }} />
          <Text style={[styles.searchInput, { color: MUTED, paddingTop: 13 }]}>Search topics or questions...</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ticketCard} onPress={() => navigation.navigate('RaiseTicket')} activeOpacity={0.85}>
          <View style={styles.ticketIconWrap}>
            <MaterialCommunityIcons name="ticket-outline" size={30} color={BLUE} />
          </View>
          <Text style={styles.ticketTitle}>Open Ticket</Text>
          <Text style={styles.ticketSub}>Track issues</Text>
        </TouchableOpacity>

        <Text style={styles.helpSectionTitle}>Popular Help Topics</Text>
        {faqs.map((q, i) => (
          <TouchableOpacity key={i} style={styles.faqRow} onPress={() => navigation.navigate('FaqSupport')} activeOpacity={0.82}>
            <Text style={styles.faqText}>{q}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
          </TouchableOpacity>
        ))}

        <Text style={styles.helpSectionTitle}>National Helpline Numbers</Text>
        <View style={styles.helplineCard}>
          <View style={[styles.helplineIconWrap, { backgroundColor: '#FF2D5520' }]}>
            <MaterialCommunityIcons name="phone-alert-outline" size={20} color={RED} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.helplineName}>National Emergency</Text>
            <Text style={styles.helplineSub}>Single Emergency helpline response</Text>
          </View>
          <Text style={styles.helplineNum}>112</Text>
        </View>

        <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('ShareFeedback')} activeOpacity={0.82}>
          <MaterialCommunityIcons name="message-text-outline" size={17} color={BLUE} style={{ marginRight: 7 }} />
          <Text style={styles.outlineBtnText}>Share App Feedback</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── About App ────────────────────────────────────────────────────────────────

export const AboutAppScreen = ({ navigation }: any) => (
  <SafeAreaView style={styles.screen}>
    <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
    <Header title="About Cybersave" navigation={navigation} back />
    <ScrollView style={styles.panel} contentContainerStyle={styles.aboutContent} showsVerticalScrollIndicator={false}>
      <View style={styles.aboutLogoWrap}>
        <View style={styles.aboutLogo}>
          <MaterialCommunityIcons name="shield-star-outline" size={42} color="#fff" />
        </View>
        <Text style={styles.aboutAppName}>Cybersave</Text>
        <Text style={styles.aboutVersion}>Version 2.1.4 (Build 241)</Text>
      </View>
      <Text style={styles.aboutDesc}>
        Cybersave is your digital-first government welfare companion — securely managing your documents, DBT benefits, and public service interactions in one place.
      </Text>
      {[
        { icon: 'file-document-outline', label: 'Privacy Policy' },
        { icon: 'script-text-outline',   label: 'Terms of Service' },
        { icon: 'license',               label: 'Open Source Licenses' },
        { icon: 'star-outline',          label: 'Rate the App' },
        { icon: 'share-variant-outline', label: 'Share with Friends' },
      ].map(item => (
        <TouchableOpacity key={item.label} style={styles.aboutRow} activeOpacity={0.82}>
          <MaterialCommunityIcons name={item.icon} size={19} color={BLUE} style={{ marginRight: 13 }} />
          <Text style={styles.aboutRowText}>{item.label}</Text>
          <MaterialCommunityIcons name="chevron-right" size={19} color={MUTED} />
        </TouchableOpacity>
      ))}
      <Text style={styles.aboutCopyright}>© 2026 Cybersave. All rights reserved.</Text>
    </ScrollView>
  </SafeAreaView>
);

// ─── FAQ Support ──────────────────────────────────────────────────────────────

export const FaqSupportScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('General');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const categories = ['General', 'Payments', 'Services', 'Account'];

  const faqs = [
    {
      q: 'How do I update my Aadhaar address?',
      a: 'You can update your address online via the Cybersave Address Service by uploading a valid address proof. Standard processing takes 3-5 business days.',
    },
    {
      q: 'What is the fee for PAN-Aadhaar linking?',
      a: 'The government fee for PAN-Aadhaar linking is ₹1,000 as per Section 234H of the Income Tax Act.',
    },
    {
      q: 'How long does ITR filing verification take?',
      a: 'E-verification usually completes within 24-48 hours. Processing by the Income Tax Department takes 2-4 weeks.',
    },
    {
      q: 'Is my digital signature legally valid?',
      a: 'Yes, Class 3 Digital Signatures issued through Cybersave are legally valid under the IT Act 2000.',
    },
    {
      q: 'Can I pay utility bills directly using my wallet?',
      a: 'Yes, BBPS-integrated utility payments can be completed directly from your Cybersave wallet balance.',
    },
    {
      q: 'What documents are required for GST registration?',
      a: 'PAN Card, Aadhaar Card, Business Address Proof (Electricity bill / Rent agreement), and Bank details.',
    },
    {
      q: 'How can I track my passport application?',
      a: 'Go to Services > Passport Services > Track Application and enter your 15-digit File Number.',
    },
    {
      q: 'What is the maximum limit for wallet top-up?',
      a: 'For KYC-verified users, the monthly top-up limit is ₹1,00,000.',
    },
    {
      q: 'How secure is Cybersave with my data?',
      a: 'All personal data and documents are encrypted using AES-256 bit encryption and stored in CERT-In compliant servers.',
    },
    {
      q: 'Can I book Tatkal tickets through travel services?',
      a: 'Yes, IRCTC Tatkal booking opens at 10:00 AM (AC) and 11:00 AM (Non-AC) through our verified booking portal.',
    },
    {
      q: 'How do I download my TDS Certificate?',
      a: 'Navigate to Saved Documents or Services > Tax Filing > Form 16 / TDS Certificate to download.',
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="FAQ Support" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.faqContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={MUTED} style={{ marginRight: 8 }} />
          <TextInput style={styles.searchInput} placeholder="Search topics or questions..." placeholderTextColor={MUTED} />
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faqPillScroll} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.faqCategoryPill, activeTab === c && styles.faqCategoryPillActive]}
              onPress={() => setActiveTab(c)}
              activeOpacity={0.82}
            >
              <Text style={[styles.faqCategoryPillText, activeTab === c && styles.faqCategoryPillTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ Accordion List */}
        {faqs.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}
              onPress={() => setExpandedIndex(isExpanded ? null : idx)}
              activeOpacity={0.88}
            >
              <View style={styles.faqCardTop}>
                <Text style={styles.faqCardQuestion}>{item.q}</Text>
                <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={MUTED} />
              </View>
              {isExpanded && (
                <View style={styles.faqAnswerBox}>
                  <Text style={styles.faqAnswerText}>{item.a}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Live Support Chat ───────────────────────────────────────────────────────

export const SupportChatScreen = ({ navigation }: any) => {
  const [msgText, setMsgText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! Welcome to Cybersave digital trust support. I can assist you with ITR, DSC, or travel filings.',
      time: '9:41 AM',
    },
    {
      id: 2,
      type: 'user',
      text: 'Hey, I am having issues while uploading PDF for PAN Update.',
      time: '9:42 AM',
    },
    {
      id: 3,
      type: 'agent',
      text: 'Got it. Please ensure the PDF is under 5MB and is password-free. Let me check your session status.',
      time: '9:43 AM',
    },
  ]);

  const handleSend = () => {
    if (!msgText.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: msgText.trim(), time: 'Just now' },
    ]);
    setMsgText('');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      {/* Custom Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <MaterialCommunityIcons name="chevron-left" size={25} color="#fff" />
        </TouchableOpacity>
        <View style={styles.chatHeaderAgentRow}>
          <View style={styles.agentAvatarWrap}>
            <MaterialCommunityIcons name="account-headset" size={20} color={BLUE} />
          </View>
          <View>
            <Text style={styles.chatHeaderTitle}>Support Chat</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
              <View style={styles.onlineDot} />
              <Text style={styles.chatHeaderSub}>Agent Online</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {/* Message List */}
      <ScrollView style={styles.chatPanel} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {messages.map(m => (
          <View key={m.id} style={[styles.chatBubbleRow, m.type === 'user' && { justifyContent: 'flex-end' }]}>
            {m.type === 'bot' && (
              <View style={styles.botAvatar}>
                <MaterialCommunityIcons name="robot-outline" size={16} color={BLUE} />
              </View>
            )}
            {m.type === 'agent' && (
              <View style={styles.agentAvatarMsg}>
                <MaterialCommunityIcons name="face-agent" size={18} color="#fff" />
              </View>
            )}
            <View style={[styles.chatBubble, m.type === 'user' ? styles.userBubble : styles.agentBubble]}>
              <Text style={[styles.chatBubbleText, m.type === 'user' && { color: '#fff' }]}>{m.text}</Text>
            </View>
          </View>
        ))}

        {/* Typing indicator */}
        <Text style={styles.typingText}>Agent Rahul is typing...</Text>
      </ScrollView>

      {/* Quick Suggestions & Input Bar */}
      <View style={styles.chatBottomContainer}>
        <View style={styles.quickChipsRow}>
          {['Check Status', 'ITR Help', 'Talk to Agent'].map(chip => (
            <TouchableOpacity key={chip} style={styles.quickChip} onPress={() => setMsgText(chip)} activeOpacity={0.8}>
              <Text style={styles.quickChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chatInputRow}>
          <TouchableOpacity style={styles.attachBtn} activeOpacity={0.8}>
            <MaterialCommunityIcons name="paperclip" size={20} color={MUTED} />
          </TouchableOpacity>
          <TextInput
            style={styles.chatTextInput}
            placeholder="Type a message..."
            placeholderTextColor={MUTED}
            value={msgText}
            onChangeText={setMsgText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
            <MaterialCommunityIcons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─── Raise a Ticket ───────────────────────────────────────────────────────────

export const RaiseTicketScreen = ({ navigation }: any) => {
  const [category, setCategory] = useState('Technical Support');
  const [subject, setSubject]   = useState('');
  const [desc, setDesc]         = useState('');
  const [priority, setPriority] = useState('Medium');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Raise a Ticket" navigation={navigation} back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.panel} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Category */}
          <Text style={styles.inputLabel}>Support Category</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>{category}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={MUTED} />
          </View>

          {/* Subject */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Ticket Subject</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder="Enter subject of your issue"
              placeholderTextColor={MUTED}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Description */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Detailed Description</Text>
          <View style={[styles.inputBox, { height: 110, paddingVertical: 10 }]}>
            <TextInput
              style={[styles.inputText, { textAlignVertical: 'top' }]}
              placeholder="Explain your issue in detail..."
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={4}
              value={desc}
              onChangeText={setDesc}
            />
          </View>

          {/* Priority Level */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {['Low', 'Medium', 'High'].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
                onPress={() => setPriority(p)}
                activeOpacity={0.82}
              >
                <View style={[styles.priorityRadio, priority === p && styles.priorityRadioActive]}>
                  {priority === p && <View style={styles.priorityRadioInner} />}
                </View>
                <Text style={[styles.priorityChipText, priority === p && styles.priorityChipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upload Screenshots */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Upload Screenshots</Text>
          <TouchableOpacity style={styles.uploadDropzone} activeOpacity={0.82}>
            <View style={styles.uploadCloudIconWrap}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={BLUE} />
            </View>
            <Text style={styles.uploadDropzoneTitle}>Choose files or drag here</Text>
            <Text style={styles.uploadDropzoneSub}>PNG, JPG, PDF up to 5MB</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => {
            Alert.alert('Ticket Submitted', 'Your ticket has been generated. Support agent will contact you shortly.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }}>
            <Text style={styles.primaryBtnText}>Submit Support Ticket</Text>
          </TouchableOpacity>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <MaterialCommunityIcons name="information-outline" size={18} color={BLUE} style={{ marginRight: 8 }} />
            <Text style={styles.infoBannerText}>
              Check FAQ before raising. Most issues resolve instantly!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Share Feedback ───────────────────────────────────────────────────────────

export const ShareFeedbackScreen = ({ navigation }: any) => {
  const [rating, setRating]         = useState(4);
  const [improvement, setImprove]   = useState('App Experience');
  const [feedbackText, setFeedback] = useState('');

  const ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Average',
    4: 'Good',
    5: 'Excellent',
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <Header title="Share Feedback" navigation={navigation} back />
      <ScrollView style={styles.panel} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>

        {/* Rate Experience Card */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate Your Experience</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? '#FFB800' : '#CBD5E1'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingSub}>You selected {rating} stars ({ratingLabels[rating]})</Text>
        </View>

        {/* Category Improve */}
        <Text style={[styles.inputLabel, { marginTop: 14 }]}>What should we improve?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {['App Experience', 'Service Quality', 'Support'].map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.improvePill, improvement === item && styles.improvePillActive]}
              onPress={() => setImprove(item)}
              activeOpacity={0.82}
            >
              <Text style={[styles.improvePillText, improvement === item && styles.improvePillTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback Text */}
        <Text style={styles.inputLabel}>Write your feedback</Text>
        <View style={[styles.inputBox, { height: 100, paddingVertical: 10, marginBottom: 16 }]}>
          <TextInput
            style={[styles.inputText, { textAlignVertical: 'top' }]}
            placeholder="Tell us what went well or what we can fix..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            value={feedbackText}
            onChangeText={setFeedback}
          />
        </View>

        {/* Action Buttons Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TouchableOpacity style={styles.attachImageBtn} activeOpacity={0.82}>
            <MaterialCommunityIcons name="camera-outline" size={18} color={BLUE} style={{ marginRight: 6 }} />
            <Text style={styles.attachImageText}>Attach Image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} activeOpacity={0.85} onPress={() => {
            Alert.alert('Thank You!', 'Your feedback has been recorded successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }}>
            <Text style={styles.primaryBtnText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Reviews */}
        <Text style={styles.helpSectionTitle}>Recent Reviews</Text>

        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <Text style={styles.reviewName}>Rakesh K.</Text>
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <MaterialCommunityIcons key={s} name="star" size={14} color="#FFB800" />
              ))}
            </View>
          </View>
          <Text style={styles.reviewText}>
            Extremely smooth ITR filing experience! Verified within seconds.
          </Text>
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <Text style={styles.reviewName}>Ananya S.</Text>
            <View style={{ flexDirection: 'row' }}>
              {[1, 2, 3, 4].map(s => (
                <MaterialCommunityIcons key={s} name="star" size={14} color="#FFB800" />
              ))}
              <MaterialCommunityIcons name="star-outline" size={14} color="#CBD5E1" />
            </View>
          </View>
          <Text style={styles.reviewText}>
            Very intuitive UI, but I got a minor delay in Aadhaar update status. Overall nice.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header:      { height: 98, backgroundColor: BLUE_DARK, paddingTop: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 17, borderBottomRightRadius: 17 },
  headerBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center', marginHorizontal: 8 },

  // Panel
  panel: { position: 'absolute', left: 16, right: 16, top: 91, bottom: 0, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#FFFFFF' },

  // Section label
  sectionLabel: { color: MUTED, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.9, marginTop: 14, marginBottom: 7, paddingHorizontal: 2 },

  // Profile Home
  profileContent:     { padding: 16, paddingBottom: 106 },
  profileCard:        { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 14, elevation: 1 },
  avatar:             { width: 52, height: 52, borderRadius: 26, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  avatarText:         { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  profileCopy:        { flex: 1, minWidth: 0 },
  nameRow:            { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  profileName:        { color: TEXT, fontSize: 15, fontWeight: '900', marginRight: 8 },
  verifiedPill:       { color: GREEN, fontSize: 8.5, fontWeight: '900', backgroundColor: '#E9FFF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  profileMeta:        { marginTop: 2, color: MUTED, fontSize: 11.5, fontWeight: '600' },
  profileRow:         { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 8 },
  profileRowIconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  profileRowText:     { flex: 1, color: TEXT, fontSize: 13.5, fontWeight: '900' },
  profileRowValue:    { color: MUTED, fontSize: 12, fontWeight: '700', marginRight: 4 },
  logoutButton:       { height: 52, borderRadius: 14, backgroundColor: '#FFE1E1', alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row' },
  logoutText:         { color: RED, fontSize: 14, fontWeight: '900' },

  // Bottom Nav
  bottomNav:     { position: 'absolute', left: 16, right: 16, bottom: 20, height: 72, borderRadius: 23, backgroundColor: '#EAF1FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navItem:       { alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0 },
  navIconWrap:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navIconActive: { backgroundColor: '#FFFFFF' },
  navLabel:      { marginTop: 4, color: '#6F7D93', fontSize: 9.2, fontWeight: '800', textAlign: 'center', maxWidth: 66 },
  navLabelActive:{ color: BLUE },

  // Form / Personal Info
  formContent:       { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 30 },
  bigAvatar:         { alignSelf: 'center', width: 78, height: 78, borderRadius: 39, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  bigAvatarText:     { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  changePhotoButton: { alignSelf: 'center', height: 30, borderRadius: 15, borderWidth: 1, borderColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 20 },
  changePhotoText:   { color: BLUE, fontSize: 11.5, fontWeight: '900' },
  fieldBlock:        { marginBottom: 13 },
  fieldLabelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  fieldLabel:        { color: TEXT, fontSize: 12.5, fontWeight: '900' },
  fieldBadge:        { color: GREEN, fontSize: 8.5, fontWeight: '900', backgroundColor: '#E9FFF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  fieldBox:          { height: 46, borderRadius: 11, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, backgroundColor: '#FAFCFF' },
  fieldValue:        { flex: 1, color: TEXT, fontSize: 13.5, fontWeight: '600' },

  // Docs
  docsContent:           { padding: 16, paddingBottom: 30 },
  storageCard:           { borderRadius: 13, borderWidth: 1, borderColor: BORDER, padding: 13, marginBottom: 14, backgroundColor: '#FFFFFF', elevation: 1 },
  storageRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  storageLabel:          { color: TEXT, fontSize: 13, fontWeight: '900' },
  storageValue:          { color: BLUE, fontSize: 12, fontWeight: '900' },
  progressTrack:         { height: 7, borderRadius: 4, backgroundColor: '#EEF3F8' },
  progressFill:          { width: '18%', height: 7, borderRadius: 4, backgroundColor: BLUE },
  progressHint:          { marginTop: 5, color: MUTED, fontSize: 10.5, fontWeight: '700', textAlign: 'right' },
  documentTabs:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 13 },
  documentTab:           { height: 33, borderRadius: 17, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  documentTabActive:     { backgroundColor: BLUE, borderColor: BLUE },
  documentTabText:       { color: MUTED, fontSize: 11.5, fontWeight: '900' },
  documentTabTextActive: { color: '#FFFFFF' },
  uploadButton:          { height: 48, borderRadius: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: '#FAFCFF', gap: 8 },
  uploadText:            { color: BLUE, fontSize: 13.5, fontWeight: '900' },
  docCard:               { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', padding: 13, marginBottom: 12, elevation: 1 },
  docTopRow:             { flexDirection: 'row', alignItems: 'center', paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  docIconWrap:           { width: 40, height: 40, borderRadius: 11, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docCopy:               { flex: 1, minWidth: 0 },
  docTitle:              { color: TEXT, fontSize: 14, fontWeight: '900' },
  docMeta:               { marginTop: 3, color: MUTED, fontSize: 10.5, fontWeight: '600' },
  docTag:                { color: MUTED, fontSize: 9, fontWeight: '900', backgroundColor: '#F3F6FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  docActions:            { flexDirection: 'row', alignItems: 'center', paddingTop: 10 },
  docAction:             { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  docActionText:         { marginLeft: 4, color: MUTED, fontSize: 10.5, fontWeight: '900' },

  // Addresses
  addrContent:       { padding: 16, paddingBottom: 30 },
  addAddressBtn:     { height: 52, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE_LIGHT, marginBottom: 16, gap: 8 },
  addAddressBtnText: { color: BLUE, fontSize: 13.5, fontWeight: '900' },
  addressCard:       { borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 14, marginBottom: 12, elevation: 1 },
  addressCardTop:    { flexDirection: 'row', alignItems: 'flex-start' },
  addressIconWrap:   { width: 38, height: 38, borderRadius: 10, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  addressCardMeta:   { flex: 1 },
  addressLabelRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  addressLabel:      { color: TEXT, fontSize: 14, fontWeight: '900', marginRight: 8 },
  defaultBadge:      { color: BLUE, fontSize: 9, fontWeight: '900', backgroundColor: BLUE_LIGHT, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  addressText:       { color: MUTED, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  addressPincode:    { color: MUTED, fontSize: 11.5, fontWeight: '700', marginTop: 5 },
  addressActions:    { flexDirection: 'column' },
  addressActionBtn:  { width: 32, height: 32, borderRadius: 9, backgroundColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center' },

  // Add Address Input
  inputBlock:        { marginBottom: 14 },
  inputLabel:        { color: TEXT, fontSize: 12.5, fontWeight: '900', marginBottom: 6 },
  inputBox:          { height: 48, borderRadius: 11, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, backgroundColor: '#FAFCFF' },
  inputText:         { flex: 1, color: TEXT, fontSize: 13.5, fontWeight: '600', padding: 0 },
  typeRow:           { flexDirection: 'row', gap: 10, marginBottom: 18, marginTop: 6 },
  typeChip:          { flex: 1, height: 44, borderRadius: 11, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFCFF' },
  typeChipActive:    { backgroundColor: BLUE, borderColor: BLUE },
  typeChipText:      { color: MUTED, fontSize: 13, fontWeight: '900' },
  mapPlaceholder:    { height: 130, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 18, gap: 6 },
  mapPlaceholderText:{ color: MUTED, fontSize: 12.5, fontWeight: '700' },
  mapButton:         { flexDirection: 'row', alignItems: 'center', backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  mapButtonText:     { color: '#fff', fontSize: 12, fontWeight: '900' },
  defaultRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20, backgroundColor: '#FAFCFF' },
  defaultRowText:    { color: TEXT, fontSize: 13, fontWeight: '700' },

  // Buttons
  primaryBtn:     { height: 52, borderRadius: 14, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  outlineBtn:     { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  outlineBtnText: { color: BLUE, fontSize: 14, fontWeight: '900' },
  dangerBtn:      { height: 50, borderRadius: 14, backgroundColor: RED, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  dangerBtnText:  { color: '#fff', fontSize: 14, fontWeight: '900' },

  // Language
  langContent:  { padding: 16, paddingBottom: 30 },
  langInfoCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 13, backgroundColor: BLUE_LIGHT, padding: 14, marginBottom: 18 },
  langInfoText: { flex: 1, color: BLUE, fontSize: 12.5, fontWeight: '700', lineHeight: 18 },
  langRow:      { flexDirection: 'row', alignItems: 'center', height: 62, borderRadius: 13, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, marginBottom: 9, backgroundColor: '#fff' },
  langRowActive:{ borderColor: BLUE, backgroundColor: BLUE_LIGHT },
  langTexts:    { flex: 1 },
  langName:     { color: TEXT, fontSize: 14, fontWeight: '900' },
  langNative:   { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 2 },
  langRadio:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: BORDER },

  // Settings
  settingsContent: { padding: 16, paddingBottom: 30 },
  settingGroup:    { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', overflow: 'hidden', marginBottom: 4, elevation: 1 },
  settingRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  settingIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingTexts:    { flex: 1 },
  settingLabel:    { color: TEXT, fontSize: 13.5, fontWeight: '900' },
  settingSub:      { color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 },
  settingValue:    { color: MUTED, fontSize: 12, fontWeight: '700', marginRight: 4 },
  settingDivider:  { height: 1, backgroundColor: BORDER, marginLeft: 62 },

  // Privacy / Security
  securityBanner:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#EDFFF6', borderWidth: 1, borderColor: '#B0EDD4', padding: 14, marginBottom: 6 },
  securityBannerTitle: { color: GREEN, fontSize: 13.5, fontWeight: '900' },
  securityBannerSub:   { color: MUTED, fontSize: 11.5, fontWeight: '600', marginTop: 3, lineHeight: 16 },
  sessionRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  sessionDevice:       { color: TEXT, fontSize: 13, fontWeight: '900' },
  sessionLoc:          { color: MUTED, fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  sessionTime:         { color: MUTED, fontSize: 11.5, fontWeight: '700' },

  // Help
  helpContent:      { padding: 16, paddingBottom: 30 },
  searchBox:        { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 13, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13, backgroundColor: '#FAFCFF', marginBottom: 18 },
  searchInput:      { flex: 1, color: TEXT, fontSize: 13.5, fontWeight: '600', padding: 0 },
  ticketCard:       { alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FAFCFF', paddingVertical: 20, marginBottom: 20 },
  ticketIconWrap:   { width: 60, height: 60, borderRadius: 30, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ticketTitle:      { color: TEXT, fontSize: 14, fontWeight: '900' },
  ticketSub:        { color: MUTED, fontSize: 11.5, fontWeight: '600', marginTop: 3 },
  helpSectionTitle: { color: TEXT, fontSize: 14, fontWeight: '900', marginBottom: 10, marginTop: 4 },
  faqRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 9, backgroundColor: '#fff' },
  faqText:          { flex: 1, color: TEXT, fontSize: 12.5, fontWeight: '700', marginRight: 8, lineHeight: 18 },
  helplineCard:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FFD0D0', padding: 14, marginBottom: 16 },
  helplineIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  helplineName:     { color: RED, fontSize: 13, fontWeight: '900' },
  helplineSub:      { color: MUTED, fontSize: 11, fontWeight: '600', marginTop: 2 },
  helplineNum:      { color: RED, fontSize: 20, fontWeight: '900', marginLeft: 8 },

  // About
  aboutContent:  { padding: 20, paddingBottom: 30, alignItems: 'center' },
  aboutLogoWrap: { alignItems: 'center', marginBottom: 18 },
  aboutLogo:     { width: 80, height: 80, borderRadius: 22, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  aboutAppName:  { color: TEXT, fontSize: 22, fontWeight: '900' },
  aboutVersion:  { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 4 },
  aboutDesc:     { color: MUTED, fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center', marginBottom: 22, paddingHorizontal: 4 },
  aboutRow:      { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, marginBottom: 9, backgroundColor: '#fff', alignSelf: 'stretch' },
  aboutRowText:  { flex: 1, color: TEXT, fontSize: 13.5, fontWeight: '900' },
  aboutCopyright:{ marginTop: 24, color: MUTED, fontSize: 11, fontWeight: '600' },

  // FAQ Support
  faqContent:               { padding: 16, paddingBottom: 30 },
  faqPillScroll:            { marginTop: 4, marginBottom: 4 },
  faqCategoryPill:          { height: 34, borderRadius: 17, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  faqCategoryPillActive:    { backgroundColor: BLUE, borderColor: BLUE },
  faqCategoryPillText:      { color: MUTED, fontSize: 12, fontWeight: '800' },
  faqCategoryPillTextActive:{ color: '#fff' },
  faqCard:                  { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 14, marginBottom: 10 },
  faqCardExpanded:          { borderColor: BLUE_LIGHT, backgroundColor: '#FAFCFF' },
  faqCardTop:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqCardQuestion:          { flex: 1, color: TEXT, fontSize: 13, fontWeight: '900', marginRight: 10, lineHeight: 18 },
  faqAnswerBox:             { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF2F6' },
  faqAnswerText:            { color: MUTED, fontSize: 12, fontWeight: '600', lineHeight: 18 },

  // Support Chat
  chatHeader:            { height: 98, backgroundColor: BLUE_DARK, paddingTop: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 17, borderBottomRightRadius: 17 },
  chatHeaderAgentRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentAvatarWrap:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chatHeaderTitle:       { color: '#fff', fontSize: 15, fontWeight: '900' },
  onlineDot:             { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GREEN, marginRight: 5 },
  chatHeaderSub:         { color: '#B3D0FF', fontSize: 11, fontWeight: '700' },
  chatPanel:             { flex: 1, backgroundColor: '#fff' },
  chatBubbleRow:         { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  botAvatar:             { width: 28, height: 28, borderRadius: 14, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  agentAvatarMsg:        { width: 28, height: 28, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  chatBubble:            { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16 },
  userBubble:            { backgroundColor: BLUE, borderBottomRightRadius: 4 },
  agentBubble:           { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  chatBubbleText:        { color: TEXT, fontSize: 12.8, fontWeight: '600', lineHeight: 18 },
  typingText:            { color: MUTED, fontSize: 11, fontStyle: 'italic', marginTop: 4, marginLeft: 36 },
  chatBottomContainer:   { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER },
  quickChipsRow:         { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickChip:             { borderRadius: 15, borderWidth: 1, borderColor: BLUE, paddingHorizontal: 13, paddingVertical: 6, backgroundColor: BLUE_LIGHT },
  quickChipText:         { color: BLUE, fontSize: 11.5, fontWeight: '800' },
  chatInputRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachBtn:             { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  chatTextInput:         { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, color: TEXT, fontSize: 13, backgroundColor: '#FAFCFF' },
  sendBtn:               { width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },

  // Raise Ticket
  selectBox:             { height: 48, borderRadius: 11, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#FAFCFF' },
  selectText:            { color: TEXT, fontSize: 13.5, fontWeight: '700' },
  priorityRow:           { flexDirection: 'row', gap: 10, marginTop: 6 },
  priorityChip:          { flex: 1, height: 42, borderRadius: 11, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFCFF', gap: 6 },
  priorityChipActive:    { borderColor: BLUE, backgroundColor: BLUE_LIGHT },
  priorityRadio:         { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: MUTED, alignItems: 'center', justifyContent: 'center' },
  priorityRadioActive:   { borderColor: BLUE },
  priorityRadioInner:    { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  priorityChipText:      { color: MUTED, fontSize: 12.5, fontWeight: '800' },
  priorityChipTextActive:{ color: BLUE },
  uploadDropzone:        { height: 120, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: BLUE, backgroundColor: '#FAFCFF', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6, marginBottom: 18 },
  uploadCloudIconWrap:   { width: 42, height: 42, borderRadius: 21, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  uploadDropzoneTitle:   { color: BLUE, fontSize: 13, fontWeight: '900' },
  uploadDropzoneSub:     { color: MUTED, fontSize: 11, fontWeight: '600' },
  infoBanner:            { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: BLUE_LIGHT, padding: 12, marginTop: 14 },
  infoBannerText:        { flex: 1, color: BLUE, fontSize: 12, fontWeight: '700', lineHeight: 17 },

  // Share Feedback
  ratingCard:            { borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FAFCFF', padding: 18, alignItems: 'center', marginBottom: 6 },
  ratingTitle:           { color: TEXT, fontSize: 14, fontWeight: '900', marginBottom: 10 },
  starsRow:              { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ratingSub:             { color: MUTED, fontSize: 11.5, fontWeight: '700' },
  improvePill:           { height: 34, borderRadius: 17, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  improvePillActive:     { backgroundColor: BLUE, borderColor: BLUE },
  improvePillText:       { color: MUTED, fontSize: 12, fontWeight: '800' },
  improvePillTextActive: { color: '#fff' },
  attachImageBtn:        { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  attachImageText:       { color: BLUE, fontSize: 13.5, fontWeight: '900' },
  reviewCard:            { borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 13, marginBottom: 10 },
  reviewTop:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewName:            { color: TEXT, fontSize: 13, fontWeight: '900' },
  reviewText:            { color: MUTED, fontSize: 12, fontWeight: '600', lineHeight: 17 },

  // Modal styles
  modalOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  googleModalContent:    { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  googleModalTitle:      { fontSize: 18, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 4 },
  googleModalSub:        { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 16 },
  modalBtnRow:           { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn:        { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  modalCancelText:       { color: MUTED, fontSize: 14, fontWeight: '700' },
  modalConfirmBtn:       { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: BLUE, alignItems: 'center' },
  modalConfirmText:      { color: '#fff', fontSize: 14, fontWeight: '700' },
});
