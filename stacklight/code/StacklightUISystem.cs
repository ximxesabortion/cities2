using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using Colossal.Logging;
using Colossal.PSI.Common;
using Colossal.PSI.PdxSdk;
using Colossal.UI.Binding;
using Game;
using Game.UI;
using UnityEngine;
using Object = UnityEngine.Object;
using PdxMod = Colossal.PSI.Common.Mod;

namespace Stacklight
{
    /// <summary>
    /// Captures the same warning-or-higher Unity/Colossal log stream used by
    /// the game's error UI and exposes a small, bounded session log to the UI.
    /// No simulation or save data is read or changed.
    /// </summary>
    public sealed partial class StacklightUISystem : UISystemBase
    {
        private const string BindingGroup = "stacklight";
        private const string StacklightVersion = "0.2.5";
        private const int MaxUniqueEntries = 100;
        private const int MaxMessageLength = 2_000;
        private const int MaxDetailLength = 12_000;
        private static readonly Regex EmailPattern = new Regex(
            @"(?<![\w.+-])[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}",
            RegexOptions.Compiled | RegexOptions.CultureInvariant
        );
        private static readonly Regex BearerPattern = new Regex(
            @"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+",
            RegexOptions.Compiled | RegexOptions.CultureInvariant
        );
        private static readonly Regex CredentialPattern = new Regex(
            @"(?i)\b(authorization|access[_-]?token|refresh[_-]?token|api[_-]?key|password|passwd|client[_-]?secret)\b\s*[:=]\s*(?:""[^""]*""|'[^']*'|[^\s,;}]+)",
            RegexOptions.Compiled | RegexOptions.CultureInvariant
        );
        private static readonly Regex SavedMapAssetPattern = new Regex(
            @"assetdb://user/Saves/[^/\s\]]+/(?<map>[^@\r\n\]\)]+?)\.cok@",
            RegexOptions.Compiled |
                RegexOptions.CultureInvariant |
                RegexOptions.IgnoreCase
        );

        private readonly object _sync = new object();
        private readonly Dictionary<string, MutableRecord> _recordsByKey =
            new Dictionary<string, MutableRecord>();
        private readonly Dictionary<string, MutableRecord> _recordsById =
            new Dictionary<string, MutableRecord>();

        private ValueBinding<LogEntry[]> _entriesBinding = null!;
        private ValueBinding<int> _errorCountBinding = null!;
        private ValueBinding<int> _warningCountBinding = null!;
        private ValueBinding<int> _prunedCountBinding = null!;
        private ValueBinding<string> _statusBinding = null!;
        private ValueBinding<string> _sessionStartedBinding = null!;
        private ValueBinding<string> _mapScopeBinding = null!;
        private ValueBinding<bool> _ownsModListBinding = null!;
        private ValueBinding<ModContextEntry[]> _modsBinding = null!;
        private ValueBinding<int> _modCountBinding = null!;
        private ValueBinding<string> _contextStatusBinding = null!;
        private ValueBinding<string> _gameVersionBinding = null!;

        private long _nextSequence;
        private int _nextId;
        private int _errorCount;
        private int _warningCount;
        private int _prunedCount;
        private int _foreignMapSuppressedCount;
        private bool _dirty;
        private string _sessionStarted = string.Empty;
        private volatile string _activeMapName = string.Empty;
        private ModContextEntry[] _modsSnapshot =
            Array.Empty<ModContextEntry>();
        private string _contextStatus = "Waiting for active playset";
        private volatile bool _contextRefreshRequested = true;
        private DateTime _nextContextAttemptUtc;
        private PdxSdkPlatform? _pdxPlatform;
        private MapMetadataSystem _mapMetadataSystem = null!;

        public override GameMode gameMode => GameMode.All;

