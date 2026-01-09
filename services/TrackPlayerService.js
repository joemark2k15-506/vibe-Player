import TrackPlayer, { Event } from "react-native-track-player";

module.exports = async function () {
  // The actual logic is now handled in AudioService.ts (UI Thread) via event listeners.
  // These listeners are technically "duplicates" but required for the service to be "alive".
  // We can leave them empty or just log, as the UI thread listeners will pick up the same events
  // assuming the app is running.

  // NOTE: If the app is KILLED, these will run in Headless mode.
  // But without the UI/Context, we can't really do "Next" (Queue is in React State).
  // So for now, we accept Next/Prev only works while App is in memory (Foreground/Background).

  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    console.log("RemoteNext (Background)")
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    console.log("RemotePrevious (Background)")
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) =>
    TrackPlayer.seekTo(e.position)
  );
};
