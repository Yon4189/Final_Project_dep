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
class AdminAuthController extends Controller
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

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $admin
        ]);
    }

    /**
     * 2. Platform Statistics
     * This method feeds the 6 cards on your React Dashboard
     */
    public function getStats()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'providers'  => ServiceProvider::count(),
                    'customers'  => Customer::count(),
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
            // Load all providers, optionally with their category relationship
            $providers = ServiceProvider::with('category')->get();

            // Format each provider (you can reuse formatProvider or adapt)
            $formatted = $providers->map(function ($provider) {
                return [
                    'providerID'   => $provider->providerID,
                    'fullname'     => $provider->fullname,
                    'email'        => $provider->email,
                    'phone'        => $provider->phone,
                    'catagoryID'   => $provider->catagoryID, // important for frontend checks
                    'category'     => $provider->category->name ?? null,
                    'isVerified'   => $provider->isVerified,
                    'created_at'   => $provider->created_at ? $provider->created_at->format('Y-m-d H:i:s') : null,
                    // Add any other fields you need
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
        $request->validate([
            'isVerified' => 'required|boolean',
            'verification_reason' => 'nullable|string|max:255',
        ]);

        $provider = ServiceProvider::find($id);

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }

        $provider->isVerified = $request->isVerified ? 1 : 0;
        $provider->verification_reason = $request->isVerified ? null : $request->verification_reason;
        $provider->save();

        $statusLabel = $request->isVerified ? 'approved' : 'rejected';

        if ($request->isVerified) {
            $emailBody = "
                <div style='font-family: sans-serif; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #2b64f3;'>Congratulations!</h2>
                    <p>Hello <strong>{$provider->fullname}</strong>,</p>
                    <p>Your Service Provider account has been <strong>approved</strong> by our administration team.</p>
                    <p>You can now log in to the mobile app and start receiving service requests.</p>
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

        try {
            Mail::html($emailBody, function ($message) use ($provider, $statusLabel) {
                $message->to($provider->email)
                        ->subject("Service Finder Account: " . ucfirst($statusLabel));
            });
        } catch (\Exception $e) {
            Log::error("Mail Error: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Status updated and notification sent.',
            'data' => [
                'providerID' => $provider->providerID,
                'status' => $provider->isVerified
            ]
        ]);
    }

    /**
     * 5. List Pending Providers
     */
    public function pendingProviders()
    {
        $pending = ServiceProvider::whereNull('isVerified')
            ->with('category')
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
        $approved = ServiceProvider::where('isVerified', 1)
            ->with('category')
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
        $rejected = ServiceProvider::where('isVerified', 0)
            ->whereNotNull('verification_reason')
            ->with('category')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $rejected]);
    }

    /**
     * 8. Format Helper (Aligns with React Dashboard.jsx keys)
     */
    private function formatProvider($provider)
    {
        return [
            'id' => $provider->providerID,
            'name' => $provider->fullname,
            'service_type' => $provider->category->name ?? 'General',
            'submission_date' => $provider->created_at ? $provider->created_at->format('M d, Y') : 'N/A',
            'credentials' => $provider->idPhoto ? 'DOC_UPLOADED' : 'NO_DOC',
            'idPhoto' => $provider->idPhoto,
            'credentialPhoto' => $provider->credentialPhoto,
            'status' => $provider->isVerified,
            'email' => $provider->email,
        ];
    }
}