import * as tmi from 'tmi.js';
import type { BanService } from './banService';

export class TwitchBot {
  private client: tmi.Client | null = null;
  private isConnected = false;
  private banService: BanService;
  private onStatusChange?: (connected: boolean) => void;
  private onBanCommand?: (slotName: string, username: string) => void;
  private onUnbanCommand?: (slotName: string, username: string) => void;

  constructor(banService: BanService) {
    this.banService = banService;
  }

  setStatusChangeCallback(callback: (connected: boolean) => void) {
    this.onStatusChange = callback;
  }

  setBanCommandCallback(callback: (slotName: string, username: string) => void) {
    this.onBanCommand = callback;
  }

  setUnbanCommandCallback(callback: (slotName: string, username: string) => void) {
    this.onUnbanCommand = callback;
  }

  async connect() {
    const username = process.env.TWITCH_USERNAME;
    const token = process.env.TWITCH_TOKEN;
    const channels = process.env.TWITCH_CHANNELS?.split(',') || [];

    if (!username || !token || channels.length === 0) {
      console.log('Twitch credentials not provided. Bot will not connect.');
      await this.updateBotStatus();
      return;
    }

    try {
      this.client = new tmi.Client({
        options: { debug: false },
        connection: {
          reconnect: true,
          secure: true,
        },
        identity: {
          username: username,
          password: token,
        },
        channels: channels,
      });

      this.client.on('connected', () => {
        console.log('Connected to Twitch chat');
        this.isConnected = true;
        this.updateBotStatus();
      });

      this.client.on('disconnected', () => {
        console.log('Disconnected from Twitch chat');
        this.isConnected = false;
        this.updateBotStatus();
      });

      this.client.on('message', this.handleMessage.bind(this));

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Twitch:', error);
      this.isConnected = false;
      await this.updateBotStatus();
    }
  }

  private async handleMessage(channel: string, tags: any, message: string, self: boolean) {
    if (self) return;

    const username = tags.username || tags['display-name'] || 'Unknown';
    const isModerator = tags.mod || tags.badges?.moderator || tags.badges?.broadcaster;
    const messageText = message.trim().toLowerCase();

    if (messageText.startsWith('!ban ')) {
      const slotName = message.substring(5).trim();
      if (slotName) {
        await this.handleBanCommand(slotName, username);
      }
    } else if (messageText === '!banlist') {
      await this.handleBanListCommand(channel);
    } else if (messageText.startsWith('!unban ') && isModerator) {
      const slotName = message.substring(7).trim();
      if (slotName) {
        await this.handleUnbanCommand(slotName, channel);
      }
    }
  }

  private async handleBanCommand(slotName: string, username: string) {
    try {
      const requestsOpen = await this.banService.getRequestsStatus();
      if (!requestsOpen) {
        return;
      }

      if (this.onBanCommand) {
        this.onBanCommand(slotName, username);
      }
    } catch (error) {
      console.error('Error handling ban command:', error);
    }
  }

  private async handleBanListCommand(channel: string) {
    try {
      const bannedSlots = await this.banService.getAllBannedSlots();
      
      if (bannedSlots.length === 0) {
        this.sendMessage(channel, 'Aktuell sind keine Slots gebannt.');
      } else {
        const slotNames = bannedSlots.map(slot => slot.slotName).join(', ');
        this.sendMessage(channel, `Gebannte Slots (${bannedSlots.length}): ${slotNames}`);
      }
    } catch (error) {
      console.error('Error handling banlist command:', error);
    }
  }

  private async handleUnbanCommand(slotName: string, channel: string) {
    try {
      const bannedSlots = await this.banService.getAllBannedSlots();
      const existingBan = bannedSlots.find(
        slot => slot.slotName.toLowerCase() === slotName.toLowerCase()
      );

      if (existingBan) {
        await this.banService.removeBan(existingBan.id);
        this.sendMessage(channel, `${slotName} wurde von der Banliste entfernt.`);
        
        if (this.onUnbanCommand) {
          this.onUnbanCommand(slotName, 'Moderator');
        }
      } else {
        this.sendMessage(channel, `${slotName} ist nicht auf der Banliste.`);
      }
    } catch (error) {
      console.error('Error handling unban command:', error);
    }
  }

  private sendMessage(channel: string, message: string) {
    if (this.client && this.isConnected) {
      this.client.say(channel, message);
    }
  }

  private async updateBotStatus() {
    if (this.onStatusChange) {
      this.onStatusChange(this.isConnected);
    }
  }

  isConnectedToTwitch(): boolean {
    return this.isConnected;
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.isConnected = false;
    }
  }
}