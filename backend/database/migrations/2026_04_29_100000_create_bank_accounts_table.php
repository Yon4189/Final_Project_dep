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
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id('bankAccountID');
            $table->unsignedBigInteger('providerID');
            $table->string('bankName');
            $table->string('accountName');
            $table->string('accountNumber')->unique(); // Unique constraint
            $table->string('branch')->nullable();
            $table->string('swiftCode')->nullable();
            $table->boolean('is_primary')->default(true); // Mark if this is the primary account
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('providerID')
                  ->references('providerID')
                  ->on('service_providers')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_accounts');
    }
};
