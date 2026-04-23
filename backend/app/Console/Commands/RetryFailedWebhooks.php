<?php

namespace App\Console\Commands;

use App\Models\WebhookLog;
use App\Services\WalletService;
use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RetryFailedWebhooks extends Command
{
    protected $signature   = 'webhooks:retry';
    protected $description = 'Retry failed Chapa webhook deliveries (max 5 attempts)';

    public function handle(WalletService $walletService): int
    {
        $failed = WebhookLog::where('status', 'failed')
            ->where('retry_count', '<', 5)
            ->where('next_retry_at', '<=', now())
            ->get();

        if ($failed->isEmpty()) {
            $this->info('No failed webhooks to retry.');
            return self::SUCCESS;
        }

        $this->info("Retrying {$failed->count()} failed webhook(s)...");

        foreach ($failed as $log) {
            try {
                $payload = json_decode($log->payload, true);
                $txRef   = $payload['trx_ref'] ?? $payload['tx_ref'] ?? null;

                if (!$txRef) {
                    $log->markFailed('No tx_ref in payload');
                    continue;
                }

                $payment = Payment::where('tx_ref', $txRef)->first();

                if (!$payment) {
                    $log->markFailed("Payment not found for tx_ref: {$txRef}");
                    continue;
                }

                // Skip if already processed
                if (in_array($payment->status, ['held', 'paid', 'releasable', 'released'])) {
                    $log->markProcessed();
                    $this->line("  ✓ {$txRef} — already processed, marked done.");
                    continue;
                }

                $walletService->handlePaymentSuccess($payment, $payload);
                $log->markProcessed();

                $this->line("  ✓ {$txRef} — retried successfully.");
                Log::info('Webhook retry succeeded', ['tx_ref' => $txRef, 'log_id' => $log->id]);

            } catch (\Exception $e) {
                // Exponential backoff: 5, 10, 20, 40, 80 minutes
                $delay = 5 * pow(2, $log->retry_count);
                $log->markFailed($e->getMessage(), $delay);

                $this->line("  ✗ Failed (attempt {$log->retry_count}): {$e->getMessage()}");
                Log::error('Webhook retry failed', [
                    'log_id' => $log->id,
                    'error'  => $e->getMessage(),
                ]);
            }
        }

        return self::SUCCESS;
    }
}
