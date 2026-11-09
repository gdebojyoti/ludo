import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { movePlaysOutFor, rollPlaysOutFor, type GameSnapshot } from "@ludo/shared";

import {
  gameCodeIn,
  playerKeyIn,
  startServer,
  webAppUrl,
  type AiPlayer,
  type Connection,
  type TestServer,
} from "../testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer({ waitForTurnTimeout: 300 });
});

afterEach(async () => {
  await server.close();
});

/**
 * Restarts the server with its random choices scripted: the Game code 000042, the first Player to be the first in
 * the Lobby, then each Roll in turn, then 1s.
 */
const scriptRolls = async (...rolls: number[]) => {
  server = await server.restartWithRandomNumbers(42, 0, ...rolls.map((roll) => roll - 1));
};

/** Reads the browser's messages until one shows a Game that `matches`, and returns that Game. */
const gameWhere = async (tab: Connection, matches: (game: GameSnapshot) => boolean) => {
  for (;;) {
    const message = await tab.nextMessage();
    if (message.event === "game" && matches(message.game)) return message.game;
  }
};

/** Reads the browser's messages until one shows the Game in this state, and returns that Game. */
const gameIn = (tab: Connection, state: string) => gameWhere(tab, (game) => game.state === state);

/** Reads the browser's messages until it's the Turn of the Player in Seat 2, the second to join, yet to Roll. */
const joinersTurn = (tab: Connection) => gameWhere(tab, ({ board }) => board?.turn === 2 && !board.rolled);

/** Calls wait_for_turn until it has Rolled for the AI, and returns what it said. */
const aiRolled = async (ai: AiPlayer) => {
  for (;;) {
    const reply = await ai.waitForTurn();
    if (reply.text.includes("you Rolled")) return reply.text;
  }
};

/** An AI Host and a Player in a browser who has joined its Lobby, with the AI told they joined. */
const aiHostWithJoiner = async (options: { mode?: string } = {}) => {
  const ai = await server.connectAi();
  const gameCode = gameCodeIn(await ai.createGame({ playerName: "Claude", ...options }));
  const joiner = await server.playerWithNoGame();
  await joiner.joinGame(gameCode, "Ginny Weasley");
  await joiner.nextMessage();
  await ai.waitForTurn();
  return { ai, joiner, gameCode };
};

/** An AI Host and a Player in a browser, in a Game the AI has started, with the AI's Turn first. */
const aiGameInPlay = async (options: { mode?: string } = {}) => {
  const game = await aiHostWithJoiner(options);
  await game.ai.startGame();
  await gameIn(game.joiner, "playing");
  return game;
};

describe("the tools an AI Player is given", () => {
  it("explain the rules, both Game modes and the play loop in every tool's description", async () => {
    const ai = await server.connectAi();

    const descriptions = await ai.toolDescriptions();

    expect(Object.keys(descriptions).sort())
      .toEqual(["create_game", "join_game", "leave_game", "move_token", "start_game", "wait_for_turn"]);
    for (const description of Object.values(descriptions)) {
      expect(description).toContain("The Track is a loop of 52 Cells");
      expect(description).toContain("The Safe cells, where no Token can be Captured, are");
      expect(description).toContain("0, 8, 13, 21, 26, 34, 39, 47");
      expect(description).toContain("In Classic,");
      expect(description).toContain("In One Kill Win,");
      expect(description).toContain("then move_token, then wait_for_turn again");
    }
  });
});

