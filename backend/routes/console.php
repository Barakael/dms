<?php

use App\Jobs\NotifyExpiringDocumentsJob;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new NotifyExpiringDocumentsJob)->daily();
