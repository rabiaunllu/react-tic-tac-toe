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
                ],
                CreateInitialGameState(options.BoardSize));

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

    public MoveRoomResult Move(string roomCode, Guid playerId, int index)
    {
        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null)
        {
            return MoveRoomResult.NotFound();
        }

        while (true)
        {
            if (!rooms.TryGetValue(normalizedRoomCode, out var room))
            {
                return MoveRoomResult.NotFound();
            }

            var player = room.Players.FirstOrDefault(currentPlayer =>
                Guid.TryParse(currentPlayer.Id, out var currentPlayerId)
                && currentPlayerId == playerId);

            if (player is null)
            {
                return MoveRoomResult.Forbidden();
            }

            if (room.Status is not RoomStatuses.Playing)
            {
                return MoveRoomResult.Conflict("Room is not playing.");
            }

            if (room.Game.Winner is not null || room.Game.IsDraw)
            {
                return MoveRoomResult.Conflict("Game is already finished.");
            }

            if (index < 0 || index >= room.Game.Squares.Count)
            {
                return MoveRoomResult.BadRequest("index", "Index is outside the board.");
            }

            if (room.Game.Squares[index] is not null)
            {
                return MoveRoomResult.Conflict("Square is already occupied.");
            }

            var expectedSymbol = room.Game.XIsNext ? "X" : "O";

            if (player.Symbol != expectedSymbol)
            {
                return MoveRoomResult.Conflict("It is not this player's turn.");
            }

            var squares = room.Game.Squares.ToArray();
            squares[index] = player.Symbol;

            var winningLine = CalculateWinningLine(squares, room.BoardSize, room.WinLength, player.Symbol);
            var winner = winningLine.Count > 0 ? player.Symbol : null;
            var isDraw = winner is null && squares.All(square => square is not null);
            var scores = winner switch
            {
                "X" => room.Game.Scores with { X = room.Game.Scores.X + 1 },
                "O" => room.Game.Scores with { O = room.Game.Scores.O + 1 },
                _ => room.Game.Scores
            };

            var updatedRoom = room with
            {
                Game = room.Game with
                {
                    Squares = squares,
                    XIsNext = !room.Game.XIsNext,
                    Scores = scores,
                    Winner = winner,
                    IsDraw = isDraw,
                    WinningLine = winningLine
                }
            };

            if (rooms.TryUpdate(normalizedRoomCode, updatedRoom, room))
            {
                return MoveRoomResult.Moved(updatedRoom);
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

    private static GameState CreateInitialGameState(int boardSize)
        => new(
            Enumerable.Repeat<string?>(null, boardSize * boardSize).ToArray(),
            true,
            new GameScore(0, 0),
            1,
            null,
            false,
            []);

    private static IReadOnlyList<int> CalculateWinningLine(
        IReadOnlyList<string?> squares,
        int boardSize,
        int winLength,
        string symbol)
    {
        var directions = new (int Row, int Column)[]
        {
            (0, 1),
            (1, 0),
            (1, 1),
            (1, -1)
        };

        for (var row = 0; row < boardSize; row++)
        {
            for (var column = 0; column < boardSize; column++)
            {
                foreach (var direction in directions)
                {
                    var line = TryBuildWinningLine(
                        squares,
                        boardSize,
                        winLength,
                        symbol,
                        row,
                        column,
                        direction.Row,
                        direction.Column);

                    if (line.Count > 0)
                    {
                        return line;
                    }
                }
            }
        }

        return [];
    }

    private static IReadOnlyList<int> TryBuildWinningLine(
        IReadOnlyList<string?> squares,
        int boardSize,
        int winLength,
        string symbol,
        int startRow,
        int startColumn,
        int rowStep,
        int columnStep)
    {
        var line = new int[winLength];

        for (var offset = 0; offset < winLength; offset++)
        {
            var row = startRow + rowStep * offset;
            var column = startColumn + columnStep * offset;

            if (row < 0 || row >= boardSize || column < 0 || column >= boardSize)
            {
                return [];
            }

            var index = row * boardSize + column;

            if (squares[index] != symbol)
            {
                return [];
            }

            line[offset] = index;
        }

        return line;
    }

    private static string? NormalizeRoomCode(string roomCode)
        => string.IsNullOrWhiteSpace(roomCode)
            ? null
            : roomCode.Trim().ToUpperInvariant();
}
