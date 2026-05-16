<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasFactory;
    protected $primaryKey = 'walletID';

    protected $fillable = [
        'providerID',
        'available_balance',
        'pending_balance',
    ];

    public function serviceProvider()
    {
        return $this->belongsTo(ServiceProvider::class);
    }

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class, 'walletID', 'walletID');
    }

    public function withdrawals()
    {
        return $this->hasMany(Withdrawal::class);
    }
}
