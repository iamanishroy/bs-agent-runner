import atomWithSyncedStorage from "./atomWithSyncedLocalStorage";
import type { Session, DebugDataType } from "./types";

export const buildshipAgentSessionAtom = atomWithSyncedStorage<Record<string, Record<string, Session>>>(
  "buildship:agent:conversations",
  {},
);

export const buildshipAgentDebugDataAtom = atomWithSyncedStorage<Record<string, DebugDataType>>(
  "buildship:agent:debug",
  {},
);

export const DEFAULT_SESSION_NAME = "New Chat";
export const TEMPORARY_SESSION_ID = "sess_temp";
