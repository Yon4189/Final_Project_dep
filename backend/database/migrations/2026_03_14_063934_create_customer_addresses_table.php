<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_addresses', function (Blueprint $table) {
            $table->id('addressID');
            $table->unsignedBigInteger('customerID');
            $table->enum('label', ['home', 'office', 'other'])->default('home');
            $table->string('custom_label')->nullable(); // For 'other' option
            $table->string('full_address');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->string('place_id')->nullable(); // Google Places ID
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            
            // Foreign key
            $table->foreign('customerID')
                  ->references('customerID')
                  ->on('customers')
                  ->onDelete('cascade');
                  
            // Indexes
            $table->index('customerID');
            $table->index('is_default');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_addresses');
    }
};