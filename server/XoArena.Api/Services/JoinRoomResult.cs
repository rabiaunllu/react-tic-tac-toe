using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record JoinRoomResult(
    JoinRoomStatus Status,
    Room? Room = null,
    string? PlayerSecret = null,
    string? ErrorMessage = null)
{
    public static JoinRoomResult Joined(Room room, string playerSecret)
        => new(JoinRoomStatus.Joined, room, playerSecret);

    public static JoinRoomResult NotFound()
        => new(JoinRoomStatus.NotFound);

    public static JoinRoomResult Conflict(string errorMessage)
        => new(JoinRoomStatus.Conflict, ErrorMessage: errorMessage);
}
