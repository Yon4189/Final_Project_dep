<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider as LaravelServiceProvider;
use Illuminate\Database\Eloquent\Relations\Relation;
use App\Models\Customer;
use App\Models\ServiceProvider as ProviderModel;
use App\Models\Admin;

class AppServiceProvider extends LaravelServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::morphMap([
            'customer' => Customer::class,
            'provider' => ProviderModel::class,
            'admin' => Admin::class,
        ]);
    }
}