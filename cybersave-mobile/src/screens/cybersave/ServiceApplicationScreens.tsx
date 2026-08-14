import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createApplicationApi, uploadDocumentApi } from '../../api/client';
import { launchImageLibrary } from 'react-native-image-picker';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import {
  Alert,
  Modal,
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

const BLUE = '#0877FF';
const BLUE_DARK = '#214CB4';
const TEXT = '#141B2D';
const MUTED = '#687792';
const BORDER = '#E2EAF4';
const BG = '#F2F6FC';
const GREEN = '#00A86B';
const RED = '#FF5B73';

// ─── Header with Step Progress Bar ───────────────────────────────────────────

const HeaderWithStep = ({ title, stepText, progressPercent, navigation }: any) => (
  <View style={styles.stepHeaderContainer}>
    <View style={styles.stepHeaderTopRow}>
      <TouchableOpacity
        style={styles.circleIconButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.82}
      >
        <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
      </TouchableOpacity>
      <Text style={styles.stepHeaderTitle}>{title}</Text>
      {stepText ? <Text style={styles.stepHeaderText}>{stepText}</Text> : <View style={{ width: 34 }} />}
    </View>
    {progressPercent != null ? (
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>
    ) : null}
  </View>
);

// ─── 1. Service Detail Screen ("Birth Certificate") ────────────────────────────

export const ServiceDetailScreen = ({ route, navigation }: any) => {
  const serviceTitle = route?.params?.title || 'Birth Certificate';

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
        <Text style={styles.headerCenterTitle}>{serviceTitle}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Official Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Official Birth Registry</Text>
            <Text style={styles.heroDesc}>
              Legally certified document by the Municipal Registrar of Births and Deaths.
            </Text>
          </View>
          <View style={styles.heroBadgeWrap}>
            <MaterialCommunityIcons name="medal-outline" size={26} color="#FFFFFF" />
          </View>
        </View>

        {/* About This Service */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>About This Service</Text>
          <Text style={styles.bodyText}>
            Get official Birth Certificates issued by state/central bodies. Crucial for school admissions, passport applications, and identity proofs.
          </Text>
        </View>

        {/* Eligibility */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>Eligibility</Text>
          <View style={styles.checkItemRow}>
            <MaterialCommunityIcons name="check" size={17} color={GREEN} />
            <Text style={styles.checkItemText}>Citizen of India</Text>
          </View>
          <View style={styles.checkItemRow}>
            <MaterialCommunityIcons name="check" size={17} color={GREEN} />
            <Text style={styles.checkItemText}>Birth occurred within state limits</Text>
          </View>
          <View style={styles.checkItemRow}>
            <MaterialCommunityIcons name="check" size={17} color={GREEN} />
            <Text style={styles.checkItemText}>Registered within 21 days (Standard fee)</Text>
          </View>
        </View>

        {/* Documents Required */}
        <View style={styles.infoSectionCard}>
          <Text style={styles.cardSectionTitle}>Documents Required</Text>
          <View style={styles.bulletItemRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Proof of Birth from Hospital</Text>
          </View>
          <View style={styles.bulletItemRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>ID Proof of Parents (Aadhaar/PAN)</Text>
          </View>
          <View style={styles.bulletItemRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Marriage Certificate of Parents</Text>
          </View>
          <View style={styles.bulletItemRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Address Proof (Utility Bill)</Text>
          </View>
        </View>

        {/* Fee & Time Row */}
        <View style={styles.metaRowContainer}>
          <View style={styles.metaBoxCard}>
            <Text style={styles.metaBoxLabel}>Government Fee</Text>
            <Text style={styles.metaBoxValueBlue}>₹50</Text>
          </View>
          <View style={styles.metaBoxCard}>
            <Text style={styles.metaBoxLabel}>Processing Time</Text>
            <Text style={styles.metaBoxValueDark}>7-15 Days</Text>
          </View>
        </View>

        {/* Apply Now Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ApplicationFill', { title: serviceTitle })}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Document Requirements per Service Category ────────────────────────────────

const SERVICE_DOCS: Record<string, { label: string; hint: string }[]> = {
  'Birth Certificate':    [{ label: 'Hospital Discharge / Birth Proof', hint: 'PDF/JPG/PNG, Max 5MB' }, { label: "Mother's Aadhaar Card", hint: 'Clear scan, PDF/JPG' }, { label: "Father's Aadhaar Card", hint: 'Clear scan, PDF/JPG' }, { label: 'Address Proof', hint: 'Electricity/Water bill, Rent deed' }],
  'Death Certificate':    [{ label: 'Doctor / Hospital Death Report', hint: 'PDF/JPG' }, { label: 'Aadhaar of Deceased', hint: 'Clear scan' }, { label: "Applicant's Aadhaar", hint: 'Clear scan' }],
  'Marriage Certificate': [{ label: 'Marriage Invitation / Proof', hint: 'PDF/JPG' }, { label: "Bride's Aadhaar", hint: 'Clear scan' }, { label: "Groom's Aadhaar", hint: 'Clear scan' }, { label: 'Wedding Photos (optional)', hint: 'JPG/PNG' }],
  'Aadhaar Card':         [{ label: 'Proof of Identity (POI)', hint: 'Passport / PAN / Voter ID' }, { label: 'Proof of Address (POA)', hint: 'Utility bill / Rent deed' }, { label: 'Proof of DOB', hint: 'Birth cert / School cert' }],
  'PAN Card':             [{ label: 'Proof of Identity', hint: 'Aadhaar / Passport' }, { label: 'Proof of Address', hint: 'Utility bill / Rent deed' }, { label: 'Proof of DOB', hint: 'Birth cert / Aadhaar' }],
  'Driving Licence':      [{ label: 'Proof of Address', hint: 'Aadhaar / Utility bill' }, { label: 'Proof of Age (DOB)', hint: 'Birth cert / Aadhaar' }, { label: 'Passport-size Photo', hint: 'JPG/PNG, white background' }, { label: 'Medical Certificate (Form 1A)', hint: 'From registered doctor' }],
  'Passport':             [{ label: 'Proof of Identity', hint: 'Aadhaar / PAN / Voter ID' }, { label: 'Proof of Address', hint: 'Aadhaar / Utility bill' }, { label: 'Proof of Date of Birth', hint: 'Birth cert / Aadhaar' }],
  'Voter ID':             [{ label: 'Proof of Age', hint: 'Aadhaar / Birth cert' }, { label: 'Proof of Address', hint: 'Utility bill / Aadhaar' }],
  'Caste Certificate':    [{ label: 'Caste Proof of Parent', hint: 'Father/Mother caste cert' }, { label: "Father's Aadhaar", hint: 'Clear scan' }, { label: 'School Certificate (caste field)', hint: 'TC/Marksheet showing caste' }],
  'Income Certificate':   [{ label: 'Income Proof', hint: 'Salary slip / ITR / Bank passbook' }, { label: 'Aadhaar Card', hint: 'Clear scan' }, { label: 'Address Proof', hint: 'Utility bill / Rent deed' }],
  'Domicile Certificate': [{ label: 'Residence Proof', hint: 'Utility bill / Rent deed' }, { label: 'Aadhaar Card', hint: 'Clear scan' }, { label: 'School/College Certificate from state', hint: 'TC with state address' }],
  'Update Address':       [{ label: 'New Address Proof', hint: 'Utility bill, Rent Agreement, Voter ID' }, { label: 'Aadhaar Card', hint: 'Clear scan of current Aadhaar' }],
  'Update Mobile':        [{ label: 'Biometric Verification', hint: 'Fingerprint/Iris at center' }, { label: 'Aadhaar Card', hint: 'Clear scan' }],
  'Update Name':          [{ label: 'Proof of Identity (New Name)', hint: 'Passport, PAN, Voter ID, Driving License' }, { label: 'Aadhaar Card', hint: 'Clear scan of current Aadhaar' }],
  'Download e-Aadhaar':   [{ label: 'Aadhaar Number / Enrolment ID', hint: 'Required for OTP verification' }],
  'Check Status':         [],
  'Book Appointment':     [],
  'Verify Aadhaar':       [],
  'Link Bank Account':    [{ label: 'Bank Passbook / Statement', hint: 'Clear scan showing account details' }, { label: 'Aadhaar Card', hint: 'Clear scan' }],
};

const DEFAULT_DOCS = [
  { label: 'Government-Issued Identity Proof', hint: 'Aadhaar / PAN / Passport / Voter ID' },
  { label: 'Address Proof', hint: 'Utility bill / Rent deed / Aadhaar' },
  { label: 'Application Supporting Document', hint: 'Relevant cert / proof for this service' },
];

const CLOUDINARY_CLOUD_NAME = 'dzo4caeef';
const CLOUDINARY_UPLOAD_PRESET = 'cybersave_docs';

// ─── 2. Application Fill Screen ("Apply Birth Certificate - Step 1/5") ──────────

export const ApplicationFillScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const serviceTitle = route?.params?.title || 'Birth Certificate';

  const [fullName, setFullName] = useState(user?.fullName || (user?.email ? user.email.split('@')[0] : ''));
  const [dob, setDob] = useState((user as any)?.dob || '');
  const [gender, setGender] = useState((user as any)?.gender || '');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');

  const [stateName, setStateName] = useState((user as any)?.state || '');
  const [district, setDistrict] = useState((user as any)?.district || '');
  const [pinCode, setPinCode] = useState((user as any)?.pinCode || '');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithStep
        title={`Apply ${serviceTitle}`}
        stepText="Step 1/5"
        progressPercent={20}
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainerCard}>
          {/* Section: Personal Details */}
          <Text style={styles.formSectionHeading}>Personal Details</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.textInputBox}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
            />
          </View>

          <View style={styles.fieldRowTwo}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>DOB</Text>
              <TextInput
                style={styles.textInputBox}
                value={dob}
                onChangeText={setDob}
                placeholder="DD/MM/YYYY"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <TextInput
                style={styles.textInputBox}
                value={gender}
                onChangeText={setGender}
                placeholder="Male/Female"
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Father's Name</Text>
            <TextInput
              style={styles.textInputBox}
              value={fatherName}
              onChangeText={setFatherName}
              placeholder="Enter father's name"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Mother's Name</Text>
            <TextInput
              style={styles.textInputBox}
              value={motherName}
              onChangeText={setMotherName}
              placeholder="Enter mother's name"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Place of Birth</Text>
            <TextInput
              style={styles.textInputBox}
              value={placeOfBirth}
              onChangeText={setPlaceOfBirth}
              placeholder="Hospital/Location name"
            />
          </View>

          {/* Section: Address Details */}
          <Text style={[styles.formSectionHeading, { marginTop: 22 }]}>Address Details</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>State</Text>
            <TextInput
              style={styles.textInputBox}
              value={stateName}
              onChangeText={setStateName}
              placeholder="State name"
            />
          </View>

          <View style={styles.fieldRowTwo}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>District</Text>
              <TextInput
                style={styles.textInputBox}
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>PIN Code</Text>
              <TextInput
                style={styles.textInputBox}
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="numeric"
                placeholder="110001"
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 20 }]}
          onPress={() =>
            navigation.navigate('UploadDocuments', {
              title: serviceTitle,
              formData: { fullName, dob, gender, fatherName, motherName, placeOfBirth, stateName, district, pinCode },
            })
          }
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryLinkButton} activeOpacity={0.75}>
          <Text style={styles.secondaryLinkText}>Save Draft</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 3. Upload Documents Screen (Real Cloudinary Upload) ─────────────────────

export const UploadDocumentsScreen = ({ route, navigation }: any) => {
  const serviceTitle = route?.params?.title || 'Birth Certificate';
  const formData = route?.params?.formData || {};

  const docsRequired = SERVICE_DOCS[serviceTitle] || DEFAULT_DOCS;

  // uploadedDocs: array of { fileName, fileUrl, uploading, error }
  const [uploadedDocs, setUploadedDocs] = useState<{
    fileName: string;
    fileUrl: string;
    uploading: boolean;
    error: string | null;
  }[]>(docsRequired.map(() => ({ fileName: '', fileUrl: '', uploading: false, error: null })));

  const [submitting, setSubmitting] = useState(false);

  const pickAndUploadDocument = async (index: number) => {
    try {
      launchImageLibrary(
        { mediaType: 'mixed', includeBase64: true, quality: 0.8 },
        async (response: any) => {
          if (response.didCancel || response.errorCode) return;
          const asset = response.assets?.[0];
          if (!asset) return;

          const fileName = asset.fileName || `doc_${Date.now()}.jpg`;
          const base64Data = asset.base64;
          const mimeType = asset.type || 'image/jpeg';

          if (!base64Data) {
            Alert.alert('Error', 'Could not read file. Try another file.');
            return;
          }

          // Update uploading state
          setUploadedDocs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], uploading: true, error: null, fileName };
            return updated;
          });

          try {
            // Upload to Cloudinary directly from mobile via unsigned preset
            const formDataCld = new FormData();
            formDataCld.append('file', `data:${mimeType};base64,${base64Data}`);
            formDataCld.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formDataCld.append('folder', 'cybersave/documents');

            const cldRes = await fetch(
              `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
              { method: 'POST', body: formDataCld }
            );

            const cldData = await cldRes.json();

            if (!cldData.secure_url) {
              throw new Error(cldData.error?.message || 'Cloudinary upload failed');
            }

            setUploadedDocs(prev => {
              const updated = [...prev];
              updated[index] = { fileName, fileUrl: cldData.secure_url, uploading: false, error: null };
              return updated;
            });
          } catch (uploadErr: any) {
            setUploadedDocs(prev => {
              const updated = [...prev];
              updated[index] = { ...updated[index], uploading: false, error: uploadErr?.message || 'Upload failed' };
              return updated;
            });
            Alert.alert('Upload Failed', uploadErr?.message || 'Could not upload file. Check your connection and try again.');
          }
        }
      );
    } catch (e: any) {
      Alert.alert('Picker Error', e?.message || 'Could not open file picker.');
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocs(prev => {
      const updated = [...prev];
      updated[index] = { fileName: '', fileUrl: '', uploading: false, error: null };
      return updated;
    });
  };

  const handleContinue = async () => {
    const requiredCount = docsRequired.length;
    const uploadedCount = uploadedDocs.filter(d => !!d.fileUrl).length;

    if (uploadedCount < requiredCount) {
      Alert.alert(
        'Documents Required',
        `Please upload all ${requiredCount} required documents before proceeding. (${uploadedCount}/${requiredCount} uploaded)`
      );
      return;
    }

    setSubmitting(true);
    try {
      // Save each uploaded document to backend
      await Promise.all(
        uploadedDocs.map((doc, i) =>
          uploadDocumentApi({
            fileName: doc.fileName || docsRequired[i].label,
            fileUrl: doc.fileUrl,
            fileType: 'document',
          })
        )
      );
    } catch (e) {
      console.warn('Document metadata save error (non-blocking):', e);
    }
    setSubmitting(false);

    navigation.navigate('ReviewApplication', {
      title: serviceTitle,
      formData,
      uploadedDocs: uploadedDocs.map((d, i) => ({
        label: docsRequired[i].label,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
      })),
    });
  };

  const allUploaded = uploadedDocs.every(d => !!d.fileUrl);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithStep
        title="Upload Proofs"
        stepText="Step 2/5"
        progressPercent={40}
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainerCard}>
          <Text style={styles.formSectionHeading}>Required Documents</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
            Upload clear scans or photos. Supported: PDF, JPEG, PNG (Max 5MB each).
          </Text>

          {docsRequired.map((doc, index) => {
            const uploaded = uploadedDocs[index];
            const isUploaded = !!uploaded?.fileUrl;
            const isUploading = !!uploaded?.uploading;
            const hasError = !!uploaded?.error;

            return (
              <View key={index} style={styles.uploadBlock}>
                <View style={styles.uploadLabelRow}>
                  <Text style={[styles.fieldLabel, { flex: 1 }]}>{doc.label}</Text>
                  {isUploaded && <MaterialCommunityIcons name="check-circle" size={18} color={GREEN} />}
                  {hasError && <MaterialCommunityIcons name="alert-circle" size={18} color={RED} />}
                </View>

                {isUploaded ? (
                  <View style={styles.uploadedFileBox}>
                    <MaterialCommunityIcons name="file-document-outline" size={20} color={BLUE} />
                    <Text style={styles.uploadedFileName} numberOfLines={1}>{uploaded.fileName}</Text>
                    <TouchableOpacity onPress={() => removeDocument(index)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={RED} />
                    </TouchableOpacity>
                  </View>
                ) : isUploading ? (
                  <View style={[styles.emptyUploadBox, { flexDirection: 'row', gap: 10 }]}>
                    <ActivityIndicator size="small" color={BLUE} />
                    <Text style={{ color: BLUE, fontSize: 12 }}>Uploading to Cloudinary...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.emptyUploadBox, hasError && { borderColor: RED }]}
                    onPress={() => pickAndUploadDocument(index)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="upload-outline" size={22} color={hasError ? RED : MUTED} />
                    <Text style={[styles.emptyUploadText, hasError && { color: RED }]}>
                      {hasError ? 'Tap to retry — ' + uploaded.error : `Tap to upload — ${doc.hint}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Progress summary */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 4, gap: 8 }}>
          <MaterialCommunityIcons
            name={allUploaded ? 'check-circle' : 'information-outline'}
            size={16}
            color={allUploaded ? GREEN : MUTED}
          />
          <Text style={{ fontSize: 12, color: allUploaded ? GREEN : MUTED, fontWeight: '600' }}>
            {uploadedDocs.filter(d => !!d.fileUrl).length} of {docsRequired.length} documents uploaded
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 16, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleContinue}
          activeOpacity={0.86}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryButtonText}>Continue to Review</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 4. Review Application Screen ("Review Details - Step 3/5") ────────────────

export const ReviewApplicationScreen = ({ route, navigation }: any) => {
  const serviceTitle = route?.params?.title || 'Birth Certificate';
  const formData = route?.params?.formData || {};

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithStep
        title="Review Details"
        stepText="Step 3/5"
        progressPercent={60}
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.reviewMainHeading}>Review Application</Text>

        {/* Card 1: Personal Details */}
        <View style={styles.reviewCardContainer}>
          <View style={styles.reviewCardHeaderRow}>
            <Text style={styles.reviewCardTitle}>Personal Details</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ApplicationFill', { title: serviceTitle })}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>Full Name</Text>
            <Text style={styles.reviewDetailValue}>{formData.fullName || 'N/A'}</Text>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>Father's Name</Text>
            <Text style={styles.reviewDetailValue}>{formData.fatherName || 'N/A'}</Text>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>Place of Birth</Text>
            <Text style={styles.reviewDetailValue}>{formData.placeOfBirth || 'N/A'}</Text>
          </View>
        </View>

        {/* Card 2: Address Details */}
        <View style={styles.reviewCardContainer}>
          <View style={styles.reviewCardHeaderRow}>
            <Text style={styles.reviewCardTitle}>Address Details</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ApplicationFill', { title: serviceTitle })}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>State</Text>
            <Text style={styles.reviewDetailValue}>{formData.stateName || 'N/A'}</Text>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>District</Text>
            <Text style={styles.reviewDetailValue}>{formData.district || 'N/A'}</Text>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>PIN Code</Text>
            <Text style={styles.reviewDetailValue}>{formData.pinCode || 'N/A'}</Text>
          </View>
        </View>

        {/* Card 3: Uploaded Documents */}
        <View style={styles.reviewCardContainer}>
          <View style={styles.reviewCardHeaderRow}>
            <Text style={styles.reviewCardTitle}>Uploaded Documents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UploadDocuments', { title: serviceTitle, formData })}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          {route?.params?.uploadedDocs?.map((doc: any, index: number) => (
            <View style={styles.docItemRow} key={index}>
              <MaterialCommunityIcons name="file-document-outline" size={17} color={BLUE} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.docItemText} numberOfLines={1}>
                  {doc.fileName || doc.label}
                </Text>
                <Text style={{ fontSize: 11, color: '#6B7280' }}>
                  {doc.label}
                </Text>
              </View>
            </View>
          )) || (
            <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>No documents uploaded</Text>
          )}
        </View>

        {/* Card 4: Payment Summary */}
        <View style={styles.reviewCardContainer}>
          <Text style={styles.reviewCardTitle}>Payment Summary</Text>
          <View style={[styles.reviewDetailRow, { marginTop: 10 }]}>
            <Text style={styles.reviewDetailLabel}>Government Fee</Text>
            <Text style={styles.reviewDetailValue}>₹50.00</Text>
          </View>
          <View style={styles.reviewDetailRow}>
            <Text style={styles.reviewDetailLabel}>Convenience Fee</Text>
            <Text style={styles.reviewDetailValue}>₹5.00</Text>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.reviewDetailRow}>
            <Text style={styles.totalPayableLabel}>Total Payable</Text>
            <Text style={styles.totalPayableValue}>₹55.00</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 20 }]}
          onPress={() => navigation.navigate('PaymentGateway', { title: serviceTitle, formData, uploadedDocs: route.params?.uploadedDocs })}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 5. Payment Gateway Screen ("Step 4/5") ──────────────────────────────────

