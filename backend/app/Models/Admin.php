<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; // use for login
use Illuminate\Notifications\Notifiable;

class Admin extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $primaryKey = 'adminID'; // primary key

    protected $fillable = [
        'fullname', 'email', 'phone', 'password'
    ];

    // hide password from serialization
    protected $hidden = [
        'password'
    ];

    // cast attributes
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }
}
