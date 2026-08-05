namespace XoArena.Api.Models;

public sealed record Room(
    string Code,
    string Status,
    int BoardSize,
    int WinLength,
    string GameMode,
    int TargetValue,
    IReadOnlyList<Player> Players,
    GameState Game);
