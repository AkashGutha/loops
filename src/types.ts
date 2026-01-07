import { Timestamp } from "firebase/firestore";

export type LoopStatus = "new" | "act_on" | "active" | "stalled" | "closed";

export type LoopPriority = "high" | "medium" | "low";

export type FilterKey = "all" | "act-on" | "active" | "due-soon" | "stalled" | "closed" | "new";

export type Filter = {
  key: FilterKey;
  label: string;
  statuses?: LoopStatus[];
  isDynamic?: boolean;
};

export const FILTERS: Record<FilterKey, Filter> = {
  all: {
    key: "all",
    label: "All",
  },
  "act-on": {
    key: "act-on",
    label: "Act on",
    isDynamic: true,
  },
  new: {
    key: "new",
    label: "New",
    statuses: ["new"],
  },
  active: {
    key: "active",
    label: "Active",
    statuses: ["active"],
  },
  "due-soon": {
    key: "due-soon",
    label: "Due soon",
    isDynamic: true,
  },
  stalled: {
    key: "stalled",
    label: "Stalled",
    statuses: ["stalled"],
  },
  closed: {
    key: "closed",
    label: "Closed",
    statuses: ["closed"],
  },
};

export type Loop = {
  id: string;
  title: string;
  primaryObjective: string;
  immediateNextStep: string;
  status: LoopStatus;
  priority: LoopPriority;
  ownerId: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  staleAt?: Timestamp | null;
  dueAt?: Timestamp | null;
};

export type LoopUpdate = {
  id: string;
  body?: string;
  ciphertext?: string | null;
  iv?: string | null;
  kdfSalt?: string | null;
  encryptionVersion?: number | null;
  authorId: string;
  authorName?: string | null;
  createdAt?: Timestamp | null;
};
