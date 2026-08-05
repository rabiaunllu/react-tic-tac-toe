namespace XoArena.Api.Contracts;

public sealed record CreateRoomRequest(
    string PlayerName,
    int BoardSize,
    int WinLength,
    string GameMode,
    int TargetValue);
