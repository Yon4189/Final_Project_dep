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
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key', 100)->unique();
            $table->text('setting_value');
            $table->string('setting_type', 20)->default('string'); // integer, decimal, boolean, json, string
            $table->text('description')->nullable();
            $table->timestamps();
            
            // Add index on setting_key for faster lookups
            $table->index('setting_key', 'idx_setting_key');
        });
        
        // Insert default deposit_percentage setting
        DB::table('system_settings')->insert([
            'setting_key' => 'deposit_percentage',
            'setting_value' => '20',
            'setting_type' => 'integer',
            'description' => 'Percentage of agreed price to be paid as deposit (1-99)',
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
