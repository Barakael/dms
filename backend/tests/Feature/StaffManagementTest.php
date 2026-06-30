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

        foreach (['system_admin', 'staff', 'department_head', 'project_manager'] as $role) {
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

    public function test_regular_staff_cannot_list_staff(): void
    {
        $staffUser = User::factory()->create();
        $staffUser->assignRole('staff');

        StaffProfile::create([
            'user_id' => $staffUser->id,
            'status' => 'active',
        ]);

        $this->actingAs($staffUser, 'sanctum')
            ->getJson('/api/v1/staff')
            ->assertForbidden();
    }

    public function test_department_head_only_sees_staff_in_their_department(): void
    {
        $head = User::factory()->create();
        $head->assignRole('department_head');

        $deptA = Department::create(['name' => 'Dept A', 'code' => 'A', 'active' => true, 'head_user_id' => $head->id]);
        $deptB = Department::create(['name' => 'Dept B', 'code' => 'B', 'active' => true]);

        $staffInA = User::factory()->create();
        $staffInA->assignRole('staff');
        StaffProfile::create(['user_id' => $staffInA->id, 'department_id' => $deptA->id, 'status' => 'active']);

        $staffInB = User::factory()->create();
        $staffInB->assignRole('staff');
        StaffProfile::create(['user_id' => $staffInB->id, 'department_id' => $deptB->id, 'status' => 'active']);

        $response = $this->actingAs($head, 'sanctum')
            ->getJson('/api/v1/staff')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertCount(1, $ids);
        $this->assertTrue($ids->contains(StaffProfile::where('user_id', $staffInA->id)->value('id')));
    }

    public function test_department_head_cannot_filter_by_other_department(): void
    {
        $head = User::factory()->create();
        $head->assignRole('department_head');

        $deptA = Department::create(['name' => 'Dept A', 'code' => 'A', 'active' => true, 'head_user_id' => $head->id]);
        $deptB = Department::create(['name' => 'Dept B', 'code' => 'B', 'active' => true]);

        $this->actingAs($head, 'sanctum')
            ->getJson("/api/v1/staff?department_id={$deptB->id}")
            ->assertForbidden();
    }

    public function test_admin_can_filter_staff_by_department(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $deptA = Department::create(['name' => 'Dept A', 'code' => 'A', 'active' => true]);
        $deptB = Department::create(['name' => 'Dept B', 'code' => 'B', 'active' => true]);

        $staffInA = User::factory()->create();
        $staffInA->assignRole('staff');
        $profileA = StaffProfile::create(['user_id' => $staffInA->id, 'department_id' => $deptA->id, 'status' => 'active']);

        $staffInB = User::factory()->create();
        $staffInB->assignRole('staff');
        StaffProfile::create(['user_id' => $staffInB->id, 'department_id' => $deptB->id, 'status' => 'active']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/staff?department_id={$deptA->id}")
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertCount(1, $ids);
        $this->assertTrue($ids->contains($profileA->id));
    }
}
