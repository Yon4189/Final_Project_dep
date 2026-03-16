<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProviderTracking extends Model
{
    protected $table = 'provider_trackings';
    protected $primaryKey = 'trackingID';
    
    protected $fillable = [
        'providerID',
        'bookingID',
        'latitude',
        'longitude',
        'speed',
        'heading',
        'tracked_at'
    ];
    
    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'tracked_at' => 'datetime'
    ];
    
    /**
     * Get the provider that owns this tracking record
     */
    public function provider()
    {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }
    
    /**
     * Get the booking this tracking belongs to
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class, 'bookingID', 'bookingID');
    }
    
    /**
     * Scope to get latest location for a booking
     */
    public function scopeLatestForBooking($query, $bookingID)
    {
        return $query->where('bookingID', $bookingID)
                     ->orderBy('tracked_at', 'desc')
                     ->limit(1);
    }
    
    /**
     * Scope to get tracking history for a booking
     */
    public function scopeHistoryForBooking($query, $bookingID, $minutes = 30)
    {
        return $query->where('bookingID', $bookingID)
                     ->where('tracked_at', '>=', now()->subMinutes($minutes))
                     ->orderBy('tracked_at', 'asc');
    }
}