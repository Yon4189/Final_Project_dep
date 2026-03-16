<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use App\Models\ServiceProvider;
use App\Models\Review;
use App\Models\Dispute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Validator; 
use Illuminate\Support\Facades\Log;
use App\Models\CustomerAddress;
use App\Models\ProviderTracking;

class CustomerController extends Authenticatable
{
    private function resolveCustomer()
    {
        $customer = Auth::guard('customer')->user();
        if ($customer) {
            return $customer;
        }

        return Customer::first();
    }

    private function bookingToServiceRequestPayload(Booking $booking)
    {
        $service = $booking->relationLoaded('service') ? $booking->service : null;
        $provider = $booking->relationLoaded('provider') ? $booking->provider : null;

        $scheduledDate = $booking->scheduledDate
            ? $booking->scheduledDate->toDateString()
            : null;
            
        $scheduledTime = $booking->scheduledDate
            ? $booking->scheduledDate->format('H:i')
            : '09:00';

        $estimatedPrice = null;
        if ($service) {
            $estimatedPrice = $service->estimatedCost ?? $service->estimatedPrice ?? null;
        }

        return [
            'id' => (string) $booking->bookingID,
            'requestNumber' => 'REQ-' . str_pad((string) $booking->bookingID, 6, '0', STR_PAD_LEFT),
            'providerId' => $provider ? (string) $provider->providerID : ($booking->providerID ? (string) $booking->providerID : null),
            'providerName' => $provider?->fullname ?? 'Provider',
            'providerImage' => $provider?->profilePicture,
            'providerRating' => null,
            'providerReviewCount' => null,
            'providerVerified' => ($provider?->status ?? null) === 'approved',
            'providerJobs' => null,
            'serviceId' => $service ? (string) $service->serviceID : (string) $booking->serviceID,
            'serviceName' => $service?->title ?? 'Service',
            'categoryName' => $service?->category?->name ?? '',
            'status' => $booking->status,
            'scheduledDate' => $scheduledDate ?? now()->toDateString(),
            'scheduledTime' => $scheduledTime,
            'address' => $booking->service_address ?? ($service?->provider?->service_city ?? ($provider?->service_city ?? '')),
            'locationId' => null,
            'description' => $booking->notes,
            'specialInstructions' => $booking->notes,
            'estimatedPrice' => (float) ($booking->agreed_price ?? ($estimatedPrice ?? 0)),
            'finalPrice' => (float) ($booking->agreed_price ?? 0),
            'paymentStatus' => $booking->payment_status ?? 'pending',
            'paymentDetails' => null,
            'createdAt' => optional($booking->created_at)->toISOString(),
            'updatedAt' => optional($booking->updated_at)->toISOString(),
            'confirmedAt' => optional($booking->accepted_at)->toISOString(),
            'startedAt' => optional($booking->provider_started_at)->toISOString(),
            'completedAt' => optional($booking->completed_at)->toISOString(),
            'cancelledAt' => optional($booking->cancelled_at)->toISOString(),
            'cancellationReason' => $booking->cancellation_reason,
            'review' => $booking->relationLoaded('review') ? $booking->review : null,
            'providerPhone' => $provider?->phone,
        ];
    }

