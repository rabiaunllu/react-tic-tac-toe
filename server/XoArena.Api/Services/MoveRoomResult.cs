using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record MoveRoomResult(
    MoveRoomStatus Status,
    Room? Room = null,
    string? ErrorMessage = null,
    string? ErrorField = null)
{
    public static MoveRoomResult Moved(Room room)
        => new(MoveRoomStatus.Moved, room);

    public static MoveRoomResult NotFound()
        => new(MoveRoomStatus.NotFound);

    public static MoveRoomResult Forbidden()
        => new(MoveRoomStatus.Forbidden);

    public static MoveRoomResult BadRequest(string errorField, string errorMessage)
        => new(MoveRoomStatus.BadRequest, ErrorMessage: errorMessage, ErrorField: errorField);

    public static MoveRoomResult Conflict(string errorMessage)
        => new(MoveRoomStatus.Conflict, ErrorMessage: errorMessage);
}
