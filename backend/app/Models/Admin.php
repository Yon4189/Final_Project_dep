<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class Admin extends Authenticatable
{
    use HasFactory, HasApiTokens, Notifiable;

    protected $table = 'admins';
    protected $primaryKey = 'adminID';

    protected $fillable = [
        'fullname',
        'email',
        'phone',
        'password',
        'profilePicture'
    ];

    // hidden fields (like password) when returning JSON
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Optional: automatically hash password when setting it
    public function setPasswordAttribute($password)
    {
        $this->attributes['password'] = Hash::make($password);
    }

    /**
     * Get absolute URL for profile picture
     */
    public function getProfilePictureAttribute($value)
    {
        if (!$value) return null;
        // Cloudinary and other full URLs are returned as-is
        if (str_starts_with($value, 'http')) return $value;
        // Legacy local files
        return asset($value);
    }
}