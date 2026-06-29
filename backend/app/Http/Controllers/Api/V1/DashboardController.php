<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Document;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $docQuery = Document::accessibleBy($user);

        $recentActivity = AuditLog::with(['user', 'document'])
            ->when(! $user->isSystemAdmin(), function ($q) use ($user) {
                $headedDeptIds = Department::where('head_user_id', $user->id)->pluck('id');
                $managedProjectIds = Project::where('manager_user_id', $user->id)->pluck('id');

                $q->where(function ($inner) use ($user, $headedDeptIds, $managedProjectIds) {
                    $inner->where('user_id', $user->id)
                        ->orWhereHas('document', fn ($d) => $d
                            ->whereIn('department_id', $headedDeptIds)
                            ->orWhereIn('project_id', $managedProjectIds));
                });
            })
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user_name' => $log->user?->name,
                'document_title' => $log->document?->title,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'documents' => [
                'total' => (clone $docQuery)->count(),
                'active' => (clone $docQuery)->where('status', 'active')->count(),
                'pending_scan' => (clone $docQuery)->where('status', 'pending_scan')->count(),
                'quarantined' => (clone $docQuery)->where('status', 'quarantined')->count(),
                'archived' => (clone $docQuery)->where('status', 'archived')->count(),
            ],
            'departments' => $user->isSystemAdmin()
                ? Department::count()
                : Department::where('head_user_id', $user->id)
                    ->orWhereHas('staff', fn ($s) => $s->where('user_id', $user->id))
                    ->count(),
            'projects' => $user->isSystemAdmin()
                ? Project::count()
                : Project::where('manager_user_id', $user->id)
                    ->orWhereHas('staff', fn ($s) => $s->where('user_id', $user->id))
                    ->count(),
            'notifications_unread' => $user->unreadNotifications()->count(),
            'recent_activity' => $recentActivity,
        ]);
    }
}
