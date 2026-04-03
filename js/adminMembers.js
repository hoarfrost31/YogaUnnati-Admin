const adminMembersListEl = document.getElementById("adminMembersList");
const adminMemberSearchEl = document.getElementById("adminMemberSearch");
const adminMemberResultsEl = document.getElementById("adminMemberResults");
const adminMemberFilterEl = document.getElementById("adminMemberFilter");

let allAdminMembers = [];
let adminPracticeLogDatesByUser = new Map();
let adminMembershipsByUser = new Map();

function formatAdminDateTime(dateTimeString) {
  if (!dateTimeString) {
    return "No recent app activity";
  }

  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) {
    return "No recent app activity";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function calculateAdminStreak(practiceDates) {
  const dates = [...new Set(practiceDates)].sort().reverse();
  let streak = 0;
  let compareDate = new Date();
  compareDate.setHours(0, 0, 0, 0);

  for (let index = 0; index < dates.length; index += 1) {
    const date = new Date(`${dates[index]}T00:00:00`);
    const diff = Math.floor((compareDate - date) / (1000 * 60 * 60 * 24));

    if (diff === 0 || diff === 1) {
      streak += 1;
      compareDate = date;
    } else {
      break;
    }
  }

  return streak;
}

function formatAdminDate(dateString) {
  if (!dateString) {
    return "No practice yet";
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderMembers(members) {
  if (!adminMemberResultsEl || !adminMembersListEl) {
    return;
  }

  adminMemberResultsEl.textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;

  if (!members.length) {
    adminMembersListEl.innerHTML = '<div class="admin-empty-state">No matching members found.</div>';
    return;
  }

  adminMembersListEl.innerHTML = members
    .map((member) => `
      <a href="${window.adminRoutes?.member(member.id) || `admin-member.html?uid=${encodeURIComponent(member.id)}`}" class="admin-member-row">
        <div class="admin-member-primary">
          <strong>${member.displayName}</strong>
          <span>${member.level} | ${member.totalDays} total days | ${member.streak} day streak</span>
        </div>
        <div class="admin-member-meta">
          <span>${formatAdminDate(member.lastPractice)}</span>
          <span>${formatAdminDateTime(member.lastSeenAt)}</span>
          <span class="admin-member-id">${member.id}</span>
        </div>
      </a>
    `)
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

function getFilteredAdminMembers(members) {
  const filterValue = String(adminMemberFilterEl?.value || "all");
  const todayIso = getAdminTodayIso();
  const weekStartIso = getAdminIsoDateDaysAgo(6);
  const dueSoonCutoffIso = getAdminIsoDateDaysAgo(-7);

  if (filterValue === "all") {
    return members;
  }

  if (filterValue === "practiced_last_7_days" || filterValue === "active_last_7_days") {
    if (filterValue === "active_last_7_days") {
      const seenCutoffIso = getAdminIsoDateDaysAgo(6);
      return members.filter((member) => {
        const lastSeenAt = String(member.lastSeenAt || "");
        return Boolean(lastSeenAt) && lastSeenAt.slice(0, 10) >= seenCutoffIso;
      });
    }

    return members.filter((member) => {
      const dates = adminPracticeLogDatesByUser.get(member.id) || [];
      return dates.some((date) => date >= weekStartIso && date <= todayIso);
    });
  }

  if (filterValue === "overdue_payments") {
    return members.filter((member) => {
      const membership = adminMembershipsByUser.get(member.id);
      if (!membership) {
        return false;
      }

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
  }

  if (filterValue === "payments_due_soon") {
    return members.filter((member) => {
      const membership = adminMembershipsByUser.get(member.id);
      if (!membership) {
        return false;
      }

      const planCode = String(membership.plan_code || "none").trim().toLowerCase();
      if (planCode === "none") {
        return false;
      }

      const status = String(membership.status || "inactive").trim().toLowerCase();
      const dueDate = String(membership.current_period_end || "").slice(0, 10);
      if (!dueDate || dueDate < todayIso || !["active", "past_due"].includes(status)) {
        return false;
      }

      return dueDate <= dueSoonCutoffIso;
    });
  }

  return members;
}

function applyMemberFilter() {
  if (!adminMemberSearchEl) {
    return;
  }

  const query = String(adminMemberSearchEl.value || "").trim().toLowerCase();
  const scopedMembers = getFilteredAdminMembers(allAdminMembers);
  if (!query) {
    renderMembers(scopedMembers);
    return;
  }

  const filteredMembers = scopedMembers.filter((member) =>
    member.displayName.toLowerCase().includes(query) || member.id.toLowerCase().includes(query),
  );

  renderMembers(filteredMembers);
}

async function loadAdminMembers() {
  if (!adminMembersListEl || !adminMemberSearchEl || !adminMemberResultsEl) {
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
  const practiceMap = new Map();

  practiceLogs.forEach((row) => {
    if (!practiceMap.has(row.user_id)) {
      practiceMap.set(row.user_id, []);
    }
    practiceMap.get(row.user_id).push(row.date);
  });

  adminPracticeLogDatesByUser = practiceMap;
  adminMembershipsByUser = new Map(
    memberships
      .filter((membership) => membership?.user_id)
      .map((membership) => [membership.user_id, membership]),
  );

  allAdminMembers = profiles
    .map((profileRow) => {
      const dates = practiceMap.get(profileRow.id) || [];
      const uniqueDates = [...new Set(dates)].sort();
      const milestoneState = getCurrentMilestoneState(profileRow.id, getMilestoneProgressCount(uniqueDates));
      return {
        id: profileRow.id,
        displayName: getProfileFromRow(profileRow).displayName || DEFAULT_PROFILE_NAME,
        totalDays: uniqueDates.length,
        streak: calculateAdminStreak(uniqueDates),
        level: milestoneState.milestone.level,
        lastPractice: uniqueDates.slice(-1)[0] || "",
        lastSeenAt: String(profileRow?.last_seen_at || ""),
      };
    })
    .sort((a, b) => {
      if (b.totalDays !== a.totalDays) {
        return b.totalDays - a.totalDays;
      }
      return a.displayName.localeCompare(b.displayName);
    });

  applyMemberFilter();
}

if (adminMemberSearchEl) {
  adminMemberSearchEl.addEventListener("input", applyMemberFilter);
}

if (adminMemberFilterEl) {
  adminMemberFilterEl.addEventListener("change", applyMemberFilter);
}

window.addEventListener("admin-members-filter", (event) => {
  const nextFilter = String(event.detail?.filter || "all");
  if (adminMemberFilterEl) {
    adminMemberFilterEl.value = nextFilter;
  }

  if (adminMemberSearchEl) {
    adminMemberSearchEl.value = "";
  }

  applyMemberFilter();
});

loadAdminMembers().catch((error) => {
  console.error(error);
  if (adminMembersListEl) {
    adminMembersListEl.innerHTML = '<div class="admin-empty-state">Could not load members.</div>';
  }
});
