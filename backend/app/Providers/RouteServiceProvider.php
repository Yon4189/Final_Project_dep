<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * this namespace is applied to your controller routes.
     *
     * @var string|null
     */
    protected $namespace = 'App\\Http\\Controllers';

    /**
     * define your route model bindings, pattern filters, etc.
     */
    public function boot(): void
    {
        $this->routes(function () {
            // api routes
            Route::group([
                'prefix' => 'api',
                'middleware' => 'api',
                'namespace' => $this->namespace,
            ], base_path('routes/api.php'));

            // web routes
            Route::group([
                'middleware' => 'web',
                'namespace' => $this->namespace,
            ], base_path('routes/web.php'));
        });
    }



}
