using XoArena.Api.Models;

namespace XoArena.Api.Contracts;

public sealed record RoomResponse(
    string RoomCode,
    string Status,
    int BoardSize,
    int WinLength,
    string GameMode,
    int TargetValue,
    IReadOnlyList<PlayerResponse> Players)
{
    public static RoomResponse FromRoom(Room room)
        => new(
            room.Code,
            room.Status,
            room.BoardSize,
            room.WinLength,
            room.GameMode,
            room.TargetValue,
            room.Players.Select(PlayerResponse.FromPlayer).ToArray());
}
