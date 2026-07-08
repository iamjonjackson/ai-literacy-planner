import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ─── Schema ──────────────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "pending";

export type IdbProgramme = {
  id: string;
  name: string;
  description: string;
  years: number;
  ownerEmail: string;
  role: "owner" | "editor" | "viewer";
  updatedAt: string;
  syncStatus: SyncStatus;
  localUpdatedAt: string;
};

export type IdbModule = {
  id: string;
  programmeId: string;
  year: number;
  name: string;
  code: string;
  credits: string;
  description: string;
  order: number;
  aims?: string;
  scheme?: string;
  organiser?: string;
  url?: string;
  isCompulsory?: boolean;
  updatedAt: string;
  syncStatus: SyncStatus;
  localUpdatedAt: string;
};

export type IdbLearningOutcome = {
  id: string;
  programmeId: string;
  competencyId: string | null;
  text: string;
  moduleId: string | null;
  category?: string;
  loNumber?: string;
  status?: "to_delete";
  updatedAt: string;
  syncStatus: SyncStatus;
  localUpdatedAt: string;
};

export type IdbAssessment = {
  id: string;
  programmeId: string;
  moduleId: string;
  assessmentCode: string;
  title: string;
  description: string;
  weight: string;
  duration: string;
  priority: "Low" | "Medium" | "High" | null;
  rag: "Red" | "Amber" | "Green" | null;
  learningOutcomeIds: string[];
  updatedAt: string;
  syncStatus: SyncStatus;
  localUpdatedAt: string;
};

interface PlannerSchema extends DBSchema {
  programmes: {
    key: string;
    value: IdbProgramme;
    indexes: { "by-owner": string };
  };
  modules: {
    key: string;
    value: IdbModule;
    indexes: { "by-programme": string };
  };
  learning_outcomes: {
    key: string;
    value: IdbLearningOutcome;
    indexes: { "by-programme": string; "by-module": string };
  };
  assessments: {
    key: string;
    value: IdbAssessment;
    indexes: { "by-module": string; "by-programme": string };
  };
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

const DB_NAME = "ai-literacy-planner";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PlannerSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<PlannerSchema>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available in SSR"));
  }

  if (!dbPromise) {
    dbPromise = openDB<PlannerSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // programmes
        const programmes = db.createObjectStore("programmes", { keyPath: "id" });
        programmes.createIndex("by-owner", "ownerEmail");

        // modules
        const modules = db.createObjectStore("modules", { keyPath: "id" });
        modules.createIndex("by-programme", "programmeId");

        // learning outcomes
        const los = db.createObjectStore("learning_outcomes", { keyPath: "id" });
        los.createIndex("by-programme", "programmeId");
        los.createIndex("by-module", "moduleId");

        // assessments
        const assessments = db.createObjectStore("assessments", { keyPath: "id" });
        assessments.createIndex("by-module", "moduleId");
        assessments.createIndex("by-programme", "programmeId");
      },
    });
  }

  return dbPromise;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function makeRecord<T extends { id: string }>(
  data: T,
  syncStatus: SyncStatus = "pending",
): T & { updatedAt: string; syncStatus: SyncStatus; localUpdatedAt: string } {
  const ts = now();
  return { ...data, updatedAt: ts, syncStatus, localUpdatedAt: ts };
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Load all data for the current user
export async function loadAllFromIdb(): Promise<{
  programmes: IdbProgramme[];
  modules: IdbModule[];
  learningOutcomes: IdbLearningOutcome[];
  assessments: IdbAssessment[];
}> {
  const db = await getDb();
  const [programmes, modules, learningOutcomes, assessments] = await Promise.all([
    db.getAll("programmes"),
    db.getAll("modules"),
    db.getAll("learning_outcomes"),
    db.getAll("assessments"),
  ]);
  return { programmes, modules, learningOutcomes, assessments };
}

// Persist full state snapshot
export async function saveAllToIdb(state: {
  programmes: IdbProgramme[];
  modules: IdbModule[];
  learningOutcomes: IdbLearningOutcome[];
  assessments: IdbAssessment[];
}): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ["programmes", "modules", "learning_outcomes", "assessments"],
    "readwrite",
  );
  const programmesStore = tx.objectStore("programmes");
  const modulesStore = tx.objectStore("modules");
  const outcomesStore = tx.objectStore("learning_outcomes");
  const assessmentsStore = tx.objectStore("assessments");

  await Promise.all([
    programmesStore.clear(),
    modulesStore.clear(),
    outcomesStore.clear(),
    assessmentsStore.clear(),
    ...state.programmes.map((r) => programmesStore.put(r)),
    ...state.modules.map((r) => modulesStore.put(r)),
    ...state.learningOutcomes.map((r) => outcomesStore.put(r)),
    ...state.assessments.map((r) => assessmentsStore.put(r)),
    tx.done,
  ]);
}

