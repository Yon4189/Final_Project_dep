<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispute_messages', function (Blueprint $table) {
            $table->id('messageID');
            $table->unsignedBigInteger('disputeID');
            $table->unsignedBigInteger('sender_id');
            $table->string('sender_type'); // 'customer', 'provider', 'admin'
            $table->text('message');
            $table->json('attachments')->nullable();
            $table->boolean('is_admin_only')->default(false); // Private notes
            $table->timestamps();
            
            $table->foreign('disputeID')->references('disputeID')->on('disputes')->onDelete('cascade');
            $table->index('disputeID');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispute_messages');
    }
};