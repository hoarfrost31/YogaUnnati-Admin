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
const adminOverdueReminderListEl = document.getElementById("adminOverdueReminderList");
const adminDueSoonPaymentsCountEl = document.getElementById("adminDueSoonPaymentsCount");
const adminDueSoonPaymentsNoteEl = document.getElementById("adminDueSoonPaymentsNote");
const adminDueSoonPaymentsCardEl = document.getElementById("adminDueSoonPaymentsCard");
const adminHomeTabEls = Array.from(document.querySelectorAll("[data-admin-home-tab]"));
const adminHomePanelEls = Array.from(document.querySelectorAll("[data-admin-home-panel]"));
const adminHomeTabTargetEls = Array.from(document.querySelectorAll("[data-admin-home-tab-target]"));
const adminActivatedTouchKeys = new WeakMap();
const adminDashboardInsightState = {
  weeklyPractice: "practiced_last_7_days",
  weeklyActiveMembers: "active_last_7_days",
  overduePayments: "overdue_payments",
  dueSoonPayments: "payments_due_soon",
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

function normalizeAdminWhatsAppPhone(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return "";
}

function buildAdminOverdueReminderMessage(member) {
  const dueDateText = member.dueDate ? ` which was due on ${formatAdminDate(member.dueDate)}` : "";
  return [
    `Namaste ${member.displayName},`,
    ``,
    `This is a reminder from YogaUnnati that your membership payment is overdue${dueDateText}.`,
    `Please renew at the earliest to continue smoothly.`,
    ``,
    `If you have already completed the payment, please ignore this message.`,
    ``,
    `Thank you.`,
  ].join("\n");
}

function renderAdminOverdueReminderList(overdueMembers = []) {
  if (!adminOverdueReminderListEl) {
    return;
  }

  if (!overdueMembers.length) {
    adminOverdueReminderListEl.innerHTML = '<div class="admin-empty-state">No overdue reminders right now.</div>';
    return;
  }

  adminOverdueReminderListEl.innerHTML = overdueMembers
    .map((member) => {
      const whatsappPhone = normalizeAdminWhatsAppPhone(member.phone);
      const whatsappUrl = whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(buildAdminOverdueReminderMessage(member))}`
        : "";

      return `
        <div class="admin-reminder-row">
          <div class="admin-reminder-copy">
            <strong>${member.displayName}</strong>
            <span>${member.planLabel}${member.dueDate ? ` | Due ${formatAdminDate(member.dueDate)}` : ""}</span>
          </div>
          ${whatsappUrl
            ? `<a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="secondary-btn admin-inline-btn admin-reminder-btn">WhatsApp</a>`
            : `<span class="admin-reminder-missing">No phone</span>`}
        </div>
      `;
    })
    .join("");
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
}

function getAdminIsoTimestampDaysAgo(daysAgo) {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() - daysAgo);
  return baseDate.toISOString();
}

function openAdminMembersFilter(filterKey) {
  const filterValue = adminDashboardInsightState[filterKey];
  if (!filterValue) {
    return;
  }

  setActiveAdminHomeTab("members");
  window.dispatchEvent(new CustomEvent("admin-members-filter", {
    detail: { filter: filterValue },
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
      openAdminMembersFilter(presetKey);
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
  const profileById = new Map(
    profiles.map((profileRow) => [profileRow.id, getProfileFromRow(profileRow)]),
  );
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
    return Boolean(dueDate) && dueDate < getAdminTodayIso() && ["active", "cancelled", "expired"].includes(status);
  });

  const overdueMembers = [...new Map(
    overdueMemberships
      .map((membership) => {
        const profile = profileById.get(membership.user_id) || {};
        return [
          membership.user_id,
          {
            id: membership.user_id,
            displayName: profile.displayName || DEFAULT_PROFILE_NAME,
            phone: profile.phone || "",
            dueDate: String(membership.current_period_end || "").slice(0, 10),
            planLabel: String(membership.plan_code || "membership").replace(/_/g, " "),
          },
        ];
      })
      .filter(([memberId]) => Boolean(memberId)),
  ).values()];

  renderAdminOverdueReminderList(overdueMembers);

  const weekSeenCutoffIso = getAdminIsoTimestampDaysAgo(6);
  const recentlySeenMembers = profiles.filter((profileRow) => {
    const lastSeenAt = String(profileRow?.last_seen_at || "");
    return Boolean(lastSeenAt) && lastSeenAt >= weekSeenCutoffIso;
  });

  if (adminWeeklyActiveMembersCountEl) {
    adminWeeklyActiveMembersCountEl.textContent = `${recentlySeenMembers.length} active member${recentlySeenMembers.length === 1 ? "" : "s"}`;
  }
  if (adminWeeklyActiveMembersNoteEl) {
    adminWeeklyActiveMembersNoteEl.textContent = recentlySeenMembers.length
      ? "Members who opened the app in the last 7 days."
      : "No app opens recorded in the last 7 days.";
  }

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
