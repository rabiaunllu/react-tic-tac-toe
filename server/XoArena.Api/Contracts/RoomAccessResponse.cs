namespace XoArena.Api.Contracts;

/// <summary>
/// Returned only to the player that created or joined a room. The secret is
/// deliberately not part of <see cref="RoomResponse"/>, which is broadcast
/// and returned by the room read endpoint.
/// </summary>
public sealed record RoomAccessResponse(RoomResponse Room, string PlayerSecret);
