// app/(tabs)/provider-dashboard.tsx (Updated with Laravel Integration)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { DashboardStyles } from '../styles/DashboardStyles';
import { GlobalStyles } from '../styles/GlobalStyles';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import Map from '../../components/Map';
import { useProviderDashboard } from '../../hooks/useProviderDashboard';
import ApiService from '../services/api';
import { ServiceRequest, Appointment } from '../../types';

const { width } = Dimensions.get('window');

export default function ProviderDashboard() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  
  // Use custom hook for data management
  const {
    requests,
    appointments,
    stats,
    loading,
    loadDashboardData,
    acceptRequest,
    rejectRequest,
    startService,
    completeService,
  } = useProviderDashboard();

  // Local state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'appointments' | 'earnings' | 'profile'>('requests');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  // Get user location and setup real-time tracking
  useEffect(() => {
    getUserLocation();
    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location services');
        setUserLocation({ latitude: 9.032, longitude: 38.746 }); // Default location
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(newLocation);
      
      // Send location to backend
      await ApiService.updateLocation(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      setUserLocation({ latitude: 9.032, longitude: 38.746 });
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Or every 100 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(newLocation);
          // Send location update to backend
          ApiService.updateLocation(newLocation).catch(console.error);
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request: ServiceRequest) => {
    Alert.alert(
      'Accept Request',
      `Do you want to accept the service request from ${request.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            const success = await acceptRequest(request.id);
            if (success) {
              setShowRequestDetailModal(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const success = await rejectRequest(selectedRequest.id, rejectReason);
            if (success) {
              setShowRejectModal(false);
              setShowRequestDetailModal(false);
              setRejectReason('');
            }
          },
        },
      ]
    );
  };

  const handleStartService = (appointment: Appointment) => {
    Alert.alert(
      'Start Service',
      `Are you ready to start the service for ${appointment.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            await startService(appointment.id);
          },
        },
      ]
    );
  };

  const handleCompleteService = (appointment: Appointment) => {
    Alert.alert(
      'Complete Service',
      `Have you completed the service for ${appointment.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            const success = await completeService(appointment.id);
            if (success) {
              router.push('/provider/earnings');
            }
          },
        },
      ]
    );
  };

  const handleNavigate = (request: ServiceRequest) => {
    if (Platform.OS === 'web') {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${request.location.latitude},${request.location.longitude}`,
        '_blank'
      );
    } else {
      const url = Platform.select({
        ios: `maps:0,0?q=${request.customerName}@${request.location.latitude},${request.location.longitude}`,
        android: `geo:0,0?q=${request.location.latitude},${request.location.longitude}(${request.customerName})`,
      });
      if (url) {
        // Use Linking to open maps
        // Linking.openURL(url);
      }
    }
  };

  const renderStatsCard = () => (
    <View style={DashboardStyles.statsContainer}>
      <View style={DashboardStyles.statsGrid}>
        <View style={DashboardStyles.statCard}>
          <View style={[DashboardStyles.statIcon, { backgroundColor: '#e3f2fd' }]}>
            <Ionicons name="hourglass-outline" size={24} color="#3498db" />
          </View>
          <Text style={DashboardStyles.statValue}>{stats.pendingRequests}</Text>
          <Text style={DashboardStyles.statLabel}>Pending</Text>
        </View>

        <View style={DashboardStyles.statCard}>
          <View style={[DashboardStyles.statIcon, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#2ecc71" />
          </View>
          <Text style={DashboardStyles.statValue}>{stats.completedJobs}</Text>
          <Text style={DashboardStyles.statLabel}>Completed</Text>
        </View>

        <View style={DashboardStyles.statCard}>
          <View style={[DashboardStyles.statIcon, { backgroundColor: '#fff3e0' }]}>
            <Ionicons name="cash-outline" size={24} color="#f39c12" />
          </View>
          <Text style={DashboardStyles.statValue}>Birr {stats.totalEarnings}</Text>
          <Text style={DashboardStyles.statLabel}>Earnings</Text>
        </View>

        <View style={DashboardStyles.statCard}>
          <View style={[DashboardStyles.statIcon, { backgroundColor: '#f3e5f5' }]}>
            <Ionicons name="star-outline" size={24} color="#9b59b6" />
          </View>
          <Text style={DashboardStyles.statValue}>{stats.rating.toFixed(1)}</Text>
          <Text style={DashboardStyles.statLabel}>Rating</Text>
        </View>
      </View>
    </View>
  );

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => (
    <TouchableOpacity
      style={DashboardStyles.requestCard}
      onPress={() => {
        setSelectedRequest(item);
        setShowRequestDetailModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={DashboardStyles.requestHeader}>
        <View style={DashboardStyles.customerInfo}>
          <View style={DashboardStyles.customerAvatar}>
            {item.customerImage ? (
              <Image source={{ uri: item.customerImage }} style={DashboardStyles.avatarImage} />
            ) : (
              <Text style={DashboardStyles.avatarText}>
                {item.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </Text>
            )}
          </View>
          <View style={DashboardStyles.customerDetails}>
            <Text style={DashboardStyles.customerName}>{item.customerName}</Text>
            <Text style={DashboardStyles.serviceType}>{item.serviceType}</Text>
          </View>
        </View>
        <View style={[
          DashboardStyles.statusBadge,
          {
            backgroundColor:
              item.status === 'pending' ? '#fff3e0' :
              item.status === 'accepted' ? '#e8f5e9' :
              item.status === 'in-progress' ? '#e3f2fd' :
              item.status === 'completed' ? '#e8f5e9' : '#ffebee'
          }
        ]}>
          <Text style={[
            DashboardStyles.statusText,
            {
              color:
                item.status === 'pending' ? '#f39c12' :
                item.status === 'accepted' ? '#2ecc71' :
                item.status === 'in-progress' ? '#3498db' :
                item.status === 'completed' ? '#27ae60' : '#e74c3c'
            }
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={DashboardStyles.requestDetails}>
        <View style={DashboardStyles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6c757d" />
          <Text style={DashboardStyles.detailText} numberOfLines={1}>
            {item.address}
          </Text>
        </View>

        <View style={DashboardStyles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6c757d" />
          <Text style={DashboardStyles.detailText}>
            {item.scheduledDate.toLocaleDateString()} at {item.scheduledTime}
          </Text>
        </View>

        <View style={DashboardStyles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#6c757d" />
          <Text style={DashboardStyles.detailText}>Birr {item.price}</Text>
        </View>

        {item.distance && (
          <View style={DashboardStyles.detailRow}>
            <Ionicons name="navigate-outline" size={16} color="#6c757d" />
            <Text style={DashboardStyles.detailText}>{item.distance.toFixed(1)} km away</Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={DashboardStyles.requestActions}>
          <TouchableOpacity
            style={[DashboardStyles.actionButton, DashboardStyles.acceptButton]}
            onPress={() => handleAcceptRequest(item)}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={DashboardStyles.actionButtonText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[DashboardStyles.actionButton, DashboardStyles.rejectButton]}
            onPress={() => {
              setSelectedRequest(item);
              setShowRejectModal(true);
            }}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={DashboardStyles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderAppointmentCard = ({ item }: { item: Appointment }) => (
    <TouchableOpacity style={DashboardStyles.appointmentCard} activeOpacity={0.7}>
      <View style={DashboardStyles.appointmentHeader}>
        <View>
          <Text style={DashboardStyles.appointmentCustomer}>{item.customerName}</Text>
          <Text style={DashboardStyles.appointmentService}>{item.serviceType}</Text>
        </View>
        <View style={[
          DashboardStyles.statusBadge,
          {
            backgroundColor:
              item.status === 'scheduled' ? '#fff3e0' :
              item.status === 'in-progress' ? '#e3f2fd' :
              item.status === 'completed' ? '#e8f5e9' : '#ffebee'
          }
        ]}>
          <Text style={[
            DashboardStyles.statusText,
            {
              color:
                item.status === 'scheduled' ? '#f39c12' :
                item.status === 'in-progress' ? '#3498db' :
                item.status === 'completed' ? '#27ae60' : '#e74c3c'
            }
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={DashboardStyles.appointmentDetails}>
        <View style={DashboardStyles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6c757d" />
          <Text style={DashboardStyles.detailText}>
            {item.date.toLocaleDateString()} at {item.time}
          </Text>
        </View>

        <View style={DashboardStyles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6c757d" />
          <Text style={DashboardStyles.detailText} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>

      <View style={DashboardStyles.appointmentActions}>
        {item.status === 'scheduled' && (
          <>
            <TouchableOpacity
              style={[DashboardStyles.actionButton, DashboardStyles.startButton]}
              onPress={() => handleStartService(item)}
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={DashboardStyles.actionButtonText}>Start</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[DashboardStyles.actionButton, DashboardStyles.navigateButton]}
              onPress={() => {
                const request = requests.find(r => r.id === item.id);
                if (request) handleNavigate(request);
              }}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={DashboardStyles.actionButtonText}>Navigate</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'in-progress' && (
          <TouchableOpacity
            style={[DashboardStyles.actionButton, DashboardStyles.completeButton]}
            onPress={() => handleCompleteService(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={DashboardStyles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[GlobalStyles.container, DashboardStyles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={[GlobalStyles.bodyText, GlobalStyles.mt4]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      {/* Header* */}
      <View style={DashboardStyles.providerHeader}>
        <View style={DashboardStyles.headerLeft}>
          <View style={DashboardStyles.providerAvatar}>
            <Text style={DashboardStyles.avatarText}>SP</Text>
          </View>
          <View>
            <Text style={DashboardStyles.providerName}>Service Provider</Text>
            <View style={DashboardStyles.ratingContainer}>
              <Ionicons name="star" size={16} color="#f39c12" />
              <Text style={DashboardStyles.ratingText}>
                {stats.rating} ({stats.reviewCount} reviews)
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={DashboardStyles.notificationButton}
          onPress={() => router.push('/provider/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#212529" />
          {stats.pendingRequests > 0 && (
            <View style={DashboardStyles.notificationBadge}>
              <Text style={DashboardStyles.notificationBadgeText}>
                {stats.pendingRequests}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Cards*/ }
      {renderStatsCard()}

      {/* Tab Navigation*/ }
      <View style={DashboardStyles.tabContainer}>
        <TouchableOpacity
          style={[DashboardStyles.tab, activeTab === 'requests' && DashboardStyles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={activeTab === 'requests' ? '#3498db' : '#6c757d'}
          />
          <Text style={[DashboardStyles.tabText, activeTab === 'requests' && DashboardStyles.activeTabText]}>
            Requests ({stats.pendingRequests})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[DashboardStyles.tab, activeTab === 'appointments' && DashboardStyles.activeTab]}
          onPress={() => setActiveTab('appointments')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === 'appointments' ? '#3498db' : '#6c757d'}
          />
          <Text style={[DashboardStyles.tabText, activeTab === 'appointments' && DashboardStyles.activeTabText]}>
            Appointments ({appointments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[DashboardStyles.tab, activeTab === 'earnings' && DashboardStyles.activeTab]}
          onPress={() => setActiveTab('earnings')}
        >
          <Ionicons
            name="cash
            -outline"
            size={20}
            color={activeTab === 'earnings' ? '#3498db' : '#6c757d'}
          />
          <Text style={[DashboardStyles.tabText, activeTab === 'earnings' && DashboardStyles.activeTabText]}>
            Earnings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests.filter(r => r.status === 'pending')}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={DashboardStyles.emptyContainer}>
              <Ionicons name="checkmark-done-circle" size={80} color="#6c757d" />
              <Text style={[GlobalStyles.heading3, GlobalStyles.mt4]}>No Pending Requests</Text>
              <Text style={[GlobalStyles.bodyText, { color: '#6c757d', textAlign: 'center' }]}>
                You're all caught up! New service requests will appear here.
              </Text>
            </View>
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        />
      )}

      {activeTab === 'appointments' && (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={DashboardStyles.emptyContainer}>
              <Ionicons name="calendar" size={80} color="#6c757d" />
              <Text style={[GlobalStyles.heading3, GlobalStyles.mt4]}>No Appointments</Text>
              <Text style={[GlobalStyles.bodyText, { color: '#6c757d', textAlign: 'center' }]}>
                Your scheduled appointments will appear here.
              </Text>
            </View>
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        />
      )}

      {activeTab === 'earnings' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          <View style={DashboardStyles.earningsCard}>
            <Text style={DashboardStyles.earningsTitle}>Total Earnings</Text>
            <Text style={DashboardStyles.earningsAmount}>Birr {stats.totalEarnings}</Text>
            <Text style={DashboardStyles.earningsPeriod}>This month</Text>
          </View>

          <View style={DashboardStyles.earningsSummary}>
            <View style={DashboardStyles.earningsStat}>
              <Text style={DashboardStyles.earningsStatLabel}>Completed Jobs</Text>
              <Text style={DashboardStyles.earningsStatValue}>{stats.completedJobs}</Text>
            </View>
            <View style={DashboardStyles.earningsDivider} />
            <View style={DashboardStyles.earningsStat}>
              <Text style={DashboardStyles.earningsStatLabel}>Average Rating</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={DashboardStyles.earningsStatValue}>{stats.rating}</Text>
                <Ionicons name="star" size={16} color="#f39c12" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </View>

          <Text style={[GlobalStyles.heading3, GlobalStyles.mt4, GlobalStyles.mb3]}>
            Recent Earnings
          </Text>

          {requests.filter(r => r.status === 'completed').map((request) => (
            <View key={request.id} style={DashboardStyles.earningItem}>
              <View style={DashboardStyles.earningItemLeft}>
                <Text style={DashboardStyles.earningItemTitle}>{request.serviceType}</Text>
                <Text style={DashboardStyles.earningItemSubtitle}>{request.customerName}</Text>
                <Text style={DashboardStyles.earningItemDate}>
                  {request.scheduledDate.toLocaleDateString()}
                </Text>
              </View>
              <Text style={DashboardStyles.earningItemAmount}>Birr {request.price}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modals remain the same as in your original code*/ }
      {/* Request Detail Modal, Reject Modal, Map Modal - unchanged from your original*/ }
    </View>
  );
}