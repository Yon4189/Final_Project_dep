<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Models\Booking;
use App\Services\ChapaService;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Daily payment reconciliation job.
 *
 * Finds payments that are still "pending" in our DB but were actually
 * paid on Chapa's side (webhook was missed or failed all retries).
 * Verifies each one directly with Chapa's API and fixes the status.
 */
class ReconcilePayments extends Command
{
    protected $signature   = 'payments:reconcile {--hours=24 : How many hours back to check}';
    protected $description = 'Reconcile pending payments against Chapa API to catch missed webhooks';

    public function handle(ChapaService $chapaService, NotificationService $notificationService): int
    {
        $hours = (int) $this->option('hours');
        $since = now()->subHours($hours);

        // Find payments that are still pending but old enough that the webhook should have arrived
        $stuckPayments = Payment::where('status', 'pending')
            ->where('created_at', '<=', now()->subMinutes(15)) // Give 15 min for normal webhook
            ->where('created_at', '>=', $since)
            ->whereNotNull('tx_ref')
            ->get();

        if ($stuckPayments->isEmpty()) {
            $this->info('No stuck payments found.');
            return self::SUCCESS;
        }

        $this->info("Checking {$stuckPayments->count()} stuck payment(s) against Chapa...");

        $fixed   = 0;
        $failed  = 0;
        $skipped = 0;

        foreach ($stuckPayments as $payment) {
            try {
                $chapaResponse = $chapaService->verifyPayment($payment->tx_ref);

                if ($chapaResponse['status'] !== 'success') {
                    $this->line("  ? {$payment->tx_ref} — Chapa API error, skipping.");
                    $skipped++;
                    continue;
                }

                $chapaStatus = $chapaResponse['data']['status'] ?? null;

                if ($chapaStatus === 'success') {
                    // Payment was actually successful — fix our DB
                    $walletService = app(\App\Services\WalletService::class);
                    $walletService->handlePaymentSuccess($payment, $chapaResponse['data']);

                    $this->line("  ✓ {$payment->tx_ref} — Fixed! Was pending, Chapa shows success.");
                    Log::info('Reconciliation fixed stuck payment', [
                        'tx_ref'     => $payment->tx_ref,
                        'payment_id' => $payment->paymentID,
                        'booking_id' => $payment->bookingID,
                    ]);

                    // Notify admin
                    $notificationService->toAdmins(
                        'payment_reconciled',
                        'Payment Reconciled',
                        "Stuck payment {$payment->tx_ref} was reconciled. Booking #{$payment->bookingID} updated.",
                        ['tx_ref' => $payment->tx_ref, 'booking_id' => $payment->bookingID]
                    );

                    $fixed++;

                } elseif (in_array($chapaStatus, ['failed', 'abandoned'])) {
                    // Payment genuinely failed — mark it
                    $payment->status         = 'failed';
                    $payment->failure_reason = "Reconciliation: Chapa status = {$chapaStatus}";
                    $payment->save();

                    $this->line("  ✗ {$payment->tx_ref} — Marked failed (Chapa: {$chapaStatus}).");
                    $failed++;

                } else {
                    // Still pending on Chapa's side too — leave it
                    $this->line("  ~ {$payment->tx_ref} — Still pending on Chapa, skipping.");
                    $skipped++;
                }

            } catch (\Exception $e) {
                $this->line("  ! {$payment->tx_ref} — Error: {$e->getMessage()}");
                Log::error('Reconciliation error', [
                    'tx_ref' => $payment->tx_ref,
                    'error'  => $e->getMessage(),
                ]);
                $skipped++;
            }
        }

        $this->info("Done. Fixed: {$fixed} | Failed: {$failed} | Skipped: {$skipped}");

        return self::SUCCESS;
    }
}