        protected override void OnCreate()
        {
            base.OnCreate();

            _sessionStarted = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            _entriesBinding = new ValueBinding<LogEntry[]>(
                BindingGroup,
                "entries",
                Array.Empty<LogEntry>(),
                new ArrayWriter<LogEntry>(
                    new ValueWriter<LogEntry>(),
                    false
                ),
                null
            );
            _errorCountBinding = new ValueBinding<int>(
                BindingGroup,
                "errorCount",
                0
            );
            _warningCountBinding = new ValueBinding<int>(
                BindingGroup,
                "warningCount",
                0
            );
            _prunedCountBinding = new ValueBinding<int>(
                BindingGroup,
                "prunedCount",
                0
            );
            _statusBinding = new ValueBinding<string>(
                BindingGroup,
                "status",
                string.Empty
            );
            _sessionStartedBinding = new ValueBinding<string>(
                BindingGroup,
                "sessionStarted",
                _sessionStarted
            );
            _mapScopeBinding = new ValueBinding<string>(
                BindingGroup,
                "mapScope",
                "No map loaded"
            );
            _ownsModListBinding = new ValueBinding<bool>(
                BindingGroup,
                "ownsModList",
                true
            );
            _modsBinding = new ValueBinding<ModContextEntry[]>(
                BindingGroup,
                "mods",
                Array.Empty<ModContextEntry>(),
                new ArrayWriter<ModContextEntry>(
                    new ValueWriter<ModContextEntry>(),
                    false
                ),
                null
            );
            _modCountBinding = new ValueBinding<int>(
                BindingGroup,
                "modCount",
                0
            );
            _contextStatusBinding = new ValueBinding<string>(
                BindingGroup,
                "contextStatus",
                _contextStatus
            );
            _gameVersionBinding = new ValueBinding<string>(
                BindingGroup,
                "gameVersion",
                Game.Version.current.fullVersion
            );

            AddBinding(_entriesBinding);
            AddBinding(_errorCountBinding);
            AddBinding(_warningCountBinding);
            AddBinding(_prunedCountBinding);
            AddBinding(_statusBinding);
            AddBinding(_sessionStartedBinding);
            AddBinding(_mapScopeBinding);
            AddBinding(_ownsModListBinding);
            AddBinding(_modsBinding);
            AddBinding(_modCountBinding);
            AddBinding(_contextStatusBinding);
            AddBinding(_gameVersionBinding);
            AddBinding(
                new TriggerBinding(
                    BindingGroup,
                    "clear",
                    Clear
                )
            );
            AddBinding(
                new TriggerBinding<bool>(
                    BindingGroup,
                    "copyAll",
                    CopyAll
                )
            );
            AddBinding(
                new TriggerBinding<string>(
                    BindingGroup,
                    "copyEntry",
                    CopyEntry
                )
            );
            AddBinding(
                new TriggerBinding(
                    BindingGroup,
                    "refreshContext",
                    RequestContextRefresh
                )
            );

            UnityLogger.OnWarnOrHigher += OnLogMessage;
            _mapMetadataSystem =
                World.GetOrCreateSystemManaged<MapMetadataSystem>();
            _nextContextAttemptUtc = DateTime.UtcNow.AddSeconds(1);
            EnsurePdxSubscription();
        }

        protected override void OnDestroy()
        {
            UnityLogger.OnWarnOrHigher -= OnLogMessage;
            if (_pdxPlatform != null)
            {
                _pdxPlatform.onActivePlaysetChanged -= RequestContextRefresh;
                _pdxPlatform.onModsReady -= RequestContextRefresh;
            }
            base.OnDestroy();
        }

        protected override void OnUpdate()
        {
            UpdateMapScope();

            if (
                _contextRefreshRequested &&
                DateTime.UtcNow >= _nextContextAttemptUtc
            )
            {
                RefreshContext();
            }

            LogEntry[] snapshot;
            int errorCount;
            int warningCount;
            int prunedCount;

            lock (_sync)
            {
                if (!_dirty)
                {
                    base.OnUpdate();
                    return;
                }

                _dirty = false;
                snapshot = CreateSnapshotLocked(includeWarnings: true);
                errorCount = _errorCount;
                warningCount = _warningCount;
                prunedCount = _prunedCount;
            }

            _entriesBinding.Update(snapshot);
            _errorCountBinding.Update(errorCount);
            _warningCountBinding.Update(warningCount);
            _prunedCountBinding.Update(prunedCount);

            base.OnUpdate();
        }

