namespace XoArena.Api.Services;

public sealed record CreateRoomOptions(
    string PlayerName,
    int BoardSize,
    int WinLength,
    string GameMode,
    int TargetValue);
