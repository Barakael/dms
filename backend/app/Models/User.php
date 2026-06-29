<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $guard_name = 'sanctum';

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function staffProfile(): HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function uploadedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'uploaded_by');
    }

    public function documentPermissions(): HasMany
    {
        return $this->hasMany(DocumentPermission::class);
    }

    public function headedDepartments(): HasMany
    {
        return $this->hasMany(Department::class, 'head_user_id');
    }

    public function managedProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'manager_user_id');
    }

    public function isSystemAdmin(): bool
    {
        return $this->hasRole('system_admin');
    }

    public function isDepartmentHead(): bool
    {
        return $this->hasRole('department_head');
    }

    public function isProjectManager(): bool
    {
        return $this->hasRole('project_manager');
    }

    public function isUnitManager(): bool
    {
        return $this->isSystemAdmin() || $this->isDepartmentHead() || $this->isProjectManager();
    }
}
