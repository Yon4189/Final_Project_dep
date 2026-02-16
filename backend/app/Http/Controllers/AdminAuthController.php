<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;

class AdminAuthController extends Controller
{
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

    public function verifyProvider(Request $request, $id)
    {
        $request->validate([
            'isVerified' => 'required|boolean',
            'verification_reason' => 'nullable|string|max:255',
        ]);

        // Find by providerID since that is your primary key
        $provider = ServiceProvider::find($id);

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        // Update verification status
        $provider->isVerified = $request->isVerified ? 1 : 0;
        $provider->verification_reason = $request->isVerified ? null : $request->verification_reason;
        $provider->save();

        $status = $request->isVerified ? 'approved' : 'rejected';
        
        // Fix: Cleaned up the string syntax error here
        if ($request->isVerified) {
            $emailBody = "
                <p>Hello {$provider->fullname},</p>
                <p>Your account has been <strong>approved</strong> by the admin.</p>
                <p><a href='http://localhost:5173/login' style='display:inline-block;padding:10px 20px;background-color:#1d72b8;color:#fff;text-decoration:none;border-radius:5px;'>Go to Login</a></p>";
        } else {
            $reason = $request->verification_reason ?? 'No reason provided';
            $emailBody = "
                <p>Hello {$provider->fullname},</p>
                <p>Your account has been <strong>rejected</strong> by the admin.</p>
                <p><strong>Reason:</strong> {$reason}</p>
                <p><a href='http://localhost:5173/login' style='display:inline-block;padding:10px 20px;background-color:#1d72b8;color:#fff;text-decoration:none;border-radius:5px;'>Go to Login</a></p>";
        }

        try {
            Mail::html($emailBody, function ($message) use ($provider, $status) {
                $message->to($provider->email)
                        ->subject("Your account has been {$status}");
            });
        } catch (\Exception $e) {
            Log::error("Failed to send verification email: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Provider verification updated successfully',
            'data' => [
                'provider_id' => $provider->providerID,
                'fullname' => $provider->fullname,
                'isVerified' => $provider->isVerified,
            ]
        ]);
    }

    public function pendingProviders()
    {
        // Null is pending
        $pending = ServiceProvider::whereNull('isVerified')
            ->with('catagory') // Changed to 'a' to match your model/db
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $pending]);
    }

    public function approvedProviders()
    {
        $approved = ServiceProvider::where('isVerified', 1)
            ->with('catagory') // Changed to 'a'
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $approved]);
    }

    public function rejectedProviders()
    {
        $rejected = ServiceProvider::where('isVerified', 0)
            ->with('catagory') // Changed to 'a'
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($p) => $this->formatProvider($p));

        return response()->json(['success' => true, 'data' => $rejected]);
    }

    private function formatProvider($provider)
    {
        return [
            'id' => $provider->providerID,
            'name' => $provider->fullname,
            // Changed 'category' to 'catagory' to align with your project
            'service_type' => $provider->catagory->name ?? 'Unknown',
            'submission_date' => $provider->created_at ? $provider->created_at->format('l M j Y H:i:s') : 'N/A',
            'credentials' => $provider->idPhotoType,
            'status' => $provider->isVerified,
            'verification_reason' => $provider->verification_reason,
            'email' => $provider->email,
            'phone' => $provider->phone,
        ];
    }
}