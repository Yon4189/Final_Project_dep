<?php


namespace App\Http\Controllers;

if (function_exists('opcache_reset')) {
    opcache_reset();
}
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

        // GENERATE TOKENjhoihoi - INSIDE the function
        $token = $admin->createToken('admin-token')->plainTextToken;

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
     * 2. Platform Statistics – FIXED pending count to match pendingProviders()
     */
    public function getStats()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'providers'  => ServiceProvider::count(),
                    'customers'  => Customer::count(),
                    'pending'    => ServiceProvider::whereNull('status')->count(),
                    'categories' => Category::count(),
                    'services'   => Service::count(),
                    'revenue'    => Transaction::sum('platformFee') 
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
     * 3. Get All Providers (for admin overview and dependency checks)
     */
    public function getAllProviders()
    {
        try {
            $providers = ServiceProvider::with('category')->get();
            $formatted = $providers->map(function ($provider) {
                return [
                    'providerID'   => $provider->providerID,
                    'fullname'     => $provider->fullname,
                    'email'        => $provider->email,
                    'phone'        => $provider->phone,
                    'catagoryID'   => $provider->catagoryID,
                    'category'     => $provider->category->name ?? null,
                    'status'   => $provider->status,
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
    public function verifyProvider(Request $request, $id)
    {
    // 1. Validate incoming request
    $request->validate([
        'status' => 'required|string', // "approved" or "Suspended"
        'verification_reason' => 'nullable|string|max:255',
    ]);

    // 2. Find the provider
    $provider = ServiceProvider::find($id);
    if (!$provider) {
        return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
    }

    // 3. Update status and reason
    $provider->status = $request->status;
    $provider->verification_reason = $request->status === 'approved' ? null : $request->verification_reason;
    $provider->save();

    $statusLabel = strtolower($request->status); // "approved" or "suspended"

    // 4. Prepare email
    if ($request->status === 'approved') {
        $emailBody = "
            <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                <h2 style='color: #2b64f3;'>Congratulations!</h2>
                <p>Hello <strong>{$provider->fullname}</strong>,</p>
                <p>Your Service Provider account has been <strong>approved</strong> by our administration team.</p>
                <p>You can now log in to the mobile app and start receiving service requests.</p>
            </div>";
    } elseif ($statusLabel === 'suspended') {
        $reason = $request->verification_reason ?? 'Administrative decision.';
        $emailBody = "
            <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                <h2 style='color: #8b5cf6;'>Account Suspended</h2>
                <p>Hello <strong>{$provider->fullname}</strong>,</p>
                <p>We wish to inform you that your Service Provider account has been <strong>suspended</strong> by our administration team.</p>
                <p><strong>Reason:</strong> {$reason}</p>
                <p>During suspension, you will not be able to receive new service requests or browse the platform.</p>
                <p>If you have questions, please contact our support team.</p>
            </div>";
    } else {
        $reason = $request->verification_reason ?? 'The provided documents were not clear or valid.';
        $emailBody = "
            <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                <h2 style='color: #ef4444;'>Account Status Update</h2>
                <p>Hello <strong>{$provider->fullname}</strong>,</p>
                <p>We regret to inform you that your application has been <strong>rejected</strong> at this time.</p>
                <p><strong>Reason:</strong> {$reason}</p>
                <p>Please log in to your profile to re-upload clear documents.</p>
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
     * 5. List Pending Providers (isVerified = null)
     */
    public function pendingProviders()
    {
        $pending = ServiceProvider::where('status', 'pending')
            ->with('category', 'services')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $pending]);
    }

    /**
     * 6. List Approved Providers (isVerified = 1)
     */
    public function approvedProviders()
    {
        $approved = ServiceProvider::where('status', 'approved')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $approved]);
    }

    /**
     * 7. List Rejected Providers (isVerified = 0)
     */
    public function rejectedProviders()
    {
        $rejected = ServiceProvider::where('status', 'rejected')
            ->whereNotNull('verification_reason')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $rejected]);
    }

    public function suspendedProviders()
    {
        $suspended = ServiceProvider::where('status', 'suspended')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $suspended]);
    }

    /**
     * 8. Format Helper – used by pending/approved/rejected methods
     */
    private function formatProvider($provider)
    {
        $service = $provider->services->first();
        return [
            'id'                  => $provider->providerID,
            'name'                => $provider->fullname,
            'profilePicture'      => $provider->profilePicture,
            'service_type'        => $provider->category->name ?? 'General',
            'service_title'       => $service->title ?? $provider->category->name ?? 'General Service',
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


    // ===============fucntions for User Mangment tab for admin============
    public function getProviders(){
        return response()->json([
            'success' => true,
            'data' => ServiceProvider::all()
        ]);
    }

    public function getCustomers(){
        return response()->json([
            'success' => true,
            'data' => Customer::all()
        ]);
    }

    // Delete customer
    public function deleteCustomer($id) {
    $customer = Customer::find($id);
    if (!$customer) {
        return response()->json(['message' => 'Customer not found'], 404);
    }
    $customer->delete();
    return response()->json(['message' => 'Customer deleted successfully']);
    }

// Delete provider
    public function deleteProvider($id) {
    $provider = ServiceProvider::find($id);
    if (!$provider) {
        return response()->json(['message' => 'Provider not found'], 404);
    }
    $provider->delete();
    return response()->json(['message' => 'Provider deleted successfully']);
    }

// Toggle customer status
    public function toggleCustomerStatus($id) {
    $customer = Customer::find($id);
    if (!$customer) {
        return response()->json(['message' => 'Customer not found'], 404);
    }
    $customer->status = $customer->status === 'approved' ? 'suspended' : 'approved';
    $customer->save();
    return response()->json(['message' => 'Status updated', 'status' => $customer->status]);
    }

// Toggle provider status
    public function toggleProviderStatus($id) {
    $provider = ServiceProvider::find($id);
    if (!$provider) {
        return response()->json(['message' => 'Provider not found'], 404);
    }
    $provider->status = $provider->status === 'approved' ? 'suspended' : 'approved';
    $provider->save();
    return response()->json(['message' => 'Status updated', 'status' => $provider->status]);
    }

    public function getAllBookings()
    {
        try {
            $bookings = Booking::with(['customer', 'provider', 'service'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function($b) {
                    return [
                        'id' => $b->bookingID,
                        'customer' => $b->customer->fullname ?? 'Unknown',
                        'provider' => $b->provider->fullname ?? 'Unknown',
                        'service' => $b->service->title ?? 'Unknown',
                        'status' => ucfirst($b->status),
                        'date' => $b->scheduledDate ? $b->scheduledDate->format('M d, Y') : 'N/A',
                        'time' => $b->scheduledDate ? $b->scheduledDate->format('h:i A') : 'N/A',
                        'location' => $b->service_address ?? 'Location pinned',
                        'amount' => ($b->agreed_price ?? 0) . ' ETB'
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $bookings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

//==============================================================

    /**
     * 9. Update Admin Profile
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
     * 10. Update Admin Profile Picture
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

}