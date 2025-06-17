import { 
  users, 
  bannedSlots, 
  appSettings,
  type User, 
  type InsertUser, 
  type BannedSlot, 
  type InsertBannedSlot,
  type AppSettings,
  type InsertAppSettings 
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Banned slots methods
  getAllBannedSlots(): Promise<BannedSlot[]>;
  getBannedSlotByName(slotName: string): Promise<BannedSlot | undefined>;
  createBannedSlot(slot: InsertBannedSlot): Promise<BannedSlot>;
  deleteBannedSlot(id: number): Promise<void>;
  deleteExpiredSlots(): Promise<BannedSlot[]>;
  
  // App settings methods
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private slots: Map<number, BannedSlot>;
  private settings: Map<string, string>;
  private currentUserId: number;
  private currentSlotId: number;

  constructor() {
    this.users = new Map();
    this.slots = new Map();
    this.settings = new Map();
    this.currentUserId = 1;
    this.currentSlotId = 1;
    
    // Set default settings
    this.settings.set('requests_open', 'true');
    this.settings.set('bot_connected', 'false');
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllBannedSlots(): Promise<BannedSlot[]> {
    return Array.from(this.slots.values());
  }

  async getBannedSlotByName(slotName: string): Promise<BannedSlot | undefined> {
    return Array.from(this.slots.values()).find(
      (slot) => slot.slotName.toLowerCase() === slotName.toLowerCase()
    );
  }

  async createBannedSlot(insertSlot: InsertBannedSlot): Promise<BannedSlot> {
    const id = this.currentSlotId++;
    const slot: BannedSlot = {
      ...insertSlot,
      id,
      bannedAt: new Date(),
    };
    this.slots.set(id, slot);
    return slot;
  }

  async deleteBannedSlot(id: number): Promise<void> {
    this.slots.delete(id);
  }

  async deleteExpiredSlots(): Promise<BannedSlot[]> {
    const now = new Date();
    const expired: BannedSlot[] = [];
    
    for (const [id, slot] of this.slots.entries()) {
      if (slot.expiresAt <= now) {
        expired.push(slot);
        this.slots.delete(id);
      }
    }
    
    return expired;
  }

  async getSetting(key: string): Promise<string | undefined> {
    return this.settings.get(key);
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.settings.set(key, value);
  }
}

export const storage = new MemStorage();
