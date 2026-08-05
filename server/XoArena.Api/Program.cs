using Microsoft.AspNetCore.SignalR;
using XoArena.Api.Hubs;
using XoArena.Api.Contracts;
using XoArena.Api.Models;
using XoArena.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSignalR();
builder.Services.AddSingleton<IRoomStore, InMemoryRoomStore>();

var app = builder.Build();

app.UseCors("Frontend");

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "xo-arena-api"
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
        request.TargetValue));

    return Results.Ok(RoomResponse.FromRoom(room));
});

app.MapGet("/api/rooms/{roomCode}", (string roomCode, IRoomStore roomStore) =>
{
    var room = roomStore.GetByCode(roomCode);

    return room is null
        ? Results.NotFound()
        : Results.Ok(RoomResponse.FromRoom(room));
});

app.MapPost("/api/rooms/{roomCode}/join", (string roomCode, JoinRoomRequest request, IRoomStore roomStore) =>
{
    if (string.IsNullOrWhiteSpace(request.PlayerName))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerName"] = ["Player name is required."]
        });
    }

    var result = roomStore.Join(roomCode, request.PlayerName.Trim());

    return result.Status switch
    {
        JoinRoomStatus.Joined => Results.Ok(RoomResponse.FromRoom(result.Room!)),
        JoinRoomStatus.NotFound => Results.NotFound(),
        JoinRoomStatus.Conflict => Results.Conflict(new
        {
            error = result.ErrorMessage
        }),
        _ => Results.Problem("Unexpected join room result.")
    };
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

    var result = roomStore.Move(roomCode, playerId, request.Index);

    if (result.Status is MoveRoomStatus.Moved)
    {
        var roomResponse = RoomResponse.FromRoom(result.Room!);
        await roomsHub.Clients.Group(result.Room!.Code).SendAsync("RoomUpdated", roomResponse);

        return Results.Ok(roomResponse);
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
});

app.Run();

static Dictionary<string, string[]> ValidateCreateRoomRequest(CreateRoomRequest request)
{
    var errors = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(request.PlayerName))
    {
        errors["playerName"] = ["Player name is required."];
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

    return errors;
}
