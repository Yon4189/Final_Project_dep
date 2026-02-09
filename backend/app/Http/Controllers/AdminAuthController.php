<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;
use App\Models\ServiceProvider;



class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
    // validate input and return JSON if ther are errors
    $validator = \Validator::make($request->all(), [
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
        $provider->isVerified = $request->isVerified;
        $provider->verification_reason = $request->isVerified ? null : $request->verification_reason;
        $provider->save();

        // Prepare email
        if ($request->isVerified) {
            $status = 'approved';
            $emailBody = "
                <p>Hello {$provider->fullname},</p>
                <p>Your account has been <strong>approved</strong> by the admin.</p>
                <p><a href='http://localhost:5173/login' style='display:inline-block;padding:10px 20px;background-color:#1d72b8;color:#fff;text-decoration:none;border-radius:5px;'>Go to Login</a></p>
            ";
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
        \Illuminate\Support\Facades\Mail::html($emailBody, function ($message) use ($provider, $status) {
            $message->to($provider->email)
                    ->subject("Your account has been {$status}");
        });

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
    $pending = ServiceProvider::whereNull('isVerified')
        ->with('category')
        ->get()
        ->map(function($provider) {
            return [
                'id' => $provider->id,
                'name' => $provider->fullname,             // Name column
                'service_type' => $provider->category->name ?? null, // Service type column
                'submission_date' => $provider->created_at->format('l M j Y H:i:s'), // Submission date column
                'credentials' => $provider->idPhotoType,   // Credentials column (ID type)
                // 'action' column is handled by frontend
            ];
        });

    return response()->json([
        'success' => true,
        'message' => 'Pending providers retrieved successfully',
        'data' => $pending
    ]);
    }

}