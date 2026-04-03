const adminMemberNameEl = document.getElementById("adminMemberName");
const adminMemberMetaEl = document.getElementById("adminMemberMeta");
const adminMemberLevelEl = document.getElementById("adminMemberLevel");
const adminSummaryMembershipPlanEl = document.getElementById("adminSummaryMembershipPlan");
const adminSummaryMembershipStatusEl = document.getElementById("adminSummaryMembershipStatus");
const adminSummaryMembershipStatusNoteEl = document.getElementById("adminSummaryMembershipStatusNote");
const adminMembershipHistoryCountEl = document.getElementById("adminMembershipHistoryCount");
const adminMembershipHistoryListEl = document.getElementById("adminMembershipHistoryList");
const adminDetailTotalDaysEl = document.getElementById("adminDetailTotalDays");
const adminDetailStreakEl = document.getElementById("adminDetailStreak");
const adminDetailMilestoneTitleEl = document.getElementById("adminDetailMilestoneTitle");
const adminDetailMilestoneProgressEl = document.getElementById("adminDetailMilestoneProgress");
const adminDetailMilestoneRemainingEl = document.getElementById("adminDetailMilestoneRemaining");
const adminMemberReferenceLineEl = document.getElementById("adminMemberReferenceLine");
const adminMemberPhoneLineEl = document.getElementById("adminMemberPhoneLine");
const adminMemberLastSeenLineEl = document.getElementById("adminMemberLastSeenLine");
const adminCalendarLabelEl = document.getElementById("adminCalendarLabel");
const adminPracticeCalendarGridEl = document.getElementById("adminPracticeCalendarGrid");
const adminCalendarPrevBtn = document.getElementById("adminCalendarPrev");
const adminCalendarNextBtn = document.getElementById("adminCalendarNext");
const adminMemberMembershipPlanEl = document.getElementById("adminMemberMembershipPlan");
const adminMemberMembershipStatusEl = document.getElementById("adminMemberMembershipStatus");
const adminMemberMembershipStartEl = document.getElementById("adminMemberMembershipStart");
const adminMemberMembershipRenewalEl = document.getElementById("adminMemberMembershipRenewal");
const adminMemberDisplayNameInputEl = document.getElementById("adminMemberDisplayName");
const adminMemberEmailInputEl = document.getElementById("adminMemberEmail");
const adminMemberPhoneInputEl = document.getElementById("adminMemberPhone");
const adminMemberSaveInfoBtnEl = document.getElementById("adminMemberSaveInfoBtn");
const adminMemberInfoMsgEl = document.getElementById("adminMemberInfoMsg");
const adminMemberSaveMembershipBtnEl = document.getElementById("adminMemberSaveMembershipBtn");
const adminMemberMembershipMsgEl = document.getElementById("adminMemberMembershipMsg");
const adminMemberReminderCardEl = document.getElementById("adminMemberReminderCard");
const adminMemberReminderNoteEl = document.getElementById("adminMemberReminderNote");
const adminMemberReminderBtnEl = document.getElementById("adminMemberReminderBtn");
const adminMemberPasswordInputEl = document.getElementById("adminMemberPasswordInput");
const adminMemberSetPasswordBtnEl = document.getElementById("adminMemberSetPasswordBtn");
const adminMemberPasswordMsgEl = document.getElementById("adminMemberPasswordMsg");
const adminMemberLoginAccessNoteEl = document.getElementById("adminMemberLoginAccessNote");
const adminMemberToggleLoginBtnEl = document.getElementById("adminMemberToggleLoginBtn");
const adminMemberLoginAccessMsgEl = document.getElementById("adminMemberLoginAccessMsg");
const adminMemberDeleteBtnEl = document.getElementById("adminMemberDeleteBtn");
const adminMemberDeleteMsgEl = document.getElementById("adminMemberDeleteMsg");
const adminMemberTabEls = Array.from(document.querySelectorAll("[data-admin-member-tab]"));
const adminMemberPanelEls = Array.from(document.querySelectorAll("[data-admin-member-panel]"));
const BILLING_PERIOD_DAYS = 30;
const ADMIN_MEMBER_ACCOUNT_URL = 'https://vercel-api-hoarfrost31s-projects.vercel.app/api/admin-member-account';
const ADMIN_SET_PASSWORD_URL = 'https://vercel-api-hoarfrost31s-projects.vercel.app/api/admin-set-member-password';
const ADMIN_SET_LOGIN_DISABLED_URL = 'https://vercel-api-hoarfrost31s-projects.vercel.app/api/admin-set-member-login-disabled';
const ADMIN_DELETE_MEMBER_URL = 'https://vercel-api-hoarfrost31s-projects.vercel.app/api/admin-delete-member';

