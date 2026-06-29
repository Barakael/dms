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

        $hr = Department::firstOrCreate(
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

        $alphaProject = Project::firstOrCreate(
            ['code' => 'ALPHA'],
            [
                'name' => 'Alpha Project',
                'description' => 'Flagship product initiative',
                'department_id' => $engineering->id,
                'active' => true,
            ]
        );

        $pm = User::firstOrCreate(
            ['email' => 'pm.alpha@company.com'],
            ['name' => 'Alpha PM', 'password' => Hash::make('password')]
        );
        $pm->syncRoles(['project_manager']);
        $alphaProject->update(['manager_user_id' => $pm->id]);

        StaffProfile::firstOrCreate(
            ['user_id' => $pm->id],
            ['department_id' => $engineering->id, 'project_id' => $alphaProject->id, 'title' => 'Project Manager', 'status' => 'active']
        );

        $staff1 = User::firstOrCreate(
            ['email' => 'staff1@company.com'],
            ['name' => 'Staff One', 'password' => Hash::make('password')]
        );
        $staff1->syncRoles(['staff']);
        StaffProfile::firstOrCreate(
            ['user_id' => $staff1->id],
            ['department_id' => $engineering->id, 'project_id' => $alphaProject->id, 'title' => 'Engineer', 'status' => 'active']
        );

        $staff2 = User::firstOrCreate(
            ['email' => 'staff2@company.com'],
            ['name' => 'Staff Two', 'password' => Hash::make('password')]
        );
        $staff2->syncRoles(['staff']);
        StaffProfile::firstOrCreate(
            ['user_id' => $staff2->id],
            ['department_id' => $engineering->id, 'title' => 'Analyst', 'status' => 'active']
        );

        $auditor = User::firstOrCreate(
            ['email' => 'auditor@company.com'],
            ['name' => 'Compliance Auditor', 'password' => Hash::make('password')]
        );
        $auditor->syncRoles(['auditor']);
        StaffProfile::firstOrCreate(
            ['user_id' => $auditor->id],
            ['department_id' => $hr->id, 'title' => 'Auditor', 'status' => 'active']
        );
    }
}
