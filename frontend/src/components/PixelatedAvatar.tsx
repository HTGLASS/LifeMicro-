import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { PixelData, CharacterMood, MOOD_EXPRESSIONS } from '../types/character';
import { applyMoodEffects, generatePlaceholderAvatar } from '../utils/pixelation';
import { colors as themeColors } from '../constants/theme';

interface PixelatedAvatarProps {
  pixelData?: PixelData | null;
  size?: number;
  mood?: CharacterMood;
  moodEffects?: string[];
  glowColor?: string | null;
  showMoodIndicator?: boolean;
}

export default function PixelatedAvatar({
  pixelData,
  size = 120,
  mood = 'neutral',
  moodEffects = [],
  glowColor,
  showMoodIndicator = true,
}: PixelatedAvatarProps) {
  // Use placeholder if no pixel data
  const data = useMemo(() => {
    if (!pixelData) {
      return generatePlaceholderAvatar(16);
    }
    
    // Apply mood effects if any
    if (moodEffects.length > 0) {
      return applyMoodEffects(pixelData, moodEffects);
    }
    
    return pixelData;
  }, [pixelData, moodEffects]);
  
  // Calculate pixel dimensions
  const pixelWidth = size / data.width;
  const pixelHeight = size / data.height;
  
  return (
    <View style={styles.container}>
      {/* Glow effect */}
      {glowColor && (
        <View
          style={[
            styles.glow,
            {
              width: size + 20,
              height: size + 20,
              backgroundColor: glowColor,
              shadowColor: glowColor,
            },
          ]}
        />
      )}
      
      {/* Avatar container */}
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size * 0.15,
          },
        ]}
      >
        {/* Render pixels */}
        {data.colors.map((row, y) => (
          <View key={y} style={styles.row}>
            {row.map((color, x) => (
              <View
                key={`${x}-${y}`}
                style={{
                  width: pixelWidth,
                  height: pixelHeight,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      
      {/* Mood indicator */}
      {showMoodIndicator && (
        <View style={styles.moodBadge}>
          <View style={styles.moodEmoji}>
            <View style={[styles.moodDot, { backgroundColor: getMoodColor(mood) }]} />
          </View>
        </View>
      )}
    </View>
  );
}

function getMoodColor(mood: CharacterMood): string {
  switch (mood) {
    case 'thriving':
      return '#00E5BF';
    case 'happy':
      return '#4ECCA3';
    case 'neutral':
      return '#64B5F6';
    case 'tired':
      return '#FFB547';
    case 'weak':
      return '#FF9800';
    case 'fading':
      return '#FF6B6B';
    default:
      return '#64B5F6';
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 30,
    opacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: themeColors.background.secondary,
    borderWidth: 3,
    borderColor: themeColors.border.primary,
  },
  row: {
    flexDirection: 'row',
  },
  moodBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: themeColors.background.secondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: themeColors.border.primary,
  },
  moodEmoji: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
