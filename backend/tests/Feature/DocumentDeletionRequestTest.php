<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentDeletionRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DocumentDeletionRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['system_admin', 'department_head', 'project_manager', 'staff'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'sanctum']);
        }
    }

    protected function createDocument(User $uploader, ?Department $department = null): Document
    {
        Storage::fake('local');
        Storage::disk('local')->put('documents/test.pdf', 'content');

        $department ??= Department::create([
            'name' => 'Engineering',
            'code' => 'ENG',
            'active' => true,
        ]);

        return Document::create([
            'department_id' => $department->id,
            'uploaded_by' => $uploader->id,
            'title' => 'Test Document',
            'file_path' => 'documents/test.pdf',
            'original_filename' => 'test.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'active',
        ]);
    }

    public function test_admin_can_delete_document_immediately(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $document = $this->createDocument($staff);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/documents/{$document->id}")
            ->assertOk();

        $this->assertSoftDeleted('documents', ['id' => $document->id]);
    }

    public function test_non_admin_cannot_delete_document_directly(): void
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

        $document = $this->createDocument($staff, $department);

        $this->actingAs($head, 'sanctum')
            ->deleteJson("/api/v1/documents/{$document->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('documents', ['id' => $document->id, 'deleted_at' => null]);
    }

    public function test_uploader_can_request_document_deletion(): void
    {
        Notification::fake();

        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $document = $this->createDocument($staff);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/v1/documents/{$document->id}/deletion-requests", [
                'reason' => 'No longer needed',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('document_deletion_requests', [
            'document_id' => $document->id,
            'requested_by' => $staff->id,
            'status' => 'pending',
            'reason' => 'No longer needed',
        ]);
    }

    public function test_admin_can_approve_deletion_request(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $document = $this->createDocument($staff);

        $request = DocumentDeletionRequest::create([
            'document_id' => $document->id,
            'requested_by' => $staff->id,
            'status' => 'pending',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/deletion-requests/{$request->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertSoftDeleted('documents', ['id' => $document->id]);
        $this->assertDatabaseHas('document_deletion_requests', [
            'id' => $request->id,
            'status' => 'approved',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_admin_can_reject_deletion_request(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $document = $this->createDocument($staff);

        $request = DocumentDeletionRequest::create([
            'document_id' => $document->id,
            'requested_by' => $staff->id,
            'status' => 'pending',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/deletion-requests/{$request->id}/reject", [
                'review_note' => 'Keep for records',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('documents', ['id' => $document->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('document_deletion_requests', [
            'id' => $request->id,
            'status' => 'rejected',
            'review_note' => 'Keep for records',
        ]);
    }

    public function test_duplicate_pending_deletion_request_is_blocked(): void
    {
        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $document = $this->createDocument($staff);

        DocumentDeletionRequest::create([
            'document_id' => $document->id,
            'requested_by' => $staff->id,
            'status' => 'pending',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/v1/documents/{$document->id}/deletion-requests")
            ->assertStatus(422);
    }

    public function test_admin_cannot_submit_deletion_request(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('system_admin');

        $staff = User::factory()->create();
        $staff->assignRole('staff');

        $document = $this->createDocument($staff);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/documents/{$document->id}/deletion-requests")
            ->assertForbidden();
    }
}
