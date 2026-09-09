namespace XoArena.Api.Models;

public sealed record Player(
    string Id,
    string Name,
    string Symbol,
    string PlayerSecret);
