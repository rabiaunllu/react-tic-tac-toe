using System.Collections.Concurrent;
using System.Security.Cryptography;
using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed class InMemoryRoomStore : IRoomStore
{
    private const int RoomCodeLength = 6;
    private const string RoomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static readonly string[] ArenaPowerIds = ["bomb", "shield", "boost", "trap"];
    private static readonly IReadOnlyDictionary<string, TimeSpan> RoomExpirationTimes =
        new Dictionary<string, TimeSpan>(StringComparer.OrdinalIgnoreCase)
        {
            [RoomStatuses.Waiting] = TimeSpan.FromMinutes(30),
            [RoomStatuses.Ready] = TimeSpan.FromMinutes(45),
            [RoomStatuses.Playing] = TimeSpan.FromHours(2),
            [RoomStatuses.Completed] = TimeSpan.FromMinutes(15)
        };

    private readonly ConcurrentDictionary<string, Room> rooms = new(StringComparer.OrdinalIgnoreCase);

    public Room Create(CreateRoomOptions options)
    {
        CleanupExpiredRooms();

        while (true)
        {
            var roomCode = GenerateRoomCode();
            var now = DateTimeOffset.UtcNow;
            var owner = new Player(
                Guid.NewGuid().ToString("N"),
                options.PlayerName,
                "X");
            var room = new Room(
                roomCode,
                RoomStatuses.Waiting,
                options.BoardSize,
                options.WinLength,
                options.GameMode,
                options.TargetValue,
                options.BoostMode,
                [owner],
                CreateInitialGameState(options.BoardSize, options.GameMode, [owner]),
                now,
                now);

            if (rooms.TryAdd(roomCode, room))
            {
                return room;
            }
        }
    }

    public Room? GetByCode(string roomCode)
    {
        CleanupExpiredRooms();

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
        CleanupExpiredRooms();

        var normalizedRoomCode = NormalizeRoomCode(roomCode);
        var normalizedPlayerName = playerName.Trim();

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

            var existingPlayer = room.Players.FirstOrDefault(player =>
                string.Equals(
                    player.Name.Trim(),
                    normalizedPlayerName,
                    StringComparison.OrdinalIgnoreCase));

            if (existingPlayer is not null)
            {
                var reconnectedRoom = room with
                {
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                if (rooms.TryUpdate(normalizedRoomCode, reconnectedRoom, room))
                {
                    return JoinRoomResult.Joined(reconnectedRoom);
                }

                continue;
            }

            if (room.Players.Count >= 2)
            {
                return JoinRoomResult.Conflict("Room is full.");
            }

            if (room.Status is not RoomStatuses.Waiting)
            {
                return JoinRoomResult.Conflict("Room is not accepting new players.");
            }

            var guest = new Player(
                Guid.NewGuid().ToString("N"),
                normalizedPlayerName,
                "O");
            var joinedPowers = room.Game.PlayerPowers.ToDictionary(entry => entry.Key, entry => entry.Value);

            if (room.GameMode is GameModes.Arena)
            {
                joinedPowers[guest.Id] = CreateInitialPowerCounts();
            }

            var joinedRoom = room with
            {
                Status = RoomStatuses.Ready,
                UpdatedAt = DateTimeOffset.UtcNow,
                Players =
                [
                    .. room.Players,
                    guest
                ],
                Game = room.Game with { PlayerPowers = joinedPowers }
            };

            if (rooms.TryUpdate(normalizedRoomCode, joinedRoom, room))
            {
                return JoinRoomResult.Joined(joinedRoom);
            }
        }
    }

    public StartRoomResult Start(string roomCode, Guid playerId)
    {
        CleanupExpiredRooms();

        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null)
        {
            return StartRoomResult.NotFound();
        }

        while (true)
        {
            if (!rooms.TryGetValue(normalizedRoomCode, out var room))
            {
                return StartRoomResult.NotFound();
            }

            var player = room.Players.FirstOrDefault(currentPlayer =>
                Guid.TryParse(currentPlayer.Id, out var currentPlayerId)
                && currentPlayerId == playerId);

            if (player is null)
            {
                return StartRoomResult.Forbidden();
            }

            if (player.Symbol is not "X")
            {
                return StartRoomResult.Forbidden();
            }

            if (room.Players.Count < 2)
            {
                return StartRoomResult.Conflict("Room needs two players before starting.");
            }

            if (room.Status is not RoomStatuses.Ready)
            {
                return StartRoomResult.Conflict("Room is not ready to start.");
            }

            var startedRoom = room with
            {
                Status = RoomStatuses.Playing,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            if (rooms.TryUpdate(normalizedRoomCode, startedRoom, room))
            {
                return StartRoomResult.Started(startedRoom);
            }
        }
    }

    public MoveRoomResult Move(string roomCode, Guid playerId, int index)
    {
        CleanupExpiredRooms();

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

            var playerIndex = FindPlayerIndex(room, playerId);

            if (playerIndex < 0)
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
            var playerSymbol = GetPlayerSymbol(room.Game.RoundNumber, playerIndex);

            if (playerSymbol != expectedSymbol)
            {
                return MoveRoomResult.Conflict("It is not this player's turn.");
            }

            var triggeredTrap = room.GameMode is GameModes.Arena
                ? room.Game.Traps.FirstOrDefault(trap =>
                    trap.Index == index
                    && !string.Equals(trap.OwnerPlayerId, room.Players[playerIndex].Id, StringComparison.OrdinalIgnoreCase))
                : null;

            if (triggeredTrap is not null)
            {
                var trapRoom = room with
                {
                    UpdatedAt = DateTimeOffset.UtcNow,
                    Game = room.Game with
                    {
                        XIsNext = !room.Game.XIsNext,
                        Traps = room.Game.Traps.Where(trap => trap != triggeredTrap).ToArray()
                    }
                };

                if (rooms.TryUpdate(normalizedRoomCode, trapRoom, room))
                {
                    return MoveRoomResult.Moved(trapRoom);
                }

                continue;
            }

            var squares = room.Game.Squares.ToArray();
            squares[index] = playerSymbol;

            var winningLine = CalculateWinningLine(squares, room.BoardSize, room.WinLength, playerSymbol);
            var winner = winningLine.Count > 0 ? playerSymbol : null;
            var isDraw = winner is null && squares.All(square => square is not null);
            var roundScore = winner is null
                ? 0
                : CalculateRoundScore(room, winningLine);
            var scores = winner is null
                ? room.Game.Scores
                : AddPlayerScore(room.Game.Scores, playerIndex, roundScore);
            var isMatchCompleted = winner is not null
                && GetPlayerScore(scores, playerIndex) >= room.TargetValue;

            var updatedRoom = room with
            {
                Status = isMatchCompleted ? RoomStatuses.Completed : room.Status,
                UpdatedAt = DateTimeOffset.UtcNow,
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

    public PowerRoomResult UsePower(string roomCode, Guid playerId, string powerId, int targetIndex)
    {
        CleanupExpiredRooms();
        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null)
        {
            return PowerRoomResult.NotFound();
        }

        var normalizedPowerId = powerId?.Trim().ToLowerInvariant() ?? string.Empty;

        while (true)
        {
            if (!rooms.TryGetValue(normalizedRoomCode, out var room))
            {
                return PowerRoomResult.NotFound();
            }

            if (!ArenaPowerIds.Contains(normalizedPowerId, StringComparer.Ordinal))
            {
                return PowerRoomResult.BadRequest("powerId", "Power is not supported in Online Arena.");
            }

            var playerIndex = FindPlayerIndex(room, playerId);

            if (playerIndex < 0)
            {
                return PowerRoomResult.Forbidden();
            }

            if (room.Status is not RoomStatuses.Playing)
            {
                return PowerRoomResult.Conflict("Room is not playing.");
            }

            if (room.GameMode is not GameModes.Arena)
            {
                return PowerRoomResult.Conflict("Powers are only available in Arena rooms.");
            }

            if (room.Game.Winner is not null || room.Game.IsDraw)
            {
                return PowerRoomResult.Conflict("Game is already finished.");
            }

            var expectedSymbol = room.Game.XIsNext ? "X" : "O";
            var playerSymbol = GetPlayerSymbol(room.Game.RoundNumber, playerIndex);

            if (playerSymbol != expectedSymbol)
            {
                return PowerRoomResult.Conflict("It is not this player's turn.");
            }

            if (targetIndex < 0 || targetIndex >= room.Game.Squares.Count)
            {
                return PowerRoomResult.BadRequest("targetIndex", "Target index is outside the board.");
            }

            var playerIdText = room.Players[playerIndex].Id;
            if (!room.Game.PlayerPowers.TryGetValue(playerIdText, out var counts)
                || !counts.TryGetValue(normalizedPowerId, out var count))
            {
                return PowerRoomResult.BadRequest("powerId", "Power state is missing.");
            }

            if (count <= 0)
            {
                return PowerRoomResult.Conflict("Power has already been used.");
            }

            var validationError = ValidatePowerTarget(room, playerSymbol, normalizedPowerId, targetIndex);
            if (validationError is not null)
            {
                return PowerRoomResult.Conflict(validationError);
            }

            var squares = room.Game.Squares.ToArray();
            var shields = room.Game.ShieldedSquares.ToList();
            var boosts = room.Game.BoostedSquares.ToList();
            var traps = room.Game.Traps.ToList();

            switch (normalizedPowerId)
            {
                case "bomb":
                    squares[targetIndex] = null;
                    boosts.Remove(targetIndex);
                    break;
                case "shield":
                    shields.Add(targetIndex);
                    break;
                case "boost":
                    boosts.Add(targetIndex);
                    break;
                case "trap":
                    traps.Add(new ArenaTrap(playerIdText, targetIndex));
                    break;
            }

            var playerPowers = room.Game.PlayerPowers.ToDictionary(entry => entry.Key, entry => entry.Value);
            playerPowers[playerIdText] = counts.ToDictionary(
                entry => entry.Key,
                entry => entry.Key == normalizedPowerId ? entry.Value - 1 : entry.Value);

            var updatedRoom = room with
            {
                UpdatedAt = DateTimeOffset.UtcNow,
                Game = room.Game with
                {
                    Squares = squares,
                    XIsNext = normalizedPowerId == "boost"
                        ? room.Game.XIsNext
                        : !room.Game.XIsNext,
                    PlayerPowers = playerPowers,
                    ShieldedSquares = shields,
                    BoostedSquares = boosts,
                    Traps = traps
                }
            };

            if (rooms.TryUpdate(normalizedRoomCode, updatedRoom, room))
            {
                return PowerRoomResult.Used(updatedRoom);
            }
        }
    }

    public NextRoundResult NextRound(string roomCode, Guid playerId)
    {
        CleanupExpiredRooms();

        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null)
        {
            return NextRoundResult.NotFound();
        }

        while (true)
        {
            if (!rooms.TryGetValue(normalizedRoomCode, out var room))
            {
                return NextRoundResult.NotFound();
            }

            var player = room.Players.FirstOrDefault(currentPlayer =>
                Guid.TryParse(currentPlayer.Id, out var currentPlayerId)
                && currentPlayerId == playerId);

            if (player is null)
            {
                return NextRoundResult.Forbidden();
            }

            if (room.Status is not RoomStatuses.Playing)
            {
                return NextRoundResult.Conflict("Room is not playing.");
            }

            if (room.Game.Winner is null && !room.Game.IsDraw)
            {
                return NextRoundResult.Conflict("Game is not finished yet.");
            }

            var requestedPlayerIds = room.Game.NextRoundPlayerIds
                .Append(player.Id)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (requestedPlayerIds.Length < room.Players.Count)
            {
                var pendingRoom = room with
                {
                    UpdatedAt = DateTimeOffset.UtcNow,
                    Game = room.Game with
                    {
                        NextRoundPlayerIds = requestedPlayerIds
                    }
                };

                if (rooms.TryUpdate(normalizedRoomCode, pendingRoom, room))
                {
                    return NextRoundResult.Pending(pendingRoom);
                }

                continue;
            }

            var updatedRoom = room with
            {
                UpdatedAt = DateTimeOffset.UtcNow,
                Game = room.Game with
                {
                    Squares = CreateEmptySquares(room.BoardSize),
                    XIsNext = true,
                    RoundNumber = room.Game.RoundNumber + 1,
                    Winner = null,
                    IsDraw = false,
                    WinningLine = [],
                    NextRoundPlayerIds = [],
                    Multipliers = room.GameMode is GameModes.Arena
                        ? CreateArenaMultipliers(room.BoardSize)
                        : new Dictionary<int, int>(),
                    PlayerPowers = room.GameMode is GameModes.Arena
                        ? room.Players.ToDictionary(player => player.Id, _ => CreateInitialPowerCounts())
                        : new Dictionary<string, IReadOnlyDictionary<string, int>>(),
                    ShieldedSquares = [],
                    BoostedSquares = [],
                    Traps = []
                }
            };

            if (rooms.TryUpdate(normalizedRoomCode, updatedRoom, room))
            {
                return NextRoundResult.Started(updatedRoom);
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

    private static GameState CreateInitialGameState(
        int boardSize,
        string gameMode,
        IReadOnlyList<Player> players)
        => new(
            CreateEmptySquares(boardSize),
            true,
            new GameScore(0, 0),
            1,
            null,
            false,
            [],
            [],
            gameMode is GameModes.Arena
                ? CreateArenaMultipliers(boardSize)
                : new Dictionary<int, int>(),
            gameMode is GameModes.Arena
                ? players.ToDictionary(player => player.Id, _ => CreateInitialPowerCounts())
                : new Dictionary<string, IReadOnlyDictionary<string, int>>(),
            [],
            [],
            []);

    private static IReadOnlyList<string?> CreateEmptySquares(int boardSize)
        => Enumerable.Repeat<string?>(null, boardSize * boardSize).ToArray();

    private static int FindPlayerIndex(Room room, Guid playerId)
    {
        for (var index = 0; index < room.Players.Count; index++)
        {
            if (Guid.TryParse(room.Players[index].Id, out var currentPlayerId)
                && currentPlayerId == playerId)
            {
                return index;
            }
        }

        return -1;
    }

    private static string GetPlayerSymbol(int roundNumber, int playerIndex)
        => (roundNumber + playerIndex) % 2 == 1 ? "X" : "O";

    private static GameScore AddPlayerScore(GameScore scores, int playerIndex, int points)
        => playerIndex == 0
            ? scores with { X = scores.X + points }
            : scores with { O = scores.O + points };

    private static int GetPlayerScore(GameScore scores, int playerIndex)
        => playerIndex == 0 ? scores.X : scores.O;

    private static int CalculateRoundScore(Room room, IReadOnlyList<int> winningLine)
    {
        if (room.GameMode is not GameModes.Arena)
        {
            return 1;
        }

        return winningLine.Sum(index =>
        {
            var cellValue = room.Game.Multipliers.TryGetValue(index, out var multiplier)
                ? multiplier
                : 1;
            return room.Game.BoostedSquares.Contains(index) ? cellValue * 2 : cellValue;
        });
    }

    private static IReadOnlyDictionary<string, int> CreateInitialPowerCounts()
        => ArenaPowerIds.ToDictionary(powerId => powerId, _ => 1, StringComparer.Ordinal);

    private static IReadOnlyDictionary<int, int> CreateArenaMultipliers(int boardSize)
    {
        var multiplierCount = boardSize switch
        {
            3 => 2,
            4 => 3,
            _ => 4
        };
        var indexes = Enumerable.Range(0, boardSize * boardSize).ToList();
        var result = new Dictionary<int, int>();

        for (var position = 0; position < multiplierCount; position++)
        {
            var randomPosition = RandomNumberGenerator.GetInt32(indexes.Count);
            var index = indexes[randomPosition];
            indexes.RemoveAt(randomPosition);
            result[index] = position == multiplierCount - 1 ? 3 : 2;
        }

        return result;
    }

    private static string? ValidatePowerTarget(
        Room room,
        string playerSymbol,
        string powerId,
        int targetIndex)
        => powerId switch
        {
            "bomb" when room.Game.Squares[targetIndex] is null
                => "Bomb needs an occupied square.",
            "bomb" when room.Game.ShieldedSquares.Contains(targetIndex)
                => "Shielded stones cannot be removed.",
            "shield" when room.Game.Squares[targetIndex] != playerSymbol
                => "Shield can only target your own stone.",
            "shield" when room.Game.ShieldedSquares.Contains(targetIndex)
                => "Stone is already shielded.",
            "boost" when room.Game.Squares[targetIndex] is not null
                => "Boost needs an empty square.",
            "boost" when room.Game.BoostedSquares.Contains(targetIndex)
                => "Square is already boosted.",
            "trap" when room.Game.Squares[targetIndex] is not null
                => "Black Hole needs an empty square.",
            "trap" when room.Game.Traps.Any(trap => trap.Index == targetIndex)
                => "Square already contains a Black Hole.",
            _ => null
        };

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

    private void CleanupExpiredRooms()
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var (roomCode, room) in rooms)
        {
            if (!RoomExpirationTimes.TryGetValue(room.Status, out var expirationTime))
            {
                continue;
            }

            if (now - room.UpdatedAt >= expirationTime)
            {
                ((ICollection<KeyValuePair<string, Room>>)rooms).Remove(
                    new KeyValuePair<string, Room>(roomCode, room));
            }
        }
    }
}
