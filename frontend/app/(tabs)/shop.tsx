import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useWalletStore } from '../../src/store/walletStore';
import { useCharacterStore } from '../../src/store/characterStore';
import AdBanner from '../../src/components/AdBanner';
import { colors, shadows } from '../../src/constants/theme';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  trust_requirement: number;
  streak_requirement: number;
  verified_requirement: number;
  base_price: number;
  preview_url: string | null;
  is_seasonal: boolean;
  stock: number;
}

interface UserStats {
  trust_score: number;
  streak: number;
  verified_task_count: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  skin: 'color-palette',
  accessory: 'glasses',
  background: 'image',
  particle_effect: 'sparkles',
  companion: 'paw',
  all: 'grid',
};

const CATEGORY_LABELS: Record<string, string> = {
  skin: 'Skins',
  accessory: 'Accessories',
  background: 'Backgrounds',
  particle_effect: 'Effects',
  companion: 'Companions',
  all: 'All Items',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export default function ShopScreen() {
  const { user } = useUserStore();
  const { wallet, fetchWallet } = useWalletStore();
  const { character, inventory, fetchCharacter, fetchInventory } = useCharacterStore();
  
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; itemName: string }>({ 
    visible: false, 
    itemName: '' 
  });

  const fetchStoreItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/character-store`);
      if (response.ok) {
        const data = await response.json();
        setStoreItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching store items:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${API_URL}/api/trust-score/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats({
          trust_score: data.trust_score,
          streak: data.streak || 0,
          verified_task_count: data.verified_task_count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchStoreItems(),
        user?.id ? fetchWallet(user.id) : Promise.resolve(),
        user?.id ? fetchUserStats() : Promise.resolve(),
        user?.id ? fetchCharacter(user.id) : Promise.resolve(),
        user?.id ? fetchInventory(user.id) : Promise.resolve(),
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStoreItems(),
      user?.id ? fetchWallet(user.id) : Promise.resolve(),
      user?.id ? fetchUserStats() : Promise.resolve(),
      user?.id ? fetchInventory(user.id) : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const categories = ['all', ...new Set(storeItems.map(item => item.category))];

  const filteredItems = selectedCategory === 'all'
    ? storeItems
    : storeItems.filter(item => item.category === selectedCategory);

  // Sort by rarity (legendary first) then by price
  const sortedItems = [...filteredItems].sort((a, b) => {
    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const aRarity = rarityOrder.indexOf(a.rarity);
    const bRarity = rarityOrder.indexOf(b.rarity);
    if (aRarity !== bRarity) return aRarity - bRarity;
    return a.base_price - b.base_price;
  });

  const canPurchaseItem = (item: StoreItem) => {
    if (!userStats) return { canBuy: false, reason: 'Loading...' };
    
    const balance = wallet?.balance || 0;
    if (balance < item.base_price) {
      return { canBuy: false, reason: `Need ${item.base_price - balance} more MICO` };
    }
    if (userStats.trust_score < item.trust_requirement) {
      return { canBuy: false, reason: `Trust ${item.trust_requirement}+ required` };
    }
    if (userStats.streak < item.streak_requirement) {
      return { canBuy: false, reason: `${item.streak_requirement} day streak required` };
    }
    if (userStats.verified_task_count < item.verified_requirement) {
      return { canBuy: false, reason: `${item.verified_requirement} verified tasks required` };
    }
    
    // Check if already owned
    const owned = inventory?.find(inv => inv.item_id === item.id);
    if (owned) {
      return { canBuy: false, reason: 'Already owned' };
    }
    
    return { canBuy: true, reason: '' };
  };

  const handlePurchase = async () => {
    if (!user?.id || !selectedItem || !character) {
      Alert.alert('Error', 'Please create a character first to purchase items.');
      return;
    }

    const { canBuy, reason } = canPurchaseItem(selectedItem);
    if (!canBuy) {
      Alert.alert('Cannot Purchase', reason);
      return;
    }

    setIsPurchasing(true);
    try {
      const response = await fetch(`${API_URL}/api/character/${user.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: selectedItem.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessModal({ visible: true, itemName: selectedItem.name });
        setSelectedItem(null);
        // Refresh wallet and inventory
        await Promise.all([
          fetchWallet(user.id),
          fetchInventory(user.id),
        ]);
      } else {
        Alert.alert('Purchase Failed', result.detail || result.error || 'Could not complete purchase');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to complete purchase');
    }
    setIsPurchasing(false);
  };

  const renderItemCard = (item: StoreItem) => {
    const { canBuy, reason } = canPurchaseItem(item);
    const isOwned = inventory?.some(inv => inv.item_id === item.id);
    const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, isOwned && styles.itemCardOwned]}
        onPress={() => setSelectedItem(item)}
        data-testid={`store-item-${item.id}`}
      >
        {/* Rarity indicator */}
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
          <Text style={styles.rarityText}>{RARITY_LABELS[item.rarity]}</Text>
        </View>

        {/* Item icon */}
        <View style={[styles.itemIconContainer, { borderColor: rarityColor }]}>
          <Ionicons 
            name={(CATEGORY_ICONS[item.category] || 'cube') as any} 
            size={28} 
            color={rarityColor} 
          />
        </View>

        <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCategory}>
          {CATEGORY_LABELS[item.category] || item.category}
        </Text>

        {/* Requirements */}
        {(item.trust_requirement > 0 || item.streak_requirement > 0) && (
          <View style={styles.requirementsRow}>
            {item.trust_requirement > 0 && (
              <View style={styles.requirementBadge}>
                <Ionicons name="shield-checkmark" size={10} color={colors.text.tertiary} />
                <Text style={styles.requirementText}>{item.trust_requirement}</Text>
              </View>
            )}
            {item.streak_requirement > 0 && (
              <View style={styles.requirementBadge}>
                <Ionicons name="flame" size={10} color={colors.text.tertiary} />
                <Text style={styles.requirementText}>{item.streak_requirement}d</Text>
              </View>
            )}
          </View>
        )}

        {/* Price / Status */}
        <View style={styles.itemFooter}>
          {isOwned ? (
            <View style={styles.ownedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accent.primary} />
              <Text style={styles.ownedText}>Owned</Text>
            </View>
          ) : (
            <View style={[styles.priceBadge, !canBuy && styles.priceBadgeDisabled]}>
              <Ionicons 
                name="diamond" 
                size={12} 
                color={canBuy ? colors.accent.primary : colors.text.tertiary} 
              />
              <Text style={[styles.priceText, !canBuy && styles.priceTextDisabled]}>
                {item.base_price}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading Store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Character Shop</Text>
          <Text style={styles.subtitle}>Upgrade your MICO character</Text>
        </View>
        <View style={styles.balanceBadge}>
          <Ionicons name="diamond" size={16} color={colors.accent.primary} />
          <Text style={styles.balanceText}>{wallet?.balance || 0}</Text>
        </View>
      </View>

      {/* User Stats Bar */}
      {userStats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={14} color={colors.accent.primary} />
            <Text style={styles.statValue}>{userStats.trust_score}</Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="flame" size={14} color={colors.status.warning} />
            <Text style={styles.statValue}>{userStats.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-done" size={14} color={colors.status.success} />
            <Text style={styles.statValue}>{userStats.verified_task_count}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
        </View>
      )}

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(category)}
            data-testid={`category-${category}`}
          >
            <Ionicons
              name={(CATEGORY_ICONS[category] || 'cube') as any}
              size={16}
              color={selectedCategory === category ? colors.background.primary : colors.text.secondary}
            />
            <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
              {CATEGORY_LABELS[category] || category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
      >
        <AdBanner type="small" />

        {/* Items Grid */}
        <View style={styles.itemsGrid}>
          {sortedItems.map(renderItemCard)}
        </View>

        {sortedItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No items in this category</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Item Detail Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedItem(null)}
                  data-testid="close-item-modal"
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                {/* Rarity Banner */}
                <View style={[styles.modalRarityBanner, { backgroundColor: RARITY_COLORS[selectedItem.rarity] }]}>
                  <Text style={styles.modalRarityText}>{RARITY_LABELS[selectedItem.rarity]}</Text>
                </View>

                <View style={[styles.modalIconContainer, { borderColor: RARITY_COLORS[selectedItem.rarity] }]}>
                  <Ionicons 
                    name={(CATEGORY_ICONS[selectedItem.category] || 'cube') as any} 
                    size={48} 
                    color={RARITY_COLORS[selectedItem.rarity]} 
                  />
                </View>

                <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                <Text style={styles.modalCategory}>
                  {CATEGORY_LABELS[selectedItem.category] || selectedItem.category}
                </Text>
                <Text style={styles.modalDescription}>{selectedItem.description}</Text>

                {/* Requirements Section */}
                {(selectedItem.trust_requirement > 0 || 
                  selectedItem.streak_requirement > 0 || 
                  selectedItem.verified_requirement > 0) && (
                  <View style={styles.requirementsSection}>
                    <Text style={styles.requirementsTitle}>Requirements</Text>
                    <View style={styles.requirementsList}>
                      {selectedItem.trust_requirement > 0 && (
                        <View style={styles.requirementRow}>
                          <Ionicons name="shield-checkmark" size={16} color={
                            (userStats?.trust_score || 0) >= selectedItem.trust_requirement 
                              ? colors.status.success 
                              : colors.status.error
                          } />
                          <Text style={styles.requirementLabel}>
                            Trust Score: {selectedItem.trust_requirement}+
                          </Text>
                          <Text style={[styles.requirementStatus, {
                            color: (userStats?.trust_score || 0) >= selectedItem.trust_requirement 
                              ? colors.status.success 
                              : colors.status.error
                          }]}>
                            ({userStats?.trust_score || 0})
                          </Text>
                        </View>
                      )}
                      {selectedItem.streak_requirement > 0 && (
                        <View style={styles.requirementRow}>
                          <Ionicons name="flame" size={16} color={
                            (userStats?.streak || 0) >= selectedItem.streak_requirement 
                              ? colors.status.success 
                              : colors.status.error
                          } />
                          <Text style={styles.requirementLabel}>
                            Day Streak: {selectedItem.streak_requirement}+
                          </Text>
                          <Text style={[styles.requirementStatus, {
                            color: (userStats?.streak || 0) >= selectedItem.streak_requirement 
                              ? colors.status.success 
                              : colors.status.error
                          }]}>
                            ({userStats?.streak || 0})
                          </Text>
                        </View>
                      )}
                      {selectedItem.verified_requirement > 0 && (
                        <View style={styles.requirementRow}>
                          <Ionicons name="checkmark-done" size={16} color={
                            (userStats?.verified_task_count || 0) >= selectedItem.verified_requirement 
                              ? colors.status.success 
                              : colors.status.error
                          } />
                          <Text style={styles.requirementLabel}>
                            Verified Tasks: {selectedItem.verified_requirement}+
                          </Text>
                          <Text style={[styles.requirementStatus, {
                            color: (userStats?.verified_task_count || 0) >= selectedItem.verified_requirement 
                              ? colors.status.success 
                              : colors.status.error
                          }]}>
                            ({userStats?.verified_task_count || 0})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Price Section */}
                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPriceLabel}>Price</Text>
                  <View style={styles.modalPriceBadge}>
                    <Ionicons name="diamond" size={18} color={colors.accent.primary} />
                    <Text style={styles.modalPriceValue}>{selectedItem.base_price} MICO</Text>
                  </View>
                </View>

                <View style={styles.modalBalanceRow}>
                  <Text style={styles.modalBalanceLabel}>Your Balance</Text>
                  <Text style={styles.modalBalanceValue}>{wallet?.balance || 0} MICO</Text>
                </View>

                {/* Warning if can't purchase */}
                {(() => {
                  const { canBuy, reason } = canPurchaseItem(selectedItem);
                  if (!canBuy && reason !== 'Already owned') {
                    return (
                      <View style={styles.warningBanner}>
                        <Ionicons name="alert-circle" size={18} color={colors.status.warning} />
                        <Text style={styles.warningText}>{reason}</Text>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Purchase Button */}
                {(() => {
                  const { canBuy } = canPurchaseItem(selectedItem);
                  const isOwned = inventory?.some(inv => inv.item_id === selectedItem.id);
                  
                  if (isOwned) {
                    return (
                      <View style={styles.ownedBanner}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent.primary} />
                        <Text style={styles.ownedBannerText}>You own this item</Text>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      style={[styles.purchaseButton, !canBuy && styles.purchaseButtonDisabled]}
                      onPress={handlePurchase}
                      disabled={!canBuy || isPurchasing}
                      data-testid="purchase-button"
                    >
                      {isPurchasing ? (
                        <ActivityIndicator color={colors.background.primary} />
                      ) : (
                        <>
                          <Ionicons name="bag-add" size={20} color={colors.background.primary} />
                          <Text style={styles.purchaseButtonText}>
                            {canBuy ? 'Purchase Item' : 'Cannot Purchase'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })()}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal.visible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={colors.accent.primary} />
            </View>
            <Text style={styles.successTitle}>Item Purchased!</Text>
            <Text style={styles.successSubtitle}>
              {successModal.itemName} has been added to your inventory.
            </Text>
            <Text style={styles.successHint}>
              Go to the Character tab to equip your new item!
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setSuccessModal({ visible: false, itemName: '' })}
              data-testid="success-done-button"
            >
              <Text style={styles.successButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.soft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.primary,
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.accent.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingTop: 12,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  itemCard: {
    width: '47%',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    position: 'relative',
  },
  itemCardOwned: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  itemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  requirementsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  requirementText: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  itemFooter: {
    marginTop: 'auto',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.soft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  priceBadgeDisabled: {
    backgroundColor: colors.border.primary,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  priceTextDisabled: {
    color: colors.text.tertiary,
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalRarityBanner: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalRarityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 3,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalCategory: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  requirementsSection: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.tertiary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementsList: {
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  requirementStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  modalPriceLabel: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  modalPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  modalBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  modalBalanceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modalBalanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.status.warning,
  },
  ownedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.soft,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  ownedBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  purchaseButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadows.glow,
  },
  purchaseButtonDisabled: {
    backgroundColor: colors.border.primary,
    shadowColor: 'transparent',
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.background.primary,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.soft,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successHint: {
    fontSize: 13,
    color: colors.accent.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    ...shadows.glow,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});
