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
        $table->string('phone');
        $table->string('email')->unique();
        $table->string('password');
        
        // 1. Define the column FIRST
        $table->unsignedBigInteger('catagoryID'); 
        
        $table->string('profilePicture')->nullable();
        $table->string('idPhoto');
        $table->boolean('isVerified')->default(false);
        $table->text('bio')->nullable();
        $table->float('walletBalance')->default(0);
        $table->float('serviceRadiusKm')->nullable();
        $table->timestamps();

        // 2. Add the foreign key using the SAME name defined above
        $table->foreign('catagoryID')->references('catagoryID')->on('catagories')->onDelete('cascade');
    });
}

    public function down(): void
    {
        Schema::dropIfExists('serviceProviders');
    }
};
