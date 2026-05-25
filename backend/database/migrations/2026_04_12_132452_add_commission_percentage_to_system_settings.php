<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Insert commission percentage setting (default 10%)
        DB::table('system_settings')->insert([
            'setting_key' => 'commission_percentage',
            'setting_value' => '10',
            'setting_type' => 'integer',
            'description' => 'Platform commission percentage on payments (1-99)',
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('system_settings')
            ->where('setting_key', 'commission_percentage')
            ->delete();
    }
};
