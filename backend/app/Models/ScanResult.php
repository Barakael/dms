<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScanResult extends Model
{
    protected $fillable = ['document_id', 'result', 'engine', 'details', 'scanned_at'];

    protected function casts(): array
    {
        return ['scanned_at' => 'datetime'];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
