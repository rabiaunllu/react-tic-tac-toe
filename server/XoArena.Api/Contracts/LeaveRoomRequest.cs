namespace XoArena.Api.Contracts;

public sealed record LeaveRoomRequest(string PlayerId, bool IsSurrender = false);
