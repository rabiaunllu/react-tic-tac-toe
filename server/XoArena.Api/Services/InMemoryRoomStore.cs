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
        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null)
        {
            return null;
        }

        return rooms.TryGetValue(normalizedRoomCode, out var room)
            ? room
            : null;
    }

    public JoinRoomResult Join(string roomCode, string playerName)
    {
        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null)
        {
            return JoinRoomResult.NotFound();
        }

        while (true)
        {
            if (!rooms.TryGetValue(normalizedRoomCode, out var room))
            {
                return JoinRoomResult.NotFound();
            }

            if (room.Status is RoomStatuses.Playing or RoomStatuses.Completed)
            {
                return JoinRoomResult.Conflict("Room is not accepting new players.");
            }

            if (room.Players.Count >= 2)
            {
                return JoinRoomResult.Conflict("Room is full.");
            }

            var joinedRoom = room with
            {
                Status = RoomStatuses.Playing,
                Players =
                [
                    .. room.Players,
                    new Player(
                        Guid.NewGuid().ToString("N"),
                        playerName,
                        "O")
                ]
            };

            if (rooms.TryUpdate(normalizedRoomCode, joinedRoom, room))
            {
                return JoinRoomResult.Joined(joinedRoom);
            }
        }
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

    private static string? NormalizeRoomCode(string roomCode)
        => string.IsNullOrWhiteSpace(roomCode)
            ? null
            : roomCode.Trim().ToUpperInvariant();
}
