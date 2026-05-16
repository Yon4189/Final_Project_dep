<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

class FileUploadValidator
{
    /**
     * Allowed image magic bytes (file signatures)
     * These are the actual bytes at the start of valid image files.
     * A renamed PHP file will NOT have these bytes.
     */
    private const IMAGE_SIGNATURES = [
        'jpg'  => ["\xFF\xD8\xFF"],
        'jpeg' => ["\xFF\xD8\xFF"],
        'png'  => ["\x89PNG\r\n\x1a\n"],
        'gif'  => ["GIF87a", "GIF89a"],
        'webp' => ["RIFF"],
    ];

    private const PDF_SIGNATURE = '%PDF';

    /**
     * Validate an uploaded image file.
     * Checks actual file content (magic bytes), not just extension/MIME.
     *
     * @param UploadedFile $file
     * @param int $maxSizeKb  Max size in kilobytes (default 2048 = 2MB)
     * @throws \InvalidArgumentException
     */
    public function validateImage(UploadedFile $file, int $maxSizeKb = 2048): void
    {
        $this->validateSize($file, $maxSizeKb);
        $this->validateImageMagicBytes($file);
    }

    /**
     * Validate an uploaded document (image or PDF).
     *
     * @param UploadedFile $file
     * @param int $maxSizeKb
     * @throws \InvalidArgumentException
     */
    public function validateDocument(UploadedFile $file, int $maxSizeKb = 4096): void
    {
        $this->validateSize($file, $maxSizeKb);

        $bytes = $this->readMagicBytes($file);

        // Check if it's a valid image
        foreach (self::IMAGE_SIGNATURES as $signatures) {
            foreach ($signatures as $sig) {
                if (str_starts_with($bytes, $sig)) {
                    return; // Valid image
                }
            }
        }

        // Check if it's a valid PDF
        if (str_starts_with($bytes, self::PDF_SIGNATURE)) {
            return; // Valid PDF
        }

        Log::warning('File upload rejected: invalid magic bytes', [
            'original_name' => $file->getClientOriginalName(),
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
        ]);

        throw new \InvalidArgumentException(
            'Invalid file type. Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.'
        );
    }

    /**
     * Generate a safe filename — no path traversal, no executable extensions.
     */
    public function safeFilename(UploadedFile $file, string $prefix = ''): string
    {
        $ext = strtolower($file->getClientOriginalExtension());

        // Whitelist of safe extensions
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
        if (!in_array($ext, $allowed)) {
            $ext = 'jpg'; // fallback
        }

        return ($prefix ? $prefix . '_' : '') . uniqid() . '_' . time() . '.' . $ext;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function validateSize(UploadedFile $file, int $maxSizeKb): void
    {
        $sizeKb = $file->getSize() / 1024;
        if ($sizeKb > $maxSizeKb) {
            throw new \InvalidArgumentException(
                "File too large. Maximum size is {$maxSizeKb}KB, got " . round($sizeKb) . 'KB.'
            );
        }
    }

    private function validateImageMagicBytes(UploadedFile $file): void
    {
        $bytes = $this->readMagicBytes($file);

        foreach (self::IMAGE_SIGNATURES as $type => $signatures) {
            foreach ($signatures as $sig) {
                if (str_starts_with($bytes, $sig)) {
                    return; // Valid image
                }
            }
        }

        Log::warning('Image upload rejected: invalid magic bytes', [
            'original_name' => $file->getClientOriginalName(),
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
        ]);

        throw new \InvalidArgumentException(
            'Invalid image file. Only JPG, PNG, GIF, and WebP images are allowed.'
        );
    }

    private function readMagicBytes(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'rb');
        $bytes  = fread($handle, 12);
        fclose($handle);
        return $bytes;
    }
}
