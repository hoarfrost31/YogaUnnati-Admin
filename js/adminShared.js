const ADMIN_ACCESS_KEY = "yogaunnati_admin_access_v1";
const ADMIN_EMAILS = ["nkapse27@gmail.com"];
const ADMIN_DATA_CACHE_PREFIX = "yogaunnati_admin_data_cache_v1:";
const ADMIN_OVERVIEW_CACHE_KEY = "overview";
const ADMIN_OVERVIEW_CACHE_TTL_MS = 2 * 60 * 1000;

window.adminRoutes = {
  isScopedApp: true,
  login: "login.html",
  dashboard: "index.html",
  members: "index.html#members",
  createMember: "create-member.html",
  appHome: "https://yogaunnati.app",
  member(memberId) {
    return `member.html?uid=${encodeURIComponent(memberId)}`;
  },
};

function normalizeAdminEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isAllowedAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeAdminEmail(email));
}

function readAdminAccessRecord() {
  try {
    const raw = localStorage.getItem(ADMIN_ACCESS_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("Admin access read error:", error);
    return null;
  }
}

function writeAdminAccessRecord(record) {
  try {
    if (!record) {
      localStorage.removeItem(ADMIN_ACCESS_KEY);
      return;
    }

    localStorage.setItem(ADMIN_ACCESS_KEY, JSON.stringify(record));
  } catch (error) {
    console.error("Admin access write error:", error);
  }
}

async function resolveAdminUserWithRetry(options = {}) {
  const shouldWaitForRestore = Boolean(options.shouldWaitForRestore);
  const attempts = shouldWaitForRestore
    ? [
      { forceRefresh: false, delay: 0 },
      { forceRefresh: true, delay: 200 },
      { forceRefresh: true, delay: 400 },
      { forceRefresh: true, delay: 700 },
      { forceRefresh: true, delay: 1000 },
      { forceRefresh: true, delay: 1500 },
    ]
    : [
      { forceRefresh: false, delay: 0 },
      { forceRefresh: true, delay: 150 },
      { forceRefresh: true, delay: 250 },
      { forceRefresh: true, delay: 400 },
      { forceRefresh: true, delay: 600 },
    ];

  if (shouldWaitForRestore) {
    await window.appAuth?.waitForInitialSession?.({ timeoutMs: 3500 });
  }

  for (const attempt of attempts) {
    if (attempt.delay) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt.delay));
    }

    const user = await window.appAuth?.getCurrentUser?.({ forceRefresh: attempt.forceRefresh });
    if (user?.id) {
      return user;
    }
  }

  return null;
}

window.adminAccess = {
  isAllowedEmail(email) {
    return isAllowedAdminEmail(email);
  },
  grant(email) {
    const normalizedEmail = normalizeAdminEmail(email);
    if (!isAllowedAdminEmail(normalizedEmail)) {
      writeAdminAccessRecord(null);
      return false;
    }

    writeAdminAccessRecord({
      email: normalizedEmail,
      grantedAt: Date.now(),
    });
    return true;
  },
  clear() {
    writeAdminAccessRecord(null);
  },
  getRecord() {
    return readAdminAccessRecord();
  },
  async logout() {
    writeAdminAccessRecord(null);
    window.appAuth?.clearCachedUser?.();
    window.adminDataCache?.removeByPrefix?.("");

    try {
      await window.supabaseClient?.auth?.signOut?.();
    } catch (error) {
      console.error("Admin logout failed:", error);
    }

    window.location.href = window.adminRoutes.login;
  },
  async requireAdminAccess(options = {}) {
    const redirectTo = Object.prototype.hasOwnProperty.call(options, "redirectTo") ? options.redirectTo : window.adminRoutes.login;
    const record = readAdminAccessRecord();
    const shouldWaitForRestore = Boolean(record?.email && isAllowedAdminEmail(record.email) && window.appAuth?.hasPersistedSession?.());
    const user = await resolveAdminUserWithRetry({ shouldWaitForRestore });
    const email = normalizeAdminEmail(user?.email);

    if (!user?.id || !isAllowedAdminEmail(email)) {
      writeAdminAccessRecord(null);
      if (redirectTo) {
        window.location.href = redirectTo;
      }
      return null;
    }

    if (!record?.email || record.email !== email) {
      writeAdminAccessRecord({
        email,
        grantedAt: Date.now(),
      });
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  },
};

function getAdminDataCacheKey(key) {
  return `${ADMIN_DATA_CACHE_PREFIX}${key}`;
}

window.adminDataCache = {
  read(key, maxAgeMs = 0) {
    try {
      const raw = localStorage.getItem(getAdminDataCacheKey(key));
      if (!raw) {
        return { data: null, isFresh: false, updatedAt: 0 };
      }

      const parsed = JSON.parse(raw);
      const updatedAt = Number(parsed?.updatedAt || 0);
      const data = parsed?.data ?? null;
      const isFresh = Boolean(data) && Number.isFinite(updatedAt) && (maxAgeMs <= 0 || Date.now() - updatedAt <= maxAgeMs);
      return {
        data,
        isFresh,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
      };
    } catch (error) {
      console.error("Admin data cache read error:", error);
      return { data: null, isFresh: false, updatedAt: 0 };
    }
  },
  write(key, data) {
    try {
      localStorage.setItem(getAdminDataCacheKey(key), JSON.stringify({
        data,
        updatedAt: Date.now(),
      }));
    } catch (error) {
      console.error("Admin data cache write error:", error);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(getAdminDataCacheKey(key));
    } catch (error) {
      console.error("Admin data cache remove error:", error);
    }
  },
  removeByPrefix(prefix) {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(getAdminDataCacheKey(prefix)))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Admin data cache prefix remove error:", error);
    }
  },
};

let adminOverviewRequestPromise = null;

window.adminOverviewStore = {
  cacheKey: ADMIN_OVERVIEW_CACHE_KEY,
  ttlMs: ADMIN_OVERVIEW_CACHE_TTL_MS,
  readCached() {
    return window.adminDataCache?.read?.(ADMIN_OVERVIEW_CACHE_KEY, ADMIN_OVERVIEW_CACHE_TTL_MS) || { data: null, isFresh: false, updatedAt: 0 };
  },
  invalidate() {
    window.adminDataCache?.remove?.(ADMIN_OVERVIEW_CACHE_KEY);
  },
  async fetchRemote() {
    const [profiles, practiceLogsResult, membershipsResult] = await Promise.all([
      fetchAllProfiles(),
      supabaseClient.from("practice_logs").select("user_id, date"),
      supabaseClient.from("memberships").select("user_id, plan_code, status, current_period_end"),
    ]);

    if (practiceLogsResult.error) {
      throw practiceLogsResult.error;
    }

    if (membershipsResult.error && membershipsResult.error.code !== "42P01") {
      throw membershipsResult.error;
    }

    const payload = {
      profiles,
      practiceLogs: practiceLogsResult.data || [],
      memberships: membershipsResult.data || [],
    };

    window.adminDataCache?.write?.(ADMIN_OVERVIEW_CACHE_KEY, payload);
    return payload;
  },
  async getFresh() {
    if (adminOverviewRequestPromise) {
      return adminOverviewRequestPromise;
    }

    adminOverviewRequestPromise = window.adminOverviewStore
      .fetchRemote()
      .finally(() => {
        adminOverviewRequestPromise = null;
      });

    return adminOverviewRequestPromise;
  },
};

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-admin-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      window.adminAccess?.logout?.();
    });
  });
});



