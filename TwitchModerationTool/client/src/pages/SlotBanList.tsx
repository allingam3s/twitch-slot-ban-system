import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import type { BannedSlot, WebSocketMessage } from '@shared/schema';

interface AppStatus {
  requestsOpen: boolean;
  botConnected: boolean;
  totalBans: number;
}

export default function SlotBanList() {
  const [newSlotName, setNewSlotName] = useState('');
  const [newBannedBy, setNewBannedBy] = useState('');
  const { toast } = useToast();

  const { data: bannedSlots = [], isLoading: slotsLoading } = useQuery<BannedSlot[]>({
    queryKey: ['/api/banned-slots'],
    refetchInterval: 30000,
  });

  const { data: status, isLoading: statusLoading } = useQuery<AppStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 30000,
  });

  const addBanMutation = useMutation({
    mutationFn: async ({ slotName, bannedBy }: { slotName: string; bannedBy: string }) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000));
      
      const response = await fetch('/api/banned-slots', {
        method: 'POST',
        body: JSON.stringify({ slotName, bannedBy, expiresAt }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to add ban');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banned-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      setNewSlotName('');
      setNewBannedBy('');
      toast({ title: 'Slot erfolgreich gebannt!' });
    },
    onError: () => {
      toast({ title: 'Fehler beim Bannen', variant: 'destructive' });
    }
  });

  const removeBanMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/banned-slots/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to remove ban');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banned-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      toast({ title: 'Ban erfolgreich entfernt!' });
    },
    onError: () => {
      toast({ title: 'Fehler beim Entfernen', variant: 'destructive' });
    }
  });

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

  const handleAddBan = () => {
    if (newSlotName.trim() && newBannedBy.trim()) {
      addBanMutation.mutate({
        slotName: newSlotName.trim(),
        bannedBy: newBannedBy.trim()
      });
    }
  };

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

  if (slotsLoading || statusLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-muted rounded mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Slot-Ban Administration</h1>
        <div className="flex gap-4 items-center">
          <Badge variant={status?.botConnected ? "default" : "destructive"}>
            Bot: {status?.botConnected ? "Verbunden" : "Nicht verbunden"}
          </Badge>
          <Badge variant="outline">
            {status?.totalBans} Aktive Bans
          </Badge>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Neuen Ban hinzufügen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Slot Name"
              value={newSlotName}
              onChange={(e) => setNewSlotName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Gebannt von"
              value={newBannedBy}
              onChange={(e) => setNewBannedBy(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleAddBan}
              disabled={addBanMutation.isPending || !newSlotName.trim() || !newBannedBy.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Slot-Bans ({slotsWithDaysRemaining.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {slotsWithDaysRemaining.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Slots aktuell gebannt
            </div>
          ) : (
            <div className="space-y-2">
              {slotsWithDaysRemaining.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      🚫
                    </div>
                    <div>
                      <div className="font-medium">{slot.slotName}</div>
                      <div className="text-sm text-muted-foreground">
                        Gebannt von: {slot.bannedBy} • Noch {slot.daysRemaining} Tage
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBanMutation.mutate(slot.id)}
                    disabled={removeBanMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}