using XoArena.Api.Models;

namespace XoArena.Api.Contracts;

public sealed record PlayerResponse(
    string Id,
    string Name,
    string Symbol)
{
    public static PlayerResponse FromPlayer(Player player)
        => new(player.Id, player.Name, player.Symbol);
}
