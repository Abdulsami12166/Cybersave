import axios from 'axios';

// Live Render Production Backend URL
const RENDER_BASE_URL = 'https://cybersave-6tfo.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: RENDER_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

apiClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Authentication APIs
export const sendOtpApi = async (phone: string) => {
  try {
    const res = await apiClient.post('/auth/send-otp', { phone });
    return res.data;
  } catch (error: any) {
    return { success: false, message: error.response?.data?.message || 'Failed to send OTP' };
  }
};

export const verifyOtpApi = async (phone: string, otp: string, fullName?: string, email?: string) => {
  try {
    const res = await apiClient.post('/auth/verify-otp', { phone, otp, fullName, email });
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Invalid or expired OTP code' };
  }
};

export const registerEmailApi = async (data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) => {
  try {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Registration failed' };
  }
};

export const loginEmailApi = async (data: { emailOrPhone: string; password: string }) => {
  try {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Invalid credentials' };
  }
};

export const verifyGoogleTokenApi = async (token: string) => {
  try {
    const res = await apiClient.post('/auth/verify', { token });
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Google authentication failed' };
  }
};

// Services API
export const fetchServicesApi = async (category?: string) => {
  try {
    const res = await apiClient.get('/services', { params: { category } });
    return res.data;
  } catch (error) {
    return [];
  }
};

// Applications API
export const createApplicationApi = async (data: {
  userId: string;
  serviceTitle: string;
  serviceSlug?: string;
  formData: any;
  documents?: any[];
  feePaid?: number;
}) => {
  try {
    const res = await apiClient.post('/applications', data);
    return res.data;
  } catch (error) {
    return null;
  }
};

export const fetchUserApplicationsApi = async (userId: string, status?: string) => {
  try {
    const params: any = { userId };
    if (status && status !== 'All') params.status = status;
    const res = await apiClient.get('/applications', { params });
    return res.data;
  } catch (error) {
    return [];
  }
};

// Wallet API
export const fetchWalletApi = async (userId: string) => {
  try {
    const res = await apiClient.get('/wallet', { params: { userId } });
    return res.data;
  } catch (error) {
    return { balance: 0, transactions: [] };
  }
};

// Documents API
export const fetchMyDocumentsApi = async () => {
  try {
    const res = await apiClient.get('/documents');
    return res.data || [];
  } catch (error) {
    return [];
  }
};

export const fetchStorageUsageApi = async () => {
  try {
    const res = await apiClient.get('/documents/storage-usage');
    return res.data || { usedBytes: 0, formattedUsed: '0 MB', usedMB: '0.00', usedGB: '0.00', documentCount: 0 };
  } catch (error) {
    return { usedBytes: 0, formattedUsed: '0 MB', usedMB: '0.00', usedGB: '0.00', documentCount: 0 };
  }
};

export const uploadDocumentApi = async (data: { fileName: string; fileUrl: string; fileType?: string; fileSize?: number; applicationId?: string }) => {
  try {
    const res = await apiClient.post('/documents/upload', data);
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to upload document' };
  }
};

export const deleteDocumentApi = async (id: string) => {
  try {
    const res = await apiClient.delete(`/documents/${id}`);
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to delete document' };
  }
};

export const fetchUserProfileApi = async () => {
  try {
    const res = await apiClient.get('/user/me');
    return res.data;
  } catch (error) {
    return null;
  }
};

export const deleteAccountApi = async () => {
  try {
    const res = await apiClient.delete('/auth/account');
    return res.data;
  } catch (error: any) {
    return { error: true, message: error.response?.data?.message || 'Failed to delete account' };
  }
};

export const fetchLoginHistoryApi = async () => {
  try {
    const res = await apiClient.get('/auth/history');
    return res.data;
  } catch (error) {
    return [];
  }
};

export const updateProfileApi = async (data: {
  fullName?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  address?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  dob?: string;
  gender?: string;
}) => {
  try {
    const res = await apiClient.put('/profile', data);
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to update profile' };
  }
};

export const sendAadhaarOtpApi = async (aadhaarNumber: string, consent: string) => {
  try {
    const res = await apiClient.post('/aadhaar/okyc/send-otp', { aadhaarNumber, consent });
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to send OTP' };
  }
};

export const verifyAadhaarOtpApi = async (referenceId: string, otp: string) => {
  try {
    const res = await apiClient.post('/aadhaar/okyc/verify-otp', { referenceId, otp });
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to verify OTP' };
  }
};

export const uploadAvatarApi = async (base64Image: string) => {
  try {
    const res = await apiClient.post('/profile/upload-avatar', { base64Image });
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to upload profile photo to Cloudinary' };
  }
};

// AI Chat API
export const sendAiChatApi = async (message: string) => {
  try {
    const res = await apiClient.post('/ai/chat', { message });
    return res.data;
  } catch (error: any) {
    return { reply: 'CyberBot is currently updating database indices. You can apply for Aadhaar, PAN, and certificates directly from the Services menu.' };
  }
};

export const addMoneyApi = async (userId: string, amount: number, method: string) => {
  try {
    const res = await apiClient.post('/wallet/add-money', { userId, amount, method });
    return res.data;
  } catch (error: any) {
    return { error: error.response?.data?.message || 'Failed to add money to wallet' };
  }
};
