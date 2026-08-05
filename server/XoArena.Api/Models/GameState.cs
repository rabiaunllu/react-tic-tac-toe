namespace XoArena.Api.Models;

public sealed record GameState(
    IReadOnlyList<string?> Squares,
    bool XIsNext,
    GameScore Scores,
    int RoundNumber,
    string? Winner,
    bool IsDraw,
    IReadOnlyList<int> WinningLine);
