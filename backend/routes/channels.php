<?php

use App\Models\Conversation;
use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Broadcast;

/**
 * Private channel: conversation.{conversationID}
 *
 * Only the customer or provider who owns the conversation
 * may subscribe.  The authenticated "user" may be either a
 * Customer or a ServiceProvider (both go through Sanctum).
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
