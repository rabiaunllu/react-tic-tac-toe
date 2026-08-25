using System.Collections.Concurrent;
using System.Security.Cryptography;
using XoArena.Api.Models;

namespace XoArena.Api.Services;

public sealed class InMemoryRoomStore : IRoomStore
{
    private const int RoomCodeLength = 6;
    private const string RoomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static readonly string[] ArenaPowerIds = ["bomb", "shield", "boost", "trap", "freeze", "vampire"];
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
                "X",
                GeneratePlayerSecret());
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

        if (normalizedRoomCode is null || !rooms.TryGetValue(normalizedRoomCode, out var room))
        {
            return null;
        }

        // 30-Second Grace Period Check for Reconnecting status
        if (string.Equals(room.Status, RoomStatuses.Reconnecting, StringComparison.OrdinalIgnoreCase))
        {
            var now = DateTimeOffset.UtcNow;
            if (now - room.UpdatedAt >= TimeSpan.FromSeconds(30))
            {
                // 30 seconds expired -> forfeit win to the player who remained in room
                var remainingPlayerIndex = 0;
                var remainingPlayer = room.Players.FirstOrDefault();
                if (remainingPlayer is not null)
                {
                    for (var i = 0; i < room.Players.Count; i++)
                    {
                        if (string.Equals(room.Players[i].Id, remainingPlayer.Id, StringComparison.OrdinalIgnoreCase))
                        {
                            remainingPlayerIndex = i;
                            break;
                        }
                    }
                }

                var winnerSymbol = GetPlayerSymbol(room.Game.RoundNumber, remainingPlayerIndex);
                var updatedScores = remainingPlayerIndex == 0
                    ? room.Game.Scores with { X = Math.Max(room.Game.Scores.X, room.TargetValue) }
                    : room.Game.Scores with { O = Math.Max(room.Game.Scores.O, room.TargetValue) };

                var updatedGame = room.Game with
                {
                    Winner = winnerSymbol,
                    Scores = updatedScores,
                    WinningLine = [],
                    IsForfeit = true
                };
                var expiredRoom = room with
                {
                    Status = RoomStatuses.Completed,
                    Game = updatedGame,
                    UpdatedAt = now
                };
                rooms[normalizedRoomCode] = expiredRoom;
                return expiredRoom;
            }
        }

        return room;
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

            var isHost = room.Players.Count > 0 && string.Equals(room.Players[0].Name.Trim(), normalizedPlayerName, StringComparison.OrdinalIgnoreCase);

            if (isHost && room.Players.Count == 1)
            {
                return JoinRoomResult.Conflict("Oyuna katılan kişi oda sahibi ile aynı isme sahip olamaz.");
            }

            var existingPlayer = room.Players.FirstOrDefault(player =>
                string.Equals(
                    player.Name.Trim(),
                    normalizedPlayerName,
                    StringComparison.OrdinalIgnoreCase));

            if (existingPlayer is not null)
            {
                return JoinRoomResult.Conflict("Bu oyuncu adı zaten kullanılıyor.");
            }

            if (room.Players.Count >= 2)
            {
                return JoinRoomResult.Conflict("Bu oda dolu.");
            }

            if (room.Status is not RoomStatuses.Waiting)
            {
                return JoinRoomResult.Conflict("Room is not accepting new players.");
            }

            var guest = new Player(
                Guid.NewGuid().ToString("N"),
                normalizedPlayerName,
                "O",
                GeneratePlayerSecret());
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
                return JoinRoomResult.Joined(joinedRoom, guest.PlayerSecret);
            }
        }
    }

    public StartRoomResult Start(string roomCode, Guid playerId, string playerSecret)
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

            if (player is null || !HasMatchingSecret(player, playerSecret))
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

    public MoveRoomResult Move(string roomCode, Guid playerId, string playerSecret, int index)
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

            var playerIndex = FindPlayerIndex(room, playerId, playerSecret);

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

            if (room.Game.LockedSquares.Contains(index))
            {
                return MoveRoomResult.Conflict("Square is temporarily locked.");
            }

            if (room.Game.FrozenSquares.Contains(index))
            {
                return MoveRoomResult.Conflict("Square is temporarily frozen.");
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
                var isTrapPlayerFreezer = string.Equals(room.Game.FrozenBy, playerSymbol, StringComparison.OrdinalIgnoreCase);
                var nextTrapFrozenSquares = isTrapPlayerFreezer ? room.Game.FrozenSquares : [];

                var trapRoom = room with
                {
                    UpdatedAt = DateTimeOffset.UtcNow,
                    Game = room.Game with
                    {
                        XIsNext = !room.Game.XIsNext,
                        HasUsedPowerThisTurn = false,
                        LockedSquares = [],
                        FrozenSquares = nextTrapFrozenSquares,
                        FrozenBy = null,
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

            var isMovePlayerFreezer = string.Equals(room.Game.FrozenBy, playerSymbol, StringComparison.OrdinalIgnoreCase);
            var nextMoveFrozenSquares = isMovePlayerFreezer ? room.Game.FrozenSquares : [];

            var updatedRoom = room with
            {
                Status = isMatchCompleted ? RoomStatuses.Completed : room.Status,
                UpdatedAt = DateTimeOffset.UtcNow,
                Game = room.Game with
                {
                    Squares = squares,
                    XIsNext = !room.Game.XIsNext,
                    HasUsedPowerThisTurn = false,
                    Scores = scores,
                    Winner = winner,
                    IsDraw = isDraw,
                    WinningLine = winningLine,
                    LockedSquares = [],
                    FrozenSquares = nextMoveFrozenSquares,
                    FrozenBy = null
                }
            };

            if (rooms.TryUpdate(normalizedRoomCode, updatedRoom, room))
            {
                return MoveRoomResult.Moved(updatedRoom);
            }
        }
    }

    public PowerRoomResult UsePower(string roomCode, Guid playerId, string playerSecret, string powerId, int targetIndex)
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

            var playerIndex = FindPlayerIndex(room, playerId, playerSecret);

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

            if (room.Game.HasUsedPowerThisTurn)
            {
                return PowerRoomResult.Conflict("You have already used a power this turn. Place a stone to continue.");
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
            var lockedSquares = room.Game.LockedSquares.ToList();
            var traps = room.Game.Traps.ToList();
            var frozenSquares = room.Game.FrozenSquares.ToList();
            var stolenSquares = room.Game.StolenSquares?.ToList() ?? new List<int>();
            var multipliers = new Dictionary<int, int>(room.Game.Multipliers);

            lockedSquares.Clear();

            switch (normalizedPowerId)
            {
                case "bomb":
                    squares[targetIndex] = null;
                    boosts.Remove(targetIndex);
                    multipliers.Remove(targetIndex);
                    stolenSquares.Remove(targetIndex);
                    lockedSquares.Add(targetIndex);
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
                case "freeze":
                    frozenSquares.Add(targetIndex);
                    break;
                case "vampire":
                    var opponentSymbol = playerSymbol == "X" ? "O" : "X";
                    var sourceIndex = -1;
                    var targetStoneIndex = -1;

                    if (multipliers.ContainsKey(targetIndex) && squares[targetIndex] == opponentSymbol && !stolenSquares.Contains(targetIndex))
                    {
                        sourceIndex = targetIndex;
                        targetStoneIndex = Enumerable.Range(0, squares.Length)
                            .FirstOrDefault(i => squares[i] == playerSymbol && !multipliers.ContainsKey(i), -1);
                    }
                    else if (squares[targetIndex] == playerSymbol && !multipliers.ContainsKey(targetIndex))
                    {
                        targetStoneIndex = targetIndex;
                        sourceIndex = Enumerable.Range(0, squares.Length)
                            .FirstOrDefault(i => squares[i] == opponentSymbol && multipliers.ContainsKey(i) && !stolenSquares.Contains(i), -1);
                    }
                    else
                    {
                        sourceIndex = Enumerable.Range(0, squares.Length)
                            .FirstOrDefault(i => squares[i] == opponentSymbol && multipliers.ContainsKey(i) && !stolenSquares.Contains(i), -1);
                        targetStoneIndex = Enumerable.Range(0, squares.Length)
                            .FirstOrDefault(i => squares[i] == playerSymbol && !multipliers.ContainsKey(i), -1);
                    }

                    if (sourceIndex >= 0 && targetStoneIndex >= 0 && multipliers.TryGetValue(sourceIndex, out var multVal))
                    {
                        multipliers.Remove(sourceIndex);
                        multipliers[targetStoneIndex] = multVal;
                        stolenSquares.Remove(sourceIndex);
                        if (!stolenSquares.Contains(targetStoneIndex))
                        {
                            stolenSquares.Add(targetStoneIndex);
                        }
                    }
                    break;
            }

            var playerPowers = room.Game.PlayerPowers.ToDictionary(entry => entry.Key, entry => entry.Value);
            playerPowers[playerIdText] = counts.ToDictionary(
                entry => entry.Key,
                entry => entry.Key == normalizedPowerId ? entry.Value - 1 : entry.Value);

            var passesTurn = normalizedPowerId is "bomb" or "trap";
            var nextFrozenBy = normalizedPowerId == "freeze" ? playerSymbol : room.Game.FrozenBy;

            if (passesTurn && !string.Equals(room.Game.FrozenBy, playerSymbol, StringComparison.OrdinalIgnoreCase))
            {
                frozenSquares.Clear();
                nextFrozenBy = null;
            }

            var updatedRoom = room with
            {
                UpdatedAt = DateTimeOffset.UtcNow,
                Game = room.Game with
                {
                    Squares = squares,
                    XIsNext = passesTurn ? !room.Game.XIsNext : room.Game.XIsNext,
                    HasUsedPowerThisTurn = !passesTurn,
                    PlayerPowers = playerPowers,
                    ShieldedSquares = shields,
                    BoostedSquares = boosts,
                    LockedSquares = lockedSquares,
                    Traps = traps,
                    FrozenSquares = frozenSquares,
                    FrozenBy = nextFrozenBy,
                    StolenSquares = stolenSquares,
                    Multipliers = multipliers
                }
            };

            if (rooms.TryUpdate(normalizedRoomCode, updatedRoom, room))
            {
                return PowerRoomResult.Used(updatedRoom);
            }
        }
    }

    public NextRoundResult NextRound(string roomCode, Guid playerId, string playerSecret)
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

            if (player is null || !HasMatchingSecret(player, playerSecret))
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
                    LockedSquares = [],
                    Traps = [],
                    FrozenSquares = [],
                    FrozenBy = null,
                    StolenSquares = [],
                    HasUsedPowerThisTurn = false
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

    private static string GeneratePlayerSecret()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

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
            [],
            [],
            [],
            [],
            false,
            false,
            null);

    private static IReadOnlyList<string?> CreateEmptySquares(int boardSize)
        => Enumerable.Repeat<string?>(null, boardSize * boardSize).ToArray();

    private static int FindPlayerIndex(Room room, Guid playerId, string playerSecret)
    {
        for (var index = 0; index < room.Players.Count; index++)
        {
            if (Guid.TryParse(room.Players[index].Id, out var currentPlayerId)
                && currentPlayerId == playerId
                && HasMatchingSecret(room.Players[index], playerSecret))
            {
                return index;
            }
        }

        return -1;
    }

    private static bool HasMatchingSecret(Player player, string? playerSecret)
    {
        if (string.IsNullOrWhiteSpace(playerSecret))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(player.PlayerSecret),
            System.Text.Encoding.UTF8.GetBytes(playerSecret));
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
            "boost" when room.Game.LockedSquares.Contains(targetIndex)
                => "Square is temporarily locked.",
            "boost" when room.Game.BoostedSquares.Contains(targetIndex)
                => "Square is already boosted.",
            "trap" when room.Game.Squares[targetIndex] is not null
                => "Black Hole needs an empty square.",
            "trap" when room.Game.LockedSquares.Contains(targetIndex)
                => "Square is temporarily locked.",
            "trap" when room.Game.Traps.Any(trap => trap.Index == targetIndex)
                => "Square already contains a Black Hole.",
            "freeze" when room.Game.Squares[targetIndex] is not null
                => "Freeze needs an empty square.",
            "freeze" when room.Game.LockedSquares.Contains(targetIndex)
                => "Square is temporarily locked.",
            "freeze" when room.Game.FrozenSquares.Contains(targetIndex)
                => "Square is already frozen.",
            "vampire" when room.Game.StolenSquares != null && room.Game.StolenSquares.Contains(targetIndex)
                => "Vampir ile daha önce çalınmış bir çarpan tekrar geri alınamaz.",
            "vampire" when !HasValidVampireTargets(room, playerSymbol)
                => "Vampire requires an opponent stone with a multiplier and your own stone without a multiplier.",
            _ => null
        };

    private static bool HasValidVampireTargets(Room room, string playerSymbol)
    {
        var opponentSymbol = playerSymbol == "X" ? "O" : "X";
        var stolenSquares = room.Game.StolenSquares ?? [];
        var hasOpponentMultiplier = room.Game.Multipliers.Keys.Any(i =>
            i >= 0 &&
            i < room.Game.Squares.Count &&
            room.Game.Squares[i] == opponentSymbol &&
            !stolenSquares.Contains(i));
        var hasPlayerUnmultipliedStone = Enumerable.Range(0, room.Game.Squares.Count)
            .Any(i => room.Game.Squares[i] == playerSymbol && !room.Game.Multipliers.ContainsKey(i));
        return hasOpponentMultiplier && hasPlayerUnmultipliedStone;
    }

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

    public bool Leave(string roomCode, Guid playerId, string playerSecret, bool isSurrender = false)
    {
        var normalizedRoomCode = NormalizeRoomCode(roomCode);

        if (normalizedRoomCode is null || !rooms.TryGetValue(normalizedRoomCode, out var room))
        {
            return false;
        }

        var playerStr = playerId.ToString("N");
        var player = room.Players.FirstOrDefault(p => string.Equals(p.Id, playerStr, StringComparison.OrdinalIgnoreCase));

        if (player is null || !HasMatchingSecret(player, playerSecret))
        {
            return false;
        }

        // If game is actively playing or reconnecting:
        if (string.Equals(room.Status, RoomStatuses.Playing, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(room.Status, RoomStatuses.Reconnecting, StringComparison.OrdinalIgnoreCase))
        {
            var remainingPlayerIndex = -1;
            for (var i = 0; i < room.Players.Count; i++)
            {
                if (!string.Equals(room.Players[i].Id, playerStr, StringComparison.OrdinalIgnoreCase))
                {
                    remainingPlayerIndex = i;
                    break;
                }
            }

            // Explicit menu surrender -> IMMEDIATE FORFEIT WIN (0s delay!)
            if (isSurrender || remainingPlayerIndex < 0)
            {
                if (remainingPlayerIndex < 0)
                {
                    remainingPlayerIndex = 0;
                }

                var winnerSymbol = GetPlayerSymbol(room.Game.RoundNumber, remainingPlayerIndex);
                var updatedScores = remainingPlayerIndex == 0
                    ? room.Game.Scores with { X = Math.Max(room.Game.Scores.X, room.TargetValue) }
                    : room.Game.Scores with { O = Math.Max(room.Game.Scores.O, room.TargetValue) };

                var updatedGame = room.Game with
                {
                    Winner = winnerSymbol,
                    Scores = updatedScores,
                    WinningLine = [],
                    IsForfeit = true
                };

                var forfeitRoom = room with
                {
                    Status = RoomStatuses.Completed,
                    Game = updatedGame,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                rooms[normalizedRoomCode] = forfeitRoom;
                return true;
            }

            // Connection drop: Start 30s Reconnection Grace Period
            var reconnectingRoom = room with
            {
                Status = RoomStatuses.Reconnecting,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            rooms[normalizedRoomCode] = reconnectingRoom;
            return true;
        }

        // Host ('X') left or only 1 player -> destroy room completely
        if (string.Equals(player.Symbol, "X", StringComparison.OrdinalIgnoreCase) || room.Players.Count <= 1)
        {
            rooms.TryRemove(normalizedRoomCode, out _);
            return true;
        }

        // Guest ('O') left -> remove guest, revert status to waiting
        var remainingPlayers = room.Players
            .Where(p => !string.Equals(p.Id, playerStr, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var updatedRoom = room with
        {
            Players = remainingPlayers,
            Status = RoomStatuses.Waiting,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        rooms[normalizedRoomCode] = updatedRoom;
        return true;
    }

    private static string? NormalizeRoomCode(string roomCode)
        => string.IsNullOrWhiteSpace(roomCode)
            ? null
            : roomCode.Trim().ToUpperInvariant();

    public int CleanupExpiredRooms()
    {
        var now = DateTimeOffset.UtcNow;
        var removed = 0;

        foreach (var (roomCode, room) in rooms)
        {
            if (!RoomExpirationTimes.TryGetValue(room.Status, out var expirationTime))
            {
                continue;
            }

            if (now - room.UpdatedAt >= expirationTime)
            {
                if (((ICollection<KeyValuePair<string, Room>>)rooms).Remove(
                        new KeyValuePair<string, Room>(roomCode, room)))
                {
                    removed++;
                }
            }
        }

        return removed;
    }
}
