using XoArena.Api.Models;

namespace XoArena.Api.Contracts;

public sealed record GameScoreResponse(
    int X,
    int O)
{
    public static GameScoreResponse FromScore(GameScore score)
        => new(score.X, score.O);
}
