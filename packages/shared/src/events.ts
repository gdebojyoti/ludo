// The Socket.IO event contract between the web app and the server.
// Both sides type their sockets with these, so a change here is checked on both.

/** Why the server refused a command. Each reason is added with the first command that can give it. */
export type RejectionReason = never;

/** The server's answer to a command: success with its result, or a refusal with the reason. */
export type Acknowledgement<Result extends object = object> =
  | ({ ok: true } & Result)
  | { ok: false; reason: RejectionReason };

/** Events the web app sends to the server. */
export interface ClientToServerEvents {
  /** Checks the server is answering; the server acknowledges with `"pong"`. */
  ping: (ack: (reply: "pong") => void) => void;
}

/** Events the server sends to the web app. None yet: they arrive with Games. */
export interface ServerToClientEvents {}
