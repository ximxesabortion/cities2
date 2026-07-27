# Publishing

Build the UI and create the privacy-checked release package:

```powershell
.\Build-ReleasePackage.ps1
```

Publish a new Paradox Mods entry with the official Cities: Skylines II
toolchain:

```powershell
dotnet publish .\code\Stacklight.csproj -c Release `
  -p:PublishProfile=PublishNewMod
```

After the first successful publish, add the returned `ModId` to
`code/Properties/PublishConfiguration.xml`. Use `PublishNewVersion` for runtime
updates and `UpdatePublishedConfiguration` for listing-only changes.

Do not use a local developer copy for gameplay testing. Subscribe to and test
the live package, then remove any publisher-generated `Mods/Stacklight` folder.