describe("an AI Player's Player key", () => {
  it("is given by create_game and join_game, which say to pass it to every later call", async () => {
    const host = await server.connectAi();
    const created = await host.createGame();
    const joiner = await server.connectAi();
    const joined = await joiner.joinGame(gameCodeIn(created));

    for (const reply of [created, joined]) {
      expect(reply.isError).toBe(false);
      expect(playerKeyIn(reply)).not.toBe("");
      expect(reply.text).toContain("Pass it as playerKey to every tool you call from now on");
    }
    expect(playerKeyIn(created)).not.toBe(playerKeyIn(joined));
  });

  it("lets several conversations on one MCP session play as their own Players in the same Game", async () => {
    await scriptRolls(3, 6);
    const host = await server.connectAi();
    const second = host.sharingSession();
    const third = host.sharingSession();
    const gameCode = gameCodeIn(await host.createGame({ playerName: "Claude One" }));

    expect((await second.joinGame(gameCode, { playerName: "Claude Two" })).isError).toBe(false);
    expect((await third.joinGame(gameCode, { playerName: "Claude Three" })).isError).toBe(false);
    expect((await host.waitForTurn()).text)
      .toContain("with 3 of 4 Players in: Claude One (the Host), Claude Two, Claude Three.");
    await host.startGame();

    // The Host goes first, and its Roll of 3 can't Move a Token out of the Yard, so the Turn passes clockwise to
    // Claude Three, the third to join, in Seat 1.
    expect((await host.waitForTurn()).text).toContain("Still waiting for Claude Three to take their Turn");
    const view = await third.waitForTurn();
    expect(view.text).toContain("- Seat 0 (Claude One): Token 1 in the Yard");
    expect(view.text).toContain("- Seat 1 (you, Claude Three): Token 1 in the Yard");
    expect(view.text).toContain("- Seat 2 (Claude Two): Token 1 in the Yard");
    expect(view.text).toContain("It's your Turn, and you Rolled a 6.");
  });

  it("carries on a Game from a new MCP session after the first has closed", async () => {
    await scriptRolls(6);
    const { ai, joiner } = await aiHostWithJoiner();
    await ai.close();
    await ai.moveToNewSession();

    expect((await ai.startGame()).isError).toBe(false);
    expect((await ai.waitForTurn()).text).toContain("you Rolled a 6");
    await ai.close();
    await ai.moveToNewSession();

    expect((await ai.moveToken(1)).isError).toBe(false);
    await gameWhere(joiner, ({ board }) => board?.seats[0]?.tokens[0]?.area === "track");
  });

  it.each(["start_game", "wait_for_turn", "move_token", "leave_game"])(
    "is required by %s, which says how to get one",
    async (tool) => {
      const ai = await server.connectAi();

      // Refused as other refusals are, not as bad arguments.
      expect(await ai.callUnchecked(tool, { token: 1 }))
        .toEqual({ isError: true, text: expect.stringMatching(/^playerKey is missing: pass the Player key that/) });
    },
  );

  it.each(["start_game", "wait_for_turn", "move_token", "leave_game", "create_game", "join_game"])(
    "is refused by %s when it's not one Ludo gave out, saying what to do",
    async (tool) => {
      const ai = await server.connectAi();

      const reply = await ai.callUnchecked(tool, { playerKey: "not-a-key", gameCode: "123456", token: 1 });

      expect(reply).toEqual({ isError: true, text: expect.stringContaining("That isn't a Player key Ludo gave out") });
      expect(reply.text).toContain("call create_game or join_game without a playerKey");
    },
  );

  it("isn't given for a refused join, so trying again gives a new one", async () => {
    const ai = await server.connectAi();
    expect(playerKeyIn(await ai.joinGame("123456"))).toBe("");

    const { gameCode } = await server.hostInLobby();

    expect(playerKeyIn(await ai.joinGame(gameCode))).not.toBe("");
  });
});

