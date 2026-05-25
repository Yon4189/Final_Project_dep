<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $conversationId;
    public array $messageData;

    public function __construct(Message $message)
    {
        $this->conversationId = $message->conversationID;

        $this->messageData = [
            'id'             => 'msg_' . $message->messageID,
            'messageID'      => $message->messageID,
            'conversationID' => $message->conversationID,
            'message'        => $message->message,
            'sender_type'    => $message->sender_type,
            'sender_id'      => $message->sender_id,
            'status'         => 'sent',
            'created_at'     => $message->created_at?->toIso8601String(),
        ];
    }

    /**
     * Each conversation gets its own private channel.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    /**
     * Short event name for the JS client to listen to.
     */
    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    /**
     * Data sent to the client.
     */
    public function broadcastWith(): array
    {
        return $this->messageData;
    }
}
