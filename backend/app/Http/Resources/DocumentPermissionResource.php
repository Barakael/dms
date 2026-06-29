<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentPermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'permission' => $this->permission,
            'user' => $this->whenLoaded('user', fn () => new UserResource($this->user)),
            'granted_by' => $this->whenLoaded('granter', fn () => new UserResource($this->granter)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