describe("an AI Player creating a Game", () => {
  it("creates a Classic Game by default, and tells the AI its Join link and Game code", async () => {
    const ai = await server.connectAi();

    const reply = await ai.createGame({ playerName: "Claude" });
    const gameCode = gameCodeIn(reply);

    expect(reply.isError).toBe(false);
    expect(reply.text).toContain("You created a Classic Game.");
    expect(reply.text).toContain(`Join link, ${webAppUrl}?join=${gameCode},`);
    expect(reply.text).toContain(`open ${webAppUrl} and enter the Game code ${gameCode}`);
    expect(reply.text).toContain("with 1 of 4 Players in: Claude (the Host).");
    expect((await server.debugGames()).games[0]).toMatchObject({ mode: "classic", state: "lobby" });
  });

  it("creates a One Kill Win Game when asked", async () => {
    const ai = await server.connectAi();

    const reply = await ai.createGame({ mode: "oneKillWin" });

    expect(reply.text).toContain("You created a One Kill Win Game.");
    expect((await server.debugGames()).games[0]).toMatchObject({ mode: "oneKillWin" });
  });

  it("refuses a Game mode that isn't one", async () => {
    const ai = await server.connectAi();

    const reply = await ai.createGame({ mode: "quickGame" });

    expect(reply)
      .toEqual({ isError: true, text: expect.stringContaining('mode must be one of "classic", "oneKillWin"') });
  });

  it("gives the AI a random Player name when it gives none", async () => {
    const ai = await server.connectAi();

    await ai.createGame();

    const [game] = (await server.debugGames()).games;
    expect(game?.players[0]?.playerName).toMatch(/^\S+ \S+$/);
  });

  it("refuses a Player name that's too long, saying what's allowed", async () => {
    const ai = await server.connectAi();

    const reply = await ai.createGame({ playerName: "x".repeat(31) });

    expect(reply).toEqual({ isError: true, text: expect.stringContaining("playerName must have 1 to 30 characters") });
    expect(playerKeyIn(reply)).toBe("");
  });

  it("wakes the waiting AI Host when a Player joins, and again when they Leave", async () => {
    const ai = await server.connectAi();
    const gameCode = gameCodeIn(await ai.createGame({ playerName: "Claude" }));
    const joiner = await server.playerWithNoGame();

    const waiting = ai.waitForTurn();
    await joiner.joinGame(gameCode, "Ginny Weasley");
    expect((await waiting).text).toContain("with 2 of 4 Players in: Claude (the Host), Ginny Weasley.");

    const waitingAgain = ai.waitForTurn();
    await joiner.leaveGame();
    expect((await waitingAgain).text).toContain("with 1 of 4 Players in: Claude (the Host).");
  });

  it("says to call again once waiting in the Lobby times out", async () => {
    const ai = await server.connectAi();
    const gameCode = gameCodeIn(await ai.createGame());

    expect(await ai.waitForTurn()).toEqual({
      isError: false,
      text: `Still waiting for someone else to join with Game code ${gameCode}: call wait_for_turn again.`,
    });
  });

  it("refuses to start the Game before anyone has joined", async () => {
    const ai = await server.connectAi();
    await ai.createGame();

    expect(await ai.startGame())
      .toEqual({ isError: true, text: expect.stringContaining("needs at least 2 Players to start") });
  });

  it("starts the Game, which the Player in the browser sees with the AI in it", async () => {
    const { ai, joiner } = await aiHostWithJoiner();

    const reply = await ai.startGame();

    expect(reply.text).toContain("You started the Game.");
    expect(await gameIn(joiner, "playing")).toMatchObject({
      players: [{ playerName: "Claude", isHost: true, away: false }, { playerName: "Ginny Weasley" }],
    });
  });

  it("wakes the waiting AI Host when a 4th Player joins and starts the Game, even when it's not its Turn", async () => {
    // The Game code, then the first Player: the second to join, Ginny Weasley.
    server = await server.restartWithRandomNumbers(42, 1);
    const ai = await server.connectAi();
    const gameCode = gameCodeIn(await ai.createGame({ playerName: "Claude" }));
    for (const playerName of ["Ginny Weasley", "Fred Weasley"]) await server.playerInLobby(gameCode, { playerName });
    await ai.waitForTurn();

    const waiting = ai.waitForTurn();
    await server.playerInLobby(gameCode, { playerName: "George Weasley" });
    const view = (await waiting).text;

    expect(view).toContain("Your Game has started.");
    expect(view).toContain("It's Ginny Weasley's Turn.");
  });
});

describe("an AI Player joining a Game", () => {
  it("joins a browser Host's Lobby, and waits for the Host to start it", async () => {
    await scriptRolls(6);
    const { host, gameCode } = await server.hostInLobby();
    const ai = await server.connectAi();

    const reply = await ai.joinGame(gameCode, { playerName: "Claude" });

    expect(reply.text).toContain("You joined the Game as Claude.");
    expect(await host.nextMessage()).toMatchObject({
      game: { players: [{ playerName: "Luna Lovegood" }, { playerName: "Claude", away: false }] },
    });
    expect((await ai.waitForTurn()).text)
      .toBe("Still waiting for the Host to start the Game: call wait_for_turn again.");
  });

  it("is told once the Host starts the Game, even when it's not the AI's Turn", async () => {
    // The Host goes first.
    await scriptRolls(6);
    const { host, gameCode } = await server.hostInLobby();
    const ai = await server.connectAi();
    await ai.joinGame(gameCode, { playerName: "Claude" });

    const waiting = ai.waitForTurn();
    await host.startGame();
    const view = (await waiting).text;

    expect(view).toContain("Your Game has started.");
    expect(view).toContain("It's Luna Lovegood's Turn.");
  });

  it("refuses an unknown Game code", async () => {
    const ai = await server.connectAi();

    expect(await ai.joinGame("123456"))
      .toEqual({ isError: true, text: expect.stringContaining("No Game in the Lobby has that Game code") });
  });

  it("refuses an AI that's already in an active Game", async () => {
    const ai = await server.connectAi();
    await ai.createGame();
    const { gameCode } = await server.hostInLobby();

    expect(await ai.joinGame(gameCode))
      .toEqual({ isError: true, text: expect.stringContaining("You're already in a Game") });
  });

  it("refuses to let an AI that isn't the Host start the Game", async () => {
    const { gameCode } = await server.hostInLobby();
    const ai = await server.connectAi();
    await ai.joinGame(gameCode);

    expect(await ai.startGame()).toEqual({ isError: true, text: expect.stringContaining("Only the Host can start") });
  });
});

