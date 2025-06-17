import { storage } from "./storage";

export async function addTestData() {
  try {
    // Add a test banned slot
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days from now
    
    await storage.createBannedSlot({
      slotName: "Book of Dead",
      bannedBy: "TestUser",
      expiresAt
    });

    console.log("Test data added successfully");
  } catch (error) {
    console.error("Error adding test data:", error);
  }
}