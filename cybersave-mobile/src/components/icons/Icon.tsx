import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { IconMap, IconType } from './IconProvider';
import { colors } from '../../theme/colors';

export interface IconProps {
  name: string;
  type?: IconType;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  type = 'Ionicons',
  size = 24,
  color = colors.primary,
  style,
  accessibilityLabel,
}) => {
  const IconComponent = IconMap[type] || IconMap.Ionicons;

  return (
    <IconComponent
      name={name}
      size={size}
      color={color}
      style={style}
      accessibilityLabel={accessibilityLabel || name}
      accessible={true}
    />
  );
};
