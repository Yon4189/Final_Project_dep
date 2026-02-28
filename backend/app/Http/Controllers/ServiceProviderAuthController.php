<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;


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
     * - setting status = 'pending' by default
     * - saving each service offering to the services table
     * - returning json response
     */

    
    public function register(Request $request)
    {
      // Log incoming data
    \Illuminate\Support\Facades\Log::info('Provider registration attempt:', $request->except(['password', 'password_confirmation']));

    // validate input
    $validator = Validator::make($request->all(), [
        'fullname' => ['required', 'string', 'max:255'],
        'email' => 'required|email|unique:service_providers,email',
        'phone' => ['required', 'unique:service_providers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
        'password' => 'required|string|min:8|confirmed',
        'service_city' => 'required|string|max:255',
        'catagoryID' => 'required', // this is a dropdown
        'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        'idPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048',
        'idPhotoType' => 'required|string|in:Passport,Driver License,National ID,Kebele ID',
    ]);

    if ($validator->fails()) {
        \Illuminate\Support\Facades\Log::warning('Provider registration validation failed:', $validator->errors()->toArray());
        return response()->json([
            'success' => false,
            'message' => 'Validation errors',
            'errors' => $validator->errors()
        ], 422);
    }

    // handle file uploads
    $profilePath = null;
    if ($request->hasFile('profilePicture')) {
        $file = $request->file('profilePicture');
        $profileName = Str::random(20) . '_profile.' . $file->getClientOriginalExtension();
        $file->move(public_path('profilepics'), $profileName);
        $profilePath = 'profilepics/' . $profileName;
    }

    $idPhotoPath = null;
    if ($request->hasFile('idPhoto')) {
        $file = $request->file('idPhoto');
        $idPhotoName = Str::random(20) . '_id.' . $file->getClientOriginalExtension();
        $file->move(public_path('idphoto'), $idPhotoName);
        $idPhotoPath = 'idphoto/' . $idPhotoName;
    }

    $credentialPhotoPath = null;
    if ($request->hasFile('credentialPhoto')) {
        $file = $request->file('credentialPhoto');
        $credentialName = Str::random(20) . '_credential.' . $file->getClientOriginalExtension();
        $file->move(public_path('credentialphoto'), $credentialName);
        $credentialPhotoPath = 'credentialphoto/' . $credentialName;
    }

    // create new provider
    $provider = ServiceProvider::create([
        'fullname' => $request->fullname,
        'email' => $request->email,
        'phone' => $request->phone,
        'password' => Hash::make($request->password),
        'service_city' => $request->service_city,
        'catagoryID' => $request->catagoryID,
        'profilePicture' => $profilePath,
        'idPhoto' => $idPhotoPath,
        'credentialPhoto' => $credentialPhotoPath,
        'idPhotoType' => $request->idPhotoType,
        'status' => 'pending', 
    ]);

    // Handle dynamic services if provided by mobile app
    if ($request->has('services')) {
        try {
            $services = json_decode($request->services, true);
            if (is_array($services)) {
                foreach ($services as $serviceData) {
                    \App\Models\Service::create([
                        'providerID' => $provider->providerID,
                        'catagoryID' => $serviceData['categoryId'],
                        'title' => $serviceData['serviceName'],
                        'estimatedPrice' => $serviceData['basePrice'],
                        'description' => $serviceData['description'] ?? '',
                    ]);
                }
                \Illuminate\Support\Facades\Log::info('Created services for provider:', ['count' => count($services)]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error saving provider services:', ['error' => $e->getMessage()]);
        }
    }

    return response()->json([
        'success' => true,
        'message' => 'Service provider registered successfully',
        'data' => $provider
    ], 201);
    }

    public function login(Request $request)
    {
        
        $validator = Validator::make($request->all(), [
            'fullname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'email' => 'required|email|unique:service_providers,email',
            'phone' => ['required', 'unique:service_providers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
            'password' => 'required|string|min:8|confirmed',
            'service_city' => 'required|string|max:255',
            'services' => 'required|string', // JSON array of service offerings
            'profilePicture' => 'image|mimes:jpeg,png,jpg|max:2048',
            'idPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048',
            'idPhotoType' => 'required|string|in:Passport,Driver License,National ID,Kebele ID',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // decode and validate the services JSON
        $servicesData = json_decode($request->services, true);
        if (!is_array($servicesData) || count($servicesData) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or empty services data'
            ], 422);
        }

        return DB::transaction(function () use ($request, $servicesData) {

            // handle file uploads
            $profilePath = null;
            if ($request->hasFile('profilePicture')) {
                $file = $request->file('profilePicture');
                $profileName = Str::random(20) . '_profile.' . $file->getClientOriginalExtension();
                $file->move(public_path('profilepics'), $profileName);
                $profilePath = 'profilepics/' . $profileName;
            }

            $idPhotoPath = null;
            if ($request->hasFile('idPhoto')) {
                $file = $request->file('idPhoto');
                $idPhotoName = Str::random(20) . '_id.' . $file->getClientOriginalExtension();
                $file->move(public_path('idphoto'), $idPhotoName);
                $idPhotoPath = 'idphoto/' . $idPhotoName;
            }

            // create new provider
            $provider = ServiceProvider::create([
                'fullname'       => $request->fullname,
                'email'          => $request->email,
                'phone'          => $request->phone,
                'password'       => Hash::make($request->password),
                'service_city'   => $request->service_city,
                'profilePicture' => $profilePath,
                'idPhoto'        => $idPhotoPath,
                'idPhotoType'    => $request->idPhotoType,
                'status'         => 'pending',
            ]);

            // insert each service offering into the services table
            foreach ($servicesData as $service) {
                \App\Models\Service::create([
                    'providerID'     => $provider->providerID,
                    'catagoryID'     => $service['categoryId'],
                    'title'          => $service['serviceName'],
                    'estimatedPrice' => $service['basePrice'],  // column was renamed from estimatedCost
                    'description'    => $service['description'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Service provider registered successfully',
                'data'    => $provider
            ], 201);
        });
    }



    if ($validator->fails()) {  
        return response()->json([  
            'success' => false,  
            'message' => 'Validation errors',  
            'errors' => $validator->errors()  
        ], 422);  
    }  

// Find provider by email  
$provider = ServiceProvider::where('email', $request->email)->first();  

if (!$provider || !Hash::check($request->password, $provider->password)) {  
    return response()->json([  
        'success' => false,  
        'message' => 'Invalid email or password'  
    ], 401);  
}  

// Create Sanctum token  
$token = $provider->createToken('provider-token')->plainTextToken;  

// Build response  
$responseData = [  
    'userID' => $provider->providerID,  
    'user_type' => 'provider',  
    'fullname' => $provider->fullname,  
    'email' => $provider->email,  
    'profilePicture' => $provider->profilePicture ?? null,  
    'service_city' => $provider->service_city ?? null,  
    'bio' => $provider->bio ?? null,  
    'rating' => $provider->rating ?? null,  
    'completed_jobs' => $provider->completed_jobs ?? 0,  
    'hourly_rate' => $provider->hourly_rate ?? null,  
    'token' => $token,  
];  

return response()->json([  
    'success' => true,  
    'message' => 'Login successful',  
    'data' => $responseData  
]);

}

public function getProfile(Request $request)
{
// Authenticate user via Sanctum
$provider = $request->user(); // returns provider model if token is valid

if (!$provider) {  
    return response()->json([  
        'success' => false,  
        'message' => 'Unauthorized'  
    ], 401);  
}  

$responseData = [  
    'userID' => $provider->providerID,  
    'user_type' => 'provider',  
    'fullname' => $provider->fullname,  
    'email' => $provider->email,  
    'profilePicture' => $provider->profilePicture ?? null,  
    'service_city' => $provider->service_city ?? null,  
    'bio' => $provider->bio ?? null,  
    'rating' => $provider->rating ?? null,  
    'completed_jobs' => $provider->completed_jobs ?? 0,  
    'hourly_rate' => $provider->hourly_rate ?? null,  
];  

return response()->json([  
    'success' => true,  
    'data' => $responseData  
]);

}

}
