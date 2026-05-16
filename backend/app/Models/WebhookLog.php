<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookLog extends Model
{
    protected $fillable = [
        'source',
        'tx_ref',
        'payload',
        'status',
        'error_message',
        'retry_count',
        'next_retry_at',
        'processed_at',
    ];

    protected $casts = [
        'next_retry_at' => 'datetime',
        'processed_at'  => 'datetime',
    ];

    public function markProcessed(): void
    {
        $this->update([
            'status'       => 'processed',
            'processed_at' => now(),
        ]);
    }

    public function markFailed(string $error, int $retryDelayMinutes = 5): void
    {
        $this->update([
            'status'         => 'failed',
            'error_message'  => $error,
            'retry_count'    => $this->retry_count + 1,
            'next_retry_at'  => now()->addMinutes($retryDelayMinutes),
        ]);
    }
}
