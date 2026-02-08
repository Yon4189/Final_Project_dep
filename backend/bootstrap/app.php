<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php', // Ensure api routing is present
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // ✅ ADD THIS: Disable CSRF for API routes so your phone can connect
        $middleware->validateCsrfTokens(except: [
            'api/*', 
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();