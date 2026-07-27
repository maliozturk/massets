// Plays the active season's ambient loop — rain, winter wind, or spring
// breeze with birdsong — each carrying a quiet alpha/low-beta binaural focus
// undertone (best heard with headphones). Looping stereo playback via
// expo-audio; playback stops when the app is backgrounded (expo-audio default).
//
// Whether sound plays at all is decided upstream by <MassetAmbience>, which
// reads the persisted toggle. This component just plays.

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

import { useMasset } from '../../core/provider';
import type { Season } from './seasons';

// `import` rather than `require`: typed by types/assets.d.ts, so this compiles
// in apps without @types/node. Metro resolves .wav either way.
import blossomLoop from './assets/sounds/blossom.wav';
import meadowLoop from './assets/sounds/meadow.wav';
import rainLoop from './assets/sounds/rain.wav';
import snowLoop from './assets/sounds/snow.wav';

const SOURCES: Record<Season, number> = {
  rain: rainLoop,
  snow: snowLoop,
  blossom: blossomLoop,
  meadow: meadowLoop,
};

// The winter wind sits lowest — a chill presence behind the snowfall, not a
// storm.
const VOLUMES: Record<Season, number> = {
  rain: 0.5,
  snow: 0.3,
  blossom: 0.5,
  meadow: 0.5,
};

function LoopPlayer({ season }: { season: Season }) {
  const player = useAudioPlayer(SOURCES[season]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.loop = true;
    player.volume = VOLUMES[season];
    player.play();
    return () => {
      try {
        player.pause();
      } catch {
        // player may already be released on unmount
      }
    };
  }, [player, season]);

  return null;
}

export function AmbientSound() {
  const { variant: season } = useMasset<Season>();
  // Keyed remount swaps the loop cleanly when the season changes.
  return <LoopPlayer key={season} season={season} />;
}
