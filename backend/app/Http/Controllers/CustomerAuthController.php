<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CustomerAuthController extends Controller
{
    /**
     * register a new customer
     * 
     * this handles:
     * - validation of input
     * - password hashing
     * - optional profile picture upload
     * - storing data in the customers table
     * - returning json response
     */

    public function register(Request $request)
    {
        // Step 1: Validate input using Validator to return JSON
        $validator = \Validator::make($request->all(), [
            'fullname' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email',
            'phone' => ['required', 'unique:customers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
            'password' => 'required|string|min:8|confirmed', // expects password_confirmation
            'profilePicture' => 'sometimes|image|max:2048',
            'location' => 'sometimes|string|max:255', // ✅ add this
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // Step 2: Handle profile picture if provided
        $profilePath = null;
        if ($request->hasFile('profilePicture')) {
            $file = $request->file('profilePicture');
            $filename = \Str::random(20) . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('profilepics'), $filename);
            $profilePath = 'profilepics/' . $filename; // store relative path in DB
        }

        // Step 3: Create new customer
        $customer = Customer::create([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => \Hash::make($request->password),
            'profilePicture' => $profilePath,
            'location' => $request->location
        ]);

        // Step 4: Return JSON success response
        return response()->json([
            'success' => true,
            'message' => 'Customer registered successfully',
            'data' => $customer
        ], 201);
    }

    public function login(Request $request)
    {
        // Step 1: Validate input and return JSON errors if any
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

        // Step 2: Find customer by email
        $customer = Customer::where('email', $request->email)->first();

        // Step 3: Check password
        if (!$customer || !\Hash::check($request->password, $customer->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Step 4: Return success response
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $customer
        ]);
    }


}


