using XoArena.Api.Models;

namespace XoArena.Api.Services;

public interface IRoomStore
{
    Room Create(CreateRoomOptions options);

    Room? GetByCode(string roomCode);

    JoinRoomResult Join(string roomCode, string playerName);

    MoveRoomResult Move(string roomCode, Guid playerId, string playerSecret, int index);

    PowerRoomResult UsePower(string roomCode, Guid playerId, string playerSecret, string powerId, int targetIndex);

    StartRoomResult Start(string roomCode, Guid playerId, string playerSecret);

    NextRoundResult NextRound(string roomCode, Guid playerId, string playerSecret);

    TimeoutRoomResult Timeout(string roomCode, Guid playerId, string playerSecret);

    bool Leave(string roomCode, Guid playerId, string playerSecret, bool isSurrender = false);

    /// <summary>
    /// Süresi dolmuş odaları temizler. Silinen oda sayısını döndürür.
    /// </summary>
    int CleanupExpiredRooms();
}
