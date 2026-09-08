using XoArena.Api.Models;

namespace XoArena.Api.Contracts;

public sealed record GameStateResponse(
    IReadOnlyList<string?> Squares,
    bool XIsNext,
    GameScoreResponse Scores,
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
    IReadOnlyList<int> FrozenSquares,
    IReadOnlyList<int> StolenSquares,
    bool HasUsedPowerThisTurn,
    bool IsForfeit,
    bool IsTimeout = false,
    string? TimedOutPlayerSymbol = null)
{
    public static GameStateResponse FromGameState(GameState game)
        => new(
            game.Squares,
            game.XIsNext,
            GameScoreResponse.FromScore(game.Scores),
            game.RoundNumber,
            game.Winner,
            game.IsDraw,
            game.WinningLine,
            game.NextRoundPlayerIds,
            game.Multipliers,
            game.PlayerPowers,
            game.ShieldedSquares,
            game.BoostedSquares,
            game.LockedSquares,
            game.FrozenSquares,
            game.StolenSquares ?? [],
            game.HasUsedPowerThisTurn,
            game.IsForfeit,
            game.IsTimeout,
            game.TimedOutPlayerSymbol);
}
