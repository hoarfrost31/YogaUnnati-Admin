const adminMemberCountEl = document.getElementById("adminMemberCount");
const adminTodayCountEl = document.getElementById("adminTodayCount");
const adminPracticeLogCountEl = document.getElementById("adminPracticeLogCount");
const adminPracticePulseEl = document.getElementById("adminPracticePulse");
const adminHomeTabEls = Array.from(document.querySelectorAll("[data-admin-home-tab]"));
const adminHomePanelEls = Array.from(document.querySelectorAll("[data-admin-home-panel]"));
const adminHomeTabTargetEls = Array.from(document.querySelectorAll("[data-admin-home-tab-target]"));
const adminActivatedTouchKeys = new WeakMap();

function setActiveAdminHomeTab(tabName, options = {}) {
  const updateHash = options.updateHash !== false;

  adminHomeTabEls.forEach((button) => {
    const isActive = button.dataset.adminHomeTab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  adminHomePanelEls.forEach((panel) => {
    const isActive = panel.dataset.adminHomePanel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (updateHash) {
    const nextHash = tabName === "members" ? "#members" : "#dashboard";
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }
}

function getAdminHomeTabFromHash() {
  return window.location.hash.toLowerCase() === "#members" ? "members" : "dashboard";
}

function bindAdminActivation(element, handler) {
  if (!element) {
    return;
  }

  element.addEventListener("click", (event) => {
    const lastTouchAt = adminActivatedTouchKeys.get(element) || 0;
    if (Date.now() - lastTouchAt < 700) {
      event.preventDefault();
      return;
    }

    handler(event);
  });

  element.addEventListener("touchend", (event) => {
    adminActivatedTouchKeys.set(element, Date.now());
    event.preventDefault();
    handler(event);
  }, { passive: false });
}

function initializeAdminHomeTabs() {
  if (!adminHomeTabEls.length || !adminHomePanelEls.length) {
    return;
  }

  adminHomeTabEls.forEach((button) => {
    bindAdminActivation(button, () => {
      setActiveAdminHomeTab(button.dataset.adminHomeTab || "dashboard");
    });
  });

  window.addEventListener("hashchange", () => {
    setActiveAdminHomeTab(getAdminHomeTabFromHash(), { updateHash: false });
  });

  adminHomeTabTargetEls.forEach((button) => {
    bindAdminActivation(button, () => {
      setActiveAdminHomeTab(button.dataset.adminHomeTabTarget || "dashboard");
    });
  });

  setActiveAdminHomeTab(getAdminHomeTabFromHash(), { updateHash: false });
}

function formatAdminDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

async function loadAdminDashboard() {
  if (!adminMemberCountEl || !adminTodayCountEl || !adminPracticeLogCountEl || !adminPracticePulseEl) {
    return;
  }

  const adminUser = await window.adminAccess.requireAdminAccess();
  if (!adminUser) {
    return;
  }

  window.appAnalytics?.identify(adminUser.id);

  const [profiles, practiceLogsResult] = await Promise.all([
    fetchAllProfiles(),
    supabaseClient.from("practice_logs").select("user_id, date"),
  ]);

  if (practiceLogsResult.error) {
    throw practiceLogsResult.error;
  }

  const practiceLogs = practiceLogsResult.data || [];
  const practicedTodayIds = new Set(
    practiceLogs
      .filter((row) => row.date === new Date().toISOString().slice(0, 10))
      .map((row) => row.user_id)
      .filter(Boolean),
  );

  adminMemberCountEl.textContent = String(profiles.length);
  adminTodayCountEl.textContent = String(practicedTodayIds.size);
  adminPracticeLogCountEl.textContent = String(practiceLogs.length);

  const practiceByUser = new Map();
  practiceLogs.forEach((row) => {
    if (!practiceByUser.has(row.user_id)) {
      practiceByUser.set(row.user_id, []);
    }
    practiceByUser.get(row.user_id).push(row.date);
  });

  const membersWithActivity = profiles
    .map((profileRow) => {
      const dates = practiceByUser.get(profileRow.id) || [];
      const state = getCurrentMilestoneState(profileRow.id, getMilestoneProgressCount(dates));
      return {
        id: profileRow.id,
        displayName: getProfileFromRow(profileRow).displayName || DEFAULT_PROFILE_NAME,
        totalDays: [...new Set(dates)].length,
        practicedToday: practicedTodayIds.has(profileRow.id),
        milestone: state.milestone.title,
        lastPractice: dates.sort().slice(-1)[0] || "",
      };
    })
    .filter((member) => member.totalDays > 0)
    .sort((a, b) => b.totalDays - a.totalDays)
    .slice(0, 5);

  if (!membersWithActivity.length) {
    adminPracticePulseEl.innerHTML = '<div class="admin-empty-state">No practice data yet.</div>';
    return;
  }

  adminPracticePulseEl.innerHTML = membersWithActivity
    .map((member) => `
      <a href="${window.adminRoutes?.member(member.id) || `admin-member.html?uid=${encodeURIComponent(member.id)}`}" class="admin-link-card">
        <strong>${member.displayName}</strong>
        <span>${member.totalDays} total days | ${member.milestone}${member.lastPractice ? ` | Last on ${formatAdminDate(member.lastPractice)}` : ""}${member.practicedToday ? " | Practiced today" : ""}</span>
      </a>
    `)
    .join("");
}

initializeAdminHomeTabs();

loadAdminDashboard().catch((error) => {
  console.error(error);
  if (adminPracticePulseEl) {
    adminPracticePulseEl.innerHTML = '<div class="admin-empty-state">Could not load dashboard data.</div>';
  }
});