describe("an AI Player's Turn", () => {
  it("Rolls for the AI when it waits, and lists what each Move open to it would do", async () => {
    await scriptRolls(6);
    const { ai } = await aiGameInPlay();

    const view = (await ai.waitForTurn()).text;

    expect(view).toContain("It's your Turn, and you Rolled a 6.");
    expect(view).toContain("- Token 1: the Yard to Track cell 0; a Safe cell; earns you another Roll.");
    expect(view).toContain("- Token 4: the Yard to Track cell 0");
  });

  it("Moves the Token the AI chooses, which the browser sees, and Rolls again for a 6", async () => {
    await scriptRolls(6, 4);
    const { ai, joiner } = await aiGameInPlay();
    await ai.waitForTurn();

    const moved = await ai.moveToken(2);

    expect(moved.text).toContain("Your Move earned another Roll: call wait_for_turn, which Rolls for you.");
    expect(moved.text).toContain("Token 2 on Track cell 0 (56 to go)");
    await gameWhere(joiner, ({ board }) => board?.seats[0]?.tokens[1]?.area === "track");
    expect((await ai.waitForTurn()).text).toContain("- Token 2: Track cell 0 to Track cell 4.");
  });

  it("passes the Turn when the AI can't Move by its Roll, and says so once the Turn comes back", async () => {
    // The AI's 3 can't bring a Token out, nor can Ginny's 2, then the AI Rolls a 6.
    await scriptRolls(3, 2, 6);
    const { ai, joiner } = await aiGameInPlay();

    const waiting = aiRolled(ai);
    await joinersTurn(joiner);
    await joiner.roll();
    const view = await waiting;

    expect(view).toContain("You Rolled a 3, which none of your Tokens could Move by, so your Turn passed.");
    expect(view).toContain("It's your Turn, and you Rolled a 6.");
  });

  it("warns which opponents' Tokens could Capture a Token where it would land", async () => {
    // The AI's 1 passes. Ginny's 6 brings her Token 1 out onto Track cell 26, and her 1 Moves it to 27. The AI's five
    // 6s bring its Token 1 out and on to Track cell 24, and its 4 could take it to 28, just ahead of hers.
    await scriptRolls(1, 6, 1, 6, 6, 6, 6, 6, 4);
    const { ai, joiner } = await aiGameInPlay();
    const waiting = aiRolled(ai);
    for (let roll = 0; roll < 2; roll++) {
      await joinersTurn(joiner);
      await joiner.roll();
      await joiner.move(0);
    }
    await waiting;
    for (let roll = 0; roll < 4; roll++) {
      await ai.moveToken(1);
      await ai.waitForTurn();
    }
    await ai.moveToken(1);

    const view = (await ai.waitForTurn()).text;

    expect(view).toContain("It's your Turn, and you Rolled a 4.");
    expect(view).toContain("- Token 1: Track cell 24 to Track cell 28; could be Captured there by Ginny " +
      "Weasley's Token 1 with a 1, Ginny Weasley's Tokens 2, 3 and 4 with a 6 then a 2.");
  });

  it("waits for each Roll and Move to play out on every screen before it Moves or Rolls for the AI", async () => {
    // The AI Rolls a 6, Moves its Token 1 out of the Yard, which earns another Roll, then Rolls a 3.
    await server.close();
    const numbers = [42, 0, 5, 2];
    server = await startServer({ paceAiPlayers: true, randomInt: () => numbers.shift() ?? 0 });
    const { ai } = await aiGameInPlay();
    await aiRolled(ai);

    let started = Date.now();
    await ai.moveToken(1);
    expect(Date.now() - started).toBeGreaterThanOrEqual(rollPlaysOutFor);

    started = Date.now();
    expect(await aiRolled(ai)).toContain("you Rolled a 3");
    expect(Date.now() - started).toBeGreaterThanOrEqual(movePlaysOutFor({ area: "yard" }, 6, false));
  });

  it("refuses a Token that can't Move by the Roll", async () => {
    await scriptRolls(6);
    const { ai } = await aiGameInPlay();
    await ai.waitForTurn();
    await ai.moveToken(1);

    expect(await ai.moveToken(5))
      .toEqual({ isError: true, text: expect.stringContaining("You haven't Rolled yet") });
    await ai.waitForTurn();
    expect(await ai.moveToken(2))
      .toEqual({ isError: true, text: expect.stringContaining("That Token can't Move by your Roll") });
  });

  it("refuses a Move when it isn't the AI's Turn", async () => {
    await scriptRolls(3);
    const { ai } = await aiGameInPlay();
    await ai.waitForTurn();

    expect(await ai.moveToken(1)).toEqual({ isError: true, text: expect.stringContaining("It's not your Turn") });
  });
});

