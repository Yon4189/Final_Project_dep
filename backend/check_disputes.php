<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Dispute;
use Illuminate\Support\Facades\DB;

$stats = Dispute::select('status', DB::raw('count(*) as total'))
    ->groupBy('status')
    ->get();

echo "Dispute Status Stats:\n";
foreach ($stats as $stat) {
    echo "- {$stat->status}: {$stat->total}\n";
}

$recent = Dispute::orderBy('created_at', 'desc')->limit(5)->get(['disputeID', 'status', 'raised_by_id', 'against_id']);
echo "\nRecent Disputes:\n";
foreach ($recent as $d) {
    echo "ID: {$d->disputeID}, Status: {$d->status}, Raiser: {$d->raised_by_id}, Target: {$d->against_id}\n";
}
