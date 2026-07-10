"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { demoProgrammeId } from "@/lib/programme";
import {
  loadAllFromIdb,
  saveAllToIdb,
  getPendingRecords,
  markSynced,
  mergeFromSupabase,
  type IdbProgramme,
  type IdbModule,
  type IdbLearningOutcome,
  type IdbAssessment,
} from "@/lib/idb-store";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type Programme = {
  id: string;
  name: string;
  description: string;
  years: number;
  aiAgentUrl?: string;
  ownerId?: string;
  ownerEmail: string;
  role: "owner" | "editor" | "viewer";
  publicAccessEnabled?: boolean;
  publicAccessToken?: string | null;
  updatedAt: string;
};

type Module = {
  id: string;
  programmeId: string;
  year: number;
  name: string;
  code: string;
  credits: string;
  description: string;
  order: number;
  // Fields populated by CSV import
  aims?: string;
  scheme?: string;
  organiser?: string;
  url?: string;
  isCompulsory?: boolean;
  updatedAt: string;
};

type LearningOutcome = {
  id: string;
  programmeId: string;
  competencyId: string | null;
  text: string;
  moduleId: string | null;
  category?: string;
  loNumber?: string;
  status?: "to_delete";
  updatedAt: string;
};

type PriorityRating = "Low" | "Medium" | "High";
type RagStatus = "" | "Red" | "Amber" | "Green";

type Assessment = {
  id: string;
  programmeId: string;
  moduleId: string;
  assessmentCode: string;
  title: string;
  description: string;
  weight: string;
  duration: string;
  priority: PriorityRating | null;
  rag: RagStatus | null;
  status?: "to_delete";
  learningOutcomeIds: string[];
  updatedAt: string;
};

type CsvModuleImportRow = {
  code: string;
  name: string;
  year: number;
  isCompulsory: boolean;
  credits: string;
  scheme: string;
  organiser: string;
  aims: string;
  url: string;
  learningOutcomes: Array<{ category: string; loNumber: string; text: string }>;
  assessments: Array<{ assessmentCode: string; title: string; weight: string; duration: string }>;
};

type CsvProgrammeLearningOutcomeImportRow = {
  loNumber: string;
  category: string;
  text: string;
};

type BackupPayload = {
  programme: Programme;
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

type ModuleDeletionImpact = {
  moduleId: string;
  programmeId: string;
  moduleName: string;
  mappedLearningOutcomeCount: number;
  assessmentCount: number;
  ratedAssessmentCount: number;
  canDelete: boolean;
};

type BulkModuleDeletionResult = {
  deletedCount: number;
  skippedCount: number;
  skippedModules: string[];
};

export type { PriorityRating, RagStatus };

type AppDataState = {
  programmes: Programme[];
  modules: Module[];
  learningOutcomes: LearningOutcome[];
  assessments: Assessment[];
};

type SyncState = "idle" | "syncing" | "offline";

type PullCursors = {
  programmes: string | null;
  modules: string | null;
  learningOutcomes: string | null;
  assessments: string | null;
};

type AppDataContextValue = {
  state: AppDataState;
  isOffline: boolean;
  syncState: SyncState;
  pendingCount: number;
  isPublicSharedView: boolean;
  sharedProgrammeId: string | null;
  isViewOnly: (programmeId: string) => boolean;
  createProgramme: (input: { name: string; description: string; years: number }) => string;
  updateProgramme: (programmeId: string, patch: Partial<Pick<Programme, "name" | "description" | "years" | "aiAgentUrl">>) => void;
  setProgrammePublicAccess: (programmeId: string, enabled: boolean) => void;
  getProgrammeShareUrl: (programmeId: string) => string | null;
  renameProgramme: (programmeId: string, name: string) => void;
  updateProgrammeYears: (programmeId: string, years: number) => void;
  deleteProgramme: (programmeId: string) => void;
  addModule: (programmeId: string, input: { year: number; name: string; code?: string }) => string;
  getModuleDeletionImpact: (moduleId: string) => ModuleDeletionImpact | null;
  clearModulesForYear: (programmeId: string, year: number) => BulkModuleDeletionResult;
  resetProgrammeModules: (programmeId: string) => BulkModuleDeletionResult;
  updateModule: (moduleId: string, patch: Partial<Pick<Module, "name" | "code" | "credits" | "description" | "year" | "aims" | "scheme" | "organiser" | "url" | "isCompulsory">>) => void;
  deleteModule: (moduleId: string) => ModuleDeletionImpact | null;
  addLearningOutcome: (
    programmeId: string,
    input: { competencyId: string | null; text: string; category?: string; loNumber?: string },
  ) => string;
  updateLearningOutcome: (
    learningOutcomeId: string,
    patch: Partial<Pick<LearningOutcome, "text" | "competencyId" | "moduleId" | "category" | "loNumber" | "status">>,
  ) => void;
  deleteLearningOutcome: (learningOutcomeId: string) => void;
  addAssessment: (
    programmeId: string,
    input: {
      moduleId: string;
      assessmentCode?: string;
      title: string;
      weight?: string;
      duration?: string;
      rag: RagStatus;
      priority?: PriorityRating | null;
    },
  ) => string;
  updateAssessment: (
    assessmentId: string,
    patch: Partial<
      Pick<Assessment, "assessmentCode" | "title" | "description" | "weight" | "duration" | "priority" | "rag" | "status" | "learningOutcomeIds" | "moduleId">
    >,
  ) => void;
  deleteAssessment: (assessmentId: string) => void;
  exportProgrammeBackup: (programmeId: string) => BackupPayload | null;
  importProgrammeBackup: (payload: BackupPayload) => string;
  importCsvModules: (programmeId: string, rows: CsvModuleImportRow[]) => void;
  importProgrammeLearningOutcomes: (
    programmeId: string,
    rows: CsvProgrammeLearningOutcomeImportRow[],
  ) => void;
};

const initialState: AppDataState = {
  programmes: [],
  modules: [],
  learningOutcomes: [],
  assessments: [],
};

function idbRecordToState<T>(record: T): T {
  // IDB records have extra fields (syncStatus, localUpdatedAt) that we carry
  // through transparently — they don't affect in-memory state behaviour.
  return record;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function touchProgramme(programmes: Programme[], programmeId: string) {
  return programmes.map((programme) =>
    programme.id === programmeId ? { ...programme, updatedAt: new Date().toISOString() } : programme,
  );
}

function getDefaultSampleProgramme(): Programme {
  return {
    id: demoProgrammeId,
    name: "Sample Programme",
    description: "Starter programme for UNESCO AI competency planning.",
    years: 3,
    aiAgentUrl: "",
    ownerEmail: "owner@example.edu",
    role: "owner",
    publicAccessEnabled: false,
    publicAccessToken: null,
    updatedAt: new Date().toISOString(),
  };
}

function fromDbPriority(value: string | null | undefined): PriorityRating | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "low") return "Low";
  if (normalized === "medium") return "Medium";
  if (normalized === "high") return "High";
  return null;
}

function fromDbRag(value: string | null | undefined): "Red" | "Amber" | "Green" | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "red") return "Red";
  if (normalized === "amber") return "Amber";
  if (normalized === "green") return "Green";
  return null;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getModuleDeletionImpactFromState(
  state: AppDataState,
  moduleId: string,
): ModuleDeletionImpact | null {
  const moduleRecord = state.modules.find((record) => record.id === moduleId);
  if (!moduleRecord) {
    return null;
  }

  const moduleAssessments = state.assessments.filter((assessment) => assessment.moduleId === moduleId);
  const ratedAssessmentCount = moduleAssessments.filter(
    (assessment) => assessment.rag !== null || assessment.priority !== null,
  ).length;

  return {
    moduleId,
    programmeId: moduleRecord.programmeId,
    moduleName: moduleRecord.name,
    mappedLearningOutcomeCount: state.learningOutcomes.filter((learningOutcome) => learningOutcome.moduleId === moduleId)
      .length,
    assessmentCount: moduleAssessments.length,
    ratedAssessmentCount,
    canDelete: ratedAssessmentCount === 0,
  };
}

