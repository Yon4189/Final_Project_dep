<?php
namespace App\Http\Controllers;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index($providerID)
    {
        $notifications = Notification::where('providerID', $providerID)
                                     ->orderBy('created_at', 'desc')
                                     ->get();

        return response()->json([
            'success' => true,
            'data' => $notifications
        ]);
    }
}