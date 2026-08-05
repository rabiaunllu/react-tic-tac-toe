using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record JoinRoomResult(
    JoinRoomStatus Status,
    Room? Room = null,
    string? ErrorMessage = null)
{
    public static JoinRoomResult Joined(Room room)
        => new(JoinRoomStatus.Joined, room);

    public static JoinRoomResult NotFound()
        => new(JoinRoomStatus.NotFound);

    public static JoinRoomResult Conflict(string errorMessage)
        => new(JoinRoomStatus.Conflict, ErrorMessage: errorMessage);
}
