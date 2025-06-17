import { storage } from "../storage";
import type { BannedSlot, InsertBannedSlot } from "@shared/schema";

export class BanService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private onBanExpired?: (expiredBans: BannedSlot[]) => void;

  constructor() {
    this.startCleanupTimer();
  }

  setExpiredCallback(callback: (expiredBans: BannedSlot[]) => void) {
    this.onBanExpired = callback;
  }

  private startCleanupTimer() {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredBans();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  private async cleanupExpiredBans() {
    try {
      const expiredBans = await storage.deleteExpiredSlots();
      if (expiredBans.length > 0 && this.onBanExpired) {
        this.onBanExpired(expiredBans);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async getAllBannedSlots(): Promise<BannedSlot[]> {
    return await storage.getAllBannedSlots();
  }

  async addManualBan(slotName: string, bannedBy: string): Promise<BannedSlot | null> {
    const existingBan = await storage.getBannedSlotByName(slotName);
    if (existingBan) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days

    const newBan: InsertBannedSlot = {
      slotName,
      bannedBy,
      expiresAt
    };

    return await storage.createBannedSlot(newBan);
  }

  async removeBan(id: number): Promise<void> {
    await storage.deleteBannedSlot(id);
  }

  async clearAllBans(): Promise<void> {
    const allBans = await storage.getAllBannedSlots();
    for (const ban of allBans) {
      await storage.deleteBannedSlot(ban.id);
    }
  }

  async toggleRequestsStatus(): Promise<boolean> {
    const currentStatus = await storage.getSetting('requests_open');
    const newStatus = currentStatus !== 'true';
    await storage.setSetting('requests_open', newStatus.toString());
    return newStatus;
  }

  async getRequestsStatus(): Promise<boolean> {
    const status = await storage.getSetting('requests_open');
    return status === 'true';
  }

  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}