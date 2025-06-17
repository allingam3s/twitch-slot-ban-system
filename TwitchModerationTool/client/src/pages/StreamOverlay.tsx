import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BannedSlot, WebSocketMessage } from '@shared/schema';

interface AppStatus {
  requestsOpen: boolean;
  botConnected: boolean;
  totalBans: number;
}

export default function StreamOverlay() {
  // Fetch banned slots
  const { data: bannedSlots = [], isLoading: slotsLoading } = useQuery<BannedSlot[]>({
    queryKey: ['/api/banned-slots'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch app status
  const { data: status, isLoading: statusLoading } = useQuery<AppStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 30000,
  });

  // WebSocket handling for real-time updates
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'BAN_ADDED':
      case 'BAN_REMOVED':
      case 'BAN_EXPIRED':
        queryClient.invalidateQueries({ queryKey: ['/api/banned-slots'] });
        queryClient.invalidateQueries({ queryKey: ['/api/status'] });
        break;
      case 'STATUS_CHANGED':
      case 'BOT_STATUS':
        queryClient.invalidateQueries({ queryKey: ['/api/status'] });
        break;
    }
  };

  useWebSocket(handleWebSocketMessage);

  // Calculate days remaining for each slot
  const slotsWithDaysRemaining = bannedSlots.map(slot => {
    const now = new Date();
    const expiresAt = new Date(slot.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...slot,
      daysRemaining: Math.max(0, daysRemaining)
    };
  });

  // Show loading state
  if (slotsLoading || statusLoading) {
    return (
      <div className="w-full max-w-sm p-3 bg-background/95 backdrop-blur-sm rounded-lg">
        <div className="space-y-2">
          <div className="w-full h-8 bg-muted/50 rounded animate-pulse"></div>
          <div className="w-20 h-5 bg-muted/50 rounded mx-auto animate-pulse"></div>
          <div className="bg-muted/50 rounded p-3 h-20 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm p-3 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
          🚫
        </div>
        <h1 className="text-base font-semibold text-white">Aktuelle Slot-Bans</h1>
      </div>

      {/* Request Counter */}
      <div className="flex justify-center mb-4">
        <Badge className="bg-purple-600/80 text-white px-2 py-1 rounded-full text-xs font-medium">
          {slotsWithDaysRemaining.length} Bans
        </Badge>
      </div>

      {/* Ban List */}
      <Card className="bg-card/80 border-border/50 backdrop-blur-sm">
        <CardContent className="p-3">
          {slotsWithDaysRemaining.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-muted-foreground text-xs">
                <em>Die Liste ist aktuell leer</em>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {slotsWithDaysRemaining.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-background/60 rounded-md p-2 flex items-center justify-between border border-border/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
                      🚫
                    </div>
                    <div>
                      <div className="font-medium text-xs text-foreground">
                        {slot.slotName}
                      </div>
                      <div className="text-xs text-muted-foreground opacity-75">
                        von: {slot.bannedBy}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {slot.daysRemaining}d
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}