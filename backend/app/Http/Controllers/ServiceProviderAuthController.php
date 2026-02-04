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
        // validate required fields
        $request->validate([
            'fullname' => 'required|string|max:255',
            'email' => 'required|email|unique:serviceproviders,email',
            'phone' => [
                        'required',
                        'unique:serviceproviders,phone',
                        'regex:/^(09|07)[0-9]{8}$/'
],
            'password' => 'required|string|min:8|confirmed', // expects password_confirmation
            'catagoryID' => 'required|integer|exists:catagories,catagoryID',
            'profilePicture'=> 'required|image|mimes:jpeg,png,jpg|max:2048',
            'idPhoto' => 'required|image|mimes:jpg,jpeg,png|max:2048' // required, max 2mb
        ]);

        // ID photo upload
$idPhoto = $request->file('idPhoto');
$photoName = time() . '.' . $idPhoto->getClientOriginalExtension();
$idPhoto->move(public_path('idphoto'), $photoName);

// profile picture upload
$profilePicName = time().'_profile.'.$request->file('profilePicture')->getClientOriginalExtension();
$request->file('profilePicture')->move(public_path('profilepics'), $profilePicName);
 

        // create new service provider
        $provider = ServiceProvider::create([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'catagoryID' => $request->catagoryID, // foreign key
            'profilePicture'=> 'profilepics/'.$profilePicName,
            'idPhoto' => 'idphoto/'.$photoName,
            'isVerified' => false // default, admin approval needed
        ]);

        // return json response if registration is successful
        return response()->json([
            'success' => true,
            'message' => 'service provider registered successfully',
            'data' => $provider
        ], 201);
    }
}
