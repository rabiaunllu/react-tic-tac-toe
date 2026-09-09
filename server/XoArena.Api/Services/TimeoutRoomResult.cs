using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record TimeoutRoomResult(
    TimeoutRoomStatus Status,
    Room? Room = null,
    string? ErrorMessage = null)
{
    public static TimeoutRoomResult TimedOut(Room room)
        => new(TimeoutRoomStatus.TimedOut, room);

    public static TimeoutRoomResult NotFound()
        => new(TimeoutRoomStatus.NotFound);

    public static TimeoutRoomResult Forbidden()
        => new(TimeoutRoomStatus.Forbidden);

    public static TimeoutRoomResult Conflict(string errorMessage)
        => new(TimeoutRoomStatus.Conflict, ErrorMessage: errorMessage);
}
