<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class BackupDatabase extends Command
{
    protected $signature   = 'db:backup';
    protected $description = 'Create a compressed database backup in storage/backups/';

    public function handle(): int
    {
        $host     = config('database.connections.mysql.host', '127.0.0.1');
        $port     = config('database.connections.mysql.port', '3306');
        $database = config('database.connections.mysql.database');
        $username = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');

        $backupDir = storage_path('backups');
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $filename = 'backup_' . now()->format('Ymd_His') . '.sql';
        $filepath = $backupDir . '/' . $filename;

        $passwordFlag = $password ? "-p\"{$password}\"" : '';

        $command = "mysqldump -h {$host} -P {$port} -u {$username} {$passwordFlag} "
                 . "--single-transaction --routines --triggers "
                 . "{$database} > \"{$filepath}\"";

        $this->info("Backing up database: {$database}");

        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            $this->error('Backup failed!');
            Log::error('Database backup failed', ['database' => $database]);
            return self::FAILURE;
        }

        // Compress
        exec("gzip \"{$filepath}\"");
        $compressed = $filepath . '.gz';

        $sizeMb = round(filesize($compressed) / 1024 / 1024, 2);
        $this->info("Backup created: {$filename}.gz ({$sizeMb} MB)");
        Log::info('Database backup created', ['file' => $filename . '.gz', 'size_mb' => $sizeMb]);

        // Clean up backups older than 30 days
        $files = glob($backupDir . '/backup_*.sql.gz');
        $cutoff = now()->subDays(30)->timestamp;
        $deleted = 0;
        foreach ($files as $file) {
            if (filemtime($file) < $cutoff) {
                unlink($file);
                $deleted++;
            }
        }

        if ($deleted > 0) {
            $this->info("Cleaned up {$deleted} old backup(s).");
        }

        return self::SUCCESS;
    }
}
