<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StaffManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['system_admin', 'staff'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'sanctum']);
        }
    }

    public function test_admin_can_update_staff(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staffUser = User::factory()->create(['name' => 'Old Name']);
        $staffUser->assignRole('staff');

        $department = Department::create(['name' => 'Eng', 'code' => 'ENG', 'active' => true]);

        $profile = StaffProfile::create([
            'user_id' => $staffUser->id,
            'department_id' => $department->id,
            'title' => 'Engineer',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/staff/{$profile->id}", [
                'name' => 'New Name',
                'title' => 'Senior Engineer',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Senior Engineer');

        $this->assertDatabaseHas('users', ['id' => $staffUser->id, 'name' => 'New Name']);
    }

    public function test_admin_can_delete_staff(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staffUser = User::factory()->create();
        $staffUser->assignRole('staff');

        $profile = StaffProfile::create([
            'user_id' => $staffUser->id,
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/staff/{$profile->id}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $staffUser->id]);
        $this->assertDatabaseMissing('staff_profiles', ['id' => $profile->id]);
    }

    public function test_non_admin_cannot_delete_staff(): void
    {
        $staffUser = User::factory()->create();
        $staffUser->assignRole('staff');

        $other = User::factory()->create();
        $other->assignRole('staff');

        $profile = StaffProfile::create([
            'user_id' => $staffUser->id,
            'status' => 'active',
        ]);

        $this->actingAs($other, 'sanctum')
            ->deleteJson("/api/v1/staff/{$profile->id}")
            ->assertForbidden();
    }
}
