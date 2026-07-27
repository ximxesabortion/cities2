using System.Reflection;
using System.Runtime.Loader;

if (args.Length != 2)
{
    Console.Error.WriteLine(
        "Usage: StacklightVerification STACKLIGHT_DLL GAME_MANAGED_PATH"
    );
    return 2;
}

string stacklightPath = Path.GetFullPath(args[0]);
string managedPath = Path.GetFullPath(args[1]);
AssemblyLoadContext.Default.Resolving += (_, name) =>
{
    string candidate = Path.Combine(managedPath, name.Name + ".dll");
    return File.Exists(candidate)
        ? AssemblyLoadContext.Default.LoadFromAssemblyPath(candidate)
        : null;
};

Assembly assembly =
    AssemblyLoadContext.Default.LoadFromAssemblyPath(stacklightPath);
Type systemType = assembly.GetType(
    "Stacklight.StacklightUISystem",
    throwOnError: true
)!;
const BindingFlags Flags =
    BindingFlags.NonPublic | BindingFlags.Static;
MethodInfo sanitize = systemType.GetMethod("Sanitize", Flags)!;
MethodInfo filter = systemType.GetMethod(
    "IsForeignSavedMapRecord",
    Flags
)!;

string assetReference =
    "assetdb://user/Saves/123/Sample%20Map.cok@" +
    "SampleMapTerrain.Prefab";

var checks = new Dictionary<string, bool>
{
    ["real email is redacted"] =
        (string)sanitize.Invoke(
            null,
            new object[] { "contact person@example.com" }
        )! == "contact [REDACTED EMAIL]",
    ["assetdb prefab reference is preserved"] =
        (string)sanitize.Invoke(
            null,
            new object[] { assetReference }
        )! == assetReference,
    ["foreign saved-map record is suppressed"] =
        (bool)filter.Invoke(
            null,
            new object[] { assetReference, "", "International 11" }
        )!,
    ["current saved-map record is retained"] =
        !(bool)filter.Invoke(
            null,
            new object[] { assetReference, "", "Sample Map" }
        )!,
    ["global mod record is retained"] =
        !(bool)filter.Invoke(
            null,
            new object[]
            {
                "A global mod failure",
                "",
                "Sample Map"
            }
        )!,
    ["saved-map record is hidden with no map loaded"] =
        (bool)filter.Invoke(
            null,
            new object[] { assetReference, "", "" }
        )!
};

foreach ((string name, bool passed) in checks)
{
    Console.WriteLine($"{(passed ? "PASS" : "FAIL")} {name}");
}

return checks.Values.All(value => value) ? 0 : 1;
