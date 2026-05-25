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
        Schema::create('chats', function (Blueprint $table) {
            $table->id('chatID');

            $table->unsignedBigInteger('senderID');
            $table->enum('sender_type', ['customer', 'provider']);

            $table->unsignedBigInteger('receiverID');
            $table->enum('receiver_type', ['customer', 'provider']);

            $table->unsignedBigInteger('bookingID')->nullable();

            $table->text('message');
            $table->boolean('is_seen')->default(false);

            $table->timestamp('created_at')->useCurrent();

            // Foreign key only for booking (nullable)
            $table->foreign('bookingID')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chats');
    }
};