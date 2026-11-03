// Publishes every change to a Game, so the socket layer can pass it on to the Game's Players.
import type { Game } from "./game-store.js";

/** A change to a Game, with the Player who just Left it if they're no longer in it, so they can be told too. */
type GameListener = (game: Game, leaverId?: string) => void;

export const createGameNotifier = () => {
  let listeners: GameListener[] = [];

  const publish = (game: Game, leaverId?: string) => {
    listeners.forEach((listener) => listener(game, leaverId));
  };

  /** Calls the listener with every Game published from now on, until the function it returns is called. */
  const subscribe = (listener: GameListener) => {
    // A new list each time, so a listener that unsubscribes while a change is being published can't skip another.
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((other) => other !== listener);
    };
  };

  return { publish, subscribe };
};

export type GameNotifier = ReturnType<typeof createGameNotifier>;
