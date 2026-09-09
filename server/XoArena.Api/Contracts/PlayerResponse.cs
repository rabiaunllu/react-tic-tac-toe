using XoArena.Api.Models;

namespace XoArena.Api.Contracts;

public sealed record PlayerResponse(
    string Id,
    string Name,
    string Symbol,
    int Score)
{
    public static PlayerResponse FromPlayer(Player player, string symbol, int score)
        => new(player.Id, player.Name, symbol, score);
}
