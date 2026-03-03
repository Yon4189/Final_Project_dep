<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable; // change this!
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens; // add this!
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class Admin extends Authenticatable // changed from Model
{
    use HasApiTokens, HasFactory, Notifiable; // added HasApiTokens

    protected $table = 'admins';
    protected $primaryKey = 'adminID';

    protected $fillable = [
        'fullname',
        'email',
        'phone',
        'password'
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
}