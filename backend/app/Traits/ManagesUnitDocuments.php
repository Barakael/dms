<?php

namespace App\Traits;

use App\Models\Department;
use App\Models\Document;
use App\Models\Project;
use App\Models\User;

trait ManagesUnitDocuments
{
    protected function isUnitManager(User $user, Document $document): bool
    {
        if ($document->department_id) {
            $dept = $document->relationLoaded('department')
                ? $document->department
                : Department::find($document->department_id);

            if ($dept && $dept->head_user_id === $user->id) {
                return true;
            }
        }

        if ($document->project_id) {
            $project = $document->relationLoaded('project')
                ? $document->project
                : Project::find($document->project_id);

            if ($project && $project->manager_user_id === $user->id) {
                return true;
            }
        }

        return false;
    }

    protected function userHasDocumentPermission(User $user, Document $document, array $permissions): bool
    {
        return $document->permissions()
            ->where('user_id', $user->id)
            ->whereIn('permission', $permissions)
            ->exists();
    }

    protected function canManageUnit(User $user, ?int $departmentId, ?int $projectId): bool
    {
        if ($user->isSystemAdmin()) {
            return true;
        }

        if ($departmentId && Department::where('id', $departmentId)->where('head_user_id', $user->id)->exists()) {
            return true;
        }

        if ($projectId && Project::where('id', $projectId)->where('manager_user_id', $user->id)->exists()) {
            return true;
        }

        return false;
    }
}
