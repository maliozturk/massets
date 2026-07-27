// The typefaces the token scale assumes. Load them before rendering:
//
//   import { useFonts } from 'expo-font';
//   import { fontsToLoad } from './masset/core';
//   const [ready] = useFonts(fontsToLoad);
//   if (!ready) return null;
//
// Kept out of tokens.ts on purpose — tokens.ts stays free of runtime imports
// so Node tooling (the showroom generator) can read it directly.

import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

export const fontsToLoad = {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
};
