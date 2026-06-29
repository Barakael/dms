<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'department_id', 'project_id', 'folder_id', 'uploaded_by',
        'title', 'description', 'file_path', 'original_filename',
        'mime_type', 'file_size', 'status', 'visibility', 'expires_at',
    ];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(DocumentPermission::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('version_number');
    }

    public function scanResults(): HasMany
    {
        return $this->hasMany(ScanResult::class)->orderByDesc('scanned_at');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->isSystemAdmin()) {
            return $query;
        }

        $headedDeptIds = Department::where('head_user_id', $user->id)->pluck('id');
        $managedProjectIds = Project::where('manager_user_id', $user->id)->pluck('id');
        $permittedDocIds = DocumentPermission::where('user_id', $user->id)->pluck('document_id');

        return $query->where(function (Builder $q) use ($user, $headedDeptIds, $managedProjectIds, $permittedDocIds) {
            $q->where('uploaded_by', $user->id)
                ->orWhereIn('department_id', $headedDeptIds)
                ->orWhereIn('project_id', $managedProjectIds)
                ->orWhereIn('id', $permittedDocIds);
        });
    }

    public function isDownloadable(): bool
    {
        return $this->status === 'active' && $this->file_path;
    }
}
