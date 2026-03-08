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

interface CustomerInfo {
    customerID: number;
    fullname: string;
    email?: string;
    phone?: string;
    profilePicture?: string;
}

export default function ProviderChatScreen() {
    const router = useRouter();
    const { id: conversationId } = useLocalSearchParams<{ id: string }>();
    const flatListRef = useRef<FlatList>(null);
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);
    const isMounted = useRef(true);

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [customer, setCustomer] = useState<CustomerInfo | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [providerId, setProviderId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Load data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            isMounted.current = true;
            loadInitialData();

            return () => {
                stopPolling();
                isMounted.current = false;
            };
        }, [conversationId])
    );

    useEffect(() => {
        startPolling();

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                refreshMessages();
            }
            appState.current = nextAppState;
        });

        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [conversation?.conversationID]);

    const startPolling = () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        pollingInterval.current = setInterval(() => {
            if (conversationId && isMounted.current) {
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

            // Load provider info
            const userDataStr = await SecureStore.getItemAsync('user_data');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                setProviderId(userData.providerID || userData.id);
            }

            // Fetch conversation and messages
            await fetchConversationDetails();

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

    const fetchConversationDetails = async () => {
        if (!conversationId) return;

        try {
            const response = await api.get<any>(`/chat/conversations/${conversationId}`);
            if (response.success && response.data) {
                const convData = response.data.conversation;
                const msgs = response.data.messages?.data || [];

                if (isMounted.current) {
                    setConversation(convData);
                    setMessages([...msgs].reverse());

                    // Set customer info from the 'other_party' or 'customer' relationship
                    // In ChatController@getConversations we added 'other_party', 
                    // let's see what getMessages returns.
                    // In ChatController.php, getMessages (Route /conversations/{id}) returns data: { conversation, messages }
                    // Let's assume conversation has customer loaded.
                    if (convData.customer) {
                        setCustomer(convData.customer);
                    }

                    setHasMore(response.data.messages?.current_page < response.data.messages?.last_page);
                    setPage(1);

                    // Mark as read
                    await markMessagesAsRead(parseInt(conversationId));

                    // Scroll to bottom
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: false });
                    }, 200);
                }
            }
        } catch (error) {
            console.error('Error fetching conversation details:', error);
        }
    };

    const fetchMessages = async (pageNum: number = 1) => {
        if (!conversationId) return;

        try {
            const response = await api.get<any>(`/chat/conversations/${conversationId}?page=${pageNum}`);
            if (response.success && response.data?.messages?.data) {
                if (!isMounted.current) return;

                const newMessages = response.data.messages.data;
                const reversedNewMessages = [...newMessages].reverse();

                if (pageNum === 1) {
                    setMessages(reversedNewMessages);
                } else {
                    setMessages(prev => [...reversedNewMessages, ...prev]);
                }

                setHasMore(response.data.messages.current_page < response.data.messages.last_page);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchNewMessages = async () => {
        if (!conversationId || !isMounted.current) return;

        try {
            const response = await api.get<any>(`/chat/conversations/${conversationId}?page=1&limit=20`);
            if (response.success && response.data?.messages?.data && isMounted.current) {
                const latestMessages = response.data.messages.data;
                const reversedLatest = [...latestMessages].reverse();

                if (latestMessages.length > 0) {
                    const existingIds = new Set(messages.map(m => m.id));
                    const newMsgs = reversedLatest.filter((m: Message) => !existingIds.has(m.id));

                    if (newMsgs.length > 0) {
                        setMessages(prev => [...prev, ...newMsgs]);
                        await markMessagesAsRead(parseInt(conversationId));
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching new messages:', error);
        }
    };

    const markMessagesAsRead = async (id: number) => {
        try {
            await api.post<any>(`/chat/conversations/${id}/read`);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const refreshMessages = async () => {
        if (!conversationId) return;
        setRefreshing(true);
        await fetchMessages(1);
        if (isMounted.current) setRefreshing(false);
    };

    const loadMoreMessages = () => {
        if (hasMore && !isLoading && conversationId && isMounted.current) {
            fetchMessages(page + 1);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isSending || !conversationId || !isMounted.current) return;

        const messageText = inputText.trim();
        setInputText('');
        setIsSending(true);

        const optimisticMessage: Message = {
            id: `temp_${Date.now()}`,
            message: messageText,
            sender_type: 'provider',
            sender_id: providerId || 0,
            created_at: new Date().toISOString(),
            status: 'sending',
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const response = await api.post<any>(`/chat/messages`, {
                conversationID: parseInt(conversationId),
                message: messageText,
            });

            if (response.success && response.data?.message && isMounted.current) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === optimisticMessage.id
                            ? { ...response.data.message, status: 'sent' }
                            : msg
                    )
                );
            } else {
                if (isMounted.current) {
                    setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
                    Alert.alert('Error', 'Failed to send message');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            if (isMounted.current) {
                setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
                Alert.alert('Error', 'Failed to send message. Please check connection.');
            }
        } finally {
            if (isMounted.current) setIsSending(false);
        }
    };

    const handleCall = () => {
        if (customer?.phone) {
            Linking.openURL(`tel:${customer.phone}`);
        } else {
            Alert.alert('Error', 'Customer phone number not available');
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

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString();
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isProvider = item.sender_type === 'provider';
        const showDate = index === 0 ||
            new Date(item.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();

        return (
            <>
                {showDate && (
                    <View style={styles.dateDivider}>
                        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                    </View>
                )}
                <View style={[styles.messageContainer, isProvider ? styles.providerMessage : styles.customerMessage]}>
                    <View style={[styles.messageBubble, isProvider ? styles.providerBubble : styles.customerBubble]}>
                        <Text style={[styles.messageText, isProvider ? styles.providerMessageText : styles.customerMessageText]}>
                            {item.message}
                        </Text>
                        <View style={styles.messageFooter}>
                            <Text style={[styles.timestamp, isProvider ? styles.providerTimestamp : styles.customerTimestamp]}>
                                {formatTime(item.created_at)}
                            </Text>
                            {isProvider && (
                                <Ionicons
                                    name={item.status === 'read' ? 'checkmark-done' : (item.status === 'sent' ? 'checkmark' : 'time-outline')}
                                    size={14}
                                    color={item.status === 'read' ? Colors.surface : Colors.surface + '80'}
                                    style={styles.statusIcon}
                                />
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

            <View style={styles.profileContainer}>
                <Image
                    source={{
                        uri: customer?.profilePicture
                            ? (customer.profilePicture.startsWith('http')
                                ? customer.profilePicture
                                : `${API_BASE_URL.replace('/api', '')}/${customer.profilePicture}`)
                            : 'https://via.placeholder.com/40',
                    }}
                    style={styles.avatar}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.customerName} numberOfLines={1}>{customer?.fullname || 'Loading...'}</Text>
                    <Text style={styles.onlineStatus}>Customer</Text>
                </View>
            </View>

            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton} onPress={handleCall} disabled={!customer?.phone}>
                    <Ionicons name="call-outline" size={22} color={customer?.phone ? Colors.primary : Colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('Options', 'Block Customer / Report')}>
                    <Ionicons name="ellipsis-vertical" size={20} color={Colors.text.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );

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
                    maxLength={1000}
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
    },
    backButton: {
        padding: 8,
    },
    profileContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background,
    },
    profileInfo: {
        marginLeft: 12,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    onlineStatus: {
        fontSize: 12,
        color: Colors.text.secondary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerButton: {
        padding: 8,
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
        backgroundColor: Colors.background,
        paddingHorizontal: 10,
    },
    messageContainer: {
        marginBottom: 8,
        flexDirection: 'row',
    },
    customerMessage: {
        justifyContent: 'flex-start',
    },
    providerMessage: {
        justifyContent: 'flex-end',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18,
    },
    customerBubble: {
        backgroundColor: Colors.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    providerBubble: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    customerMessageText: {
        color: Colors.text.primary,
    },
    providerMessageText: {
        color: Colors.surface,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    timestamp: {
        fontSize: 10,
    },
    customerTimestamp: {
        color: Colors.text.secondary,
    },
    providerTimestamp: {
        color: Colors.surface + 'B0',
    },
    statusIcon: {
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        maxHeight: 100,
        color: Colors.text.primary,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    sendButtonDisabled: {
        backgroundColor: Colors.text.secondary,
    },
});
