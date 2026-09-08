using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using System.Threading.RateLimiting;
using XoArena.Api.Hubs;
using XoArena.Api.Contracts;
using XoArena.Api.Models;
using XoArena.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ──────────────────────────────────────────────────────────────────────
var configuredAllowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? [];
var allowedOrigins = configuredAllowedOrigins
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        // SECURITY FIX (VULN-07): Wildcard origin cannot be combined with AllowCredentials.
        // If no origins are configured (dev/default), allow localhost origins explicitly.
        // In production, origins MUST be explicitly configured — wildcard is rejected.
        if (allowedOrigins.Length > 0)
        {
            // Reject wildcards at runtime — combining "*" with AllowCredentials throws an exception.
            var safeOrigins = allowedOrigins
                .Where(o => o != "*")
                .ToArray();

            if (safeOrigins.Length > 0)
            {
                policy.WithOrigins(safeOrigins);
            }
            else
            {
                // All origins were wildcards — fall back to safe localhost defaults
                policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173");
            }
        }
        else
        {
            // No origins configured: allow standard localhost dev ports
            policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173");
        }

        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Yapılandırma: appsettings.json > RateLimiting bölümü
// Varsayılanlar: Genel: 300 req/dk (polling uyumlu), Oda oluşturma: 20 req/dk, Hamle: 240 req/dk
var rlConfig = builder.Configuration.GetSection("RateLimiting");
var globalPermits     = rlConfig.GetValue<int>("Global:PermitsPerMinute",   300);
var createRoomPermits = rlConfig.GetValue<int>("CreateRoom:PermitsPerMinute", 20);
var movePermits       = rlConfig.GetValue<int>("Move:PermitsPerMinute",     240);
var joinRoomPermits   = rlConfig.GetValue<int>("JoinRoom:PermitsPerMinute",   5);

builder.Services.AddRateLimiter(options =>
{
    // Limit aşımında 429 Too Many Requests döndür
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global limiter: tüm endpoint'lere uygulanır (fallback)
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = globalPermits,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Oda oluşturma: daha sıkı (spam ile yüzlerce oda açılmasın)
    options.AddFixedWindowLimiter("create-room", opt =>
    {
        opt.PermitLimit = createRoomPermits;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Hamle endpoint'i: daha geniş (aktif oyun sırasında yoğun trafik normal)
    options.AddFixedWindowLimiter("move", opt =>
    {
        opt.PermitLimit = movePermits;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Oda kodu denemeleri IP bazında sınırlandırılır. Bu, kod tarayan botların
    // özel odaları kaba kuvvetle bulmasını engeller.
    options.AddPolicy("join-room", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = joinRoomPermits,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// ── Services ──────────────────────────────────────────────────────────────────
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(25);
    options.MaximumReceiveMessageSize = 64 * 1024; // 64 KB defensive message limit
});

// Production Multi-Instance Scale-Out Configuration:
// 1) Redis Backplane:
//    var redisConnection = builder.Configuration.GetConnectionString("Redis");
//    if (!string.IsNullOrWhiteSpace(redisConnection)) { signalRBuilder.AddStackExchangeRedis(redisConnection); }
// 2) Azure SignalR Service:
//    var azureSignalR = builder.Configuration.GetConnectionString("Azure:SignalR:ConnectionString");
//    if (!string.IsNullOrWhiteSpace(azureSignalR)) { signalRBuilder.AddAzureSignalR(azureSignalR); }

builder.Services.AddSingleton<IRoomStore, InMemoryRoomStore>();
builder.Services.AddHostedService<RoomCleanupService>();

var app = builder.Build();

// ── Middleware Pipeline ───────────────────────────────────────────────────────
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// SECURITY FIX (VULN-02): Forward real client IP from X-Forwarded-For header.
// Without this, rate limiting partitions by the proxy's IP, meaning all players
// worldwide share the same rate limit bucket when behind a reverse proxy.
// Must be called BEFORE UseRateLimiter to ensure correct IP resolution.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseCors("Frontend");
app.UseRateLimiter();

// ── Endpoints ─────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapGet("/", () => Results.Ok(new
    {
        service = "XO Arena API",
        health = "/health"
    }));
}

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "xo-arena-api",
    environment = app.Environment.EnvironmentName,
    utc = DateTimeOffset.UtcNow
}));

