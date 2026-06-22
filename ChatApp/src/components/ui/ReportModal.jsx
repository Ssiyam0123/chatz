import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createReport } from '../../api/api';
import { radii, spacing } from '../../theme/blushDusk';
import { useTheme } from '../../theme/ThemeContext';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'hate_speech', label: 'Hate speech' },
  { key: 'nudity', label: 'Nudity or sexual content' },
  { key: 'violence', label: 'Violence or threats' },
  { key: 'misinformation', label: 'False information' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'other', label: 'Other' },
];

export default function ReportModal({ visible, onClose, targetType, targetId, targetName }) {
  const { colors: themeColors, isDark, toggleTheme } = useTheme();
  colors = themeColors;
  styles = getStyles(colors);
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('reason'); // 'reason' | 'details' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const submittingRef = useRef(false);

  const handleReset = () => {
    setSelectedReason(null);
    setDetails('');
    setStep('reason');
    setErrorMessage('');
    setIsSubmitting(false);
    submittingRef.current = false;
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleReasonSelect = (reason) => {
    setSelectedReason(reason);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedReason || submittingRef.current) return;
    
    submittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      await createReport(targetType, targetId, selectedReason, details.trim() || undefined);
      setStep('success');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to submit report';
      setErrorMessage(msg);
      setStep('error');
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const renderReasonStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.modalTitle}>Report {targetName || targetType}</Text>
      <Text style={styles.modalSubtitle}>Why are you reporting this? Your report will be kept anonymous.</Text>
      
      <View style={styles.reasonsList}>
        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.key}
            style={styles.reasonItem}
            onPress={() => handleReasonSelect(reason.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.reasonText}>{reason.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.stepContainer}
    >
      <TouchableOpacity onPress={() => setStep('reason')} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      
      <Text style={styles.modalTitle}>Add details (optional)</Text>
      <Text style={styles.modalSubtitle}>
        Provide any additional context that might help us review this report.
      </Text>
      
      <TextInput
        style={styles.detailsInput}
        placeholder="Describe what happened..."
        placeholderTextColor={colors.textSoft}
        multiline
        value={details}
        onChangeText={setDetails}
        maxLength={1000}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{details.length}/1000</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleClose}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSuccessStep = () => (
    <View style={[styles.stepContainer, styles.centerStep]}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>
      <Text style={styles.modalTitle}>Report Submitted</Text>
      <Text style={styles.modalSubtitle}>
        Thank you. Our moderation team will review this report. You won't be notified of the outcome.
      </Text>
      <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorStep = () => (
    <View style={[styles.stepContainer, styles.centerStep]}>
      <View style={styles.errorIcon}>
        <Ionicons name="close-circle" size={64} color={colors.danger} />
      </View>
      <Text style={styles.modalTitle}>Report Failed</Text>
      <Text style={styles.modalSubtitle}>{errorMessage}</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => {
            setStep('reason');
            setErrorMessage('');
          }}
        >
          <Text style={styles.submitBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {step === 'reason' && renderReasonStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </View>
      </View>
    </Modal>
  );
}

let styles;
let colors;
const getStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.large,
    borderTopRightRadius: radii.large,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    maxHeight: '80%',
  },
  stepContainer: {
    paddingHorizontal: spacing.xl,
  },
  centerStep: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  backBtn: {
    marginBottom: spacing.md,
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  reasonsList: {
    marginBottom: spacing.lg,
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reasonText: {
    fontSize: 15,
    color: colors.text,
  },
  detailsInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
    outlineStyle: 'none',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.textSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.small,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.small,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  doneBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.small,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 46,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
});
