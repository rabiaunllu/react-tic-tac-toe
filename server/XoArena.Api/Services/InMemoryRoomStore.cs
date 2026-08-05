using System.Collections.Concurrent;
using System.Security.Cryptography;
using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed class InMemoryRoomStore : IRoomStore
{
    private const int RoomCodeLength = 6;
    private const string RoomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private readonly ConcurrentDictionary<string, Room> rooms = new(StringComparer.OrdinalIgnoreCase);

    public Room Create(CreateRoomOptions options)
    {
        while (true)
        {
            var roomCode = GenerateRoomCode();
            var room = new Room(
                roomCode,
                RoomStatuses.Waiting,
                options.BoardSize,
                options.WinLength,
                options.GameMode,
                options.TargetValue,
                [
                    new Player(
                        Guid.NewGuid().ToString("N"),
                        options.PlayerName,
                        "X")
                ]);

            if (rooms.TryAdd(roomCode, room))
            {
                return room;
            }
        }
    }

    public Room? GetByCode(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
        {
            return null;
        }

        return rooms.TryGetValue(roomCode.Trim().ToUpperInvariant(), out var room)
            ? room
            : null;
    }

    private static string GenerateRoomCode()
    {
        var characters = new char[RoomCodeLength];

        for (var i = 0; i < characters.Length; i++)
        {
            characters[i] = RoomCodeAlphabet[RandomNumberGenerator.GetInt32(RoomCodeAlphabet.Length)];
        }

        return new string(characters);
    }
}
