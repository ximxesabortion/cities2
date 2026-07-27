[CmdletBinding()]
param(
    [string]$GameManagedPath = $env:CSII_MANAGEDPATH,
    [switch]$RestoreDependencies
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$uiRoot = Join-Path $projectRoot "ui"
$codeRoot = Join-Path $projectRoot "code"
$releaseRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "release"))
$manifest = Get-Content -LiteralPath (Join-Path $uiRoot "mod.json") -Raw |
    ConvertFrom-Json
$version = [string]$manifest.version
$packageBase = "Stacklight-$version"
$publishConfigurationPath = Join-Path $codeRoot `
    "Properties\PublishConfiguration.xml"
[xml]$publishConfiguration = Get-Content `
    -LiteralPath $publishConfigurationPath -Raw
$publishedScreenshots = @(
    $publishConfiguration.Publish.Screenshot |
        ForEach-Object { [string]$_.Value }
)
if ($publishedScreenshots.Count -eq 0) {
    throw "PublishConfiguration.xml does not reference any screenshots."
}

function Assert-ChildPath {
    param(
        [Parameter(Mandatory)]
        [string]$BasePath,
        [Parameter(Mandatory)]
        [string]$ChildPath
    )

    $baseFull = [System.IO.Path]::GetFullPath($BasePath).
        TrimEnd([System.IO.Path]::DirectorySeparatorChar)
    $childFull = [System.IO.Path]::GetFullPath($ChildPath)
    $prefix = $baseFull + [System.IO.Path]::DirectorySeparatorChar

    if (-not $childFull.StartsWith(
        $prefix,
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw "Refusing operation outside release root: $childFull"
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        [Parameter(Mandatory)]
        [string[]]$ArgumentList,
        [Parameter(Mandatory)]
        [string]$WorkingDirectory
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $FilePath @ArgumentList
        if ($LASTEXITCODE -ne 0) {
            throw "$FilePath failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Copy-RequiredFile {
    param(
        [Parameter(Mandatory)]
        [string]$Source,
        [Parameter(Mandatory)]
        [string]$Destination
    )

    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "Required file is missing: $Source"
    }

    $destinationDirectory = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Force -Path $destinationDirectory |
        Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$npm = Get-Command "npm.cmd" -ErrorAction Stop
$dotnet = Get-Command "dotnet.exe" -ErrorAction Stop

if ($RestoreDependencies -or
    -not (Test-Path -LiteralPath (Join-Path $uiRoot "node_modules"))) {
    Invoke-Checked -FilePath $npm.Source -ArgumentList @("ci") `
        -WorkingDirectory $uiRoot
}

Invoke-Checked -FilePath $npm.Source -ArgumentList @("run", "check") `
    -WorkingDirectory $uiRoot
Invoke-Checked -FilePath $npm.Source -ArgumentList @("run", "build") `
    -WorkingDirectory $uiRoot

$toolPath = [System.Environment]::GetEnvironmentVariable(
    "CSII_TOOLPATH",
    [System.EnvironmentVariableTarget]::User
)
if ([string]::IsNullOrWhiteSpace($toolPath)) {
    $toolPath = $env:CSII_TOOLPATH
}
if ([string]::IsNullOrWhiteSpace($toolPath)) {
    $commonToolPaths = @(
        "C:\Program Files (x86)\Steam\steamapps\common\Cities Skylines II\Cities2_Data\Content\Game\.ModdingToolchain",
        "C:\Program Files\Steam\steamapps\common\Cities Skylines II\Cities2_Data\Content\Game\.ModdingToolchain"
    )
    $toolPath = $commonToolPaths |
        Where-Object {
            Test-Path -LiteralPath (Join-Path $_ "Mod.props")
        } |
        Select-Object -First 1
}
$hasOfficialToolchain = -not [string]::IsNullOrWhiteSpace($toolPath) -and
    (Test-Path -LiteralPath (Join-Path $toolPath "Mod.props")) -and
    (Test-Path -LiteralPath (Join-Path $toolPath "Mod.targets"))

if (-not $hasOfficialToolchain -and
    [string]::IsNullOrWhiteSpace($GameManagedPath)) {
    $defaultManagedPaths = @(
        "C:\Program Files (x86)\Steam\steamapps\common\Cities Skylines II\Cities2_Data\Managed",
        "C:\Program Files\Steam\steamapps\common\Cities Skylines II\Cities2_Data\Managed"
    )
    $GameManagedPath = $defaultManagedPaths |
        Where-Object {
            Test-Path -LiteralPath (Join-Path $_ "Game.dll")
        } |
        Select-Object -First 1
}

$buildArguments = @(
    "build",
    (Join-Path $codeRoot "Stacklight.csproj"),
    "-c",
    "Release"
)

if ($hasOfficialToolchain) {
    $userDataPath = [System.Environment]::GetEnvironmentVariable(
        "CSII_USERDATAPATH",
        [System.EnvironmentVariableTarget]::User
    )
    if ([string]::IsNullOrWhiteSpace($userDataPath)) {
        $userDataPath = $env:CSII_USERDATAPATH
    }
    if ([string]::IsNullOrWhiteSpace($userDataPath)) {
        $profilePath = [System.Environment]::GetFolderPath(
            [System.Environment+SpecialFolder]::UserProfile
        )
        $applicationDataSegment = [string]::Concat("App", "Data")
        $localLowSegment = [string]::Concat("Local", "Low")
        $userDataPath = Join-Path $profilePath $applicationDataSegment
        $userDataPath = Join-Path $userDataPath $localLowSegment
        $userDataPath = Join-Path $userDataPath "Colossal Order"
        $userDataPath = Join-Path $userDataPath "Cities Skylines II"
    }

    $unityModProjectPath = [System.Environment]::GetEnvironmentVariable(
        "CSII_UNITYMODPROJECTPATH",
        [System.EnvironmentVariableTarget]::User
    )
    if ([string]::IsNullOrWhiteSpace($unityModProjectPath)) {
        $unityModProjectPath = Join-Path $userDataPath `
            ".cache\Modding\UnityModsProject"
    }

    $modPostProcessorPath = [System.Environment]::GetEnvironmentVariable(
        "CSII_MODPOSTPROCESSORPATH",
        [System.EnvironmentVariableTarget]::User
    )
    if ([string]::IsNullOrWhiteSpace($modPostProcessorPath)) {
        $modPostProcessorPath = Join-Path $toolPath `
            "ModPostProcessor\ModPostProcessor.exe"
    }

    $entitiesVersion = [System.Environment]::GetEnvironmentVariable(
        "CSII_ENTITIESVERSION",
        [System.EnvironmentVariableTarget]::User
    )
    if ([string]::IsNullOrWhiteSpace($entitiesVersion)) {
        $entityPackage = Get-ChildItem -LiteralPath `
            (Join-Path $unityModProjectPath "Library\PackageCache") `
            -Directory -Filter "com.unity.entities@*" |
            Sort-Object Name -Descending |
            Select-Object -First 1
        if ($null -ne $entityPackage) {
            $entitiesVersion = $entityPackage.Name.Substring(
                "com.unity.entities@".Length
            )
        }
    }

    $mscorlibPath = [System.Environment]::GetEnvironmentVariable(
        "CSII_MSCORLIBPATH",
        [System.EnvironmentVariableTarget]::User
    )
    if ([string]::IsNullOrWhiteSpace($mscorlibPath)) {
        $projectVersionPath = Join-Path $unityModProjectPath `
            "ProjectSettings\ProjectVersion.txt"
        $projectVersionText = Get-Content -LiteralPath $projectVersionPath -Raw
        $versionMatch = [regex]::Match(
            $projectVersionText,
            "m_EditorVersion:\s*(\S+)"
        )
        if (-not $versionMatch.Success) {
            throw "Could not determine the installed Unity Editor version."
        }

        $unityVersion = $versionMatch.Groups[1].Value
        $programFilesRoot = [System.Environment]::GetFolderPath(
            [System.Environment+SpecialFolder]::ProgramFiles
        )
        $unityRoots = @(
            (Join-Path $programFilesRoot "Unity $unityVersion\Editor"),
            (Join-Path $programFilesRoot "Unity\Hub\Editor\$unityVersion\Editor")
        )
        $unityEditorRoot = $unityRoots |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
        if ([string]::IsNullOrWhiteSpace($unityEditorRoot)) {
            throw "Unity Editor $unityVersion was not found."
        }
        $mscorlibPath = Join-Path $unityEditorRoot `
            "Data\UnityReferenceAssemblies\unity-4.8-api\mscorlib.dll"
    }

    $requiredOfficialPaths = @(
        $userDataPath,
        $unityModProjectPath,
        $modPostProcessorPath,
        $mscorlibPath
    )
    $missingOfficialPaths = $requiredOfficialPaths |
        Where-Object { -not (Test-Path -LiteralPath $_) }
    if ($missingOfficialPaths) {
        throw "Official toolchain path missing: $($missingOfficialPaths -join ', ')"
    }
    if ([string]::IsNullOrWhiteSpace($entitiesVersion)) {
        throw "Could not determine the Unity Entities package version."
    }

    $officialDeployRoot = Join-Path $projectRoot `
        "artifacts\official-build-deploy"
    New-Item -ItemType Directory -Force -Path $officialDeployRoot | Out-Null
    $buildArguments += @(
        "-p:CsiiToolPath=$toolPath",
        "-p:MSCORLIBPath=$mscorlibPath",
        "-p:UserDataPath=$userDataPath",
        "-p:UnityModProjectPath=$unityModProjectPath",
        "-p:ModPostProcessorPath=$modPostProcessorPath",
        "-p:EntitiesVersion=$entitiesVersion",
        "-p:LocalModsPath=$officialDeployRoot"
    )
}
else {
    if ([string]::IsNullOrWhiteSpace($GameManagedPath) -or
        -not (Test-Path -LiteralPath (Join-Path $GameManagedPath "Game.dll"))) {
        throw "Set -GameManagedPath or CSII_MANAGEDPATH to Cities2_Data\Managed."
    }
    $buildArguments += "-p:GameManagedPath=$GameManagedPath"
}

Invoke-Checked -FilePath $dotnet.Source -ArgumentList $buildArguments `
    -WorkingDirectory $projectRoot

$targetFramework = if ($hasOfficialToolchain) { "net48" } else { "netstandard2.1" }
$buildOutput = Join-Path $codeRoot "bin\Release\$targetFramework"
$stageRoot = Join-Path $releaseRoot "$packageBase-share"
$installRoot = Join-Path $stageRoot "Mod\Stacklight"
$storeRoot = Join-Path $stageRoot "StoreListing"
$sourceRoot = Join-Path $stageRoot "Source"
$localInstallZip = Join-Path $releaseRoot "$packageBase-local-install.zip"
$shareZip = Join-Path $releaseRoot "$packageBase-share.zip"
$zipChecksums = Join-Path $releaseRoot "$packageBase-CHECKSUMS.txt"

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
Assert-ChildPath -BasePath $releaseRoot -ChildPath $stageRoot
if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $installRoot, $storeRoot, $sourceRoot |
    Out-Null

$runtimeFiles = @(
    "Stacklight.dll",
    "Stacklight.mjs",
    "Stacklight.css",
    "mod.json"
)

foreach ($file in $runtimeFiles) {
    Copy-RequiredFile -Source (Join-Path $buildOutput $file) `
        -Destination (Join-Path $installRoot $file)
}

Copy-RequiredFile -Source (Join-Path $projectRoot "README.md") `
    -Destination (Join-Path $installRoot "README.md")
Copy-RequiredFile -Source (Join-Path $projectRoot "CHANGELOG.md") `
    -Destination (Join-Path $installRoot "CHANGELOG.md")

Copy-RequiredFile -Source (Join-Path $codeRoot "Properties\Avatar.png") `
    -Destination (Join-Path $storeRoot "Avatar.png")
Copy-RequiredFile -Source (Join-Path $codeRoot "Properties\Thumbnail.png") `
    -Destination (Join-Path $storeRoot "Thumbnail.png")
$storeScreenshotRoot = Join-Path $storeRoot "Screenshots"
New-Item -ItemType Directory -Force -Path $storeScreenshotRoot | Out-Null
foreach ($relativeScreenshot in $publishedScreenshots) {
    $screenshotSource = [System.IO.Path]::GetFullPath(
        (Join-Path $codeRoot $relativeScreenshot)
    )
    Assert-ChildPath `
        -BasePath (Join-Path $codeRoot "Properties\Screenshots") `
        -ChildPath $screenshotSource
    Copy-RequiredFile -Source $screenshotSource `
        -Destination (Join-Path $storeScreenshotRoot `
            (Split-Path -Leaf $screenshotSource))
}
Copy-RequiredFile -Source (Join-Path $projectRoot "STORE_LISTING.md") `
    -Destination (Join-Path $storeRoot "STORE_LISTING.md")
Copy-RequiredFile `
    -Source (Join-Path $codeRoot "Properties\PublishConfiguration.xml") `
    -Destination (Join-Path $storeRoot "PublishConfiguration.xml")

$rootSourceFiles = @(
    ".gitignore",
    "Build-ReleasePackage.ps1",
    "CHANGELOG.md",
    "PUBLISHING.md",
    "README.md",
    "RELEASE_README.md",
    "STORE_LISTING.md",
    "TOOL_INTEGRATION.md"
)
foreach ($file in $rootSourceFiles) {
    Copy-RequiredFile -Source (Join-Path $projectRoot $file) `
        -Destination (Join-Path $sourceRoot $file)
}