        private void UpdateMapScope()
        {
            string nextMapName = _mapMetadataSystem?.mapName ?? string.Empty;
            nextMapName = nextMapName.Trim();
            string previousMapName = _activeMapName;
            if (
                string.Equals(
                    NormalizeMapKey(previousMapName),
                    NormalizeMapKey(nextMapName),
                    StringComparison.Ordinal
                )
            )
            {
                return;
            }

            _activeMapName = nextMapName;
            _sessionStarted = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            lock (_sync)
            {
                ResetLogLocked();
            }

            string displayName = string.IsNullOrWhiteSpace(nextMapName)
                ? "No map loaded"
                : nextMapName;
            _mapScopeBinding.Update(displayName);
            _sessionStartedBinding.Update(_sessionStarted);
            _statusBinding.Update(
                string.IsNullOrWhiteSpace(nextMapName)
                    ? "Waiting for a map"
                    : string.Concat("Monitoring ", nextMapName)
            );
        }

        private void EnsurePdxSubscription()
        {
            if (_pdxPlatform != null)
            {
                return;
            }

            _pdxPlatform = PlatformManager.instance?
                .GetPSI<PdxSdkPlatform>("PdxSdk");
            if (_pdxPlatform == null)
            {
                return;
            }

            _pdxPlatform.onActivePlaysetChanged += RequestContextRefresh;
            _pdxPlatform.onModsReady += RequestContextRefresh;
        }

        private void RequestContextRefresh()
        {
            _contextRefreshRequested = true;
            _nextContextAttemptUtc = DateTime.UtcNow.AddMilliseconds(350);
            _contextStatus = "Refreshing active playset";
            _contextStatusBinding.Update(_contextStatus);
        }

        private void RefreshContext()
        {
            _contextRefreshRequested = false;
            EnsurePdxSubscription();
            if (_pdxPlatform == null)
            {
                ScheduleContextRetry("Playset service is not ready");
                return;
            }

            try
            {
                var playset = _pdxPlatform.GetActivePlaysetSync();
                if (playset == null)
                {
                    _modsSnapshot = Array.Empty<ModContextEntry>();
                    UpdateContextBindings("No active playset", _modsSnapshot);
                    return;
                }

                HashSet<PdxMod> activeMods =
                    _pdxPlatform.GetModsInActivePlaysetSync();
                if (activeMods == null)
                {
                    ScheduleContextRetry(
                        "Active playset details are temporarily unavailable"
                    );
                    return;
                }

                var entries = new List<ModContextEntry>(activeMods.Count);
                foreach (PdxMod mod in activeMods)
                {
                    string name = Limit(
                        string.IsNullOrWhiteSpace(mod.displayName)
                            ? "Unnamed mod"
                            : mod.displayName.Trim(),
                        180
                    );
                    string version = Limit(
                        string.IsNullOrWhiteSpace(mod.userModVersion)
                            ? (mod.version ?? string.Empty)
                            : mod.userModVersion,
                        80
                    );
                    string pdxId = Limit(mod.id ?? string.Empty, 80);
                    string thumbnailPath = Limit(
                        mod.thumbnailPath ?? string.Empty,
                        512
                    );
                    string integration = GetRecognizedIntegration(
                        pdxId,
                        name
                    );

                    entries.Add(
                        new ModContextEntry(
                            pdxId,
                            name,
                            version,
                            thumbnailPath,
                            !string.IsNullOrEmpty(integration),
                            integration
                        )
                    );
                }

                entries.Sort(
                    (left, right) => string.Compare(
                        left.Name,
                        right.Name,
                        StringComparison.OrdinalIgnoreCase
                    )
                );
                _modsSnapshot = entries.ToArray();
                UpdateContextBindings(
                    string.Concat(
                        _modsSnapshot.Length,
                        " enabled mods in active playset"
                    ),
                    _modsSnapshot
                );
            }
            catch
            {
                ScheduleContextRetry(
                    "Active playset details are temporarily unavailable"
                );
            }
        }