export const PaymentGatewayScreen = ({ route, navigation }: any) => {
  const serviceTitle = route?.params?.title || 'Birth Certificate';
  const formData = route?.params?.formData || {};
  const uploadedDocs = route?.params?.uploadedDocs || [];
  
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [upiId, setUpiId] = useState('username@okhdfcbank');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <HeaderWithStep
        title="Payment Gateway"
        stepText="Step 4/5"
        progressPercent={80}
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {/* Blue Summary Card */}
        <View style={styles.paymentSummaryCardBlue}>
          <View style={styles.paymentSummaryTextCol}>
            <Text style={styles.paymentSummarySubText}>Payment for {serviceTitle}</Text>
            <Text style={styles.paymentSummaryMainText}>Application CSC-2024</Text>
          </View>
          <Text style={styles.paymentSummaryAmount}>₹55</Text>
        </View>

        <Text style={styles.formSectionHeading}>Select Payment Method</Text>

        {/* Option 1: UPI */}
        <TouchableOpacity
          style={[styles.paymentMethodBox, selectedMethod === 'upi' && styles.paymentMethodBoxSelected]}
          onPress={() => setSelectedMethod('upi')}
          activeOpacity={0.84}
        >
          <View style={styles.paymentMethodHeaderRow}>
            <View style={[styles.radioCircle, selectedMethod === 'upi' && styles.radioCircleSelected]}>
              {selectedMethod === 'upi' ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentMethodTitle}>UPI</Text>
              <Text style={styles.paymentMethodSubtitle}>Google Pay, PhonePe, Paytm</Text>
            </View>
            <MaterialCommunityIcons name="dots-horizontal" size={20} color={MUTED} />
          </View>

          {selectedMethod === 'upi' ? (
            <View style={styles.upiInputContainer}>
              <Text style={styles.upiInputLabel}>Enter UPI ID</Text>
              <TextInput
                style={styles.textInputBox}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="username@bank"
              />
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Option 2: Credit / Debit Card */}
        <TouchableOpacity
          style={[styles.paymentMethodBox, selectedMethod === 'card' && styles.paymentMethodBoxSelected]}
          onPress={() => setSelectedMethod('card')}
          activeOpacity={0.84}
        >
          <View style={styles.paymentMethodHeaderRow}>
            <View style={[styles.radioCircle, selectedMethod === 'card' && styles.radioCircleSelected]}>
              {selectedMethod === 'card' ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentMethodTitle}>Credit / Debit Card</Text>
              <Text style={styles.paymentMethodSubtitle}>Visa, MasterCard, RuPay</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 3: Net Banking */}
        <TouchableOpacity
          style={[styles.paymentMethodBox, selectedMethod === 'netbanking' && styles.paymentMethodBoxSelected]}
          onPress={() => setSelectedMethod('netbanking')}
          activeOpacity={0.84}
        >
          <View style={styles.paymentMethodHeaderRow}>
            <View style={[styles.radioCircle, selectedMethod === 'netbanking' && styles.radioCircleSelected]}>
              {selectedMethod === 'netbanking' ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentMethodTitle}>Net Banking</Text>
              <Text style={styles.paymentMethodSubtitle}>SBI, HDFC, ICICI, Axis</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 4: Wallets */}
        <TouchableOpacity
          style={[styles.paymentMethodBox, selectedMethod === 'wallets' && styles.paymentMethodBoxSelected]}
          onPress={() => setSelectedMethod('wallets')}
          activeOpacity={0.84}
        >
          <View style={styles.paymentMethodHeaderRow}>
            <View style={[styles.radioCircle, selectedMethod === 'wallets' && styles.radioCircleSelected]}>
              {selectedMethod === 'wallets' ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.paymentMethodTitle}>Wallets</Text>
              <Text style={styles.paymentMethodSubtitle}>Amazon Pay, Mobikwik</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 22 }]}
          onPress={() => navigation.navigate('PaymentPortal', { title: serviceTitle, formData, uploadedDocs })}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Pay ₹55 Securely</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 6. Payment Portal Gateway Screen ("Secure Portal Gateway") ────────────────