// Upsert a single record, setting syncStatus = 'pending'
export async function upsertProgramme(
  data: Omit<IdbProgramme, "updatedAt" | "syncStatus" | "localUpdatedAt">,
): Promise<void> {
  const db = await getDb();
  await db.put("programmes", makeRecord(data) as IdbProgramme);
}

export async function upsertModule(
  data: Omit<IdbModule, "updatedAt" | "syncStatus" | "localUpdatedAt">,
): Promise<void> {
  const db = await getDb();
  await db.put("modules", makeRecord(data) as IdbModule);
}

export async function upsertLearningOutcome(
  data: Omit<IdbLearningOutcome, "updatedAt" | "syncStatus" | "localUpdatedAt">,
): Promise<void> {
  const db = await getDb();
  await db.put("learning_outcomes", makeRecord(data) as IdbLearningOutcome);
}

export async function upsertAssessment(
  data: Omit<IdbAssessment, "updatedAt" | "syncStatus" | "localUpdatedAt">,
): Promise<void> {
  const db = await getDb();
  await db.put("assessments", makeRecord(data) as IdbAssessment);
}

export async function deleteProgrammeFromIdb(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("programmes", id);
}

export async function deleteModuleFromIdb(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("modules", id);
}

export async function deleteLearningOutcomeFromIdb(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("learning_outcomes", id);
}

export async function deleteAssessmentFromIdb(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("assessments", id);
}

// Get all records with pending sync status
export async function getPendingRecords() {
  const db = await getDb();
  const [programmes, modules, learningOutcomes, assessments] = await Promise.all([
    db.getAll("programmes"),
    db.getAll("modules"),
    db.getAll("learning_outcomes"),
    db.getAll("assessments"),
  ]);

  return {
    programmes: programmes.filter((r) => r.syncStatus === "pending"),
    modules: modules.filter((r) => r.syncStatus === "pending"),
    learningOutcomes: learningOutcomes.filter((r) => r.syncStatus === "pending"),
    assessments: assessments.filter((r) => r.syncStatus === "pending"),
  };
}

// Mark a record as synced after successful Supabase push
export async function markSynced(
  store: "programmes" | "modules" | "learning_outcomes" | "assessments",
  id: string,
): Promise<void> {
  const db = await getDb();
  const record = await db.get(store, id);
  if (record) {
    await db.put(store, { ...record, syncStatus: "synced" });
  }
}

// Merge data from Supabase into IndexedDB (last-write-wins on updatedAt)
export async function mergeFromSupabase(incoming: {
  programmes?: IdbProgramme[];
  modules?: IdbModule[];
  learningOutcomes?: IdbLearningOutcome[];
  assessments?: IdbAssessment[];
}): Promise<boolean> {
  const db = await getDb();
  let changed = false;

  type Store = "programmes" | "modules" | "learning_outcomes" | "assessments";

  async function mergeStore<
    T extends { id: string; updatedAt: string; syncStatus: SyncStatus; localUpdatedAt: string },
  >(storeName: Store, records: T[] | undefined) {
    if (!records?.length) return;

    for (const incoming of records) {
      const existing = await db.get(storeName, incoming.id);

      // Skip if local is newer or equal (pending write takes priority)
      if (
        existing &&
        existing.syncStatus === "pending" &&
        existing.localUpdatedAt >= incoming.updatedAt
      ) {
        continue;
      }

      if (!existing || incoming.updatedAt > existing.updatedAt) {
        await db.put(storeName, { ...incoming, syncStatus: "synced" } as unknown as IdbProgramme);
        changed = true;
      }
    }
  }

  await mergeStore("programmes", incoming.programmes);
  await mergeStore("modules", incoming.modules);
  await mergeStore("learning_outcomes", incoming.learningOutcomes);
  await mergeStore("assessments", incoming.assessments);

  return changed;
}
