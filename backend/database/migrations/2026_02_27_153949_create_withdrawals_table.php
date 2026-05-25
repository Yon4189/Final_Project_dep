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
        Schema::create('withdrawals', function (Blueprint $table) {
            $table->id();
            $table->string('withdrawal_ref')->unique(); // Unique withdrawal reference
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('ETB');
            $table->string('status')->default('pending'); // pending, processing, completed, failed, cancelled
            
            // Provider information
            $table->unsignedBigInteger('provider_id'); // Link to service provider
            $table->string('provider_bank_name');
            $table->string('provider_account_number');
            $table->string('provider_account_holder_name');
            
            // Chapa transfer specific fields
            $table->string('chapa_transfer_id')->nullable(); // Chapa transfer ID
            $table->string('chapa_transfer_status')->nullable();
            
            // Processing information
            $table->decimal('platform_fee', 10, 2)->default(0); // Platform commission
            $table->decimal('net_amount', 10, 2); // Amount after fees
            $table->text('processing_notes')->nullable();
            $table->text('failure_reason')->nullable();
            
            // Timestamps
            $table->timestamp('processed_at')->nullable(); // When withdrawal was processed
            $table->timestamp('completed_at')->nullable(); // When withdrawal was completed
            $table->timestamps();
            
            // Indexes
            $table->index('withdrawal_ref');
            $table->index('status');
            $table->index('provider_id');
            $table->foreign('provider_id')
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
        Schema::dropIfExists('withdrawals');
    }
};