        private void ScheduleContextRetry(string status)
        {
            _contextRefreshRequested = true;
            _nextContextAttemptUtc = DateTime.UtcNow.AddSeconds(10);
            UpdateContextBindings(status, _modsSnapshot);
        }

        private void UpdateContextBindings(
            string status,
            ModContextEntry[] mods
        )
        {
            _contextStatus = status;
            _contextStatusBinding.Update(status);
            _modsBinding.Update(mods);
            _modCountBinding.Update(mods.Length);
        }

        private static string GetRecognizedIntegration(
            string pdxId,
            string name
        )
        {
            switch (pdxId)
            {
                case "74539":
                    return "Reference images";
                case "74604":
                    return "Placement rules";
                case "75250":
                    return "Removal filters";
                case "74328":
                    return "Map tiles";
                case "74417":
                    return "Shared icon library";
                case "74324":
                    return "Object transforms";
                case "133736":
                    return "Network geometry";
                case "84638":
                    return "Color painter";
                case "87190":
                    return "Custom roads";
                case "152595":
                    return "Map Editor Bridge";
            }

            if (
                name.IndexOf(
                    "Map Editor Bridge",
                    StringComparison.OrdinalIgnoreCase
                ) >= 0
            )
            {
                return "Map Editor Bridge";
            }

            return string.Empty;
        }

        private void OnLogMessage(
            ILog log,
            Level level,
            string message,
            Exception exception,
            Object context
        )
        {
            try
            {
                bool isError = level >= Level.Error;
                string logName = log?.name ?? string.Empty;
                string source = Limit(
                    string.IsNullOrWhiteSpace(logName)
                        ? "Game"
                        : logName,
                    180
                );
                string normalizedMessage = Limit(
                    ResolveMessage(message, exception),
                    MaxMessageLength
                );
                string detail = Limit(
                    ResolveDetail(exception, context),
                    MaxDetailLength
                );
                string activeMapName = _activeMapName;
                if (
                    IsForeignSavedMapRecord(
                        normalizedMessage,
                        detail,
                        activeMapName
                    )
                )
                {
                    lock (_sync)
                    {
                        _foreignMapSuppressedCount++;
                    }
                    return;
                }
                string rawLevelName = level?.name ?? string.Empty;
                string levelName = string.IsNullOrWhiteSpace(rawLevelName)
                    ? (isError ? "ERROR" : "WARN")
                    : rawLevelName.ToUpperInvariant();
                int severity = level?.severity ??
                    (isError
                        ? Level.kErrorSeverity
                        : Level.kWarnSeverity);
                string key = string.Concat(
                    severity,
                    "\n",
                    source,
                    "\n",
                    normalizedMessage,
                    "\n",
                    detail
                );

                lock (_sync)
                {
                    DateTime now = DateTime.Now;
                    if (_recordsByKey.TryGetValue(
                        key,
                        out MutableRecord record
                    ))
                    {
                        record.Timestamp = now;
                        record.Occurrences++;
                        record.Sequence = ++_nextSequence;
                    }
                    else
                    {
                        if (_recordsByKey.Count >= MaxUniqueEntries)
                        {
                            RemoveOldestLocked();
                        }

                        record = new MutableRecord
                        {
                            Id = string.Concat(
                                "SL-",
                                (++_nextId).ToString("D4")
                            ),
                            Key = key,
                            Timestamp = now,
                            Level = levelName,
                            Severity = severity,
                            Source = source,
                            Message = normalizedMessage,
                            Detail = detail,
                            Occurrences = 1,
                            Sequence = ++_nextSequence
                        };
                        _recordsByKey.Add(key, record);
                        _recordsById.Add(record.Id, record);

                        if (isError)
                        {
                            _errorCount++;
                        }
                        else
                        {
                            _warningCount++;
                        }
                    }

                    _dirty = true;
                }
            }
            catch
            {
                // Logging callbacks must never create another logging failure.
            }
        }

