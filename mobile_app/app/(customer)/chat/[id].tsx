// app/(customer)/chat/[id].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  AppState,
  Linking,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { subscribeToConversation, unsubscribeFromConversation } from '@/app/services/pusherClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface Message {
  id: string;               // unique client-side key (either "temp_..." or "msg_<id>")
  messageID?: number;       // backend primary key (if real)
  message: string;
  sender_type: 'customer' | 'provider';
  sender_id: number;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  // File attachment fields
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
}

interface Conversation {
  conversationID: number;
  customerID: number;
  providerID: number;
  bookingID: number | null;
  last_message: string | null;
  last_message_at: string;
  customer_unread_count: number;
  provider_unread_count: number;
  created_at: string;
  updated_at: string;
}

interface ProviderInfo {
  providerID: number;
  fullname: string;
  businessName?: string;
  profileImage?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id: providerId } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  const wsSubscribed = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationError, setConversationError] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Normalize a backend message: give it a stable client-side id.
  const normalizeMessage = (m: any): Message => {
    // If the backend already sent an 'id' field, use it; otherwise use messageID.
    const rawId = m.id ?? m.messageID;
    // Real messages get prefix 'msg_', optimistic ones already have 'temp_'
    const id = rawId ? `msg_${rawId}` : `temp_${Date.now()}_${Math.random()}`;
    return {
      ...m,
      id,
      status: m.status ?? 'sent',
    };
  };

  // Optional: detect duplicate keys (for debugging)
  useEffect(() => {
    const ids = messages.map(m => m.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.warn('Duplicate message IDs:', [...new Set(duplicates)]);
    }
  }, [messages]);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
      return () => {
        isMounted.current = false;
      };
    }, [providerId])
  );

  // Subscribe to WebSocket once we have a real conversationID.
  useEffect(() => {
    if (!conversation?.conversationID || wsSubscribed.current) return;
    wsSubscribed.current = true;

    subscribeToConversation(conversation.conversationID, (data: any) => {
      if (!isMounted.current) return;
      const incoming = normalizeMessage(data);
      setMessages(prev => {
        const exists = prev.some(m => m.id === incoming.id);
        if (exists) return prev;
        return [...prev, incoming];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
      // Mark as read silently
      markMessagesAsRead(conversation!.conversationID).catch(() => {});
    });

    // Fallback AppState refresh when foregrounded
    const subscription = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshMessages();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
      if (conversation?.conversationID) {
        unsubscribeFromConversation(conversation.conversationID);
      }
      wsSubscribed.current = false;
    };
  }, [conversation?.conversationID]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const userDataStr = await SecureStore.getItemAsync('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setCustomerId(userData.customerID || userData.id);
      }

      // Guard against 'index' or invalid ID
      if (!providerId || providerId === 'index' || isNaN(parseInt(providerId))) {
        console.log('ChatScreen - Invalid providerId, skipping data load:', providerId);
        setIsLoading(false);
        return;
      }

      await fetchProviderDetails();
      await getOrCreateConversation();
    } catch (error) {
      console.error('Error loading chat data:', error);
      if (isMounted.current) {
        Alert.alert(t('common.error', 'Error'), t('chat.loadError', 'Failed to load chat. Please try again.'));
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const getOrCreateConversation = async () => {
    try {
      setConversationError(false);
      const response = await api.post<any>('/chat/conversations', {
        providerID: parseInt(providerId)
      });
      if (response.success) {
        const conversationData = response.data.conversation;
        const initialMessages = (response.data.messages || []).map(normalizeMessage);
        if (isMounted.current) {
          setConversation(conversationData);
          setMessages(initialMessages.reverse());
          if (!initialMessages.length && conversationData.conversationID) {
            await fetchMessages(conversationData.conversationID);
          }
        }
      } else {
        console.warn('Failed to get/create conversation:', response.message);
        if (isMounted.current) setConversationError(true);
      }
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      if (isMounted.current) setConversationError(true);
    }
  };

  const fetchProviderDetails = async () => {
    if (!providerId || providerId === 'index' || isNaN(parseInt(providerId))) return;
    try {
      const response = await api.get<any>(`/customer/providers/${providerId}`);
      if (response.success && response.data) {
        if (isMounted.current) {
          setProvider({
            providerID: parseInt(providerId),
            fullname: response.data.fullname || response.data.name || t('common.provider', 'Provider'),
            businessName: response.data.businessName,
            profileImage: response.data.profileImage || response.data.profilePicture,
          });
          if (response.data.profileImage || response.data.profilePicture) {
            const pic = response.data.profileImage || response.data.profilePicture;
            const fullPic = pic.startsWith('http')
              ? pic
              : `${API_BASE_URL.replace('/api', '')}/${pic}`;
            setProvider(prev => prev ? { ...prev, profileImage: fullPic } : null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching provider details:', error);
    }
  };

  const fetchMessages = async (conversationId: number, pageNum: number = 1) => {
    try {
      const response = await api.get<any>(`/chat/conversations/${conversationId}?page=${pageNum}`);
      if (response.success && response.data?.messages?.data) {
        if (!isMounted.current) return;

        const newMessages: Message[] = response.data.messages.data.map(normalizeMessage);
        // Backend returns DESC (newest first). We store in ASC order (oldest first) for FlatList with inverted={false}
        const reversedNewMessages = [...newMessages].reverse();

        if (pageNum === 1) {
          setMessages(reversedNewMessages);
        } else {
          // Append to the beginning (older messages) with deduplication
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNew = reversedNewMessages.filter(m => !existingIds.has(m.id));
            return [...uniqueNew, ...prev]; // older messages first
          });
        }

        setHasMore(response.data.messages.current_page < response.data.messages.last_page);
        setPage(pageNum);

        await markMessagesAsRead(conversationId);

        if (pageNum === 1 && newMessages.length > 0) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchNewMessages = async () => {
    if (!conversation?.conversationID || !isMounted.current) return;
    try {
      const response = await api.get<any>(`/chat/conversations/${conversation.conversationID}?page=1`);
      if (response.success && response.data?.messages?.data && isMounted.current) {
        const latestMessages: Message[] = response.data.messages.data.map(normalizeMessage);
        const reversedLatest = [...latestMessages].reverse(); // now oldest to newest

        let addedCount = 0;
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const trulyNew = reversedLatest.filter(m => !existingIds.has(m.id));
          addedCount = trulyNew.length;
          return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
        });

        if (addedCount > 0) {
          await markMessagesAsRead(conversation.conversationID);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }
    } catch (error) {
      console.error('Error fetching new messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: number) => {
    try {
      await api.post<any>(`/chat/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const refreshMessages = async () => {
    if (!conversation?.conversationID || !isMounted.current) return;
    setRefreshing(true);
    await fetchMessages(conversation.conversationID, 1);
    if (isMounted.current) setRefreshing(false);
  };

  const loadMoreMessages = () => {
    if (hasMore && !isLoading && conversation?.conversationID && isMounted.current) {
      fetchMessages(conversation.conversationID, page + 1);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending || !isMounted.current) return;
    if (!conversation?.conversationID) {
      Alert.alert(t('common.info', 'Not Ready'), t('chat.loadingWait', 'The conversation is still loading. Please wait a moment and try again.'));
      return;
    }

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      message: messageText,
      sender_type: 'customer',
      sender_id: customerId || 0,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await api.post<any>('/chat/messages', {
        conversationID: conversation.conversationID,
        message: messageText,
      });

      if (response.success && response.data?.message && isMounted.current) {
        const realMessage = normalizeMessage(response.data.message);
        realMessage.status = 'sent';
        // Replace optimistic with real
        setMessages(prev => prev.map(msg => (msg.id === tempId ? realMessage : msg)));
      } else {
        // Remove optimistic on failure
        if (isMounted.current) {
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          Alert.alert(t('common.error', 'Error'), t('chat.sendError', 'Failed to send message. Please try again.'));
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (isMounted.current) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        if (error.response?.status === 403) {
          Alert.alert(t('common.accessDenied', 'Access Denied'), t('chat.noPermissionSend', 'You do not have permission to send messages in this conversation'));
        } else {
          Alert.alert(t('common.error', 'Error'), t('chat.sendErrorConnection', 'Failed to send message. Please check your connection.'));
        }
      }
    } finally {
      if (isMounted.current) setIsSending(false);
    }
  };

  const sendFile = async (uri: string, name: string, mimeType: string) => {
    if (!conversation?.conversationID || !isMounted.current) return;
    setIsSending(true);

    const tempId = `temp_file_${Date.now()}_${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      message: '',
      file_name: name,
      file_type: mimeType,
      mime_type: mimeType,
      sender_type: 'customer',
      sender_id: customerId || 0,
      created_at: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const formData = new FormData();
      formData.append('conversationID', String(conversation.conversationID));
      formData.append('message', '');
      formData.append('file', { uri, name, type: mimeType } as any);

      const response = await api.upload<any>('/chat/messages', formData);

      if (response.success && response.data?.message && isMounted.current) {
        const realMessage = normalizeMessage(response.data.message);
        realMessage.status = 'sent';
        setMessages(prev => prev.map(msg => (msg.id === tempId ? realMessage : msg)));
      } else {
        if (isMounted.current) {
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          Alert.alert(t('common.error', 'Error'), t('chat.sendError', 'Failed to send file. Please try again.'));
        }
      }
    } catch (error: any) {
      console.error('Error sending file:', error);
      if (isMounted.current) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        Alert.alert(t('common.error', 'Error'), t('chat.sendErrorConnection', 'Failed to send file. Please check your connection.'));
      }
    } finally {
      if (isMounted.current) setIsSending(false);
    }
  };

  const handleAttachment = () => {
    Alert.alert(
      t('chat.sendFile', 'Send File'),
      t('chat.chooseFileType', 'Choose what to send'),
      [
        {
          text: t('chat.photo', 'Photo / Image'),
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error', 'Error'), 'Permission to access photos is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const name = asset.fileName || `photo_${Date.now()}.jpg`;
              const mimeType = asset.mimeType || 'image/jpeg';
              await sendFile(asset.uri, name, mimeType);
            }
          },
        },
        {
          text: t('chat.document', 'Document'),
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                     'application/vnd.ms-excel',
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     'text/plain'],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              await sendFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
            }
          },
        },
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      ]
    );
  };

  // ... (handleCall, handleShare, handleViewProfile, handleViewBooking remain the same) ...
  const handleCall = () => {
    const phoneNumber = provider?.phone || provider?.phoneNumber;
    if (!phoneNumber) {
      Alert.alert(t('common.info', 'Info'), t('profile.phoneNotAvailable', 'Phone number not available for this provider'));
      return;
    }
    Alert.alert(
      t('chat.callProvider', 'Call Provider'),
      t('chat.callConfirm', { name: provider?.businessName || provider?.fullname, phone: phoneNumber, defaultValue: `Call ${provider?.businessName || provider?.fullname} at ${phoneNumber}?` }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('providerRequests.call', 'Call'),
          onPress: () => {
            const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
            Linking.openURL(url).catch(() => Alert.alert(t('common.error', 'Error'), t('chat.callFail', 'Could not initiate call')));
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const providerName = provider?.businessName || provider?.fullname || 'this provider';
      const shareContent = {
        title: `Chat with ${providerName}`,
        message: `I'm discussing a service with ${providerName} on HomeLink. Join the conversation!`,
        url: `homelink://chat/${providerId}`,
      };
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Could not share content');
    }
  };

  const handleViewProfile = () => router.push(`/(customer)/provider/${providerId}`);

  const handleViewBooking = () => {
    if (conversation?.bookingID) router.push(`/(customer)/booking/${conversation.bookingID}`);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return t('providerDashboard.today', 'Today');
    if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday', 'Yesterday');
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCustomer = item.sender_type === 'customer';
    const showDate = index === 0 ||
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();
    const isImage = item.mime_type?.startsWith('image/');

    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isCustomer ? styles.customerMessage : styles.providerMessage]}>
          <View style={[styles.messageBubble, isCustomer ? styles.customerBubble : styles.providerBubble]}>
            {/* File attachment rendering */}
            {item.file_url && isImage && (
              <TouchableOpacity onPress={() => Linking.openURL(item.file_url!)}>
                <Image
                  source={{ uri: item.file_url }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {item.file_url && !isImage && (
              <TouchableOpacity
                style={styles.fileAttachment}
                onPress={() => Linking.openURL(item.file_url!)}
              >
                <Ionicons name="document-outline" size={20} color={isCustomer ? Colors.surface : Colors.primary} />
                <Text style={[styles.fileName, isCustomer ? { color: Colors.surface } : { color: Colors.text.primary }]} numberOfLines={1}>
                  {item.file_name || 'File'}
                </Text>
              </TouchableOpacity>
            )}
            {/* Optimistic file (no URL yet) */}
            {!item.file_url && item.file_name && (
              <View style={styles.fileAttachment}>
                <ActivityIndicator size="small" color={isCustomer ? Colors.surface : Colors.primary} />
                <Text style={[styles.fileName, isCustomer ? { color: Colors.surface } : { color: Colors.text.primary }]} numberOfLines={1}>
                  {item.file_name}
                </Text>
              </View>
            )}
            {/* Text message */}
            {!!item.message && (
              <Text style={[styles.messageText, isCustomer ? styles.customerMessageText : styles.providerMessageText]}>
                {item.message}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.timestamp, isCustomer ? styles.customerTimestamp : styles.providerTimestamp]}>
                {formatTime(item.created_at)}
              </Text>
              {isCustomer && (
                <>
                  {item.status === 'sending' && (
                    <Ionicons name="time-outline" size={14} color={Colors.text.secondary} style={styles.statusIcon} />
                  )}
                  {item.status === 'sent' && (
                    <Ionicons name="checkmark" size={14} color={Colors.text.secondary} style={styles.statusIcon} />
                  )}
                  {item.status === 'delivered' && (
                    <Ionicons name="checkmark-done" size={14} color={Colors.text.secondary} style={styles.statusIcon} />
                  )}
                  {item.status === 'read' && (
                    <Ionicons name="checkmark-done" size={14} color={Colors.primary} style={styles.statusIcon} />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.profileContainer} onPress={handleViewProfile}>
        <View style={styles.avatarContainer}>
          {provider?.profileImage ? (
            <Image source={{ uri: provider.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {provider?.businessName?.charAt(0) || provider?.fullname?.charAt(0) || 'P'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {provider?.businessName || provider?.fullname || t('common.loading', 'Loading...')}
          </Text>
          {conversation?.bookingID ? (
            <TouchableOpacity onPress={handleViewBooking}>
              <Text style={styles.bookingInfo}>Booking #{conversation.bookingID}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.onlineStatus}>{t('providerDashboard.online', 'Online')}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCall} disabled={!provider?.phone}>
          <Ionicons name="call-outline" size={22} color={provider?.phone ? Colors.primary : Colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Alert.alert(t('chat.options', 'Chat Options'), t('chat.chooseOption', 'Choose an option'), [
              { text: t('chat.viewProviderProfile', 'View Provider Profile'), onPress: handleViewProfile },
              ...(conversation?.bookingID ? [{ text: t('chat.viewBookingDetails', 'View Booking Details'), onPress: handleViewBooking }] : []),
              { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            ]);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('chat.loadingConversation', 'Loading conversation...')}</Text>
        </View>
      </View>
    );
  }

  if (conversationError) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={Colors.text.secondary} />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>{t('chat.loadFail', 'Could not load conversation')}</Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => { setConversationError(false); getOrCreateConversation(); }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>{t('bookings.tryAgain', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: 20 }
        ]}
        ListHeaderComponent={renderHeader}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onRefresh={refreshMessages}
        refreshing={refreshing}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('chat.typeMessage', 'Type a message...')}
          placeholderTextColor={Colors.text.secondary}
          multiline
          maxLength={1001}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <Ionicons name="send" size={20} color={Colors.surface} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Styles remain exactly the same as before – no changes needed.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { padding: 8, marginRight: 4 },
  profileContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: Colors.primary },
  profileInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  bookingInfo: { fontSize: 12, color: Colors.primary, textDecorationLine: 'underline' },
  onlineStatus: { fontSize: 12, color: '#22c55e' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.text.secondary },
  messagesList: { paddingHorizontal: 16, paddingVertical: 20, flexGrow: 1 },
  dateDivider: { alignItems: 'center', marginVertical: 16 },
  dateText: {
    fontSize: 12,
    color: Colors.text.secondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageContainer: { marginBottom: 12, maxWidth: '80%' },
  customerMessage: { alignSelf: 'flex-end' },
  providerMessage: { alignSelf: 'flex-start' },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  customerBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  providerBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: { fontSize: 15, lineHeight: 20, marginBottom: 4 },
  customerMessageText: { color: Colors.surface },
  providerMessageText: { color: Colors.text.primary },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  timestamp: { fontSize: 10, marginRight: 4 },
  customerTimestamp: { color: Colors.surface + 'CC' },
  providerTimestamp: { color: Colors.text.secondary },
  statusIcon: { marginLeft: 2 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 0,
  },
  sendButtonDisabled: { backgroundColor: Colors.border },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});