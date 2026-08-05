using XoArena.Api.Models;

namespace XoArena.Api.Services;

public interface IRoomStore
{
    Room Create(CreateRoomOptions options);

    Room? GetByCode(string roomCode);
}
