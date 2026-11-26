// What Ludo keeps of each Account it has seen: that it has seen it, and its settings. The Account itself belongs to
// `accounts` (ADR-0014), and Ludo knows it by its ID. Like the result store, it's an interface, with an in-memory version
// for the server tests, so they don't need a database.
import type { Settings } from "@ludo/shared";

export interface AccountStore {
  /**
   * Records that Ludo has seen the Account, and says whether this is the first time, wherever the Account was created.
   * Of two calls at the same moment for an Account not yet seen, only one says it's the first.
   */
  markSeen: (accountId: string) => Promise<boolean>;
  /** The settings the Account has changed, latest change to each winning. Those it never changed are left out. */
  findSettings: (accountId: string) => Promise<Partial<Settings>>;
  /** Keeps a change to some of the Account's settings, the others as they were, and returns them all. */
  changeSettings: (accountId: string, changed: Partial<Settings>) => Promise<Partial<Settings>>;
}

/** The in-memory store, which also lists the Accounts it has seen, so a test can check what was kept. */
export interface MemoryAccountStore extends AccountStore {
  /** The IDs of the Accounts seen, in the order they were first seen. */
  seenAccounts: () => string[];
}

export const createMemoryAccountStore = (): MemoryAccountStore => {
  const seen = new Set<string>();
  const settings = new Map<string, Partial<Settings>>();

  return {
    markSeen: async (accountId) => {
      if (seen.has(accountId)) return false;
      seen.add(accountId);
      return true;
    },
    findSettings: async (accountId) => ({ ...settings.get(accountId) }),
    changeSettings: async (accountId, changed) => {
      const changedSettings = { ...settings.get(accountId), ...changed };
      settings.set(accountId, changedSettings);
      return { ...changedSettings };
    },
    seenAccounts: () => [...seen],
  };
};
