# Contributing

Bug reports and focused pull requests are welcome.

Please include:

- the affected mod and version;
- the Cities: Skylines II version;
- steps to reproduce the behavior;
- whether the problem occurs in gameplay, the Map Editor, or both;
- a privacy-checked Stacklight report when relevant.

Do not commit game binaries, decompiled game source, local toolchain caches,
save files, account identifiers, access tokens, or absolute profile paths.

Changes should preserve ownership boundaries: integrations call another mod's
public bindings or native tools and do not duplicate or take over that mod's
implementation.
