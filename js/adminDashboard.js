const adminMemberCountEl = document.getElementById("adminMemberCount");
const adminTodayCountEl = document.getElementById("adminTodayCount");
const adminPracticeLogCountEl = document.getElementById("adminPracticeLogCount");
const adminPracticePulseEl = document.getElementById("adminPracticePulse");
const adminWeeklyPracticeCountEl = document.getElementById("adminWeeklyPracticeCount");
const adminWeeklyPracticeNoteEl = document.getElementById("adminWeeklyPracticeNote");
const adminWeeklyPracticeCardEl = document.getElementById("adminWeeklyPracticeCard");
const adminWeeklyActiveMembersCountEl = document.getElementById("adminWeeklyActiveMembersCount");
const adminWeeklyActiveMembersNoteEl = document.getElementById("adminWeeklyActiveMembersNote");
const adminWeeklyActiveMembersCardEl = document.getElementById("adminWeeklyActiveMembersCard");
const adminOverduePaymentsCountEl = document.getElementById("adminOverduePaymentsCount");
const adminOverduePaymentsNoteEl = document.getElementById("adminOverduePaymentsNote");
const adminOverduePaymentsCardEl = document.getElementById("adminOverduePaymentsCard");
const adminDueSoonPaymentsCountEl = document.getElementById("adminDueSoonPaymentsCount");
const adminDueSoonPaymentsNoteEl = document.getElementById("adminDueSoonPaymentsNote");
const adminDueSoonPaymentsCardEl = document.getElementById("adminDueSoonPaymentsCard");
const adminHomeTabEls = Array.from(document.querySelectorAll("[data-admin-home-tab]"));
const adminHomePanelEls = Array.from(document.querySelectorAll("[data-admin-home-panel]"));
const adminHomeTabTargetEls = Array.from(document.querySelectorAll("[data-admin-home-tab-target]"));
const adminActivatedTouchKeys = new WeakMap();
const adminDashboardInsightState = {
  weeklyPractice: null,
  weeklyActiveMembers: null,
  overduePayments: null,
  dueSoonPayments: null,
};

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

function getAdminTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getAdminIsoDateDaysAgo(daysAgo) {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() - daysAgo);
  return baseDate.toISOString().slice(0, 10);
}

