<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disputes', function (Blueprint $table) {
            $table->id('disputeID');
            $table->unsignedBigInteger('bookingID');
            $table->unsignedBigInteger('raised_by_id'); // CustomerID or ProviderID
            $table->string('raised_by_type'); // 'customer' or 'provider'
            $table->unsignedBigInteger('against_id'); // The other party's ID
            $table->string('against_type'); // 'customer' or 'provider'
            $table->string('title');
            $table->text('description');
            $table->string('category')->nullable(); // 'payment', 'service_quality', 'no_show', 'behavior', etc.
            $table->json('attachments')->nullable(); // Array of file paths
            $table->string('status')->default('pending'); // pending, under_review, resolved, rejected, escalated
            $table->string('priority')->default('medium'); // low, medium, high, urgent
            $table->text('admin_notes')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->string('resolution_type')->nullable(); // refund, partial_refund, cancellation, warning, etc.
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable(); // Admin ID
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('bookingID')->references('bookingID')->on('bookings')->onDelete('cascade');
            
            // Indexes
            $table->index('status');
            $table->index('priority');
            $table->index(['raised_by_type', 'raised_by_id']);
            $table->index(['against_type', 'against_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};