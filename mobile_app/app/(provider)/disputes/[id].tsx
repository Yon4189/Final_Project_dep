// app/(provider)/disputes/[id].tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerService } from '@/app/services/provider.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  under_review: Colors.primary,
  resolved: Colors.success,
  rejected: Colors.error,
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  under_review: 'eye-outline',
  resolved: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

export default function DisputeDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [newMessage, setNewMessage] = useState('');

  const safeFormat = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const { data: dispute, isLoading, refetch } = useQuery({
    queryKey: ['dispute', id],
    queryFn: async () => {
      const response = await providerService.getDisputeDetails(id as string);
      if (!response.success) throw new Error(response.message || 'Failed to load');
      return response.data as any;
    },
    refetchInterval: 10000, // Poll every 10s for new messages
  });

  const sendMessage = useMutation({
    mutationFn: (msg: string) => providerService.addDisputeMessage(id as string, msg),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['dispute', id] });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to send message');
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
  };

  // Scroll to bottom when messages load
  useEffect(() => {
    if (dispute?.messages?.length) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [dispute?.messages?.length]);

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!dispute) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Dispute not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = dispute.status || 'pending';
  const statusColor = STATUS_COLORS[status] || Colors.text.secondary;
  const statusIcon = STATUS_ICONS[status] || 'help-outline';
  const messages: any[] = dispute.messages || [];
  const isClosed = status === 'resolved' || status === 'rejected';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {dispute.reason ? t(`disputes.reasons.${dispute.reason}`, dispute.reason.replace('_', ' ')) : `Dispute #${id}`}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={11} color={statusColor} />
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Dispute Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Description</Text>
        <Text style={styles.infoValue} numberOfLines={3}>
          {dispute.description}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoMeta}>
            Filed: {safeFormat(dispute.createdAt || dispute.created_at)}
          </Text>
          {dispute.bookingId || dispute.bookingID ? (
            <TouchableOpacity
              onPress={() => router.push(`/(provider)/requests/${dispute.bookingId || dispute.bookingID}`)}
            >
              <Text style={styles.viewBookingLink}>View Booking →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Chat Section */}
      <View style={styles.chatContainer}>
        <Text style={styles.chatTitle}>
          <Ionicons name="chatbubbles-outline" size={14} color={Colors.text.secondary} />
          {'  '}Conversation with Support
        </Text>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyChatText}>No messages yet. Send a message to support.</Text>
            </View>
          ) : (
            messages.map((msg: any, idx: number) => {
              const isProvider = msg.sender_type === 'provider';
              return (
                <View
                  key={msg.id?.toString() || idx.toString()}
                  style={[styles.messageBubbleRow, isProvider ? styles.rowRight : styles.rowLeft]}
                >
                  {!isProvider && (
                    <View style={styles.adminAvatar}>
                      <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                    </View>
                  )}
                  <View style={[
                    styles.bubble,
                    isProvider ? styles.bubbleProvider : styles.bubbleAdmin,
                  ]}>
                    {!isProvider && (
                      <Text style={styles.bubbleSender}>Support</Text>
                    )}
                    <Text style={isProvider ? styles.bubbleTextProvider : styles.bubbleText}>
                      {msg.message}
                    </Text>
                    <Text style={isProvider ? styles.bubbleTimeProvider : styles.bubbleTime}>
                      {safeFormat(msg.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input */}
        {isClosed ? (
          <View style={styles.closedBanner}>
            <Ionicons
              name={status === 'resolved' ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={statusColor}
            />
            <Text style={[styles.closedText, { color: statusColor }]}>
              This dispute is {status}. No further messages.
            </Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.text.secondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!newMessage.trim() || sendMessage.isPending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, maxWidth: 220 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  infoCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 14, color: Colors.text.primary, lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  infoMeta: { fontSize: 11, color: Colors.text.secondary },
  viewBookingLink: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  chatContainer: {
    flex: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  chatTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.text.secondary,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  messagesList: { flex: 1 },
  messagesContent: { padding: 12, gap: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyChatText: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center' },
  messageBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  adminAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 6,
  },
  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  bubbleAdmin: {
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleProvider: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleSender: { fontSize: 10, fontWeight: '700', color: Colors.primary, marginBottom: 3 },
  bubbleText: { fontSize: 14, color: Colors.text.primary, lineHeight: 20 },
  bubbleTextProvider: { fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: Colors.text.secondary, marginTop: 4, textAlign: 'right' },
  bubbleTimeProvider: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right' },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  closedText: { fontSize: 13, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.text.primary,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 16, color: Colors.text.secondary },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: '600' },
});
