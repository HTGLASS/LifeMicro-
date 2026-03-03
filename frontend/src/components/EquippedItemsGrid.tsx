import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../constants/theme';
import { InventoryItem, ItemCategory, RARITY_COLORS } from '../types/character';

// All 14 equip slots in order
const EQUIP_SLOTS: { category: ItemCategory; icon: string; label: string }[] = [
  { category: 'skin', icon: 'color-palette', label: 'Skin' },
  { category: 'head', icon: 'ribbon', label: 'Head' },
  { category: 'face', icon: 'glasses', label: 'Face' },
  { category: 'eyes', icon: 'eye', label: 'Eyes' },
  { category: 'mouth', icon: 'happy', label: 'Mouth' },
  { category: 'body', icon: 'shirt', label: 'Body' },
  { category: 'back', icon: 'leaf', label: 'Back' },
  { category: 'hands', icon: 'hand-left', label: 'Hands' },
  { category: 'feet', icon: 'footsteps', label: 'Feet' },
  { category: 'background', icon: 'image', label: 'BG' },
  { category: 'foreground', icon: 'layers', label: 'FG' },
  { category: 'aura', icon: 'radio', label: 'Aura' },
  { category: 'particle', icon: 'sparkles', label: 'Particle' },
  { category: 'companion', icon: 'paw', label: 'Buddy' },
];

interface EquippedItemsGridProps {
  equippedItems: Record<string, string>; // category -> item_id mapping
  inventory: InventoryItem[];
  onSlotPress: (category: ItemCategory, equippedItem: InventoryItem | null) => void;
}

export default function EquippedItemsGrid({
  equippedItems,
  inventory,
  onSlotPress,
}: EquippedItemsGridProps) {
  const getEquippedItem = (category: ItemCategory): InventoryItem | null => {
    const itemId = equippedItems[category];
    if (!itemId) return null;
    return inventory.find(item => item.item_id === itemId) || null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="grid" size={18} color={colors.accent.primary} />
        <Text style={styles.title}>Equipped Items</Text>
        <Text style={styles.subtitle}>
          {Object.keys(equippedItems).length}/14 slots
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slotsContainer}
      >
        {EQUIP_SLOTS.map((slot) => {
          const equippedItem = getEquippedItem(slot.category);
          const isEquipped = !!equippedItem;
          const rarityColor = equippedItem 
            ? RARITY_COLORS[equippedItem.rarity] || colors.border.primary
            : colors.border.primary;

          return (
            <TouchableOpacity
              key={slot.category}
              style={[
                styles.slot,
                isEquipped && styles.slotEquipped,
                isEquipped && { borderColor: rarityColor },
              ]}
              onPress={() => onSlotPress(slot.category, equippedItem)}
              data-testid={`equip-slot-${slot.category}`}
            >
              {isEquipped && (
                <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
              )}
              <View style={[
                styles.iconContainer,
                isEquipped && { backgroundColor: rarityColor + '20' },
              ]}>
                <Ionicons
                  name={slot.icon as any}
                  size={20}
                  color={isEquipped ? rarityColor : colors.text.tertiary}
                />
              </View>
              <Text style={[
                styles.slotLabel,
                isEquipped && styles.slotLabelEquipped,
              ]}>
                {slot.label}
              </Text>
              {isEquipped && (
                <Text style={styles.itemName} numberOfLines={1}>
                  {equippedItem.item_name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  slotsContainer: {
    paddingVertical: 4,
    gap: 10,
  },
  slot: {
    width: 72,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.secondary,
    marginRight: 10,
    position: 'relative',
  },
  slotEquipped: {
    backgroundColor: colors.background.secondary,
  },
  rarityDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.border.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  slotLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  slotLabelEquipped: {
    color: colors.text.secondary,
  },
  itemName: {
    fontSize: 8,
    color: colors.accent.primary,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
});
