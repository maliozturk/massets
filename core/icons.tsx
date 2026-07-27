// Hand-drawn 24px stroke icon set. Colours always arrive via props from the
// active palette — never hardcoded here, so one icon set serves every pack.
//
// Sized and weighted to sit with the Space Grotesk / Manrope pairing in
// core/fonts.ts; the default `strokeWidth` per icon is tuned, not uniform.

import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

function frame(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const };
}

/** Vault door: a circle with a spoked dial — the app's mark. */
export function VaultIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="12" cy="12" r="4.6" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="7.4" x2="12" y2="9.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="14.4" x2="12" y2="16.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="7.4" y1="12" x2="9.6" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="14.4" y1="12" x2="16.6" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function GearIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 22, color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Circle cx="10.5" cy="10.5" r="6.2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="15.2" y1="15.2" x2="20" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PinIcon({ size = 18, color, strokeWidth = 1.8, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...frame(size)}>
      <Path
        d="M9 3.5h6l-.8 5.4 2.6 3.1H7.2l2.6-3.1L9 3.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      <Line x1="12" y1="12" x2="12" y2="20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M5 6.5h14M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="10" y1="10.5" x2="10" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="14" y1="10.5" x2="14" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PencilIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path
        d="M4 20l.9-3.9L16.2 4.8a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L7.9 19.1 4 20Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line x1="14.5" y1="6.5" x2="17.5" y2="9.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M4.5 12.5l5 5L19.5 6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M14.5 5 7.5 12l7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M9.5 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Half-filled dial — an idea that has been picked up but not closed out. */
export function ProgressIcon({ size = 16, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Circle cx="12" cy="12" r="8.4" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill={color} />
    </Svg>
  );
}

/** Wardrobe hanger — the drop target an idea gets hung on. */
export function HangerIcon({ size = 20, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path
        d="M12 7.8a2.1 2.1 0 1 1 2.1-2.1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7.8 3.6 15.2a1 1 0 0 0 .66 1.75h15.48a1 1 0 0 0 .66-1.75L12 7.8Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M12 14.5V3.5M12 3.5 8 7.5M12 3.5l4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function BackspaceIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M8.5 5h10A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-10L3 12l5.5-7Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1="11" y1="9.5" x2="16" y2="14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="16" y1="9.5" x2="11" y2="14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function LockIcon({ size = 22, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Rect x="5" y="10.5" width="14" height="9.5" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="12" cy="15.2" r="1.4" fill={color} />
    </Svg>
  );
}

export function XIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SoundOnIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M16 9.5a4 4 0 0 1 0 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M18.5 7.5a7.2 7.2 0 0 1 0 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SoundOffIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1="16" y1="9.5" x2="21" y2="14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="21" y1="9.5" x2="16" y2="14.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function NoteIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...frame(size)}>
      <Rect x="4.5" y="3.5" width="15" height="17" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="8.5" y1="8.5" x2="15.5" y2="8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8.5" y1="15.5" x2="12.5" y2="15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