app.MapHub<RoomsHub>("/hubs/rooms");

app.MapPost("/api/rooms", (CreateRoomRequest request, IRoomStore roomStore) =>
{
    var validationErrors = ValidateCreateRoomRequest(request);

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    var room = roomStore.Create(new CreateRoomOptions(
        request.PlayerName.Trim(),
        request.BoardSize,
        request.WinLength,
        request.GameMode.Trim().ToLowerInvariant(),
        request.TargetValue,
        request.GameMode.Trim().Equals(GameModes.Arena, StringComparison.OrdinalIgnoreCase)
            ? request.BoostMode?.Trim().ToLowerInvariant() ?? "manual"
            : null,
        request.TurnTimeLimit));

    return Results.Ok(new RoomAccessResponse(
        RoomResponse.FromRoom(room),
        room.Players[0].PlayerSecret));
}).RequireRateLimiting("create-room");

app.MapGet("/api/rooms/{roomCode}", (string roomCode, IRoomStore roomStore) =>
{
    var room = roomStore.GetByCode(roomCode);

    return room is null
        ? Results.NotFound()
        : Results.Ok(RoomResponse.FromRoom(room));
});

app.MapPost("/api/rooms/{roomCode}/join", async (
    string roomCode,
    JoinRoomRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub) =>
{
    // SECURITY FIX (SEC-10, SEC-11): Use centralized server-side name validation
    var nameError = ValidatePlayerName(request.PlayerName);
    if (nameError is not null)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerName"] = [nameError]
        });
    }

    var result = roomStore.Join(roomCode, request.PlayerName.Trim());

    if (result.Status is JoinRoomStatus.Joined)
    {
        await BroadcastRoomStateAsync(roomsHub, result.Room!);

        return Results.Ok(new RoomAccessResponse(
            RoomResponse.FromRoom(result.Room!),
            result.PlayerSecret!));
    }

    return result.Status switch
    {
        JoinRoomStatus.NotFound => Results.NotFound(),
        JoinRoomStatus.Conflict => Results.Conflict(new
        {
            error = result.ErrorMessage
        }),
        _ => Results.Problem("Unexpected join room result.")
    };
}).RequireRateLimiting("join-room");

app.MapPost("/api/rooms/{roomCode}/leave", async (
    string roomCode,
    LeaveRoomRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub) =>
{
    if (!Guid.TryParse(request.PlayerId, out var playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player id must be a valid Guid."]
        });
    }

    var success = roomStore.Leave(roomCode, playerId, request.PlayerSecret, request.IsSurrender);

    if (success)
    {
        var updatedRoom = roomStore.GetByCode(roomCode);
        if (updatedRoom is not null)
        {
            await BroadcastRoomStateAsync(roomsHub, updatedRoom);
        }

        return Results.Ok();
    }

    return Results.StatusCode(StatusCodes.Status403Forbidden);
});

app.MapPost("/api/rooms/{roomCode}/moves", async (
    string roomCode,
    MoveRoomRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub) =>
{
    if (!Guid.TryParse(request.PlayerId, out var playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player id must be a valid Guid."]
        });
    }

    var result = roomStore.Move(roomCode, playerId, request.PlayerSecret, request.Index);

    if (result.Status is MoveRoomStatus.Moved)
    {
        await BroadcastRoomStateAsync(roomsHub, result.Room!);
        return Results.Ok(RoomResponse.FromRoom(result.Room!));
    }

    return result.Status switch
    {
        MoveRoomStatus.NotFound => Results.NotFound(),
        MoveRoomStatus.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
        MoveRoomStatus.BadRequest => Results.ValidationProblem(new Dictionary<string, string[]>
        {
            [result.ErrorField ?? "request"] = [result.ErrorMessage ?? "Invalid move request."]
        }),
        MoveRoomStatus.Conflict => Results.Conflict(new
        {
            error = result.ErrorMessage
        }),
        _ => Results.Problem("Unexpected move room result.")
    };
}).RequireRateLimiting("move");

