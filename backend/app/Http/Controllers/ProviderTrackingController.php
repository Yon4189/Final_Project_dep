<?php

namespace App\Http\Controllers;

use App\Models\ProviderTracking;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ProviderTrackingController extends Controller
{
    /**
     * Update provider's live location (called from mobile app every few seconds)
     */
    public function updateLocation(Request $request)
    {
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $validator = Validator::make($request->all(), [
            'bookingID' => 'required|exists:bookings,bookingID',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'speed' => 'nullable|numeric',
            'heading' => 'nullable|numeric'
        ]);
        
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }
        
        // Verify provider owns this booking and it's active
        $booking = Booking::where('bookingID', $request->bookingID)
            ->where('providerID', $provider->providerID)
            ->whereIn('status', ['accepted', 'in_progress', 'started'])
            ->first();
            
        if (!$booking) {
            return response()->json([
                'success' => false, 
                'message' => 'Booking not found or not active'
            ], 404);
        }
        Log::info('Attempting to save tracking', [
            'providerID' => $provider->providerID,
            'bookingID' => $request->bookingID,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude
        ]);
        
        // Save tracking point
        $tracking = ProviderTracking::create([
            'providerID' => $provider->providerID,
            'bookingID' => $request->bookingID,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'speed' => $request->speed,
            'heading' => $request->heading,
            'tracked_at' => now()
        ]);
        
        // Broadcast location update
        event(new \App\Events\ProviderLocationUpdated(
            $request->bookingID,
            $request->latitude,
            $request->longitude,
            $request->speed,
            $request->heading,
            $tracking->tracked_at->toDateTimeString()
        ));

        Log::info('Tracking saved and broadcasted', ['tracking' => $tracking ? 'yes' : 'no', 'id' => $tracking->trackingID ?? null]);
        $this->checkProximityAndNotify($tracking, $booking);
        // Clean up old tracking points (keep only last 100 per booking)
        ProviderTracking::where('bookingID', $request->bookingID)
            ->orderBy('tracked_at', 'desc')
            ->skip(100)
            ->take(PHP_INT_MAX);
            //->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Location updated',
            'data' => [
                'trackingID' => $tracking->trackingID,
                'tracked_at' => $tracking->tracked_at
            ]
        ]);
    }

    private function checkProximityAndNotify($tracking, $booking)
    {
        if (!$booking->service_latitude || !$booking->service_longitude) {
            return;
        }
        
        $distance = $this->calculateDistance(
            $tracking->latitude,
            $tracking->longitude,
            $booking->service_latitude,
            $booking->service_longitude
        );
        
        // Convert to meters for easier reading
        $distanceMeters = $distance * 1000;
        
        // If within 30 meters and not already notified
        if ($distanceMeters <= 30) { // 30 meters
            $cacheKey = "arrival_notified_{$booking->bookingID}";
            
            if (!cache()->get($cacheKey)) {
                
                //  Notify PROVIDER to confirm arrival
                $providerNotification = new \App\Models\Notification();
                $providerNotification->notifiable_type = 'provider';
                $providerNotification->notifiable_id = $tracking->providerID;
                $providerNotification->type = 'arrival_confirmation';
                $providerNotification->title = 'You have arrived';
                $providerNotification->message = 'You are at the customer\'s location. Please confirm arrival.';
                $providerNotification->data = json_encode([
                    'booking_id' => $booking->bookingID,
                    'action' => 'confirm_arrival',
                    'distance_meters' => round($distanceMeters)
                ]);
                $providerNotification->related_booking_id = $booking->bookingID;
                $providerNotification->is_seen = false;
                $providerNotification->push_sent = false;
                $providerNotification->save();
                
                // 2 Notify CUSTOMER that provider is arriving
                $customerNotification = new \App\Models\Notification();
                $customerNotification->notifiable_type = 'customer';
                $customerNotification->notifiable_id = $booking->customerID;
                $customerNotification->type = 'provider_arriving';
                $customerNotification->title = 'Provider is arriving';
                $customerNotification->message = 'Your service provider is nearby and will arrive any moment.';
                $customerNotification->data = json_encode([
                    'booking_id' => $booking->bookingID,
                    'provider_id' => $tracking->providerID,
                    'distance_meters' => round($distanceMeters)
                ]);
                $customerNotification->related_booking_id = $booking->bookingID;
                $customerNotification->is_seen = false;
                $customerNotification->push_sent = false;
                $customerNotification->save();
                
                cache()->put($cacheKey, true, now()->addHours(1));
                
                Log::info('Arrival notifications created', [
                    'provider_id' => $tracking->providerID,
                    'customer_id' => $booking->customerID,
                    'booking_id' => $booking->bookingID,
                    'distance_meters' => round($distanceMeters)
                ]);
            }
        }
    }

    /**
     * Customer gets provider's current location
     */
    public function getProviderLocation($bookingID)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Verify booking belongs to this customer
        $booking = Booking::where('bookingID', $bookingID)
            ->where('customerID', $customer->customerID)
            ->first();
            
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }
        
        // Get latest location from last 5 minutes
        $location = ProviderTracking::where('bookingID', $bookingID)
            ->where('tracked_at', '>=', now()->subMinutes(5))
            ->latest('tracked_at')
            ->first();
            
        // Get last 10 locations for path history
        $history = ProviderTracking::where('bookingID', $bookingID)
            ->where('tracked_at', '>=', now()->subMinutes(30))
            ->orderBy('tracked_at', 'asc')
            ->get(['latitude', 'longitude', 'tracked_at']);
        
        // Calculate estimated arrival if we have speed and location
        $eta = null;
        if ($location && $location->speed > 0 && $booking->service_latitude && $booking->service_longitude) {
            $distance = $this->calculateDistance(
                $location->latitude, $location->longitude,
                $booking->service_latitude, $booking->service_longitude
            );
            
            if ($location->speed > 0) {
                $etaMinutes = ($distance / $location->speed) * 60;
                $eta = [
                    'distance_km' => round($distance, 1),
                    'minutes' => round($etaMinutes),
                    'arrival_time' => now()->addMinutes($etaMinutes)->toDateTimeString()
                ];
            }
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'current' => $location ? [
                    'latitude' => $location->latitude,
                    'longitude' => $location->longitude,
                    'speed' => $location->speed,
                    'last_update' => $location->tracked_at,
                    'is_recent' => $location->tracked_at >= now()->subMinutes(2)
                ] : null,
                'destination' => [
                    'latitude' => $booking->service_latitude,
                    'longitude' => $booking->service_longitude,
                    'address' => $booking->address_text ?? $booking->service_address
                ],
                'history' => $history,
                'eta' => $eta,
                'booking_status' => $booking->status
            ]
        ]);
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // km
        
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        
        $a = sin($latDelta/2) * sin($latDelta/2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($lonDelta/2) * sin($lonDelta/2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return $earthRadius * $c;
    }

    /**
     * Get route information for provider (destination only, actual route handled by Google Maps on frontend)
     */
    public function getBookingRoute($bookingID)
    {
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Verify booking belongs to this provider
        $booking = Booking::where('bookingID', $bookingID)
            ->where('providerID', $provider->providerID)
            ->first();
            
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }
        
        // Check if booking is in active state
        if (!in_array($booking->status, ['accepted', 'in_progress', 'started'])) {
            return response()->json([
                'success' => false,
                'message' => 'Booking is not active'
            ], 400);
        }
        
        return response()->json([
            'success' => true,
            'data' => [
                'destination' => [
                    'latitude' => $booking->service_latitude,
                    'longitude' => $booking->service_longitude,
                    'address' => $booking->address_text ?? $booking->service_address,
                    'customer_name' => $booking->customer->fullname ?? 'Customer',
                    'customer_phone' => $booking->customer->phone ?? null
                ],
                'booking' => [
                    'id' => $booking->bookingID,
                    'status' => $booking->status,
                    'scheduled_time' => $booking->scheduledDate,
                    'notes' => $booking->notes
                ],
                'provider' => [
                    'current_location' => [
                        'latitude' => $provider->current_latitude,
                        'longitude' => $provider->current_longitude,
                    ]
                ]
            ]
        ]);
    }
}