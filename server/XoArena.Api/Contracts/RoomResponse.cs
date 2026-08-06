using XoArena.Api.Models;

namespace XoArena.Api.Contracts;

public sealed record RoomResponse(
    string RoomCode,
    string Status,
    int BoardSize,
    int WinLength,
    string GameMode,
    int TargetValue,
    string? BoostMode,
    IReadOnlyList<PlayerResponse> Players,
    GameStateResponse Game,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static RoomResponse FromRoom(Room room)
        => new(
            room.Code,
            room.Status,
            room.BoardSize,
            room.WinLength,
            room.GameMode,
            room.TargetValue,
            room.BoostMode,
            room.Players.Select((player, index) => PlayerResponse.FromPlayer(
                player,
                GetPlayerSymbol(room.Game.RoundNumber, index),
                GetPlayerScore(room.Game.Scores, index))).ToArray(),
            GameStateResponse.FromGameState(room.Game),
            room.CreatedAt,
            room.UpdatedAt);

    private static string GetPlayerSymbol(int roundNumber, int playerIndex)
        => (roundNumber + playerIndex) % 2 == 1 ? "X" : "O";

    private static int GetPlayerScore(GameScore scores, int playerIndex)
        => playerIndex == 0 ? scores.X : scores.O;
}
