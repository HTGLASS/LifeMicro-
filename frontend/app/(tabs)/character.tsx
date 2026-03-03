import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useUserStore } from '../../src/store/userStore';
import { useCharacterStore } from '../../src/store/characterStore';
import PixelatedAvatar from '../../src/components/PixelatedAvatar';
import EquippedItemsGrid from '../../src/components/EquippedItemsGrid';
import InventoryModal from '../../src/components/InventoryModal';
import { pixelateImage, generatePlaceholderAvatar, processImageToPixels } from '../../src/utils/pixelation';
import { colors, shadows } from '../../src/constants/theme';
import {
  EVOLUTION_COLORS,
  RARITY_COLORS,
  MOOD_EXPRESSIONS,
  EvolutionTier,
  ItemCategory,
  InventoryItem,
} from '../../src/types/character';

const EVOLUTION_DISPLAY: Record<EvolutionTier, { name: string; icon: string }> = {
  seedling: { name: 'Seedling', icon: 'leaf-outline' },
  sprout: { name: 'Sprout', icon: 'leaf' },
  bloom: { name: 'Bloom', icon: 'flower-outline' },
  flourish: { name: 'Flourish', icon: 'flower' },
  transcend: { name: 'Transcend', icon: 'star' },
};

export default function CharacterScreen() {
  const { user } = useUserStore();
  const {
    character,
    characterResponse,
    trustScore,
    inventory,
    fetchCharacter,
    createCharacter,
    updateAvatar,
    fetchTrustScore,
    fetchInventory,
    equipItem,
    unequipItem,
    isLoading,
  } = useCharacterStore();

  const [showCamera, setShowCamera] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedSlotCategory, setSelectedSlotCategory] = useState<ItemCategory | null>(null);
  const [selectedSlotItem, setSelectedSlotItem] = useState<InventoryItem | null>(null);
  const [characterName, setCharacterName] = useState('Micro');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCharacter(user.id);
      fetchTrustScore(user.id);
      fetchInventory(user.id);
    }
  }, [user?.id]);

  const handleCreateCharacter = async () => {
    if (!user?.id) return;
    
    const placeholder = generatePlaceholderAvatar(16);
    const success = await createCharacter(user.id, characterName, placeholder);
    
    if (success) {
      setShowCreateModal(false);
      // Prompt to take photo
      Alert.alert(
        'Character Created!',
        'Would you like to take a selfie to create your pixelated avatar?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Take Photo', onPress: () => handleOpenCamera() },
        ]
      );
    }
  };

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to create your avatar');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !user?.id) return;

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (!photo || !photo.base64) {
        Alert.alert('Error', 'Failed to capture photo');
        return;
      }

      // Resize to smaller dimensions for pixelation
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 64, height: 64 } }],
        { base64: true, format: ImageManipulator.SaveFormat.PNG }
      );

      if (!manipResult.base64) {
        Alert.alert('Error', 'Failed to process photo');
        return;
      }

      // Get pixel settings from character evolution
      const pixelSize = characterResponse?.evolution?.pixel_settings?.pixel_size || 8;
      const colorPalette = characterResponse?.evolution?.pixel_settings?.color_palette || 16;

      // Process the actual image into pixel data
      const pixelData = await processImageToPixels(
        manipResult.base64,
        pixelSize,
        colorPalette
      );
      
      // Update avatar with the actual processed pixel data
      await updateAvatar(user.id, pixelData);
      setShowCamera(false);
      
      // Refresh character to show new avatar
      await fetchCharacter(user.id);
      
      Alert.alert('Avatar Updated!', 'Your pixelated avatar has been created from your photo!');
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  // Handle slot press in equipped items grid
  const handleSlotPress = (category: ItemCategory, equippedItem: InventoryItem | null) => {
    setSelectedSlotCategory(category);
    setSelectedSlotItem(equippedItem);
    setShowInventoryModal(true);
  };

  // Handle equip item
  const handleEquipItem = async (itemId: string) => {
    if (!user?.id) return;
    const success = await equipItem(user.id, itemId);
    if (success) {
      setShowInventoryModal(false);
      fetchInventory(user.id);
      fetchCharacter(user.id); // Refresh to update equipped items display
    }
  };

  // Handle unequip item
  const handleUnequipItem = async (category: string) => {
    if (!user?.id) return;
    const success = await unequipItem(user.id, category);
    if (success) {
      setShowInventoryModal(false);
      fetchInventory(user.id);
      fetchCharacter(user.id); // Refresh to update equipped items display
    }
  };

  // Get equipped items info for avatar visual overlay
  const getEquippedItemsInfo = () => {
    if (!character?.equipped_items || !inventory) return {};
    
    const equippedInfo: Record<string, { item_id: string; item_name: string; category: ItemCategory; rarity: string }> = {};
    
    Object.entries(character.equipped_items).forEach(([category, itemId]) => {
      const inventoryItem = inventory.find(item => item.item_id === itemId);
      if (inventoryItem) {
        equippedInfo[category] = {
          item_id: itemId as string,
          item_name: inventoryItem.item_name,
          category: category as ItemCategory,
          rarity: inventoryItem.rarity,
        };
      }
    });
    
    return equippedInfo;
  };

  // Show create character modal if no character exists
  if (!character && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noCharacterContainer}>
          <View style={styles.placeholderAvatar}>
            <Ionicons name="person-add" size={64} color={colors.accent.primary} />
          </View>
          <Text style={styles.noCharacterTitle}>Create Your Character</Text>
          <Text style={styles.noCharacterSubtitle}>
            Your Tamagotchi-style companion that grows with your progress
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="sparkles" size={20} color={colors.background.primary} />
            <Text style={styles.createButtonText}>Create Character</Text>
          </TouchableOpacity>
        </View>

        {/* Create Modal */}
        <Modal visible={showCreateModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Name Your Character</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Character Name</Text>
                <View style={styles.textInputWrapper}>
                  <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
                  <Text style={styles.textInput}>{characterName}</Text>
                </View>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleCreateCharacter}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background.primary} />
                  ) : (
                    <Text style={styles.confirmText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (isLoading && !character) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const stats = characterResponse?.stats;
  const mood = characterResponse?.mood || 'neutral';
  const evolution = characterResponse?.evolution;
  const moodConfig = characterResponse?.mood_config;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{character?.name || 'Character'}</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleOpenCamera}>
          <Ionicons name="camera" size={20} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <PixelatedAvatar
            pixelData={character?.avatar_pixel_data}
            size={140}
            mood={mood}
            moodEffects={moodConfig?.visual_effects}
            glowColor={moodConfig?.glow_color}
            equippedItems={getEquippedItemsInfo()}
            showEquippedOverlay={true}
          />
          
          <View style={styles.moodBadge}>
            <Text style={styles.moodEmoji}>{MOOD_EXPRESSIONS[mood]}</Text>
            <Text style={styles.moodText}>{mood.charAt(0).toUpperCase() + mood.slice(1)}</Text>
          </View>
        </View>

        {/* Evolution Badge */}
        <View style={styles.evolutionCard}>
          <View style={[styles.evolutionBadge, { backgroundColor: EVOLUTION_COLORS[evolution?.current_tier || 'seedling'] + '20' }]}>
            <Ionicons
              name={EVOLUTION_DISPLAY[evolution?.current_tier || 'seedling'].icon as any}
              size={24}
              color={EVOLUTION_COLORS[evolution?.current_tier || 'seedling']}
            />
            <Text style={[styles.evolutionName, { color: EVOLUTION_COLORS[evolution?.current_tier || 'seedling'] }]}>
              {EVOLUTION_DISPLAY[evolution?.current_tier || 'seedling'].name}
            </Text>
          </View>
          
          {/* Evolution Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Evolution Progress</Text>
              <Text style={styles.progressValue}>{Math.round(stats?.evolution_progress || 0)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${stats?.evolution_progress || 0}%`,
                    backgroundColor: EVOLUTION_COLORS[evolution?.current_tier || 'seedling'],
                  },
                ]}
              />
            </View>
            <Text style={styles.progressHint}>
              {character?.verified_task_count || 0} verified tasks
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={24} color={colors.status.warning} />
            <Text style={styles.statValue}>{stats?.energy || 0}</Text>
            <Text style={styles.statLabel}>Energy</Text>
            <View style={styles.miniBar}>
              <View style={[styles.miniFill, { width: `${stats?.energy || 0}%`, backgroundColor: colors.status.warning }]} />
            </View>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={24} color={colors.accent.primary} />
            <Text style={styles.statValue}>{stats?.integrity || 0}</Text>
            <Text style={styles.statLabel}>Integrity</Text>
            <View style={styles.miniBar}>
              <View style={[styles.miniFill, { width: `${stats?.integrity || 0}%`, backgroundColor: colors.accent.primary }]} />
            </View>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={colors.goals.creativity} />
            <Text style={styles.statValue}>{stats?.momentum || 0}</Text>
            <Text style={styles.statLabel}>Momentum</Text>
            <View style={styles.miniBar}>
              <View style={[styles.miniFill, { width: `${stats?.momentum || 0}%`, backgroundColor: colors.goals.creativity }]} />
            </View>
          </View>
        </View>

        {/* Equipped Items Grid - 14 Slots */}
        <EquippedItemsGrid
          equippedItems={character?.equipped_items || {}}
          inventory={inventory}
          onSlotPress={handleSlotPress}
        />

        {/* Trust Score Section */}
        {trustScore && (
          <View style={styles.trustCard}>
            <View style={styles.trustHeader}>
              <Ionicons name="ribbon" size={24} color={getTrustColor(trustScore.tier)} />
              <Text style={styles.trustTitle}>Trust Score</Text>
            </View>
            <View style={styles.trustContent}>
              <Text style={[styles.trustScore, { color: getTrustColor(trustScore.tier) }]}>
                {trustScore.trust_score}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: getTrustColor(trustScore.tier) + '20' }]}>
                <Text style={[styles.tierText, { color: getTrustColor(trustScore.tier) }]}>
                  {trustScore.tier.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.trustInfo}>
              <View style={styles.trustInfoRow}>
                <Text style={styles.trustInfoLabel}>Reward Multiplier</Text>
                <Text style={styles.trustInfoValue}>
                  x{trustScore.tier_config.reward_multiplier.toFixed(1)}
                </Text>
              </View>
              <View style={styles.trustInfoRow}>
                <Text style={styles.trustInfoLabel}>Verified Tasks</Text>
                <Text style={styles.trustInfoValue}>{trustScore.verified_task_count}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Evolution Requirements */}
        {evolution?.can_evolve && !evolution.can_evolve.can_evolve && evolution.can_evolve.blockers.length > 0 && (
          <View style={styles.blockersCard}>
            <Text style={styles.blockersTitle}>Next Evolution Requirements</Text>
            {evolution.can_evolve.blockers.map((blocker, index) => (
              <View key={index} style={styles.blockerRow}>
                <Ionicons name="lock-closed" size={16} color={colors.text.tertiary} />
                <Text style={styles.blockerText}>{blocker}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Inventory Modal */}
      <InventoryModal
        visible={showInventoryModal}
        category={selectedSlotCategory}
        currentEquipped={selectedSlotItem}
        inventory={inventory}
        isLoading={isLoading}
        onEquip={handleEquipItem}
        onUnequip={handleUnequipItem}
        onClose={() => {
          setShowInventoryModal(false);
          setSelectedSlotCategory(null);
          setSelectedSlotItem(null);
        }}
      />

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide}>
              <View style={styles.guideCorner} />
            </View>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraCloseButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={{ width: 50 }} />
          </View>
          <Text style={styles.cameraHint}>
            Position your face in the frame
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getTrustColor(tier: string): string {
  switch (tier) {
    case 'exemplary':
      return colors.accent.primary;
    case 'standard':
      return colors.goals.focus;
    case 'probation':
      return colors.status.warning;
    case 'restricted':
      return colors.status.error;
    default:
      return colors.text.secondary;
  }
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  noCharacterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: colors.accent.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...shadows.soft,
  },
  noCharacterTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  noCharacterSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    ...shadows.glow,
  },
  createButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  evolutionCard: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  evolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  evolutionName: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
    marginBottom: 8,
  },
  miniBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 2,
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
  trustCard: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  trustContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trustScore: {
    fontSize: 48,
    fontWeight: '800',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trustInfo: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  trustInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trustInfoLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  trustInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  blockersCard: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  blockersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
  },
  blockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  blockerText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: colors.background.primary,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuide: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderRadius: 100,
    opacity: 0.5,
  },
  guideCorner: {},
  cameraControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  cameraCloseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
  },
  cameraHint: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
  },
});
