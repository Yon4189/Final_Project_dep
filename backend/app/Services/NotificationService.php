<?php
// app/Services/NotificationService.php

namespace App\Services;

use App\Models\Notification;
use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Events\BookingUpdated;

class NotificationService
{
    /**
     * Send a notification to a customer
     */
    public function toCustomer($customerId, $type, $title, $message, $data = [], $bookingId = null)
    {
        return $this->create([
            'notifiable_type' => 'customer',
            'notifiable_id' => $customerId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'related_booking_id' => $bookingId
        ]);
    }

    /**
     * Send a notification to a provider
     */
    public function toProvider($providerId, $type, $title, $message, $data = [], $bookingId = null)
    {
        return $this->create([
            'notifiable_type' => 'provider',
            'notifiable_id' => $providerId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'related_booking_id' => $bookingId
        ]);
    }

    /**
     * Send a notification to an admin
     */
    public function toAdmin($adminId, $type, $title, $message, $data = [])
    {
        return $this->create([
            'notifiable_type' => 'admin',
            'notifiable_id' => $adminId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data
        ]);
    }

    /**
     * Send notification to all admins
     */
    public function toAdmins($type, $title, $message, $data = [])
    {
        $admins = \App\Models\Admin::all();
        $notifications = [];
        foreach ($admins as $admin) {
            $notifications[] = $this->toAdmin($admin->adminID, $type, $title, $message, $data);
        }
        return $notifications;
    }

    /**
     * Send notification to multiple customers
     */
    public function toCustomers(array $customerIds, $type, $title, $message, $data = [], $bookingId = null)
    {
        $notifications = [];
        foreach ($customerIds as $customerId) {
            $notifications[] = $this->toCustomer($customerId, $type, $title, $message, $data, $bookingId);
        }
        return $notifications;
    }

    /**
     * Send notification to multiple providers
     */
    public function toProviders(array $providerIds, $type, $title, $message, $data = [], $bookingId = null)
    {
        $notifications = [];
        foreach ($providerIds as $providerId) {
            $notifications[] = $this->toProvider($providerId, $type, $title, $message, $data, $bookingId);
        }
        return $notifications;
    }

