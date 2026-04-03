// Supabase config
const supabaseUrl = "https://wiqazuogcyxvtcoyekvc.supabase.co";
const supabaseKey = "sb_publishable_r5m-2kccX-q36GbBQc1jXQ_T-H7E1UY";
const AUTH_CACHE_KEY = "yogaunnati_auth_user_v1";
const SUPABASE_AUTH_STORAGE_KEY = "yogaunnati_admin_supabase_auth_v1";

let initialAuthStateResolved = false;
let resolveInitialAuthStatePromise = null;

const initialAuthStatePromise = new Promise((resolve) => {
  resolveInitialAuthStatePromise = resolve;
});

window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});

function readCachedAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("Auth cache read error:", error);
    return null;
  }
}

function writeCachedAuthUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }

    localStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({
        id: user.id || "",
        email: user.email || "",
      }),
    );
  } catch (error) {
    console.error("Auth cache write error:", error);
  }
}

function normalizeResolvedUser(user) {
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || "",
  };
}

function resolveInitialAuthState(event) {
  if (initialAuthStateResolved) {
    return;
  }

  if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED" || event === "USER_DELETED") {
    initialAuthStateResolved = true;
    resolveInitialAuthStatePromise?.();
  }
}

function readPersistedSessionUser() {
  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const persistedUser =
      parsed?.user ||
      parsed?.session?.user ||
      parsed?.currentSession?.user ||
      parsed?.data?.session?.user ||
      null;

    return normalizeResolvedUser(persistedUser);
  } catch (error) {
    console.error("Persisted session read error:", error);
    return null;
  }
}

window.appAuth = {
  async waitForInitialSession(options = {}) {
    if (initialAuthStateResolved) {
      return true;
    }

    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 2500;

    await Promise.race([
      initialAuthStatePromise,
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
    ]);

    return initialAuthStateResolved;
  },
  hasPersistedSession() {
    return Boolean(readPersistedSessionUser()?.id);
  },
  async getCurrentUser(options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const cachedUser = readCachedAuthUser();

    if (!forceRefresh) {
      if (cachedUser?.id) {
        return cachedUser;
      }
    }

    const persistedUser = readPersistedSessionUser();
    if (persistedUser?.id) {
      writeCachedAuthUser(persistedUser);
      return persistedUser;
    }

    try {
      const { data: sessionData } = await window.supabaseClient.auth.getSession();
      const sessionUser = sessionData?.session?.user || null;
      if (sessionUser?.id) {
        writeCachedAuthUser(sessionUser);
        return normalizeResolvedUser(sessionUser);
      }

      const { data } = await window.supabaseClient.auth.getUser();
      const user = data?.user || null;
      if (user?.id) {
        writeCachedAuthUser(user);
        return normalizeResolvedUser(user);
      }
    } catch (error) {
      console.error("Auth resolve error:", error);
    }

    if (cachedUser?.id) {
      return cachedUser;
    }

    writeCachedAuthUser(null);
    return null;
  },
  clearCachedUser() {
    writeCachedAuthUser(null);
  },
};

window.supabaseClient.auth.onAuthStateChange((event, session) => {
  resolveInitialAuthState(event);

  if (session?.user) {
    writeCachedAuthUser(session.user);
    return;
  }

  if (event === "SIGNED_OUT" || event === "USER_DELETED") {
    writeCachedAuthUser(null);
  }
});
