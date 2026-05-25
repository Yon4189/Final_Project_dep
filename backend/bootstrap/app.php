<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\CheckMaintenanceMode::class);
        
        $middleware->alias([
            'ownership'         => \App\Http\Middleware\EnsureOwnership::class,
            'log.sensitive'     => \App\Http\Middleware\LogSensitiveRequests::class,
            'provider.approved' => \App\Http\Middleware\EnsureProviderApproved::class,
            'customer.active'   => \App\Http\Middleware\EnsureCustomerActive::class,
            'ip.whitelist'      => \App\Http\Middleware\IpWhitelist::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/webhook/*',
        ]);

        // Register custom middleware aliases
        $middleware->alias([
            'ownership'         => \App\Http\Middleware\EnsureOwnership::class,
            'log.sensitive'     => \App\Http\Middleware\LogSensitiveRequests::class,
            'provider.approved' => \App\Http\Middleware\EnsureProviderApproved::class,
            'customer.active'   => \App\Http\Middleware\EnsureCustomerActive::class,
            'ip.whitelist'      => \App\Http\Middleware\IpWhitelist::class,
        ]);

        // Add SanitizeInput to the api group
        $middleware->appendToGroup('api', \App\Http\Middleware\SanitizeInput::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();