$sourceCodeRoot = Join-Path $sourceRoot "code"
New-Item -ItemType Directory -Force -Path $sourceCodeRoot | Out-Null
Get-ChildItem -LiteralPath $codeRoot -File |
    Where-Object { $_.Extension -in @(".cs", ".csproj") } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $sourceCodeRoot
    }
$sourcePropertiesRoot = Join-Path $sourceCodeRoot "Properties"
New-Item -ItemType Directory -Force -Path $sourcePropertiesRoot | Out-Null
Copy-RequiredFile -Source (Join-Path $codeRoot "Properties\Avatar.png") `
    -Destination (Join-Path $sourcePropertiesRoot "Avatar.png")
Copy-RequiredFile -Source (Join-Path $codeRoot "Properties\Thumbnail.png") `
    -Destination (Join-Path $sourcePropertiesRoot "Thumbnail.png")
Copy-RequiredFile `
    -Source (Join-Path $codeRoot "Properties\PublishConfiguration.xml") `
    -Destination (Join-Path $sourcePropertiesRoot "PublishConfiguration.xml")
Copy-Item -LiteralPath (Join-Path $codeRoot "Properties\PublishProfiles") `
    -Destination $sourcePropertiesRoot -Recurse
$sourceScreenshotRoot = Join-Path $sourcePropertiesRoot "Screenshots"
New-Item -ItemType Directory -Force -Path $sourceScreenshotRoot | Out-Null
foreach ($relativeScreenshot in $publishedScreenshots) {
    $screenshotSource = [System.IO.Path]::GetFullPath(
        (Join-Path $codeRoot $relativeScreenshot)
    )
    Assert-ChildPath `
        -BasePath (Join-Path $codeRoot "Properties\Screenshots") `
        -ChildPath $screenshotSource
    Copy-RequiredFile -Source $screenshotSource `
        -Destination (Join-Path $sourceScreenshotRoot `
            (Split-Path -Leaf $screenshotSource))
}

$sourceUiRoot = Join-Path $sourceRoot "ui"
New-Item -ItemType Directory -Force -Path $sourceUiRoot | Out-Null
$uiSourceFiles = @(
    ".gitignore",
    "mod.json",
    "package-lock.json",
    "package.json",
    "tsconfig.json",
    "webpack.config.js"
)
foreach ($file in $uiSourceFiles) {
    Copy-RequiredFile -Source (Join-Path $uiRoot $file) `
        -Destination (Join-Path $sourceUiRoot $file)
}
Copy-Item -LiteralPath (Join-Path $uiRoot "src") `
    -Destination $sourceUiRoot -Recurse
Copy-Item -LiteralPath (Join-Path $uiRoot "types") `
    -Destination $sourceUiRoot -Recurse

