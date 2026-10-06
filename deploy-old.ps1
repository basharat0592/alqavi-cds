# deploy-old.ps1 - Deploy the alqavi_old branch to old.alqavitraders.com
# Usage: .\deploy-old.ps1 [-Backend] [-Frontend] [-Push] [-Status]
# Thin wrapper around deploy_old.py (see that file for details).

param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Push,
    [switch]$Status
)

$pyArgs = @()
if ($Backend)  { $pyArgs += '--backend' }
if ($Frontend) { $pyArgs += '--frontend' }
if ($Push)     { $pyArgs += '--push' }
if ($Status)   { $pyArgs += '--status' }

python "$PSScriptRoot\deploy_old.py" @pyArgs
exit $LASTEXITCODE
