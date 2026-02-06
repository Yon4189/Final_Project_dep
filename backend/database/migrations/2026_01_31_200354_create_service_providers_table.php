<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('serviceProviders', function (Blueprint $table) {
            $table->id('providerID');                   
            $table->string('fullname');                 
            $table->string('phone')->unique();                    
            $table->string('email')->unique();          
            $table->string('password');                 
            $table->unsignedBigInteger('catagoryID'); // FK to catagories
            $table->string('profilePicture')->nullable();  // nullable cuz its optional
            $table->string('idPhoto');                  
            $table->boolean('isVerified')->default(false); 
            $table->string('bio')->nullable();          
            $table->float('walletBalance')->default(0); 
            $table->float('serviceRadiusKm')->nullable(); 
            $table->timestamps();

            $table->foreign('catagoryID')->references('catagoryID')->on('catagories');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('serviceProviders');
    }
};
