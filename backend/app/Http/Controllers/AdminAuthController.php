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
use App\Models\Dispute;
use App\Models\Payment;
use App\Models\ServiceCity;
use App\Models\SystemSetting;
use App\Models\Review;
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
            'email' => 'required|email:rfc',
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

        // Check if admin exists and verify password
        // Use generic error message for security (don't reveal if email exists or password is wrong)
        if (!$admin || !Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password. Please try again'
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
                    'providers'          => ServiceProvider::count(),
                    'customers'          => Customer::count(),
                    'pending'            => ServiceProvider::where('status', 'pending')->count(),
                    'active'             => ServiceProvider::whereIn('status', ['Active', 'approved'])->count(),
                    'suspended'          => ServiceProvider::whereIn('status', ['Suspended', 'suspended'])->count(),
                    'rejected'           => ServiceProvider::whereIn('status', ['Rejected', 'rejected'])->count(),
                    'categories'         => Category::count(),
                    'services'           => Service::count(),
                    'revenue'            => \App\Models\Payment::whereIn('status', ['held', 'releasable', 'released'])->sum('platform_commission') ?? 0,
                    // Booking counts (used by the system report download)
                    'total_bookings'     => Booking::count(),
                    'completed_bookings' => Booking::where('status', 'completed')->count(),
                    'active_disputes'    => \App\Models\Dispute::whereIn('status', ['pending', 'under_review'])->count(),
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
     * Generate a full system data backup (JSON export)
     * Exports all key tables, stripping sensitive fields like passwords.
     */
    public function generateBackup(Request $request)
    {
        $admin = auth('admin')->user();
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $sections = $request->input('sections', ['all']);
        $includeAll = in_array('all', $sections);

        try {
            $backup = [
                'meta' => [
                    'version'       => '1.0',
                    'generated_at'  => now()->toIso8601String(),
                    'generated_by'  => $admin->fullname ?? $admin->email,
                    'admin_email'   => $admin->email,
                    'platform'      => config('app.name', 'HB Service Finder'),
                    'timezone'      => config('app.timezone', 'UTC'),
                ],
                'summary' => [],
                'data'    => [],
            ];

            // ── Customers ────────────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('customers', $sections)) {
                    $customers = Customer::select([
                        'customerID','fullname','email','phone','status',
                        'profilePicture','service_address','created_at','updated_at'
                    ])->get();
                    $backup['data']['customers'] = $customers;
                    $backup['summary']['customers'] = $customers->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Customers failed - " . $e->getMessage());
                $backup['summary']['customers'] = 0;
            }

            // ── Service Providers ─────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('providers', $sections)) {
                    $providers = ServiceProvider::select([
                        'providerID','fullname','email','phone','status',
                        'catagoryID','service_city',
                        'bio','profilePicture','approved_at','created_at','updated_at'
                    ])->with('category:catagoryID,name')->get();
                    $backup['data']['providers'] = $providers;
                    $backup['summary']['providers'] = $providers->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Providers failed - " . $e->getMessage());
                $backup['summary']['providers'] = 0;
            }

            // ── Bookings ──────────────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('bookings', $sections)) {
                    $bookings = Booking::select([
                        'bookingID','customerID','providerID','serviceID',
                        'status','payment_status','agreed_price',
                        'platform_commission','provider_payout',
                        'address_text','notes','scheduledDate',
                        'created_at','updated_at','completed_at'
                    ])->get();
                    $backup['data']['bookings'] = $bookings;
                    $backup['summary']['bookings'] = $bookings->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Bookings failed - " . $e->getMessage());
                $backup['summary']['bookings'] = 0;
            }

            // ── Payments ──────────────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('payments', $sections)) {
                    $payments = Payment::select([
                        'paymentID','bookingID','customerID','providerID',
                        'tx_ref','amount','platform_commission','provider_amount',
                        'status','payment_type','currency','paid_at','created_at'
                    ])->get();
                    $backup['data']['payments'] = $payments;
                    $backup['summary']['payments'] = $payments->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Payments failed - " . $e->getMessage());
                $backup['summary']['payments'] = 0;
            }

            // ── Disputes ──────────────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('disputes', $sections)) {
                    $disputes = Dispute::select([
                        'disputeID','bookingID','raised_by_id','raised_by_type',
                        'against_id','against_type','title','description',
                        'status','priority','category','resolution_type',
                        'refund_amount','admin_notes','resolved_at','created_at'
                    ])->get();
                    $backup['data']['disputes'] = $disputes;
                    $backup['summary']['disputes'] = $disputes->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Disputes failed - " . $e->getMessage());
                $backup['summary']['disputes'] = 0;
            }

            // ── Categories ────────────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('categories', $sections)) {
                    $categories = Category::all();
                    $backup['data']['categories'] = $categories;
                    $backup['summary']['categories'] = $categories->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Categories failed - " . $e->getMessage());
                $backup['summary']['categories'] = 0;
            }

            // ── Services ──────────────────────────────────────────────────────────
            try {
                if ($includeAll || in_array('services', $sections)) {
                    $services = Service::all();
                    $backup['data']['services'] = $services;
                    $backup['summary']['services'] = $services->count();
                }
            } catch (\Exception $e) {
                Log::warning("Backup: Services failed - " . $e->getMessage());
                $backup['summary']['services'] = 0;
            }

            // ── Cities ────────────────────────────────────────────────────────────
            if ($includeAll || in_array('cities', $sections)) {
                $cities = ServiceCity::all();
                $backup['data']['cities'] = $cities;
                $backup['summary']['cities'] = $cities->count();
            }

            // ── Reviews ───────────────────────────────────────────────────────────
            if ($includeAll || in_array('reviews', $sections)) {
                $reviews = Review::all();
                $backup['data']['reviews'] = $reviews;
                $backup['summary']['reviews'] = $reviews->count();
            }

            // ── System Settings ───────────────────────────────────────────────────
            if ($includeAll || in_array('settings', $sections)) {
                $settings = SystemSetting::all();
                $backup['data']['settings'] = $settings;
                $backup['summary']['settings'] = $settings->count();
            }

            $backup['summary']['total_records'] = array_sum($backup['summary']);

            Log::info('Admin generated system backup', [
                'admin_id'      => $admin->adminID ?? null,
                'admin_email'   => $admin->email,
                'sections'      => $sections,
                'total_records' => $backup['summary']['total_records'],
            ]);

            return response()->json([
                'success' => true,
                'data'    => $backup,
            ]);

        } catch (\Exception $e) {
            Log::error('Backup generation failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate backup: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * 3. Get All Providers (for admin overview)
     */
    public function getAllProviders()
    {
        try {
            $providers = ServiceProvider::whereIn('status', ['approved', 'Active', 'suspended', 'Suspended'])
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
            $provider->status = 'approved';
            $provider->approved_at = now();
            $provider->rejected_at = null;
        } elseif ($status === 'rejected') {
            $provider->status = 'rejected'; // Use lowercase consistently
            $provider->rejected_at = now();
            $provider->approved_at = null;
            $provider->verification_reason = $request->verification_reason;
        } elseif ($status === 'suspended') {
            $provider->status = 'suspended'; // Use lowercase consistently
            $provider->verification_reason = $request->verification_reason;
        }
        $provider->save();

        // Send In-App Notification using the injected service
        $title = "";
        $message = "";
        $type = "";

        if ($status === 'approved') {
            $type = \App\Services\NotificationService::TYPE_PROVIDER_APPROVED;
            $title = "Account Approved!";
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
        $approved = ServiceProvider::whereIn('status', ['approved', 'Active']) // Support both old and new
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
        $rejected = ServiceProvider::whereIn('status', ['rejected', 'Rejected']) // Support both old and new
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
        $suspended = ServiceProvider::whereIn('status', ['Suspended', 'suspended']) // Support both old and new
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
            'idPhotoBack'         => $provider->idPhotoBack,
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
            'data' => ServiceProvider::whereIn('status', ['Active', 'approved', 'Suspended', 'suspended'])->get() // Support both old and new
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
        $userName = $customer->fullname;
        $userEmail = $customer->email;
        $customer->delete();

        // Send Notification Email
        try {
            Mail::html("
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #ef4444;'>Account Deleted</h2>
                    <p>Hello <strong>{$userName}</strong>,</p>
                    <p>We wish to inform you that your customer account on <strong>Ethio HandyMan</strong> has been <strong>permanently deleted</strong> by the administration.</p>
                    <p>This action is final. If you have any questions, please contact our support team.</p>
                </div>", function ($message) use ($userEmail) {
                $message->to($userEmail)
                        ->subject("Ethio HandyMan: Account Deleted");
            });
        } catch (\Exception $e) {
            Log::error("Mail Error (Delete Customer): " . $e->getMessage());
        }

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
        $userName = $provider->fullname;
        $userEmail = $provider->email;
        $provider->delete();

        // Send Notification Email
        try {
            Mail::html("
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #ef4444;'>Account Deleted</h2>
                    <p>Hello <strong>{$userName}</strong>,</p>
                    <p>We wish to inform you that your Service Provider account on <strong>Ethio HandyMan</strong> has been <strong>permanently deleted</strong> by the administration.</p>
                    <p>This action is final. If you have any questions, please contact our support team.</p>
                </div>", function ($message) use ($userEmail) {
                $message->to($userEmail)
                        ->subject("Ethio HandyMan: Account Deleted");
            });
        } catch (\Exception $e) {
            Log::error("Mail Error (Delete Provider): " . $e->getMessage());
        }

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
        
        // Toggle between approved and suspended (use lowercase consistently)
        $currentStatus = strtolower($customer->status);
        
        $isSuspending = in_array($currentStatus, ['active', 'approved']);
        
        if ($isSuspending) {
            $customer->status = 'suspended'; // Use lowercase
            $title = "Account Suspended";
            $color = "#8b5cf6";
            $body = "We wish to inform you that your account has been <strong>suspended</strong> by our administration team. During suspension, you will not be able to book new services.";
        } else {
            $customer->status = 'approved'; // Use lowercase
            $title = "Account Reactivated";
            $color = "#16a34a";
            $body = "Good news! Your account has been <strong>reactivated</strong> by our administration team. You can now continue booking services as usual.";
        }
        
        $customer->save();

        // Send Notification Email
        try {
            Mail::html("
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: {$color};'>{$title}</h2>
                    <p>Hello <strong>{$customer->fullname}</strong>,</p>
                    <p>{$body}</p>
                    <p>If you have any questions, please contact our support team.</p>
                </div>", function ($message) use ($customer, $title) {
                $message->to($customer->email)
                        ->subject("Ethio HandyMan: {$title}");
            });
        } catch (\Exception $e) {
            Log::error("Mail Error (Toggle Customer): " . $e->getMessage());
        }
        
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
        
        // Toggle between approved and suspended (use lowercase consistently)
        $currentStatus = strtolower($provider->status);
        
        $isSuspending = in_array($currentStatus, ['active', 'approved']);
        
        if ($isSuspending) {
            $provider->status = 'suspended'; // Use lowercase
            $title = "Account Suspended";
            $color = "#8b5cf6";
            $body = "We wish to inform you that your Service Provider account has been <strong>suspended</strong> by our administration team. During suspension, you will not be able to receive new service requests.";
        } else {
            $provider->status = 'approved'; // Use lowercase
            $title = "Account Reactivated";
            $color = "#16a34a";
            $body = "Good news! Your Service Provider account has been <strong>reactivated</strong> by our administration team. You can now continue offering your services as usual.";
        }
        
        $provider->save();

        // Send Notification Email
        try {
            Mail::html("
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: {$color};'>{$title}</h2>
                    <p>Hello <strong>{$provider->fullname}</strong>,</p>
                    <p>{$body}</p>
                    <p>If you have any questions, please contact our support team.</p>
                </div>", function ($message) use ($provider, $title) {
                $message->to($provider->email)
                        ->subject("Ethio HandyMan: {$title}");
            });
        } catch (\Exception $e) {
            Log::error("Mail Error (Toggle Provider): " . $e->getMessage());
        }
        
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
     * Admin cancel a booking (for stuck/problematic bookings)
     */
    public function cancelBooking(Request $request, $bookingId)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $booking = Booking::find($bookingId);

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }

        if (in_array($booking->status, ['completed', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => "Cannot cancel a booking with status '{$booking->status}'."
            ], 422);
        }

        $oldStatus = $booking->status;
        $booking->status             = 'cancelled';
        $booking->cancelled_at       = now();
        $booking->cancellation_reason = 'Admin cancelled: ' . $request->reason;
        $booking->save();

        // Notify both parties
        $notificationService = app(\App\Services\NotificationService::class);

        $notificationService->toCustomer(
            $booking->customerID,
            'booking_cancelled',
            'Booking Cancelled by Admin',
            "Your booking #{$bookingId} has been cancelled by the platform. Reason: {$request->reason}",
            ['booking_id' => $bookingId, 'reason' => $request->reason],
            $bookingId
        );

        $notificationService->toProvider(
            $booking->providerID,
            'booking_cancelled',
            'Booking Cancelled by Admin',
            "Booking #{$bookingId} has been cancelled by the platform. Reason: {$request->reason}",
            ['booking_id' => $bookingId, 'reason' => $request->reason],
            $bookingId
        );

        Log::info('Admin cancelled booking', [
            'admin_id'   => auth('admin')->id(),
            'booking_id' => $bookingId,
            'old_status' => $oldStatus,
            'reason'     => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Booking #{$bookingId} cancelled successfully.",
        ]);
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
            'email'    => 'required|email:rfc|unique:admins,email,' . $admin->adminID . ',adminID',
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
            'image' => 'required|file|max:2048',
        ]);

        if ($request->hasFile('image')) {
            try {
                $fileValidator = app(\App\Services\FileUploadValidator::class);
                $fileValidator->validateImage($request->file('image'), 2048);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }

            $file     = $request->file('image');
            $fileValidator = app(\App\Services\FileUploadValidator::class);
            $filename = $fileValidator->safeFilename($file, 'admin_' . $admin->adminID);

            $file->move(public_path('profiles'), $filename);
            if (!$admin) {
                return response()->json(['error' => 'Admin not found'], 404);
            }
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
     * Force-logout a specific user (revoke all their tokens)
     * Admin only — used when a phone is stolen or account is compromised
     */
    public function forceLogoutUser(Request $request)
    {
        $request->validate([
            'user_type' => 'required|in:customer,provider',
            'user_id'   => 'required|integer',
        ]);

        $userType = $request->user_type;
        $userId   = $request->user_id;

        if ($userType === 'customer') {
            $user = \App\Models\Customer::find($userId);
        } else {
            $user = \App\Models\ServiceProvider::find($userId);
        }

        if (!$user) {
            return response()->json(['success' => false, 'message' => ucfirst($userType) . ' not found'], 404);
        }

        $tokenCount = $user->tokens()->count();
        $user->tokens()->delete();

        Log::info('Admin force-logged out user', [
            'admin_id'   => auth('admin')->id(),
            'user_type'  => $userType,
            'user_id'    => $userId,
            'tokens_revoked' => $tokenCount,
        ]);

        return response()->json([
            'success' => true,
            'message' => "All {$tokenCount} token(s) revoked for {$userType} #{$userId}. They are now logged out from all devices.",
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

    public function acceptedBookings()
    {
        $booking = Booking::where('status', 'accepted')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $booking]);
    }

    public function pendingBookings()
    {
        $booking = Booking::where('status', 'pending')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $booking]);
    }
    public function compeltedBookings()
    {
        $booking = Booking::where('status', 'compeleted')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $booking]);
    }

    public function rejectedBookings()
    {
        $booking = Booking::where('status', 'rejected')
            ->with(['category', 'services'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $booking]);
    }

    /**
     * Update platform settings
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateSettings(Request $request)
    {
        try {
            $admin = auth('admin')->user();
            if (!$admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // Validate incoming settings
            $validator = Validator::make($request->all(), [
                'settings' => 'nullable|array',
                'settings.commissionRate' => 'nullable|integer|min:0|max:100',
                'settings.maxServiceRadius' => 'nullable|integer|min:1|max:500',
                'settings.minPayoutAmount' => 'nullable|numeric|min:0',
                'settings.maintenanceMode' => 'nullable|boolean',
                'branding' => 'nullable|array',
                'branding.systemName' => 'nullable|string|max:255',
                'branding.logoUrl' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation errors',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updatedSettings = [];

            // Update platform settings if provided
            if ($request->has('settings')) {
                $settings = $request->input('settings');

                if (isset($settings['commissionRate'])) {
                    \App\Models\SystemSetting::set(
                        'commission_percentage',
                        $settings['commissionRate'],
                        'integer',
                        'Platform commission percentage (0-100)'
                    );
                    $updatedSettings['commission_percentage'] = $settings['commissionRate'];
                }

                if (isset($settings['maxServiceRadius'])) {
                    \App\Models\SystemSetting::set(
                        'max_service_radius',
                        $settings['maxServiceRadius'],
                        'integer',
                        'Maximum service radius in kilometers'
                    );
                    $updatedSettings['max_service_radius'] = $settings['maxServiceRadius'];
                }

                if (isset($settings['minPayoutAmount'])) {
                    \App\Models\SystemSetting::set(
                        'min_payout_amount',
                        $settings['minPayoutAmount'],
                        'decimal',
                        'Minimum payout amount in ETB'
                    );
                    $updatedSettings['min_payout_amount'] = $settings['minPayoutAmount'];
                }

                if (isset($settings['maintenanceMode'])) {
                    \App\Models\SystemSetting::set(
                        'maintenance_mode',
                        $settings['maintenanceMode'],
                        'boolean',
                        'Platform maintenance mode status'
                    );
                    $updatedSettings['maintenance_mode'] = $settings['maintenanceMode'];
                }
            }

            // Update branding settings if provided
            if ($request->has('branding')) {
                $branding = $request->input('branding');

                if (isset($branding['systemName'])) {
                    \App\Models\SystemSetting::set(
                        'system_name',
                        $branding['systemName'],
                        'string',
                        'Platform system name'
                    );
                    $updatedSettings['system_name'] = $branding['systemName'];
                }

                if (isset($branding['logoUrl'])) {
                    $logoUrl = $branding['logoUrl'];
                    
                    // If it's a new base64 image upload, save it as a file
                    if (preg_match('/^data:image\/(\w+);base64,/', $logoUrl, $type)) {
                        $base64Image = substr($logoUrl, strpos($logoUrl, ',') + 1);
                        $extension = strtolower($type[1]); // jpg, png, svg+xml etc.
                        if ($extension === 'svg+xml') $extension = 'svg';
                        
                        $fileName = 'branding/logo_' . time() . '_' . uniqid() . '.' . $extension;
                        
                        // Save to storage/app/public/branding/
                        \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, base64_decode($base64Image));
                        
                        // Set the new URL
                        $logoUrl = asset('storage/' . $fileName);
                    }

                    \App\Models\SystemSetting::set(
                        'logo_url',
                        $logoUrl,
                        'string',
                        'Platform logo URL'
                    );
                    $updatedSettings['logo_url'] = $logoUrl;
                }
            }

            Log::info('Admin settings updated', [
                'admin_id' => $admin->adminID,
                'updated_settings' => $updatedSettings
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => $updatedSettings
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update admin settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get platform settings
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSettings()
    {
        try {
            $settings = [
                'commissionRate'      => \App\Models\SystemSetting::get('commission_percentage', 10),
                'maxServiceRadius'    => \App\Models\SystemSetting::get('max_service_radius', 15),
                'minPayoutAmount'     => \App\Models\SystemSetting::get('min_payout_amount', 500),
                'maintenanceMode'     => \App\Models\SystemSetting::get('maintenance_mode', false),
                'maxDailyWithdrawal'  => \App\Models\SystemSetting::get('max_daily_withdrawal', 100000),
                'maxWithdrawalAmount' => \App\Models\SystemSetting::get('max_withdrawal_amount', 50000),
            ];

            $branding = [
                'systemName' => \App\Models\SystemSetting::get('system_name', 'HB Service Finder Admin'),
                'logoUrl' => \App\Models\SystemSetting::get('logo_url', null),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'settings' => $settings,
                    'branding' => $branding
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get admin settings', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get settings'
            ], 500);
        }
    }

    /**
     * Upload system logo (branding)
     */
    public function uploadLogo(Request $request)
    {
        $admin = auth('admin')->user();
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $request->validate(['logo' => 'required|file|max:2048']);

        try {
            $fileValidator = app(\App\Services\FileUploadValidator::class);
            $fileValidator->validateImage($request->file('logo'), 2048);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $file     = $request->file('logo');
        $fileValidator = app(\App\Services\FileUploadValidator::class);
        $filename = $fileValidator->safeFilename($file, 'logo');
        $file->move(public_path('branding'), $filename);

        $path = url('branding/' . $filename);

        \App\Models\SystemSetting::set('logo_url', $path, 'string', 'System logo URL');

        return response()->json([
            'success' => true,
            'message' => 'Logo uploaded successfully',
            'data'    => ['logo_url' => $path]
        ]);
    }

    /**
     * Generate a comprehensive system report for download
     */
    public function generateSystemReport()
    {
        try {
            $admin = auth('admin')->user();

            $settings = [
                'commission_rate'    => \App\Models\SystemSetting::get('commission_percentage', 10),
                'max_service_radius' => \App\Models\SystemSetting::get('max_service_radius', 15),
                'min_payout_amount'  => \App\Models\SystemSetting::get('min_payout_amount', 500),
                'maintenance_mode'   => \App\Models\SystemSetting::get('maintenance_mode', false),
                'system_name'        => \App\Models\SystemSetting::get('system_name', 'Ethio HandyMan'),
            ];

            $totalProviders     = \App\Models\ServiceProvider::count();
            $approvedProviders  = \App\Models\ServiceProvider::whereIn('status', ['approved', 'Active'])->count();
            $pendingProviders   = \App\Models\ServiceProvider::where('status', 'pending')->count();
            $suspendedProviders = \App\Models\ServiceProvider::whereIn('status', ['suspended', 'Suspended'])->count();
            $rejectedProviders  = \App\Models\ServiceProvider::whereIn('status', ['rejected', 'Rejected'])->count();
            $totalCustomers     = \App\Models\Customer::count();

            $totalBookings     = \App\Models\Booking::count();
            $completedBookings = \App\Models\Booking::where('status', 'completed')->count();
            $acceptedBookings  = \App\Models\Booking::where('status', 'accepted')->count();
            $pendingBookings   = \App\Models\Booking::where('status', 'pending')->count();
            $cancelledBookings = \App\Models\Booking::where('status', 'cancelled')->count();

            $totalRevenue       = \App\Models\Payment::whereIn('status', ['held', 'releasable', 'released', 'paid'])->sum('amount') ?? 0;
            $platformCommission = \App\Models\Payment::whereIn('status', ['held', 'releasable', 'released', 'paid'])->sum('platform_commission') ?? 0;
            $providerPayouts    = \App\Models\Payment::where('status', 'released')->sum('provider_amount') ?? 0;
            $pendingPayments    = \App\Models\Payment::whereIn('status', ['pending', 'held'])->sum('amount') ?? 0;
            $totalPaymentsCount = \App\Models\Payment::count();
            $successPayments    = \App\Models\Payment::whereIn('status', ['held', 'releasable', 'released', 'paid'])->count();
            $failedPayments     = \App\Models\Payment::where('status', 'failed')->count();

            $totalWithdrawals    = \App\Models\Withdrawal::count();
            $pendingWithdrawals  = \App\Models\Withdrawal::where('status', 'pending')->count();
            $approvedWithdrawals = \App\Models\Withdrawal::where('status', 'approved')->count();
            $withdrawalAmount    = \App\Models\Withdrawal::where('status', 'approved')->sum('amount') ?? 0;

            $totalCategories = \App\Models\Category::count();
            $totalServices   = \App\Models\Service::count();

            $categoryBreakdown = \App\Models\Category::withCount('providers')
                ->orderByDesc('providers_count')
                ->get()
                ->map(fn($c) => ['name' => $c->name, 'providers' => $c->providers_count]);

            $topProviders = \App\Models\ServiceProvider::whereIn('status', ['approved', 'Active'])
                ->orderByDesc('rating')
                ->orderByDesc('completed_jobs')
                ->limit(5)
                ->get()
                ->map(fn($p) => [
                    'name'           => $p->fullname,
                    'email'          => $p->email,
                    'rating'         => round($p->rating, 1),
                    'completed_jobs' => $p->completed_jobs ?? 0,
                    'city'           => $p->service_city ?? 'N/A',
                ]);

            $monthlyRevenue = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = now()->subMonths($i);
                $rev = \App\Models\Payment::whereIn('status', ['held', 'releasable', 'released', 'paid'])
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->sum('amount') ?? 0;
                $monthlyRevenue[] = ['month' => $month->format('M Y'), 'revenue' => round($rev, 2)];
            }

            $recentBookings = \App\Models\Booking::with(['customer', 'provider', 'service'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(fn($b) => [
                    'id'             => $b->bookingID,
                    'customer'       => $b->customer->fullname ?? 'Unknown',
                    'provider'       => $b->provider->fullname ?? 'Unknown',
                    'service'        => $b->service->title ?? 'N/A',
                    'status'         => $b->status,
                    'payment_status' => $b->payment_status ?? 'unpaid',
                    'amount'         => $b->agreed_price ?? 0,
                    'date'           => $b->created_at?->format('M d, Y H:i'),
                ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'generated_at'       => now()->format('Y-m-d H:i:s'),
                    'generated_by'       => $admin->fullname ?? 'System Admin',
                    'admin_email'        => $admin->email ?? '',
                    'settings'           => $settings,
                    'users'              => [
                        'total_providers'     => $totalProviders,
                        'approved_providers'  => $approvedProviders,
                        'pending_providers'   => $pendingProviders,
                        'suspended_providers' => $suspendedProviders,
                        'rejected_providers'  => $rejectedProviders,
                        'total_customers'     => $totalCustomers,
                    ],
                    'bookings'           => [
                        'total'     => $totalBookings,
                        'completed' => $completedBookings,
                        'accepted'  => $acceptedBookings,
                        'pending'   => $pendingBookings,
                        'cancelled' => $cancelledBookings,
                    ],
                    'financials'         => [
                        'total_revenue'       => round($totalRevenue, 2),
                        'platform_commission' => round($platformCommission, 2),
                        'provider_payouts'    => round($providerPayouts, 2),
                        'pending_payments'    => round($pendingPayments, 2),
                        'total_transactions'  => $totalPaymentsCount,
                        'successful_payments' => $successPayments,
                        'failed_payments'     => $failedPayments,
                    ],
                    'withdrawals'        => [
                        'total'    => $totalWithdrawals,
                        'pending'  => $pendingWithdrawals,
                        'approved' => $approvedWithdrawals,
                        'amount'   => round($withdrawalAmount, 2),
                    ],
                    'catalog'            => ['categories' => $totalCategories, 'services' => $totalServices],
                    'category_breakdown' => $categoryBreakdown,
                    'top_providers'      => $topProviders,
                    'monthly_revenue'    => $monthlyRevenue,
                    'recent_bookings'    => $recentBookings,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('System report generation failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to generate report: ' . $e->getMessage()], 500);
        }
    }
}