    public function getProfile()
    {
        $customer = Auth::guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => 1,
                    'name' => 'Test Customer',
                    'email' => 'customer@example.com',
                    'phone' => '251911000001',
                    'profile_image' => 'https://via.placeholder.com/150',
                    'created_at' => now(),
                    'updated_at' => now(),
                    'service_city' => [],
                    'notificationSettings' => [
                        'email' => true,
                        'push' => true,
                        'sms' => false,
                        'marketing' => false,
                        'booking_updates' => true,
                        'payment_updates' => true,
                        'promotional_offers' => false
                    ]
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $customer//->load(['serviceCity', 'notificationSettings'])
        ]);
    }

    public function updateProfile(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:customers,email,' . $customer->id,
            'phone' => 'sometimes|string|max:20',
            'bio' => 'sometimes|string|max:1000',
            'date_of_birth' => 'sometimes|date',
            'gender' => 'sometimes|in:male,female,other',
        ]);
        
        $customer->update($validated);
    
        return response()->json([
            'success' => true,
            'data' => $customer
        ]);
    }

    public function uploadProfileImage(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($customer->profile_image) {
            Storage::delete('public/' . $customer->profile_image);
        }

        $imagePath = $request->file('image')->store('profile_images', 'public');
        $customer->update(['profile_image' => $imagePath]);

        return response()->json([
            'success' => true,
            'data' => ['url' => Storage::url($imagePath)]
        ]);
    }

    public function changePassword(Request $request)
    {
        
        $customer = Auth::guard('customer')->user();
        //dd(get_class($customer), $customer);

        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $validated = $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $customer->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 400);
        }

        $customer->update(['password' => Hash::make($validated['new_password'])]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    }

    public function getRequests(Request $request)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $query = Booking::where('customerID', $customer->customerID)
            ->with(['service.category', 'provider', 'review']);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $bookings = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(function ($booking) {
                return $this->bookingToServiceRequestPayload($booking);
            })->values()
        ]);
    }

    public function createBooking(Request $request)
    {
        try {
            $customer = $this->resolveCustomer();
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found. Please login again.'
                ], 404);
            }
            
            // validate all required fields
            $validator = Validator::make($request->all(), [
                'providerID' => 'required|exists:service_providers,providerID',
                'serviceID' => 'required|exists:services,serviceID',
                'scheduledDate' => 'required|date|after_or_equal:today',
                'agreed_price' => 'required|numeric|min:0',
                
                // New location fields
                'location_source' => 'required|in:gps,saved,new',
                'saved_address_id' => 'required_if:location_source,saved|exists:customer_addresses,addressID',
                'full_address' => 'required_if:location_source,new|string|max:255',
                'latitude' => 'required_if:location_source,gps,new|numeric',
                'longitude' => 'required_if:location_source,gps,new|numeric',
                'place_id' => 'nullable|string',
                
                // Keep old field for backward compatibility? Or remove?
                'service_address' => 'sometimes|string|max:255',
                'notes' => 'nullable|string|max:1000'
            ], [
                'providerID.required' => 'please select a provider',
                'serviceID.required' => 'please select a service',
                'scheduledDate.required' => 'please select a date for the service',
                'scheduledDate.after_or_equal' => 'scheduled date must be today or in the future',
                'agreed_price.required' => 'please enter the agreed price',
                'agreed_price.min' => 'price cannot be negative',
                
                // New error messages
                'location_source.required' => 'please select how to provide your location',
                'location_source.in' => 'invalid location source',
                'saved_address_id.required_if' => 'please select a saved address',
                'saved_address_id.exists' => 'selected address not found',
                'full_address.required_if' => 'please enter your address',
                'latitude.required_if' => 'location coordinates are required',
                'longitude.required_if' => 'location coordinates are required'
            ], );

            $validated = $validator->validated();

            $service = Service::with(['provider', 'category'])->find($validated['serviceID']);
            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'service not found'
                ], 404);
            }

            // check if provider offers this service
            if ($service->providerID != $validated['providerID']) {
                return response()->json([
                    'success' => false,
                    'message' => 'this provider does not offer the selected service'
                ], 400);
            }

            // check if customer already booked THIS EXACT SERVICE for THIS DATE with this provider
            $existingBooking = Booking::where('customerID', $customer->customerID)
                ->where('serviceID', $service->serviceID)
                ->where('providerID', $validated['providerID'])
                ->whereDate('scheduledDate', $validated['scheduledDate'])
                ->whereIn('status', ['pending', 'accepted', 'in_progress'])
                ->first();
    
            if ($existingBooking) {
                // If it's still pending, let them proceed with the existing one instead of erroring
                if ($existingBooking->status === 'pending') {
                    return response()->json([
                        'success' => true,
                        'message' => 'Returning existing pending booking',
                        'data' => $this->bookingToServiceRequestPayload(
                            $existingBooking->load(['service.category', 'provider'])
                        )
                    ], 200);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'you already have an active booking for this service on this date'
                ], 400);
            }

            // Merge address into notes if it exists
            $finalNotes = $validated['notes'] ?? '';
            if (!empty($validated['service_address'])) {
                $finalNotes = "Address: " . $validated['service_address'] . "\n" . $finalNotes;
            }

            // create booking
            $booking = Booking::create([
                'customerID' => $customer->customerID,
                'serviceID' => $service->serviceID,
                'providerID' => $validated['providerID'],
                'status' => 'pending',
                'scheduledDate' => $validated['scheduledDate'],
                'agreed_price' => $validated['agreed_price'],
                'notes' => trim($finalNotes) ?: null,
                'expires_at' => now()->addHours(24) // booking expires in 24 hours
            ]);

            // log the booking creation
            Log::info('booking created successfully', [
                'booking_id' => $booking->bookingID,
                'customer_id' => $customer->customerID,
                'provider_id' => $validated['providerID'],
                'location_source' => $locationData['location_source']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'booking created successfully',
                'data' => $this->bookingToServiceRequestPayload(
                    $booking->load(['service.category', 'provider'])
                )
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('database error creating booking: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'database error occurred. please try again.'
            ], 500);
            
        } catch (\Exception $e) {
            Log::error('unexpected error creating booking: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'an unexpected error occurred. please try again.'
            ], 500);
        }
    }

    public function getRequestDetails($id)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $booking = Booking::where('customerID', $customer->customerID)
            ->with(['service.category', 'provider'])
            ->where('bookingID', $id)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->bookingToServiceRequestPayload($booking)
        ]);
    }

    public function cancelRequest($id, Request $request)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $booking = Booking::where('customerID', $customer->customerID)
            ->where('bookingID', $id)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500'
        ]);

        $booking->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->bookingToServiceRequestPayload($booking->load(['service.category', 'provider']))
        ]);
    }

    public function rescheduleRequest($id, Request $request)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $booking = Booking::where('customerID', $customer->customerID)
            ->where('bookingID', $id)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        $validated = $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'time' => 'required'
        ]);

        $booking->update([
            'scheduledDate' => $validated['date'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->bookingToServiceRequestPayload($booking->load(['service.category', 'provider']))
        ]);
    }

    public function getRequestStatus($id)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $booking = Booking::where('customerID', $customer->customerID)
            ->where('bookingID', $id)
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'status' => $booking->status,
                'timeline' => $this->generateRequestTimeline($booking)
            ]
        ]);
    }

    public function trackProvider($id)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $booking = Booking::where('customerID', $customer->customerID)
            ->where('bookingID', $id)
            ->whereIn('status', ['in_progress', 'started', 'accepted'])
            ->with('provider')
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found or not in progress'
            ], 404);
        }

        // Get provider's latest location from tracking table
        $latestTracking = ProviderTracking::where('bookingID', $id)
            ->where('providerID', $booking->providerID)
            ->latest('tracked_at')
            ->first();

        // Initialize ETA array
        $eta = [
            'distance_km' => null,
            'minutes' => null,
            'arrival_time' => null,
            'display_text' => 'Calculating...'
        ];

        // Calculate distance and ETA if we have provider location
        if ($latestTracking && $booking->service_latitude && $booking->service_longitude) {
            $distance = $this->calculateDistance(
                $latestTracking->latitude,
                $latestTracking->longitude,
                $booking->service_latitude,
                $booking->service_longitude
            );
            
            $eta['distance_km'] = round($distance, 1);
            
            // Calculate ETA based on speed
            if ($distance > 0) {
                $speed = $latestTracking->speed ?? 30; // Default 30 km/h
                if ($speed > 0) {
                    $minutes = round(($distance / $speed) * 60);
                    $eta['minutes'] = $minutes;
                    $eta['arrival_time'] = now()->addMinutes($minutes)->format('g:i A');
                    
                    // Friendly display text
                    if ($minutes < 1) {
                        $eta['display_text'] = 'Arriving now';
                    } elseif ($minutes == 1) {
                        $eta['display_text'] = 'Arriving in 1 minute';
                    } else {
                        $eta['display_text'] = "Arriving in {$minutes} minutes";
                    }
                }
            } else {
                $eta['display_text'] = 'Provider has arrived';
            }
        }

        // Get last 10 locations for path history
        $history = ProviderTracking::where('bookingID', $id)
            ->where('providerID', $booking->providerID)
            ->orderBy('tracked_at', 'asc')
            ->limit(10)
            ->get(['latitude', 'longitude', 'tracked_at']);

        return response()->json([
            'success' => true,
            'data' => [
                'provider' => $latestTracking ? [
                    'latitude' => $latestTracking->latitude,
                    'longitude' => $latestTracking->longitude,
                    'last_update' => $latestTracking->tracked_at,
                    'is_moving' => ($latestTracking->speed ?? 0) > 2
                ] : null,
                'destination' => [
                    'address' => $booking->address_text ?? $booking->service_address
                ],
                'eta' => $eta,
                'history' => $history,
                'booking_status' => $booking->status
            ]
        ]);
    }

    /**
     * Calculate distance between two coordinates in kilometers
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        if (!$lat1 || !$lon1 || !$lat2 || !$lon2) return null;
        
        $earthRadius = 6371; // km
        
        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);
        
        $a = sin($latDelta/2) * sin($latDelta/2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($lonDelta/2) * sin($lonDelta/2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return round($earthRadius * $c, 2);
    }

    public function createReview(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        $validated = $request->validate([
            'provider_id' => 'required|exists:providers,id',
            'booking_id' => 'required|exists:bookings,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'is_recommended' => 'required|boolean',
            'is_anonymous' => 'sometimes|boolean'
        ]);

        $review = Review::create([
            'customer_id' => $customer->id,
            ...$validated
        ]);

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }

    public function updateReview($id, Request $request)
    {
        $customer = Auth::guard('customer')->user();
        $review = Review::where('customer_id', $customer->id)
            ->where('id', $id)
            ->first();

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Review not found'
            ], 404);
        }

        $validated = $request->validate([
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'sometimes|string|max:1000',
            'is_recommended' => 'sometimes|boolean'
        ]);

        $review->update($validated);

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }

    public function deleteReview($id)
    {
        $customer = Auth::guard('customer')->user();
        $review = Review::where('customer_id', $customer->id)
            ->where('id', $id)
            ->first();

        if (!$review) {
            return response()->json([
                'success' => false,
                'message' => 'Review not found'
            ], 404);
        }

        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Review deleted successfully'
        ]);
    }

    public function getReviewForBooking($bookingId)
    {
        $customer = Auth::guard('customer')->user();
        $review = Review::where('customer_id', $customer->id)
            ->where('booking_id', $bookingId)
            ->first();

        return response()->json([
            'success' => true,
            'data' => $review
        ]);
    }

    public function getMyReviews()
    {
        $customer = Auth::guard('customer')->user();
        $reviews = Review::where('customer_id', $customer->id)
            ->with(['provider'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $reviews->items()
        ]);
    }
    public function createComplaint(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        $validated = $request->validate([
            'provider_id' => 'required|exists:service_providers,providerID',
            'booking_id' => 'required|exists:bookings,bookingID',
            'type' => 'required|in:service_quality,behavior,payment,other',
            'description' => 'required|string|max:2000',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'attachments' => 'sometimes|array'
        ]);

        $booking = Booking::find($request->booking_id);

        $complaint = Dispute::create([
            'bookingID' => $request->booking_id,
            'raised_by_id' => $customer->customerID,
            'raised_by_type' => 'customer',
            'against_id' => $booking->providerID,
            'against_type' => 'provider',
            'title' => $request->type . ' - ' . substr($request->description, 0, 30) . '...',
            'description' => $request->description,
            'category' => $request->type,
            'priority' => $request->priority ?? 'medium',
            'attachments' => $request->attachments,
            'status' => 'pending'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dispute raised successfully',
            'data' => $complaint
        ]);
    }

    public function getComplaints()
    {
        $customer = Auth::guard('customer')->user();
        $complaints = Dispute::where('raised_by_type', 'customer')
            ->where('raised_by_id', $customer->customerID)
            ->with(['booking.provider'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $complaints->items()
        ]);
    }

    public function getComplaintDetails($id)
    {
        $customer = Auth::guard('customer')->user();
        $complaint = Dispute::where('raised_by_type', 'customer')
            ->where('raised_by_id', $customer->customerID)
            ->with(['booking.provider'])
            ->find($id);

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Dispute not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $complaint
        ]);
    }

    public function getLocations()
    {
        // UserLocation model is deprecated. Location is now stored directly in customers table.
        // Returning a simulated array for compatibility with old frontend versions.
        $customer = Auth::guard('customer')->user();
        
        $locations = [];
        if ($customer->location) {
            $locations[] = [
                'id' => 1,
                'name' => 'Current Location',
                'address' => $customer->location,
                'latitude' => $customer->service_latitude,
                'longitude' => $customer->service_longitude,
                'is_primary' => true
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $locations
        ]);
    }

    public function addLocation(Request $request)
    {
        // Redirecting to update main profile location
        $customer = Auth::guard('customer')->user();
        
        $validated = $request->validate([
            'address' => 'required|string|max:500',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $customer->update([
            'location' => $request->address,
            'service_latitude' => $request->latitude,
            'service_longitude' => $request->longitude,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Location updated on profile',
            'data' => [
                'id' => 1,
                'address' => $customer->location,
                'is_primary' => true
            ]
        ]);
    }

    public function updateLocation($id, Request $request)
    {
        return $this->addLocation($request);
    }

    public function deleteLocation($id)
    {
        return response()->json([
            'success' => false,
            'message' => 'Deleting the primary profile location is not allowed via this endpoint.'
        ], 400);
    }

    public function setPrimaryLocation($id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Location is already primary'
        ]);
    }

    public function getNotificationSettings()
    {
        $customer = Auth::guard('customer')->user();
        
        // For demo purposes, return default settings
        // In production, this would be stored in a separate table
        return response()->json([
            'success' => true,
            'data' => [
                'email' => true,
                'push' => true,
                'sms' => false,
                'marketing' => false,
                'booking_updates' => true,
                'payment_updates' => true,
                'promotional_offers' => false
            ]
        ]);
    }

    public function updateNotificationSettings(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        $validated = $request->validate([
            'email' => 'sometimes|boolean',
            'push' => 'sometimes|boolean',
            'sms' => 'sometimes|boolean',
            'marketing' => 'sometimes|boolean',
            'booking_updates' => 'sometimes|boolean',
            'payment_updates' => 'sometimes|boolean',
            'promotional_offers' => 'sometimes|boolean'
        ]);

        // For demo purposes, just return success
        // In production, this would be stored in database
        return response()->json([
            'success' => true,
            'data' => $validated
        ]);
    }
    private function generateRequestTimeline($booking)
    {
        $timeline = [];
        
        $timeline[] = [
            'status' => 'pending',
            'title' => 'Request Submitted',
            'description' => 'Your service request has been submitted',
            'timestamp' => $booking->created_at,
            'completed' => true
        ];

        if ($booking->status === 'accepted') {
            $timeline[] = [
                'status' => 'accepted',
                'title' => 'Request Accepted',
                'description' => 'Provider has accepted your request',
                'timestamp' => $booking->accepted_at,
                'completed' => true
            ];
        }

        if ($booking->status === 'in_progress') {
            $timeline[] = [
                'status' => 'in_progress',
                'title' => 'Service In Progress',
                'description' => 'Provider is currently working on your request',
                'timestamp' => $booking->provider_started_at,
                'completed' => true
            ];
        }

        if ($booking->status === 'completed') {
            $timeline[] = [
                'status' => 'completed',
                'title' => 'Service Completed',
                'description' => 'Service has been completed',
                'timestamp' => $booking->completed_at,
                'completed' => true
            ];
        }

        if ($booking->status === 'cancelled') {
            $timeline[] = [
                'status' => 'cancelled',
                'title' => 'Request Cancelled',
                'description' => 'Request was cancelled',
                'timestamp' => $booking->updated_at,
                'completed' => true
            ];
        }

        return $timeline;
    }
}
