import { IconType } from '../components/icons/IconProvider';
import { colors } from '../theme/colors';

export interface IconDefinition {
  name: string;
  library: IconType;
  defaultSize?: number;
  defaultColor?: string;
}

export const ICONS = {
  HOME: { name: 'home-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  PROFILE: { name: 'person-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  SETTINGS: { name: 'settings-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  SEARCH: { name: 'search', library: 'Feather', defaultSize: 20, defaultColor: colors.textSecondary } as IconDefinition,
  BACK: { name: 'chevron-back', library: 'Ionicons', defaultSize: 24, defaultColor: colors.surface } as IconDefinition,
  NEXT: { name: 'arrow-forward', library: 'Ionicons', defaultSize: 20, defaultColor: colors.surface } as IconDefinition,
  LOGOUT: { name: 'log-out-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  EMAIL: { name: 'mail-outline', library: 'Ionicons', defaultSize: 20, defaultColor: colors.textSecondary } as IconDefinition,
  PASSWORD: { name: 'lock-closed-outline', library: 'Ionicons', defaultSize: 20, defaultColor: colors.textSecondary } as IconDefinition,
  LOCK: { name: 'lock', library: 'Feather', defaultSize: 20, defaultColor: colors.textSecondary } as IconDefinition,
  USER: { name: 'user', library: 'Feather', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  HEART: { name: 'heart-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.error } as IconDefinition,
  CHAT: { name: 'chatbubble-ellipses-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  BRAIN: { name: 'brain', library: 'MaterialCommunityIcons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  BREATHING: { name: 'spa-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  MEDITATION: { name: 'self-improvement', library: 'MaterialIcons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  PLAY: { name: 'play-circle', library: 'Ionicons', defaultSize: 32, defaultColor: colors.primary } as IconDefinition,
  PAUSE: { name: 'pause-circle', library: 'Ionicons', defaultSize: 32, defaultColor: colors.primary } as IconDefinition,
  STOP: { name: 'stop-circle', library: 'Ionicons', defaultSize: 32, defaultColor: colors.primary } as IconDefinition,
  BOOKMARK: { name: 'bookmark-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  VIDEO: { name: 'videocam-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  COURSE: { name: 'school-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  CALENDAR: { name: 'calendar-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  NOTIFICATION: { name: 'notifications-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  ANALYTICS: { name: 'analytics-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  WARNING: { name: 'warning-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.error } as IconDefinition,
  SUCCESS: { name: 'checkmark-circle-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.success } as IconDefinition,
  ERROR: { name: 'alert-circle-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.error } as IconDefinition,
  SYNC: { name: 'sync-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  UPLOAD: { name: 'cloud-upload-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  DOWNLOAD: { name: 'cloud-download-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  FOLDER: { name: 'folder-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  DELETE: { name: 'trash-outline', library: 'Ionicons', defaultSize: 20, defaultColor: colors.error } as IconDefinition,
  EDIT: { name: 'create-outline', library: 'Ionicons', defaultSize: 20, defaultColor: colors.primary } as IconDefinition,
  CAMERA: { name: 'camera-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  MIC: { name: 'mic-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  SPEAKER: { name: 'volume-high-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  SOMATIC: { name: 'body-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  JOURNAL: { name: 'journal-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  AWARENESS: { name: 'pulse-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  SHIELD: { name: 'shield-checkmark-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  STREAK: { name: 'flame-outline', library: 'Ionicons', defaultSize: 24, defaultColor: colors.accent } as IconDefinition,
  ROBOT: { name: 'robot-outline', library: 'MaterialCommunityIcons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  FEATHER: { name: 'feather', library: 'Feather', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  CHEVRON_LEFT: { name: 'chevron-back', library: 'Ionicons', defaultSize: 24, defaultColor: colors.surface } as IconDefinition,
  CHEVRON_RIGHT: { name: 'chevron-forward', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  PLUS: { name: 'add', library: 'Ionicons', defaultSize: 24, defaultColor: colors.primary } as IconDefinition,
  MOON: { name: 'moon-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
  GLOBE: { name: 'globe-outline', library: 'Ionicons', defaultSize: 22, defaultColor: colors.primary } as IconDefinition,
};
