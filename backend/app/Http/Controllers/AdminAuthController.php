<?php


namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use App\Models\ServiceProvider;
use App\Models\Customer;
use App\Models\Category;
use App\Models\Service;
use App\Models\Transaction;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Models\Booking;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Notification;


class AdminAuthController extends Authenticatable 
{
    /**
     * 1. Admin Login Logic
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        $admin = Admin::where('email', $request->email)->first();

        if (!$admin || !Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Generate token
        //$token = $admin->createToken('admin-token')->plainTextToken;
        $token = $admin->createToken('auth_token', ['*'], now()->addMinutes(1440))->plainTextToken;
        // Remove password from response
        unset($admin->password);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'admin' => $admin,
                'token' => $token
            ]
        ]);
    }

    /**
     * 2. Platform Statistics
     */
    public function getStats()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'providers'  => ServiceProvider::count(),
                    'customers'  => Customer::count(),
                    'pending'    => ServiceProvider::where('status', 'pending')->count(),
                    'active'     => ServiceProvider::where('status', 'Active')->count(),
                    'suspended'  => ServiceProvider::where('status', 'Suspended')->count(),
                    'rejected'   => ServiceProvider::where('status', 'Rejected')->count(),
                    'categories' => Category::count(),
                    'services'   => Service::count(),
                    'revenue'    => Transaction::sum('platformFee') ?? 0
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Dashboard Stats Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch database stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 3. Get All Providers (for admin overview)
     */
    public function getAllProviders()
    {
        try {
            $providers = ServiceProvider::whereIn('status', ['Active', 'Suspended'])
                ->with('category')
                ->get();
            $formatted = $providers->map(function ($provider) {
                return [
                    'providerID'   => $provider->providerID,
                    'fullname'     => $provider->fullname,
                    'email'        => $provider->email,
                    'profilePicture'=> $provider->profilePicture,
                    'phone'        => $provider->phone,
                    'service_city' => $provider->service_city,
                    'catagoryID'   => $provider->catagoryID,
                    'category'     => $provider->category->name ?? null,
                    'status'       => $provider->status,
                    'address_text' => $provider->address_text,
                    'created_at'   => $provider->created_at ? $provider->created_at->format('Y-m-d H:i:s') : null,
                ];
            });
            return response()->json([
                'success' => true,
                'data'    => $formatted
            ]);
        } catch (\Exception $e) {
            Log::error("Get All Providers Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch providers',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 4. Provider Verification Action (With Email)
     */
    public function verifyProvider(Request $request, $id, \App\Services\NotificationService $notificationService)
    {
        // 1. Validate incoming request
        $request->validate([
            'status' => 'required|string|in:approved,rejected,suspended',
            'verification_reason' => 'nullable|string|max:255',
        ]);

        // 2. Find the provider
        $provider = ServiceProvider::find($id);
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }

        // 3. Update status and reason
        $status = $request->status;
        if ($status === 'approved') {
            $provider->status = 'Active';
            $provider->approved_at = now();
            $provider->rejected_at = null;
        } elseif ($status === 'rejected') {
            $provider->status = 'Rejected';
            $provider->rejected_at = now();
            $provider->approved_at = null;
            $provider->verification_reason = $request->verification_reason;
        } elseif ($status === 'suspended') {
            $provider->status = 'Suspended';
            $provider->verification_reason = $request->verification_reason;
        }
        $provider->save();

        // Send In-App Notification using the injected service
        $title = "";
        $message = "";
        $type = "";

        if ($status === 'approved') {
            $type = \App\Services\NotificationService::TYPE_PROVIDER_APPROVED;
            $title = "Account Approved! 🎉";
            $message = "Congratulations! Your provider account has been approved. You can now start receiving service requests.";
        } elseif ($status === 'rejected') {
            $type = \App\Services\NotificationService::TYPE_PROVIDER_REJECTED;
            $title = "Account Update";
            $message = "Your application was rejected. Reason: " . ($request->verification_reason ?? "The provided documents were not clear or valid.");
        } elseif ($status === 'suspended') {
            $type = \App\Services\NotificationService::TYPE_PROVIDER_REJECTED; // Or a specific suspended type if added
            $title = "Account Suspended";
            $message = "Your account has been suspended for further verification. Reason: " . ($request->verification_reason ?? "Administrative decision.");
        }

        if ($type) {
            $notificationService->toProvider($provider->providerID, $type, $title, $message, [
                'status' => $provider->status,
                'reason' => $request->verification_reason
            ]);
        }

        // 3.5 Mark registration notifications as seen
        Notification::where('type', \App\Services\NotificationService::TYPE_NEW_PROVIDER_REGISTRATION)
            ->where('data->provider_id', $provider->providerID)
            ->where('is_seen', false)
            ->update([
                'is_seen' => true,
                'seen_at' => now()
            ]);

        $statusLabel = strtolower($request->status);

        // 4. Prepare email based on status
        if ($request->status === 'approved') {
            $emailBody = "
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #2b64f3;'>Congratulations!</h2>
                    <p>Hello <strong>{$provider->fullname}</strong>,</p>
                    <p>Your Service Provider account has been <strong>approved</strong> by our administration team.</p>
                    <p>You can now log in to the mobile app and start receiving service requests.</p>
                </div>";
        } elseif ($request->status === 'suspended') {
            $reason = $request->verification_reason ?? 'Administrative decision.';
            $emailBody = "
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #8b5cf6;'>Account Suspended</h2>
                    <p>Hello <strong>{$provider->fullname}</strong>,</p>
                    <p>We wish to inform you that your Service Provider account has been <strong>suspended</strong> by our administration team.</p>
                    <p><strong>Reason:</strong> {$reason}</p>
                    <p>During suspension, you will not be able to receive new service requests.</p>
                    <p>If you have questions, please contact our support team.</p>
                </div>";
        } elseif ($request->status === 'rejected') {
            $reason = $request->verification_reason ?? 'The provided documents were not clear or valid.';
            $emailBody = "
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #ef4444;'>Account Status Update</h2>
                    <p>Hello <strong>{$provider->fullname}</strong>,</p>
                    <p>We regret to inform you that your application has been <strong>rejected</strong> at this time.</p>
                    <p><strong>Reason:</strong> {$reason}</p>
                    <p>You can re-apply after addressing the issues mentioned.</p>
                </div>";
        }

        // 5. Send email
        try {
            Mail::html($emailBody, function ($message) use ($provider, $statusLabel) {
                $message->to($provider->email)
                        ->subject("Service Finder Account: " . ucfirst($statusLabel));
            });
        } catch (\Exception $e) {
            Log::error("Mail Error: " . $e->getMessage());
        }

        // 6. Return JSON response
        return response()->json([
            'success' => true,
            'message' => 'Status updated and notification sent.',
            'data' => [
                'providerID' => $provider->providerID,
                'status' => $provider->status
            ]
        ]);
    }

    /**
     * 5. List Pending Providers
     */
    public function pendingProviders()
    {
        $pending = ServiceProvider::where('status', 'pending')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $pending]);
    }

