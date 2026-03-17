<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\HasApiTokens; 
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;


class CustomerAuthController extends Controller
{
    /**
     * register a new customer
     */
    public function register(Request $request)
    {
        // Log the incoming request for debugging
        Log::info('Registration request received:', [
            'all_data' => $request->all(),
            'files' => $request->hasFile('profilePicture') ? 'Has file' : 'No file',
            'headers' => $request->headers->get('content-type')
        ]);

        // Step 1: Validate input with more flexible phone validation
        $validator = Validator::make($request->all(), [
            'fullname' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email',
            'phone' => [
                'required',
                'unique:customers,phone',
                function ($attribute, $value, $fail) {
                    // Remove any non-numeric characters
                    $phone = preg_replace('/[^0-9]/', '', $value);
                    
                    // Check if it's 10 digits and starts with 09 or 07
                    if (!preg_match('/^(09|07)[0-9]{8}$/', $phone)) {
                        $fail('The phone number must be 10 digits starting with 09 or 07.');
                    }
                },
            ],
            'password' => 'required|string|min:8|confirmed',
            'profilePicture' => 'sometimes|image|max:2048',
            'location' => 'sometimes|string|max:255',
            'service_city' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed:', $validator->errors()->toArray());
            
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // Step 2: Clean the phone number
        $phone = preg_replace('/[^0-9]/', '', $request->phone);

        // Step 3: Handle profile picture if provided
        $profilePath = null;
        if ($request->hasFile('profilePicture')) {
            $file = $request->file('profilePicture');
            
            $extension = $file->getClientOriginalExtension() ?: 'jpg'; 
            $filename = Str::random(20) . '.' . $extension;
            
            $destinationPath = public_path('profilepics');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0777, true);
            }

            $file->move($destinationPath, $filename);
            $profilePath = 'profilepics/' . $filename;
            
            Log::info('Profile picture saved:', ['path' => $profilePath]);
        }

        // Step 4: Create new customer
        $customer = Customer::create([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'phone' => $phone, // Save cleaned phone number
            'password' => Hash::make($request->password),
            'profilePicture' => $profilePath,
            'location' => $request->location,
            'service_city' => $request->service_city,
        ]);

        Log::info('Customer registered successfully:', ['id' => $customer->customerID]);

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'Customer registered successfully.',
            'data' => [
                'customer' => $customer
            ]
        ], 201);
    }


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

        // Find customer
        $customer = Customer::where('email', $request->email)->first();

        if (!$customer || !Hash::check($request->password, $customer->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        // ✅ SET ONLINE STATUS - ADD THESE LINES
        Cache::put("customer_online_{$customer->customerID}", true, now()->addMinutes(2));
        Customer::where('customerID', $customer->customerID)
            ->update([
                'is_online' => true,
                'last_seen_at' => now()
            ]);

        // Remove password from response
        unset($customer->password);
        
        // Create a Sanctum token
        $token = $customer->createToken('auth_token', ['*'], now()->addMinutes(1440))->plainTextToken;
        
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'customerID' => $customer->customerID,
                'user_type' => 'customer',
                'token' => $token,
                'profilePicture' => $customer->profilePicture,
                'fullname' => $customer->fullname,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'service_city' => $customer->service_city,
                'location' => $customer->location,
                // ✅ OPTIONAL: Include online status in response
                'is_online' => true
            ]
        ]);
    }
    public function logout(Request $request)
{
    $customer = auth()->guard('customer')->user();
    
    if ($customer) {
        $customer->token()->revoke(); // If using Passport
        // or if using Sanctum:
        $request->user()->currentAccessToken()->delete();
    }
    
    return response()->json([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}
}