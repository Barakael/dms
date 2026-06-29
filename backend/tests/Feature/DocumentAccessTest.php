<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Document;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DocumentAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['system_admin', 'department_head', 'project_manager', 'staff'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'sanctum']);
        }
    }

    public function test_staff_without_permission_cannot_download_document(): void
    {
        Storage::fake('local');

        $head = User::factory()->create();
        $head->assignRole('department_head');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $otherStaff = User::factory()->create();
        $otherStaff->assignRole('staff');

        $department = Department::create([
            'name' => 'Engineering',
            'code' => 'ENG',
            'head_user_id' => $head->id,
            'active' => true,
        ]);

        $document = Document::create([
            'department_id' => $department->id,
            'uploaded_by' => $staff->id,
            'title' => 'Private Spec',
            'file_path' => 'documents/test.pdf',
            'original_filename' => 'test.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'active',
        ]);

        Storage::disk('local')->put('documents/test.pdf', 'content');

        $this->actingAs($otherStaff, 'sanctum')
            ->getJson("/api/v1/documents/{$document->id}/download")
            ->assertForbidden();
    }

    public function test_department_head_can_view_department_documents(): void
    {
        $head = User::factory()->create();
        $head->assignRole('department_head');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $department = Department::create([
            'name' => 'Engineering',
            'code' => 'ENG',
            'head_user_id' => $head->id,
            'active' => true,
        ]);

        $document = Document::create([
            'department_id' => $department->id,
            'uploaded_by' => $staff->id,
            'title' => 'Team Doc',
            'status' => 'active',
        ]);

        $this->actingAs($head, 'sanctum')
            ->getJson("/api/v1/documents/{$document->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Team Doc');
    }

    public function test_upload_triggers_scan_and_becomes_active(): void
    {
        Storage::fake('local');

        $head = User::factory()->create();
        $head->assignRole('department_head');

        $department = Department::create([
            'name' => 'Engineering',
            'code' => 'ENG',
            'head_user_id' => $head->id,
            'active' => true,
        ]);

        $file = UploadedFile::fake()->create('report.pdf', 100, 'application/pdf');

        $response = $this->actingAs($head, 'sanctum')
            ->post('/api/v1/documents', [
                'title' => 'Quarterly Report',
                'department_id' => $department->id,
                'file' => $file,
            ]);

        $response->assertCreated();

        $document = Document::first();
        $this->assertNotNull($document);
        $this->assertSame('active', $document->status);
    }
}
