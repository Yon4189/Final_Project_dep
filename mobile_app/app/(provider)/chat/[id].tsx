// app/(provider)/chat/[id].tsx
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { subscribeToConversation, unsubscribeFromConversation } from '@/app/services/pusherClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
    id: string;
    messageID?: number;
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
    const insets = useSafeAreaInsets();
    const { id: conversationIdParam } = useLocalSearchParams<{ id: string }>();
    const flatListRef = useRef<FlatList>(null);
    const appState = useRef(AppState.currentState);
    const isMounted = useRef(true);
    const wsSubscribed = useRef(false);

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
    const [invalidId, setInvalidId] = useState(false);

    // Validate conversation ID
    const conversationId = useRef<number | null>(null);
    useEffect(() => {
        const parsed = parseInt(conversationIdParam || '');
        if (isNaN(parsed) || parsed <= 0) {
            setInvalidId(true);
            setIsLoading(false);
        } else {
            conversationId.current = parsed;
            setInvalidId(false);
        }
    }, [conversationIdParam]);

    const normalizeMessage = (m: any): Message => {
        const rawId = m.id ?? m.messageID;
        const id = rawId ? `msg_${rawId}` : `temp_${Date.now()}_${Math.random()}`;
        return {
            ...m,
            id,
            status: m.status ?? 'sent',
        };
    };

    // Debug duplicates
    useEffect(() => {
        const ids = messages.map(m => m.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicates.length > 0) {
            console.warn('Duplicate message IDs:', [...new Set(duplicates)]);
        }
    }, [messages]);

    useFocusEffect(
        useCallback(() => {
            if (invalidId || !conversationId.current) return;
            isMounted.current = true;
            loadInitialData();

            return () => {
                isMounted.current = false;
            };
        }, [conversationId.current, invalidId])
    );

    // Replace polling with a real-time WebSocket subscription.
    useEffect(() => {
        if (invalidId || !conversation?.conversationID || wsSubscribed.current) return;
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
            if (conversationId.current) {
                markMessagesAsRead(conversationId.current).catch(() => {});
            }
        });

        // Fallback: refresh on foreground
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                refreshMessages();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            if (conversation?.conversationID) {
                unsubscribeFromConversation(conversation.conversationID);
            }
            wsSubscribed.current = false;
        };
    }, [conversation?.conversationID, invalidId]);

    const loadInitialData = async () => {
        if (!conversationId.current) return;
        try {
            setIsLoading(true);

            const userDataStr = await SecureStore.getItemAsync('user_data');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                setProviderId(userData.providerID || userData.id);
            }

            await fetchConversationDetails();

        } catch (error) {
            console.error('Error loading chat data:', error);
            if (isMounted.current) {
                Alert.alert('Error', 'Failed to load chat. Please try again.');
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    const fetchConversationDetails = async () => {
        if (!conversationId.current) return;
        try {
            const response = await api.get<any>(`/chat/conversations/${conversationId.current}`);
            if (response.success && response.data) {
                const convData = response.data.conversation;
                const msgs = (response.data.messages?.data || []).map(normalizeMessage);

                if (isMounted.current) {
                    setConversation(convData);
                    setMessages([...msgs].reverse());

                    if (convData.customer) {
                        setCustomer(convData.customer);
                    }

                    setHasMore(response.data.messages?.current_page < response.data.messages?.last_page);
                    setPage(1);

                    await markMessagesAsRead(conversationId.current);

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
        if (!conversationId.current) return;
        try {
            const response = await api.get<any>(`/chat/conversations/${conversationId.current}?page=${pageNum}`);
            if (response.success && response.data?.messages?.data) {
                if (!isMounted.current) return;

                const newMessages = response.data.messages.data.map(normalizeMessage);
                const reversedNewMessages = [...newMessages].reverse();

                if (pageNum === 1) {
                    setMessages(reversedNewMessages);
                } else {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNew = reversedNewMessages.filter(m => !existingIds.has(m.id));
                        return [...uniqueNew, ...prev];
                    });
                }

                setHasMore(response.data.messages.current_page < response.data.messages.last_page);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchNewMessages = async () => {
        if (!conversationId.current || !isMounted.current) return;
        try {
            const response = await api.get<any>(`/chat/conversations/${conversationId.current}?page=1`);
            if (response.success && response.data?.messages?.data && isMounted.current) {
                const latestMessages = response.data.messages.data.map(normalizeMessage);
                const reversedLatest = [...latestMessages].reverse();

                let addedCount = 0;
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const trulyNew = reversedLatest.filter(m => !existingIds.has(m.id));
                    addedCount = trulyNew.length;
                    return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
                });

                if (addedCount > 0) {
                    if (conversationId.current) await markMessagesAsRead(conversationId.current);
                    flatListRef.current?.scrollToEnd({ animated: true });
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
        if (!conversationId.current) return;
        setRefreshing(true);
        await fetchMessages(1);
        if (isMounted.current) setRefreshing(false);
    };

    const loadMoreMessages = () => {
        if (hasMore && !isLoading && conversationId.current && isMounted.current) {
            fetchMessages(page + 1);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isSending || !conversationId.current || !isMounted.current) return;

        const messageText = inputText.trim();
        setInputText('');
        setIsSending(true);

        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const optimisticMessage: Message = {
            id: tempId,
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
                conversationID: conversationId.current,
                message: messageText,
            });

            if (response.success && response.data?.message && isMounted.current) {
                const realMessage = normalizeMessage(response.data.message);
                realMessage.status = 'sent';
                setMessages(prev =>
                    prev.map(msg => (msg.id === tempId ? realMessage : msg))
                );
            } else {
                if (isMounted.current) {
                    setMessages(prev => prev.filter(msg => msg.id !== tempId));
                    Alert.alert('Error', 'Failed to send message');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            if (isMounted.current) {
                setMessages(prev => prev.filter(msg => msg.id !== tempId));
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
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

    if (invalidId) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Invalid Conversation</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color={Colors.text.secondary} />
                    <Text style={styles.errorText}>This conversation does not exist.</Text>
                    <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
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
        paddingBottom: 12,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
        marginLeft: 16,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
        textAlign: 'center',
    },
    errorButton: {
        marginTop: 24,
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
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