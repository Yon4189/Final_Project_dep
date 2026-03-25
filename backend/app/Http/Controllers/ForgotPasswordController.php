<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Models\Customer;
use App\Models\ServiceProvider;
use App\Models\Admin;

class ForgotPasswordController extends Controller
{
    // Request password reset
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $email = $request->email;

        // Check all three tables
        $userTable = null;
        $user = DB::table('customers')->where('email', $email)->first();
        if ($user) $userTable = 'customers';

        if (!$user) {
            $user = DB::table('service_providers')->where('email', $email)->first();
            if ($user) $userTable = 'service_providers';
        }

        if (!$user) {
            $user = DB::table('admins')->where('email', $email)->first();
            if ($user) $userTable = 'admins';
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email not found'
            ]);
        }

        // Generate 6-digit numeric code
        $rawToken = sprintf("%06d", mt_rand(1, 999999));

        // Store hashed token in password_resets
        DB::table('password_resets')->updateOrInsert(
            ['email' => $email],
            [
                'email' => $email,
                'token' => Hash::make($rawToken),
                'created_at' => now(),
                'expires_at' => now()->addMinutes(30)   
            ]
        );

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $resetLink = rtrim($frontendUrl, '/') . "/reset-password?email={$email}&token={$rawToken}";
        // frontend URL will be used to generate the link. this is the link the user clicks when he receives the email

        Mail::html("
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>
                <h2 style='color: #2563eb; text-align: center;'>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Use the verification code below to proceed:</p>

                <div style='background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>
                    <span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;'>{$rawToken}</span>
                </div>

                <p style='color: #4b5563;'>This code will expire in 30 minutes.</p>
                <p style='color: #4b5563;'>If you did not request a password reset, please ignore this email.</p>
                <hr style='border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;'>
                <p style='font-size: 12px; color: #9ca3af; text-align: center;'>&copy; " . config('app.name') . ". All rights reserved.</p>
            </div>
        ", function ($message) use ($email) {
            $message->to($email)
                    ->subject('Your Password Reset Verification Code');
            });

        return response()->json([
            'success' => true,
            'message' => 'Reset link sent to your email'
        ]);
    }

     
    public function resetPassword(Request $request)
    {
        // validate inputs
        $request->validate([
            'email' => 'required|email',
            'token' => 'required',
            'password' => 'required|confirmed|min:8', // there must be another field: passowrd_confirmation
        ]);

        $email = $request->email;
        $token = $request->token;

        // check if token exists & not expired
        $record = DB::table('password_resets')->where('email', $email)->first();
        if (!$record || !is_object($record) || !Hash::check($token, $record->token) || $record->expires_at < now()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token'
            ]);
        }

        // find which table the user is in
        $userTable = null;
        if (DB::table('customers')->where('email', $email)->exists()) $userTable = 'customers';
        elseif (DB::table('service_providers')->where('email', $email)->exists()) $userTable = 'service_providers';
        elseif (DB::table('admins')->where('email', $email)->exists()) $userTable = 'admins';

        if (!$userTable) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token'
            ]);
        }

        // update password
        DB::table($userTable)->where('email', $email)
            ->update(['password' => Hash::make($request->password)]);

        // delete the password reset record
        DB::table('password_resets')->where('email', $email)->delete();

        // return success
        return response()->json([
            'success' => true,
            'message' => 'Password has been reset successfully'
        ]);
    }


}
    


  


