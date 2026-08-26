using System.Security.Cryptography;
using Microsoft.AspNetCore.SignalR;
using XoArena.Api.Models;
using XoArena.Api.Services;

namespace XoArena.Api.Hubs;

public sealed class RoomsHub : Hub
{
    private readonly IRoomStore _roomStore;
    private readonly ILogger<RoomsHub> _logger;

    public RoomsHub(IRoomStore roomStore, ILogger<RoomsHub> logger)
    {
        _roomStore = roomStore;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates and subscribes a connection to a specific room channel.
    /// Strictly requires valid playerId and playerSecret to prevent unauthorized eavesdropping.
    /// </summary>
    public async Task<bool> JoinRoomGroup(string roomCode, string playerId, string playerSecret)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
        {
            throw new HubException("Invalid room code.");
        }

        if (string.IsNullOrWhiteSpace(playerId) || string.IsNullOrWhiteSpace(playerSecret))
        {
            _logger.LogWarning("Unauthenticated attempt to join room {RoomCode} with missing credentials from Connection {ConnectionId}", roomCode, Context.ConnectionId);
            throw new HubException("Unauthorized: Valid playerId and playerSecret are strictly required.");
        }

        var normalizedCode = roomCode.Trim().ToUpperInvariant();
        var room = _roomStore.GetByCode(normalizedCode);

        if (room is null)
        {
            throw new HubException("Room not found.");
        }

        // Strict Authorization: Verify caller is an authentic player belonging to this room with constant-time equality
        var isPlayerValid = room.Players.Any(p =>
            string.Equals(p.Id, playerId.Trim(), StringComparison.OrdinalIgnoreCase) &&
            CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(p.PlayerSecret),
                System.Text.Encoding.UTF8.GetBytes(playerSecret.Trim())));

        if (!isPlayerValid)
        {
            _logger.LogWarning("Unauthorized attempt to join SignalR group for room {RoomCode} by playerId {PlayerId}", normalizedCode, playerId);
            throw new HubException("Unauthorized: Invalid player credentials for this room.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, normalizedCode);

        Context.Items["RoomCode"] = normalizedCode;
        Context.Items["PlayerId"] = playerId.Trim();

        _logger.LogInformation("Authenticated Player {PlayerId} joined SignalR group for room {RoomCode}", playerId, normalizedCode);
        return true;
    }

    /// <summary>
    /// Unsubscribes a connection from the room channel.
    /// </summary>
    public async Task<bool> LeaveRoomGroup(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode)) return false;

        var normalizedCode = roomCode.Trim().ToUpperInvariant();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, normalizedCode);
        Context.Items.Remove("RoomCode");
        Context.Items.Remove("PlayerId");

        _logger.LogInformation("Connection {ConnectionId} left SignalR group for room {RoomCode}", Context.ConnectionId, normalizedCode);
        return true;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.Items.TryGetValue("RoomCode", out var roomCodeObj) && roomCodeObj is string roomCode)
        {
            _logger.LogInformation("Connection {ConnectionId} disconnected from room {RoomCode}. Error: {Error}",
                Context.ConnectionId, roomCode, exception?.Message ?? "None");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