function renderAdminInsights(practiceLogs, memberships) {
  if (
    !adminWeeklyPracticeCountEl ||
    !adminWeeklyPracticeNoteEl ||
    !adminWeeklyActiveMembersCountEl ||
    !adminWeeklyActiveMembersNoteEl ||
    !adminOverduePaymentsCountEl ||
    !adminOverduePaymentsNoteEl ||
    !adminDueSoonPaymentsCountEl ||
    !adminDueSoonPaymentsNoteEl
  ) {
    return;
  }

  const weekStartIso = getAdminIsoDateDaysAgo(6);
  const todayIso = getAdminTodayIso();

  const lastWeekLogs = practiceLogs.filter((row) => row.date >= weekStartIso && row.date <= todayIso);
  const weeklyActiveMembers = new Set(lastWeekLogs.map((row) => row.user_id).filter(Boolean));

  const overdueMemberships = memberships.filter((membership) => {
    const planCode = String(membership.plan_code || "none").trim().toLowerCase();
    if (planCode === "none") {
      return false;
    }

    const status = String(membership.status || "inactive").trim().toLowerCase();
    if (status === "past_due") {
      return true;
    }

    const dueDate = String(membership.current_period_end || "").slice(0, 10);
    return Boolean(dueDate) && dueDate < todayIso && ["active", "cancelled", "expired"].includes(status);
  });

  const dueSoonMemberships = memberships.filter((membership) => {
    const planCode = String(membership.plan_code || "none").trim().toLowerCase();
    if (planCode === "none") {
      return false;
    }

    const status = String(membership.status || "inactive").trim().toLowerCase();
    const dueDate = String(membership.current_period_end || "").slice(0, 10);
    if (!dueDate || dueDate < todayIso || !["active", "past_due"].includes(status)) {
      return false;
    }

    return dueDate <= getAdminIsoDateDaysAgo(-7);
  });

  adminWeeklyPracticeCountEl.textContent = `${lastWeekLogs.length} practice${lastWeekLogs.length === 1 ? "" : "s"}`;
  adminWeeklyPracticeNoteEl.textContent = `Recorded from ${weekStartIso} to ${todayIso}.`;

  adminWeeklyActiveMembersCountEl.textContent = `${weeklyActiveMembers.size} active member${weeklyActiveMembers.size === 1 ? "" : "s"}`;
  adminWeeklyActiveMembersNoteEl.textContent = 'Members who practiced at least once in the last 7 days.';

  adminOverduePaymentsCountEl.textContent = `${overdueMemberships.length} overdue payment${overdueMemberships.length === 1 ? "" : "s"}`;
  adminOverduePaymentsNoteEl.textContent = overdueMemberships.length
    ? 'These memberships need follow-up now.'
    : 'No overdue renewals right now.';

  adminDueSoonPaymentsCountEl.textContent = `${dueSoonMemberships.length} due soon`;
  adminDueSoonPaymentsNoteEl.textContent = dueSoonMemberships.length
    ? 'Memberships renewing within the next 7 days.'
    : 'No renewals due in the next 7 days.';

  adminDashboardInsightState.weeklyPractice = {
    title: 'Members with practice in the last 7 days',
    note: `Showing members who practiced between ${weekStartIso} and ${todayIso}.`,
    resultLabel: `${weeklyActiveMembers.size} practicing member${weeklyActiveMembers.size === 1 ? "" : "s"}`,
    memberIds: [...weeklyActiveMembers],
  };
  adminDashboardInsightState.weeklyActiveMembers = {
    title: 'Active members in the last 7 days',
    note: 'Members who recorded at least one practice this week.',
    resultLabel: `${weeklyActiveMembers.size} active member${weeklyActiveMembers.size === 1 ? "" : "s"}`,
    memberIds: [...weeklyActiveMembers],
  };
  adminDashboardInsightState.overduePayments = {
    title: 'Overdue payments',
    note: 'Members with overdue renewals or memberships marked past due.',
    resultLabel: `${overdueMemberships.length} overdue payment${overdueMemberships.length === 1 ? "" : "s"}`,
    memberIds: overdueMemberships.map((membership) => membership.user_id).filter(Boolean),
  };
  adminDashboardInsightState.dueSoonPayments = {
    title: 'Payments due in the next 7 days',
    note: 'Members whose renewal date falls within the next 7 days.',
    resultLabel: `${dueSoonMemberships.length} due soon`,
    memberIds: dueSoonMemberships.map((membership) => membership.user_id).filter(Boolean),
  };
}

function openAdminMembersPreset(presetKey) {
  const preset = adminDashboardInsightState[presetKey];
  if (!preset) {
    return;
  }

  setActiveAdminHomeTab("members");
  window.dispatchEvent(new CustomEvent("admin-members-preset", {
    detail: preset,
  }));
}

function initializeAdminInsightCards() {
  const cardBindings = [
    [adminWeeklyPracticeCardEl, "weeklyPractice"],
    [adminWeeklyActiveMembersCardEl, "weeklyActiveMembers"],
    [adminOverduePaymentsCardEl, "overduePayments"],
    [adminDueSoonPaymentsCardEl, "dueSoonPayments"],
  ];

  cardBindings.forEach(([element, presetKey]) => {
    if (!element) {
      return;
    }

    bindAdminActivation(element, () => {
      openAdminMembersPreset(presetKey);
    });
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

  const practiceLogs = practiceLogsResult.data || [];
  const memberships = membershipsResult.data || [];
  const practicedTodayIds = new Set(
    practiceLogs
      .filter((row) => row.date === getAdminTodayIso())
      .map((row) => row.user_id)
      .filter(Boolean),
  );

  adminMemberCountEl.textContent = String(profiles.length);
  adminTodayCountEl.textContent = String(practicedTodayIds.size);
  adminPracticeLogCountEl.textContent = String(practiceLogs.length);
  renderAdminInsights(practiceLogs, memberships);

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
initializeAdminInsightCards();

loadAdminDashboard().catch((error) => {
  console.error(error);
  if (adminWeeklyPracticeCountEl) {
    adminWeeklyPracticeCountEl.textContent = 'Insights unavailable';
  }
  if (adminWeeklyPracticeNoteEl) {
    adminWeeklyPracticeNoteEl.textContent = 'Could not load practice and payment insights.';
  }
  if (adminPracticePulseEl) {
    adminPracticePulseEl.innerHTML = '<div class="admin-empty-state">Could not load dashboard data.</div>';
  }
});
