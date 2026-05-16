<?php

use App\Models\Conversation;
use App\Models\Customer;
use App\Models\ServiceProvider;
use App\Models\Booking;
use Illuminate\Support\Facades\Broadcast;

/**
 * Private channel: conversation.{conversationID}
 */
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);

    if (!$conversation) {
        return false;
    }

    if ($user instanceof Customer) {
        return (int) $user->customerID === (int) $conversation->customerID;
    }

    if ($user instanceof ServiceProvider) {
        return (int) $user->providerID === (int) $conversation->providerID;
    }

    return false;
});

/**
 * Private channel: booking.{bookingId}
 */
Broadcast::channel('booking.{bookingId}', function ($user, $bookingId) {
    if (!$user) return false;
    
    $booking = Booking::find($bookingId);
    if (!$booking) return false;
    
    if ($user instanceof Customer) {
        return (int) $user->customerID === (int) $booking->customerID;
    }

    if ($user instanceof ServiceProvider) {
        return (int) $user->providerID === (int) $booking->providerID;
    }

    return false;
});
