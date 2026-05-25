<?php
// database/migrations/xxxx_create_notifications_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notificationID');
            $table->string('notifiable_type'); // 'customer' or 'provider'
            $table->unsignedBigInteger('notifiable_id');
            $table->string('type'); // 'booking_request', 'booking_accepted', etc.
            $table->string('title')->nullable();
            $table->text('message');
            $table->json('data')->nullable(); // Additional data
            $table->unsignedBigInteger('related_booking_id')->nullable();
            $table->boolean('is_seen')->default(false);
            $table->timestamp('seen_at')->nullable();
            $table->boolean('push_sent')->default(false);
            $table->timestamp('push_sent_at')->nullable();
            $table->timestamps();

            // Indexes for fast queries
            $table->index(['notifiable_type', 'notifiable_id', 'is_seen']);
            $table->index(['notifiable_type', 'notifiable_id', 'created_at']);
            $table->index('type');
            
            // Foreign key
            $table->foreign('related_booking_id')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
}