import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Octicons from 'react-native-vector-icons/Octicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import Foundation from 'react-native-vector-icons/Foundation';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Zocial from 'react-native-vector-icons/Zocial';

export type IconType =
  | 'Ionicons'
  | 'MaterialCommunityIcons'
  | 'MaterialIcons'
  | 'Feather'
  | 'FontAwesome6'
  | 'FontAwesome5'
  | 'Entypo'
  | 'AntDesign'
  | 'Octicons'
  | 'EvilIcons'
  | 'SimpleLineIcons'
  | 'Foundation'
  | 'Fontisto'
  | 'Zocial';

export const IconMap: Record<IconType, any> = {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
  FontAwesome6,
  FontAwesome5,
  Entypo,
  AntDesign,
  Octicons,
  EvilIcons,
  SimpleLineIcons,
  Foundation,
  Fontisto,
  Zocial,
};
