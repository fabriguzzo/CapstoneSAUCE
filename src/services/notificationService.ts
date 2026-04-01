const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface NotificationItem {
  _id: string;
  recipientUserId: string;
  playerId: string;
  teamId: string;
  assignedByUserId: string;
  statKey: string;
  message: string;
  assignedAt: string;
  seen: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotifications(token: string): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/notifications`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function getUnreadNotificationStatus(token: string): Promise<{ unreadCount: number; hasUnread: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/notifications/unread-status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch notification status');
  return res.json();
}

export async function markNotificationsSeen(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/notifications/mark-seen`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to mark notifications as seen');
}
