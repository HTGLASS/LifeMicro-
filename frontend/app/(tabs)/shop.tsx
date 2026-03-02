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
import { MarketplaceItem } from '../../src/types';
import AdBanner from '../../src/components/AdBanner';
import { colors, shadows } from '../../src/constants/theme';

const CATEGORY_ICONS: Record<string, string> = {
  food: 'cafe',
  digital: 'cloud-download',
  apps: 'apps',
  fitness: 'fitness',
  all: 'grid',
};

export default function ShopScreen() {
  const { user } = useUserStore();
  const { wallet, marketplaceItems, fetchWallet, fetchMarketplace, redeemItem } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; code: string }>({ visible: false, code: '' });

  useEffect(() => {
    if (user?.id) {
      fetchWallet(user.id);
    }
    fetchMarketplace();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMarketplace(), user?.id ? fetchWallet(user.id) : Promise.resolve()]);
    setRefreshing(false);
  };

  const categories = ['all', ...new Set(marketplaceItems.map(item => item.category))];

  const filteredItems = selectedCategory === 'all'
    ? marketplaceItems
    : marketplaceItems.filter(item => item.category === selectedCategory);

  const handleRedeem = async () => {
    if (!user?.id || !selectedItem) return;

    const balance = wallet?.balance || 0;
    if (balance < selectedItem.token_cost) {
      Alert.alert('Insufficient Balance', `You need ${selectedItem.token_cost - balance} more MICO tokens.`);
      return;
    }

    setIsRedeeming(true);
    const result = await redeemItem(user.id, selectedItem.id);
    setIsRedeeming(false);
    setSelectedItem(null);

    if (result.success && result.reward_code) {
      setSuccessModal({ visible: true, code: result.reward_code });
    } else {
      Alert.alert('Error', result.error || 'Failed to redeem item');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rewards Shop</Text>
          <Text style={styles.subtitle}>Redeem your MICO tokens</Text>
        </View>
        <View style={styles.balanceBadge}>
          <Ionicons name="wallet" size={16} color={colors.accent.primary} />
          <Text style={styles.balanceText}>{wallet?.balance || 0}</Text>
        </View>
      </View>

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
          >
            <Ionicons
              name={(CATEGORY_ICONS[category] || 'pricetag') as any}
              size={16}
              color={selectedCategory === category ? colors.background.primary : colors.text.secondary}
            />
            <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
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
          {filteredItems.map(item => {
            const canAfford = (wallet?.balance || 0) >= item.token_cost;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => setSelectedItem(item)}
              >
                <View style={styles.itemIconContainer}>
                  <Text style={styles.itemEmoji}>{item.title.split(' ')[0]}</Text>
                </View>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title.split(' ').slice(1).join(' ')}
                </Text>
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.itemFooter}>
                  <View style={[styles.priceBadge, !canAfford && styles.priceBadgeDisabled]}>
                    <Ionicons name="diamond" size={12} color={canAfford ? colors.accent.primary : colors.text.tertiary} />
                    <Text style={[styles.priceText, !canAfford && styles.priceTextDisabled]}>
                      {item.token_cost}
                    </Text>
                  </View>
                  {item.stock > 0 && item.stock < 20 && (
                    <Text style={styles.stockText}>{item.stock} left</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.text.tertiary} />
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
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalEmoji}>{selectedItem.title.split(' ')[0]}</Text>
                </View>

                <Text style={styles.modalTitle}>
                  {selectedItem.title.split(' ').slice(1).join(' ')}
                </Text>
                <Text style={styles.modalDescription}>{selectedItem.description}</Text>

                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPriceLabel}>Price</Text>
                  <View style={styles.modalPriceBadge}>
                    <Ionicons name="diamond" size={18} color={colors.accent.primary} />
                    <Text style={styles.modalPriceValue}>{selectedItem.token_cost} MICO</Text>
                  </View>
                </View>

                <View style={styles.modalBalanceRow}>
                  <Text style={styles.modalBalanceLabel}>Your Balance</Text>
                  <Text style={styles.modalBalanceValue}>{wallet?.balance || 0} MICO</Text>
                </View>

                {(wallet?.balance || 0) < selectedItem.token_cost && (
                  <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={18} color={colors.status.warning} />
                    <Text style={styles.warningText}>
                      You need {selectedItem.token_cost - (wallet?.balance || 0)} more MICO
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.redeemButton,
                    (wallet?.balance || 0) < selectedItem.token_cost && styles.redeemButtonDisabled,
                  ]}
                  onPress={handleRedeem}
                  disabled={(wallet?.balance || 0) < selectedItem.token_cost || isRedeeming}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color={colors.background.primary} />
                  ) : (
                    <>
                      <Ionicons name="gift" size={20} color={colors.background.primary} />
                      <Text style={styles.redeemButtonText}>Redeem Now</Text>
                    </>
                  )}
                </TouchableOpacity>
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
            <Text style={styles.successTitle}>Redemption Successful!</Text>
            <Text style={styles.successSubtitle}>Your reward code:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{successModal.code}</Text>
            </View>
            <Text style={styles.codeHint}>Save this code - you can also find it in your Wallet</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setSuccessModal({ visible: false, code: '' })}
            >
              <Text style={styles.successButtonText}>Done</Text>
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
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemEmoji: {
    fontSize: 24,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.soft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  priceBadgeDisabled: {
    backgroundColor: colors.border.primary,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  priceTextDisabled: {
    color: colors.text.tertiary,
  },
  stockText: {
    fontSize: 11,
    color: colors.status.warning,
    fontWeight: '600',
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
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
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
  redeemButton: {
    flexDirection: 'row',
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadows.glow,
  },
  redeemButtonDisabled: {
    backgroundColor: colors.border.primary,
    shadowColor: 'transparent',
  },
  redeemButtonText: {
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
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent.primary,
    letterSpacing: 1,
  },
  codeHint: {
    fontSize: 13,
    color: colors.text.tertiary,
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