Copy-RequiredFile -Source (Join-Path $projectRoot "RELEASE_README.md") `
    -Destination (Join-Path $stageRoot "README-FIRST.md")

$runtimeHashLines = Get-ChildItem -LiteralPath $installRoot -File |
    Sort-Object Name |
    ForEach-Object {
        $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
        "$($hash.Hash.ToLowerInvariant())  Mod/Stacklight/$($_.Name)"
    }
Set-Content -LiteralPath (Join-Path $stageRoot "SHA256SUMS.txt") `
    -Value $runtimeHashLines -Encoding ascii

$forbiddenDirectories = @(
    ".agents",
    ".codex",
    ".git",
    "bin",
    "installed-backups",
    "node_modules",
    "obj"
)
$badDirectories = Get-ChildItem -LiteralPath $stageRoot -Directory -Recurse |
    Where-Object { $_.Name -in $forbiddenDirectories }
if ($badDirectories) {
    throw "Development-only directories entered the stage: $($badDirectories.FullName -join ', ')"
}

$textExtensions = @(
    ".cs",
    ".css",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".ps1",
    ".pubxml",
    ".scss",
    ".ts",
    ".tsx",
    ".xml"
)
$textFiles = Get-ChildItem -LiteralPath $stageRoot -File -Recurse |
    Where-Object { $_.Extension -in $textExtensions }
