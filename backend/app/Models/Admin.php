<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable; // Change this
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class Admin extends Authenticatable // Change this
{
    use HasFactory, Notifiable;

    protected $table = 'admins';
    protected $primaryKey = 'adminID';

    protected $fillable = [
        'fullname',
        'email',
        'phone',
        'password'
    ];

    protected $hidden = [
        'password',
    ];

    public function setPasswordAttribute($password)
    {
        // Only hash the password if it's not already hashed
        $this->attributes['password'] = Hash::needsRehash($password) 
            ? Hash::make($password) 
            : $password;
    }
}