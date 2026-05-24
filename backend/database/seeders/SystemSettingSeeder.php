<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class SystemSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'setting_key' => 'commission_percentage',
                'setting_value' => '10',
                'setting_type' => 'integer',
                'description' => 'Platform commission percentage for each booking'
            ],
            [
                'setting_key' => 'app_name',
                'setting_value' => 'HB Service Finder',
                'setting_type' => 'string',
                'description' => 'Name of the application'
            ],
            [
                'setting_key' => 'maintenance_mode',
                'setting_value' => '0',
                'setting_type' => 'boolean',
                'description' => 'Turn on/off maintenance mode'
            ],
            [
                'setting_key' => 'minimum_withdrawal_amount',
                'setting_value' => '100',
                'setting_type' => 'integer',
                'description' => 'Minimum amount a provider can withdraw'
            ]
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['setting_key' => $setting['setting_key']],
                $setting
            );
        }
    }
}