function deleteModulesFromState(
  state: AppDataState,
  moduleIds: string[],
): { nextState: AppDataState; result: BulkModuleDeletionResult } {
  const impacts = moduleIds
    .map((moduleId) => getModuleDeletionImpactFromState(state, moduleId))
    .filter((impact): impact is ModuleDeletionImpact => Boolean(impact));
  const deletableIds = new Set(impacts.filter((impact) => impact.canDelete).map((impact) => impact.moduleId));

  if (deletableIds.size === 0) {
    return {
      nextState: state,
      result: {
        deletedCount: 0,
        skippedCount: impacts.length,
        skippedModules: impacts.filter((impact) => !impact.canDelete).map((impact) => impact.moduleName),
      },
    };
  }

  const touchedProgrammeIds = new Set(
    impacts.filter((impact) => deletableIds.has(impact.moduleId)).map((impact) => impact.programmeId),
  );
  const timestamp = new Date().toISOString();

  return {
    nextState: {
      programmes: state.programmes.map((programme) =>
        touchedProgrammeIds.has(programme.id) ? { ...programme, updatedAt: timestamp } : programme,
      ),
      modules: state.modules.filter((module) => !deletableIds.has(module.id)),
      learningOutcomes: state.learningOutcomes.map((learningOutcome) =>
        learningOutcome.moduleId && deletableIds.has(learningOutcome.moduleId)
          ? { ...learningOutcome, moduleId: null }
          : learningOutcome,
      ),
      assessments: state.assessments.filter((assessment) => !deletableIds.has(assessment.moduleId)),
    },
    result: {
      deletedCount: deletableIds.size,
      skippedCount: impacts.length - deletableIds.size,
      skippedModules: impacts.filter((impact) => !impact.canDelete).map((impact) => impact.moduleName),
    },
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(initialState);
  const [isOffline, setIsOffline] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [isPublicSharedView, setIsPublicSharedView] = useState(false);
  const [sharedProgrammeId, setSharedProgrammeId] = useState<string | null>(null);
  const idbLoadedRef = useRef(false);
  const loadedPublicRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStateRef = useRef<AppDataState>(initialState);
  const initialPullDoneRef = useRef(false);
  const changeTrackingReadyRef = useRef(false);
  const suppressChangeTrackingRef = useRef(false);
  const [dirtyProgrammes, setDirtyProgrammes] = useState<string[]>([]);
  const [dirtyModules, setDirtyModules] = useState<string[]>([]);
  const [dirtyLearningOutcomes, setDirtyLearningOutcomes] = useState<string[]>([]);
  const [dirtyAssessments, setDirtyAssessments] = useState<string[]>([]);
  const [pendingProgrammeDeletes, setPendingProgrammeDeletes] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem("ai-literacy-planner:pending-programme-deletes");
      if (!raw) {
        return [];
      }

      const ids = JSON.parse(raw) as string[];
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [pendingModuleDeletes, setPendingModuleDeletes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("ai-literacy-planner:pending-module-deletes");
      if (!raw) return [];
      const ids = JSON.parse(raw) as string[];
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [pendingLearningOutcomeDeletes, setPendingLearningOutcomeDeletes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("ai-literacy-planner:pending-lo-deletes");
      if (!raw) return [];
      const ids = JSON.parse(raw) as string[];
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [pendingAssessmentDeletes, setPendingAssessmentDeletes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("ai-literacy-planner:pending-assessment-deletes");
      if (!raw) return [];
      const ids = JSON.parse(raw) as string[];
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  });
  const [pullCursors, setPullCursors] = useState<PullCursors>(() => {
    if (typeof window === "undefined") {
      return { programmes: null, modules: null, learningOutcomes: null, assessments: null };
    }

    try {
      const raw = window.localStorage.getItem("ai-literacy-planner:pull-cursors");
      if (!raw) {
        return { programmes: null, modules: null, learningOutcomes: null, assessments: null };
      }
      const parsed = JSON.parse(raw) as Partial<PullCursors>;
      return {
        programmes: parsed.programmes ?? null,
        modules: parsed.modules ?? null,
        learningOutcomes: parsed.learningOutcomes ?? null,
        assessments: parsed.assessments ?? null,
      };
    } catch {
      return { programmes: null, modules: null, learningOutcomes: null, assessments: null };
    }
  });
  const lastPullAtRef = useRef(0);
  const publicRefreshInFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "ai-literacy-planner:pending-programme-deletes",
        JSON.stringify(pendingProgrammeDeletes),
      );
    } catch {
      // ignore storage errors
    }
  }, [pendingProgrammeDeletes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("ai-literacy-planner:pending-module-deletes", JSON.stringify(pendingModuleDeletes));
      window.localStorage.setItem("ai-literacy-planner:pending-lo-deletes", JSON.stringify(pendingLearningOutcomeDeletes));
      window.localStorage.setItem("ai-literacy-planner:pending-assessment-deletes", JSON.stringify(pendingAssessmentDeletes));
      window.localStorage.setItem("ai-literacy-planner:pull-cursors", JSON.stringify(pullCursors));
    } catch {
      // ignore storage errors
    }
  }, [pendingAssessmentDeletes, pendingLearningOutcomeDeletes, pendingModuleDeletes, pullCursors]);

  const isViewOnly = useCallback(
    (programmeId: string) => {
      if (isPublicSharedView && sharedProgrammeId === programmeId) {
        return true;
      }

      const programme = state.programmes.find((record) => record.id === programmeId);
      return programme?.role === "viewer";
    },
    [isPublicSharedView, sharedProgrammeId, state.programmes],
  );

  // ── Load from IndexedDB on mount ──────────────────────────────────────────
  useEffect(() => {
    if (idbLoadedRef.current) return;
    idbLoadedRef.current = true;

    loadAllFromIdb()
      .then(({ programmes, modules, learningOutcomes, assessments }) => {
        if (
          programmes.length > 0 ||
          modules.length > 0 ||
          learningOutcomes.length > 0 ||
          assessments.length > 0
        ) {
          suppressChangeTrackingRef.current = true;
          setState({
            programmes: programmes.map(idbRecordToState),
            modules: modules.map(idbRecordToState),
            learningOutcomes: learningOutcomes.map(idbRecordToState),
            assessments: assessments.map(idbRecordToState),
          });
          return;
        }

        if (typeof window !== "undefined") {
          const seededKey = "ai-literacy-planner:sample-seeded";
          const alreadySeeded = window.localStorage.getItem(seededKey) === "true";
          if (!alreadySeeded) {
            suppressChangeTrackingRef.current = true;
            setState((current) => ({
              ...current,
              programmes: [getDefaultSampleProgramme(), ...current.programmes],
            }));
            window.localStorage.setItem(seededKey, "true");
          }
        }
      })
      .catch(() => {
        // IndexedDB not available — fall back to initial state
      });
  }, []);

  // ── Public shared programme loader (readonly) ────────────────────────────
  const sharedToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("publicToken")
      : null;
  const sharedQueryProgrammeId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("programme")
      : null;
  const sharedRouteKey = `${sharedToken ?? ""}|${sharedQueryProgrammeId ?? ""}`;

  const loadPublicProgrammeSnapshot = useCallback(async () => {
    if (!isSupabaseConfigured() || !sharedToken) {
      return null;
    }

    if (publicRefreshInFlightRef.current) {
      return null;
    }

    if (isOffline) {
      setSyncState("offline");
      return null;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    publicRefreshInFlightRef.current = true;
    setSyncState("syncing");

    try {
      let programmeId = sharedQueryProgrammeId;

      if (!programmeId) {
        const { data: byTokenProgramme, error: byTokenError } = await supabase
          .from("programmes")
          .select("id")
          .eq("public_access_enabled", true)
          .eq("public_access_token", sharedToken)
          .maybeSingle();

        if (byTokenError || !byTokenProgramme?.id) {
          return null;
        }

        programmeId = byTokenProgramme.id as string;
      }

      const { data: programme, error } = await supabase
        .from("programmes")
        .select("*")
        .eq("id", programmeId)
        .eq("public_access_enabled", true)
        .eq("public_access_token", sharedToken)
        .single();

      if (error || !programme) {
        return null;
      }

      const [modulesRes, learningOutcomesRes, assessmentsRes] = await Promise.all([
        supabase.from("modules").select("*").eq("programme_id", programmeId),
        supabase
          .from("learning_outcomes")
          .select("*")
          .eq("programme_id", programmeId)
          .order("updated_at", { ascending: true })
          .order("id", { ascending: true }),
        supabase.from("assessments").select("*").eq("programme_id", programmeId),
      ]);

      const mappedProgramme: Programme = {
        id: programme.id as string,
        name: programme.name as string,
        description: (programme.description as string) ?? "",
        years: (programme.years as number) ?? 1,
        aiAgentUrl: (programme.ai_agent_url as string) ?? "",
        ownerId: (programme.owner_id as string | undefined) ?? undefined,
        ownerEmail: (programme.owner_email as string) ?? "",
        role: "viewer",
        publicAccessEnabled: Boolean(programme.public_access_enabled),
        publicAccessToken: (programme.public_access_token as string | null) ?? null,
        updatedAt: (programme.updated_at as string) ?? new Date().toISOString(),
      };

      const mappedModules: Module[] = (modulesRes.data ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        programmeId: m.programme_id as string,
        year: m.year as number,
        name: m.name as string,
        code: (m.code as string) ?? "",
        credits: (m.credits as string) ?? "",
        description: (m.description as string) ?? "",
        order: (m.order as number) ?? 0,
        aims: (m.aims as string | undefined) ?? undefined,
        scheme: (m.scheme as string | undefined) ?? undefined,
        organiser: (m.organiser as string | undefined) ?? undefined,
        url: (m.url as string | undefined) ?? undefined,
        isCompulsory: (m.is_compulsory as boolean | undefined) ?? undefined,
        updatedAt: (m.updated_at as string) ?? new Date().toISOString(),
      }));

      const mappedLearningOutcomes: LearningOutcome[] = (learningOutcomesRes.data ?? []).map(
        (lo: Record<string, unknown>) => ({
          id: lo.id as string,
          programmeId: lo.programme_id as string,
          competencyId: (lo.competency_id as string | null) ?? null,
          text: lo.text as string,
          moduleId: (lo.module_id as string | null) ?? null,
          category: (lo.category as string | undefined) ?? undefined,
          loNumber: (lo.lo_number as string | undefined) ?? undefined,
          status: (lo.status as "to_delete" | undefined) ?? undefined,
          updatedAt: (lo.updated_at as string) ?? new Date().toISOString(),
        }),
      );

      const mappedAssessments: Assessment[] = (assessmentsRes.data ?? []).map(
        (assessment: Record<string, unknown>) => ({
          id: assessment.id as string,
          programmeId: assessment.programme_id as string,
          moduleId: assessment.module_id as string,
          assessmentCode: (assessment.assessment_code as string) ?? "",
          title: assessment.title as string,
          description: (assessment.description as string) ?? "",
          weight: (assessment.weight as string) ?? "",
          duration: (assessment.duration as string) ?? "",
          priority: fromDbPriority((assessment.priority_rating as string | null) ?? null),
          rag: fromDbRag((assessment.rag_status as string | null) ?? null),
          status: (assessment.status as "to_delete" | undefined) ?? undefined,
          learningOutcomeIds: [],
          updatedAt: (assessment.updated_at as string) ?? new Date().toISOString(),
        }),
      );

      setState({
        programmes: [mappedProgramme],
        modules: mappedModules,
        learningOutcomes: mappedLearningOutcomes,
        assessments: mappedAssessments,
      });
      setIsPublicSharedView(true);
      setSharedProgrammeId(programmeId);

      return programmeId;
    } catch {
      return null;
    } finally {
      publicRefreshInFlightRef.current = false;
      setSyncState((current) => (current === "offline" ? current : "idle"));
    }
  }, [isOffline, sharedQueryProgrammeId, sharedToken]);

  useEffect(() => {
    if (!sharedToken || !isSupabaseConfigured()) {
      return;
    }

    if (loadedPublicRef.current === sharedRouteKey) {
      return;
    }

    loadedPublicRef.current = sharedRouteKey;
    const initialLoadTimeout = setTimeout(() => {
      void loadPublicProgrammeSnapshot();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimeout);
    };
  }, [loadPublicProgrammeSnapshot, sharedRouteKey, sharedToken]);

  useEffect(() => {
    if (!sharedToken || !isSupabaseConfigured()) {
      return;
    }

    const initialPollTimeout = setTimeout(() => {
      void loadPublicProgrammeSnapshot();
    }, 0);
    const refreshInterval = setInterval(() => {
      void loadPublicProgrammeSnapshot();
    }, 10000);

    return () => {
      clearTimeout(initialPollTimeout);
      clearInterval(refreshInterval);
    };
  }, [loadPublicProgrammeSnapshot, sharedRouteKey, sharedToken]);

  // ── Persist to IndexedDB whenever state changes ───────────────────────────
  useEffect(() => {
    if (isPublicSharedView) {
      return;
    }

    if (!changeTrackingReadyRef.current) {
      prevStateRef.current = state;
      changeTrackingReadyRef.current = true;
      return;
    }

    if (suppressChangeTrackingRef.current) {
      prevStateRef.current = state;
      suppressChangeTrackingRef.current = false;
      return;
    }

    const prev = prevStateRef.current;
    const nextProgrammeIds = new Set(state.programmes.map((item) => item.id));
    const nextModuleIds = new Set(state.modules.map((item) => item.id));
    const nextLoIds = new Set(state.learningOutcomes.map((item) => item.id));
    const nextAssessmentIds = new Set(state.assessments.map((item) => item.id));

    const changedProgrammeIds = state.programmes
      .filter((record) => {
        const previous = prev.programmes.find((item) => item.id === record.id);
        return !previous || previous.updatedAt !== record.updatedAt;
      })
      .map((record) => record.id);
    const changedModuleIds = state.modules
      .filter((record) => {
        const previous = prev.modules.find((item) => item.id === record.id);
        return !previous || previous.name !== record.name || previous.code !== record.code || previous.description !== record.description || previous.credits !== record.credits || previous.year !== record.year || previous.order !== record.order || previous.aims !== record.aims || previous.scheme !== record.scheme || previous.organiser !== record.organiser || previous.url !== record.url || previous.isCompulsory !== record.isCompulsory;
      })
      .map((record) => record.id);
    const changedLoIds = state.learningOutcomes
      .filter((record) => {
        const previous = prev.learningOutcomes.find((item) => item.id === record.id);
        return !previous || previous.text !== record.text || previous.moduleId !== record.moduleId || previous.competencyId !== record.competencyId || previous.category !== record.category || previous.loNumber !== record.loNumber || previous.status !== record.status;
      })
      .map((record) => record.id);
    const changedAssessmentIds = state.assessments
      .filter((record) => {
        const previous = prev.assessments.find((item) => item.id === record.id);
        return !previous || previous.title !== record.title || previous.description !== record.description || previous.moduleId !== record.moduleId || previous.assessmentCode !== record.assessmentCode || previous.weight !== record.weight || previous.duration !== record.duration || previous.priority !== record.priority || previous.rag !== record.rag || previous.status !== record.status;
      })
      .map((record) => record.id);

    const deletedProgrammeIds = prev.programmes
      .filter((item) => !nextProgrammeIds.has(item.id))
      .map((item) => item.id);
    const deletedModuleIds = prev.modules
      .filter((item) => !nextModuleIds.has(item.id))
      .map((item) => item.id);
    const deletedLoIds = prev.learningOutcomes
      .filter((item) => !nextLoIds.has(item.id))
      .map((item) => item.id);
    const deletedAssessmentIds = prev.assessments
      .filter((item) => !nextAssessmentIds.has(item.id))
      .map((item) => item.id);

    if (changedProgrammeIds.length > 0) {
      setDirtyProgrammes((current) => Array.from(new Set([...current, ...changedProgrammeIds])));
    }
    if (changedModuleIds.length > 0) {
      setDirtyModules((current) => Array.from(new Set([...current, ...changedModuleIds])));
    }
    if (changedLoIds.length > 0) {
      setDirtyLearningOutcomes((current) => Array.from(new Set([...current, ...changedLoIds])));
    }
    if (changedAssessmentIds.length > 0) {
      setDirtyAssessments((current) => Array.from(new Set([...current, ...changedAssessmentIds])));
    }

    if (deletedProgrammeIds.length > 0) {
      setPendingProgrammeDeletes((current) => Array.from(new Set([...current, ...deletedProgrammeIds])));
      setDirtyProgrammes((current) => current.filter((id) => nextProgrammeIds.has(id)));
    }
    if (deletedModuleIds.length > 0) {
      setPendingModuleDeletes((current) => Array.from(new Set([...current, ...deletedModuleIds])));
      setDirtyModules((current) => current.filter((id) => nextModuleIds.has(id)));
    }
    if (deletedLoIds.length > 0) {
      setPendingLearningOutcomeDeletes((current) => Array.from(new Set([...current, ...deletedLoIds])));
      setDirtyLearningOutcomes((current) => current.filter((id) => nextLoIds.has(id)));
    }
    if (deletedAssessmentIds.length > 0) {
      setPendingAssessmentDeletes((current) => Array.from(new Set([...current, ...deletedAssessmentIds])));
      setDirtyAssessments((current) => current.filter((id) => nextAssessmentIds.has(id)));
    }

    prevStateRef.current = state;

    const ts = new Date().toISOString();
    const dirtyProgrammeSet = new Set(dirtyProgrammes);
    const dirtyModuleSet = new Set(dirtyModules);
    const dirtyLoSet = new Set(dirtyLearningOutcomes);
    const dirtyAssessmentSet = new Set(dirtyAssessments);

    saveAllToIdb({
      programmes: state.programmes.map((p) => ({
        ...p,
        syncStatus: dirtyProgrammeSet.has(p.id) ? "pending" : "synced",
        localUpdatedAt: dirtyProgrammeSet.has(p.id) ? ts : p.updatedAt,
      })) as IdbProgramme[],
      modules: state.modules.map((m) => ({
        ...m,
        syncStatus: dirtyModuleSet.has(m.id) ? "pending" : "synced",
        localUpdatedAt: dirtyModuleSet.has(m.id) ? ts : m.updatedAt,
      })) as IdbModule[],
      learningOutcomes: state.learningOutcomes.map((lo) => ({
        ...lo,
        syncStatus: dirtyLoSet.has(lo.id) ? "pending" : "synced",
        localUpdatedAt: dirtyLoSet.has(lo.id) ? ts : lo.updatedAt,
      })) as IdbLearningOutcome[],
      assessments: state.assessments.map((a) => {
        const assessment = a as unknown as IdbAssessment;
        const rag: "Red" | "Amber" | "Green" | null =
          assessment.rag === "Red" || assessment.rag === "Amber" || assessment.rag === "Green"
            ? assessment.rag
            : null;
        return {
          ...assessment,
          rag,
          syncStatus: dirtyAssessmentSet.has(a.id) ? "pending" : "synced",
          localUpdatedAt: dirtyAssessmentSet.has(a.id) ? ts : assessment.updatedAt,
        } as IdbAssessment;
      }) as IdbAssessment[],
    }).catch(() => {});
  }, [
    dirtyAssessments,
    dirtyLearningOutcomes,
    dirtyModules,
    dirtyProgrammes,
    isPublicSharedView,
    state,
  ]);

  // ── Online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const updateStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      setSyncState(offline ? "offline" : "idle");
    };
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // ── Supabase background sync ──────────────────────────────────────────────
  const doSync = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || isOffline || isPublicSharedView) return;

    // Migrate local-only/non-UUID owner programmes (e.g. sample-programme)
    // to UUIDs so they can be persisted to Supabase UUID columns.
    const needsIdMigration = state.programmes.some(
      (programme) =>
        programme.role !== "viewer" &&
        programme.id !== demoProgrammeId &&
        !isUuidLike(programme.id),
    );

    if (needsIdMigration) {
      setState((current) => {
        const idMap = new Map<string, string>();
        current.programmes.forEach((programme) => {
          if (
            programme.role !== "viewer" &&
            programme.id !== demoProgrammeId &&
            !isUuidLike(programme.id)
          ) {
            idMap.set(programme.id, generateId());
          }
        });

        if (idMap.size === 0) {
          return current;
        }

        console.info("Migrating local programme IDs for Supabase sync", Array.from(idMap.entries()));

        return {
          programmes: current.programmes.map((programme) => {
            const nextId = idMap.get(programme.id);
            if (!nextId) {
              return programme;
            }
            return {
              ...programme,
              id: nextId,
              updatedAt: new Date().toISOString(),
            };
          }),
          modules: current.modules.map((moduleRecord) => ({
            ...moduleRecord,
            programmeId: idMap.get(moduleRecord.programmeId) ?? moduleRecord.programmeId,
          })),
          learningOutcomes: current.learningOutcomes.map((learningOutcome) => ({
            ...learningOutcome,
            programmeId: idMap.get(learningOutcome.programmeId) ?? learningOutcome.programmeId,
          })),
          assessments: current.assessments.map((assessment) => ({
            ...assessment,
            programmeId: idMap.get(assessment.programmeId) ?? assessment.programmeId,
          })),
        };
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Supabase sync skipped: unable to resolve authenticated user", userError?.message ?? "No user");
        return;
      }

      const userEmail = user.email?.trim().toLowerCase() ?? "";
      if (userEmail) {
        // Automatically claim any pending invite rows for this signed-in email.
        const { error: claimInviteError } = await supabase
          .from("programme_access")
          .update({
            grantee_id: user.id,
            accepted_at: new Date().toISOString(),
          })
          .is("grantee_id", null)
          .ilike("grantee_email", userEmail);

        if (claimInviteError) {
          console.error("Failed to auto-accept pending shared access invites", {
            code: claimInviteError.code,
            message: claimInviteError.message,
            details: claimInviteError.details,
            hint: claimInviteError.hint,
            email: userEmail,
          });
        }
      }

      // Push pending writes
      const pending = await getPendingRecords();
      const totalPending =
        pending.programmes.length +
        pending.modules.length +
        pending.learningOutcomes.length +
        pending.assessments.length;
      const totalDeletePending =
        pendingProgrammeDeletes.length +
        pendingModuleDeletes.length +
        pendingLearningOutcomeDeletes.length +
        pendingAssessmentDeletes.length;
      setPendingCount(totalPending + totalDeletePending);

      const now = Date.now();
      const shouldPull = totalPending > 0 || totalDeletePending > 0 || now - lastPullAtRef.current >= 30000;
      if (totalPending === 0 && totalDeletePending === 0 && !shouldPull) {
        return;
      }

      setSyncState("syncing");

      const editableProgrammeIds = new Set(
        state.programmes
          .filter((programme) => programme.role !== "viewer" && programme.id !== demoProgrammeId)
          .map((programme) => programme.id),
      );
      const pendingProgrammeIds = new Set(
        pending.programmes
          .filter((programme) => isUuidLike(programme.id))
          .map((programme) => programme.id),
      );
      const syncedProgrammeIds = new Set<string>();
      const syncedModuleIds: string[] = [];
      const syncedLoIds: string[] = [];
      const syncedAssessmentIds: string[] = [];
      const syncedProgrammeIdsForClear: string[] = [];

      // Push programme deletions first so remote rows don't reappear on pull.
      if (pendingProgrammeDeletes.length > 0) {
        const remainingDeletes: string[] = [];
        for (const programmeId of pendingProgrammeDeletes) {
          if (!isUuidLike(programmeId)) {
            continue;
          }

          const { error } = await supabase
            .from("programmes")
            .delete()
            .eq("id", programmeId)
            .eq("owner_id", user.id);

          if (error && error.code !== "PGRST116") {
            remainingDeletes.push(programmeId);
            console.error("Failed deleting programme in Supabase", {
              programmeId,
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
          }
        }
        setPendingProgrammeDeletes(remainingDeletes);
      }

      if (pendingModuleDeletes.length > 0) {
        const remainingDeletes: string[] = [];
        for (const moduleId of pendingModuleDeletes) {
          if (!isUuidLike(moduleId)) continue;
          const { error } = await supabase.from("modules").delete().eq("id", moduleId);
          if (error && error.code !== "PGRST116") {
            remainingDeletes.push(moduleId);
            console.error("Failed deleting module in Supabase", { moduleId, code: error.code, message: error.message });
          }
        }
        setPendingModuleDeletes(remainingDeletes);
      }

      if (pendingLearningOutcomeDeletes.length > 0) {
        const remainingDeletes: string[] = [];
        for (const learningOutcomeId of pendingLearningOutcomeDeletes) {
          if (!isUuidLike(learningOutcomeId)) continue;
          const { error } = await supabase.from("learning_outcomes").delete().eq("id", learningOutcomeId);
          if (error && error.code !== "PGRST116") {
            remainingDeletes.push(learningOutcomeId);
            console.error("Failed deleting learning outcome in Supabase", { learningOutcomeId, code: error.code, message: error.message });
          }
        }
        setPendingLearningOutcomeDeletes(remainingDeletes);
      }

      if (pendingAssessmentDeletes.length > 0) {
        const remainingDeletes: string[] = [];
        for (const assessmentId of pendingAssessmentDeletes) {
          if (!isUuidLike(assessmentId)) continue;
          const { error } = await supabase.from("assessments").delete().eq("id", assessmentId);
          if (error && error.code !== "PGRST116") {
            remainingDeletes.push(assessmentId);
            console.error("Failed deleting assessment in Supabase", { assessmentId, code: error.code, message: error.message });
          }
        }
        setPendingAssessmentDeletes(remainingDeletes);
      }

      // Push programmes
      for (const programme of pending.programmes) {
        if (programme.role === "viewer" || programme.id === demoProgrammeId || !isUuidLike(programme.id)) {
          // Local demo/readonly records are not valid cloud sync targets.
          await markSynced("programmes", programme.id);
          continue;
        }

        const payload = {
          id: programme.id,
          owner_id: user.id,
          name: programme.name,
          description: programme.description,
          years: programme.years,
          ai_agent_url: programme.aiAgentUrl?.trim() ? programme.aiAgentUrl.trim() : null,
          public_access_enabled: programme.publicAccessEnabled ?? false,
          public_access_token: programme.publicAccessToken ?? null,
          updated_at: programme.updatedAt,
        };

        // Update-first avoids noisy 409 conflict responses for already-synced rows.
        const { data: updatedRows, error: updateError } = await supabase
          .from("programmes")
          .update({
            name: payload.name,
            description: payload.description,
            years: payload.years,
            ai_agent_url: payload.ai_agent_url,
            public_access_enabled: payload.public_access_enabled,
            public_access_token: payload.public_access_token,
            updated_at: payload.updated_at,
          })
          .eq("id", programme.id)
          .eq("owner_id", user.id)
          .select("id");

        if (!updateError && (updatedRows?.length ?? 0) > 0) {
          await markSynced("programmes", programme.id);
          syncedProgrammeIds.add(programme.id);
          syncedProgrammeIdsForClear.push(programme.id);
          continue;
        }

        if (updateError) {
          console.error("Failed updating programme before insert fallback", {
            programmeId: programme.id,
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            ownerId: user.id,
          });
          continue;
        }

        const { error: insertError } = await supabase.from("programmes").insert(payload);
        if (!insertError) {
          await markSynced("programmes", programme.id);
          syncedProgrammeIds.add(programme.id);
          syncedProgrammeIdsForClear.push(programme.id);
          continue;
        }

        if (insertError.code === "23505") {
          // Row already exists remotely; treat as synced to stop duplicate insert loops.
          await markSynced("programmes", programme.id);
          syncedProgrammeIds.add(programme.id);
          syncedProgrammeIdsForClear.push(programme.id);
          continue;
        }

        console.error("Failed inserting programme", {
          programmeId: programme.id,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          ownerId: user.id,
        });
      }

      // Push modules
      for (const moduleRecord of pending.modules) {
        if (pendingProgrammeIds.has(moduleRecord.programmeId) && !syncedProgrammeIds.has(moduleRecord.programmeId)) {
          // Parent programme write failed this cycle; skip child push and retry later.
          continue;
        }

        if (!editableProgrammeIds.has(moduleRecord.programmeId) || !isUuidLike(moduleRecord.programmeId)) {
          await markSynced("modules", moduleRecord.id);
          continue;
        }

        const { error } = await supabase.from("modules").upsert({
          id: moduleRecord.id,
          programme_id: moduleRecord.programmeId,
          name: moduleRecord.name,
          code: moduleRecord.code,
          year: moduleRecord.year,
          order: moduleRecord.order,
          credits: moduleRecord.credits,
          description: moduleRecord.description,
          aims: moduleRecord.aims,
          scheme: moduleRecord.scheme,
          organiser: moduleRecord.organiser,
          url: moduleRecord.url,
          is_compulsory: moduleRecord.isCompulsory,
          updated_at: moduleRecord.updatedAt,
        });
        if (!error) {
          await markSynced("modules", moduleRecord.id);
          syncedModuleIds.push(moduleRecord.id);
        } else {
          console.error("Failed syncing module", moduleRecord.id, error.message);
        }
      }

      // Push learning outcomes
      for (const lo of pending.learningOutcomes) {
        if (pendingProgrammeIds.has(lo.programmeId) && !syncedProgrammeIds.has(lo.programmeId)) {
          // Parent programme write failed this cycle; skip child push and retry later.
          continue;
        }

        if (!editableProgrammeIds.has(lo.programmeId) || !isUuidLike(lo.programmeId)) {
          await markSynced("learning_outcomes", lo.id);
          continue;
        }

        const { error } = await supabase.from("learning_outcomes").upsert({
          id: lo.id,
          programme_id: lo.programmeId,
          competency_id: lo.competencyId,
          text: lo.text,
          module_id: lo.moduleId,
          category: lo.category,
          lo_number: lo.loNumber,
          status: lo.status ?? null,
          updated_at: lo.updatedAt,
        });
        if (!error) {
          await markSynced("learning_outcomes", lo.id);
          syncedLoIds.push(lo.id);
        } else {
          console.error("Failed syncing learning outcome", lo.id, error.message);
        }
      }

      // Push assessments
      for (const assessment of pending.assessments) {
        if (pendingProgrammeIds.has(assessment.programmeId) && !syncedProgrammeIds.has(assessment.programmeId)) {
          // Parent programme write failed this cycle; skip child push and retry later.
          continue;
        }

        if (!editableProgrammeIds.has(assessment.programmeId) || !isUuidLike(assessment.programmeId)) {
          await markSynced("assessments", assessment.id);
          continue;
        }

        const { error } = await supabase.from("assessments").upsert({
          id: assessment.id,
          programme_id: assessment.programmeId,
          module_id: assessment.moduleId,
          assessment_code: assessment.assessmentCode,
          title: assessment.title,
          description: assessment.description,
          weight: assessment.weight,
          duration: assessment.duration,
          priority_rating: assessment.priority?.toLowerCase() ?? null,
          rag_status: assessment.rag?.toLowerCase() ?? null,
          status: assessment.status ?? null,
          updated_at: assessment.updatedAt,
        });
        if (!error) {
          await markSynced("assessments", assessment.id);
          syncedAssessmentIds.push(assessment.id);
        } else {
          console.error("Failed syncing assessment", assessment.id, error.message);
        }
      }

      if (syncedProgrammeIdsForClear.length > 0) {
        setDirtyProgrammes((current) => current.filter((id) => !syncedProgrammeIdsForClear.includes(id)));
      }
      if (syncedModuleIds.length > 0) {
        setDirtyModules((current) => current.filter((id) => !syncedModuleIds.includes(id)));
      }
      if (syncedLoIds.length > 0) {
        setDirtyLearningOutcomes((current) => current.filter((id) => !syncedLoIds.includes(id)));
      }
      if (syncedAssessmentIds.length > 0) {
        setDirtyAssessments((current) => current.filter((id) => !syncedAssessmentIds.includes(id)));
      }

      const [accessByIdRes, accessByEmailRes] = await Promise.all([
        supabase
          .from("programme_access")
          .select("programme_id, role")
          .eq("grantee_id", user.id),
        userEmail
          ? supabase
              .from("programme_access")
              .select("programme_id, role")
              .ilike("grantee_email", userEmail)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
      ]);

      if (accessByIdRes.error) {
        console.error("Failed fetching programme_access rows by grantee_id", {
          code: accessByIdRes.error.code,
          message: accessByIdRes.error.message,
          details: accessByIdRes.error.details,
          hint: accessByIdRes.error.hint,
        });
      }
      if (accessByEmailRes.error) {
        console.error("Failed fetching programme_access rows by grantee_email", {
          code: accessByEmailRes.error.code,
          message: accessByEmailRes.error.message,
          details: accessByEmailRes.error.details,
          hint: accessByEmailRes.error.hint,
          email: userEmail,
        });
      }

      const accessRows = [
        ...(accessByIdRes.data ?? []),
        ...(accessByEmailRes.data ?? []),
      ] as Array<Record<string, unknown>>;

      const [programmesRes, modulesRes, learningOutcomesRes, assessmentsRes] =
        initialPullDoneRef.current
          ? await Promise.all([
              supabase
                .from("programmes")
                .select("*")
                .gt("updated_at", pullCursors.programmes ?? "1970-01-01T00:00:00.000Z")
                .order("updated_at", { ascending: true }),
              supabase
                .from("modules")
                .select("*")
                .gt("updated_at", pullCursors.modules ?? "1970-01-01T00:00:00.000Z")
                .order("updated_at", { ascending: true }),
              supabase
                .from("learning_outcomes")
                .select("*")
                .gt("updated_at", pullCursors.learningOutcomes ?? "1970-01-01T00:00:00.000Z")
                .order("updated_at", { ascending: true })
                .order("id", { ascending: true }),
              supabase
                .from("assessments")
                .select("*")
                .gt("updated_at", pullCursors.assessments ?? "1970-01-01T00:00:00.000Z")
                .order("updated_at", { ascending: true }),
            ])
          : await Promise.all([
              supabase.from("programmes").select("*").order("updated_at", { ascending: true }),
              supabase.from("modules").select("*").order("updated_at", { ascending: true }),
              supabase
                .from("learning_outcomes")
                .select("*")
                .order("updated_at", { ascending: true })
                .order("id", { ascending: true }),
              supabase.from("assessments").select("*").order("updated_at", { ascending: true }),
            ]);

      const accessByProgramme = new Map<string, "editor" | "viewer">();
      accessRows.forEach((row) => {
        const role = row.role as string | undefined;
        const programmeId = row.programme_id as string | undefined;
        if (!programmeId || (role !== "editor" && role !== "viewer")) {
          return;
        }

        const existing = accessByProgramme.get(programmeId);
        // Prefer editor when duplicate rows exist via id/email matching.
        if (existing === "editor" || role === "editor") {
          accessByProgramme.set(programmeId, "editor");
        } else {
          accessByProgramme.set(programmeId, "viewer");
        }
      });

      const pulledProgrammeRows = [...(programmesRes.data ?? [])] as Record<string, unknown>[];

      const sharedProgrammeIds = Array.from(accessByProgramme.keys());
      if (sharedProgrammeIds.length > 0) {
        const { data: sharedProgrammes, error: sharedProgrammesError } = await supabase
          .from("programmes")
          .select("*")
          .in("id", sharedProgrammeIds);

        if (sharedProgrammesError) {
          console.error("Failed fetching shared programmes by access IDs", {
            code: sharedProgrammesError.code,
            message: sharedProgrammesError.message,
            details: sharedProgrammesError.details,
            hint: sharedProgrammesError.hint,
            programmeIds: sharedProgrammeIds,
          });
        } else if (sharedProgrammes?.length) {
          const byId = new Map<string, Record<string, unknown>>();
          pulledProgrammeRows.forEach((row) => byId.set(String(row.id), row));
          (sharedProgrammes as Record<string, unknown>[]).forEach((row) => byId.set(String(row.id), row));
          pulledProgrammeRows.length = 0;
          pulledProgrammeRows.push(...byId.values());
        }
      }

      const mappedProgrammes: IdbProgramme[] = pulledProgrammeRows.map((p: Record<string, unknown>) => {
        const role: Programme["role"] =
          (p.owner_id as string | undefined) === user.id
            ? "owner"
            : (accessByProgramme.get(p.id as string) ?? "viewer");

        return {
        id: p.id as string,
        name: p.name as string,
        description: (p.description as string) ?? "",
        years: (p.years as number) ?? 1,
        aiAgentUrl: (p.ai_agent_url as string) ?? "",
        ownerId: (p.owner_id as string | undefined) ?? undefined,
        ownerEmail: (p.owner_email as string) ?? "",
        role,
        publicAccessEnabled: Boolean(p.public_access_enabled),
        publicAccessToken: (p.public_access_token as string | null) ?? null,
        updatedAt: (p.updated_at as string) ?? new Date().toISOString(),
        syncStatus: "synced" as const,
        localUpdatedAt: (p.updated_at as string) ?? new Date().toISOString(),
      }}).filter(
        (programme) =>
          !(pendingProgrammeDeletes.includes(programme.id) && programme.ownerId === user.id),
      );

      const mappedModules: IdbModule[] = (modulesRes.data ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        programmeId: m.programme_id as string,
        year: m.year as number,
        name: m.name as string,
        code: (m.code as string) ?? "",
        credits: (m.credits as string) ?? "",
        description: (m.description as string) ?? "",
        order: (m.order as number) ?? 0,
        aims: (m.aims as string | undefined) ?? undefined,
        scheme: (m.scheme as string | undefined) ?? undefined,
        organiser: (m.organiser as string | undefined) ?? undefined,
        url: (m.url as string | undefined) ?? undefined,
        isCompulsory: (m.is_compulsory as boolean | undefined) ?? undefined,
        updatedAt: (m.updated_at as string) ?? new Date().toISOString(),
        syncStatus: "synced" as const,
        localUpdatedAt: (m.updated_at as string) ?? new Date().toISOString(),
      }));

      const mappedLearningOutcomes: IdbLearningOutcome[] = (learningOutcomesRes.data ?? []).map(
        (lo: Record<string, unknown>) => ({
          id: lo.id as string,
          programmeId: lo.programme_id as string,
          competencyId: (lo.competency_id as string | null) ?? null,
          text: lo.text as string,
          moduleId: (lo.module_id as string | null) ?? null,
          category: (lo.category as string | undefined) ?? undefined,
          loNumber: (lo.lo_number as string | undefined) ?? undefined,
          status: (lo.status as "to_delete" | undefined) ?? undefined,
          updatedAt: (lo.updated_at as string) ?? new Date().toISOString(),
          syncStatus: "synced" as const,
          localUpdatedAt: (lo.updated_at as string) ?? new Date().toISOString(),
        }),
      );

      const mappedAssessments: IdbAssessment[] = (assessmentsRes.data ?? []).map(
        (assessment: Record<string, unknown>) => ({
          id: assessment.id as string,
          programmeId: assessment.programme_id as string,
          moduleId: assessment.module_id as string,
          assessmentCode: (assessment.assessment_code as string) ?? "",
          title: assessment.title as string,
          description: (assessment.description as string) ?? "",
          weight: (assessment.weight as string) ?? "",
          duration: (assessment.duration as string) ?? "",
          priority: fromDbPriority((assessment.priority_rating as string | null) ?? null),
          rag: fromDbRag((assessment.rag_status as string | null) ?? null),
          status: (assessment.status as "to_delete" | undefined) ?? undefined,
          learningOutcomeIds: [],
          updatedAt: (assessment.updated_at as string) ?? new Date().toISOString(),
          syncStatus: "synced" as const,
          localUpdatedAt: (assessment.updated_at as string) ?? new Date().toISOString(),
        }),
      );

      const changed = await mergeFromSupabase({
        programmes: mappedProgrammes,
        modules: mappedModules,
        learningOutcomes: mappedLearningOutcomes,
        assessments: mappedAssessments,
      });
      if (changed) {
        const fresh = await loadAllFromIdb();
        suppressChangeTrackingRef.current = true;
        setState({
          programmes: fresh.programmes.map(idbRecordToState),
          modules: fresh.modules.map(idbRecordToState),
          learningOutcomes: fresh.learningOutcomes.map(idbRecordToState),
          assessments: fresh.assessments.map(idbRecordToState),
        });
      }

      setPullCursors((current) => ({
        programmes:
          mappedProgrammes.length > 0
            ? mappedProgrammes[mappedProgrammes.length - 1].updatedAt
            : current.programmes,
        modules:
          mappedModules.length > 0
            ? mappedModules[mappedModules.length - 1].updatedAt
            : current.modules,
        learningOutcomes:
          mappedLearningOutcomes.length > 0
            ? mappedLearningOutcomes[mappedLearningOutcomes.length - 1].updatedAt
            : current.learningOutcomes,
        assessments:
          mappedAssessments.length > 0
            ? mappedAssessments[mappedAssessments.length - 1].updatedAt
            : current.assessments,
      }));
      initialPullDoneRef.current = true;

      lastPullAtRef.current = now;

      // Recount pending
      const stillPending = await getPendingRecords();
      const remaining =
        stillPending.programmes.length +
        stillPending.modules.length +
        stillPending.learningOutcomes.length +
        stillPending.assessments.length;
      setPendingCount(
        remaining +
          pendingProgrammeDeletes.length +
          pendingModuleDeletes.length +
          pendingLearningOutcomeDeletes.length +
          pendingAssessmentDeletes.length,
      );
      setSyncState("idle");
    } catch (error) {
      console.error("Supabase sync failed", error);
      setSyncState(isOffline ? "offline" : "idle");
    }
  }, [
    isOffline,
    isPublicSharedView,
    pendingAssessmentDeletes,
    pendingLearningOutcomeDeletes,
    pendingModuleDeletes,
    pendingProgrammeDeletes,
    pullCursors.assessments,
    pullCursors.learningOutcomes,
    pullCursors.modules,
    pullCursors.programmes,
    state.programmes,
  ]);

  useEffect(() => {
    const initTimeout = setTimeout(() => {
      void doSync();
    }, 0);
    syncIntervalRef.current = setInterval(doSync, 15000);
    return () => {
      clearTimeout(initTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [doSync]);

  const canEditProgrammeInState = useCallback(
    (current: AppDataState, programmeId: string) => {
      if (isPublicSharedView && sharedProgrammeId === programmeId) {
        return false;
      }

      const programme = current.programmes.find((record) => record.id === programmeId);
      return Boolean(programme && programme.role !== "viewer");
    },
    [isPublicSharedView, sharedProgrammeId],
  );

  const setProgrammePublicAccess = useCallback((programmeId: string, enabled: boolean) => {
    setState((current) => {
      if (!canEditProgrammeInState(current, programmeId)) {
        return current;
      }

      if (programmeId === demoProgrammeId || !isUuidLike(programmeId)) {
        return current;
      }

      return {
        ...current,
        programmes: current.programmes.map((programme) => {
          if (programme.id !== programmeId) {
            return programme;
          }

          const token = enabled
            ? programme.publicAccessToken ?? generateId()
            : null;

          return {
            ...programme,
            publicAccessEnabled: enabled,
            publicAccessToken: token,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });
  }, [canEditProgrammeInState]);

  const getProgrammeShareUrl = useCallback(
    (programmeId: string) => {
      const programme = state.programmes.find((record) => record.id === programmeId);
      if (
        !programme ||
        programme.id === demoProgrammeId ||
        !isUuidLike(programme.id) ||
        !programme.publicAccessEnabled ||
        !programme.publicAccessToken
      ) {
        return null;
      }

      if (typeof window === "undefined") {
        return null;
      }

      const url = new URL(window.location.origin + "/share/" + encodeURIComponent(programme.publicAccessToken));
      return url.toString();
    },
    [state.programmes],
  );

  const createProgramme = useCallback(
    (input: { name: string; description: string; years: number }) => {
      const programmeId = generateId();
      const record: Programme = {
        id: programmeId,
        name: input.name,
        description: input.description,
        years: input.years,
        aiAgentUrl: "",
        ownerEmail: "owner@example.edu",
        role: "owner",
        publicAccessEnabled: false,
        publicAccessToken: null,
        updatedAt: new Date().toISOString(),
      };

      setState((current) => ({ ...current, programmes: [record, ...current.programmes] }));
      return programmeId;
    },
    [],
  );

  const updateProgramme = useCallback(
    (programmeId: string, patch: Partial<Pick<Programme, "name" | "description" | "years" | "aiAgentUrl">>) => {
      setState((current) => ({
        ...current,
        programmes: canEditProgrammeInState(current, programmeId)
          ? current.programmes.map((programme) =>
              programme.id === programmeId
                ? { ...programme, ...patch, updatedAt: new Date().toISOString() }
                : programme,
            )
          : current.programmes,
      }));
    },
    [canEditProgrammeInState],
  );

  const renameProgramme = useCallback((programmeId: string, name: string) => {
    setState((current) => ({
      ...current,
      programmes: canEditProgrammeInState(current, programmeId)
        ? current.programmes.map((programme) =>
            programme.id === programmeId ? { ...programme, name, updatedAt: new Date().toISOString() } : programme,
          )
        : current.programmes,
    }));
  }, [canEditProgrammeInState]);

  const updateProgrammeYears = useCallback((programmeId: string, years: number) => {
    setState((current) => {
      if (!canEditProgrammeInState(current, programmeId)) {
        return current;
      }

      const programmes = current.programmes.map((programme) =>
        programme.id === programmeId ? { ...programme, years, updatedAt: new Date().toISOString() } : programme,
      );

      const modules = current.modules.filter(
        (module) => module.programmeId !== programmeId || module.year <= years,
      );

      const remainingModuleIds = new Set(modules.map((module) => module.id));
      const learningOutcomes = current.learningOutcomes.map((learningOutcome) =>
        learningOutcome.moduleId && !remainingModuleIds.has(learningOutcome.moduleId)
          ? { ...learningOutcome, moduleId: null }
          : learningOutcome,
      );
      const assessments = current.assessments.filter((assessment) =>
        remainingModuleIds.has(assessment.moduleId),
      );

      return { programmes, modules, learningOutcomes, assessments };
    });
  }, [canEditProgrammeInState]);

  const deleteProgramme = useCallback((programmeId: string) => {
    setState((current) => {
      if (!canEditProgrammeInState(current, programmeId)) {
        return current;
      }

      return {
        programmes: current.programmes.filter((programme) => programme.id !== programmeId),
        modules: current.modules.filter((module) => module.programmeId !== programmeId),
        learningOutcomes: current.learningOutcomes.filter(
          (learningOutcome) => learningOutcome.programmeId !== programmeId,
        ),
        assessments: current.assessments.filter((assessment) => assessment.programmeId !== programmeId),
      };
    });

    setPendingProgrammeDeletes((current) =>
      current.includes(programmeId) ? current : [...current, programmeId],
    );
  }, [canEditProgrammeInState]);

  const getModuleDeletionImpact = useCallback(
    (moduleId: string) => getModuleDeletionImpactFromState(state, moduleId),
    [state],
  );

  const clearModulesForYear = useCallback((programmeId: string, year: number) => {
    let result: BulkModuleDeletionResult = {
      deletedCount: 0,
      skippedCount: 0,
      skippedModules: [],
    };

    setState((current) => {
      if (!canEditProgrammeInState(current, programmeId)) {
        return current;
      }

      const moduleIds = current.modules
        .filter((module) => module.programmeId === programmeId && module.year === year)
        .map((module) => module.id);
      const deletion = deleteModulesFromState(current, moduleIds);
      result = deletion.result;
      return deletion.nextState;
    });

    return result;
  }, [canEditProgrammeInState]);

  const resetProgrammeModules = useCallback((programmeId: string) => {
    let result: BulkModuleDeletionResult = {
      deletedCount: 0,
      skippedCount: 0,
      skippedModules: [],
    };

    setState((current) => {
      if (!canEditProgrammeInState(current, programmeId)) {
        return current;
      }

      const moduleIds = current.modules
        .filter((module) => module.programmeId === programmeId)
        .map((module) => module.id);
      const deletion = deleteModulesFromState(current, moduleIds);
      result = deletion.result;
      return deletion.nextState;
    });

    return result;
  }, [canEditProgrammeInState]);

  const addModule = useCallback(
    (programmeId: string, input: { year: number; name: string; code?: string }) => {
      const moduleId = generateId();
      setState((current) => {
        if (!canEditProgrammeInState(current, programmeId)) {
          return current;
        }

        const siblings = current.modules.filter(
          (module) => module.programmeId === programmeId && module.year === input.year,
        );

        return {
          ...current,
          programmes: touchProgramme(current.programmes, programmeId),
          modules: [
            ...current.modules,
            {
              id: moduleId,
              programmeId,
              year: input.year,
              name: input.name,
              code: input.code?.trim() ?? "",
              credits: "",
              description: "",
              order: siblings.length,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });
      return moduleId;
    },
    [canEditProgrammeInState],
  );

  const updateModule = useCallback(
    (moduleId: string, patch: Partial<Pick<Module, "name" | "code" | "credits" | "description" | "year" | "aims" | "scheme" | "organiser" | "url" | "isCompulsory">>) => {
      setState((current) => {
        const target = current.modules.find((module) => module.id === moduleId);
        if (!target || !canEditProgrammeInState(current, target.programmeId)) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, target.programmeId),
          modules: current.modules.map((module) =>
            module.id === moduleId ? { ...module, ...patch, updatedAt: new Date().toISOString() } : module,
          ),
        };
      });
    },
    [canEditProgrammeInState],
  );

  const deleteModule = useCallback((moduleId: string) => {
    let impact: ModuleDeletionImpact | null = null;

    setState((current) => {
      impact = getModuleDeletionImpactFromState(current, moduleId);
      if (!impact?.canDelete || !canEditProgrammeInState(current, impact.programmeId)) {
        return current;
      }

      return deleteModulesFromState(current, [moduleId]).nextState;
    });

    return impact;
  }, [canEditProgrammeInState]);

  const addLearningOutcome = useCallback(
    (
      programmeId: string,
      input: { competencyId: string | null; text: string; category?: string; loNumber?: string },
    ) => {
      const learningOutcomeId = generateId();
      setState((current) => {
        if (!canEditProgrammeInState(current, programmeId)) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, programmeId),
          learningOutcomes: [
            ...current.learningOutcomes,
            {
              id: learningOutcomeId,
              programmeId,
              competencyId: input.competencyId,
              text: input.text,
              moduleId: null,
              category: input.category,
              loNumber: input.loNumber,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });

      return learningOutcomeId;
    },
    [canEditProgrammeInState],
  );

  const updateLearningOutcome = useCallback(
    (
      learningOutcomeId: string,
      patch: Partial<Pick<LearningOutcome, "text" | "competencyId" | "moduleId" | "category" | "loNumber" | "status">>,
    ) => {
      setState((current) => {
        const target = current.learningOutcomes.find((learningOutcome) => learningOutcome.id === learningOutcomeId);
        if (!target || !canEditProgrammeInState(current, target.programmeId)) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, target.programmeId),
          learningOutcomes: current.learningOutcomes.map((learningOutcome) =>
            learningOutcome.id === learningOutcomeId
              ? { ...learningOutcome, ...patch, updatedAt: new Date().toISOString() }
              : learningOutcome,
          ),
        };
      });
    },
    [canEditProgrammeInState],
  );

  const deleteLearningOutcome = useCallback((learningOutcomeId: string) => {
    setState((current) => {
      const target = current.learningOutcomes.find((learningOutcome) => learningOutcome.id === learningOutcomeId);
      if (!target || !canEditProgrammeInState(current, target.programmeId)) {
        return current;
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, target.programmeId),
        learningOutcomes: current.learningOutcomes.filter(
          (learningOutcome) => learningOutcome.id !== learningOutcomeId,
        ),
        assessments: current.assessments.map((assessment) => ({
          ...assessment,
          learningOutcomeIds: assessment.learningOutcomeIds.filter((id) => id !== learningOutcomeId),
        })),
      };
    });
  }, [canEditProgrammeInState]);

  const addAssessment = useCallback(
    (
      programmeId: string,
      input: {
        moduleId: string;
        assessmentCode?: string;
        title: string;
        weight?: string;
        duration?: string;
        rag: RagStatus;
        priority?: PriorityRating | null;
      },
    ) => {
      const assessmentId = generateId();
      setState((current) => {
        if (!canEditProgrammeInState(current, programmeId)) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, programmeId),
          assessments: [
            ...current.assessments,
            {
              id: assessmentId,
              programmeId,
              moduleId: input.moduleId,
              assessmentCode: input.assessmentCode ?? "",
              title: input.title,
              description: "",
              weight: input.weight ?? "",
              duration: input.duration ?? "",
              priority: input.priority ?? null,
              rag: input.rag,
              learningOutcomeIds: current.learningOutcomes
                .filter((learningOutcome) => learningOutcome.moduleId === input.moduleId)
                .map((learningOutcome) => learningOutcome.id),
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });
      return assessmentId;
    },
    [canEditProgrammeInState],
  );

  const updateAssessment = useCallback(
    (
      assessmentId: string,
      patch: Partial<
        Pick<
          Assessment,
          "assessmentCode" | "title" | "description" | "weight" | "duration" | "priority" | "rag" | "status" | "learningOutcomeIds" | "moduleId"
        >
      >,
    ) => {
      setState((current) => {
        const target = current.assessments.find((assessment) => assessment.id === assessmentId);
        if (!target || !canEditProgrammeInState(current, target.programmeId)) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, target.programmeId),
          assessments: current.assessments.map((assessment) =>
            assessment.id === assessmentId
              ? { ...assessment, ...patch, updatedAt: new Date().toISOString() }
              : assessment,
          ),
        };
      });
    },
    [canEditProgrammeInState],
  );

  const deleteAssessment = useCallback((assessmentId: string) => {
    setState((current) => {
      const target = current.assessments.find((assessment) => assessment.id === assessmentId);
      if (!target || !canEditProgrammeInState(current, target.programmeId)) {
        return current;
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, target.programmeId),
        assessments: current.assessments.filter((assessment) => assessment.id !== assessmentId),
      };
    });
  }, [canEditProgrammeInState]);

  const importCsvModules = useCallback((programmeId: string, rows: CsvModuleImportRow[]) => {
    setState((current) => {
      if (!canEditProgrammeInState(current, programmeId)) {
        return current;
      }

      const existingModules = current.modules.filter((m) => m.programmeId === programmeId);
      let modules = [...current.modules];
      let learningOutcomes = [...current.learningOutcomes];
      let assessments = [...current.assessments];

      for (const row of rows) {
        const existingModule = row.code
          ? existingModules.find((m) => m.code === row.code)
          : undefined;

        let moduleId: string;
        if (existingModule) {
          moduleId = existingModule.id;
          // Upsert: update module fields
          modules = modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  name: row.name,
                  year: row.year,
                  isCompulsory: row.isCompulsory,
                  credits: row.credits,
                  scheme: row.scheme,
                  organiser: row.organiser,
                  aims: row.aims,
                  url: row.url,
                  updatedAt: new Date().toISOString(),
                }
              : m,
          );
          // Remove previous imported LOs (competencyId null + category set)
          learningOutcomes = learningOutcomes.filter(
            (lo) => !(lo.moduleId === moduleId && lo.competencyId === null && lo.category),
          );
          // Remove previous unrated imported assessments
          assessments = assessments.filter(
            (a) => !(a.moduleId === moduleId && a.rag === null && a.priority === null),
          );
        } else {
          moduleId = generateId();
          const siblingsInYear = modules.filter(
            (m) => m.programmeId === programmeId && m.year === row.year,
          );
          modules.push({
            id: moduleId,
            programmeId,
            year: row.year,
            name: row.name,
            code: row.code,
            credits: row.credits,
            description: "",
            order: siblingsInYear.length,
            isCompulsory: row.isCompulsory,
            scheme: row.scheme,
            organiser: row.organiser,
            aims: row.aims,
            url: row.url,
            updatedAt: new Date().toISOString(),
          });
        }

        // Insert new imported LOs
        for (const lo of row.learningOutcomes) {
          learningOutcomes.push({
            id: generateId(),
            programmeId,
            competencyId: null,
            text: lo.text,
            moduleId,
            category: lo.category,
            loNumber: lo.loNumber,
            updatedAt: new Date().toISOString(),
          });
        }

        // Insert new imported assessments
        const moduleLoIds = learningOutcomes
          .filter((lo) => lo.moduleId === moduleId)
          .map((lo) => lo.id);
        for (const a of row.assessments) {
          assessments.push({
            id: generateId(),
            programmeId,
            moduleId,
            assessmentCode: a.assessmentCode,
            title: a.title,
            description: "",
            weight: a.weight,
            duration: a.duration,
            priority: null,
            rag: null,
            learningOutcomeIds: moduleLoIds,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return {
        ...current,
        programmes: touchProgramme(current.programmes, programmeId),
        modules,
        learningOutcomes,
        assessments,
      };
    });
  }, [canEditProgrammeInState]);

  const importProgrammeLearningOutcomes = useCallback(
    (programmeId: string, rows: CsvProgrammeLearningOutcomeImportRow[]) => {
      setState((current) => {
        if (!canEditProgrammeInState(current, programmeId)) {
          return current;
        }

        return {
          ...current,
          programmes: touchProgramme(current.programmes, programmeId),
          learningOutcomes: [
            ...current.learningOutcomes,
            ...rows.map((row) => ({
              id: generateId(),
              programmeId,
              competencyId: null,
              text: row.text,
              moduleId: null,
              category: row.category,
              loNumber: row.loNumber,
              updatedAt: new Date().toISOString(),
            })),
          ],
        };
      });
    },
    [canEditProgrammeInState],
  );

  const exportProgrammeBackup = useCallback(
    (programmeId: string) => {
      const programme = state.programmes.find((record) => record.id === programmeId);
      if (!programme) {
        return null;
      }

      return {
        programme,
        modules: state.modules.filter((module) => module.programmeId === programmeId),
        learningOutcomes: state.learningOutcomes.filter(
          (learningOutcome) => learningOutcome.programmeId === programmeId,
        ),
        assessments: state.assessments.filter((assessment) => assessment.programmeId === programmeId),
      };
    },
    [state],
  );

  const importProgrammeBackup = useCallback((payload: BackupPayload) => {
    if (isPublicSharedView) {
      return "";
    }

    const programmeId = generateId();
    const moduleIdMap = new Map<string, string>();
    const learningOutcomeIdMap = new Map<string, string>();

    const programmes: Programme[] = [
      {
        ...payload.programme,
        id: programmeId,
        role: "owner",
        ownerEmail: "owner@example.edu",
        publicAccessEnabled: false,
        publicAccessToken: null,
        name: `${payload.programme.name} (Imported)`,
        updatedAt: new Date().toISOString(),
      },
    ];

    const modules = payload.modules.map((module) => {
      const id = generateId();
      moduleIdMap.set(module.id, id);
      return { ...module, id, programmeId };
    });

    const learningOutcomes = payload.learningOutcomes.map((learningOutcome) => {
      const id = generateId();
      learningOutcomeIdMap.set(learningOutcome.id, id);
      return {
        ...learningOutcome,
        id,
        programmeId,
        moduleId: learningOutcome.moduleId ? moduleIdMap.get(learningOutcome.moduleId) ?? null : null,
      };
    });

    const assessments = payload.assessments
      .map((assessment) => ({
        ...assessment,
        id: generateId(),
        programmeId,
        moduleId: moduleIdMap.get(assessment.moduleId) ?? "",
        learningOutcomeIds: assessment.learningOutcomeIds
          .map((id) => learningOutcomeIdMap.get(id))
          .filter((id): id is string => Boolean(id)),
      }))
      .filter((assessment) => Boolean(assessment.moduleId));

    setState((current) => ({
      programmes: [...programmes, ...current.programmes],
      modules: [...modules, ...current.modules],
      learningOutcomes: [...learningOutcomes, ...current.learningOutcomes],
      assessments: [...assessments, ...current.assessments],
    }));

    return programmeId;
  }, [isPublicSharedView]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      state,
      isOffline,
      syncState,
      pendingCount,
      isPublicSharedView,
      sharedProgrammeId,
      isViewOnly,
      createProgramme,
      updateProgramme,
      setProgrammePublicAccess,
      getProgrammeShareUrl,
      renameProgramme,
      updateProgrammeYears,
      deleteProgramme,
      getModuleDeletionImpact,
      clearModulesForYear,
      resetProgrammeModules,
      addModule,
      updateModule,
      deleteModule,
      addLearningOutcome,
      updateLearningOutcome,
      deleteLearningOutcome,
      addAssessment,
      updateAssessment,
      deleteAssessment,
      exportProgrammeBackup,
      importProgrammeBackup,
      importCsvModules,
      importProgrammeLearningOutcomes,
    }),
    [
      state,
      isOffline,
      syncState,
      pendingCount,
      isPublicSharedView,
      sharedProgrammeId,
      isViewOnly,
      createProgramme,
      updateProgramme,
      setProgrammePublicAccess,
      getProgrammeShareUrl,
      renameProgramme,
      updateProgrammeYears,
      deleteProgramme,
      getModuleDeletionImpact,
      clearModulesForYear,
      resetProgrammeModules,
      addModule,
      updateModule,
      deleteModule,
      addLearningOutcome,
      updateLearningOutcome,
      deleteLearningOutcome,
      addAssessment,
      updateAssessment,
      deleteAssessment,
      exportProgrammeBackup,
      importProgrammeBackup,
      importCsvModules,
      importProgrammeLearningOutcomes,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}

export type {
  Programme,
  Module,
  LearningOutcome,
  Assessment,
  BackupPayload,
  CsvModuleImportRow,
  CsvProgrammeLearningOutcomeImportRow,
  ModuleDeletionImpact,
  BulkModuleDeletionResult,
};