    /**
     * 6. List Approved Providers
     */
    public function approvedProviders()
    {
        $approved = ServiceProvider::where('status', 'Active')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $approved]);
    }

    /**
     * 7. List Rejected Providers
     */
    public function rejectedProviders()
    {
        $rejected = ServiceProvider::where('status', 'rejected')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $rejected]);
    }

    /**
     * 8. List Suspended Providers
     */
    public function suspendedProviders()
    {
        $suspended = ServiceProvider::where('status', 'Suspended')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $suspended]);
    }

    /**
     * 9. Format Helper – used by pending/approved/rejected methods
     */
    private function formatProvider($provider)
    {
        $service = $provider->services->first();
        return [
            'id'                  => $provider->providerID,
            'name'                => $provider->fullname,
            'profilePicture'      => $provider->profilePicture,
            'service_type'        => $provider->category?->name ?? 'General',
            'service_title'       => $service->title ?? null,
            'service_description' => $service->description ?? $provider->bio ?? null,
            'estimated_cost'      => $service->estimatedPrice ?? $service->estimatedCost ?? $provider->estimatedPrice ?? null,
            'submission_date'     => $provider->created_at ? $provider->created_at->format('M d, Y') : 'N/A',
            'idPhoto'             => $provider->idPhoto,
            'idPhotoType'         => $provider->idPhotoType,
            'credentialPhoto'     => $provider->credentialPhoto,
            'status'              => $provider->status,
            'email'               => $provider->email,
        ];
    }

    // =============== Functions for User Management tab for admin ============

    /**
     * Get all providers (simplified)
     */
    public function getProviders()
    {
        return response()->json([
            'success' => true,
            'data' => ServiceProvider::whereIn('status', ['Active', 'Suspended'])->get()
        ]);
    }

    /**
     * Get all customers
     */
    public function getCustomers()
    {
        return response()->json([
            'success' => true,
            'data' => Customer::all()
        ]);
    }

    /**
     * Delete customer
     */
    public function deleteCustomer($id) 
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }
        $customer->delete();
        return response()->json(['success' => true, 'message' => 'Customer deleted successfully']);
    }

    /**
     * Delete provider
     */
    public function deleteProvider($id) 
    {
        $provider = ServiceProvider::find($id);
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }
        $provider->delete();
        return response()->json(['success' => true, 'message' => 'Provider deleted successfully']);
    }

    /**
     * Toggle customer status
     */
    public function toggleCustomerStatus($id) 
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }
        
        // Ensure accurate state toggling for customers (Active <-> Suspended)
        // Default DB value is 'Active', so we toggle against it case-insensitively
        $customer->status = strtolower($customer->status) === 'active' ? 'Suspended' : 'Active';
        $customer->save();
        
        return response()->json(['success' => true, 'message' => 'Status updated', 'status' => $customer->status]);
    }

    /**
     * Toggle provider status
     */
    public function toggleProviderStatus($id) 
    {
        $provider = ServiceProvider::find($id);
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }
        
        // Ensure accurate state toggling for providers (Active <-> Suspended)
        $provider->status = strtolower($provider->status) === 'active' ? 'Suspended' : 'Active';
        $provider->save();
        
        return response()->json(['success' => true, 'message' => 'Status updated', 'status' => $provider->status]);
    }

    /**
     * Get all bookings
     */
    public function getAllBookings()
    {
        try {
            $bookings = Booking::with(['customer', 'provider', 'service.category'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($b) {
                    return [
                        // Requested columns
                        'id' => $b->bookingID,
                        'customer_name' => $b->customer->fullname ?? 'Unknown',
                        'provider_name' => $b->provider->fullname ?? 'Unknown',
                        'service_type' => $b->service->title ?? 'Unknown',
                        'service_title' => $b->service->title ?? 'Unknown',
                        'status' => ucfirst($b->status),
                        'payment_status' => ucfirst($b->payment_status ?? 'Unpaid'),
                        'location' => $b->customer->service_address ?? $b->customer->location ?? 'Addis Ababa',
                        'address_text' => $b->address_text, // Keep for raw detail if needed
                        'price' => $b->agreed_price ?? 0,
                        'commission' => $b->platform_commission ?? ($b->agreed_price * 0.1),
                        'payout' => $b->provider_payout ?? ($b->agreed_price * 0.9),
                        'notes' => $b->notes ?? null,
                        
                        // Timestamps for Dynamic Timeline
                        'created_at' => $b->created_at ? $b->created_at->format('M d, Y H:i') : 'N/A',
                        'scheduled_at' => ($b->scheduledDate ? \Carbon\Carbon::parse($b->scheduledDate)->format('M d, Y H:i') : 'N/A'),
                        'accepted_at' => $b->accepted_at ? $b->accepted_at->format('M d, Y H:i') : 'Pending',
                        'rejected_at' => $b->rejected_at ? $b->rejected_at->format('M d, Y H:i') : 'N/A',
                        'provider_started_at' => $b->provider_started_at ? $b->provider_started_at->format('M d, Y H:i') : 'Pending',
                        'provider_arrived_at' => $b->provider_arrived_at ? $b->provider_arrived_at->format('M d, Y H:i') : 'Pending',
                        'completed_at' => $b->completed_at ? $b->completed_at->format('M d, Y H:i') : 'Pending',
                        'expires_at' => $b->expires_at ? $b->expires_at->format('M d, Y H:i') : 'N/A',
                        'customer_confirmed_at' => $b->customer_confirmed_at ? $b->customer_confirmed_at->format('M d, Y H:i') : 'Pending',
                        'paid_at' => $b->paid_at ? $b->paid_at->format('M d, Y H:i') : 'Unpaid',
                        'released_at' => $b->released_at ? $b->released_at->format('M d, Y H:i') : 'Pending',
                        'cancelled_at' => $b->cancelled_at ? $b->cancelled_at->format('M d, Y H:i') : 'N/A'
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $bookings
            ]);
        } catch (\Exception $e) {
            Log::error("Get All Bookings Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all services for Admin
     */
    public function getAllServices()
    {
        try {
            // Get all services with their categories
            $services = Service::all();
            
            return response()->json([
                'success' => true,
                'services' => $services
            ]);
        } catch (\Exception $e) {
            Log::error("Get All Services Admin Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services list',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 10. Update Admin Profile
     */
    public function updateProfile(Request $request)
    {
        $admin = auth('admin')->user();
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'fullname' => 'required|string|max:255',
            'email'    => 'required|email|unique:admins,email,' . $admin->adminID . ',adminID',
            'phone'    => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors'  => $validator->errors()
            ], 422);
        }
        if (!$admin) {
            return response()->json(['error' => 'Admin not found'], 404);
        }
        $admin->update([
            'fullname' => $request->fullname,
            'email'    => $request->email,
            'phone'    => $request->phone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data'    => $admin
        ]);
    }

    /**
     * 11. Update Admin Profile Picture
     */
    public function updateProfilePicture(Request $request)
    {
        $admin = auth('admin')->user();
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = 'admin_' . $admin->adminID . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            // Store in public/profiles
            $file->move(public_path('profiles'), $filename);
            if (!$admin) {
                return response()->json(['error' => 'Admin not found'], 404);
            }
            // Save path in DB
            $path = 'profiles/' . $filename;
            $admin->update(['profilePicture' => $path]);

            return response()->json([
                'success' => true,
                'message' => 'Profile picture updated',
                'path' => $path
            ]);
        }

        return response()->json(['success' => false, 'message' => 'No image uploaded'], 400);
    }

    /**
     * 12. Admin Logout
     */
    public function logout(Request $request)
    {
        try {
            $request->user()->currentAccessToken()->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * 13. Get Admin Profile
     */
    public function profile(Request $request)
    {
        $admin = $request->user();
        
        return response()->json([
            'success' => true,
            'data' => $admin
        ]);
    }

    /**
     * 15. Global Search
     */
    public function globalSearch(Request $request)
    {
        $query = $request->query('query');
        if (!$query || strlen($query) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $results = [
            'categories' => Category::where('name', 'LIKE', "%{$query}%")
                ->when(is_numeric($query), function ($q) use ($query) {
                    $q->orWhere('catagoryID', $query);
                })
                ->limit(5)->get(['catagoryID as id', 'name']),
            'services'   => Service::where('title', 'LIKE', "%{$query}%")
                ->when(is_numeric($query), function ($q) use ($query) {
                    $q->orWhere('serviceID', $query);
                })
                ->limit(5)->get(['serviceID as id', 'title as name']),
            'providers'  => ServiceProvider::where('fullname', 'LIKE', "%{$query}%")
                ->when(is_numeric($query), function ($q) use ($query) {
                    $q->orWhere('providerID', $query);
                })
                ->limit(5)->get(['providerID as id', 'fullname as name', 'status']),
            'customers'  => Customer::where('fullname', 'LIKE', "%{$query}%")
                ->when(is_numeric($query), function ($q) use ($query) {
                    $q->orWhere('customerID', $query);
                })
                ->limit(5)->get(['customerID as id', 'fullname as name', 'status']),
        ];

        return response()->json([
            'success' => true,
            'data' => $results
        ]);
    }
}