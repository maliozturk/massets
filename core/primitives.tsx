// Pack-agnostic building blocks. Every colour comes from the active palette,
// so these render correctly under any pack without modification.
//
// Deliberately excluded: anything that knows a domain. A status pill that
// understands "open / in-progress / done" belongs to the app that has those
// statuses, not to a theme store.

import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useMasset, useMassetStyles } from './provider';
import { fontFamily, radius, spacing, type ThemeColors } from './tokens';

/** Raised panel on the ground. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useMassetStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const styles = useMassetStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.buttonLabel,
          variant === 'primary' && styles.buttonLabelPrimary,
          variant === 'secondary' && styles.buttonLabelSecondary,
          variant === 'ghost' && styles.buttonLabelGhost,
          variant === 'danger' && styles.buttonLabelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const styles = useMassetStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.buttonPressed]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/** Small mono eyebrow. Use it to state a fact, not to decorate. */
export function Eyebrow({ text, accent = false }: { text: string; accent?: boolean }) {
  const { typography } = useMasset();
  return <Text style={accent ? typography.eyebrowAccent : typography.eyebrow}>{text}</Text>;
}

export function EmptyState({ icon, title, detail }: { icon?: ReactNode; title: string; detail?: string }) {
  const { typography } = useMasset();
  const styles = useMassetStyles(makeStyles);
  return (
    <View style={styles.emptyState}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={[typography.subtitle, styles.emptyTitle]}>{title}</Text>
      {detail ? <Text style={[typography.caption, styles.emptyDetail]}>{detail}</Text> : null}
    </View>
  );
}

export function Spinner() {
  const { colors } = useMasset();
  return <ActivityIndicator color={colors.accent} />;
}

/** Circular icon-only tap target. */
export function IconButton({
  onPress,
  children,
  tinted = false,
}: {
  onPress: () => void;
  children: ReactNode;
  tinted?: boolean;
}) {
  const styles = useMassetStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, tinted && styles.iconButtonTinted, pressed && styles.buttonPressed]}
    >
      {children}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: spacing.lg,
    },
    button: {
      flexDirection: 'row',
      gap: spacing.sm,
      borderRadius: radius.pill,
      paddingVertical: 13,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.accent,
    },
    buttonSecondary: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.surfaceBorderStrong,
    },
    buttonGhost: {
      backgroundColor: 'transparent',
    },
    buttonDanger: {
      backgroundColor: colors.emberDim,
      borderWidth: 1,
      borderColor: colors.ember,
    },
    buttonPressed: { opacity: 0.75 },
    buttonDisabled: { opacity: 0.4 },
    buttonLabel: {
      fontFamily: fontFamily.bodyBold,
      fontSize: 15,
    },
    buttonLabelPrimary: { color: colors.onAccent },
    buttonLabelSecondary: { color: colors.textPrimary },
    buttonLabelGhost: { color: colors.textSecondary },
    buttonLabelDanger: { color: colors.ember },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.surfaceBorderStrong,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.accentBorder,
      backgroundColor: colors.accentDim,
    },
    chipLabel: {
      fontFamily: fontFamily.bodyMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipLabelActive: {
      color: colors.accentBright,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl * 2,
      paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: { textAlign: 'center' },
    emptyDetail: { marginTop: spacing.sm, textAlign: 'center', maxWidth: 260 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    iconButtonTinted: {
      backgroundColor: colors.accentDim,
      borderColor: colors.accentBorder,
    },
  });
