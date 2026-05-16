<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $fillable = [
        'setting_key',
        'setting_value',
        'setting_type',
        'description'
    ];

    /**
     * Get a system setting value with type casting
     * 
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        // Try to get from cache first (5 minute cache)
        $cacheKey = 'system_setting_' . $key;
        
        return Cache::remember($cacheKey, 300, function () use ($key, $default) {
            $setting = self::where('setting_key', $key)->first();
            
            if (!$setting) {
                return $default;
            }
            
            return self::castValue($setting->setting_value, $setting->setting_type);
        });
    }

    /**
     * Set a system setting value
     * 
     * @param string $key
     * @param mixed $value
     * @param string $type
     * @param string|null $description
     * @return bool
     */
    public static function set(string $key, $value, string $type = 'string', ?string $description = null): bool
    {
        // Validate type
        $validTypes = ['integer', 'decimal', 'boolean', 'json', 'string'];
        if (!in_array($type, $validTypes)) {
            throw new \InvalidArgumentException("Invalid setting type: {$type}");
        }

        // Convert value to string for storage
        $stringValue = self::valueToString($value, $type);

        // Update or create setting
        $setting = self::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $stringValue,
                'setting_type' => $type,
                'description' => $description
            ]
        );

        // Invalidate cache
        Cache::forget('system_setting_' . $key);

        return $setting->wasRecentlyCreated || $setting->wasChanged();
    }

    /**
     * Cast a string value to its proper type
     * 
     * @param string $value
     * @param string $type
     * @return mixed
     */
    protected static function castValue(string $value, string $type)
    {
        return match($type) {
            'integer' => (int) $value,
            'decimal' => (float) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($value, true),
            'string' => $value,
            default => $value
        };
    }

    /**
     * Convert a value to string for storage
     * 
     * @param mixed $value
     * @param string $type
     * @return string
     */
    protected static function valueToString($value, string $type): string
    {
        return match($type) {
            'json' => json_encode($value),
            'boolean' => $value ? '1' : '0',
            default => (string) $value
        };
    }
}