app.MapPost("/api/rooms/{roomCode}/powers", async (
    string roomCode,
    PowerRoomRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub) =>
{
    if (!Guid.TryParse(request.PlayerId, out var playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player id must be a valid Guid."]
        });
    }

    var result = roomStore.UsePower(roomCode, playerId, request.PlayerSecret, request.PowerId, request.TargetIndex);

    if (result.Status is PowerRoomStatus.Used)
    {
        await BroadcastRoomStateAsync(roomsHub, result.Room!);
        return Results.Ok(RoomResponse.FromRoom(result.Room!));
    }

    return result.Status switch
    {
        PowerRoomStatus.NotFound => Results.NotFound(),
        PowerRoomStatus.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
        PowerRoomStatus.BadRequest => Results.ValidationProblem(new Dictionary<string, string[]>
        {
            [result.ErrorField ?? "request"] = [result.ErrorMessage ?? "Invalid power request."]
        }),
        PowerRoomStatus.Conflict => Results.Conflict(new { error = result.ErrorMessage }),
        _ => Results.Problem("Unexpected power room result.")
    };
}).RequireRateLimiting("move");

app.MapPost("/api/rooms/{roomCode}/start", async (
    string roomCode,
    StartRoomRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub) =>
{
    if (!Guid.TryParse(request.PlayerId, out var playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player id must be a valid Guid."]
        });
    }

    var result = roomStore.Start(roomCode, playerId, request.PlayerSecret);

    if (result.Status is StartRoomStatus.Started)
    {
        await BroadcastRoomStateAsync(roomsHub, result.Room!);
        return Results.Ok(RoomResponse.FromRoom(result.Room!));
    }

    return result.Status switch
    {
        StartRoomStatus.NotFound => Results.NotFound(),
        StartRoomStatus.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
        StartRoomStatus.Conflict => Results.Conflict(new
        {
            error = result.ErrorMessage
        }),
        _ => Results.Problem("Unexpected start room result.")
    };
});

app.MapPost("/api/rooms/{roomCode}/next-round", async (
    string roomCode,
    NextRoundRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub) =>
{
    if (!Guid.TryParse(request.PlayerId, out var playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player id must be a valid Guid."]
        });
    }

    var result = roomStore.NextRound(roomCode, playerId, request.PlayerSecret);

    if (result.Status is NextRoundStatus.Pending or NextRoundStatus.Started)
    {
        await BroadcastRoomStateAsync(roomsHub, result.Room!);
        return Results.Ok(RoomResponse.FromRoom(result.Room!));
    }

    return result.Status switch
    {
        NextRoundStatus.NotFound => Results.NotFound(),
        NextRoundStatus.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
        NextRoundStatus.Conflict => Results.Conflict(new
        {
            error = result.ErrorMessage
        }),
        _ => Results.Problem("Unexpected next round result.")
    };
});

app.MapPost("/api/rooms/{roomCode}/timeout", async (
    string roomCode,
    TimeoutRoomRequest request,
    IRoomStore roomStore,
    IHubContext<RoomsHub> roomsHub,
    CancellationToken cancellationToken) =>
{
    if (!Guid.TryParse(request.PlayerId, out var playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player id must be a valid Guid."]
        });
    }

    var result = roomStore.Timeout(roomCode, playerId, request.PlayerSecret);

    if (result.Room is not null)
    {
        await BroadcastRoomStateAsync(roomsHub, result.Room, cancellationToken);
    }

    return result.Status switch
    {
        TimeoutRoomStatus.TimedOut => Results.Ok(RoomResponse.FromRoom(result.Room!)),
        TimeoutRoomStatus.NotFound => Results.NotFound(),
        TimeoutRoomStatus.Forbidden => Results.StatusCode(StatusCodes.Status403Forbidden),
        TimeoutRoomStatus.Conflict => Results.Conflict(new
        {
            error = result.ErrorMessage
        }),
        _ => Results.Problem("Unexpected timeout result.")
    };
});

