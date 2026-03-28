<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProviderLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $bookingID;
    public $latitude;
    public $longitude;
    public $speed;
    public $heading;
    public $tracked_at;

    /**
     * Create a new event instance.
     */
    public function __construct($bookingID, $latitude, $longitude, $speed = null, $heading = null, $tracked_at = null)
    {
        $this->bookingID = $bookingID;
        $this->latitude = $latitude;
        $this->longitude = $longitude;
        $this->speed = $speed;
        $this->heading = $heading;
        $this->tracked_at = $tracked_at ?? now()->toDateTimeString();
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('booking.' . $this->bookingID),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'bookingID' => $this->bookingID,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'speed' => $this->speed,
            'heading' => $this->heading,
            'tracked_at' => $this->tracked_at,
        ];
    }
}
