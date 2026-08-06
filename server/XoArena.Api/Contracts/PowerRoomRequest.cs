namespace XoArena.Api.Contracts;

public sealed record PowerRoomRequest(
    string PlayerId,
    string PowerId,
    int TargetIndex);
