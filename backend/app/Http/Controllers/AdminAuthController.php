<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\HtmlString;
//use App\Http\Controllers\Validator;

use Illuminate\Support\Facades\Validator;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        // validate input and return JSON if ther are errors
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

        // find admins by their email
        $admin = Admin::where('email', $request->email)->first();


        // password check
        if (!$admin || !Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // return success json
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

        $provider = ServiceProvider::find($id);

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        // Update verification status
        $provider->isVerified = $request->isVerified ? 1 : 0;
        
        if ($request->isVerified) {
            $provider->verification_reason = null; // Clear rejection reason if approved
        } else {
            $provider->verification_reason = $request->verification_reason; // Save rejection reason
        }
        
        $provider->save();

        // Prepare email
        if ($request->isVerified) {
            $status = 'approved';
            $emailBody = {"
                <p>Hello {$provider->fullname},</p>
                <p>Your account has been <strong>approved</strong> by the admin.</p>
                <p><a href='http://localhost:5173/login' style='display:inline-block;padding:10px 20px;background-color:#1d72b8;color:#fff;text-decoration:none;border-radius:5px;'>Go to Login</a></p>";
        } else {
            $status = 'rejected';
            $reason = $request->verification_reason ?? 'No reason provided';
            $emailBody = "
                <p>Hello {$provider->fullname},</p>
                <p>Your account has been <strong>rejected</strong> by the admin.</p>
                <p><strong>Reason:</strong> {$reason}</p>
                <p><a href='http://localhost:5173/login' style='display:inline-block;padding:10px 20px;background-color:#1d72b8;color:#fff;text-decoration:none;border-radius:5px;'>Go to Login</a></p>
            ";
        }

        // Send email
        try {
            \Illuminate\Support\Facades\Mail::html($emailBody, function ($message) use ($provider, $status) {
                $message->to($provider->email)
                        ->subject("Your account has been {$status}");
            });
        } catch (\Exception $e) {
            Log::error("Failed to send verification email: " . $e->getMessage());
            // Proceed without failing the request, as the DB update succeeded
        }

        // Return JSON response
        return response()->json([
            'success' => true,
            'message' => 'Provider verification updated successfully',
            'data' => [
                'provider_id' => $provider->providerID,
                'fullname' => $provider->fullname,
                'email' => $provider->email,
                'isVerified' => $provider->isVerified,
                'verification_reason' => $provider->verification_reason,
            ]
        ]);
    }

    public function pendingProviders()
    {
        // 0 or null is pending - wait, usually 0 is rejected, 1 is approved? 
        // Or null is pending? "isVerified column which is either true,false or null(by default)"
        // So null is pending.
        
        $pending = ServiceProvider::whereNull('isVerified')
            ->with('category')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($provider) {
                return $this->formatProvider($provider);
            });

        return response()->json([
            'success' => true,
            'message' => 'Pending providers retrieved successfully',
            'data' => $pending
        ]);
    }

    public function approvedProviders()
    {
        // verified = 1 (true)
        $approved = ServiceProvider::where('isVerified', 1)
            ->with('category')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function($provider) {
                return $this->formatProvider($provider);
            });

        return response()->json([
            'success' => true,
            'message' => 'Approved providers retrieved successfully',
            'data' => $approved
        ]);
    }

    public function rejectedProviders()
    {
        // verified = 0 (false)
        $rejected = ServiceProvider::where('isVerified', 0)
            ->with('category')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function($provider) {
                return $this->formatProvider($provider);
            });

        return response()->json([
            'success' => true,
            'message' => 'Rejected providers retrieved successfully',
            'data' => $rejected
        ]);
    }

    public function getAllProviders()
    {
        $all = ServiceProvider::with('category')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($provider) {
                return $this->formatProvider($provider);
            });

        return response()->json([
            'success' => true,
            'message' => 'All providers retrieved successfully',
            'data' => $all
        ]);
    }

    private function formatProvider($provider)
    {
        return [
            'id' => $provider->providerID, // Use correct primary key
            'name' => $provider->fullname,
            'service_type' => $provider->category->name ?? 'Unknown',
            'submission_date' => $provider->created_at ? $provider->created_at->format('l M j Y H:i:s') : 'N/A',
            'credentials' => $provider->idPhotoType,
            'status' => $provider->isVerified,
            'verification_reason' => $provider->verification_reason,
            'email' => $provider->email,
            'phone' => $provider->phone,
        ];
    }

}