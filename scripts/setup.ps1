<#
.SYNOPSIS
One-command setup for the BCHealth project.

.DESCRIPTION
Runs all the steps needed to get the project running:
  1. Install dependencies (npm install)
  2. Generate JWT secrets if missing (npm run gen-jwt)
  3. Prisma generate
  4. Prisma migrate dev
  5. Prisma seed (optional, skipped if SEED_DEMO_PASSWORD is not set)

.PARAMETER SkipSeed
Skip the database seeding step.

.EXAMPLE
    # PowerShell: full setup
    & c:\Users\lamig\CLINICKA/scripts/setup.ps1

.EXAMPLE
    # PowerShell: setup without seeding
    & c:\Users\lamig\CLINICKA/scripts/setup.ps1 -SkipSeed
#>

param(
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$root = Get-Location

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BCHealth One-Command Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "`n[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed"
    exit 1
}

# Step 2: Check/generate JWT secrets
Write-Host "`n[2/5] Checking JWT secrets..." -ForegroundColor Yellow
$envContent = Get-Content -Path "$root\.env" -Raw
$hasJwtSecret = $envContent -match 'JWT_SECRET="(?!replace-with)[^"]+"'
$hasJwtRefreshSecret = $envContent -match 'JWT_REFRESH_SECRET="(?!replace-with)[^"]+"'

if (-not $hasJwtSecret -or -not $hasJwtRefreshSecret) {
    Write-Host "JWT secrets missing or still placeholders. Generating..." -ForegroundColor Yellow
    & $PSCommandPath.Replace("setup.ps1", "gen-jwt.ps1")
    Write-Host "Please copy the generated secrets into .env (JWT_SECRET and JWT_REFRESH_SECRET), then re-run setup." -ForegroundColor Red
    exit 1
} else {
    Write-Host "JWT secrets already configured." -ForegroundColor Green
}

# Step 3: Prisma generate
Write-Host "`n[3/5] Running prisma generate..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Error "prisma generate failed"
    exit 1
}

# Step 4: Prisma migrate dev
Write-Host "`n[4/5] Running prisma migrate dev..." -ForegroundColor Yellow
npx prisma migrate dev --schema prisma/schema.prisma
if ($LASTEXITCODE -ne 0) {
    Write-Error "prisma migrate dev failed"
    exit 1
}

# Step 5: Prisma seed (optional)
if (-not $SkipSeed) {
    Write-Host "`n[5/5] Running prisma seed..." -ForegroundColor Yellow
    $seedPassword = $env:SEED_DEMO_PASSWORD
    if (-not $seedPassword) {
        # Try reading SEED_DEMO_PASSWORD from .env file
        $envContent = Get-Content -Path "$root\.env" -Raw
        if ($envContent -match 'SEED_DEMO_PASSWORD="([^"]+)"') {
            $seedPassword = $matches[1]
        }
    }
    if (-not $seedPassword) {
        Write-Host "SEED_DEMO_PASSWORD not set. Skipping seed. Set it and re-run to seed demo data." -ForegroundColor Yellow
    } else {
        npx tsx prisma/seed.ts
        if ($LASTEXITCODE -ne 0) {
            Write-Error "prisma seed failed"
            exit 1
        }
    }
} else {
    Write-Host "`n[5/5] Skipping seed (-SkipSeed specified)." -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup complete! Run `npm run dev` to start." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan