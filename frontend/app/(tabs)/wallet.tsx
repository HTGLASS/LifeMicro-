import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore';
import { useWalletStore } from '../../src/store/walletStore';
import { format } from 'date-fns';
import { colors, shadows } from '../../src/constants/theme';

export default function WalletScreen() {
  const { user } = useUserStore();
  const { wallet, fetchWallet, redemptions, fetchRedemptions } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'redemptions'>('transactions');

  useEffect(() => {
    if (user?.id) {
      fetchWallet(user.id);
      fetchRedemptions(user.id);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await Promise.all([fetchWallet(user.id), fetchRedemptions(user.id)]);
    setRefreshing(false);
  };

  const transactions = wallet?.recent_transactions || [];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return 'checkmark-circle';
      case 'redeemed': return 'gift';
      case 'bonus': return 'star';
      case 'streak': return 'flame';
      default: return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned': return colors.accent.primary;
      case 'redeemed': return colors.goals.relationships;
      case 'bonus': return colors.status.warning;
      case 'streak': return colors.goals.creativity;
      default: return colors.goals.focus;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Wallet</Text>
        <View style={styles.tokenBadge}>
          <Text style={styles.tokenName}>MICO</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet" size={32} color={colors.accent.primary} />
        </View>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceValue}>{wallet?.balance || 0}</Text>
        <Text style={styles.tokenLabel}>MICO Tokens</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={16} color={colors.accent.primary} />
            <Text style={styles.statValue}>{wallet?.total_earned || 0}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="gift" size={16} color={colors.goals.relationships} />
            <Text style={styles.statValue}>{wallet?.total_redeemed || 0}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color={colors.status.warning} />
            <Text style={styles.statValue}>{wallet?.streak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'redemptions' && styles.tabActive]}
          onPress={() => setActiveTab('redemptions')}
        >
          <Text style={[styles.tabText, activeTab === 'redemptions' && styles.tabTextActive]}>
            Redemptions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
      >
        {activeTab === 'transactions' ? (
          transactions.length > 0 ? (
            transactions.slice().reverse().map((tx, index) => (
              <View key={tx.id || index} style={styles.transactionItem}>
                <View style={[styles.txIcon, { backgroundColor: getTransactionColor(tx.type) + '20' }]}>
                  <Ionicons
                    name={getTransactionIcon(tx.type) as any}
                    size={20}
                    color={getTransactionColor(tx.type)}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDescription}>{tx.description}</Text>
                  <Text style={styles.txDate}>
                    {format(new Date(tx.timestamp), 'MMM d, h:mm a')}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.amount >= 0 ? colors.accent.primary : colors.goals.relationships }]}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Complete tasks to earn MICO</Text>
            </View>
          )
        ) : (
          redemptions.length > 0 ? (
            redemptions.map((redemption) => (
              <View key={redemption.id} style={styles.redemptionItem}>
                <View style={styles.redemptionIcon}>
                  <Ionicons name="gift" size={24} color={colors.goals.relationships} />
                </View>
                <View style={styles.redemptionInfo}>
                  <Text style={styles.redemptionTitle}>{redemption.item_title}</Text>
                  <Text style={styles.redemptionDate}>
                    {format(new Date(redemption.created_at), 'MMM d, yyyy')}
                  </Text>
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>Code:</Text>
                    <Text style={styles.codeValue}>{redemption.reward_code}</Text>
                  </View>
                </View>
                <Text style={styles.redemptionCost}>-{redemption.tokens_burned}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No redemptions yet</Text>
              <Text style={styles.emptySubtext}>Visit the shop to redeem rewards</Text>
            </View>
          )
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
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
  tokenBadge: {
    backgroundColor: colors.accent.soft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  balanceIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.soft,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text.primary,
  },
  tokenLabel: {
    fontSize: 14,
    color: colors.accent.primary,
    fontWeight: '600',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.accent.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  redemptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  redemptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 138, 155, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redemptionInfo: {
    flex: 1,
  },
  redemptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  redemptionDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  codeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  redemptionCost: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.goals.relationships,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 4,
  },
});