export const PaymentPortalScreen = ({ route, navigation }: any) => {
  const serviceTitle = route?.params?.title || 'Birth Certificate';
  const formData = route?.params?.formData || {};
  const uploadedDocs = route?.params?.uploadedDocs || [];
  const { user } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [selectedApp, setSelectedApp] = useState('Google Pay');
  const [upiId, setUpiId] = useState('rajeshkumar@okaxis');
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async () => {
    // Ponytail: test key for Razorpay, bypassing backend order creation since it's just a test scheme flow
    var options = {
      description: serviceTitle,
      image: 'https://cdn-icons-png.flaticon.com/512/3031/3031293.png',
      currency: 'INR',
      key: 'rzp_test_zVwTfVzPZZVvKj', // Dummy public test key
      amount: '5500',
      name: 'CyberSave E-Gov',
      prefill: {
        email: user?.email || 'test@cybersave.app',
        contact: user?.phone || '9999999999',
        name: user?.fullName || 'Citizen'
      },
      theme: { color: BLUE_DARK }
    };

    try {
      const data = await RazorpayCheckout.open(options);
      // Payment successful
      setIsPaying(true);
      const result = await createApplicationApi({
        userId: user?.id || 'default-user-id',
        serviceTitle,
        formData,
        documents: uploadedDocs,
        feePaid: 55.0,
      });
      setIsPaying(false);
      
      navigation.navigate('PaymentSuccess', { 
        title: serviceTitle, 
        refNumber: data.razorpay_payment_id || result?.refNumber || `CSB${Date.now().toString().slice(-8)}`
      });
    } catch (error: any) {
      // Payment failed or cancelled
      Alert.alert('Payment Cancelled/Failed', error.description || 'Payment did not complete.');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={BLUE_DARK} barStyle="light-content" />
      <View style={styles.blueHeaderWithSub}>
        <TouchableOpacity
          style={styles.circleIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.82}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerMainTitle}>Payment</Text>
          <Text style={styles.headerSubtitle}>Secure Portal Gateway</Text>
        </View>
        <TouchableOpacity style={styles.circleIconButton} activeOpacity={0.82}>
          <MaterialCommunityIcons name="help-circle-outline" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {/* Bill Reference Card */}
        <View style={styles.billReferenceCard}>
          <Text style={styles.billRefSubText}>Bill Reference: {serviceTitle} / Rajesh Kumar</Text>
          <View style={styles.billRefRow}>
            <Text style={styles.billRefLabel}>Grand Total Due</Text>
            <Text style={styles.billRefAmount}>Rs 55.00</Text>
          </View>
        </View>

        <Text style={styles.formSectionHeading}>Select Payment Method</Text>

        {/* Method 1: UPI */}
        <View style={[styles.paymentMethodBox, selectedMethod === 'upi' && styles.paymentMethodBoxSelected]}>
          <TouchableOpacity
            style={styles.paymentMethodHeaderRow}
            onPress={() => setSelectedMethod('upi')}
            activeOpacity={0.84}
          >
            <View style={[styles.radioCircle, selectedMethod === 'upi' && styles.radioCircleSelected]}>
              {selectedMethod === 'upi' ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={[styles.paymentMethodTitle, { marginLeft: 10 }]}>
              Unified Payments Interface (UPI)
            </Text>
          </TouchableOpacity>

          {selectedMethod === 'upi' ? (
            <View style={styles.upiDetailsContainer}>
              <View style={styles.upiAppsRow}>
                {['Google Pay', 'PhonePe', 'BHIM UPI'].map(app => {
                  const isActive = selectedApp === app;
                  return (
                    <TouchableOpacity
                      key={app}
                      style={[styles.upiAppPill, isActive && styles.upiAppPillActive]}
                      onPress={() => setSelectedApp(app)}
                    >
                      <Text style={[styles.upiAppText, isActive && styles.upiAppTextActive]}>
                        {app}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.upiInputLabel}>Or enter UPI ID</Text>
              <View style={styles.upiVerifyInputRow}>
                <TextInput
                  style={styles.upiVerifyInput}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="name@upi"
                />
                <TouchableOpacity activeOpacity={0.8}>
                  <Text style={styles.verifyLink}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Method 2: Card */}
        <TouchableOpacity
          style={styles.paymentMethodChevronBox}
          onPress={() => setSelectedMethod('card')}
          activeOpacity={0.84}
        >
          <View style={styles.radioCircle}>
            {selectedMethod === 'card' ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={styles.paymentChevronTitle}>Debit / Credit Card</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
        </TouchableOpacity>

        {/* Method 3: Net Banking */}
        <TouchableOpacity
          style={styles.paymentMethodChevronBox}
          onPress={() => setSelectedMethod('netbanking')}
          activeOpacity={0.84}
        >
          <View style={styles.radioCircle}>
            {selectedMethod === 'netbanking' ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={styles.paymentChevronTitle}>Net Banking</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
        </TouchableOpacity>

        {/* Method 4: Govt Wallet Balance */}
        <TouchableOpacity
          style={styles.paymentMethodChevronBox}
          onPress={() => setSelectedMethod('wallet')}
          activeOpacity={0.84}
        >
          <View style={styles.radioCircle}>
            {selectedMethod === 'wallet' ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={styles.paymentChevronTitle}>Govt Wallet Balance</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={MUTED} />
        </TouchableOpacity>

        {/* Security Badge */}
        <View style={styles.sslSecurityRow}>
          <MaterialCommunityIcons name="lock-outline" size={16} color={GREEN} />
          <Text style={styles.sslSecurityText}>256-Bit SSL Secured Encryption Connection</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 20 }]}
          onPress={handlePay}
          activeOpacity={0.86}
          disabled={isPaying}
        >
          {isPaying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Pay Rs 55.00</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── 7. Payment Success Screen ("Application Submitted Successfully!") ────────

export const PaymentSuccessScreen = ({ route, navigation }: any) => {
  const serviceTitle = route?.params?.title || 'Birth Certificate';
  const refNumber = route?.params?.refNumber || `CSB${Date.now().toString().slice(-8)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={styles.fullBlueScreen}>
      <StatusBar backgroundColor="#0877FF" barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.successContentContainer} showsVerticalScrollIndicator={false}>
        {/* White Check Circle */}
        <View style={styles.successBigCheckCircle}>
          <MaterialCommunityIcons name="check" size={38} color={BLUE} />
        </View>

        {/* Main Banner Message */}
        <Text style={styles.successMainTitle}>Application Submitted{'\n'}Successfully!</Text>
        <Text style={styles.successSubTitle}>
          Your request has been filed with the Municipal Health Department.
        </Text>

        {/* Center White Reference Card */}
        <View style={styles.successRefCard}>
          <Text style={styles.successRefHeaderLabel}>Application Reference Number</Text>
          <Text style={styles.successRefNumber}>{refNumber}</Text>

          <View style={styles.dashedDivider} />

          <View style={styles.successDetailRow}>
            <Text style={styles.successDetailLabel}>Service Name</Text>
            <Text style={styles.successDetailValue}>{serviceTitle}</Text>
          </View>
          <View style={styles.successDetailRow}>
            <Text style={styles.successDetailLabel}>Date of Submission</Text>
            <Text style={styles.successDetailValue}>{dateStr}</Text>
          </View>
          <View style={styles.successDetailRow}>
            <Text style={styles.successDetailLabel}>Est. Completion</Text>
            <Text style={[styles.successDetailValue, { color: GREEN }]}>7-10 Days</Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.successActionContainer}>
          <TouchableOpacity
            style={styles.whiteButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.88}
          >
            <Text style={styles.whiteButtonText}>Track Application Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whiteOutlineButton}
            onPress={() => Alert.alert('Download Receipt', 'Receipt #CSB2024001234 downloaded successfully.')}
            activeOpacity={0.84}
          >
            <Text style={styles.whiteOutlineButtonText}>Download Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToHomeLink}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.78}
          >
            <Text style={styles.backToHomeLinkText}>Back to Home Dashboard</Text>
          </TouchableOpacity>
        </View>
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

  // Step Header with Progress Bar
  stepHeaderContainer: {
    height: 104,
    backgroundColor: BLUE_DARK,
    paddingTop: 40,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  stepHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
  stepHeaderText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },

  // Blue Header with Subtitle
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

  // Detail Screen Layout
  detailContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    backgroundColor: BLUE,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  heroTextCol: { flex: 1, marginRight: 12 },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginBottom: 5 },
  heroDesc: { color: 'rgba(255,255,255,0.88)', fontSize: 11.5, lineHeight: 16, fontWeight: '500' },
  heroBadgeWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Cards
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
  cardSectionTitle: { color: TEXT, fontSize: 14.5, fontWeight: '800', marginBottom: 10 },
  bodyText: { color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  checkItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkItemText: { marginLeft: 8, color: TEXT, fontSize: 12, fontWeight: '600' },
  bulletItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  bulletDot: { color: BLUE, fontSize: 14, marginRight: 8, marginTop: -1 },
  bulletText: { color: TEXT, fontSize: 12, fontWeight: '600' },

  // Fee & Time Row
  metaRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  metaBoxCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 14,
    alignItems: 'flex-start',
  },
  metaBoxLabel: { color: MUTED, fontSize: 10.5, fontWeight: '700', marginBottom: 4 },
  metaBoxValueBlue: { color: BLUE, fontSize: 18, fontWeight: '900' },
  metaBoxValueDark: { color: TEXT, fontSize: 15, fontWeight: '900' },

  // Form Container Card
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 18,
    shadowColor: '#0E2554',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  formSectionHeading: { color: TEXT, fontSize: 15.5, fontWeight: '900', marginBottom: 14, marginTop: 6 },
  fieldBlock: { marginBottom: 14 },
  fieldRowTwo: { flexDirection: 'row', gap: 12 },
  fieldLabel: { color: TEXT, fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
  textInputBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE7F3',
    backgroundColor: '#FAFCFF',
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Upload Screen Styles
  uploadBlock: { marginBottom: 16 },
  uploadLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  uploadedFileBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLUE,
    backgroundColor: '#F0F6FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  uploadedFileName: { flex: 1, marginLeft: 10, color: TEXT, fontSize: 12, fontWeight: '600' },
  emptyUploadBox: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#C6D7ED',
    backgroundColor: '#FAFCFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyUploadText: { color: MUTED, fontSize: 11, fontWeight: '600' },

  // Review Screen Styles
  reviewMainHeading: { color: TEXT, fontSize: 16.5, fontWeight: '900', marginBottom: 14, marginTop: 4 },
  reviewCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0E2554',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  reviewCardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reviewCardTitle: { color: TEXT, fontSize: 14, fontWeight: '800' },
  editLink: { color: BLUE, fontSize: 12, fontWeight: '800' },
  reviewDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewDetailLabel: { color: MUTED, fontSize: 11.5, fontWeight: '600' },
  reviewDetailValue: { color: TEXT, fontSize: 11.5, fontWeight: '800' },
  docItemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  docItemText: { marginLeft: 8, color: TEXT, fontSize: 11.5, fontWeight: '600' },
  dividerLine: { height: 1, backgroundColor: '#EBF1F9', marginVertical: 10 },
  totalPayableLabel: { color: TEXT, fontSize: 13, fontWeight: '900' },
  totalPayableValue: { color: BLUE, fontSize: 15, fontWeight: '900' },

  // Payment Screen Styles
  paymentSummaryCardBlue: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  paymentSummaryTextCol: { flex: 1 },
  paymentSummarySubText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  paymentSummaryMainText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 3 },
  paymentSummaryAmount: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },

  paymentMethodBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 15,
    marginBottom: 12,
    shadowColor: '#0E2554',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  paymentMethodBoxSelected: {
    borderColor: BLUE,
    borderWidth: 1.5,
    backgroundColor: '#FAFCFF',
  },
  paymentMethodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: BLUE,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE,
  },
  paymentMethodTitle: { color: TEXT, fontSize: 13.5, fontWeight: '800' },
  paymentMethodSubtitle: { color: MUTED, fontSize: 10.5, fontWeight: '500', marginTop: 2 },
  upiInputContainer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF4FC' },
  upiInputLabel: { color: TEXT, fontSize: 11, fontWeight: '700', marginBottom: 6 },

  // Payment Portal Styles
  billReferenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#0E2554',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  billRefSubText: { color: MUTED, fontSize: 11, fontWeight: '600', marginBottom: 8 },
  billRefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billRefLabel: { color: TEXT, fontSize: 13, fontWeight: '900' },
  billRefAmount: { color: BLUE, fontSize: 18, fontWeight: '900' },

  upiDetailsContainer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF4FC' },
  upiAppsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  upiAppPill: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE7F3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiAppPillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  upiAppText: { color: MUTED, fontSize: 10.5, fontWeight: '700' },
  upiAppTextActive: { color: '#FFFFFF' },

  upiVerifyInputRow: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE7F3',
    backgroundColor: '#FAFCFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  upiVerifyInput: { flex: 1, color: TEXT, fontSize: 12, paddingVertical: 0 },
  verifyLink: { color: BLUE, fontSize: 12, fontWeight: '800' },

  paymentMethodChevronBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EEF6',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentChevronTitle: { flex: 1, marginLeft: 12, color: TEXT, fontSize: 13.5, fontWeight: '800' },
  sslSecurityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  sslSecurityText: { marginLeft: 6, color: GREEN, fontSize: 11, fontWeight: '700' },

  // Success Screen Styles
  fullBlueScreen: {
    flex: 1,
    backgroundColor: BLUE,
  },
  successContentContainer: {
    paddingHorizontal: 22,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successBigCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  successMainTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  successRefCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  successRefHeaderLabel: { color: MUTED, fontSize: 10.5, fontWeight: '700', marginBottom: 4 },
  successRefNumber: { color: TEXT, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  dashedDivider: { height: 1, borderWidth: 0.8, borderColor: '#DDE7F3', borderStyle: 'dashed', marginVertical: 14 },
  successDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  successDetailLabel: { color: MUTED, fontSize: 11.5, fontWeight: '600' },
  successDetailValue: { color: TEXT, fontSize: 11.5, fontWeight: '800' },

  successActionContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  whiteButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  whiteButtonText: { color: BLUE, fontSize: 14, fontWeight: '800' },
  whiteOutlineButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteOutlineButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  backToHomeLink: { paddingTop: 10, paddingBottom: 6 },
  backToHomeLinkText: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '700' },

  // Buttons
  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryLinkButton: { alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 6 },
  secondaryLinkText: { color: BLUE, fontSize: 12.5, fontWeight: '800' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,20,38,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContentCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  modalText: { color: MUTED, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginBottom: 20 },
  modalButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
});
