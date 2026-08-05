namespace XoArena.Api.Contracts;

public sealed record MoveRoomRequest(
    string PlayerId,
    int Index);
