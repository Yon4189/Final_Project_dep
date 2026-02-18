<?php  

namespace App\Models;  

use Illuminate\Database\Eloquent\Factories\HasFactory;  
use Illuminate\Database\Eloquent\Model;  

class Catagory extends Model  
{  
    use HasFactory;  
    protected $table = 'catagories';
    public $timestamps = false; // no created_at or update_at columns

    protected $primaryKey = 'catagoryID'; // primary key  

    // Make status fillable as well
    protected $fillable = [  
        'name', 
        'description', 
        'status' 
    ];  

    // a category can have many services  
    public function services() {  
        return $this->hasMany(Service::class, 'catagoryID', 'catagoryID'); // fk, local key  
    }  
}