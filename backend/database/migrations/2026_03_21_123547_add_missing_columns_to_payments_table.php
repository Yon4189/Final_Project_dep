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
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'chapa_response')) {
                $table->json('chapa_response')->nullable()->after('status');
            }
            if (!Schema::hasColumn('payments', 'held_until')) {
                $table->timestamp('held_until')->nullable()->after('chapa_response');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['chapa_response', 'held_until']);
        });
    }
};