let adminMemberPracticeDates = [];
let adminCalendarDate = new Date();
let currentAdminMemberId = "";
let currentAdminMembershipRow = null;
let currentAdminProfileRow = null;
let currentAdminMemberEmail = "";

function setAdminMemberInfoMessage(text) {
  if (adminMemberInfoMsgEl) {
    adminMemberInfoMsgEl.textContent = text;
  }
}

function setAdminMemberMembershipMessage(text) {
  if (adminMemberMembershipMsgEl) {
    adminMemberMembershipMsgEl.textContent = text;
  }
}

function setAdminMemberPasswordMessage(text) {
  if (adminMemberPasswordMsgEl) {
    adminMemberPasswordMsgEl.textContent = text;
  }
}

function setAdminMemberLoginAccessMessage(text) {
  if (adminMemberLoginAccessMsgEl) {
    adminMemberLoginAccessMsgEl.textContent = text;
  }
}

function setAdminMemberDeleteMessage(text) {
  if (adminMemberDeleteMsgEl) {
    adminMemberDeleteMsgEl.textContent = text;
  }
}

function normalizeAdminEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAdminPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return '';
}

async function getAdminAccessToken() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session?.access_token || '';
}

function renderAdminLoginAccess(profileRow) {
  currentAdminProfileRow = profileRow || null;

  if (!adminMemberToggleLoginBtnEl || !adminMemberLoginAccessNoteEl) {
    return;
  }

  const isDisabled = Boolean(profileRow?.login_disabled);
  adminMemberToggleLoginBtnEl.textContent = isDisabled ? 'Restore Login' : 'Block Login';
  adminMemberLoginAccessNoteEl.textContent = isDisabled
    ? 'This member cannot sign in. Any existing session is forced out when the app rechecks access.'
    : 'This member can sign in with their current credentials.';
}

