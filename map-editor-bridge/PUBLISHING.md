# Publishing Map Editor Bridge

This project is prepared for the official Cities: Skylines II code-mod
toolchain and Paradox Mods publisher. Packaging does not log in or publish
anything automatically.

## First publication

1. Install or repair the official Cities: Skylines II modding toolchain so the
   user-level `CSII_TOOLPATH` environment variable points to its files.
2. Open `code/MapEditorPlus.csproj` in the supported IDE.
3. Review `code/Properties/PublishConfiguration.xml`, the thumbnail, and all
   referenced screenshots.
4. Keep `ModId` empty for the first publication.
5. Publish with the `PublishNewMod` profile.
6. Record the Paradox Mods ID returned by the publisher in the `ModId` field.

## Later releases

1. Increase the version in the code project, UI package, UI `mod.json`, and
   publishing configuration.
2. Update the change log and compatibility range.
3. Build and smoke-test the exact staged files.
4. Publish with `PublishNewVersion`.

Use `UpdatePublishedConfiguration` only for listing-metadata changes that do
not require a new binary version.

## Local and shareable archives

Run the release helper from this directory:

```powershell
.\Build-ReleasePackage.ps1
```

If the official toolchain is not installed, provide the game's managed
assembly directory:

```powershell
.\Build-ReleasePackage.ps1 -GameManagedPath "D:\SteamLibrary\steamapps\common\Cities Skylines II\Cities2_Data\Managed"
```

The helper builds the UI and backend, creates a local-install ZIP, creates the
complete share package, and scans the staged files for machine-specific paths
and development-only folders.
