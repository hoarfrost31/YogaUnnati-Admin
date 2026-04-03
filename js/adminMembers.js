const adminMembersListEl = document.getElementById("adminMembersList");
const adminMemberSearchEl = document.getElementById("adminMemberSearch");
const adminMemberResultsEl = document.getElementById("adminMemberResults");
const adminMemberFilterEl = document.getElementById("adminMemberFilter");

let allAdminMembers = [];
let adminPracticeLogDatesByUser = new Map();
let adminMembershipsByUser = new Map();

function normalizeAdminWhatsAppPhone(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

function buildAdminOverdueReminderMessage(member) {
  const dueDateText = member.membershipDueDate ? ` which was due on ${formatAdminDate(member.membershipDueDate)}` : "";
  const membershipUrl = `${window.adminRoutes?.appHome || "https://yogaunnati.app"}/membership.html?from=whatsapp`;
  return [
    `Namaste ${member.displayName},`,
    ``,
    `This is a reminder from YogaUnnati that your membership payment is overdue${dueDateText}.`,
    `Please renew at the earliest to continue smoothly.`,
    `Renew here: ${membershipUrl}`,
    ``,
    `If you have already completed the payment, please ignore this message.`,
    ``,
    `Thank you.`,
  ].join("\n");
}

function isAdminMembershipOverdue(membership) {
  if (!membership) {
    return false;
  }

  const todayIso = getAdminTodayIso();
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
}

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
    .map((member) => {
      const memberUrl = window.adminRoutes?.member(member.id) || `admin-member.html?uid=${encodeURIComponent(member.id)}`;
      const whatsappPhone = normalizeAdminWhatsAppPhone(member.phone);
      const canSendReminder = member.isOverdue && Boolean(whatsappPhone);
      const whatsappUrl = canSendReminder
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(buildAdminOverdueReminderMessage(member))}`
        : "";

      return `
        <div class="admin-member-row">
          <a href="${memberUrl}" class="admin-member-row-link">
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
          ${canSendReminder
            ? `<a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="secondary-btn admin-inline-btn admin-member-row-action">WhatsApp Reminder</a>`
            : ""}
          ${member.isOverdue && !canSendReminder
            ? `<span class="admin-reminder-missing admin-member-row-note">No phone for reminder</span>`
            : ""}
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

function hydrateAdminMembersData({ profiles = [], practiceLogs = [], memberships = [] }) {
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
      const profile = getProfileFromRow(profileRow);
      const dates = practiceMap.get(profileRow.id) || [];
      const uniqueDates = [...new Set(dates)].sort();
      const milestoneState = getCurrentMilestoneState(profileRow.id, getMilestoneProgressCount(uniqueDates));
      return {
        id: profileRow.id,
        displayName: profile.displayName || DEFAULT_PROFILE_NAME,
        phone: profile.phone || "",
        totalDays: uniqueDates.length,
        streak: calculateAdminStreak(uniqueDates),
        level: milestoneState.milestone.level,
        lastPractice: uniqueDates.slice(-1)[0] || "",
        lastSeenAt: String(profileRow?.last_seen_at || ""),
        membershipDueDate: String(adminMembershipsByUser.get(profileRow.id)?.current_period_end || "").slice(0, 10),
        isOverdue: isAdminMembershipOverdue(adminMembershipsByUser.get(profileRow.id)),
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

async function loadAdminMembers() {
  if (!adminMembersListEl || !adminMemberSearchEl || !adminMemberResultsEl) {
    return;
  }

  const adminUser = await window.adminAccess.requireAdminAccess();
  if (!adminUser) {
    return;
  }

  window.appAnalytics?.identify(adminUser.id);

  const cachedOverview = window.adminOverviewStore?.readCached?.() || { data: null, isFresh: false };
  if (cachedOverview.data) {
    hydrateAdminMembersData(cachedOverview.data);
  }

  if (cachedOverview.isFresh) {
    return;
  }

  const overviewData = await window.adminOverviewStore?.getFresh?.();
  hydrateAdminMembersData(overviewData);
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
