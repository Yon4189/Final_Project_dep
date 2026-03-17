<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ServiceProvider;
use App\Models\Customer;
use Illuminate\Support\Facades\Cache;

class CleanOfflineUsers extends Command
{
    protected $signature = 'users:clean-offline';
    protected $description = 'Mark users as offline if no heartbeat received';

    public function handle()
    {
        // Mark providers offline if no heartbeat in last 3 minutes
        $providers = ServiceProvider::where('is_online', true)->get();
        foreach ($providers as $provider) {
            if (!Cache::has("provider_online_{$provider->providerID}")) {
                $provider->is_online = false;
                $provider->save();
                $this->info("Provider {$provider->providerID} marked offline");
            }
        }
        
        // Mark customers offline
        $customers = Customer::where('is_online', true)->get();
        foreach ($customers as $customer) {
            if (!Cache::has("customer_online_{$customer->customerID}")) {
                $customer->is_online = false;
                $customer->save();
                $this->info("Customer {$customer->customerID} marked offline");
            }
        }
        
        $this->info('Offline users cleaned successfully');
    }
}