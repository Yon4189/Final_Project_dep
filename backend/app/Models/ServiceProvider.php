<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use App\Models\Booking;
use App\Models\Wallet;
use App\Models\Withdrawal;
use App\Models\Service;

class ServiceProvider extends Authenticatable
{
    use HasFactory, HasApiTokens, Notifiable;

    protected $table = 'service_providers';
    protected $primaryKey = 'providerID';

    protected $attributes = [
        'status' => 'pending', // newly registered will have pending status
        'rating' => 0,
        'completed_jobs' => 0,
        'accepted_jobs' => 0,
    ];

    protected $fillable = [
        'fullname', 
        'phone', 
        'email', 
        'password', 
        'service_city', 
        'catagoryID', 
        'idPhoto', 
        'idPhotoType', 
        'credentialPhoto', 
        'status', 
        'bio', 
        'walletBalance', 
        'serviceRadiusKm', 
        'profilePicture',
        'estimatedPrice',
        'current_latitude',
        'current_longitude',
        'rating',
        'completed_jobs',
        'accepted_jobs',
        'approved_at',
        'rejected_at',
        'rejection_reason',
        'average_rating',        
        'total_reviews',         
        'bank_name',             
        'account_number',        
        'account_holder_name',   
        'telebir_number',        
        'telebir_holder_name',   
        'preferred_payout_method',
        'last_withdrawal_at',
        'expo_push_token',
        'business_license',
        'insurance_certificate',
        'certifications'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'current_latitude' => 'decimal:8',
        'current_longitude' => 'decimal:8',
        'rating' => 'float',
        'certifications' => 'array',
    ];

    /**
     * Get the wallet for this provider
     */
    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'providerID', 'providerID');
    }

    /**
     * Get withdrawal requests for this provider
     */
    public function withdrawals()
    {
        return $this->hasMany(Withdrawal::class, 'providerID', 'providerID');
    }

    /**
     * Get the services for this provider
     */
    public function services()
    {
        return $this->hasMany(Service::class, 'providerID', 'providerID');
    }

    /**
     * Get the bookings for this provider (direct relationship)
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'providerID', 'providerID');
    }

    /**
     * Get pending bookings that need response
     */
    public function pendingBookings()
    {
        return $this->hasMany(Booking::class, 'providerID', 'providerID')
                    ->where('status', 'pending')
                    ->where('expires_at', '>', now());
    }

    /**
     * Get active bookings (accepted but not completed)
     */
    public function activeBookings()
    {
        return $this->hasMany(Booking::class, 'providerID', 'providerID')
                    ->whereIn('status', ['accepted', 'in_progress'])
                    ->where('scheduledDate', '>', now());
    }

    /**
     * Get completed bookings
     */
    public function completedBookings()
    {
        return $this->hasMany(Booking::class, 'providerID', 'providerID')
                    ->where('status', 'completed');
    }

    /**
     * Get reviews for this provider (through bookings)
     */
    public function reviews()
    {
        return $this->hasManyThrough(
            Review::class,
            Booking::class,
            'providerID', // Foreign key on bookings table
            'bookingID',  // Foreign key on reviews table
            'providerID', // Local key on providers table
            'bookingID'   // Local key on bookings table
        );
    }

    /**
     * Get the category this provider belongs to
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'catagoryID', 'catagoryID');
    }

    /**
     * Get notifications for this provider (polymorphic)
     */
    public function notifications()
    {
        return $this->morphMany(Notification::class, 'notifiable');
    }

    /**
     * Get payments received by this provider
     */
    public function payments()
    {
        return $this->hasMany(Payment::class, 'providerID', 'providerID');
    }

    /**
     * Check if provider is approved
     */
    public function isApproved(): bool
    {
        return in_array(strtolower($this->status), ['approved', 'active']);
    }

    /**
     * Check if provider is pending approval
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Calculate success rate
     */
    public function getSuccessRateAttribute(): float
    {
        if ($this->accepted_jobs === 0) {
            return 0;
        }
        return round(($this->completed_jobs / $this->accepted_jobs) * 100, 2);
    }

    /**
     * Update provider's average rating from all reviews
     */
    public function updateRating(): void
    {
        $avgRating = $this->reviews()->avg('rating') ?? 0;
        $this->rating = round($avgRating, 2);
        $this->save();
    }

    /**
     * Get total earnings from all completed payments
     */
    public function getTotalEarningsAttribute(): float
    {
        return $this->payments()
            ->where('status', 'released')
            ->sum('provider_amount') ?? 0;
    }

    /**
     * Get pending earnings (releasable but not yet in available balance)
     */
    public function getPendingEarningsAttribute(): float
    {
        if ($this->wallet) {
            return $this->wallet->pending_balance;
        }
        return 0;
    }

    /**
     * Get available balance for withdrawal
     */
    public function getAvailableBalanceAttribute(): float
    {
        if ($this->wallet) {
            return $this->wallet->available_balance;
        }
        return 0;
    }

    /**
     * Scope to only include approved providers
     */
    public function scopeApproved($query)
    {
        return $query->whereIn('status', ['approved', 'Active', 'active']);
    }

    /**
     * Scope to only include providers in a specific city
     */
    public function scopeInCity($query, $city)
    {
        return $query->where('service_city', $city);
    }

    /**
     * Scope to only include providers with specific service category
     */
    public function scopeWithCategory($query, $categoryId)
    {
        return $query->where('catagoryID', $categoryId);
    }

    /**
     * Scope to order by proximity to given coordinates
     */
    public function scopeNearest($query, $latitude, $longitude)
    {
        $sql = "(6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) 
                * cos(radians(current_longitude) - radians(?)) 
                + sin(radians(?)) * sin(radians(current_latitude)))) AS distance";
        
        return $query->select('service_providers.*')
            ->selectRaw($sql, [$latitude, $longitude, $latitude])
            ->orderBy('distance');
    }

    /**
     * Add funds to wallet (for payouts) - Legacy method
     * @deprecated Use wallet->pending_balance instead
     */
    public function addToWallet($amount): void
    {
        $this->walletBalance = ($this->walletBalance ?? 0) + $amount;
        $this->save();
        
        // Also update the wallet table if it exists
        if ($this->wallet) {
            $this->wallet->pending_balance += $amount;
            $this->wallet->save();
        } else {
            // Create wallet if it doesn't exist
            Wallet::create([
                'providerID' => $this->providerID,
                'available_balance' => 0,
                'pending_balance' => $amount
            ]);
        }
    }

    /**
     * Get wallet balance - Legacy method
     * @deprecated Use available_balance attribute instead
     */
    public function getWalletBalanceAttribute()
    {
        return $this->attributes['walletBalance'] ?? 0;
    }

    /**
     * Withdraw from wallet - Legacy method
     * @deprecated Use withdrawal request system instead
     */
    public function withdrawFromWallet($amount): bool
    {
        if (($this->walletBalance ?? 0) < $amount) {
            return false;
        }
        
        $this->walletBalance -= $amount;
        $this->save();
        return true;
    }

        /**
     * Get the city that the provider belongs to
     */
    public function serviceCity()
    {
        return $this->belongsTo(ServiceCity::class, 'service_city', 'name');
    }
}