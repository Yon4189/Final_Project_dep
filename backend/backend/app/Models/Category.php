<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $primaryKey = 'categoryID'; // primary key

    protected $fillable = [
        'name', 'description'
    ];

    // a category can have many services
    public function services() {
        return $this->hasMany(Service::class, 'categoryID', 'categoryID'); // fk, local key
    }
}
