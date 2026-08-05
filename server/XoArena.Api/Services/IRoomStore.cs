using XoArena.Api.Models;

namespace XoArena.Api.Services;

public interface IRoomStore
{
    Room Create(CreateRoomOptions options);

    Room? GetByCode(string roomCode);

    JoinRoomResult Join(string roomCode, string playerName);

    MoveRoomResult Move(string roomCode, Guid playerId, int index);

    StartRoomResult Start(string roomCode, Guid playerId);

    NextRoundResult NextRound(string roomCode, Guid playerId);
}
