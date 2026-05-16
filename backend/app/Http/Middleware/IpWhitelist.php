<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Restricts admin routes to a list of trusted IP addresses.
 *
 * Configure in .env:
 *   ADMIN_ALLOWED_IPS=123.456.789.0,98.76.54.32
 *
 * If ADMIN_ALLOWED_IPS is empty/not set, all IPs are allowed (development mode).
 * In production, always set this to your office/VPN IP.
 */
class IpWhitelist
{
    public function handle(Request $request, Closure $next): mixed
    {
        $allowedIps = config('app.admin_allowed_ips', []);

        // If no whitelist configured, allow all (dev mode)
        if (empty($allowedIps)) {
            return $next($request);
        }

        $clientIp = $request->ip();

        if (!in_array($clientIp, $allowedIps)) {
            Log::warning('Admin access blocked — IP not whitelisted', [
                'ip'    => $clientIp,
                'url'   => $request->fullUrl(),
                'agent' => $request->userAgent(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Access denied from this IP address.',
            ], 403);
        }

        return $next($request);
    }
}
