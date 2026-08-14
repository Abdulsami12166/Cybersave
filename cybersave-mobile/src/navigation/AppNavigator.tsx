import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { CyberSplashScreen } from '../screens/cybersave/CyberSplashScreen';
import { CyberOnboardingScreen } from '../screens/cybersave/CyberOnboardingScreen';
import {
  LanguageScreen,
  LoginScreen,
  OtpScreen,
  RegisterScreen,
} from '../screens/cybersave/CyberAuthScreens';
import {
  CyberbotChatScreen,
  HomeScreen,
  NotificationsScreen,
  SchemesScreen,
} from '../screens/cybersave/CyberMainScreens';
import { WalletHomeScreen } from '../screens/cybersave/WalletHomeScreen';
import { TransactionHistoryScreen } from '../screens/cybersave/TransactionHistoryScreen';
import { AadhaarOkycScreen } from '../screens/cybersave/AadhaarOkycScreen';
import { TransactionDetailsScreen } from '../screens/cybersave/TransactionDetailsScreen';
import { AddMoneyScreen } from '../screens/cybersave/AddMoneyScreen';
import { RefundDetailsScreen } from '../screens/cybersave/RefundDetailsScreen';
import {
  AboutAppScreen,
  AddAddressScreen,
  FaqSupportScreen,
  HelpSupportScreen,
  LanguageScreen as ProfileLanguageScreen,
  MyAddressesScreen,
  MyDocumentsScreen,
  PersonalInformationScreen,
  PrivacySecurityScreen,
  ProfileScreen,
  RaiseTicketScreen,
  SettingsScreen,
  ShareFeedbackScreen,
  SupportChatScreen,
  LoginHistoryScreen,
} from '../screens/cybersave/ProfileScreens';

import {
  ServicesHubScreen,
  AadhaarServicesScreen,
  PanCardServicesScreen,
  CertificatesScreen,
} from '../screens/cybersave/ServiceHubScreens';
import {
  ServiceDetailScreen,
  ApplicationFillScreen,
  UploadDocumentsScreen,
  ReviewApplicationScreen,
  PaymentGatewayScreen,
  PaymentPortalScreen,
  PaymentSuccessScreen,
} from '../screens/cybersave/ServiceApplicationScreens';
import {
  MyApplicationsScreen,
  ApplicationRejectedScreen,
  ApplicationStatusScreen,
  ApplicationDetailsScreen,
  ViewCertificateScreen,
} from '../screens/cybersave/ApplicationsScreens';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding1: { step: number } | undefined;
  Onboarding2: { step: number } | undefined;
  Onboarding3: { step: number } | undefined;
  Language: undefined;
  Login: undefined;
  Register: undefined;
  OTP: { email: string } | undefined;
  Home: undefined;
  Notifications: undefined;
  Schemes: undefined;
  ServicesHub: undefined;
  AadhaarServices: undefined;
  PanCardServices: undefined;
  Certificates: undefined;
  ServiceDetail: { title?: string } | undefined;
  ApplicationFill: { title?: string } | undefined;
  UploadDocuments: { title?: string; formData?: any } | undefined;
  ReviewApplication: { title?: string; formData?: any } | undefined;
  PaymentGateway: { title?: string } | undefined;
  PaymentPortal: { title?: string } | undefined;
  PaymentSuccess: { title?: string } | undefined;
  MyApplications: undefined;
  ApplicationRejected: { title?: string; appId?: string } | undefined;
  ApplicationStatus: { title?: string; appId?: string } | undefined;
  ApplicationDetails: { title?: string; appId?: string } | undefined;
  ViewCertificate: { title?: string } | undefined;
  Cyberbot: undefined;
  Wallet: undefined;
  TransactionHistory: undefined;
  AadhaarOkyc: undefined;
  TransactionDetails: undefined;
  AddMoney: undefined;
  RefundDetails: undefined;
  Profile: undefined;
  PersonalInformation: undefined;
  MyDocuments: undefined;
  MyAddresses: undefined;
  AddAddress: undefined;
  ProfileLanguage: undefined;
  Settings: undefined;
  LoginHistory: undefined;
  PrivacySecurity: undefined;
  HelpSupport: undefined;
  AboutApp: undefined;
  FaqSupport: undefined;
  SupportChat: undefined;
  RaiseTicket: undefined;
  ShareFeedback: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={CyberSplashScreen} />
      <Stack.Screen name="Onboarding1" component={CyberOnboardingScreen} initialParams={{ step: 0 }} />
      <Stack.Screen name="Onboarding2" component={CyberOnboardingScreen} initialParams={{ step: 1 }} />
      <Stack.Screen name="Onboarding3" component={CyberOnboardingScreen} initialParams={{ step: 2 }} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTP" component={OtpScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Schemes" component={SchemesScreen} />
      <Stack.Screen name="ServicesHub" component={ServicesHubScreen} />
      <Stack.Screen name="AadhaarServices" component={AadhaarServicesScreen} />
      <Stack.Screen name="PanCardServices" component={PanCardServicesScreen} />
      <Stack.Screen name="Certificates" component={CertificatesScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="ApplicationFill" component={ApplicationFillScreen} />
      <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} />
      <Stack.Screen name="ReviewApplication" component={ReviewApplicationScreen} />
      <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} />
      <Stack.Screen name="PaymentPortal" component={PaymentPortalScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <Stack.Screen name="ApplicationRejected" component={ApplicationRejectedScreen} />
      <Stack.Screen name="ApplicationStatus" component={ApplicationStatusScreen} />
      <Stack.Screen name="ApplicationDetails" component={ApplicationDetailsScreen} />
      <Stack.Screen name="ViewCertificate" component={ViewCertificateScreen} />
      <Stack.Screen name="Cyberbot" component={CyberbotChatScreen} />
      <Stack.Screen name="Wallet" component={WalletHomeScreen} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Stack.Screen name="AadhaarOkyc" component={AadhaarOkycScreen} />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
      <Stack.Screen name="AddMoney" component={AddMoneyScreen} />
      <Stack.Screen name="RefundDetails" component={RefundDetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
      <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
      <Stack.Screen name="MyAddresses" component={MyAddressesScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="ProfileLanguage" component={ProfileLanguageScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LoginHistory" component={LoginHistoryScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="AboutApp" component={AboutAppScreen} />
      <Stack.Screen name="FaqSupport" component={FaqSupportScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
      <Stack.Screen name="ShareFeedback" component={ShareFeedbackScreen} />
    </Stack.Navigator>
  );
};