/// <summary>
/// Centralized, defensive helper to broadcast sanitized game room state DTO to the SignalR group.
/// Ensures private tokens and secrets are never sent over the real-time wire.
/// </summary>
static async Task BroadcastRoomStateAsync(
    IHubContext<RoomsHub> roomsHub,
    Room room,
    CancellationToken cancellationToken = default)
{
    var cleanStateDto = RoomResponse.FromRoom(room);
    await roomsHub.Clients.Group(room.Code).SendAsync("RoomUpdated", cleanStateDto, cancellationToken);
}

if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("index.html");
}

app.Run();

static Dictionary<string, string[]> ValidateCreateRoomRequest(CreateRoomRequest request)
{
    var errors = new Dictionary<string, string[]>();

    // SECURITY FIX (SEC-10, SEC-11): Server-side player name validation.
    // Client-side sanitization can be bypassed by direct API calls.
    var nameError = ValidatePlayerName(request.PlayerName);
    if (nameError is not null)
    {
        errors["playerName"] = [nameError];
    }

    if (request.BoardSize is not (3 or 4 or 5))
    {
        errors["boardSize"] = ["Board size must be 3, 4, or 5."];
    }

    if (request.WinLength < 3 || request.WinLength > request.BoardSize)
    {
        errors["winLength"] = ["Win length must be between 3 and the board size."];
    }

    if (string.IsNullOrWhiteSpace(request.GameMode)
        || !GameModes.All.Contains(request.GameMode.Trim().ToLowerInvariant()))
    {
        errors["gameMode"] = ["Game mode must be classic or arena."];
    }

    if (request.TargetValue <= 0)
    {
        errors["targetValue"] = ["Target value must be positive."];
    }

    if (!string.IsNullOrWhiteSpace(request.GameMode)
        && request.GameMode.Trim().Equals(GameModes.Arena, StringComparison.OrdinalIgnoreCase)
        && request.BoostMode is not null
        && request.BoostMode.Trim().ToLowerInvariant() is not ("random" or "manual"))
    {
        errors["boostMode"] = ["Boost mode must be random or manual."];
    }

    if (request.TurnTimeLimit < 0 || request.TurnTimeLimit > 60)
    {
        errors["turnTimeLimit"] = ["Turn time limit must be between 0 and 60 seconds."];
    }

    return errors;
}

/// <summary>
/// SECURITY (SEC-10, SEC-11): Centralized server-side player name validation.
/// Enforces length limit and strips control/invisible characters that bypass client sanitization.
/// Returns an error message string, or null if the name is valid.
/// </summary>
static string? ValidatePlayerName(string? rawName)
{
    const int MaxNameLength = 24;

    if (string.IsNullOrWhiteSpace(rawName))
    {
        return "Player name is required.";
    }

    // Strip control characters (U+0000–U+001F), zero-width spaces, and directional overrides
    var sanitized = new string(rawName.Where(c =>
        c >= 0x20 &&           // no ASCII control chars
        c != 0x200B &&         // no zero-width space
        c != 0x200C &&         // no zero-width non-joiner
        c != 0x200D &&         // no zero-width joiner
        c != 0x202E &&         // no right-to-left override (RLO)
        c != 0xFEFF            // no BOM / zero-width no-break space
    ).ToArray()).Trim();

    if (sanitized.Length == 0)
    {
        return "Player name cannot be empty or contain only whitespace.";
    }

    if (sanitized.Length > MaxNameLength)
    {
        return $"Player name must be {MaxNameLength} characters or fewer.";
    }

    return null;
}
