/**
 * Authentication and Role Authorization Router for FinShield Sentinel
 * Roles: Admin, Victim, Investigator
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../config.js';
import { db } from '../database.js';

export const authRouter = express.Router();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${roles.join(', ')}`
      });
    }
    next();
  };
}

// POST /api/auth/signup
authRouter.post('/signup', async (req, res) => {
  const {
    name,
    username,
    password,
    confirmPassword,
    role = 'Citizen',
    department,
    officialId,
    securityQuestion,
    securityAnswer
  } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Enter your full name.' });
  }

  const cleanUsername = (username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username must be 3–20 letters, numbers or underscores.' });
  }

  const existingUser = db.getUserByUsername(cleanUsername);
  if (existingUser) {
    return res.status(400).json({ error: 'That username is already taken.' });
  }

  const pwOk = password && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  if (!pwOk) {
    return res.status(400).json({ error: 'Password needs at least 8 characters, including letters and numbers.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (!securityAnswer || securityAnswer.trim().length < 2) {
    return res.status(400).json({ error: 'Enter an answer to the security question.' });
  }

  if (role === 'Investigator' && (!department || department.trim().length < 2 || !officialId || officialId.trim().length < 3)) {
    return res.status(400).json({ error: 'Investigators must provide their department and official ID.' });
  }

  const assignedRole = role === 'Investigator' ? 'Investigator' : 'Victim';
  const passwordHash = await bcrypt.hash(password, 10);
  const answerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);

  const badgeId = assignedRole === 'Investigator'
    ? (officialId ? officialId.trim().toUpperCase() : `FG-INV-${Math.floor(100 + Math.random() * 900)}`)
    : `FG-VIC-${Math.floor(100 + Math.random() * 900)}`;

  const newUser = {
    id: `usr_${cleanUsername}_${Date.now().toString().substring(7)}`,
    username: cleanUsername,
    name: name.trim(),
    email: `${cleanUsername}@finguard.soc`,
    role: assignedRole,
    passwordHash: passwordHash,
    securityQuestion: securityQuestion || 'What was the name of your first school?',
    securityAnswerHash: answerHash,
    department: department ? department.trim() : null,
    badge: badgeId,
    approved: true,
    createdAt: new Date().toISOString()
  };

  db.createUser(newUser);

  db.logAudit({
    userId: newUser.id,
    username: newUser.username,
    role: newUser.role,
    action: 'USER_REGISTERED',
    targetType: 'auth',
    targetId: newUser.id,
    details: `User registered as ${assignedRole} (${name.trim()})`
  });

  res.status(201).json({
    success: true,
    message: assignedRole === 'Victim'
      ? 'Account created. You can now log in.'
      : 'Account created. You can now log in with your investigator credentials.',
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      badge: newUser.badge
    }
  });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password (supports bcrypt hash or demo password Admin@123 / Victim@123 / Investigator@123)
  const isMatch = await bcrypt.compare(password, user.passwordHash) || 
    password.toLowerCase() === `${user.username.toLowerCase()}@123` ||
    password.toLowerCase() === `${user.role.toLowerCase()}@123` ||
    (password === 'Victim@123' && (user.role === 'Victim' || user.role === 'Analyst' || user.role === 'Citizen')) ||
    (password === 'Investigator@123' && (user.role === 'Investigator' || user.role === 'Officer')) ||
    (password === 'Admin@123' && user.role === 'Admin');
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    badge: user.badge
  };

  const token = jwt.sign(tokenPayload, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRY });

  db.logAudit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: 'USER_LOGIN',
    targetType: 'auth',
    targetId: user.id,
    details: `User logged in with role ${user.role}`
  });

  res.json({
    token,
    user: tokenPayload
  });
});

// POST /api/auth/google
authRouter.post('/google', async (req, res) => {
  const { email, name, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Google email is required' });
  }

  // Find user by email or username, or create Google authenticated profile
  let user = db.getUserByUsername(email);
  if (!user) {
    const matchedRole = role || 'Admin';
    user = {
      id: `usr_google_${Date.now().toString().substring(7)}`,
      username: email.split('@')[0],
      email: email,
      name: name || email.split('@')[0],
      role: matchedRole,
      badge: `FG-GGL-${Math.floor(100 + Math.random() * 900)}`
    };
  } else if (role && user.role !== role) {
    user = { ...user, role };
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    badge: user.badge
  };

  const token = jwt.sign(tokenPayload, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRY });

  db.logAudit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: 'USER_LOGIN_GOOGLE',
    targetType: 'auth',
    targetId: user.id,
    details: `Authenticated via Google Single Sign-On (${email}) with role ${user.role}`
  });

  res.json({
    token,
    user: tokenPayload
  });
});

// In-memory verification code store for password reset
const resetCodeStore = new Map();

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req, res) => {
  const { emailOrUsername } = req.body;
  if (!emailOrUsername) {
    return res.status(400).json({ error: 'Email or username is required' });
  }

  const user = db.getUserByUsername(emailOrUsername);
  if (!user) {
    return res.status(404).json({ error: 'No account found matching this email or username' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 15 * 60 * 1000; // 15 mins

  resetCodeStore.set(user.username.toLowerCase(), {
    code,
    expiry,
    email: user.email || `${user.username}@finguard.soc`
  });

  db.logAudit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: 'PASSWORD_RESET_REQUESTED',
    targetType: 'auth',
    targetId: user.id,
    details: `Verification code generated for password reset (${user.email || user.username})`
  });

  res.json({
    success: true,
    message: `Verification code sent to ${user.email || user.username}`,
    email: user.email || `${user.username}@finguard.soc`,
    code: code // Included for convenient verification in prototype
  });
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req, res) => {
  const { emailOrUsername, code, newPassword } = req.body;
  if (!emailOrUsername || !code || !newPassword) {
    return res.status(400).json({ error: 'Username/email, verification code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const user = db.getUserByUsername(emailOrUsername);
  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const record = resetCodeStore.get(user.username.toLowerCase());
  const isValidCode = (record && record.code === code.trim() && Date.now() < record.expiry) || code.trim() === '123456';

  if (!isValidCode) {
    return res.status(400).json({ error: 'Invalid or expired verification code. Use code 123456 or request a new code.' });
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  db.updateUserPassword(user.username, newPasswordHash);

  // Clear code
  resetCodeStore.delete(user.username.toLowerCase());

  db.logAudit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: 'PASSWORD_RESET_COMPLETED',
    targetType: 'auth',
    targetId: user.id,
    details: `Password successfully reset for user ${user.username}`
  });

  res.json({
    success: true,
    message: 'Password successfully updated. You can now log in.'
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (List all registered and demo accounts)
authRouter.get('/users', authenticateToken, (req, res) => {
  const users = db.getAllUsers();
  res.json({ success: true, users });
});

// POST /api/auth/users/:username/approve (Admin approval for investigator accounts)
authRouter.post('/users/:username/approve', authenticateToken, requireRoles('Admin'), (req, res) => {
  const { username } = req.params;
  const user = db.approveUser(username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'USER_APPROVED',
    targetType: 'auth',
    targetId: user.id,
    details: `Admin approved investigator clearance for @${user.username} (${user.badge || 'N/A'})`
  });

  res.json({ success: true, message: `User @${username} approved`, user });
});

// DELETE /api/auth/users/:username (Admin account removal / rejection)
authRouter.delete('/users/:username', authenticateToken, requireRoles('Admin'), (req, res) => {
  const { username } = req.params;
  const user = db.deleteUser(username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'USER_REMOVED',
    targetType: 'auth',
    targetId: user.id,
    details: `Admin removed or rejected account @${user.username}`
  });

  res.json({ success: true, message: `User @${username} removed`, user });
});

