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

        // Generate raw token
        $rawToken = Str::random(60);

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
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>Click the button below to reset your password:</p>

            <a href='{$resetLink}' 
            style='
                display:inline-block;
                padding:12px 20px;
                background-color:#2563eb;
                color:white;
                text-decoration:none;
                border-radius:6px;
                font-weight:bold;
            '>
            Reset Password
            </a>

            <p style='margin-top:15px;'>This link expires in 30 minutes.</p>
        ", function ($message) use ($email) {
            $message->to($email)
                    ->subject('Reset Your Password');
            });

        return response()->json([
            'success' => true,
            'message' => 'Reset token generated successfully',
            'token' => $rawToken
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
        if (!$record ||!Hash::check($token, $record->token) || $record->expires_at < now()) {
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
    


  


