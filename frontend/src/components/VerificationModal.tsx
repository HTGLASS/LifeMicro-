import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Verification } from '../types/character';
import { colors, shadows } from '../constants/theme';

interface VerificationModalProps {
  visible: boolean;
  verification: Verification | null;
  minCompletionTime: number;
  startedAt: string;
  onSubmit: (verificationResponse: any, reflectionText?: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export default function VerificationModal({
  visible,
  verification,
  minCompletionTime,
  startedAt,
  onSubmit,
  onSkip,
  onCancel,
}: VerificationModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canComplete, setCanComplete] = useState(false);

  // Timer effect for minimum completion time
  useEffect(() => {
    if (!visible || !startedAt) return;

    const updateTimer = () => {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, minCompletionTime - elapsed);
      
      setTimeRemaining(remaining);
      setCanComplete(remaining === 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [visible, startedAt, minCompletionTime]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedOption(null);
      setReflectionText('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!verification) {
      // No verification needed, just complete
      onSubmit(null);
      return;
    }

    const verificationResponse: any = {
      type: verification.type,
    };

    if (verification.type === 'contextual_question' && selectedOption) {
      verificationResponse.answer = selectedOption;
    }

    onSubmit(
      verificationResponse,
      verification.type === 'text_reflection' ? reflectionText : undefined
    );
  };

  const isValidInput = () => {
    if (!verification) return true;
    
    if (verification.type === 'contextual_question') {
      return !!selectedOption;
    }
    if (verification.type === 'text_reflection') {
      return reflectionText.length >= (verification.min_length || 50);
    }
    return true;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVerificationContent = () => {
    if (!verification) {
      return (
        <View style={styles.noVerificationContent}>
          <Ionicons name="checkmark-circle" size={48} color={colors.accent.primary} />
          <Text style={styles.noVerificationText}>
            Great job! Complete the task when you're ready.
          </Text>
        </View>
      );
    }

    switch (verification.type) {
      case 'contextual_question':
        return (
          <View style={styles.verificationContent}>
            <Text style={styles.verificationQuestion}>
              {verification.question || 'Quick check:'}
            </Text>
            <View style={styles.optionsContainer}>
              {verification.options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selectedOption === option && styles.optionSelected,
                  ]}
                  onPress={() => setSelectedOption(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedOption === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'text_reflection':
        return (
          <View style={styles.verificationContent}>
            <Text style={styles.verificationQuestion}>
              {verification.prompt || 'Share a brief reflection:'}
            </Text>
            <TextInput
              style={styles.reflectionInput}
              placeholder="Write your reflection here..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
              value={reflectionText}
              onChangeText={setReflectionText}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {reflectionText.length} / {verification.min_length || 50} characters
            </Text>
          </View>
        );

      case 'photo_upload':
        return (
          <View style={styles.verificationContent}>
            <Text style={styles.verificationQuestion}>
              {verification.prompt || 'Take a photo of your completed task'}
            </Text>
            <TouchableOpacity style={styles.photoButton}>
              <Ionicons name="camera" size={32} color={colors.accent.primary} />
              <Text style={styles.photoButtonText}>Open Camera</Text>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Photo verification coming soon. You can skip for now.
            </Text>
          </View>
        );

      case 'voice_reflection':
        return (
          <View style={styles.verificationContent}>
            <Text style={styles.verificationQuestion}>
              {verification.prompt || 'Record a voice reflection'}
            </Text>
            <TouchableOpacity style={styles.voiceButton}>
              <Ionicons name="mic" size={32} color={colors.accent.primary} />
              <Text style={styles.voiceButtonText}>Hold to Record</Text>
            </TouchableOpacity>
            <Text style={styles.voiceHint}>
              Voice verification coming soon. You can skip for now.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {verification ? 'Verification Check' : 'Ready to Complete?'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <Ionicons name="close" size={24} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Timer */}
          {!canComplete && (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={20} color={colors.status.warning} />
              <Text style={styles.timerText}>
                Min time remaining: {formatTime(timeRemaining)}
              </Text>
            </View>
          )}

          {/* Verification Content */}
          {renderVerificationContent()}

          {/* Strictness Indicator */}
          {verification?.required && (
            <View style={styles.strictnessContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.status.warning} />
              <Text style={styles.strictnessText}>
                Verification required for full reward
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.modalActions}>
            {verification && !verification.required && (
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipText}>Skip Verification</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.completeButton,
                (!canComplete || !isValidInput()) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canComplete || !isValidInput()}
            >
              {!canComplete ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={colors.background.primary} />
                  <Text style={styles.completeText}>Complete Task</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.status.warning,
  },
  noVerificationContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noVerificationText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  verificationContent: {
    marginBottom: 20,
  },
  verificationQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    backgroundColor: colors.background.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.soft,
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  reflectionInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  charCount: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: 8,
  },
  photoButton: {
    alignItems: 'center',
    backgroundColor: colors.accent.soft,
    paddingVertical: 24,
    borderRadius: 16,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  photoHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 12,
  },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: colors.accent.soft,
    paddingVertical: 24,
    borderRadius: 16,
    gap: 8,
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  voiceHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 12,
  },
  strictnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  strictnessText: {
    fontSize: 13,
    color: colors.status.warning,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  completeButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.glow,
  },
  buttonDisabled: {
    backgroundColor: colors.border.primary,
    shadowOpacity: 0,
  },
  completeText: {
    fontSize: 16,
    color: colors.background.primary,
    fontWeight: '700',
  },
});