        private void Clear()
        {
            lock (_sync)
            {
                ResetLogLocked();
            }

            _statusBinding.Update("Current-map log cleared");
        }

        private void ResetLogLocked()
        {
            _recordsByKey.Clear();
            _recordsById.Clear();
            _errorCount = 0;
            _warningCount = 0;
            _prunedCount = 0;
            _foreignMapSuppressedCount = 0;
            _dirty = true;
        }

        private void CopyAll(bool includeWarnings)
        {
            LogEntry[] snapshot;
            int prunedCount;
            int foreignMapSuppressedCount;
            string activeMapName;
            lock (_sync)
            {
                snapshot = CreateSnapshotLocked(includeWarnings);
                prunedCount = _prunedCount;
                foreignMapSuppressedCount = _foreignMapSuppressedCount;
                activeMapName = _activeMapName;
            }

            var report = new StringBuilder();
            report.AppendLine("Stacklight situation report");
            report.Append("Stacklight: ")
                .AppendLine(StacklightVersion);
            report.Append("Game: ")
                .AppendLine(Game.Version.current.fullVersion);
            report.Append("Session started: ")
                .AppendLine(_sessionStarted);
            report.Append("Map scope: ")
                .AppendLine(
                    string.IsNullOrWhiteSpace(activeMapName)
                        ? "No map loaded"
                        : activeMapName
                );
            report.Append("Copied: ")
                .AppendLine(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            report.Append("Included: ")
                .AppendLine(includeWarnings ? "warnings and errors" : "errors only");
            report.Append("Unique records: ")
                .AppendLine(snapshot.Length.ToString());
            if (prunedCount > 0)
            {
                report.Append("Older unique records pruned: ")
                    .AppendLine(prunedCount.ToString());
            }
            if (foreignMapSuppressedCount > 0)
            {
                report.Append("Foreign saved-map records suppressed: ")
                    .AppendLine(foreignMapSuppressedCount.ToString());
            }

            AppendModContext(report, _modsSnapshot, _contextStatus);
            AppendSourceSummary(report, snapshot);

            report.AppendLine();
            report.AppendLine("======= Diagnostic Records =======");
            foreach (LogEntry entry in snapshot)
            {
                report.AppendLine();
                AppendEntry(report, entry);
            }

            GUIUtility.systemCopyBuffer = Sanitize(report.ToString());
            _statusBinding.Update(
                snapshot.Length == 0
                    ? "Empty report copied"
                    : "Session report copied"
            );
        }

        private static void AppendModContext(
            StringBuilder report,
            ModContextEntry[] mods,
            string contextStatus
        )
        {
            report.AppendLine();
            report.AppendLine("======= Active Playset =======");
            report.Append("Status: ")
                .AppendLine(contextStatus);
            report.AppendLine("Name: withheld by Stacklight");
            report.Append("Enabled mods: ")
                .AppendLine(mods.Length.ToString());

            foreach (ModContextEntry mod in mods)
            {
                report.Append("- ")
                    .Append(mod.Name);
                if (!string.IsNullOrWhiteSpace(mod.Version))
                {
                    report.Append(" v")
                        .Append(mod.Version);
                }
                if (!string.IsNullOrWhiteSpace(mod.PdxId))
                {
                    report.Append(" (PDX ")
                        .Append(mod.PdxId)
                        .Append(')');
                }
                if (mod.Recognized)
                {
                    report.Append(" [recognized: ")
                        .Append(mod.Integration)
                        .Append(']');
                }
                report.AppendLine();
            }
        }

        private static void AppendSourceSummary(
            StringBuilder report,
            LogEntry[] entries
        )
        {
            var counts = new Dictionary<string, int>(
                StringComparer.OrdinalIgnoreCase
            );
            foreach (LogEntry entry in entries)
            {
                counts.TryGetValue(entry.Source, out int current);
                counts[entry.Source] = current + entry.Occurrences;
            }

            var sources = new List<KeyValuePair<string, int>>(counts);
            sources.Sort(
                (left, right) =>
                {
                    int countOrder = right.Value.CompareTo(left.Value);
                    return countOrder != 0
                        ? countOrder
                        : string.Compare(
                            left.Key,
                            right.Key,
                            StringComparison.OrdinalIgnoreCase
                        );
                }
            );

            report.AppendLine();
            report.AppendLine("======= Record Sources =======");
            if (sources.Count == 0)
            {
                report.AppendLine("(none)");
                return;
            }

            int limit = Math.Min(12, sources.Count);
            for (int index = 0; index < limit; index++)
            {
                report.Append("- ")
                    .Append(sources[index].Key)
                    .Append(": ")
                    .AppendLine(sources[index].Value.ToString());
            }
        }

        private void CopyEntry(string id)
        {
            LogEntry entry;
            lock (_sync)
            {
                if (
                    string.IsNullOrWhiteSpace(id) ||
                    !_recordsById.TryGetValue(id, out MutableRecord record)
                )
                {
                    _statusBinding.Update("Entry is no longer available");
                    return;
                }

                entry = record.ToEntry();
            }

            var report = new StringBuilder();
            report.AppendLine("Stacklight log entry");
            AppendEntry(report, entry);
            GUIUtility.systemCopyBuffer = Sanitize(report.ToString());
            _statusBinding.Update(string.Concat(entry.Id, " copied"));
        }

        private LogEntry[] CreateSnapshotLocked(bool includeWarnings)
        {
            var list = new List<LogEntry>(_recordsByKey.Count);
            foreach (MutableRecord record in _recordsByKey.Values)
            {
                if (
                    includeWarnings ||
                    record.Severity >= Level.kErrorSeverity
                )
                {
                    list.Add(record.ToEntry());
                }
            }

            list.Sort(
                (left, right) =>
                    right.Sequence.CompareTo(left.Sequence)
            );
            return list.ToArray();
        }

        private void RemoveOldestLocked()
        {
            MutableRecord? oldest = null;
            foreach (MutableRecord record in _recordsByKey.Values)
            {
                if (oldest == null || record.Sequence < oldest.Sequence)
                {
                    oldest = record;
                }
            }

            if (oldest == null)
            {
                return;
            }

            _recordsByKey.Remove(oldest.Key);
            _recordsById.Remove(oldest.Id);
            if (oldest.Severity >= Level.kErrorSeverity)
            {
                _errorCount = Math.Max(0, _errorCount - 1);
            }
            else
            {
                _warningCount = Math.Max(0, _warningCount - 1);
            }
            _prunedCount++;
        }

        private static string ResolveMessage(
            string message,
            Exception exception
        )
        {
            if (!string.IsNullOrWhiteSpace(message))
            {
                return message.Trim();
            }

            if (exception != null && !string.IsNullOrWhiteSpace(exception.Message))
            {
                return exception.Message.Trim();
            }

            return "Unspecified log message";
        }

        private static string ResolveDetail(
            Exception exception,
            Object context
        )
        {
            try
            {
                string detail = ErrorDialogManager.GetErrorDetail(
                    exception,
                    context
                );
                if (!string.IsNullOrWhiteSpace(detail))
                {
                    return detail.Trim();
                }
            }
            catch
            {
                // Fall back to the exception text below.
            }

            return exception?.ToString() ?? string.Empty;
        }

        private static string Limit(string value, int length)
        {
            if (string.IsNullOrEmpty(value) || value.Length <= length)
            {
                return value ?? string.Empty;
            }

            return string.Concat(
                value.Substring(0, length),
                "\n… [truncated by Stacklight]"
            );
        }

        private static void AppendEntry(
            StringBuilder report,
            LogEntry entry
        )
        {
            report.Append('[')
                .Append(entry.Timestamp)
                .Append("] ")
                .Append(entry.Level)
                .Append(" — ")
                .Append(entry.Source);
            if (entry.Occurrences > 1)
            {
                report.Append(" (x")
                    .Append(entry.Occurrences)
                    .Append(')');
            }

            report.AppendLine()
                .AppendLine(entry.Message);
            if (!string.IsNullOrWhiteSpace(entry.Detail))
            {
                report.AppendLine(entry.Detail);
            }
        }

        private static string Sanitize(string value)
        {
            string sanitized = StripControlCharacters(value);
            string profile = Environment.GetFolderPath(
                Environment.SpecialFolder.UserProfile
            );
            if (!string.IsNullOrWhiteSpace(profile))
            {
                sanitized = ReplaceInsensitive(
                    sanitized,
                    profile,
                    "%USERPROFILE%"
                );
                string forwardProfile = profile.Replace('\\', '/');
                sanitized = ReplaceInsensitive(
                    sanitized,
                    forwardProfile,
                    "%USERPROFILE%"
                );
            }

            string userName = Environment.UserName;
            if (!string.IsNullOrWhiteSpace(userName) && userName.Length >= 3)
            {
                sanitized = ReplaceInsensitive(
                    sanitized,
                    userName,
                    "%USERNAME%"
                );
            }

            sanitized = EmailPattern.Replace(
                sanitized,
                match => IsAssetDatabasePrefabReference(sanitized, match)
                    ? match.Value
                    : "[REDACTED EMAIL]"
            );
            sanitized = BearerPattern.Replace(
                sanitized,
                "Bearer [REDACTED]"
            );
            return CredentialPattern.Replace(
                sanitized,
                match => string.Concat(
                    match.Groups[1].Value,
                    "=[REDACTED]"
                )
            );
        }

        private static bool IsAssetDatabasePrefabReference(
            string value,
            Match match
        )
        {
            if (
                match.Value.IndexOf(
                    ".cok@",
                    StringComparison.OrdinalIgnoreCase
                ) < 0
            )
            {
                return false;
            }

            int tokenStart = match.Index;
            while (
                tokenStart > 0 &&
                !char.IsWhiteSpace(value[tokenStart - 1])
            )
            {
                tokenStart--;
            }

            return value.IndexOf(
                "assetdb://",
                tokenStart,
                match.Index - tokenStart,
                StringComparison.OrdinalIgnoreCase
            ) >= 0;
        }

        private static bool IsForeignSavedMapRecord(
            string message,
            string detail,
            string activeMapName
        )
        {
            string searchable = string.Concat(
                message ?? string.Empty,
                "\n",
                detail ?? string.Empty
            );
            MatchCollection matches = SavedMapAssetPattern.Matches(searchable);
            if (matches.Count == 0)
            {
                return false;
            }

            string activeMapKey = NormalizeMapKey(activeMapName);
            if (activeMapKey.Length == 0)
            {
                return true;
            }

            foreach (Match match in matches)
            {
                if (
                    string.Equals(
                        NormalizeMapKey(match.Groups["map"].Value),
                        activeMapKey,
                        StringComparison.Ordinal
                    )
                )
                {
                    return false;
                }
            }

            return true;
        }

        private static string NormalizeMapKey(string value)
        {
            string decoded = value ?? string.Empty;
            try
            {
                decoded = Uri.UnescapeDataString(decoded);
            }
            catch (UriFormatException)
            {
                // A malformed path can still be compared as plain text.
            }

            if (
                decoded.EndsWith(
                    ".cok",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                decoded = decoded.Substring(0, decoded.Length - 4);
            }

            var normalized = new StringBuilder(decoded.Length);
            foreach (char character in decoded)
            {
                if (char.IsLetterOrDigit(character))
                {
                    normalized.Append(char.ToLowerInvariant(character));
                }
            }
            return normalized.ToString();
        }

        private static string StripControlCharacters(string value)
        {
            var result = new StringBuilder(value?.Length ?? 0);
            foreach (char character in value ?? string.Empty)
            {
                if (
                    character == '\r' ||
                    character == '\n' ||
                    character == '\t' ||
                    !char.IsControl(character)
                )
                {
                    result.Append(character);
                }
            }
            return result.ToString();
        }

        private static string ReplaceInsensitive(
            string value,
            string search,
            string replacement
        )
        {
            int index = value.IndexOf(
                search,
                StringComparison.OrdinalIgnoreCase
            );
            if (index < 0)
            {
                return value;
            }

            var result = new StringBuilder(value.Length);
            int cursor = 0;
            while (index >= 0)
            {
                result.Append(value, cursor, index - cursor);
                result.Append(replacement);
                cursor = index + search.Length;
                index = value.IndexOf(
                    search,
                    cursor,
                    StringComparison.OrdinalIgnoreCase
                );
            }

            result.Append(value, cursor, value.Length - cursor);
            return result.ToString();
        }

        private sealed class MutableRecord
        {
            public string Id = string.Empty;
            public string Key = string.Empty;
            public DateTime Timestamp;
            public string Level = string.Empty;
            public int Severity;
            public string Source = string.Empty;
            public string Message = string.Empty;
            public string Detail = string.Empty;
            public int Occurrences;
            public long Sequence;

            public LogEntry ToEntry()
            {
                return new LogEntry(
                    Id,
                    Timestamp,
                    Level,
                    Severity,
                    Source,
                    Message,
                    Detail,
                    Occurrences,
                    Sequence
                );
            }
        }

        public readonly struct ModContextEntry : IJsonWritable
        {
            public readonly string PdxId;
            public readonly string Name;
            public readonly string Version;
            public readonly string ThumbnailPath;
            public readonly bool Recognized;
            public readonly string Integration;

            public ModContextEntry(
                string pdxId,
                string name,
                string version,
                string thumbnailPath,
                bool recognized,
                string integration
            )
            {
                PdxId = pdxId;
                Name = name;
                Version = version;
                ThumbnailPath = thumbnailPath;
                Recognized = recognized;
                Integration = integration;
            }

            public void Write(IJsonWriter writer)
            {
                writer.TypeBegin("StacklightModContextEntry");
                writer.PropertyName("pdxId");
                writer.Write(PdxId);
                writer.PropertyName("name");
                writer.Write(Name);
                writer.PropertyName("version");
                writer.Write(Version);
                writer.PropertyName("thumbnailPath");
                writer.Write(ThumbnailPath);
                writer.PropertyName("recognized");
                writer.Write(Recognized);
                writer.PropertyName("integration");
                writer.Write(Integration);
                writer.TypeEnd();
            }
        }

        public readonly struct LogEntry : IJsonWritable
        {
            public readonly string Id;
            public readonly DateTime TimestampValue;
            public readonly string Timestamp;
            public readonly string Level;
            public readonly int Severity;
            public readonly string Source;
            public readonly string Message;
            public readonly string Detail;
            public readonly int Occurrences;
            public readonly long Sequence;

            public LogEntry(
                string id,
                DateTime timestamp,
                string level,
                int severity,
                string source,
                string message,
                string detail,
                int occurrences,
                long sequence
            )
            {
                Id = id;
                TimestampValue = timestamp;
                Timestamp = timestamp.ToString("HH:mm:ss,fff");
                Level = level;
                Severity = severity;
                Source = source;
                Message = message;
                Detail = detail;
                Occurrences = occurrences;
                Sequence = sequence;
            }

            public void Write(IJsonWriter writer)
            {
                writer.TypeBegin("StacklightEntry");
                writer.PropertyName("id");
                writer.Write(Id);
                writer.PropertyName("timestamp");
                writer.Write(Timestamp);
                writer.PropertyName("level");
                writer.Write(Level);
                writer.PropertyName("severity");
                writer.Write(Severity);
                writer.PropertyName("source");
                writer.Write(Source);
                writer.PropertyName("message");
                writer.Write(Message);
                writer.PropertyName("detail");
                writer.Write(Detail);
                writer.PropertyName("occurrences");
                writer.Write(Occurrences);
                writer.TypeEnd();
            }
        }
    }
}
