<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $notification;

    /**
     * Create a new job instance.
     */
    public function __construct(Notification $notification)
    {
        $this->notification = $notification;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $notification = $this->notification;
            
            // Get user to find push token
            $user = null;
            if ($notification->notifiable_type === 'customer') {
                $user = Customer::find($notification->notifiable_id);
            } elseif ($notification->notifiable_type === 'provider') {
                $user = ServiceProvider::find($notification->notifiable_id);
            }

            if (!$user || !$user->expo_push_token) {
                Log::info('Job: Push notification skipped: No token found', [
                    'notifiable_type' => $notification->notifiable_type,
                    'notifiable_id' => $notification->notifiable_id
                ]);
                return;
            }

            Log::info('Job: Sending push notification via Expo', [
                'token' => $user->expo_push_token,
                'title' => $notification->title
            ]);

            $response = Http::timeout(10)->post('https://exp.host/--/api/v2/push/send', [
                'to' => $user->expo_push_token,
                'title' => $notification->title ?? 'New Notification',
                'body' => $notification->message,
                'data' => array_merge($notification->data ?? [], [
                    'notificationID' => $notification->notificationID,
                    'type' => $notification->type,
                    'bookingID' => $notification->related_booking_id
                ]),
                'sound' => 'default',
                'priority' => 'high'
            ]);

            if ($response->successful()) {
                $notification->update([
                    'push_sent' => true,
                    'push_sent_at' => now()
                ]);
                Log::info('Job: Push notification sent successfully');
            } else {
                Log::error('Job: Expo Push API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Job: Failed to send push notification: ' . $e->getMessage());
            // Fail the job if it's a network error so it can be retried
            throw $e;
        }
    }
}
