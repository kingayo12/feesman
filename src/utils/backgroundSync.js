/**
 * Background Sync Manager
 * Handles periodic data synchronization for offline support
 * Ensures data is fresh and available offline
 */

import { getDocs, collection, where, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firestore";

class BackgroundSyncManager {
  constructor() {
    this.syncInterval = null;
    this.listeners = new Map();
    this.lastSyncTime = {};
    this.isSyncing = false;
    this.syncIntervalDuration = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Start background sync for critical data collections
   */
  startSync(syncIntervalMs = null) {
    if (this.syncInterval) {
      //   console.warn("Sync already running");
      return;
    }

    if (syncIntervalMs) {
      this.syncIntervalDuration = syncIntervalMs;
    }

    // console.log("Starting background sync...");
    this.performSync();

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.syncIntervalDuration);
  }

  /**
   * Stop background sync
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.unsubscribeAllListeners();
      console.log("Background sync stopped");
    }
  }

  /**
   * Perform a single sync operation
   */
  async performSync() {
    if (this.isSyncing) return;

    this.isSyncing = true;
    try {
      //   console.log("Performing background sync...");
      const now = Date.now();

      // Sync all critical collections for complete offline support
      await Promise.allSettled([
        // Core business data
        this.syncCollection("families"),
        this.syncCollection("students"),
        this.syncCollection("payments"),
        this.syncCollection("fees"),
        this.syncCollection("classes"),
        this.syncCollection("settings"),
        // Discounts and assignments
        this.syncCollection("discounts"),
        this.syncCollection("discountAssignments"),
        // Student-specific data
        this.syncCollection("studentFeeOverrides"),
        this.syncCollection("previousBalances"),
        // User and system data
        this.syncCollection("users"),
        this.syncCollection("roles"),
      ]);

      this.lastSyncTime.lastFullSync = now;
      //   console.log("Background sync completed");
    } catch (error) {
      console.error("Background sync error:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single collection by fetching all documents
   * This triggers Firestore's offline persistence to cache the data
   */
  async syncCollection(collectionName) {
    try {
      const ref = collection(db, collectionName);
      const snapshot = await getDocs(ref);

      const count = snapshot.docs.length;
      //   console.log(`Synced ${count} documents from ${collectionName}`);

      this.lastSyncTime[collectionName] = Date.now();
      return count;
    } catch (error) {
      console.warn(`Failed to sync ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time updates for a collection
   * Helps keep data fresh in the background
   */
  subscribeToCollection(collectionName, onUpdate, onError) {
    try {
      const ref = collection(db, collectionName);
      const unsubscribe = onSnapshot(
        ref,
        (snapshot) => {
          //   console.log(`Updated ${collectionName}: ${snapshot.docs.length} docs`);
          onUpdate?.(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (error) => {
          console.error(`Error subscribing to ${collectionName}:`, error);
          onError?.(error);
        },
      );

      // Store unsubscribe function for cleanup
      this.listeners.set(collectionName, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error(`Failed to subscribe to ${collectionName}:`, error);
      return null;
    }
  }

  /**
   * Unsubscribe from a specific collection
   */
  unsubscribeFromCollection(collectionName) {
    const unsubscribe = this.listeners.get(collectionName);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(collectionName);
    }
  }

  /**
   * Unsubscribe from all listeners
   */
  unsubscribeAllListeners() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(collectionName) {
    if (collectionName) {
      return this.lastSyncTime[collectionName] || null;
    }
    return this.lastSyncTime;
  }

  /**
   * Check if sync is currently active
   */
  isActive() {
    return !!this.syncInterval;
  }
}

// Export singleton instance
export const bgSync = new BackgroundSyncManager();

/**
 * Helper to initialize background sync on app startup
 */
export const initializeBackgroundSync = () => {
  // Start sync only in the main app context (not in service workers)
  if (typeof window !== "undefined") {
    bgSync.startSync();

    // Cleanup on beforeunload
    window.addEventListener("beforeunload", () => {
      bgSync.stopSync();
    });
  }
};

/**
 * Hook-friendly wrapper for background sync
 */
export const useBackgroundSync = (enabled = true) => {
  if (enabled && !bgSync.isActive()) {
    bgSync.startSync();
  }

  return {
    isActive: bgSync.isActive(),
    lastSync: bgSync.getLastSyncTime(),
    stop: () => bgSync.stopSync(),
  };
};
