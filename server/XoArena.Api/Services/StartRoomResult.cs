using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record StartRoomResult(
    StartRoomStatus Status,
    Room? Room = null,
    string? ErrorMessage = null)
{
    public static StartRoomResult Started(Room room)
        => new(StartRoomStatus.Started, room);

    public static StartRoomResult NotFound()
        => new(StartRoomStatus.NotFound);

    public static StartRoomResult Forbidden()
        => new(StartRoomStatus.Forbidden);

    public static StartRoomResult Conflict(string errorMessage)
        => new(StartRoomStatus.Conflict, ErrorMessage: errorMessage);
}
