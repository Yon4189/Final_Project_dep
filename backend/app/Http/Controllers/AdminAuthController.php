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
                    'categories' => Category::count(), // Now correctly imported
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
     * 3. Provider Verification Action (With Email)
     */
    public function verifyProvider(Request $request, $id)
    {
        $request->validate([
            'isVerified' => 'required|boolean',
            'verification_reason' => 'nullable|string|max:255',
        ]);

        // Find by providerID primary key
        $provider = ServiceProvider::find($id);

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }

        // Update DB
        $provider->isVerified = $request->isVerified ? 1 : 0;
        $provider->verification_reason = $request->isVerified ? null : $request->verification_reason;
        $provider->save();

        $statusLabel = $request->isVerified ? 'approved' : 'rejected';
        
        // Prepare HTML Email Body
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

        // Send the Mail
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
     * 4. List Pending Providers
     */
    public function pendingProviders()
    {
        $pending = ServiceProvider::whereNull('isVerified')
            ->with('category') // Changed to match the category() method in your ServiceProvider Model
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $pending]);
    }

    /**
     * 5. Format Helper (Aligns with React Dashboard.jsx keys)
     */
    private function formatProvider($provider)
    {
        return [
            'id' => $provider->providerID,
            'name' => $provider->fullname,
            // Accessing the relationship correctly
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