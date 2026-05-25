<?php

namespace App\Jobs;

use App\Services\PayoutProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class HeldPayoutReleaseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $payoutProcessor = app(PayoutProcessor::class);
        
        try {
            Log::info('Starting held payout release job');
            
            // Call PayoutProcessor to release held payouts
            $payoutProcessor->releaseHeldPayouts();
            
            Log::info('Held payout release job completed successfully');
            
        } catch (\Exception $e) {
            Log::error('Held payout release job failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Re-throw to mark job as failed
            throw $e;
        }
    }
}
