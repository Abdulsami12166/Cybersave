import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Icon } from './Icon';
import { IconType } from './IconProvider';
import { colors } from '../../theme/colors';

export interface IconButtonProps {
  name: string;
  type?: IconType;
  size?: number;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  rippleColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  hitSlop?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  type = 'Ionicons',
  size = 24,
  color = colors.primary,
  onPress,
  disabled = false,
  loading = false,
  rippleColor = 'rgba(0, 0, 0, 0.12)',
  style,
  accessibilityLabel,
  hitSlop = 8,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      android_ripple={{ color: rippleColor, borderless: true, radius: size + 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
      accessibilityState={{ disabled, busy: loading }}
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size={size} color={color} />
      ) : (
        <Icon name={name} type={type} size={size} color={color} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
