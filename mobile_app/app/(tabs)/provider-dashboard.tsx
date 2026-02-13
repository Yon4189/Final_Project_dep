// app/(tabs)/provider-dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { DashboardStyles } from '../styles/DashboardStyles';
import { GlobalStyles } from '../styles/GlobalStyles';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import Map from '../../components/Map';// Your existing WebMap component
const { width } = Dimensions.get('window');

// Types
interface ServiceRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerImage?: string;
  serviceType: string;
  description: string;
  scheduledDate: Date;
  scheduledTime: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  price: number;
  distance?: number;
  createdAt: Date;
  specialInstructions?: string;
}

interface ProviderStats {
  totalRequests: number;
  pendingRequests: number;
  completedJobs: number;
  totalEarnings: number;
  rating: number;
  reviewCount: number;
}

interface Appointment {
  id: string;
  customerName: string;
  serviceType: string;
  date: Date;
  time: string;
  address: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export default function ProviderDashboard() {
  const router = useRouter();
  const mapRef = useRef<any>(null);

  // State
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'appointments' | 'earnings' | 'profile'>('requests');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [stats, setStats] = useState<ProviderStats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedJobs: 0,
    totalEarnings: 0,
    rating: 4.8,
    reviewCount: 127,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [scheduleData, setScheduleData] = useState({
    date: new Date(),
    time: '09:00',
    estimatedDuration: '1 hour',
    notes: '',
  });

  // Get user location
  useEffect(() => {
    getUserLocation();
    loadDashboardData();
  }, []);

  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location services');
        setUserLocation({ latitude: 9.032, longitude: 38.746 });
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setUserLocation({ latitude: 9.032, longitude: 38.746 });
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock service requests
    const mockRequests: ServiceRequest[] = [
      {
        id: '1',
        customerId: 'c1',
        customerName: 'Abebe Kebede',
        serviceType: 'Plumbing',
        description: 'Kitchen sink leaking, need urgent repair',
        scheduledDate: new Date(2024, 1, 15),
        scheduledTime: '10:00',
        address: 'Bole, Addis Ababa',
        location: { latitude: 9.012, longitude: 38.765 },
        status: 'pending',
        price: 1200,
        distance: 2.3,
        createdAt: new Date(),
        specialInstructions: 'Call before arriving, apartment 301',
      },
      {
        id: '2',
        customerId: 'c2',
        customerName: 'Tigist Hailu',
        serviceType: 'Electrical',
        description: 'Power outlet not working in living room',
        scheduledDate: new Date(2024, 1, 15),
        scheduledTime: '14:00',
        address: 'Kazanchis, Addis Ababa',
        location: { latitude: 9.022, longitude: 38.755 },
        status: 'pending',
        price: 800,
        distance: 1.5,
        createdAt: new Date(),
      },
      {
        id: '3',
        customerId: 'c3',
        customerName: 'Solomon Ayele',
        serviceType: 'AC Repair',
        description: 'AC not cooling properly',
        scheduledDate: new Date(2024, 1, 16),
        scheduledTime: '11:30',
        address: 'CMC, Addis Ababa',
        location: { latitude: 9.042, longitude: 38.775 },
        status: 'accepted',
        price: 2500,
        distance: 5.2,
        createdAt: new Date(),
      },
      {
        id: '4',
        customerId: 'c4',
        customerName: 'Meron Alemu',
        serviceType: 'Home Cleaning',
        description: 'Deep cleaning for 3-bedroom house',
        scheduledDate: new Date(2024, 1, 15),
        scheduledTime: '09:00',
        address: 'Old Airport, Addis Ababa',
        location: { latitude: 9.032, longitude: 38.745 },
        status: 'in-progress',
        price: 1800,
        distance: 0.8,
        createdAt: new Date(),
      },
    ];

    // Mock appointments
    const mockAppointments: Appointment[] = [
      {
        id: '3',
        customerName: 'Solomon Ayele',
        serviceType: 'AC Repair',
        date: new Date(2024, 1, 16),
        time: '11:30',
        address: 'CMC, Addis Ababa',
        status: 'scheduled',
      },
      {
        id: '4',
        customerName: 'Meron Alemu',
        serviceType: 'Home Cleaning',
        date: new Date(2024, 1, 15),
        time: '09:00',
        address: 'Old Airport, Addis Ababa',
        status: 'in-progress',
      },
    ];

    setRequests(mockRequests);
    setAppointments(mockAppointments);

    // Update stats
    setStats({
      totalRequests: mockRequests.length,
      pendingRequests: mockRequests.filter(r => r.status === 'pending').length,
      completedJobs: mockRequests.filter(r => r.status === 'completed').length,
      totalEarnings: 15600,
      rating: 4.8,
      reviewCount: 127,
    });

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Accept Request
  const handleAcceptRequest = (request: ServiceRequest) => {
    Alert.alert(
      'Accept Request',
      `Do you want to accept the service request from ${request.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            // Update request status
            setRequests(prev =>
              prev.map(r =>
                r.id === request.id ? { ...r, status: 'accepted' } : r
              )
            );

            // Add to appointments
            const newAppointment: Appointment = {
              id: request.id,
              customerName: request.customerName,
              serviceType: request.serviceType,
              date: request.scheduledDate,
              time: request.scheduledTime,
              address: request.address,
              status: 'scheduled',
            };

            setAppointments(prev => [...prev, newAppointment]);

            // Update stats
            setStats(prev => ({
              ...prev,
              pendingRequests: prev.pendingRequests - 1,
            }));

            Alert.alert('Success', 'Service request accepted successfully!');
            setShowRequestDetailModal(false);
          },
        },
      ]
    );
  };

  // Reject Request
  const handleRejectRequest = () => {
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
          onPress: () => {
            // Update request status
            setRequests(prev =>
              prev.map(r =>
                r.id === selectedRequest.id ? { ...r, status: 'rejected' } : r
              )
            );

            // Update stats
            setStats(prev => ({
              ...prev,
              pendingRequests: prev.pendingRequests - 1,
            }));

            setShowRejectModal(false);
            setShowRequestDetailModal(false);
            setRejectReason('');

            Alert.alert('Request Rejected', 'The service request has been rejected.');
          },
        },
      ]
    );
  };

  // Start Service
  const handleStartService = (appointment: Appointment) => {
    Alert.alert(
      'Start Service',
      `Are you ready to start the service for ${appointment.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            // Update appointment status
            setAppointments(prev =>
              prev.map(a =>
                a.id === appointment.id ? { ...a, status: 'in-progress' } : a
              )
            );

            // Update request status
            setRequests(prev =>
              prev.map(r =>
                r.id === appointment.id ? { ...r, status: 'in-progress' } : r
              )
            );

            Alert.alert('Service Started', 'You can now navigate to the customer location.');
          },
        },
      ]
    );
  };

  // Complete Service
  const handleCompleteService = (appointment: Appointment) => {
    Alert.alert(
      'Complete Service',
      `Have you completed the service for ${appointment.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            // Update appointment status
            setAppointments(prev =>
              prev.map(a =>
                a.id === appointment.id ? { ...a, status: 'completed' } : a
              )
            );

            // Update request status
            setRequests(prev =>
              prev.map(r =>
                r.id === appointment.id ? { ...r, status: 'completed' } : r
              )
            );

            // Update stats
            const request = requests.find(r => r.id === appointment.id);
            setStats(prev => ({
              ...prev,
              completedJobs: prev.completedJobs + 1,
              totalEarnings: prev.totalEarnings + (request?.price || 0),
            }));

            Alert.alert(
              'Service Completed',
              'Thank you for completing the service!',
              [
                {
                  text: 'OK',
                  onPress: () => router.push('/provider/earnings'),
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Navigate to Customer
  const handleNavigate = (request: ServiceRequest) => {
    if (Platform.OS === 'web') {
      // Open Google Maps on web
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${request.location.latitude},${request.location.longitude}`,
        '_blank'
      );
    } else {
      // Open native maps on mobile
      const url = Platform.select({
        ios: `maps:0,0?q=${request.location.latitude},${request.location.longitude}`,
        android: `geo:0,0?q=${request.location.latitude},${request.location.longitude}`,
      });
    }
  };

  // Render Stats Card
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

  // Render Service Request Card
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
            <Text style={DashboardStyles.avatarText}>
              {item.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
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
          <Text style={DashboardStyles.detailText}>{item.address}</Text>
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

  // Render Appointment Card
  const renderAppointmentCard = ({ item }: { item: Appointment }) => (
    <TouchableOpacity
      style={DashboardStyles.appointmentCard}
      activeOpacity={0.7}
    >
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
          <Text style={DashboardStyles.detailText}>{item.address}</Text>
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

  return (
    <View style={GlobalStyles.container}>
      {/* Header */}
      <View style={DashboardStyles.providerHeader}>
        <View style={DashboardStyles.headerLeft}>
          <View style={DashboardStyles.providerAvatar}>
            <Text style={DashboardStyles.avatarText}>SP</Text>
          </View>
          <View>
            <Text style={DashboardStyles.providerName}>John's Plumbing Pros</Text>
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

      {/* Stats Cards */}
      {renderStatsCard()}

      {/* Tab Navigation */}
      <View style={DashboardStyles.tabContainer}>
        <TouchableOpacity
          style={[
            DashboardStyles.tab,
            activeTab === 'requests' && DashboardStyles.activeTab,
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={activeTab === 'requests' ? '#3498db' : '#6c757d'}
          />
          <Text
            style={[
              DashboardStyles.tabText,
              activeTab === 'requests' && DashboardStyles.activeTabText,
            ]}
          >
            Requests ({stats.pendingRequests})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            DashboardStyles.tab,
            activeTab === 'appointments' && DashboardStyles.activeTab,
          ]}
          onPress={() => setActiveTab('appointments')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === 'appointments' ? '#3498db' : '#6c757d'}
          />
          <Text
            style={[
              DashboardStyles.tabText,
              activeTab === 'appointments' && DashboardStyles.activeTabText,
            ]}
          >
            Appointments ({appointments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            DashboardStyles.tab,
            activeTab === 'earnings' && DashboardStyles.activeTab,
          ]}
          onPress={() => setActiveTab('earnings')}
        >
          <Ionicons
            name="cash-outline"
            size={20}
            color={activeTab === 'earnings' ? '#3498db' : '#6c757d'}
          />
          <Text
            style={[
              DashboardStyles.tabText,
              activeTab === 'earnings' && DashboardStyles.activeTabText,
            ]}
          >
            Earnings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={DashboardStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[GlobalStyles.bodyText, GlobalStyles.mt4]}>
            Loading dashboard...
          </Text>
        </View>
      ) : (
        <>
          {activeTab === 'requests' && (
            <FlatList
              data={requests.filter(r => r.status === 'pending')}
              renderItem={renderRequestCard}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={DashboardStyles.emptyContainer}>
                  <Ionicons name="checkmark-done-circle" size={80} color="#6c757d" />
                  <Text style={[GlobalStyles.heading3, GlobalStyles.mt4]}>
                    No Pending Requests
                  </Text>
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
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={DashboardStyles.emptyContainer}>
                  <Ionicons name="calendar" size={80} color="#6c757d" />
                  <Text style={[GlobalStyles.heading3, GlobalStyles.mt4]}>
                    No Appointments
                  </Text>
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
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
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
        </>
      )}

      {/* Request Detail Modal */}
      <Modal
        visible={showRequestDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRequestDetailModal(false)}
      >
        <View style={DashboardStyles.modalContainer}>
          <ScrollView style={DashboardStyles.modalContent}>
            {selectedRequest && (
              <>
                <View style={DashboardStyles.modalHeader}>
                  <Text style={GlobalStyles.heading2}>Request Details</Text>
                  <TouchableOpacity onPress={() => setShowRequestDetailModal(false)}>
                    <Ionicons name="close" size={24} color="#6c757d" />
                  </TouchableOpacity>
                </View>

                <View style={DashboardStyles.modalSection}>
                  <View style={DashboardStyles.customerInfoLarge}>
                    <View style={DashboardStyles.customerAvatarLarge}>
                      <Text style={DashboardStyles.avatarTextLarge}>
                        {selectedRequest.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <View>
                      <Text style={DashboardStyles.customerNameLarge}>
                        {selectedRequest.customerName}
                      </Text>
                      <Text style={DashboardStyles.customerJoined}>
                        Customer since 2024
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={DashboardStyles.modalSection}>
                  <Text style={DashboardStyles.sectionTitle}>Service Information</Text>
                  <View style={DashboardStyles.infoRow}>
                    <Text style={DashboardStyles.infoLabel}>Service Type:</Text>
                    <Text style={DashboardStyles.infoValue}>{selectedRequest.serviceType}</Text>
                  </View>
                  <View style={DashboardStyles.infoRow}>
                    <Text style={DashboardStyles.infoLabel}>Description:</Text>
                    <Text style={DashboardStyles.infoValue}>{selectedRequest.description}</Text>
                  </View>
                  <View style={DashboardStyles.infoRow}>
                    <Text style={DashboardStyles.infoLabel}>Price:</Text>
                    <Text style={[DashboardStyles.infoValue, { color: '#2ecc71', fontWeight: 'bold' }]}>
                      Birr {selectedRequest.price}
                    </Text>
                  </View>
                </View>

                <View style={DashboardStyles.modalSection}>
                  <Text style={DashboardStyles.sectionTitle}>Schedule</Text>
                  <View style={DashboardStyles.infoRow}>
                    <Ionicons name="calendar" size={16} color="#6c757d" />
                    <Text style={DashboardStyles.infoValue}>
                      {selectedRequest.scheduledDate.toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={DashboardStyles.infoRow}>
                    <Ionicons name="time" size={16} color="#6c757d" />
                    <Text style={DashboardStyles.infoValue}>
                      {selectedRequest.scheduledTime}
                    </Text>
                  </View>
                </View>

                <View style={DashboardStyles.modalSection}>
                  <Text style={DashboardStyles.sectionTitle}>Location</Text>
                  <View style={DashboardStyles.infoRow}>
                    <Ionicons name="location" size={16} color="#6c757d" />
                    <Text style={DashboardStyles.infoValue}>{selectedRequest.address}</Text>
                  </View>
                  {selectedRequest.distance && (
                    <View style={DashboardStyles.infoRow}>
                      <Ionicons name="navigate" size={16} color="#6c757d" />
                      <Text style={DashboardStyles.infoValue}>
                        {selectedRequest.distance.toFixed(1)} km away
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={DashboardStyles.navigateButtonSmall}
                    onPress={() => handleNavigate(selectedRequest)}
                  >
                    <Ionicons name="map" size={16} color="#fff" />
                    <Text style={DashboardStyles.navigateButtonText}>View on Map</Text>
                  </TouchableOpacity>
                </View>

                {selectedRequest.specialInstructions && (
                  <View style={DashboardStyles.modalSection}>
                    <Text style={DashboardStyles.sectionTitle}>Special Instructions</Text>
                    <Text style={DashboardStyles.instructionsText}>
                      {selectedRequest.specialInstructions}
                    </Text>
                  </View>
                )}

                <View style={DashboardStyles.modalActions}>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <AppButton
                        title="Accept Request"
                        onPress={() => handleAcceptRequest(selectedRequest)}
                        style={{ flex: 1, marginRight: 8 }}
                      />
                      <AppButton
                        title="Reject"
                        onPress={() => {
                          setShowRequestDetailModal(false);
                          setShowRejectModal(true);
                        }}
                        variant="outline"
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Reject Request Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
      >
        <View style={DashboardStyles.modalContainer}>
          <View style={DashboardStyles.modalContentSmall}>
            <View style={DashboardStyles.modalHeader}>
              <Text style={GlobalStyles.heading2}>Reject Request</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <Text style={[GlobalStyles.bodyText, GlobalStyles.mb3]}>
              Please provide a reason for rejecting this service request.
            </Text>

            <AppInput
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              style={{ textAlignVertical: 'top', minHeight: 100 }}
            />

            <View style={DashboardStyles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppButton
                title="Reject"
                onPress={handleRejectRequest}
                style={{ flex: 1, marginLeft: 8, backgroundColor: '#e74c3c' }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={DashboardStyles.modalContainer}>
          <ScrollView style={DashboardStyles.modalContent}>
            <View style={DashboardStyles.modalHeader}>
              <Text style={GlobalStyles.heading2}>Schedule Appointment</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={DashboardStyles.modalSection}>
              <Text style={DashboardStyles.sectionTitle}>Select Date</Text>
              <TouchableOpacity
                style={DashboardStyles.datePickerButton}
                onPress={() => Alert.alert('Date Picker', 'Date picker would open here')}
              >
                <Text>{scheduleData.date.toLocaleDateString()}</Text>
                <Ionicons name="calendar" size={20} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={DashboardStyles.modalSection}>
              <Text style={DashboardStyles.sectionTitle}>Select Time</Text>
              <TouchableOpacity
                style={DashboardStyles.datePickerButton}
                onPress={() => Alert.alert('Time Picker', 'Time picker would open here')}
              >
                <Text>{scheduleData.time}</Text>
                <Ionicons name="time" size={20} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={DashboardStyles.modalSection}>
              <Text style={DashboardStyles.sectionTitle}>Estimated Duration</Text>
              <View style={DashboardStyles.durationSelector}>
                {['30 min', '1 hour', '2 hours', '3+ hours'].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      DashboardStyles.durationOption,
                      scheduleData.estimatedDuration === duration && DashboardStyles.durationOptionSelected,
                    ]}
                    onPress={() => setScheduleData(prev => ({ ...prev, estimatedDuration: duration }))}
                  >
                    <Text
                      style={[
                        DashboardStyles.durationText,
                        scheduleData.estimatedDuration === duration && DashboardStyles.durationTextSelected,
                      ]}
                    >
                      {duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={DashboardStyles.modalSection}>
              <Text style={DashboardStyles.sectionTitle}>Additional Notes</Text>
              <AppInput
                placeholder="Any special instructions..."
                value={scheduleData.notes}
                onChangeText={(text) => setScheduleData(prev => ({ ...prev, notes: text }))}
                multiline
                style={{ textAlignVertical: 'top', minHeight: 80 }}
              />
            </View>

            <View style={DashboardStyles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={() => setShowScheduleModal(false)}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppButton
                title="Confirm"
                onPress={() => {
                  Alert.alert('Success', 'Appointment scheduled successfully!');
                  setShowScheduleModal(false);
                }}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={DashboardStyles.fullScreenModal}>
          <View style={DashboardStyles.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#212529" />
            </TouchableOpacity>
            <Text style={GlobalStyles.heading3}>Navigate to Customer</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={{ flex: 1 }}>
            <Map
              center={[9.03, 38.74]} // Changed from object to array tuple
              markers={selectedRequest ? [
                {
                  position: [selectedRequest.location.latitude, selectedRequest.location.longitude] as [number, number],
                  title: selectedRequest.customerName,
                  description: selectedRequest.address,
                },
                ...(userLocation ? [{
                  position: [userLocation.latitude, userLocation.longitude] as [number, number],
                  title: 'Your Location',
                  description: 'Current position',
                }] : []),
              ] : []}
              style={{ flex: 1 }} userLocation={null} providers={[]} onProviderSelect={function (provider: any): void {
                throw new Error('Function not implemented.');
              } }            />
          </View>

          {selectedRequest && (
            <View style={DashboardStyles.mapModalFooter}>
              <Text style={DashboardStyles.destinationAddress}>
                {selectedRequest.address}
              </Text>
              <TouchableOpacity
                style={DashboardStyles.startNavigationButton}
                onPress={() => handleNavigate(selectedRequest)}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={DashboardStyles.startNavigationText}>Start Navigation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}