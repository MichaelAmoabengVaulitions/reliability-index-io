import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

const chevronPaths = {
  down: 'M2 4l4 4 4-4',
  right: 'M4 2l4 4-4 4',
};

interface ChevronIconProps {
  direction: keyof typeof chevronPaths;
  color?: string;
}

export function ChevronIcon({ direction, color = colors.text }: ChevronIconProps) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path
        d={chevronPaths[direction]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
