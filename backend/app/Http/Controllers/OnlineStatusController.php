<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\ServiceProvider;
use App\Models\Customer;

class OnlineStatusController extends Controller
{
    /**
     * Provider sends heartbeat (call every 30-60 seconds from app)
     */
    public function providerHeartbeat(Request $request)
    {
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Store in cache with 2 minute expiry
        Cache::put("provider_online_{$provider->providerID}", true, now()->addMinutes(2));
        
        // Update database occasionally (every 5 minutes to reduce load)
        if (!$provider->last_seen_at || $provider->last_seen_at < now()->subMinutes(5)) {
            $provider->is_online = true;
            $provider->last_seen_at = now();
            $provider->save();
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Heartbeat received'
        ]);
    }

    /**
     * Provider explicitly marks themselves offline (app backgrounded / unmounted)
     */
    public function providerMarkOffline(Request $request)
    {
        $provider = auth()->guard('provider')->user();

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        Cache::forget("provider_online_{$provider->providerID}");
        $provider->is_online = false;
        $provider->last_seen_at = now();
        $provider->save();

        return response()->json([
            'success' => true,
            'message' => 'Marked offline'
        ]);
    }
    
    /**
     * Customer sends heartbeat
     */
    public function customerHeartbeat(Request $request)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        Cache::put("customer_online_{$customer->customerID}", true, now()->addMinutes(2));
        
        if (!$customer->last_seen_at || $customer->last_seen_at < now()->subMinutes(5)) {
            $customer->is_online = true;
            $customer->last_seen_at = now();
            $customer->save();
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Heartbeat received'
        ]);
    }
    
    /**
     * Check if a provider is online (used by other endpoints)
     */
    public static function isProviderOnline($providerId)
    {
        return Cache::has("provider_online_{$providerId}");
    }
    
    /**
     * Check if a customer is online
     */
    public static function isCustomerOnline($customerId)
    {
        return Cache::has("customer_online_{$customerId}");
    }
    
    /**
     * Provider logout - mark offline immediately
     */
    public function providerLogout(Request $request)
    {
        $provider = auth()->guard('provider')->user();
        
        if ($provider) {
            Cache::forget("provider_online_{$provider->providerID}");
            $provider->is_online = false;
            $provider->last_seen_at = now();
            $provider->save();
        }
        
        // Call your existing logout method
        return app(ServiceProviderAuthController::class)->logout($request);
    }
    
    /**
     * Customer logout
     */
    public function customerLogout(Request $request)
    {
        $customer = auth()->guard('customer')->user();
        
        if ($customer) {
            Cache::forget("customer_online_{$customer->customerID}");
            $customer->is_online = false;
            $customer->last_seen_at = now();
            $customer->save();
        }
        
        return app(CustomerAuthController::class)->logout($request);
    }
}

