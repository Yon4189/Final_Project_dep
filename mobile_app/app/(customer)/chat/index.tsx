// app/(customer)/chat/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    SafeAreaView,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';
import { formatDistanceToNow } from 'date-fns';
import { customerService } from '@/app/services/customer.service';
import type { ServiceProvider } from '@/app/types/customer.types';

export default function CustomerChatList() {
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]);
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'providers'

    const fetchConversations = async () => {
        try {
            const response = await api.get<any>('/chat/conversations');
            if (response.success) {
                setConversations(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchProviders = async (query = '') => {
        try {
            setLoadingProviders(true);
            const response = await customerService.searchProviders({ query, perPage: 50 });
            if (response.success) {
                setProviders(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching providers:', error);
        } finally {
            setLoadingProviders(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (activeTab === 'providers') {
            fetchProviders(searchQuery);
        }
    }, [activeTab, searchQuery]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        if (activeTab === 'chats') {
            fetchConversations();
        } else {
            fetchProviders(searchQuery);
        }
    }, [activeTab, searchQuery]);

    const renderConversationItem = ({ item }: { item: any }) => {
        const provider = item.other_party;
        const latestMessage = item.latestMessage;

        if (!provider) return null; // skip broken items

        const providerId = provider?.providerID ?? provider?.id;

        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => router.push(`/(customer)/chat/${providerId}`)}
            >
                <Image
                    source={{
                        uri: provider?.profilePicture
                            ? (provider.profilePicture.startsWith('http')
                                ? provider.profilePicture
                                : `${API_BASE_URL.replace('/api', '')}/${provider.profilePicture}`)
                            : 'https://via.placeholder.com/50',
                    }}
                    style={styles.avatar}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{provider?.fullname || provider?.businessName || 'Provider'}</Text>
                        {latestMessage && (
                            <Text style={styles.time}>
                                {formatDistanceToNow(new Date(latestMessage.created_at), { addSuffix: true })}
                            </Text>
                        )}
                    </View>
                    <View style={styles.footer}>
                        <Text style={[styles.lastMessage, item.unread_count > 0 && styles.unreadMessage]} numberOfLines={1}>
                            {latestMessage?.message || 'No messages yet'}
                        </Text>
                        {item.unread_count > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.unread_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderProviderItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => router.push(`/(customer)/chat/${item.id}`)}
            >
                <Image
                    source={{
                        uri: item.profileImage
                            ? (item.profileImage.startsWith('http')
                                ? item.profileImage
                                : `${API_BASE_URL.replace('/api', '')}/${item.profileImage}`)
                            : 'https://via.placeholder.com/50',
                    }}
                    style={styles.avatar}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{item.businessName || item.fullname || 'Provider'}</Text>
                        {item.isAvailable && (
                            <View style={styles.onlineBadge} />
                        )}
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.about || 'Professional Service Provider'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={{ fontSize: 12, marginLeft: 4, color: Colors.text.secondary }}>
                            {item.rating?.toFixed(1) || '0.0'} • {item.location?.address || 'Location not set'}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.disabled} />
            </TouchableOpacity>
        );
    };

    const filteredConversations = conversations.filter(conv => {
        const name = conv.other_party?.fullname || conv.other_party?.businessName || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color={Colors.text.secondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search providers..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={Colors.text.secondary}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
                    onPress={() => setActiveTab('chats')}
                >
                    <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'providers' && styles.activeTab]}
                    onPress={() => setActiveTab('providers')}
                >
                    <Text style={[styles.tabText, activeTab === 'providers' && styles.activeTabText]}>All Providers</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'providers' && loadingProviders && searchQuery !== '' ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'chats' ? filteredConversations : providers}
                    renderItem={activeTab === 'chats' ? renderConversationItem : renderProviderItem}
                    keyExtractor={(item, index) => (activeTab === 'chats' 
                        ? (item.conversationID?.toString() ?? `chat-${index}`) 
                        : (item.id?.toString() ?? `provider-${index}`))}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name={activeTab === 'chats' ? "chatbubbles-outline" : "people-outline"}
                                size={64}
                                color={Colors.text.secondary}
                            />
                            <Text style={styles.emptyText}>
                                {activeTab === 'chats' ? 'No messages yet' : 'No providers found'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'chats'
                                    ? 'Start a chat by visiting a provider\'s profile.'
                                    : 'Try searching for a different name or category.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    time: {
        fontSize: 12,
        color: Colors.text.secondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: Colors.text.secondary,
        flex: 1,
        marginRight: 10,
    },
    unreadMessage: {
        color: Colors.text.primary,
        fontWeight: '700',
    },
    badge: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 150,
        paddingHorizontal: 40,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    emptySubtitle: {
        marginTop: 10,
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    searchContainer: {
        padding: 15,
        backgroundColor: Colors.surface,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: Colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: Colors.text.primary,
        padding: 0,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    activeTabText: {
        color: Colors.primary,
    },
    onlineBadge: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22c55e',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'white',
    },
});