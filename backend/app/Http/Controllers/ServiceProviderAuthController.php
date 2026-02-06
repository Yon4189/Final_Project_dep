<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Hash;
//use Illuminate\Support\Str;

class ServiceProviderAuthController extends Controller
{
    /**
     * register a new service provider
     * 
     * this handles:
     * - validation of input
     * - password hashing
     * - required ID photo upload
     * - storing data in the serviceProviders table
     * - setting isVerified = 0 by default
     * - returning json response
     */

    public function register(Request $request)
    {
        // validate input using 
        $validator = \Validator::make($request->all(), [
            'fullname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'email' => 'required|email|unique:serviceproviders,email',
            'phone' => ['required', 'unique:serviceproviders,phone', 'regex:/^(09|07)[0-9]{8}$/'],
            'password' => 'required|string|min:8|confirmed', // expects password_confirmation
            'service_city' => 'required|string|max:255',
            'catagoryID' => 'required', // dropdown, only required
            'profilePicture' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'idPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // handle file uploads with random names to avoid collisions
        $profilePath = null;
        if ($request->hasFile('profilePicture')) {
            $file = $request->file('profilePicture');
            $profileName = \Str::random(20) . '_profile.' . $file->getClientOriginalExtension();
            $file->move(public_path('profilepics'), $profileName);
            $profilePath = 'profilepics/' . $profileName;
        }

        $idPhotoPath = null;
        if ($request->hasFile('idPhoto')) {
            $file = $request->file('idPhoto');
            $idPhotoName = \Str::random(20) . '_id.' . $file->getClientOriginalExtension();
            $file->move(public_path('idphoto'), $idPhotoName);
            $idPhotoPath = 'idphoto/' . $idPhotoName;
        }

        // this creates new service provider. a record
        $provider = ServiceProvider::create([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => \Hash::make($request->password),
            'service_city' => $request->service_city,
            'catagoryID' => $request->catagoryID,
            'profilePicture' => $profilePath,
            'idPhoto' => $idPhotoPath,
            'isVerified' => false, // default, requires admin approval
        ]);

        // JSON respons return
        return response()->json([
            'success' => true,
            'message' => 'Service provider registered successfully',
            'data' => $provider
        ], 201);
    }

    public function login(Request $request)
    {
        
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

        // search for provider by their email
        $provider = ServiceProvider::where('email', $request->email)->first();

        
        if (!$provider || !\Hash::check($request->password, $provider->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        // Step 4: Return success
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $provider
        ]);
    }



}
