<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Sanitizes all string inputs on every request.
 *
 * What it does:
 * - Strips HTML tags from all string inputs (prevents <script> injection)
 * - Trims whitespace
 * - Does NOT touch file uploads, arrays of non-strings, or numeric values
 *
 * This runs BEFORE validation, so validators see clean data.
 * Applied globally to all API routes via the 'api' middleware group.
 */
class SanitizeInput
{
    // Fields that should NOT be sanitized (passwords, tokens, raw content)
    private const SKIP_FIELDS = [
        'password',
        'password_confirmation',
        'new_password',
        'current_password',
        'token',
        'push_token',
        'expo_push_token',
        '_token',
    ];

    public function handle(Request $request, Closure $next): mixed
    {
        $input = $request->all();
        $sanitized = $this->sanitizeArray($input);
        $request->replace($sanitized);

        return $next($request);
    }

    private function sanitizeArray(array $data): array
    {
        foreach ($data as $key => $value) {
            if (in_array($key, self::SKIP_FIELDS)) {
                continue; // Don't touch passwords/tokens
            }

            if (is_string($value)) {
                // Strip HTML tags and trim whitespace
                $data[$key] = trim(strip_tags($value));
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeArray($value);
            }
            // Leave integers, booleans, nulls, files untouched
        }

        return $data;
    }
}
