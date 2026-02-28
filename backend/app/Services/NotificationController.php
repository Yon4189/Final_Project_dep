<?php
// app/Services/NotificationService.php

namespace App\Services;

use App\Models\Notification;
use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Log;

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
            $notification = Notification::create($data);
            
            // Here you would trigger push notification if needed
            $this->sendPushNotification($notification);
            
            return $notification;
        } catch (\Exception $e) {
            Log::error('Failed to create notification: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send push notification (to be implemented with Firebase)
     */
    private function sendPushNotification($notification)
    {
        // This will be implemented when we add Firebase
        // For now, just mark as push not sent
        $notification->push_sent = false;
        $notification->save();
        
        // You can dispatch a job here to send push later
        // dispatch(new SendPushNotificationJob($notification));
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
    const TYPE_PAYMENT_RECEIVED = 'payment_received';
    const TYPE_PAYMENT_RELEASED = 'payment_released';
    const TYPE_NEW_MESSAGE = 'new_message';
    const TYPE_PROVIDER_APPROVED = 'provider_approved';
    const TYPE_PROVIDER_REJECTED = 'provider_rejected';
    const TYPE_REVIEW_RECEIVED = 'review_received';
}