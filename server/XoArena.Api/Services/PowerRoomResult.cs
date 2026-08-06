using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record PowerRoomResult(
    PowerRoomStatus Status,
    Room? Room = null,
    string? ErrorMessage = null,
    string? ErrorField = null)
{
    public static PowerRoomResult Used(Room room) => new(PowerRoomStatus.Used, room);
    public static PowerRoomResult NotFound() => new(PowerRoomStatus.NotFound);
    public static PowerRoomResult Forbidden() => new(PowerRoomStatus.Forbidden);
    public static PowerRoomResult BadRequest(string field, string message)
        => new(PowerRoomStatus.BadRequest, ErrorMessage: message, ErrorField: field);
    public static PowerRoomResult Conflict(string message)
        => new(PowerRoomStatus.Conflict, ErrorMessage: message);
}
