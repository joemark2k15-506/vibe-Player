import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_RUN_KEY = 'vibe_player_first_run_complete';

export const FirstRunService = {
  /**
   * Checks if the app has completed the first run setup.
   * Returns true if setup is complete (NOT first run).
   * Returns false if it IS the first run (or setup not done).
   */
  async checkFirstRunComplete(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(FIRST_RUN_KEY);
      return value === 'true';
    } catch (e) {
      console.error('[FirstRunService] Error checking status:', e);
      return false; // Fail safe: assume not complete to ensure setup happens
    }
  },

  /**
   * Marks the first run setup as complete.
   */
  async markFirstRunComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
    } catch (e) {
      console.error('[FirstRunService] Error marking complete:', e);
    }
  },

  /**
   * Resets the first run state (for testing).
   */
  async resetFirstRun(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FIRST_RUN_KEY);
    } catch (e) {
      console.error('[FirstRunService] Error resetting:', e);
    }
  }
};
