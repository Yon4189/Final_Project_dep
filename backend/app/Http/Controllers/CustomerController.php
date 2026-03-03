<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use App\Models\ServiceProvider;
use App\Models\Review;
use App\Models\Complaint;
use App\Models\UserLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
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
            'scheduledTime' => '09:00',
            'address' => $service?->provider?->service_city ?? ($provider?->service_city ?? ''),
            'locationId' => null,
            'description' => null,
            'specialInstructions' => null,
            'estimatedPrice' => $estimatedPrice ?? 0,
            'finalPrice' => null,
            'paymentStatus' => 'pending',
            'paymentDetails' => null,
            'createdAt' => optional($booking->created_at)->toISOString(),
            'updatedAt' => optional($booking->updated_at)->toISOString(),
            'confirmedAt' => optional($booking->accepted_at)->toISOString(),
            'startedAt' => optional($booking->provider_started_at)->toISOString(),
            'completedAt' => optional($booking->completed_at)->toISOString(),
            'cancelledAt' => null,
            'cancellationReason' => null,
            'review' => null,
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
                    'locations' => [],
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
            'data' => $customer->load(['locations', 'notificationSettings'])
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

    public function getRequests()
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        $bookings = Booking::where('customerID', $customer->customerID)
            ->with(['service.category', 'provider'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(function ($booking) {
                return $this->bookingToServiceRequestPayload($booking);
            })->values()
        ]);
    }

    public function createBooking(Request $request)
    {
        $customer = $this->resolveCustomer();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }
        
        $validated = $request->validate([
            'provider_id' => 'nullable|exists:service_providers,providerID',
            'service_id' => 'required|exists:services,serviceID',
            'scheduled_date' => 'required|date',
        ]);

        $service = Service::with(['provider', 'category'])->find($validated['service_id']);
        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Service not found'
            ], 404);
        }

        $booking = Booking::create([
            'customerID' => $customer->customerID,
            'serviceID' => $service->serviceID,
            'providerID' => $validated['provider_id'] ?? $service->providerID,
            'status' => 'pending',
            'scheduledDate' => $validated['scheduled_date'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->bookingToServiceRequestPayload(
                $booking->load(['service.category', 'provider'])
            )
        ]);
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
            ->where('status', 'in_progress')
            ->with('provider')
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Request not found or not in progress'
            ], 404);
        }

        // For demo purposes, return provider's last known location
        // In production, this would integrate with real-time tracking
        return response()->json([
            'success' => true,
            'data' => [
                'latitude' => $booking->service_latitude ?? 9.03,
                'longitude' => $booking->service_longitude ?? 38.74
            ]
        ]);
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
/*
    public function createComplaint(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        $validated = $request->validate([
            'provider_id' => 'required|exists:providers,id',
            'booking_id' => 'required|exists:bookings,id',
            'type' => 'required|in:service_quality,behavior,payment,other',
            'description' => 'required|string|max:2000',
            'priority' => 'sometimes|in:low,medium,high',
            'attachments' => 'sometimes|array'
        ]);

        $complaint = Complaint::create([
            'customer_id' => $customer->id,
            ...$validated,
            'status' => 'pending'
        ]);

        return response()->json([
            'success' => true,
            'data' => $complaint
        ]);
    }

    public function getComplaints()
    {
        $customer = Auth::guard('customer')->user();
        $complaints = Complaint::where('customer_id', $customer->id)
            ->with(['provider'])
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
        $complaint = Complaint::where('customer_id', $customer->id)
            ->with(['provider'])
            ->find($id);

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $complaint
        ]);
    }

    public function getLocations()
    {
        $customer = Auth::guard('customer')->user();
        $locations = UserLocation::where('customer_id', $customer->id)
            ->orderBy('is_primary', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $locations
        ]);
    }

    public function addLocation(Request $request)
    {
        $customer = Auth::guard('customer')->user();
        
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'address' => 'required|string|max:500',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'is_primary' => 'sometimes|boolean'
        ]);

        $location = UserLocation::create([
            'customer_id' => $customer->id,
            ...$validated
        ]);

        return response()->json([
            'success' => true,
            'data' => $location
        ]);
    }

    public function updateLocation($id, Request $request)
    {
        $customer = Auth::guard('customer')->user();
        $location = UserLocation::where('customer_id', $customer->id)
            ->where('id', $id)
            ->first();

        if (!$location) {
            return response()->json([
                'success' => false,
                'message' => 'Location not found'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'address' => 'sometimes|string|max:500',
            'latitude' => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric'
        ]);

        $location->update($validated);

        return response()->json([
            'success' => true,
            'data' => $location
        ]);
    }

    public function deleteLocation($id)
    {
        $customer = Auth::guard('customer')->user();
        $location = UserLocation::where('customer_id', $customer->id)
            ->where('id', $id)
            ->first();

        if (!$location) {
            return response()->json([
                'success' => false,
                'message' => 'Location not found'
            ], 404);
        }

        $location->delete();

        return response()->json([
            'success' => true,
            'message' => 'Location deleted successfully'
        ]);
    }

    public function setPrimaryLocation($id)
    {
        $customer = Auth::guard('customer')->user();
        
        // Remove primary status from all locations
        UserLocation::where('customer_id', $customer->id)
            ->update(['is_primary' => false]);

        // Set new primary location
        $location = UserLocation::where('customer_id', $customer->id)
            ->where('id', $id)
            ->first();

        if (!$location) {
            return response()->json([
                'success' => false,
                'message' => 'Location not found'
            ], 404);
        }

        $location->update(['is_primary' => true]);

        return response()->json([
            'success' => true,
            'data' => $location
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
*/
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