function setActiveAdminMemberTab(tabName) {
  adminMemberTabEls.forEach((button) => {
    const isActive = button.dataset.adminMemberTab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  adminMemberPanelEls.forEach((panel) => {
    const isActive = panel.dataset.adminMemberPanel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function initializeAdminMemberTabs() {
  adminMemberTabEls.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveAdminMemberTab(button.dataset.adminMemberTab || "calendar");
    });
  });

  setActiveAdminMemberTab("calendar");
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

function formatMembershipPlanLabel(planCode) {
  if (planCode === "studio") return "YogaUnnati Studio";
  if (planCode === "online") return "YogaUnnati Online";
  if (planCode === "app") return "YogaUnnati App";
  return "No membership";
}

function formatMembershipStatusLabel(status) {
  if (status === "active") return "Active";
  if (status === "past_due") return "Payment Due";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return "Inactive";
}

function formatAdminDate(dateString) {
  if (!dateString) return "-";

  const normalizedValue = String(dateString);
  const date = normalizedValue.includes("T")
    ? new Date(normalizedValue)
    : new Date(`${normalizedValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function normalizeAdminWhatsAppPhone(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return "";
}

function isAdminMembershipOverdue(membershipRow) {
  if (!membershipRow) {
    return false;
  }

  const planCode = String(membershipRow.plan_code || "none").trim().toLowerCase();
  if (planCode === "none") {
    return false;
  }

  const status = String(membershipRow.status || "inactive").trim().toLowerCase();
  if (status === "past_due") {
    return true;
  }

  const dueDate = String(membershipRow.current_period_end || "").slice(0, 10);
  return Boolean(dueDate) && dueDate < getCurrentIso().slice(0, 10) && ["active", "cancelled", "expired"].includes(status);
}

function buildAdminOverdueReminderMessage(displayName, dueDate) {
  const dueDateText = dueDate ? ` which was due on ${formatAdminDate(dueDate)}` : "";
  return [
    `Namaste ${displayName},`,
    ``,
    `This is a reminder from YogaUnnati that your membership payment is overdue${dueDateText}.`,
    `Please renew at the earliest to continue smoothly.`,
    ``,
    `If you have already completed the payment, please ignore this message.`,
    ``,
    `Thank you.`,
  ].join("\n");
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return formatIsoDate(date);
}

function getCurrentIso() {
  return new Date().toISOString();
}

function addBillingDays(baseDate, days = BILLING_PERIOD_DAYS) {
  const date = new Date(baseDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));
}

function getNextMonthlyRenewalIso(baseDate = new Date()) {
  const nextDate = addBillingDays(baseDate);
  return nextDate ? nextDate.toISOString() : "";
}

function getDefaultMembershipStatus(planCode) {
  return planCode === "none" ? "inactive" : "active";
}

function shouldTrackMembershipCycle(planCode, status, periodStart, periodEnd) {
  if (planCode === "none" || !periodStart || !periodEnd) return false;
  return ["active", "past_due", "cancelled", "expired"].includes(status);
}

function syncMembershipDatesFromForm() {
  if (!adminMemberMembershipPlanEl || !adminMemberMembershipStartEl || !adminMemberMembershipRenewalEl || !adminMemberMembershipStatusEl) return;

  const planCode = adminMemberMembershipPlanEl.value;

  if (planCode === "none") {
    adminMemberMembershipStatusEl.value = "inactive";
    adminMemberMembershipStartEl.value = "";
    adminMemberMembershipRenewalEl.value = "";
    return;
  }

  if (adminMemberMembershipStatusEl.value === "inactive") {
    adminMemberMembershipStatusEl.value = "active";
  }

  const startValue = adminMemberMembershipStartEl.value || formatIsoDate(new Date());
  adminMemberMembershipStartEl.value = startValue;

  const nextRenewalDate = addBillingDays(new Date(`${startValue}T00:00:00`));
  adminMemberMembershipRenewalEl.value = nextRenewalDate ? formatIsoDate(nextRenewalDate) : "";
}

function renderAdminPracticeCalendar() {
  if (!adminCalendarLabelEl || !adminPracticeCalendarGridEl) return;

  const practicedSet = new Set(adminMemberPracticeDates);
  const year = adminCalendarDate.getFullYear();
  const month = adminCalendarDate.getMonth();
  const todayIso = formatIsoDate(new Date());
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const calendarMarkup = [];

  adminCalendarLabelEl.textContent = adminCalendarDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  for (let index = 0; index < firstDay; index += 1) {
    calendarMarkup.push('<div class="admin-calendar-day admin-calendar-day-empty"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isPracticed = practicedSet.has(isoDate);
    const isToday = isoDate === todayIso;

    calendarMarkup.push(`
      <div class="admin-calendar-day ${isPracticed ? "is-active" : ""} ${isToday ? "is-today" : ""}">
        <span class="admin-calendar-day-number">${day}</span>
      </div>
    `);
  }

  adminPracticeCalendarGridEl.innerHTML = calendarMarkup.join("");
}

async function loadMembershipRow(memberId) {
  const { data, error } = await window.supabaseClient
    .from("memberships")
    .select("plan_code, status, started_at, current_period_end")
    .eq("user_id", memberId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadMembershipCycles(memberId) {
  const { data, error } = await window.supabaseClient
    .from("membership_cycles")
    .select("id, plan_code, status, period_start, period_end, source, note, created_at")
    .eq("user_id", memberId)
    .order("period_start", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadLoginAccessRow(memberId) {
  try {
    const { data, error } = await window.supabaseClient
      .from("profiles")
      .select("id, login_disabled")
      .eq("id", memberId)
      .maybeSingle();

    if (error) {
      if (["42P01", "42703", "PGRST116", "PGRST204"].includes(String(error.code || ""))) {
        return { id: memberId, login_disabled: false };
      }

      throw error;
    }

    return data || { id: memberId, login_disabled: false };
  } catch (error) {
    console.error(error);
    return { id: memberId, login_disabled: false };
  }
}

function renderMembershipSummary(membershipRow) {
  if (!adminSummaryMembershipPlanEl || !adminSummaryMembershipStatusEl) return;

  const planCode = membershipRow?.plan_code || "none";
  const status = membershipRow?.status || getDefaultMembershipStatus(planCode);
  const currentPeriodEnd = membershipRow?.current_period_end ? new Date(membershipRow.current_period_end) : null;
  const now = new Date();
  let statusNote = "Subscription state";

  if (currentPeriodEnd && !Number.isNaN(currentPeriodEnd.getTime()) && status !== "inactive") {
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / msPerDay);

    if (daysLeft > 1) {
      statusNote = `${daysLeft} days left`;
    } else if (daysLeft === 1) {
      statusNote = "1 day left";
    } else if (daysLeft === 0) {
      statusNote = "Due today";
    } else {
      statusNote = `${Math.abs(daysLeft)} days overdue`;
    }
  }

  adminSummaryMembershipPlanEl.textContent = formatMembershipPlanLabel(planCode);
  adminSummaryMembershipStatusEl.textContent = formatMembershipStatusLabel(status);
  if (adminSummaryMembershipStatusNoteEl) {
    adminSummaryMembershipStatusNoteEl.textContent = statusNote;
  }
}

function renderAdminMemberInfoForm({ displayName = "", email = "", phone = "" } = {}) {
  currentAdminMemberEmail = normalizeAdminEmail(email);

  if (adminMemberDisplayNameInputEl) {
    adminMemberDisplayNameInputEl.value = displayName || "";
  }
  if (adminMemberEmailInputEl) {
    adminMemberEmailInputEl.value = currentAdminMemberEmail;
  }
  if (adminMemberPhoneInputEl) {
    adminMemberPhoneInputEl.value = phone || "";
  }
}

async function loadAdminMemberAccount(memberId, profile) {
  if (!memberId) {
    return;
  }

  try {
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      throw new Error('Admin session missing. Please sign in again.');
    }

    const response = await fetch(ADMIN_MEMBER_ACCOUNT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        mode: 'get',
        member_id: memberId,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Could not load member account info.');
    }

    renderAdminMemberInfoForm({
      displayName: payload.display_name || profile?.displayName || "",
      email: payload.email || "",
      phone: payload.phone || profile?.phone || "",
    });
  } catch (error) {
    console.error(error);
    renderAdminMemberInfoForm({
      displayName: profile?.displayName || "",
      email: currentAdminMemberEmail,
      phone: profile?.phone || "",
    });
    setAdminMemberInfoMessage(error.message || 'Could not load member info.');
  }
}

function renderMembershipEditor(membershipRow) {
  currentAdminMembershipRow = membershipRow || null;
  const planCode = membershipRow?.plan_code || "none";
  const status = membershipRow?.status || getDefaultMembershipStatus(planCode);

  if (!adminMemberMembershipPlanEl || !adminMemberMembershipStatusEl || !adminMemberMembershipStartEl || !adminMemberMembershipRenewalEl) return;

  adminMemberMembershipPlanEl.value = planCode;
  adminMemberMembershipStatusEl.value = status;
  adminMemberMembershipStartEl.value = formatDateForInput(membershipRow?.started_at || "");
  adminMemberMembershipRenewalEl.value = formatDateForInput(membershipRow?.current_period_end || "");
}

function renderAdminMemberReminder(profileRow, membershipRow, displayName) {
  if (!adminMemberReminderCardEl || !adminMemberReminderBtnEl || !adminMemberReminderNoteEl) {
    return;
  }

  const isOverdue = isAdminMembershipOverdue(membershipRow);
  const dueDate = String(membershipRow?.current_period_end || "").slice(0, 10);
  const phone = normalizeAdminWhatsAppPhone(profileRow?.phone || "");
  const canSend = isOverdue && Boolean(phone);

  adminMemberReminderCardEl.hidden = !isOverdue;
  if (!isOverdue) {
    adminMemberReminderBtnEl.href = "#";
    return;
  }

  adminMemberReminderBtnEl.classList.toggle("disabled", !canSend);
  adminMemberReminderBtnEl.setAttribute("aria-disabled", canSend ? "false" : "true");
  adminMemberReminderBtnEl.href = canSend
    ? `https://wa.me/${phone}?text=${encodeURIComponent(buildAdminOverdueReminderMessage(displayName, dueDate))}`
    : "#";
  adminMemberReminderNoteEl.textContent = canSend
    ? "Send a WhatsApp reminder for this overdue membership."
    : "Add a phone number to this member profile before sending a reminder.";
}

async function saveAdminMemberInfo() {
  if (!currentAdminMemberId || !adminMemberSaveInfoBtnEl) {
    return;
  }

  const displayName = String(adminMemberDisplayNameInputEl?.value || '').trim();
  const email = normalizeAdminEmail(adminMemberEmailInputEl?.value || '');
  const phone = normalizeAdminPhone(adminMemberPhoneInputEl?.value || '');

  if (!email) {
    setAdminMemberInfoMessage('Email is required.');
    return;
  }

  if (!phone) {
    setAdminMemberInfoMessage('Enter a valid 10-digit mobile number.');
    return;
  }

  adminMemberSaveInfoBtnEl.disabled = true;
  setAdminMemberInfoMessage('Saving member info...');

  try {
    const accessToken = await getAdminAccessToken();
    if (!accessToken) {
      throw new Error('Admin session missing. Please sign in again.');
    }

    const response = await fetch(ADMIN_MEMBER_ACCOUNT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        mode: 'update',
        member_id: currentAdminMemberId,
        display_name: displayName,
        email,
        phone,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Could not update member info.');
    }

    const resolvedDisplayName = String(payload.display_name || displayName || email.split('@')[0] || 'Yoga Member').trim();
    currentAdminMemberEmail = normalizeAdminEmail(payload.email || email);
    currentAdminProfileRow = {
      ...(currentAdminProfileRow || {}),
      display_name: resolvedDisplayName,
      phone,
    };

    if (adminMemberNameEl) {
      adminMemberNameEl.textContent = resolvedDisplayName;
    }
    if (adminMemberPhoneLineEl) {
      adminMemberPhoneLineEl.textContent = phone ? `Phone: ${phone}` : 'Phone: -';
    }
    renderAdminMemberReminder(currentAdminProfileRow, currentAdminMembershipRow, resolvedDisplayName);

    renderAdminMemberInfoForm({
      displayName: resolvedDisplayName,
      email: currentAdminMemberEmail,
      phone,
    });
    setAdminMemberInfoMessage('Member info updated.');
  } catch (error) {
    console.error(error);
    setAdminMemberInfoMessage(error.message || 'Could not update member info.');
  } finally {
    adminMemberSaveInfoBtnEl.disabled = false;
  }
}

function getHistorySourceLabel(source) {
  if (source === "payment") return "Gateway payment";
  if (source === "admin") return "Admin update";
  if (source === "backfill") return "Backfilled record";
  return source || "Recorded";
}

function renderMembershipHistory(cycleRows) {
  if (!adminMembershipHistoryListEl || !adminMembershipHistoryCountEl) return;

  const count = cycleRows.length;
  adminMembershipHistoryCountEl.textContent = `${count} period${count === 1 ? "" : "s"}`;

  if (!count) {
    adminMembershipHistoryListEl.innerHTML = '<div class="admin-empty-state">No subscription periods recorded yet.</div>';
    return;
  }

  adminMembershipHistoryListEl.innerHTML = cycleRows.map((row) => {
    const rangeLabel = row.period_end
      ? `${formatAdminDate(row.period_start)} to ${formatAdminDate(row.period_end)}`
      : `Started ${formatAdminDate(row.period_start)}`;
    const metaTags = [
      formatMembershipPlanLabel(row.plan_code),
      formatMembershipStatusLabel(row.status),
      getHistorySourceLabel(row.source),
    ].filter(Boolean);
    const noteMarkup = row.note ? `<p class="admin-history-note">${row.note}</p>` : "";

    return `
      <article class="admin-history-item">
        <div class="admin-history-item-head">
          <div>
            <strong>${formatMembershipPlanLabel(row.plan_code)}</strong>
            <p class="admin-history-range">${rangeLabel}</p>
          </div>
          <span class="admin-chip">${formatMembershipStatusLabel(row.status)}</span>
        </div>
        <div class="admin-history-meta">
          ${metaTags.map((tag) => `<span class="admin-history-tag">${tag}</span>`).join("")}
        </div>
        ${noteMarkup}
      </article>
    `;
  }).join("");
}

async function insertMembershipCycleIfMissing({ userId, planCode, status, periodStart, periodEnd, source, note }) {
  try {
    const normalizedStart = new Date(periodStart).toISOString();
    const normalizedEnd = periodEnd ? new Date(periodEnd).toISOString() : null;
    let duplicateQuery = window.supabaseClient
      .from("membership_cycles")
      .select("id")
      .eq("user_id", userId)
      .eq("plan_code", planCode)
      .eq("period_start", normalizedStart);

    duplicateQuery = normalizedEnd
      ? duplicateQuery.eq("period_end", normalizedEnd)
      : duplicateQuery.is("period_end", null);

    const { data: existingCycle, error: lookupError } = await duplicateQuery.maybeSingle();
    if (lookupError) {
      if (lookupError.code === "42P01") return;
      throw lookupError;
    }

    if (existingCycle?.id) return;

    const { error } = await window.supabaseClient
      .from("membership_cycles")
      .insert({
        user_id: userId,
        plan_code: planCode,
        status,
        period_start: normalizedStart,
        period_end: normalizedEnd,
        source,
        note,
      });

    if (error && error.code !== "42P01") throw error;
  } catch (error) {
    console.error(error);
  }
}

async function saveMemberMembership() {
  if (!currentAdminMemberId) return;

  const planCode = adminMemberMembershipPlanEl.value;
  const status = planCode === "none" ? "inactive" : adminMemberMembershipStatusEl.value;
  const startValue = adminMemberMembershipStartEl.value;
  const renewalValue = adminMemberMembershipRenewalEl.value;

  adminMemberSaveMembershipBtnEl.disabled = true;
  setAdminMemberMembershipMessage("Saving membership...");

  try {
    const resolvedStartAt = planCode === "none"
      ? null
      : (startValue ? new Date(`${startValue}T00:00:00`).toISOString() : (currentAdminMembershipRow?.started_at || getCurrentIso()));
    const resolvedPeriodEnd = planCode === "none"
      ? null
      : (renewalValue ? new Date(`${renewalValue}T00:00:00`).toISOString() : getNextMonthlyRenewalIso(resolvedStartAt || new Date()));

    const payload = {
      user_id: currentAdminMemberId,
      plan_code: planCode,
      status,
      billing_cycle: "monthly",
      started_at: resolvedStartAt,
      current_period_end: resolvedPeriodEnd,
      cancel_at_period_end: false,
    };

    const { error } = await window.supabaseClient
      .from("memberships")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;

    if (shouldTrackMembershipCycle(planCode, status, resolvedStartAt, resolvedPeriodEnd)) {
      await insertMembershipCycleIfMissing({
        userId: currentAdminMemberId,
        planCode,
        status,
        periodStart: resolvedStartAt,
        periodEnd: resolvedPeriodEnd,
        source: "admin",
        note: "Saved from admin member editor",
      });
    }

    const membershipRow = await loadMembershipRow(currentAdminMemberId);
    let membershipCycles = [];

    try {
      membershipCycles = await loadMembershipCycles(currentAdminMemberId);
    } catch (cycleError) {
      if (cycleError?.code !== "42P01") throw cycleError;
    }

    renderMembershipSummary(membershipRow);
    renderMembershipEditor(membershipRow);
    renderMembershipHistory(membershipCycles);
    setAdminMemberMembershipMessage("Membership updated.");
    window.appAnalytics?.track("admin_membership_updated", {
      plan_code: planCode,
      status,
    });
  } catch (error) {
    console.error(error);
    setAdminMemberMembershipMessage(error.message || "Could not save membership.");
  } finally {
    adminMemberSaveMembershipBtnEl.disabled = false;
  }
}

async function setMemberPassword() {
  if (!currentAdminMemberId || !adminMemberPasswordInputEl || !adminMemberSetPasswordBtnEl) return;

  const newPassword = String(adminMemberPasswordInputEl.value || '').trim();
  if (newPassword.length < 6) {
    setAdminMemberPasswordMessage('Password must be at least 6 characters.');
    return;
  }

  setAdminMemberPasswordMessage('Updating password...');
  adminMemberSetPasswordBtnEl.disabled = true;

  try {
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    const session = sessionData?.session || null;
    const accessToken = session?.access_token || '';
    if (!accessToken) {
      throw new Error('Admin session missing. Please sign in again.');
    }

    const response = await fetch(ADMIN_SET_PASSWORD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        member_id: currentAdminMemberId,
        new_password: newPassword,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Could not update password.');
    }

    adminMemberPasswordInputEl.value = '';
    setAdminMemberPasswordMessage('Password updated successfully.');
    window.appAnalytics?.track('admin_member_password_updated', {
      member_id: currentAdminMemberId,
    });
  } catch (error) {
    console.error(error);
    setAdminMemberPasswordMessage(error.message || 'Could not update password.');
  } finally {
    adminMemberSetPasswordBtnEl.disabled = false;
  }
}

async function updateMemberLoginAccess(loginDisabled) {
  if (!currentAdminMemberId || !adminMemberToggleLoginBtnEl) return;

  const actionLabel = loginDisabled ? 'Blocking login...' : 'Restoring login...';
  setAdminMemberLoginAccessMessage(actionLabel);
  adminMemberToggleLoginBtnEl.disabled = true;

  try {
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    const session = sessionData?.session || null;
    const accessToken = session?.access_token || '';
    if (!accessToken) {
      throw new Error('Admin session missing. Please sign in again.');
    }

    const response = await fetch(ADMIN_SET_LOGIN_DISABLED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        member_id: currentAdminMemberId,
        login_disabled: loginDisabled,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Could not update login access.');
    }

    currentAdminProfileRow = {
      ...(currentAdminProfileRow || {}),
      login_disabled: loginDisabled,
    };
    renderAdminLoginAccess(currentAdminProfileRow);
    setAdminMemberLoginAccessMessage(loginDisabled ? 'Login blocked for this member.' : 'Login restored for this member.');
    window.appAnalytics?.track(loginDisabled ? 'admin_member_login_blocked' : 'admin_member_login_restored', {
      member_id: currentAdminMemberId,
    });
  } catch (error) {
    console.error(error);
    setAdminMemberLoginAccessMessage(error.message || 'Could not update login access.');
  } finally {
    adminMemberToggleLoginBtnEl.disabled = false;
  }
}

async function deleteMemberAccount() {
  if (!currentAdminMemberId || !adminMemberDeleteBtnEl) return;

  const confirmed = window.confirm('Delete this member account permanently? This removes their login and member data.');
  if (!confirmed) return;

  setAdminMemberDeleteMessage('Deleting member account...');
  adminMemberDeleteBtnEl.disabled = true;

  try {
    const { data: sessionData } = await window.supabaseClient.auth.getSession();
    const session = sessionData?.session || null;
    const accessToken = session?.access_token || '';
    if (!accessToken) {
      throw new Error('Admin session missing. Please sign in again.');
    }

    const response = await fetch(ADMIN_DELETE_MEMBER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ member_id: currentAdminMemberId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || 'Could not delete member.');
    }

    setAdminMemberDeleteMessage('Member deleted. Returning to members...');
    window.appAnalytics?.track('admin_member_deleted', {
      member_id: currentAdminMemberId,
    });
    window.setTimeout(() => {
      window.location.href = window.adminRoutes?.members || 'members.html';
    }, 900);
  } catch (error) {
    console.error(error);
    setAdminMemberDeleteMessage(error.message || 'Could not delete member.');
    adminMemberDeleteBtnEl.disabled = false;
  }
}
async function loadAdminMember() {
  const adminUser = await window.adminAccess.requireAdminAccess();
  if (!adminUser) return;

  window.appAnalytics?.identify(adminUser.id);

  const memberId = new URLSearchParams(window.location.search).get("uid");
  if (!memberId) {
    window.location.href = window.adminRoutes?.members || "admin-members.html";
    return;
  }

  currentAdminMemberId = memberId;

  const [profileRow, loginAccessRow, practiceLogsResult, membershipRow, membershipCycles] = await Promise.all([
    fetchProfileRow(memberId).catch((error) => {
      if (isProfilesTableMissing(error)) return null;
      throw error;
    }),
    loadLoginAccessRow(memberId),
    window.supabaseClient.from("practice_logs").select("date").eq("user_id", memberId),
    loadMembershipRow(memberId).catch((error) => {
      if (error?.code === "42P01") return null;
      throw error;
    }),
    loadMembershipCycles(memberId).catch((error) => {
      if (error?.code === "42P01") return [];
      throw error;
    }),
  ]);

  if (practiceLogsResult.error) throw practiceLogsResult.error;

  const practiceDates = (practiceLogsResult.data || []).map((row) => row.date).sort();
  adminMemberPracticeDates = [...new Set(practiceDates)];
  const totalDays = adminMemberPracticeDates.length;
  const streak = calculateAdminStreak(adminMemberPracticeDates);
  const lastPractice = adminMemberPracticeDates.slice(-1)[0] || "";
  const milestoneState = getCurrentMilestoneState(memberId, getMilestoneProgressCount(adminMemberPracticeDates));
  const profile = profileRow ? getProfileFromRow(profileRow) : normalizeProfileData();
  const displayName = profile.displayName || "Yoga Member";
  const phoneNumber = profile.phone || "";

  if (lastPractice) {
    const lastPracticeDate = new Date(`${lastPractice}T00:00:00`);
    adminCalendarDate = new Date(lastPracticeDate.getFullYear(), lastPracticeDate.getMonth(), 1);
  } else {
    const now = new Date();
    adminCalendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  adminMemberNameEl.textContent = displayName;
  if (adminMemberPhoneLineEl) {
    adminMemberPhoneLineEl.textContent = phoneNumber ? `Phone: ${phoneNumber}` : 'Phone: -';
  }
  if (adminMemberLastSeenLineEl) {
    adminMemberLastSeenLineEl.textContent = `Last seen: ${formatAdminDateTime(profileRow?.last_seen_at || "")}`;
  }
  adminMemberMetaEl.textContent = lastPractice
    ? `Last practice on ${formatAdminDate(lastPractice)}`
    : 'No practice recorded yet.';
  adminMemberLevelEl.textContent = milestoneState.milestone.level;
  adminDetailTotalDaysEl.textContent = String(totalDays);
  adminDetailStreakEl.textContent = String(streak);
  adminDetailMilestoneTitleEl.textContent = milestoneState.milestone.title;
  adminDetailMilestoneProgressEl.textContent = `${Math.min(milestoneState.completedWithinMilestone, milestoneState.totalWithinMilestone)} / ${milestoneState.totalWithinMilestone} days in current milestone`;
  adminDetailMilestoneRemainingEl.textContent = milestoneState.remainingDays === 0
    ? 'Milestone completed'
    : `${milestoneState.remainingDays} days remaining to the next unlock`;
  if (adminMemberReferenceLineEl) {
    adminMemberReferenceLineEl.textContent = `Member ID: ${memberId}`;
  }

  renderAdminMemberInfoForm({
    displayName,
    email: currentAdminMemberEmail,
    phone: phoneNumber,
  });
  await loadAdminMemberAccount(memberId, profile);
  renderMembershipSummary(membershipRow);
  renderMembershipEditor(membershipRow);
  renderAdminMemberReminder(profile, membershipRow, displayName);
  renderMembershipHistory(membershipCycles);
  renderAdminLoginAccess(loginAccessRow);
  renderAdminPracticeCalendar();
}

if (adminCalendarPrevBtn) {
  adminCalendarPrevBtn.addEventListener('click', () => {
    adminCalendarDate = new Date(adminCalendarDate.getFullYear(), adminCalendarDate.getMonth() - 1, 1);
    renderAdminPracticeCalendar();
  });
}

if (adminCalendarNextBtn) {
  adminCalendarNextBtn.addEventListener('click', () => {
    adminCalendarDate = new Date(adminCalendarDate.getFullYear(), adminCalendarDate.getMonth() + 1, 1);
    renderAdminPracticeCalendar();
  });
}

if (adminMemberMembershipPlanEl) {
  adminMemberMembershipPlanEl.addEventListener('change', syncMembershipDatesFromForm);
}

if (adminMemberMembershipStartEl) {
  adminMemberMembershipStartEl.addEventListener('change', syncMembershipDatesFromForm);
}

if (adminMemberSaveMembershipBtnEl) {
  adminMemberSaveMembershipBtnEl.addEventListener('click', saveMemberMembership);
}

if (adminMemberSaveInfoBtnEl) {
  adminMemberSaveInfoBtnEl.addEventListener('click', saveAdminMemberInfo);
}

if (adminMemberSetPasswordBtnEl) {
  adminMemberSetPasswordBtnEl.addEventListener('click', setMemberPassword);
}

if (adminMemberToggleLoginBtnEl) {
  adminMemberToggleLoginBtnEl.addEventListener('click', () => {
    const nextLoginDisabled = !Boolean(currentAdminProfileRow?.login_disabled);
    updateMemberLoginAccess(nextLoginDisabled);
  });
}

if (adminMemberDeleteBtnEl) {
  adminMemberDeleteBtnEl.addEventListener('click', deleteMemberAccount);
}

initializeAdminMemberTabs();

loadAdminMember().catch((error) => {
  console.error(error);
  adminMemberMetaEl.textContent = 'Could not load this member record.';
  if (adminMemberPhoneLineEl) {
    adminMemberPhoneLineEl.textContent = 'Phone: -';
  }
  if (adminMemberLastSeenLineEl) {
    adminMemberLastSeenLineEl.textContent = 'Last seen: -';
  }
  if (adminMemberReferenceLineEl) {
    adminMemberReferenceLineEl.textContent = 'Member ID: -';
  }
  if (adminMemberReminderCardEl) {
    adminMemberReminderCardEl.hidden = true;
  }
  if (adminPracticeCalendarGridEl) {
    adminPracticeCalendarGridEl.innerHTML = '<div class="admin-empty-state">Calendar could not be loaded.</div>';
  }
  setAdminMemberInfoMessage('Member info tools could not be loaded.');
  if (adminMembershipHistoryListEl) {
    adminMembershipHistoryListEl.innerHTML = '<div class="admin-empty-state">Subscription history could not be loaded.</div>';
  }
  setAdminMemberMembershipMessage('Membership editor could not be loaded.');
  setAdminMemberPasswordMessage('Password tools could not be loaded.');
  setAdminMemberDeleteMessage('Delete tools could not be loaded.');
});







