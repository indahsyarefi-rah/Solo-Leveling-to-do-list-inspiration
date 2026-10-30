'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createState, validateState, type AppState } from './engine';
import {
  CloudConflictError,
  cloudAvailable,
  getCloudClient,
  loadCloudState,
  saveCloudState,
  signInWithGoogle,
  signOut,
} from './cloud';

export type SyncStatus =
  'device' | 'sign-in' | 'loading' | 'synced' | 'saving' | 'offline' | 'conflict' | 'error';

type JourneyUser = { id: string; email?: string };
type Cache = { state: AppState; revision: number | null; dirty: boolean; savedAt: string };

const cacheKey = (owner: string) => `iris:journey:v1:${owner}`;
const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Sinkronisasi gagal. Perubahanmu tetap disimpan di perangkat bila memungkinkan.';
};
const offline = () => typeof navigator !== 'undefined' && !navigator.onLine;

function readCache(owner: string): {
  cache: Cache | null;
  error: string | null;
  blocked?: boolean;
} {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(cacheKey(owner));
    if (!raw) return { cache: null, error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('cache');
    const value = parsed as Partial<Cache>;
    const state = validateState(value.state);
    if (
      !state ||
      typeof value.dirty !== 'boolean' ||
      !(value.revision === null || (Number.isSafeInteger(value.revision) && value.revision! >= 1))
    ) {
      throw new Error('cache');
    }
    return {
      cache: {
        state,
        revision: value.revision!,
        dirty: value.dirty,
        savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
      },
      error: null,
    };
  } catch {
    if (raw !== null) {
      try {
        localStorage.setItem(`${cacheKey(owner)}:invalid:${Date.now()}`, raw);
        return {
          cache: null,
          error: 'Data perangkat tidak valid. Salinan asli disimpan sebagai cadangan di browser.',
        };
      } catch {
        return {
          cache: null,
          blocked: true,
          error:
            'Data perangkat tidak valid dan cadangan gagal dibuat. Salinan asli dipertahankan; penyimpanan lokal dihentikan sementara.',
        };
      }
    }
    return {
      cache: null,
      error:
        'Data perangkat tidak dapat dibaca. Salinan yang lama tidak dihapus; periksa penyimpanan browser.',
    };
  }
}

