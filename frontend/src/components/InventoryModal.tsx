import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { InventoryItem, ItemCategory, RARITY_COLORS } from '../types/character';

// Category icons mapping
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

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  skin: 'Skin',
  head: 'Head',
  face: 'Face',
  eyes: 'Eyes',
  mouth: 'Mouth',
  body: 'Body',
  back: 'Back',
  hands: 'Hands',
  feet: 'Feet',
  background: 'Background',
  foreground: 'Foreground',
  aura: 'Aura',
  particle: 'Particle',
  companion: 'Companion',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

interface InventoryModalProps {
  visible: boolean;
  category: ItemCategory | null;
  currentEquipped: InventoryItem | null;
  inventory: InventoryItem[];
  isLoading: boolean;
  onEquip: (itemId: string) => void;
  onUnequip: (category: string) => void;
  onClose: () => void;
}

export default function InventoryModal({
  visible,
  category,
  currentEquipped,
  inventory,
  isLoading,
  onEquip,
  onUnequip,
  onClose,
}: InventoryModalProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Filter inventory by category
  const categoryItems = category
    ? inventory.filter(item => item.category === category)
    : [];

  const handleEquip = () => {
    if (selectedItem) {
      onEquip(selectedItem.item_id);
      setSelectedItem(null);
    }
  };

  const handleUnequip = () => {
    if (category) {
      onUnequip(category);
    }
  };

  const handleClose = () => {
    setSelectedItem(null);
    onClose();
  };

  if (!category) return null;

  const categoryIcon = CATEGORY_ICONS[category] || 'cube';
  const categoryLabel = CATEGORY_LABELS[category] || category;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.categoryIcon}>
                <Ionicons name={categoryIcon as any} size={24} color={colors.accent.primary} />
              </View>
              <View>
                <Text style={styles.title}>{categoryLabel} Slot</Text>
                <Text style={styles.subtitle}>
                  {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''} owned
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Currently Equipped */}
          {currentEquipped && (
            <View style={styles.equippedSection}>
              <Text style={styles.sectionLabel}>Currently Equipped</Text>
              <View style={styles.equippedCard}>
                <View style={[
                  styles.equippedIcon,
                  { backgroundColor: (RARITY_COLORS[currentEquipped.rarity] || colors.border.primary) + '20' }
                ]}>
                  <Ionicons
                    name={categoryIcon as any}
                    size={28}
                    color={RARITY_COLORS[currentEquipped.rarity] || colors.accent.primary}
                  />
                </View>
                <View style={styles.equippedInfo}>
                  <Text style={styles.equippedName}>{currentEquipped.item_name}</Text>
                  <View style={[
                    styles.rarityBadge,
                    { backgroundColor: RARITY_COLORS[currentEquipped.rarity] || colors.border.primary }
                  ]}>
                    <Text style={styles.rarityText}>
                      {RARITY_LABELS[currentEquipped.rarity] || currentEquipped.rarity}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unequipButton}
                  onPress={handleUnequip}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.status.error} />
                  ) : (
                    <>
                      <Ionicons name="remove-circle" size={18} color={colors.status.error} />
                      <Text style={styles.unequipText}>Unequip</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Available Items */}
          <Text style={styles.sectionLabel}>
            {currentEquipped ? 'Replace With' : 'Available Items'}
          </Text>

          {categoryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No items in this category</Text>
              <Text style={styles.emptyHint}>Visit the Shop to buy some!</Text>
            </View>
          ) : (
            <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
              {categoryItems.map((item) => {
                const isCurrentlyEquipped = currentEquipped?.item_id === item.item_id;
                const isSelected = selectedItem?.item_id === item.item_id;
                const rarityColor = RARITY_COLORS[item.rarity] || colors.border.primary;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.itemCard,
                      isSelected && styles.itemCardSelected,
                      isSelected && { borderColor: rarityColor },
                      isCurrentlyEquipped && styles.itemCardDisabled,
                    ]}
                    onPress={() => !isCurrentlyEquipped && setSelectedItem(item)}
                    disabled={isCurrentlyEquipped}
                    data-testid={`inventory-item-${item.item_id}`}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: rarityColor + '20' }]}>
                      <Ionicons name={categoryIcon as any} size={24} color={rarityColor} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.item_name}</Text>
                      <View style={[styles.itemRarity, { backgroundColor: rarityColor }]}>
                        <Text style={styles.itemRarityText}>
                          {RARITY_LABELS[item.rarity] || item.rarity}
                        </Text>
                      </View>
                    </View>
                    {isCurrentlyEquipped ? (
                      <View style={styles.equippedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent.primary} />
                      </View>
                    ) : isSelected ? (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="radio-button-on" size={20} color={rarityColor} />
                      </View>
                    ) : (
                      <View style={styles.unselectedBadge}>
                        <Ionicons name="radio-button-off" size={20} color={colors.text.tertiary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Equip Button */}
          {categoryItems.length > 0 && (
            <TouchableOpacity
              style={[
                styles.equipButton,
                !selectedItem && styles.equipButtonDisabled,
              ]}
              onPress={handleEquip}
              disabled={!selectedItem || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.background.primary} />
                  <Text style={styles.equipButtonText}>
                    {selectedItem ? `Equip ${selectedItem.item_name}` : 'Select an Item'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  equippedSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  equippedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  equippedIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equippedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  equippedName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  unequipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  unequipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.status.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  itemsList: {
    maxHeight: 280,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    backgroundColor: colors.background.secondary,
  },
  itemCardDisabled: {
    opacity: 0.6,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemRarity: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemRarityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  equippedBadge: {
    padding: 4,
  },
  selectedBadge: {
    padding: 4,
  },
  unselectedBadge: {
    padding: 4,
  },
  equipButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  equipButtonDisabled: {
    backgroundColor: colors.border.primary,
  },
  equipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});
