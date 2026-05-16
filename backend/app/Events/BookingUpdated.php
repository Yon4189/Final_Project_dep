<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BookingUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;
    public $notification_model;

    public function __construct(Notification $notification)
    {
        $this->notification_model = $notification;
        $this->notification = [
            'id' => $notification->notificationID,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'data' => $notification->data,
            'related_booking_id' => $notification->related_booking_id,
            'created_at' => $notification->created_at->toIso8601String(),
        ];
    }

    /**
     * Broadcast on the relevant user's private channel.
     */
    public function broadcastOn(): array
    {
        $class = $this->notification_model->notifiable_type;
        $id = $this->notification_model->notifiable_id;
        
        // Map class names to simple strings if necessary
        $type = str_contains($class, 'Customer') ? 'customer' : (str_contains($class, 'ServiceProvider') ? 'provider' : strtolower(class_basename($class)));
        
        return [
            new PrivateChannel($type . '.' . $id),
        ];
    }

    /**
     * Event name for the client.
     */
    public function broadcastAs(): string
    {
        return 'BookingUpdated';
    }

    /**
     * Data sent to the client.
     */
    public function broadcastWith(): array
    {
        return $this->notification;
    }
}
