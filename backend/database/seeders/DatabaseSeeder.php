<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Project;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['system_admin', 'department_head', 'project_manager', 'staff', 'auditor'];
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'sanctum']);
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@company.com'],
            ['name' => 'System Admin', 'password' => Hash::make('password')]
        );
        $admin->syncRoles(['system_admin']);

        $engineering = Department::firstOrCreate(
            ['code' => 'ENG'],
            ['name' => 'Engineering', 'description' => 'Engineering department', 'active' => true]
        );

        Department::firstOrCreate(
            ['code' => 'HR'],
            ['name' => 'Human Resources', 'description' => 'HR department', 'active' => true]
        );

        $headEng = User::firstOrCreate(
            ['email' => 'head.eng@company.com'],
            ['name' => 'Engineering Head', 'password' => Hash::make('password')]
        );
        $headEng->syncRoles(['department_head']);
        $engineering->update(['head_user_id' => $headEng->id]);

        StaffProfile::firstOrCreate(
            ['user_id' => $headEng->id],
            ['department_id' => $engineering->id, 'title' => 'Department Head', 'status' => 'active']
        );

        Project::firstOrCreate(
            ['code' => 'ALPHA'],
            [
                'name' => 'Alpha Project',
                'description' => 'Flagship product initiative',
                'department_id' => $engineering->id,
                'active' => true,
            ]
        );
    }
}