export function useJourney() {
  const [state, setState] = useState<AppState>(createState);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<JourneyUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudAvailable ? 'loading' : 'device');
  const [syncError, setSyncError] = useState<string | null>(null);

  const stateRef = useRef(state);
  const ownerRef = useRef('device');
  const userRef = useRef<JourneyUser | null>(null);
  const revisionRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const editsRef = useRef(0);
  const epochRef = useRef(0);
  const aliveRef = useRef(false);
  const readyRef = useRef(false);
  const initializedRef = useRef(false);
  const cloudReadyRef = useRef(false);
  const conflictRef = useRef(false);
  const savingRef = useRef(false);
  const loadingRef = useRef(false);
  const storageErrorRef = useRef<string | null>(null);
  const storageBlockedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
  }, []);

  const persist = useCallback((): boolean => {
    if (storageBlockedRef.current) return false;
    try {
      const cache: Cache = {
        state: stateRef.current,
        revision: revisionRef.current,
        dirty: dirtyRef.current,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(cacheKey(ownerRef.current), JSON.stringify(cache));
      storageErrorRef.current = null;
      return true;
    } catch {
      const message =
        'Penyimpanan perangkat penuh atau tidak tersedia. Unduh cadangan agar perubahanmu aman.';
      storageErrorRef.current = message;
      if (aliveRef.current) setSyncError(message);
      return false;
    }
  }, []);

  const replaceState = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const flush = useCallback(
    async function flushPending(): Promise<void> {
      if (
        !aliveRef.current ||
        !userRef.current ||
        !cloudReadyRef.current ||
        conflictRef.current ||
        !dirtyRef.current ||
        savingRef.current ||
        loadingRef.current
      )
        return;
      if (offline()) {
        cloudReadyRef.current = false;
        setSyncStatus('offline');
        setSyncError('Koneksi terputus. Perubahan menunggu sinkronisasi.');
        return;
      }

      const epoch = epochRef.current;
      const userId = userRef.current.id;
      const edits = editsRef.current;
      const snapshot = structuredClone(stateRef.current);
      const expectedRevision = revisionRef.current;
      savingRef.current = true;
      setSyncStatus('saving');
      try {
        const revision = await saveCloudState(snapshot, expectedRevision, userId);
        if (!aliveRef.current || epoch !== epochRef.current) return;
        revisionRef.current = revision;
        // Edits made while the snapshot was in flight belong to the next save.
        dirtyRef.current = editsRef.current !== edits;
        persist();
        setSyncStatus(dirtyRef.current ? 'saving' : 'synced');
        setSyncError(storageErrorRef.current);
      } catch (error) {
        if (!aliveRef.current || epoch !== epochRef.current) return;
        cloudReadyRef.current = false;
        if (error instanceof CloudConflictError) {
          conflictRef.current = true;
          setSyncStatus('conflict');
        } else {
          setSyncStatus(offline() ? 'offline' : 'error');
        }
        setSyncError(errorMessage(error));
        persist();
      } finally {
        if (aliveRef.current && epoch === epochRef.current) {
          savingRef.current = false;
          if (dirtyRef.current && cloudReadyRef.current && !conflictRef.current) {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => void flushPending(), 600);
          }
        }
      }
    },
    [persist],
  );

  const readRemote = useCallback(
    async (showLoading = true): Promise<void> => {
      if (!aliveRef.current || !userRef.current || savingRef.current || loadingRef.current) return;
      if (conflictRef.current) {
        setSyncStatus('conflict');
        return;
      }
      const epoch = epochRef.current;
      const userId = userRef.current.id;
      loadingRef.current = true;
      cloudReadyRef.current = false;
      cancelSave();
      if (showLoading) setSyncStatus('loading');
      try {
        const remote = await loadCloudState(userId);
        if (!aliveRef.current || epoch !== epochRef.current) return;
        const remoteState = remote ? validateState(remote.data) : null;
        if (remote && !remoteState)
          throw new Error('Data cloud tidak valid. Data perangkat tidak ditimpa.');

        if (dirtyRef.current && revisionRef.current !== (remote?.revision ?? null)) {
          conflictRef.current = true;
          setSyncStatus('conflict');
          setSyncError(
            'Ada perubahan dari perangkat lain. Unduh cadangan lalu tinjau data cloud terbaru.',
          );
          return;
        }
        if (!dirtyRef.current) {
          if (remote && remoteState) {
            replaceState(remoteState);
            revisionRef.current = remote.revision;
          } else if (revisionRef.current !== null) {
            conflictRef.current = true;
            setSyncStatus('conflict');
            setSyncError(
              'Snapshot cloud tidak ditemukan. Tinjau sebelum mengganti data perangkat.',
            );
            return;
          }
        }
        cloudReadyRef.current = true;
        persist();
        setSyncStatus(dirtyRef.current ? 'saving' : 'synced');
        setSyncError(storageErrorRef.current);
      } catch (error) {
        if (!aliveRef.current || epoch !== epochRef.current) return;
        setSyncStatus(offline() ? 'offline' : 'error');
        setSyncError(errorMessage(error));
      } finally {
        if (aliveRef.current && epoch === epochRef.current) {
          loadingRef.current = false;
          if (cloudReadyRef.current && dirtyRef.current && !conflictRef.current) void flush();
        }
      }
    },
    [cancelSave, flush, persist, replaceState],
  );

  const selectOwner = useCallback(
    async (nextUser: JourneyUser | null): Promise<void> => {
      if (!aliveRef.current) return;
      const owner = nextUser ? `user:${nextUser.id}` : 'device';
      userRef.current = nextUser;
      setUser(nextUser);
      if (initializedRef.current && ownerRef.current === owner) return;

      cancelSave();
      epochRef.current += 1;
      ownerRef.current = owner;
      initializedRef.current = true;
      cloudReadyRef.current = false;
      conflictRef.current = false;
      savingRef.current = false;
      loadingRef.current = false;
      editsRef.current = 0;
      const { cache, error, blocked } = readCache(owner);
      storageBlockedRef.current = blocked ?? false;
      storageErrorRef.current = error;
      revisionRef.current = cache?.revision ?? null;
      dirtyRef.current = cache?.dirty ?? false;
      replaceState(cache?.state ?? createState());
      readyRef.current = true;
      setReady(true);
      setSyncError(error);
      if (!nextUser) {
        setSyncStatus(cloudAvailable ? 'sign-in' : 'device');
      } else {
        setSyncStatus('loading');
        await readRemote();
      }
    },
    [cancelSave, readRemote, replaceState],
  );

  const update = useCallback(
    (recipe: (draft: AppState) => void): void => {
      if (!readyRef.current) return;
      try {
        const draft = structuredClone(stateRef.current);
        recipe(draft);
        const next = validateState(draft);
        if (!next) throw new Error('Perubahan tidak valid. Data sebelumnya tetap dipakai.');
        if (JSON.stringify(next) === JSON.stringify(stateRef.current)) return;
        editsRef.current += 1;
        dirtyRef.current = true;
        replaceState(next);
        persist();
        if (userRef.current && !conflictRef.current) {
          if (cloudReadyRef.current) {
            setSyncStatus(offline() ? 'offline' : 'saving');
            cancelSave();
            saveTimer.current = setTimeout(() => void flush(), 650);
          } else if (loadingRef.current) {
            setSyncStatus('loading');
          }
        }
      } catch (error) {
        setSyncError(errorMessage(error));
      }
    },
    [cancelSave, flush, persist, replaceState],
  );

  const resolveConflict = useCallback(async (): Promise<void> => {
    if (!userRef.current || loadingRef.current || savingRef.current) return;
    const epoch = epochRef.current;
    const userId = userRef.current.id;
    const edits = editsRef.current;
    loadingRef.current = true;
    cloudReadyRef.current = false;
    cancelSave();
    setSyncStatus('loading');
    try {
      const remote = await loadCloudState(userId);
      if (!aliveRef.current || epoch !== epochRef.current) return;
      const next = remote ? validateState(remote.data) : createState();
      if (!next) throw new Error('Data cloud tidak valid. Data perangkat tetap dipertahankan.');
      if (editsRef.current !== edits) {
        throw new Error(
          'Ada perubahan baru selama peninjauan. Unduh cadangan terbaru dan ulangi peninjauan.',
        );
      }
      // Preserve the old snapshot before the caller-confirmed replacement.
      const backup: Cache = {
        state: stateRef.current,
        revision: revisionRef.current,
        dirty: dirtyRef.current,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(
          `${cacheKey(ownerRef.current)}:backup:${Date.now()}`,
          JSON.stringify(backup),
        );
      } catch {
        throw new Error(
          'Cadangan perangkat tidak dapat dibuat. Unduh cadangan dan kosongkan ruang browser sebelum meninjau lagi.',
        );
      }
      revisionRef.current = remote?.revision ?? null;
      dirtyRef.current = false;
      conflictRef.current = false;
      cloudReadyRef.current = true;
      replaceState(next);
      persist();
      setSyncStatus('synced');
      setSyncError(storageErrorRef.current);
    } catch (error) {
      if (!aliveRef.current || epoch !== epochRef.current) return;
      conflictRef.current = true;
      setSyncStatus('conflict');
      setSyncError(errorMessage(error));
      throw new Error(errorMessage(error));
    } finally {
      if (aliveRef.current && epoch === epochRef.current) loadingRef.current = false;
    }
  }, [cancelSave, persist, replaceState]);

  const retrySync = useCallback(async () => {
    await readRemote();
  }, [readRemote]);
  const login = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setSyncError(errorMessage(error));
      setSyncStatus(cloudAvailable ? 'sign-in' : 'device');
      throw new Error(errorMessage(error));
    }
  }, []);
  const logout = useCallback(async () => {
    try {
      persist();
      await signOut();
      await selectOwner(null);
    } catch (error) {
      setSyncError(errorMessage(error));
      throw new Error(errorMessage(error));
    }
  }, [persist, selectOwner]);

  useEffect(() => {
    aliveRef.current = true;
    initializedRef.current = false;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let authVersion = 0;
    try {
      const client = getCloudClient();
      if (!client) {
        void selectOwner(null);
      } else {
        const { data } = client.auth.onAuthStateChange((_event, session) => {
          authVersion += 1;
          const nextUser = session ? { id: session.user.id, email: session.user.email } : null;
          // Do not await Supabase calls inside the auth lock's callback.
          queueMicrotask(() => {
            if (!disposed) void selectOwner(nextUser);
          });
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const requestedVersion = authVersion;
        void client.auth
          .getSession()
          .then(({ data: sessionData, error }) => {
            if (disposed || authVersion !== requestedVersion) return;
            if (error) {
              void selectOwner(null);
              setSyncError(errorMessage(error));
            } else {
              const session = sessionData.session;
              void selectOwner(session ? { id: session.user.id, email: session.user.email } : null);
            }
          })
          .catch((error: unknown) => {
            if (disposed) return;
            void selectOwner(null);
            setSyncError(errorMessage(error));
          });
      }
    } catch (error) {
      void selectOwner(null);
      setSyncError(errorMessage(error));
    }

    const onOnline = () => {
      if (userRef.current && !conflictRef.current) void readRemote(false);
    };
    const onOffline = () => {
      if (userRef.current) {
        cloudReadyRef.current = false;
        setSyncStatus('offline');
        setSyncError('Koneksi terputus. Perubahan menunggu sinkronisasi.');
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const poll = setInterval(() => {
      if (
        userRef.current &&
        cloudReadyRef.current &&
        !dirtyRef.current &&
        !savingRef.current &&
        !loadingRef.current &&
        !conflictRef.current &&
        !offline()
      )
        void readRemote(false);
    }, 20_000);
    return () => {
      disposed = true;
      aliveRef.current = false;
      readyRef.current = false;
      epochRef.current += 1;
      cancelSave();
      unsubscribe?.();
      clearInterval(poll);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [cancelSave, readRemote, selectOwner]);

  return {
    state,
    ready,
    update,
    user,
    syncStatus,
    syncError,
    resolveConflict,
    retrySync,
    login,
    logout,
  };
}
