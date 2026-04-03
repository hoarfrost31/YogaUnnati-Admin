const adminMembersListEl = document.getElementById("adminMembersList");
const adminMemberSearchEl = document.getElementById("adminMemberSearch");
const adminMemberResultsEl = document.getElementById("adminMemberResults");
const adminMembersScopeCardEl = document.getElementById("adminMembersScopeCard");
const adminMembersScopeEyebrowEl = document.getElementById("adminMembersScopeEyebrow");
const adminMembersScopeTitleEl = document.getElementById("adminMembersScopeTitle");
const adminMembersScopeNoteEl = document.getElementById("adminMembersScopeNote");
const adminMembersScopeClearBtnEl = document.getElementById("adminMembersScopeClearBtn");

let allAdminMembers = [];
let activeAdminMembersPreset = null;

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

  adminMemberResultsEl.textContent = activeAdminMembersPreset?.resultLabel || `${members.length} member${members.length === 1 ? "" : "s"}`;

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
          <span class="admin-member-id">${member.id}</span>
        </div>
      </a>
    `)
    .join("");
}

function renderMembersScope() {
  if (!adminMembersScopeCardEl || !adminMembersScopeTitleEl || !adminMembersScopeNoteEl || !adminMembersScopeEyebrowEl) {
    return;
  }

  const hasPreset = Boolean(activeAdminMembersPreset);
  adminMembersScopeCardEl.classList.toggle("hidden", !hasPreset);
  adminMembersScopeCardEl.hidden = !hasPreset;

  if (!hasPreset) {
    return;
  }

  adminMembersScopeEyebrowEl.textContent = "Showing";
  adminMembersScopeTitleEl.textContent = activeAdminMembersPreset.title || "Filtered members";
  adminMembersScopeNoteEl.textContent = activeAdminMembersPreset.note || "Members matching this dashboard insight.";
}

function getMembersFromActivePreset(members) {
  if (!activeAdminMembersPreset?.memberIds?.length) {
    return members;
  }

  const allowedIds = new Set(activeAdminMembersPreset.memberIds);
  return members.filter((member) => allowedIds.has(member.id));
}

function applyMemberFilter() {
  if (!adminMemberSearchEl) {
    return;
  }

  const query = String(adminMemberSearchEl.value || "").trim().toLowerCase();
  const scopedMembers = getMembersFromActivePreset(allAdminMembers);
  if (!query) {
    renderMembersScope();
    renderMembers(scopedMembers);
    return;
  }

  const filteredMembers = scopedMembers.filter((member) =>
    member.displayName.toLowerCase().includes(query) || member.id.toLowerCase().includes(query),
  );

  renderMembersScope();
  renderMembers(filteredMembers);
}

function clearAdminMembersPreset() {
  activeAdminMembersPreset = null;
  renderMembersScope();
  applyMemberFilter();
}

function applyAdminMembersPreset(preset) {
  activeAdminMembersPreset = preset && typeof preset === "object"
    ? {
      title: String(preset.title || "Filtered members"),
      note: String(preset.note || ""),
      resultLabel: String(preset.resultLabel || ""),
      memberIds: Array.isArray(preset.memberIds) ? [...new Set(preset.memberIds.filter(Boolean))] : [],
    }
    : null;

  if (adminMemberSearchEl) {
    adminMemberSearchEl.value = "";
  }

  renderMembersScope();
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

  const [profiles, practiceLogsResult] = await Promise.all([
    fetchAllProfiles(),
    supabaseClient.from("practice_logs").select("user_id, date"),
  ]);

  if (practiceLogsResult.error) {
    throw practiceLogsResult.error;
  }

  const practiceLogs = practiceLogsResult.data || [];
  const practiceMap = new Map();

  practiceLogs.forEach((row) => {
    if (!practiceMap.has(row.user_id)) {
      practiceMap.set(row.user_id, []);
    }
    practiceMap.get(row.user_id).push(row.date);
  });

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
      };
    })
    .sort((a, b) => {
      if (b.totalDays !== a.totalDays) {
        return b.totalDays - a.totalDays;
      }
      return a.displayName.localeCompare(b.displayName);
    });

  renderMembersScope();
  applyMemberFilter();
}

if (adminMemberSearchEl) {
  adminMemberSearchEl.addEventListener("input", applyMemberFilter);
}

if (adminMembersScopeClearBtnEl) {
  adminMembersScopeClearBtnEl.addEventListener("click", clearAdminMembersPreset);
}

window.addEventListener("admin-members-preset", (event) => {
  applyAdminMembersPreset(event.detail || null);
});

loadAdminMembers().catch((error) => {
  console.error(error);
  if (adminMembersListEl) {
    adminMembersListEl.innerHTML = '<div class="admin-empty-state">Could not load members.</div>';
  }
});
