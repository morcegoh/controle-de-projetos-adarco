import React from 'react';
import { View } from 'react-native';

export const LinearGradient = ({ colors, start, end, style, ...props }: any) => {
  const bg = `linear-gradient(90deg, ${colors.join(', ')})`;
  return <View style={[style, { backgroundImage: bg } as any]} {...props} />;
};
