// frontend/assets/api.js

const API_BASE = "https://unisync-asep-production.up.railway.app/api";


// ----------------------
// Add Token to Headers
// ----------------------
function authHeaders() {
  const token = localStorage.getItem("unisync_token");
  return token
    ? { "Authorization": "Bearer " + token }
    : {};
}

// ----------------------
// Unified GET
// ----------------------
export async function apiGet(url) {
  try {
    const response = await fetch(API_BASE + url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      }
    });

    const text = await response.text();
    return text ? JSON.parse(text) : { success: false };
  } catch (err) {
    console.error("API GET Error:", err);
    return { success: false, message: "Network error" };
  }
}

// ----------------------
// Unified POST
// ----------------------
export async function apiPost(url, data) {
  try {
    const response = await fetch(API_BASE + url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify(data)
    });

    const text = await response.text();
    return text ? JSON.parse(text) : { success: false };
  } catch (err) {
    console.error("API POST Error:", err);
    return { success: false, message: "Network error" };
  }
}

// ----------------------
// PUT
// ----------------------
export async function apiPut(url, data) {
  try {
    const response = await fetch(API_BASE + url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify(data)
    });

    const text = await response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("API PUT Error:", err);
    return { success: false };
  }
}

// ----------------------
// DELETE
// ----------------------
export async function apiDelete(url) {
  try {
    const response = await fetch(API_BASE + url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      }
    });

    const text = await response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("API DELETE Error:", err);
    return { success: false };
  }
}

// ----------------------
// Auth helpers
// ----------------------
export const AuthAPI = {
  me: () => apiGet("/auth/me"),
  logout: () => {
    localStorage.removeItem("unisync_token");
    localStorage.removeItem("unisync_user");
    window.location.href = "index.html";
  }
};

// ----------------------
// Profile helpers
// ----------------------
export const ProfileAPI = {
  getMyProfile: () => apiGet("/profile/me"),
  updateProfile: (payload) => apiPut("/profile/update", payload),
};

// ----------------------
// Groups helpers
// ----------------------
export const GroupsAPI = {
  myGroups: () => apiGet("/groups/my-groups"),
  groupMembers: (groupId) => apiGet(`/groups/${groupId}/members`),
  removeMember: (groupId, targetUserId) =>
    apiPost(`/groups/${groupId}/remove-member`, { targetUserId }),
  exitGroup: (groupId) => apiPost(`/groups/${groupId}/exit`, {}),
  makeAdmin: (groupId, targetUserId) =>
    apiPost(`/groups/${groupId}/make-admin`, { targetUserId }),
  groupDetails: (groupId) => apiGet(`/groups/${groupId}/details`),
};

// ----------------------
// Chat helpers
// ----------------------
export const ChatAPI = {
  getMessages: (groupId) => apiGet(`/chat/${groupId}/messages`),
 sendMessage: (groupId, payload) =>
  apiPost(`/chat/${groupId}/send`, payload),

  deleteMessage: (groupId, messageId) =>
  apiDelete(`/chat/${groupId}/message/${messageId}`),
 uploadFile: async (groupId, file, target = "all") => {
  const token = localStorage.getItem("unisync_token");
  const form = new FormData();
  form.append("file", file);
  form.append("target", target);   // ⭐ SEND FILTER HERE ⭐

  const res = await fetch(API_BASE + `/chat/${groupId}/upload`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token
    },
    body: form
  });

  const text = await res.text();
  return text ? JSON.parse(text) : { success: false };
}
};

// ----------------------
// Matching helpers
// ----------------------
export const MatchingAPI = {
  match: (groupId) => apiGet(`/matching/${groupId}/match`),
};

// ----------------------
// Analytics helpers
// ----------------------
export const AnalyticsAPI = {
  groupAnalytics: (groupId) => apiGet(`/analytics/${groupId}`),
};

// ----------------------
// Utility: Redirect if no login
// ----------------------
export function requireLogin() {
  const token = localStorage.getItem("unisync_token");
  if (!token) {
    window.location.href = "index.html";
  }
}
