using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed record NextRoundResult(
    NextRoundStatus Status,
    Room? Room = null,
    string? ErrorMessage = null)
{
    public static NextRoundResult Pending(Room room)
        => new(NextRoundStatus.Pending, room);

    public static NextRoundResult Started(Room room)
        => new(NextRoundStatus.Started, room);

    public static NextRoundResult NotFound()
        => new(NextRoundStatus.NotFound);

    public static NextRoundResult Forbidden()
        => new(NextRoundStatus.Forbidden);

    public static NextRoundResult Conflict(string errorMessage)
        => new(NextRoundStatus.Conflict, ErrorMessage: errorMessage);
}
