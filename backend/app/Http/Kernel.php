<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * Global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     */
    protected $middleware = [
        // Handle maintenance mode
        \Illuminate\Foundation\Http\Middleware\CheckForMaintenanceMode::class,
        // Validate POST size
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        // Trim input strings
        \App\Http\Middleware\TrimStrings::class,
        // Convert empty strings to null
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
        // Handle CORS (cross-origin requests)
        \Illuminate\Http\Middleware\HandleCors::class,
        // Trust proxies if behind a load balancer
        \App\Http\Middleware\TrustProxies::class,
        // Prevent requests during maintenance
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
    ];

    /**
     * Middleware groups for web and api routes.
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Illuminate\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\SanitizeInput::class, // Strip HTML tags from all string inputs
        ],
    ];

    /**
     * Route-specific middleware.
     */
    protected $routeMiddleware = [
        'auth'              => \App\Http\Middleware\Authenticate::class,
        'auth.basic'        => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'cache.headers'     => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can'               => \Illuminate\Auth\Middleware\Authorize::class,
        'guest'             => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm'  => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed'            => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle'          => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified'          => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,

        // ── Custom security middleware ──────────────────────────────────────
        // Verifies the authenticated user owns the resource (prevents horizontal privilege escalation)
        'ownership'         => \App\Http\Middleware\EnsureOwnership::class,
        // Logs sensitive operations for audit trail
        'log.sensitive'     => \App\Http\Middleware\LogSensitiveRequests::class,
        // Blocks suspended/pending providers from accessing protected routes
        'provider.approved' => \App\Http\Middleware\EnsureProviderApproved::class,
        // Blocks suspended customers from creating bookings/payments
        'customer.active'   => \App\Http\Middleware\EnsureCustomerActive::class,
        // Restricts admin routes to whitelisted IP addresses
        'ip.whitelist'      => \App\Http\Middleware\IpWhitelist::class,
    ];
}
