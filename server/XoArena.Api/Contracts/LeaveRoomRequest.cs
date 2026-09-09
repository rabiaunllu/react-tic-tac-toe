namespace XoArena.Api.Contracts;

public sealed record LeaveRoomRequest(string PlayerId, string PlayerSecret, bool IsSurrender = false);
