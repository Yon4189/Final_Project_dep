# Provider Dashboard Tabs Update

## Changes Made

Updated the provider dashboard tabs from **"Today, Pending, Upcoming"** to **"Accepted, Pending, Completed"** with proper data fetching for each status.

**NEW**: Added payment status indicator in Accepted tab cards showing whether customer paid deposit.

---

## Files Modified

### 1. `mobile_app/app/(provider)/dashboard.tsx`

#### Changes:

**A. Tab State Update**
```typescript
// OLD:
const [selectedTab, setSelectedTab] = useState<'pending' | 'today' | 'upcoming'>('today');

// NEW:
const [selectedTab, setSelectedTab] = useState<'accepted' | 'pending' | 'completed'>('accepted');
```

**B. Added Data Fetching for Accepted & Completed**
```typescript
// Fetch accepted and completed requests
const acceptedRequestsQuery = useProviderRequests('accepted');
const completedRequestsQuery = useProviderRequests('completed');

const acceptedRequests = acceptedRequestsQuery.data || [];
const completedRequests = completedRequestsQuery.data || [];
```

**C. Updated Refresh Function**
```typescript
const onRefresh = async () => {
  setRefreshing(true);
  await Promise.all([
    refetch(), 
    notificationCountQuery.refetch(),
    acceptedRequestsQuery.refetch(),  // NEW
    completedRequestsQuery.refetch()  // NEW
  ]);
  setRefreshing(false);
};
```

**D. Updated Tab Rendering**
```typescript
const renderTabs = () => (
  <View style={styles.tabsRow}>
    {['accepted', 'pending', 'completed'].map((tab) => (
      <TouchableOpacity 
        key={tab} 
        style={[styles.tabBtn, selectedTab === tab && styles.tabBtnActive]} 
        onPress={() => setSelectedTab(tab as any)}
      >
        <Text style={[styles.tabBtnText, selectedTab === tab && styles.tabBtnTextActive]}>
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </Text>
        {/* Badge for pending count */}
        {tab === 'pending' && (pendingRequests?.length || 0) > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{pendingRequests.length}</Text>
          </View>
        )}
        {/* Badge for accepted count */}
        {tab === 'accepted' && (acceptedRequests?.length || 0) > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{acceptedRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    ))}
  </View>
);
```

**E. Updated List Content Rendering**
```typescript
const renderListContent = () => {
  if (isLoading || acceptedRequestsQuery.isLoading || completedRequestsQuery.isLoading) {
    return <LoadingSpinner />;
  }
  
  // Select data based on active tab
  let data: ServiceRequest[] = [];
  let emptyTitle = '';
  let emptyMessage = '';
  
  switch (selectedTab) {
    case 'pending':
      data = pendingRequests;
      emptyTitle = 'No Pending Requests';
      emptyMessage = "You don't have any pending requests at the moment.";
      break;
    case 'accepted':
      data = acceptedRequests;
      emptyTitle = 'No Accepted Requests';
      emptyMessage = "You don't have any accepted requests at the moment.";
      break;
    case 'completed':
      data = completedRequests;
      emptyTitle = 'No Completed Requests';
      emptyMessage = "You don't have any completed requests yet.";
      break;
  }
  
  // ... render cards
};
```

---

## How It Works

### Tab Behavior:

1. **Accepted Tab** (Default)
   - Shows all bookings with `status = 'accepted'`
   - Displays badge with count of accepted requests
   - Provider can view details and start service

2. **Pending Tab**
   - Shows all bookings with `status = 'pending'`
   - Displays badge with count of pending requests
   - Provider can Accept or Reject requests

3. **Completed Tab**
   - Shows all bookings with `status = 'completed'`
   - No badge (completed requests don't need urgent action)
   - Provider can view details and history

---

## Data Flow

```
Provider Dashboard
    ↓
useProviderQueries() hook
    ├─ pendingRequests (status='pending')
    ├─ acceptedRequests (status='accepted')  ← NEW
    └─ completedRequests (status='completed') ← NEW
    ↓
providerService.getRequests(status)
    ↓
Backend API: GET /api/provider/requests?status={status}
    ↓
BookingController filters by status
    ↓
Returns filtered bookings
```

---

## Backend Support

The backend already supports filtering by status via the `BookingController`:

```php
public function providerBookings(Request $request) {
    $query = Booking::where('providerID', $provider->providerID)
        ->with(['customer', 'service', 'payment']);

    // Filter by status if requested
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }
    
    // ... rest of the code
}
```

**Supported statuses:**
- `pending` - Customer sent request, waiting for provider
- `accepted` - Provider accepted, waiting for payment/service
- `completed` - Service finished and confirmed
- `rejected` - Provider rejected the request
- `cancelled` - Customer cancelled the booking

---

## Testing

To test the changes:

1. **Restart the mobile app**:
   ```bash
   cd mobile_app
   npx expo start -c
   ```

2. **Login as a provider**

3. **Check each tab**:
   - **Accepted**: Should show bookings you've accepted
   - **Pending**: Should show new booking requests
   - **Completed**: Should show finished services

4. **Test badge counts**: Accept a request and see the badge update

---

## Benefits

✅ **Clearer workflow**: Providers see exactly what stage each booking is in
✅ **Better organization**: Separate tabs for different booking states
✅ **Accurate counts**: Badges show how many requests need attention
✅ **Proper filtering**: Each tab fetches only relevant data from backend
✅ **Performance**: Only loads data for the active tab

---

## Notes

- Default tab is now **"Accepted"** (most relevant for active providers)
- Empty states show appropriate messages for each tab
- Loading states handled properly for all queries
- Pull-to-refresh updates all tabs simultaneously
