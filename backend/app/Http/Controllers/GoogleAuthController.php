<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Authenticate a customer via Google ID token.
     * The mobile app exchanges the Google auth code for an ID token,
     * then sends it here for verification and login/registration.
     */
    public function customerGoogleAuth(Request $request)
    {
        $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            $payload = $this->verifyGoogleToken($request->id_token);

            if (!$payload) {
                return response()->json(['success' => false, 'message' => 'Invalid Google token'], 401);
            }

            $email = $payload['email'];
            $name  = $payload['name'] ?? $email;
            $picture = $payload['picture'] ?? null;
            $googleId = $payload['sub'];

            // Find or create customer
            $customer = Customer::where('email', $email)->first();

            if (!$customer) {
                // Auto-register
                $customer = Customer::create([
                    'fullname'   => $name,
                    'email'      => $email,
                    'phone'      => '0900000000', // placeholder — prompt user to update
                    'password'   => bcrypt(Str::random(32)),
                    'google_id'  => $googleId,
                    'profilePicture' => $picture,
                    'status'     => 'active',
                ]);
            } else {
                // Update google_id if not set
                if (!$customer->google_id) {
                    $customer->update(['google_id' => $googleId]);
                }
            }

            if (isset($customer->status) && strtolower($customer->status) === 'suspended') {
                return response()->json(['success' => false, 'message' => 'Your account has been suspended.'], 403);
            }

            Cache::put("customer_online_{$customer->customerID}", true, now()->addMinutes(2));
            $customer->update(['is_online' => true, 'last_seen_at' => now()]);

            $token = $customer->createToken('auth_token', ['*'], now()->addMinutes(1440))->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Google login successful',
                'data' => [
                    'customerID'     => $customer->customerID,
                    'user_type'      => 'customer',
                    'token'          => $token,
                    'profilePicture' => $customer->profilePicture,
                    'fullname'       => $customer->fullname,
                    'email'          => $customer->email,
                    'phone'          => $customer->phone,
                    'service_city'   => $customer->service_city,
                    'location'       => $customer->location,
                    'is_online'      => true,
                    'needs_phone_update' => ($customer->phone === '0900000000'),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Google auth error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Google authentication failed'], 500);
        }
    }

    /**
     * Verify the Google ID token using Google's tokeninfo endpoint.
     */
    private function verifyGoogleToken(string $idToken): ?array
    {
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (!$response->successful()) {
            Log::warning('Google token verification failed', ['status' => $response->status()]);
            return null;
        }

        $payload = $response->json();

        // Verify the audience matches our client ID
        $clientId = config('services.google.client_id');
        if ($clientId && isset($payload['aud']) && $payload['aud'] !== $clientId) {
            Log::warning('Google token audience mismatch', [
                'expected' => $clientId,
                'got'      => $payload['aud'],
            ]);
            return null;
        }

        // Verify token is not expired
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            Log::warning('Google token expired');
            return null;
        }

        return $payload;
    }
}
