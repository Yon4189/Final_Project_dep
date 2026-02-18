<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use Illuminate\Support\Facades\Validator;
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
   // Step 1: Validate input
    $validator = Validator::make($request->all(), [
        'fullname' => 'required|string|max:255',
        'email' => 'required|email|unique:customers,email',
        'phone' => ['required', 'unique:customers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
        'password' => 'required|string|min:8|confirmed',
        'profilePicture' => 'sometimes|image|max:2048',
        'location' => 'sometimes|string|max:255',
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
        
        // FIX: Fallback to 'jpg' if extension is missing (common in mobile uploads)
        $extension = $file->getClientOriginalExtension() ?: 'jpg'; 
        
        $filename = Str::random(20) . '.' . $extension;
        
        // Ensure directory exists
        $destinationPath = public_path('profilepics');
        if (!file_exists($destinationPath)) {
            mkdir($destinationPath, 0777, true);
        }

        $file->move($destinationPath, $filename);
        $profilePath = 'profilepics/' . $filename;
    }

    // Step 3: Create new customer
    $customer = Customer::create([
        'fullname' => $request->fullname,
        'email' => $request->email,
        'phone' => $request->phone,
        'password' => Hash::make($request->password),
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

}


