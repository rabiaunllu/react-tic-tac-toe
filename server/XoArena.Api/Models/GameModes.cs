namespace XoArena.Api.Models;

public static class GameModes
{
    public const string Classic = "classic";
    public const string Arena = "arena";

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        Classic,
        Arena
    };
}
