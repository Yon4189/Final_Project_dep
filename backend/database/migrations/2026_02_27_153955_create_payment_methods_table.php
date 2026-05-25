<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // telebirr, cbe-birr, awash-birr, etc.
            $table->string('display_name'); // User-friendly display name
            $table->string('code')->unique(); // Unique code for the method
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->json('supported_currencies')->nullable(); // Array of supported currencies
            $table->decimal('min_amount', 10, 2)->nullable();
            $table->decimal('max_amount', 10, 2)->nullable();
            $table->decimal('transaction_fee', 5, 2)->default(0); // Fee percentage
            $table->decimal('fixed_fee', 10, 2)->default(0); // Fixed fee amount
            $table->json('config_data')->nullable(); // Additional configuration
            $table->timestamps();
            
            // Indexes
            $table->index('code');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
