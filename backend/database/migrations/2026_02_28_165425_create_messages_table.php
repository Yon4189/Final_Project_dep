<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMessagesTable extends Migration
{
    public function up()
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id('messageID');
            $table->unsignedBigInteger('conversationID');
            $table->enum('sender_type', ['customer', 'provider']);
            $table->unsignedBigInteger('sender_id');
            $table->text('message');
            $table->boolean('is_seen')->default(false);
            $table->timestamp('seen_at')->nullable();
            $table->timestamps();

            // Foreign key
            $table->foreign('conversationID')
                  ->references('conversationID')
                  ->on('conversations')
                  ->onDelete('cascade');

            // Indexes for fast queries
            $table->index(['conversationID', 'created_at']);
            $table->index(['sender_type', 'sender_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('messages');
    }
}