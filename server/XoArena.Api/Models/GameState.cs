namespace XoArena.Api.Models;

public sealed record GameState(
    IReadOnlyList<string?> Squares,
    bool XIsNext,
    GameScore Scores,
    int RoundNumber,
    string? Winner,
    bool IsDraw,
    IReadOnlyList<int> WinningLine,
    IReadOnlyList<string> NextRoundPlayerIds,
    IReadOnlyDictionary<int, int> Multipliers,
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, int>> PlayerPowers,
    IReadOnlyList<int> ShieldedSquares,
    IReadOnlyList<int> BoostedSquares,
    IReadOnlyList<int> LockedSquares,
    IReadOnlyList<ArenaTrap> Traps,
    IReadOnlyList<int> FrozenSquares,
    IReadOnlyList<int> StolenSquares,
    bool HasUsedPowerThisTurn = false,
    bool IsForfeit = false,
    string? FrozenBy = null);
