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

    /// <summary>
    /// Broadcasts an ephemeral quick emote to all members of the room.
    /// COPPA compliant: Only strictly whitelisted preset emote IDs are allowed.
    /// No chat text, no freeform user input.
    /// SECURITY FIX (VULN-06): Per-connection rate limit of 5 emotes per 10 seconds.
    /// </summary>
    public async Task<bool> SendQuickEmote(string roomCode, string playerId, string playerSecret, string emoteId)
    {
        if (string.IsNullOrWhiteSpace(roomCode) || string.IsNullOrWhiteSpace(playerId) || string.IsNullOrWhiteSpace(playerSecret) || string.IsNullOrWhiteSpace(emoteId))
        {
            throw new HubException("Invalid parameters for emote.");
        }

        // SECURITY FIX (VULN-06): Rate limit emotes per connection.
        // Max 5 emotes per 10-second sliding window per connection.
        const int EmoteRateLimit = 5;
        const int EmoteWindowSeconds = 10;

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (!Context.Items.TryGetValue("EmoteWindowStart", out var windowStartObj) ||
            !Context.Items.TryGetValue("EmoteCount", out var emoteCountObj) ||
            windowStartObj is not long windowStart || emoteCountObj is not int emoteCount ||
            now - windowStart >= EmoteWindowSeconds)
        {
            // Reset window
            Context.Items["EmoteWindowStart"] = now;
            Context.Items["EmoteCount"] = 1;
        }
        else if (emoteCount >= EmoteRateLimit)
        {
            _logger.LogWarning("Emote rate limit exceeded for Connection {ConnectionId}", Context.ConnectionId);
            throw new HubException("Emote rate limit exceeded. Please wait before sending more.");
        }
        else
        {
            Context.Items["EmoteCount"] = emoteCount + 1;
        }

        var normalizedCode = roomCode.Trim().ToUpperInvariant();
        var normalizedEmoteId = emoteId.Trim().ToLowerInvariant();

        // COPPA & Security: Whitelist verification
        var allowedEmotes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "gg", "nice", "wellplayed", "noway", "hurry"
        };

        if (!allowedEmotes.Contains(normalizedEmoteId))
        {
            _logger.LogWarning("Rejected unauthorized emote ID '{EmoteId}' from Player {PlayerId}", normalizedEmoteId, playerId);
            throw new HubException("Invalid emote identifier.");
        }

        var room = _roomStore.GetByCode(normalizedCode);
        if (room is null)
        {
            throw new HubException("Room not found.");
        }

        // Strict Authorization with constant-time equality
        var senderPlayer = room.Players.FirstOrDefault(p =>
            string.Equals(p.Id, playerId.Trim(), StringComparison.OrdinalIgnoreCase) &&
            CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(p.PlayerSecret),
                System.Text.Encoding.UTF8.GetBytes(playerSecret.Trim())));

        if (senderPlayer is null)
        {
            _logger.LogWarning("Unauthorized attempt to send emote in room {RoomCode} by playerId {PlayerId}", normalizedCode, playerId);
            throw new HubException("Unauthorized: Invalid player credentials.");
        }

        await Clients.Group(normalizedCode).SendAsync("QuickEmoteReceived", new
        {
            EmoteId = normalizedEmoteId,
            SenderPlayerId = senderPlayer.Id,
            SenderSymbol = senderPlayer.Symbol
        });

        _logger.LogInformation("Player {PlayerId} ({Symbol}) sent emote '{EmoteId}' in room {RoomCode}",
            senderPlayer.Id, senderPlayer.Symbol, normalizedEmoteId, normalizedCode);

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
