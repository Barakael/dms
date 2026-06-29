<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AuditLog::with(['user', 'document.department', 'document.project'])->latest();

        if ($request->user()->hasRole('auditor') || $request->user()->isSystemAdmin()) {
            // full access
        } elseif ($request->user()->isDepartmentHead() || $request->user()->isProjectManager()) {
            $headedDeptIds = Department::where('head_user_id', $request->user()->id)->pluck('id');
            $managedProjectIds = Project::where('manager_user_id', $request->user()->id)->pluck('id');

            $query->whereHas('document', function ($q) use ($headedDeptIds, $managedProjectIds) {
                $q->whereIn('department_id', $headedDeptIds)
                    ->orWhereIn('project_id', $managedProjectIds);
            });
        } else {
            abort(403);
        }

        if ($documentId = $request->get('document_id')) {
            $query->where('document_id', $documentId);
        }

        if ($action = $request->get('action')) {
            $query->where('action', $action);
        }

        return AuditLogResource::collection($query->paginate(50));
    }
}
