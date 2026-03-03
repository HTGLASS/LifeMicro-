import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PixelData, CharacterMood, ItemCategory, RARITY_COLORS } from '../types/character';
import { applyMoodEffects, generatePlaceholderAvatar } from '../utils/pixelation';
import { colors as themeColors } from '../constants/theme';

// Visual positions for equipped items on avatar
const EQUIP_VISUAL_POSITIONS: Record<ItemCategory, { top?: number; bottom?: number; left?: number; right?: number; size: number; zIndex: number }> = {
  background: { top: 0, left: 0, size: 100, zIndex: 0 },
  aura: { top: -10, left: -10, size: 120, zIndex: 1 },
  skin: { top: 0, left: 0, size: 100, zIndex: 2 },
  body: { top: 40, left: 20, size: 60, zIndex: 3 },
  back: { top: 20, left: -15, size: 40, zIndex: 2 },
  feet: { bottom: 0, left: 25, size: 30, zIndex: 4 },
  hands: { top: 50, right: -10, size: 25, zIndex: 4 },
  head: { top: -5, left: 25, size: 50, zIndex: 5 },
  face: { top: 25, left: 30, size: 40, zIndex: 6 },
  eyes: { top: 30, left: 30, size: 35, zIndex: 7 },
  mouth: { top: 45, left: 35, size: 30, zIndex: 7 },
  foreground: { top: 0, left: 0, size: 100, zIndex: 8 },
  particle: { top: -20, right: -20, size: 50, zIndex: 9 },
  companion: { bottom: -10, right: -20, size: 45, zIndex: 10 },
};

// Icons for each category
const CATEGORY_ICONS: Record<ItemCategory, string> = {
  skin: 'color-palette',
  head: 'ribbon',
  face: 'glasses',
  eyes: 'eye',
  mouth: 'happy',
  body: 'shirt',
  back: 'leaf',
  hands: 'hand-left',
  feet: 'footsteps',
  background: 'image',
  foreground: 'layers',
  aura: 'radio',
  particle: 'sparkles',
  companion: 'paw',
};

// Item visual effects (colors based on rarity)
const ITEM_GLOW_COLORS: Record<string, string> = {
  common: 'transparent',
  uncommon: '#10B98140',
  rare: '#3B82F640',
  epic: '#8B5CF650',
  legendary: '#F59E0B60',
};

interface EquippedItemInfo {
  item_id: string;
  item_name: string;
  category: ItemCategory;
  rarity: string;
}

interface PixelatedAvatarProps {
  pixelData?: PixelData | null;
  size?: number;
  mood?: CharacterMood;
  moodEffects?: string[];
  glowColor?: string | null;
  showMoodIndicator?: boolean;
  equippedItems?: Record<string, EquippedItemInfo>;
  showEquippedOverlay?: boolean;
}

export default function PixelatedAvatar({
  pixelData,
  size = 120,
  mood = 'neutral',
  moodEffects = [],
  glowColor,
  showMoodIndicator = true,
  equippedItems = {},
  showEquippedOverlay = true,
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

  // Calculate scale factor for item positions
  const scaleFactor = size / 100;

  // Get equipped items sorted by zIndex
  const sortedEquippedItems = useMemo(() => {
    return Object.entries(equippedItems)
      .filter(([category, item]) => item && EQUIP_VISUAL_POSITIONS[category as ItemCategory])
      .sort(([catA], [catB]) => {
        const posA = EQUIP_VISUAL_POSITIONS[catA as ItemCategory];
        const posB = EQUIP_VISUAL_POSITIONS[catB as ItemCategory];
        return (posA?.zIndex || 0) - (posB?.zIndex || 0);
      });
  }, [equippedItems]);

  // Render equipped item visual
  const renderEquippedItem = (category: ItemCategory, item: EquippedItemInfo) => {
    const position = EQUIP_VISUAL_POSITIONS[category];
    if (!position) return null;

    const icon = CATEGORY_ICONS[category] || 'cube';
    const rarityColor = RARITY_COLORS[item.rarity] || themeColors.text.tertiary;
    const glowColor = ITEM_GLOW_COLORS[item.rarity] || 'transparent';
    const itemSize = position.size * scaleFactor * 0.4;

    const positionStyle: any = {
      position: 'absolute',
      zIndex: position.zIndex,
    };

    if (position.top !== undefined) positionStyle.top = position.top * scaleFactor;
    if (position.bottom !== undefined) positionStyle.bottom = position.bottom * scaleFactor;
    if (position.left !== undefined) positionStyle.left = position.left * scaleFactor;
    if (position.right !== undefined) positionStyle.right = position.right * scaleFactor;

    // Special rendering for certain categories
    if (category === 'aura') {
      return (
        <View
          key={category}
          style={[
            positionStyle,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              backgroundColor: rarityColor + '20',
              borderWidth: 2,
              borderColor: rarityColor + '40',
              top: -10,
              left: -10,
            },
          ]}
        />
      );
    }

    if (category === 'particle') {
      return (
        <View key={category} style={positionStyle}>
          {[...Array(3)].map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: 6 * scaleFactor,
                height: 6 * scaleFactor,
                borderRadius: 3 * scaleFactor,
                backgroundColor: rarityColor,
                top: i * 12 * scaleFactor,
                left: i * 8 * scaleFactor,
                opacity: 0.8 - i * 0.2,
              }}
            />
          ))}
        </View>
      );
    }

    if (category === 'background') {
      return (
        <View
          key={category}
          style={[
            positionStyle,
            {
              width: size,
              height: size,
              backgroundColor: rarityColor + '15',
              borderRadius: size * 0.15,
            },
          ]}
        />
      );
    }

    // Default item rendering with icon
    return (
      <View
        key={category}
        style={[
          positionStyle,
          styles.equippedItemBadge,
          {
            width: itemSize,
            height: itemSize,
            borderRadius: itemSize / 2,
            backgroundColor: themeColors.background.secondary,
            borderColor: rarityColor,
            shadowColor: rarityColor,
          },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={itemSize * 0.5}
          color={rarityColor}
        />
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { width: size + 40, height: size + 40 }]}>
      {/* Main glow effect */}
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

      {/* Equipped items layer (background items first) */}
      {showEquippedOverlay && sortedEquippedItems.map(([category, item]) => 
        renderEquippedItem(category as ItemCategory, item)
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

      {/* Equipped items count badge */}
      {showEquippedOverlay && Object.keys(equippedItems).length > 0 && (
        <View style={styles.equipCountBadge}>
          <Text style={styles.equipCountText}>
            {Object.keys(equippedItems).length}
          </Text>
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
    position: 'relative',
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
    zIndex: 5,
  },
  row: {
    flexDirection: 'row',
  },
  moodBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: themeColors.background.secondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: themeColors.border.primary,
    zIndex: 15,
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
  equippedItemBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  equipCountBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: themeColors.accent.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 15,
  },
  equipCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.background.primary,
  },
});
