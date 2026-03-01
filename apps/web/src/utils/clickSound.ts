/**
 * Click sound utility
 * Plays a click sound effect for UI interactions
 */

let clickAudio: HTMLAudioElement | null = null;

/**
 * Initialize the click sound
 */
export function initClickSound() {
  if (!clickAudio) {
    clickAudio = new Audio('/sounds/click-sound.mp3');
    clickAudio.volume = 0.15; // Set volume to 15% so it's not too loud
  }
}

/**
 * Play the click sound
 */
export function playClickSound() {
  initClickSound();

  if (clickAudio) {
    // Clone the audio to allow multiple rapid clicks
    const sound = clickAudio.cloneNode() as HTMLAudioElement;
    sound.volume = 0.15;
    sound.play().catch(err => {
      // Ignore errors (e.g., if autoplay is blocked)
      console.debug('[Click Sound] Play failed:', err);
    });
  }
}
