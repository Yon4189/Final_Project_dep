<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->string('source')->default('chapa');       // 'chapa', 'chapa_transfer'
            $table->string('tx_ref')->nullable()->index();    // payment reference
            $table->text('payload');                          // raw JSON body
            $table->string('status')->default('pending');     // pending, processed, failed
            $table->text('error_message')->nullable();        // last error if failed
            $table->unsignedTinyInteger('retry_count')->default(0);
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_retry_at']); // for retry job query
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_logs');
    }
};
