# Testing Provider Requests Display Issue

## Steps to Debug:

### 1. Restart PHP Server
```bash
cd backend
# Stop with Ctrl+C
php artisan serve
```

### 2. Restart Expo with Cache Clear
```bash
cd mobile_app
# Stop with Ctrl+C
npx expo start -c
```

### 3. Test the Flow
1. Login as provider
2. Go to "Requests" screen
3. Pull down to refresh
4. Check what's displayed

### 4. Check Logs
```bash
cd backend
# Windows PowerShell:
Get-Content storage/logs/laravel.log -Tail 50

# Look for:
# - "Provider requests formatted:" - shows what backend is sending
# - Any errors in the response
```

### 5. Check Expo Console
Look for:
- API request to `/provider/requests`
- Response data structure
- Any JavaScript errors

### 6. What to Look For

The backend should return data with these fields:
- `customerName` - Customer's full name
- `customerPhone` - Customer's phone number
- `customerAddress` - Service location address
- `customerImage` - Customer's profile picture
- `serviceName` - Name of the service
- `estimatedPrice` - Price for the service
- `scheduledDate` - Date in Y-m-d format
- `scheduledTime` - Time in H:i format
- `notes` - Special instructions

### 7. Common Issues

**If fields show as empty strings or "Unknown":**
- Check if the booking has a customer relationship loaded
- Check if customer has fullname field populated
- Check database for actual data

**If nothing shows:**
- Check if provider is authenticated correctly
- Check if bookings exist for this provider
- Check network tab in Expo for API errors

**If old data shows:**
- Clear Expo cache: `npx expo start -c`
- Clear browser cache if testing on web
- Pull down to refresh in the app

### 8. Direct API Test

You can test the API directly by checking the Laravel logs after making a request from the app. The log will show:
```
Provider requests formatted: {
  "count": 1,
  "sample": {
    "customerName": "John Doe",
    "customerPhone": "+251912345678",
    ...
  }
}
```

This will tell you if the backend is sending the correct data.
