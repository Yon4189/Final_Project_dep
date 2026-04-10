<?php
// app/Console/Kernel.php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Expire unpaid bookings every hour
        $schedule->command('bookings:expire-unpaid')->hourly();
        // Auto-release bookings every hour
        $schedule->command('bookings:auto-release')->hourly();
        // Run every 5 minutes to mark stale users offline
        $schedule->command('users:clean-offline')->everyFiveMinutes();
        
        // Split payment system jobs
        $schedule->job(new \App\Jobs\PaymentReminderJob)->hourly();
        $schedule->job(new \App\Jobs\HeldPayoutReleaseJob)->hourly();
        $schedule->job(new \App\Jobs\OverduePaymentJob)->dailyAt('02:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }

}