namespace XoArena.Api.Contracts;

public sealed record MoveRoomRequest(
    string PlayerId,
    string PlayerSecret,
    int Index);