    /**
     * Create notification in database
     */
    private function create(array $data)
    {
        try {
            Log::info('Creating notification', ['data' => $data]);
            $notification = Notification::create($data);
            Log::info('Notification created', ['id' => $notification->notificationID]);
            
            // Trigger WebSocket broadcast
            event(new BookingUpdated($notification));
            
            // Queue push notification to background to avoid blocking
            \App\Jobs\SendPushNotificationJob::dispatch($notification);
            
            return $notification;
        } catch (\Exception $e) {
            Log::error('Failed to create notification: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification using Expo Push API
     */
    private function sendPushNotification($notification)
    {
        try {
            // Get user to find push token
            $user = null;
            if ($notification->notifiable_type === 'customer') {
                $user = Customer::find($notification->notifiable_id);
            } elseif ($notification->notifiable_type === 'provider') {
                $user = ServiceProvider::find($notification->notifiable_id);
            }

            if (!$user || !$user->expo_push_token) {
                Log::info('Push notification skipped: No token found', [
                    'notifiable_type' => $notification->notifiable_type,
                    'notifiable_id' => $notification->notifiable_id
                ]);
                return;
            }

            Log::info('Sending push notification via Expo', [
                'token' => $user->expo_push_token,
                'title' => $notification->title
            ]);

            // Reduced timeout to 2s to prevent blocking the main thread for too long
            $response = Http::timeout(2)->post('https://exp.host/--/api/v2/push/send', [
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
                Log::info('Push notification sent successfully');
            } else {
                Log::error('Expo Push API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send push notification: ' . $e->getMessage());
        }
    }

        /**
     * Send notification to any user type
     */
    public function toUser($userType, $userId, $type, $title, $message, $data = [], $bookingId = null)
    {
        if ($userType === 'customer') {
            return $this->toCustomer($userId, $type, $title, $message, $data, $bookingId);
        } elseif ($userType === 'provider') {
            return $this->toProvider($userId, $type, $title, $message, $data, $bookingId);
        } elseif ($userType === 'admin') {
            return $this->toAdmin($userId, $type, $title, $message, $data);
        }
    }

    /**
     * Notification types constants
     */
    const TYPE_BOOKING_REQUEST = 'booking_request';
    const TYPE_BOOKING_ACCEPTED = 'booking_accepted';
    const TYPE_BOOKING_REJECTED = 'booking_rejected';
    const TYPE_BOOKING_CANCELLED = 'booking_cancelled';
    const TYPE_BOOKING_COMPLETED = 'booking_completed';
    const TYPE_BOOKING_EXPIRED = 'booking_expired';
    const TYPE_PROVIDER_ARRIVED = 'provider_arrived';
    const TYPE_SERVICE_STARTED = 'service_started';
    const TYPE_PAYMENT_RECEIVED = 'payment_received';
    const TYPE_PAYMENT_RELEASED = 'payment_released';
    const TYPE_NEW_MESSAGE = 'new_message';
    const TYPE_PROVIDER_APPROVED = 'provider_approved';
    const TYPE_PROVIDER_REJECTED = 'provider_rejected';
    const TYPE_REVIEW_RECEIVED = 'review_received';
    const TYPE_WITHDRAWAL_REQUEST = 'withdrawal_request';
    const TYPE_NEW_PROVIDER_REGISTRATION = 'provider_registration';
    const TYPE_DISPUTE_RAISED = 'dispute';

    /**
     * Admin notification helpers for important events
     */

    /**
     * Notify admins of new customer registration
     */
    public function notifyAdminsNewCustomer($customer)
    {
        return $this->toAdmins(
            'customer_registration',
            'New Customer Registration',
            "New customer registered: {$customer->fullname} ({$customer->email})",
            [
                'customer_id' => $customer->customerID,
                'customer_name' => $customer->fullname,
                'customer_email' => $customer->email,
                'customer_phone' => $customer->phone,
            ]
        );
    }

    /**
     * Notify admins of new provider registration
     */
    public function notifyAdminsNewProvider($provider)
    {
        return $this->toAdmins(
            'provider_registration',
            'New Provider Registration',
            "New provider registered: {$provider->fullname} - Requires verification",
            [
                'provider_id' => $provider->providerID,
                'provider_name' => $provider->fullname,
                'provider_email' => $provider->email,
                'provider_phone' => $provider->phone,
                'business_name' => $provider->businessName,
            ]
        );
    }

    /**
     * Notify admins of new dispute
     */
    public function notifyAdminsNewDispute($dispute, $booking)
    {
        $raisedBy = $dispute->raised_by_type === 'customer' ? 'Customer' : 'Provider';
        return $this->toAdmins(
            'dispute',
            'New Dispute Created',
            "{$raisedBy} raised a dispute for booking #{$booking->bookingID}: " . substr($dispute->description, 0, 100),
            [
                'dispute_id' => $dispute->disputeID,
                'booking_id' => $booking->bookingID,
                'raised_by' => $dispute->raised_by_type,
                'title' => $dispute->title,
                'status' => $dispute->status,
            ]
        );
    }

    /**
     * Notify admins of dispute message
     */
    public function notifyAdminsDisputeMessage($dispute, $message, $senderType, $senderName)
    {
        return $this->toAdmins(
            'dispute_message',
            'New Dispute Message',
            "{$senderName} ({$senderType}) sent a message in dispute #{$dispute->disputeID}",
            [
                'dispute_id' => $dispute->disputeID,
                'message_id' => $message->id,
                'sender_type' => $senderType,
                'sender_name' => $senderName,
                'message_preview' => substr($message->message, 0, 100),
            ]
        );
    }

    /**
     * Notify admins of withdrawal request
     */
    public function notifyAdminsWithdrawalRequest($withdrawal, $provider)
    {
        return $this->toAdmins(
            'withdrawal_request',
            'New Withdrawal Request',
            "{$provider->fullname} requested withdrawal of {$withdrawal->amount} ETB",
            [
                'withdrawal_id' => $withdrawal->withdrawalID,
                'provider_id' => $provider->providerID,
                'provider_name' => $provider->fullname,
                'amount' => $withdrawal->amount,
                'status' => $withdrawal->status,
            ]
        );
    }

    /**
     * Notify admins of account frozen
     */
    public function notifyAdminsAccountFrozen($user, $userType, $reason)
    {
        $userName = $userType === 'customer' ? $user->fullname : $user->fullname;
        return $this->toAdmins(
            'account_frozen',
            'Account Frozen',
            "{$userType} account frozen: {$userName} - Reason: {$reason}",
            [
                'user_id' => $userType === 'customer' ? $user->customerID : $user->providerID,
                'user_type' => $userType,
                'user_name' => $userName,
                'reason' => $reason,
            ]
        );
    }

    /**
     * Notify admins when a booking is completed (awaiting customer confirmation)
     */
    public function notifyAdminsBookingCompleted($booking, $provider, $customer)
    {
        return $this->toAdmins(
            'booking_completed',
            'Service Completed — Awaiting Confirmation',
            "Provider {$provider->fullname} completed booking #{$booking->bookingID} for {$customer->fullname}. Awaiting customer confirmation.",
            [
                'booking_id'    => $booking->bookingID,
                'provider_id'   => $provider->providerID,
                'provider_name' => $provider->fullname,
                'customer_id'   => $customer->customerID,
                'customer_name' => $customer->fullname,
                'agreed_price'  => $booking->agreed_price,
                'completed_at'  => $booking->completed_at,
            ]
        );
    }

    /**
     * Notify admins when a booking is cancelled
     */
    public function notifyAdminsBookingCancelled($booking, $cancelledBy, $reason = null)
    {
        $name = $cancelledBy === 'customer'
            ? ($booking->customer->fullname ?? 'Customer')
            : ($booking->provider->fullname ?? 'Provider');

        return $this->toAdmins(
            'booking_cancelled',
            'Booking Cancelled',
            "Booking #{$booking->bookingID} was cancelled by {$cancelledBy} ({$name})" . ($reason ? ": {$reason}" : ''),
            [
                'booking_id'    => $booking->bookingID,
                'cancelled_by'  => $cancelledBy,
                'name'          => $name,
                'reason'        => $reason,
                'agreed_price'  => $booking->agreed_price,
            ]
        );
    }

    /**
     * Notify admins when a previously rejected provider updates their profile
     */
    public function notifyAdminsProviderProfileUpdated($provider)
    {
        return $this->toAdmins(
            'provider_re_verification',
            'Provider Updated Profile',
            "Previously rejected provider {$provider->fullname} has updated their profile and requires re-verification.",
            [
                'provider_id' => $provider->providerID,
                'provider_name' => $provider->fullname,
                'provider_email' => $provider->email,
                'provider_phone' => $provider->phone,
            ]
        );
    }
}
