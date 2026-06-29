<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentPermission;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Support\Collection;

class DocumentAccessService
{
    public function grantDefaultAccess(Document $document, User $uploader): void
    {
        $permissions = ['view', 'download', 'edit', 'share'];

        foreach ($permissions as $permission) {
            DocumentPermission::firstOrCreate([
                'document_id' => $document->id,
                'user_id' => $uploader->id,
                'permission' => $permission,
            ], [
                'granted_by' => $uploader->id,
            ]);
        }

        if ($document->department?->head_user_id && $document->department->head_user_id !== $uploader->id) {
            $this->grantToUser($document, $document->department->head, $permissions, $uploader);
        }

        if ($document->project?->manager_user_id && $document->project->manager_user_id !== $uploader->id) {
            $this->grantToUser($document, $document->project->manager, $permissions, $uploader);
        }
    }

    public function grantToUser(Document $document, User $user, array $permissions, User $grantedBy): void
    {
        foreach ($permissions as $permission) {
            DocumentPermission::updateOrCreate(
                [
                    'document_id' => $document->id,
                    'user_id' => $user->id,
                    'permission' => $permission,
                ],
                ['granted_by' => $grantedBy->id]
            );
        }
    }

    public function revokeFromUser(Document $document, User $user, ?array $permissions = null): void
    {
        $query = DocumentPermission::where('document_id', $document->id)
            ->where('user_id', $user->id);

        if ($permissions) {
            $query->whereIn('permission', $permissions);
        }

        $query->delete();
    }

    public function applyPreset(Document $document, string $preset, User $grantedBy): int
    {
        $staff = $this->resolvePresetStaff($document, $preset);
        $permissions = ['view', 'download'];

        foreach ($staff as $user) {
            if ($user->id === $grantedBy->id) {
                continue;
            }
            $this->grantToUser($document, $user, $permissions, $grantedBy);
        }

        return $staff->count();
    }

    public function resolvePresetStaff(Document $document, string $preset): Collection
    {
        return match ($preset) {
            'all_staff' => $this->allStaffForDocument($document),
            'managers_only' => $this->managersForDocument($document),
            default => collect(),
        };
    }

    protected function allStaffForDocument(Document $document): Collection
    {
        $query = StaffProfile::with('user')->where('status', 'active');

        if ($document->department_id) {
            $query->where('department_id', $document->department_id);
        } elseif ($document->project_id) {
            $query->where('project_id', $document->project_id);
        }

        return $query->get()->pluck('user')->filter();
    }

    protected function managersForDocument(Document $document): Collection
    {
        $managers = collect();

        if ($document->department?->head) {
            $managers->push($document->department->head);
        }

        if ($document->project?->manager) {
            $managers->push($document->project->manager);
        }

        return $managers->unique('id');
    }
}
