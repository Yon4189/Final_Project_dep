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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

interface Message {
  id: string;
  message: string;
  sender_type: 'customer' | 'provider';
  sender_id: number;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
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
  phoneNumber?: string; // Add this for compatibility
}

interface Sender {
  fullname: string;
  profileImage?: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id: providerId } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadInitialData();

      return () => {
        // Cleanup when screen loses focus
        stopPolling();
        isMounted.current = false;
      };
    }, [providerId])
  );

  useEffect(() => {
    isMounted.current = true;

    // Start polling for new messages
    startPolling();

    // App state change listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, refresh messages
        refreshMessages();
      }
      appState.current = nextAppState;
    });

    return () => {
      stopPolling();
      subscription.remove();
      isMounted.current = false;
    };
  }, [conversation?.conversationID]);

  const startPolling = () => {
    // Poll for new messages every 3 seconds (faster for better UX)
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    pollingInterval.current = setInterval(() => {
      if (conversation?.conversationID && isMounted.current) {
        fetchNewMessages();
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load customer info from secure store
      const userDataStr = await SecureStore.getItemAsync('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setCustomerId(userData.customerID || userData.id);
      }

      // Fetch provider details first (to show info while conversation loads)
      await fetchProviderDetails();

      // Then get or create conversation
      await getOrCreateConversation();

    } catch (error) {
      console.error('Error loading chat data:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load chat. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const getOrCreateConversation = async () => {
    try {
      // Fix: Use the correct endpoint from your routes
      const response = await api.post<any>('/chat/conversations', {
        providerID: parseInt(providerId)
      });

      if (response.success) {
        const conversationData = response.data.conversation;
        const initialMessages = response.data.messages || [];

        if (isMounted.current) {
          setConversation(conversationData);
          setMessages([...initialMessages].reverse());

          // Load messages for this conversation if not returned here
          if (!initialMessages.length && conversationData.conversationID) {
            await fetchMessages(conversationData.conversationID);
          }
        }
      } else {
        if (isMounted.current) {
          Alert.alert('Error', response.message || 'Failed to start conversation');
        }
      }
    } catch (error: any) {
      console.error('Error creating conversation:', error);

      if (!isMounted.current) return;

      // Handle specific error cases
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to chat with this provider');
      } else if (error.response?.status === 422) {
        Alert.alert('Validation Error', 'Invalid provider information');
      } else {
        Alert.alert('Error', 'Failed to start conversation. Please try again.');
      }
    }
  };

  const fetchProviderDetails = async () => {
    try {
      // Fix: Use correct endpoint from your routes
      const response = await api.get<any>(`/customer/providers/${providerId}`);
      if (response.success && response.data) {
        if (isMounted.current) {
          setProvider({
            providerID: parseInt(providerId),
            fullname: response.data.fullname || response.data.name || 'Provider',
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
      // Fix: The endpoint is /chat/conversations/{id} which returns { conversation, messages }
      const response = await api.get<any>(`/chat/conversations/${conversationId}?page=${pageNum}`);

      if (response.success && response.data?.messages?.data) {
        if (!isMounted.current) return;

        const newMessages = response.data.messages.data;
        // Backend returns DESC (newest first), reverse it for FlatList
        const reversedNewMessages = [...newMessages].reverse();

        if (pageNum === 1) {
          setMessages(reversedNewMessages);
        } else {
          setMessages(prev => [...reversedNewMessages, ...prev]);
        }

        setHasMore(response.data.messages.current_page < response.data.messages.last_page);
        setPage(pageNum);

        // Mark messages as read
        await markMessagesAsRead(conversationId);

        // Scroll to bottom on first load
        if (pageNum === 1 && newMessages.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchNewMessages = async () => {
    if (!conversation?.conversationID || !isMounted.current) return;

    try {
      // Fix: Use correct endpoint
      const response = await api.get<any>(`/chat/conversations/${conversation.conversationID}?page=1&limit=20`);

      if (response.success && response.data?.messages?.data && isMounted.current) {
        const latestMessages = response.data.messages.data;
        const reversedLatest = [...latestMessages].reverse();

        // Check for new messages
        if (latestMessages.length > messages.length) {
          // Find messages that are not in current state
          const existingIds = new Set(messages.map(m => m.id));
          const newMessages = reversedLatest.filter((m: Message) => !existingIds.has(m.id));

          if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);

            // Mark new messages as read
            await markMessagesAsRead(conversation.conversationID);

            // Scroll to bottom if user is near bottom
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching new messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: number) => {
    try {
      // Fix: Use correct endpoint
      await api.post<any>(`/chat/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const refreshMessages = async () => {
    if (!conversation?.conversationID || !isMounted.current) return;

    setRefreshing(true);
    await fetchMessages(conversation.conversationID, 1);
    if (isMounted.current) {
      setRefreshing(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !isLoading && conversation?.conversationID && isMounted.current) {
      fetchMessages(conversation.conversationID, page + 1);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending || !conversation?.conversationID || !isMounted.current) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp_${Date.now()}`,
      message: messageText,
      sender_type: 'customer',
      sender_id: customerId || 0,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Fix: The endpoint is /chat/messages
      const response = await api.post<any>(`/chat/messages`, {
        conversationID: conversation.conversationID,
        message: messageText,
      });

      if (response.success && response.data?.message && isMounted.current) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(msg =>
            msg.id === optimisticMessage.id
              ? { ...response.data.message, status: 'sent' }
              : msg
          )
        );
      } else {
        // Remove optimistic message on failure
        if (isMounted.current) {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          Alert.alert('Error', 'Failed to send message. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      if (isMounted.current) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));

        if (error.response?.status === 403) {
          Alert.alert('Access Denied', 'You do not have permission to send messages in this conversation');
        } else {
          Alert.alert('Error', 'Failed to send message. Please check your connection.');
        }
      }
    } finally {
      if (isMounted.current) {
        setIsSending(false);
      }
    }
  };

  // NEW: Handle phone call
  const handleCall = () => {
    const phoneNumber = provider?.phone || provider?.phoneNumber;

    if (!phoneNumber) {
      Alert.alert('Info', 'Phone number not available for this provider');
      return;
    }

    Alert.alert(
      'Call Provider',
      `Call ${provider?.businessName || provider?.fullname} at ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const url = Platform.OS === 'android'
              ? `tel:${phoneNumber}`
              : `telprompt:${phoneNumber}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Could not initiate call');
            });
          }
        },
      ]
    );
  };

  // NEW: Handle share
  const handleShare = async () => {
    try {
      const providerName = provider?.businessName || provider?.fullname || 'this provider';

      const shareContent = {
        title: `Chat with ${providerName}`,
        message: `I'm discussing a service with ${providerName} on HomeLink. Join the conversation!`,
        url: `homelink://chat/${providerId}`, // Deep link to this chat
      };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        console.log('Content shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Could not share content');
    }
  };

  // NEW: Handle view profile
  const handleViewProfile = () => {
    router.push(`/(customer)/provider/${providerId}`);
  };

  // NEW: Handle booking details if exists
  const handleViewBooking = () => {
    if (conversation?.bookingID) {
      router.push(`/(customer)/booking/${conversation.bookingID}`);
    }
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

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCustomer = item.sender_type === 'customer';
    const showDate = index === 0 ||
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isCustomer ? styles.customerMessage : styles.providerMessage,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isCustomer ? styles.customerBubble : styles.providerBubble,
            ]}
          >
            <Text style={[
              styles.messageText,
              isCustomer ? styles.customerMessageText : styles.providerMessageText,
            ]}>
              {item.message}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.timestamp,
                isCustomer ? styles.customerTimestamp : styles.providerTimestamp,
              ]}>
                {formatTime(item.created_at)}
              </Text>
              {isCustomer && (
                <>
                  {item.status === 'sending' && (
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Colors.text.secondary}
                      style={styles.statusIcon}
                    />
                  )}
                  {item.status === 'sent' && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={Colors.text.secondary}
                      style={styles.statusIcon}
                    />
                  )}
                  {item.status === 'delivered' && (
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color={Colors.text.secondary}
                      style={styles.statusIcon}
                    />
                  )}
                  {item.status === 'read' && (
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color={Colors.primary}
                      style={styles.statusIcon}
                    />
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
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profileContainer}
        onPress={handleViewProfile}
      >
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
            {provider?.businessName || provider?.fullname || 'Loading...'}
          </Text>
          {conversation?.bookingID ? (
            <TouchableOpacity onPress={handleViewBooking}>
              <Text style={styles.bookingInfo}>Booking #{conversation.bookingID}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.onlineStatus}>Online</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        {/* Phone Call Button - NEW */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCall}
          disabled={!provider?.phone}
        >
          <Ionicons
            name="call-outline"
            size={22}
            color={provider?.phone ? Colors.primary : Colors.text.secondary}
          />
        </TouchableOpacity>

        {/* Share Button - NEW */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>

        {/* More Options Button */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            // Create buttons array properly without null values
            const buttons = [
              { text: 'View Provider Profile', onPress: handleViewProfile },
              ...(conversation?.bookingID ? [{ text: 'View Booking Details', onPress: handleViewBooking }] : []),
              { text: 'Cancel', style: 'cancel' },
            ];

            Alert.alert(
              'Chat Options',
              'Choose an option',
            );
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
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {renderHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onRefresh={refreshMessages}
        refreshing={refreshing}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.3}
        inverted={false}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.text.secondary}
          multiline
          maxLength={1001}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  bookingInfo: {
    fontSize: 12,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  onlineStatus: {
    fontSize: 12,
    color: '#22c55e',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexGrow: 1,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.secondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  customerMessage: {
    alignSelf: 'flex-end',
  },
  providerMessage: {
    alignSelf: 'flex-start',
  },
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
  customerBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  providerBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  customerMessageText: {
    color: Colors.surface,
  },
  providerMessageText: {
    color: Colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 10,
    marginRight: 4,
  },
  customerTimestamp: {
    color: Colors.surface + 'CC',
  },
  providerTimestamp: {
    color: Colors.text.secondary,
  },
  statusIcon: {
    marginLeft: 2,
  },
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
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});