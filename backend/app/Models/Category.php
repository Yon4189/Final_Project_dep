<?php  

namespace App\Models;  

use Illuminate\Database\Eloquent\Factories\HasFactory;  
use Illuminate\Database\Eloquent\Model;  

class Category extends Model  
{  
    use HasFactory;  
    protected $table = 'catagories';
    public $timestamps = false; // no created_at or update_at columns

    protected $primaryKey = 'catagoryID'; // primary key  

    // Make status fillable as well
    protected $fillable = [  
        'name', 
        'icon',
        'description', 
    ];  

    // a category can have many services  
    public function services() {  
        return $this->hasMany(Service::class, 'catagoryID', 'catagoryID'); // fk, local key  
    }  

    // a category can have many service providers
    public function providers() {
        return $this->hasMany(ServiceProvider::class, 'catagoryID', 'catagoryID');
    }

    /**
     * Get absolute URL for category icon
     */
    public function getIconAttribute($value)
    {
        if (!$value) return null;
        if (str_starts_with($value, 'http') || str_starts_with($value, 'https')) {
            return $value;
        }
        // If it has a standard image file extension or contains a folder path, return storage asset URL
        if (preg_match('/\.(jpg|jpeg|png|gif|svg)$/i', $value) || str_contains($value, '/')) {
            return asset('storage/' . $value);
        }
        // Otherwise, it is a plain emoji, return it as-is
        return $value;
    }
}