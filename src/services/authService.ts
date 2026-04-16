const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'coach' | 'member' | 'admin';
  teamId: string;
  status: 'pending' | 'approved';
  profilePicture?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  role: 'coach' | 'member' | 'admin';
  teamId?: string;
  teamName?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Session expired');
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Reset failed');
  }
  return res.json();
}

export async function getProfile(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(token: string, formData: FormData): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Update failed');
  }
  return res.json();
}

export async function getPendingMembers(token: string): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/users/team/pending`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch pending members');
  return res.json();
}

export async function getTeamMembers(token: string): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/users/team/members`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch team members');
  return res.json();
}

export async function approveMember(token: string, userId: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}/approve`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to approve member');
  return res.json();
}

export async function rejectMember(token: string, userId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}/reject`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to reject member');
  return res.json();
}

export async function removeMember(token: string, userId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}/remove`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to remove member');
  return res.json();
}
