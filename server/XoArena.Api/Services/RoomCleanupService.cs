using XoArena.Api.Services;

namespace XoArena.Api.Services;

/// <summary>
/// Periyodik olarak süresi dolmuş odaları temizleyen arka plan servisi.
/// InMemoryRoomStore'daki lazy cleanup yerine düzenli aralıklarla çalışır,
/// böylece sunucu boşta olsa bile stale odalar bellekte birikmez.
/// </summary>
public sealed class RoomCleanupService : BackgroundService
{
    private readonly IRoomStore _roomStore;
    private readonly ILogger<RoomCleanupService> _logger;
    private readonly TimeSpan _interval;

    public RoomCleanupService(
        IRoomStore roomStore,
        ILogger<RoomCleanupService> logger,
        IConfiguration configuration)
    {
        _roomStore = roomStore;
        _logger = logger;

        var intervalMinutes = configuration.GetValue<int>("RoomCleanup:IntervalMinutes", 5);
        _interval = TimeSpan.FromMinutes(Math.Clamp(intervalMinutes, 1, 60));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "RoomCleanupService başlatıldı. Temizleme aralığı: {Interval}",
            _interval);

        // İlk çalışmayı biraz geciktir — uygulama tam ayağa kalksın
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var removed = _roomStore.CleanupExpiredRooms();

                if (removed > 0)
                {
                    _logger.LogInformation(
                        "RoomCleanupService: {Count} süresi dolmuş oda temizlendi.",
                        removed);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RoomCleanupService: Temizleme sırasında hata oluştu.");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("RoomCleanupService durduruldu.");
    }
}
