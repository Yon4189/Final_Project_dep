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
        Schema::table('dispute_messages', function (Blueprint $table) {
            // Add parent_message_id for threading/quoting
            $table->unsignedBigInteger('parent_message_id')->nullable()->after('messageID');
            $table->foreign('parent_message_id')
                ->references('messageID')
                ->on('dispute_messages')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispute_messages', function (Blueprint $table) {
            $table->dropForeign(['parent_message_id']);
            $table->dropColumn('parent_message_id');
        });
    }
};
