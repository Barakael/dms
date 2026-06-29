<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'department_id' => $this->department_id,
            'project_id' => $this->project_id,
            'folder_id' => $this->folder_id,
            'status' => $this->status,
            'visibility' => $this->visibility,
            'mime_type' => $this->mime_type,
            'original_filename' => $this->original_filename,
            'file_size' => $this->file_size,
            'file_size_human' => $this->formatBytes($this->file_size),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'department' => $this->whenLoaded('department', fn () => new DepartmentResource($this->department)),
            'project' => $this->whenLoaded('project', fn () => new ProjectResource($this->project)),
            'folder' => $this->whenLoaded('folder', fn () => new FolderResource($this->folder)),
            'uploader' => $this->whenLoaded('uploader', fn () => new UserResource($this->uploader)),
            'permissions' => DocumentPermissionResource::collection($this->whenLoaded('permissions')),
            'versions' => DocumentVersionResource::collection($this->whenLoaded('versions')),
            'scan_results' => ScanResultResource::collection($this->whenLoaded('scanResults')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'is_previewable' => $this->isPreviewable(),
            'can_delete' => $user ? Gate::forUser($user)->allows('delete', $this->resource) : false,
            'can_request_deletion' => $user ? Gate::forUser($user)->allows('requestDeletion', $this->resource) : false,
            'can_update' => $user ? Gate::forUser($user)->allows('update', $this->resource) : false,
        ];
    }

    protected function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . ' MB';
        }

        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }

        return $bytes . ' B';
    }

    protected function isPreviewable(): bool
    {
        return in_array($this->mime_type, ['application/pdf', 'image/png', 'image/jpeg', 'image/gif'], true);
    }
}
