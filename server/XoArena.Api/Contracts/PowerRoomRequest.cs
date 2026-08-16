namespace XoArena.Api.Contracts;

public sealed record PowerRoomRequest(
    string PlayerId,
    string PlayerSecret,
    string PowerId,
    int TargetIndex);
