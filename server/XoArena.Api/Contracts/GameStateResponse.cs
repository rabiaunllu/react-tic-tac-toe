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
    IReadOnlyList<string> NextRoundPlayerIds)
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
            game.NextRoundPlayerIds);
}
