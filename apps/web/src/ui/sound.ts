import dieRoll from "../sounds/die-roll.mp3";
import notifyTurn from "../sounds/notify-turn.mp3";

const sounds = { dieRoll, notifyTurn };

export type Sound = keyof typeof sounds;

// One player per sound, made the first time it plays, so it's loaded once and starts over if played again.
const players = new Map<Sound, HTMLAudioElement>();

/**
 * Plays a sound from the start. The browser may refuse until the Player has tapped something on the page, and the
 * game plays on silently.
 */
export const playSound = (sound: Sound) => {
  let player = players.get(sound);
  if (!player) {
    player = new Audio(sounds[sound]);
    players.set(sound, player);
  }
  player.currentTime = 0;
  player.play().catch(() => {});
};
