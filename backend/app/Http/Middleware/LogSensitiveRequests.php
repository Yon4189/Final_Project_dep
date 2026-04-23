<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Logs sensitive operations with full context for audit trail.
 * Apply to: admin actions, payment operations, withdrawals, account changes.
 */
class LogSensitiveRequests
{
    public function handle(Request $request, Closure $next): mixed
    {
        // Determine who is making the request
        $userId   = null;
        $userType = 'unauthenticated';

        if ($admin = auth()->guard('admin')->user()) {
            $userId   = $admin->adminID;
            $userType = 'admin';
        } elseif ($provider = auth()->guard('provider')->user()) {
            $userId   = $provider->providerID;
            $userType = 'provider';
        } elseif ($customer = auth()->guard('customer')->user()) {
            $userId   = $customer->customerID;
            $userType = 'customer';
        }

        Log::channel('stack')->info('SENSITIVE_OP', [
            'user_id'    => $userId,
            'user_type'  => $userType,
            'method'     => $request->method(),
            'url'        => $request->fullUrl(),
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'route'      => $request->route()?->getName(),
        ]);

        return $next($request);
    }
}
