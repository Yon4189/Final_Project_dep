<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\SystemSetting;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check if maintenance mode is enabled in system settings
        $isMaintenanceMode = SystemSetting::get('maintenance_mode', false);

        if ($isMaintenanceMode) {
            // 2. Allow Admins to bypass maintenance mode so they can turn it off
            // We check the 'admin' guard or if the request is targeting an admin route
            if ($request->is('api/admin/*') || $request->is('admin/*') || (auth('admin')->check())) {
                return $next($request);
            }

            // 3. Return a 503 Service Unavailable response for everyone else
            return response()->json([
                'success' => false,
                'message' => 'System is currently undergoing maintenance. Please try again later.',
                'status' => 'maintenance'
            ], 503);
        }

        return $next($request);
    }
}
