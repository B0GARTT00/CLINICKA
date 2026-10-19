<#
.SYNOPSIS
Generate a JWT signing secret (48 random bytes, base64-encoded).

.DESCRIPTION
Generates a cryptographically secure random secret suitable for
JWT_SECRET or JWT_REFRESH_SECRET in .env. Two independent secrets
are required — run twice or copy the output.

.PARAMETER OutputPath
Optional path to write the secret to a file (one per line).

.EXAMPLE
        # PowerShell: generate and print
        & c:\Users\lamig\CLINICKA/scripts/gen-jwt.ps1

.EXAMPLE
        # PowerShell: generate and save to .env values
        & c:\Users\lamig\CLINICKA/scripts/gen-jwt.ps1 -OutputPath c:\Users\lamig\CLINICKA\.env
#>

param(
        [string]$OutputPath
)

# Generate 48 random bytes, base64-encoded
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
$bytes = New-Object byte[] 48
$rng.GetBytes($bytes)
$rng.Dispose()
$secret = [Convert]::ToBase64String($bytes)

Write-Host "Generated secret: $secret"

if ($OutputPath) {
        Set-Content -Path "$OutputPath.access" -Value $secret -Encoding UTF8
        Write-Host "Access secret written to: $OutputPath.access"
        Write-Host "Copy this to JWT_SECRET in your .env"
        Write-Host ""
        Write-Host "Run again to generate JWT_REFRESH_SECRET, or manually generate another 48-byte secret."
}