describe("the end of an AI Player's Game", () => {
  it("tells the AI it won a One Kill Win Game with its Capture", async () => {
    // The AI's 1 Moves its Token 1 from its Start cell, Track cell 0, to 1. Ginny's 1 Moves her Token 1 from hers,
    // Track cell 26, to 27, off the Safe cell. The AI's four 6s take its Token 1 on to 25, and its 2 could Capture
    // hers.
    await scriptRolls(1, 1, 6, 6, 6, 6, 2);
    const { ai, joiner } = await aiGameInPlay({ mode: "oneKillWin" });
    await ai.waitForTurn();
    await ai.moveToken(1);
    await joinersTurn(joiner);
    await joiner.roll();
    await joiner.move(0);
    await aiRolled(ai);
    for (let roll = 0; roll < 3; roll++) {
      await ai.moveToken(1);
      await ai.waitForTurn();
    }
    await ai.moveToken(1);
    expect((await ai.waitForTurn()).text).toContain("- Token 1: Track cell 25 to Track cell 27; Captures " +
      "Ginny Weasley's Token 1; winning the Game.");

    const won = await ai.moveToken(1);

    expect(won.text).toContain("Your Move won the Game!");
    expect(won.text).toContain("The Game is over: you won, by Capturing Ginny Weasley's Token 1.");
    expect(await gameIn(joiner, "won")).toMatchObject({ board: { winner: 0 } });
  });

  it("tells the AI it won when every other Player Leaves", async () => {
    await scriptRolls(3);
    const { ai, joiner } = await aiGameInPlay();

    const waiting = ai.waitForTurn();
    await joiner.leaveGame();

    expect((await waiting).text).toContain("The Game is over: you won, as every other Player Left.");
  });

  it("cancels the Game when the AI Host Leaves the Lobby", async () => {
    const { ai, joiner } = await aiHostWithJoiner();

    expect((await ai.leaveGame()).text).toBe("You Left the Lobby. As you were its Host, the Game was cancelled.");
    expect(await gameIn(joiner, "cancelled")).toMatchObject({ state: "cancelled" });
  });

  it("forfeits the AI's Seat when it Leaves during play", async () => {
    const { ai, joiner } = await aiGameInPlay();

    expect((await ai.leaveGame()).text).toBe("You Left the Game. Call create_game or join_game to play another.");
    expect(await gameIn(joiner, "won")).toMatchObject({ board: { winner: 2 } });
    expect(await ai.waitForTurn()).toEqual({ isError: true, text: expect.stringContaining("You're not in a Game") });
  });

  it("says the AI isn't in a Game once it Leaves, not how an earlier Game it played ended", async () => {
    // A first Game, which the AI wins as Ginny Leaves.
    const first = await aiGameInPlay();
    await first.joiner.leaveGame();
    expect((await first.ai.waitForTurn()).text).toContain("you won, as every other Player Left");
    // A second Game, with the same Player key, which the AI Leaves.
    const gameCode = gameCodeIn(await first.ai.createGame());
    await server.playerInLobby(gameCode);
    await first.ai.startGame();
    await first.ai.leaveGame();

    expect(await first.ai.waitForTurn())
      .toEqual({ isError: true, text: expect.stringContaining("You're not in a Game") });
  });
});

describe("an idle AI Player", () => {
  const idleServer = async () => {
    await server.close();
    server = await startServer({ waitForTurnTimeout: 300, aiPlayerIdleTimeout: 200 });
  };

  it("is shown as Away once it has made no call for a while", async () => {
    await idleServer();
    const { host, gameCode } = await server.hostInLobby();
    const ai = await server.connectAi();
    await ai.joinGame(gameCode, { playerName: "Claude" });
    await host.startGame();

    const game = await gameWhere(host, ({ players }) => players[1]?.away === true);

    expect(game).toMatchObject({ state: "playing", players: [{ away: false }, { playerName: "Claude", away: true }] });
  });

  it("Leaves a Game in the Lobby, cancelling one it hosts, as its conversation may never come back", async () => {
    await idleServer();
    const ai = await server.connectAi();
    const gameCode = gameCodeIn(await ai.createGame());
    const joiner = await server.playerWithNoGame();
    await joiner.joinGame(gameCode, "Ginny Weasley");

    expect(await gameIn(joiner, "cancelled")).toMatchObject({ state: "cancelled" });
  });
});