$systemDriveRoot = [System.IO.Path]::GetPathRoot($projectRoot)
$userProfilesSegment = [string]::Concat("User", "s")
$profileRoot = Join-Path $systemDriveRoot $userProfilesSegment
$applicationDataSegment = [string]::Concat("App", "Data")
$localLowSegment = [string]::Concat("Local", "Low")
$forbiddenPatterns = @(
    ([regex]::Escape($profileRoot) + "\\"),
    [regex]::Escape($projectRoot),
    ([regex]::Escape($applicationDataSegment) + "\\"),
    ([regex]::Escape($localLowSegment) + "\\")
)
if (-not [string]::IsNullOrWhiteSpace($env:USERNAME)) {
    $forbiddenPatterns += (
        "(?<![A-Za-z0-9])" +
        [regex]::Escape($env:USERNAME) +
        "(?![A-Za-z0-9])"
    )
}
$privacyHits = $textFiles |
    Select-String -Pattern $forbiddenPatterns -CaseSensitive:$false
if ($privacyHits) {
    $summary = $privacyHits |
        ForEach-Object { "$($_.Path):$($_.LineNumber)" } |
        Sort-Object -Unique
    throw "Privacy scan found machine-specific text: $($summary -join ', ')"
}

foreach ($archive in @($localInstallZip, $shareZip, $zipChecksums)) {
    Assert-ChildPath -BasePath $releaseRoot -ChildPath $archive
    if (Test-Path -LiteralPath $archive) {
        Remove-Item -LiteralPath $archive -Force
    }
}

Compress-Archive -LiteralPath $installRoot -DestinationPath $localInstallZip `
    -CompressionLevel Optimal
Compress-Archive -LiteralPath $stageRoot -DestinationPath $shareZip `
    -CompressionLevel Optimal

$archiveHashLines = @($localInstallZip, $shareZip) |
    ForEach-Object {
        $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
        "$($hash.Hash.ToLowerInvariant())  $(Split-Path -Leaf $_)"
    }
Set-Content -LiteralPath $zipChecksums -Value $archiveHashLines -Encoding ascii

Write-Host ""
Write-Host "Stacklight $version package completed."
Write-Host "Local install: $localInstallZip"
Write-Host "Share package: $shareZip"
Write-Host "Checksums: $zipChecksums"
