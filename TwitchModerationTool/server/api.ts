import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { TwitchBot } from "./lib/twitchBot";
import { BanService } from "./lib/banService";
import { insertBannedSlotSchema, type WebSocketMessage } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize services
  const banService = new BanService();
  const twitchBot = new TwitchBot(banService);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  // Broadcast to all connected clients
  function broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Set up service callbacks
  banService.setExpiredCallback((expiredBans) => {
    broadcast({
      type: 'BAN_EXPIRED',
      data: { expiredBans }
    });
  });

  twitchBot.setStatusChangeCallback((connected) => {
    broadcast({
      type: 'BOT_STATUS',
      data: { connected }
    });
  });

  twitchBot.setBanCommandCallback((slotName, username) => {
    broadcast({
      type: 'BAN_ADDED',
      data: { slotName, bannedBy: username }
    });
  });

  twitchBot.setUnbanCommandCallback((slotName, username) => {
    broadcast({
      type: 'BAN_REMOVED',
      data: { slotName, removedBy: username }
    });
  });

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Start Twitch bot
  twitchBot.connect();

  // Add test data only in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      const { addTestData } = await import('./testData');
      await addTestData();
    }, 2000);
  }

  // API Routes
  app.get('/api/banned-slots', async (req, res) => {
    try {
      const slots = await banService.getAllBannedSlots();
      res.json(slots);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch banned slots' });
    }
  });

  app.post('/api/ban-slot', async (req, res) => {
    try {
      const { slotName, bannedBy } = req.body;
      
      if (!slotName || !bannedBy) {
        return res.status(400).json({ error: 'slotName and bannedBy are required' });
      }

      const newBan = await banService.addManualBan(slotName, bannedBy);
      
      if (!newBan) {
        return res.status(409).json({ error: 'Slot is already banned' });
      }

      broadcast({
        type: 'BAN_ADDED',
        data: newBan
      });

      res.json(newBan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban slot' });
    }
  });

  app.delete('/api/ban-slot/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await banService.removeBan(id);
      
      broadcast({
        type: 'BAN_REMOVED',
        data: { id }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove ban' });
    }
  });

  app.post('/api/toggle-requests', async (req, res) => {
    try {
      const newStatus = await banService.toggleRequestsStatus();
      
      broadcast({
        type: 'STATUS_CHANGED',
        data: { requestsOpen: newStatus }
      });

      res.json({ requestsOpen: newStatus });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle requests status' });
    }
  });

  app.get('/api/status', async (req, res) => {
    try {
      const requestsOpen = await banService.getRequestsStatus();
      const botConnected = twitchBot.isConnectedToTwitch();
      const bannedSlots = await banService.getAllBannedSlots();
      
      res.json({
        requestsOpen,
        botConnected,
        totalBans: bannedSlots.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  app.delete('/api/clear-expired', async (req, res) => {
    try {
      const expiredBans = await storage.deleteExpiredSlots();
      
      broadcast({
        type: 'BAN_EXPIRED',
        data: { expiredBans }
      });

      res.json({ removed: expiredBans.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear expired bans' });
    }
  });

  app.delete('/api/clear-all', async (req, res) => {
    try {
      await banService.clearAllBans();
      
      broadcast({
        type: 'BAN_REMOVED',
        data: { clearAll: true }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear all bans' });
    }
  });

  return httpServer;
}
