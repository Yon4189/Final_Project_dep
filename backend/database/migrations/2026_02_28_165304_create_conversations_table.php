<?php
// database/migrations/xxxx_create_conversations_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateConversationsTable extends Migration
{
    public function up()
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id('conversationID');
            $table->unsignedBigInteger('customerID');
            $table->unsignedBigInteger('providerID');
            $table->unsignedBigInteger('bookingID')->nullable(); // Optional link to booking
            $table->text('last_message')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->integer('customer_unread_count')->default(0);
            $table->integer('provider_unread_count')->default(0);
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamps();

            // Foreign keys
            $table->foreign('customerID')
                  ->references('customerID')
                  ->on('customers')
                  ->onDelete('cascade');
                  
            $table->foreign('providerID')
                  ->references('providerID')
                  ->on('service_providers')
                  ->onDelete('cascade');
                  
            $table->foreign('bookingID')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('set null');

            // Ensure one conversation per customer-provider pair per booking
            $table->unique(['customerID', 'providerID', 'bookingID'], 'unique_conversation');
        });
    }

    public function down()
    {
        Schema::dropIfExists('conversations');
    }
}