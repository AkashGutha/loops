import { Timestamp } from "firebase/firestore";

export type LoopStatus = "new" | "act_on" | "active" | "stalled" | "closed";

export type LoopPriority = "high" | "medium" | "low";

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
  body: string;
  authorId: string;
  authorName?: string | null;
  createdAt?: Timestamp | null;
};
