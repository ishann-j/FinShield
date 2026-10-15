import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import {
  Shield,
  ShieldCheck,
  TrendingUp,
  Zap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  BarChart3,
  X,
  KeyRound,
  UserPlus,
  User,
  Building,
  BadgeCheck
} from 'lucide-react';
import { FinShieldLogo } from '../components/FinShieldLogo.jsx';
import './Login.css';

const GOOGLE_ACCOUNTS = [
  {
    name: 'Aditya Roy',
    email: 'admin@finguard.soc',
    role: 'Admin',
    avatarBg: '#4285F4',
    initial: 'A'
  },
  {
    name: 'Vikram Singh',
    email: 'investigator@finguard.soc',
    role: 'Investigator',
    avatarBg: '#34A853',
    initial: 'V'
  },
  {
    name: 'Priya Sharma',
    email: 'victim@finguard.soc',
    role: 'Victim',
    avatarBg: '#EA4335',
    initial: 'P'
  }
];

export function Login({ initialMode = 'login' }) {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Mode state: 'login' or 'signup'
  const isSignupRoute = location.pathname === '/signup';
  const urlMode = searchParams.get('mode') || searchParams.get('tab') || (isSignupRoute ? 'signup' : null);
  const [authMode, setAuthMode] = useState(urlMode || initialMode || (isSignupRoute ? 'signup' : 'login'));

  useEffect(() => {
    if (location.pathname === '/signup') {
      setAuthMode('signup');
    } else if (location.pathname === '/login') {
      setAuthMode('login');
    } else if (urlMode) {
      setAuthMode(urlMode);
    } else if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [location.pathname, urlMode, initialMode]);

  const handleModeSwitch = (mode) => {
    setAuthMode(mode);
    if (mode === 'signup' && location.pathname !== '/signup') {
      navigate('/signup');
    } else if (mode === 'login' && location.pathname !== '/login') {
      navigate('/login');
    }
    setError('');
    setSignupError('');
  };

  // ----------------------------------------------------
  // LOGIN FORM STATE
  // ----------------------------------------------------
  const [emailOrUser, setEmailOrUser] = useState('admin@finguard.soc');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!emailOrUser.trim() || !password) {
      setError('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    try {
      await login(emailOrUser.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = async (u, p, targetRole) => {
    handleModeSwitch('login');
    setEmailOrUser(u);
    setPassword(p);
    setError('');
    setInfoMessage(`Signing in as ${targetRole}...`);
    setLoading(true);
    try {
      await login(u, p);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // SIGN UP FORM STATE
  // ----------------------------------------------------
  const [signupData, setSignupData] = useState({
    name: '',
    role: 'Victim',
    department: '',
    officialId: '',
    username: '',
    password: '',
    confirmPassword: '',
    securityQuestion: 'What was the name of your first school?',
    securityAnswer: ''
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [signupToast, setSignupToast] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (signupError) setSignupError('');
  };

  const handleSignupReset = () => {
    setSignupData({
      name: '',
      role: 'Victim',
      department: '',
      officialId: '',
      username: '',
      password: '',
      confirmPassword: '',
      securityQuestion: 'What was the name of your first school?',
      securityAnswer: ''
    });
    setSignupError('');
    setSignupSuccess('');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    const {
      name,
      username,
      password: signupPassword,
      confirmPassword,
      role,
      department,
      officialId,
      securityQuestion,
      securityAnswer
    } = signupData;

    const trimmedName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const trimmedAnswer = securityAnswer.trim().toLowerCase();
    const trimmedDept = department.trim();
    const trimmedId = officialId.trim();

    if (trimmedName.length < 2) {
      setSignupError('Please enter your full name.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setSignupError('Username must be 3–20 letters, numbers or underscores.');
      return;
    }

    if (signupPassword.length < 8 || !/[A-Za-z]/.test(signupPassword) || !/\d/.test(signupPassword)) {
      setSignupError('Password needs at least 8 characters, including letters and numbers.');
      return;
    }

    if (signupPassword !== confirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    if (trimmedAnswer.length < 2) {
      setSignupError('Please answer the security question.');
      return;
    }

    if (role === 'Investigator' && (trimmedDept.length < 2 || trimmedId.length < 3)) {
      setSignupError('Investigators must provide their department and official ID.');
      return;
    }

    setSignupLoading(true);

    try {
      await api.signup({
        name: trimmedName,
        username: cleanUsername,
        password: signupPassword,
        confirmPassword,
        role,
        department: trimmedDept,
        officialId: trimmedId,
        securityQuestion,
        securityAnswer: trimmedAnswer
      });

      const message =
        role === 'Victim' || role === 'Citizen'
          ? 'Account created successfully! You can now log in.'
          : 'Account created! An Admin must approve your Investigator badge before login.';

      setSignupSuccess(message);
      setSignupToast(message);

      // Pre-fill login credentials
      setEmailOrUser(cleanUsername);
      setPassword(signupPassword);

      // Switch to login card after brief delay
      setTimeout(() => {
        handleModeSwitch('login');
        setInfoMessage(message);
        setSignupToast('');
      }, 1500);
    } catch (err) {
      setSignupError(err.message || 'Account could not be created. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  // ----------------------------------------------------
  // FORGOT PASSWORD FLOW
  // ----------------------------------------------------
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = request, 2 = verify & reset, 3 = success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [demoCodeHint, setDemoCodeHint] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleOpenForgotModal = () => {
    setForgotStep(1);
    setForgotIdentifier(emailOrUser.trim() || 'admin@finguard.soc');
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setDemoCodeHint('');
    setShowForgotModal(true);
  };

  const handleCloseForgotModal = () => {
    setShowForgotModal(false);
    setForgotError('');
    setForgotSuccess('');
  };

  const handleRequestResetCode = async (e) => {
    if (e) e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your email or username.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const data = await api.requestPasswordReset(forgotIdentifier.trim());
      setDemoCodeHint(data.code || '123456');
      setForgotSuccess(data.message || 'Verification code sent.');
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || 'Unable to request verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');

    if (!forgotCode.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword) {
      setForgotError('Please enter a new password.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setForgotLoading(true);
    try {
      await api.resetPassword(forgotIdentifier.trim(), forgotCode.trim(), forgotNewPassword);
      setPassword(forgotNewPassword);
      setEmailOrUser(forgotIdentifier.trim());
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.message || 'Password reset failed. Check verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Google SSO handler
  const handleGoogleAccountSelect = async (account) => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      await loginWithGoogle(account.email, account.name, account.role);
      setShowGoogleModal(false);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* Top Header */}
      <header className="top-header">
        <a className="brand" href="/" aria-label="FinShield home">
          <div className="brand-mark">
            <FinShieldLogo variant="icon" size={42} light={true} />
          </div>
          <div>
            <div className="brand-name">
              Fin<span>Shield</span>
            </div>
            <div className="brand-tagline">DETECT • PREVENT • PROTECT</div>
          </div>
        </a>

        <div className="header-motto">
          <span>Secure</span>
          <i />
          <span>Smart</span>
          <i />
          <span>Together</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Hero Section */}
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <h1>
              Smarter Finance.
              <span>Safer Tomorrow.</span>
            </h1>
            <p className="hero-description">
              FinShield helps you track, intercept and dismantle financial ad scams — with bank-level security and intelligent graph insights.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <ShieldCheck width={20} height={20} />
                </div>
                <div>
                  <h3>Bank-Grade Security</h3>
                  <p>Encrypted credentials &amp; role-based clearance</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <TrendingUp width={20} height={20} />
                </div>
                <div>
                  <h3>Smart AI Detection</h3>
                  <p>Correlates Telegram, WhatsApp &amp; Meta ad scams</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <Zap width={20} height={20} />
                </div>
                <div>
                  <h3>Fast Interception</h3>
                  <p>Mule network tracking &amp; freeze requests</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Shield Scene */}
          <div className="shield-scene" aria-label="Financial security illustration">
            <div className="scene-stars">
              <span className="star star-1" />
              <span className="star star-2" />
              <span className="star star-3" />
              <span className="star star-4" />
              <span className="star star-5" />
              <span className="star star-6" />
              <span className="star star-7" />
              <span className="star star-8" />
              <span className="star star-9" />
              <span className="star star-10" />
              <span className="star star-11" />
              <span className="star star-12" />
              <span className="star star-13" />
              <span className="star star-14" />
              <span className="star star-15" />
              <span className="star star-16" />
              <span className="star star-17" />
              <span className="star star-18" />
            </div>

            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />

            <div className="platform platform-bottom" />
            <div className="platform platform-middle" />
            <div className="platform platform-top">
              <div className="platform-ring" />
            </div>
            <div className="platform-light" />

            <div className="hero-shield" aria-label="FinShield animated security emblem">
              <FinShieldLogo variant="hero" />
            </div>

            <div className="floating-info info-security">
              <Lock width={18} height={18} />
              <span>Secure<br />Transactions</span>
            </div>

            <div className="floating-info info-tracking">
              <BarChart3 width={19} height={19} />
              <span>Real-time<br />Tracking</span>
            </div>

            <div className="floating-info info-growth">
              <TrendingUp width={19} height={19} />
              <span>Financial<br />Protection</span>
            </div>
          </div>

          {/* Trust and Rating */}
          <div className="trust-row">
            <span className="trusted-copy">
              Trusted by <b>1M+</b> users &amp; cyber units
            </span>
            <div className="avatar-stack" aria-hidden="true">
              <span>👨🏻</span>
              <span>👩🏼</span>
              <span>👨🏽</span>
              <span>👩🏻</span>
            </div>
            <div className="rating-stars">★★★★★</div>
            <b className="rating-score">4.9/5</b>
          </div>
        </section>

        {/* Right Form Section with Switcher and Dynamic Cards */}
        <section className="form-section">
          <div className="auth-card-container">
            {/* Top Switcher: Login and Sign Up in the side */}
            <div className="auth-tab-bar" role="tablist" aria-label="Authentication Selector">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => handleModeSwitch('login')}
              >
                <Lock width={15} height={15} />
                <span>Login</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => handleModeSwitch('signup')}
              >
                <UserPlus width={15} height={15} />
                <span>Sign Up</span>
              </button>
            </div>

            {/* 1. LOGIN CARD OPTION */}
            {authMode === 'login' && (
              <div className="login-card auth-card-fade">
                <form onSubmit={handleLoginSubmit} id="loginForm">
                  {/* Email / Username Field */}
                  <div className="form-field">
                    <label htmlFor="email">Email Address or Username</label>
                    <div className="input-container">
                      <Mail width={18} height={18} />
                      <input
                        id="email"
                        type="text"
                        value={emailOrUser}
                        onChange={(e) => setEmailOrUser(e.target.value)}
                        placeholder="admin@finguard.soc or admin"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="form-field">
                    <label htmlFor="password">Password</label>
                    <div className="input-container">
                      <Lock width={18} height={18} />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        className="visibility-button"
                        id="togglePassword"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff width={18} height={18} /> : <Eye width={18} height={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="form-options">
                    <label className="remember-option">
                      <input
                        id="remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="custom-checkbox">
                        {rememberMe && <Check width={13} height={13} strokeWidth={3} />}
                      </span>
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="text-link"
                      id="forgotBtn"
                      onClick={handleOpenForgotModal}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button className="login-button" type="submit" disabled={loading}>
                    <span>{loading ? 'Authenticating...' : 'Log In'}</span>
                    <ArrowRight width={18} height={18} />
                  </button>

                  {/* Error or Info message */}
                  {error && (
                    <p className="form-message" role="alert">
                      {error}
                    </p>
                  )}
                  {infoMessage && (
                    <p className="form-message success" role="status">
                      {infoMessage}
                    </p>
                  )}
                </form>

                <div className="separator">
                  <span />
                  <p>or</p>
                  <span />
                </div>

                <button
                  className="google-button"
                  type="button"
                  id="googleBtn"
                  onClick={() => setShowGoogleModal(true)}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Continue with Google
                </button>

                <p className="signup-prompt">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    id="signupBtn"
                    onClick={() => handleModeSwitch('signup')}
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            )}

            {/* 2. SIGN UP CARD OPTION (Replaces Login Card) */}
            {authMode === 'signup' && (
              <div className="signup-card auth-card-fade">
                <div className="signup-card-header">
                  <div className="signup-badge-icon" aria-hidden="true">
                    <FinShieldLogo variant="icon" size={30} light={false} />
                  </div>
                  <h2>Create Account</h2>
                  <p>Register as a Citizen or Authorized Investigator</p>
                </div>

                <form id="signupForm" onSubmit={handleSignupSubmit} noValidate>
                  {/* Full Name */}
                  <div className="form-field">
                    <label htmlFor="sn">Full Name</label>
                    <div className="input-container">
                      <User width={17} height={17} />
                      <input
                        id="sn"
                        name="name"
                        type="text"
                        value={signupData.name}
                        onChange={handleSignupChange}
                        autoComplete="name"
                        placeholder="e.g. John Doe"
                        required
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="form-field">
                    <label htmlFor="sr">I am signing up as</label>
                    <div className="input-container">
                      <Shield width={17} height={17} />
                      <select
                        id="sr"
                        name="role"
                        value={signupData.role}
                        onChange={handleSignupChange}
                        className="auth-select"
                      >
                        <option value="Victim">Victim (citizen / reported party)</option>
                        <option value="Investigator">Investigator (law enforcement)</option>
                      </select>
                    </div>
                  </div>

                  {/* Conditional Investigator Fields */}
                  {signupData.role === 'Investigator' && (
                    <div className="investigator-subfields">
                      <div className="form-field" style={{ marginTop: 0 }}>
                        <label htmlFor="sd">Department or Organization</label>
                        <div className="input-container">
                          <Building width={16} height={16} />
                          <input
                            id="sd"
                            name="department"
                            type="text"
                            value={signupData.department}
                            onChange={handleSignupChange}
                            placeholder="e.g. Cyber Crime Cell, State Police"
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label htmlFor="sb">Official ID / Badge</label>
                        <div className="input-container">
                          <BadgeCheck width={16} height={16} />
                          <input
                            id="sb"
                            name="officialId"
                            type="text"
                            value={signupData.officialId}
                            onChange={handleSignupChange}
                            placeholder="e.g. POL-88234"
                          />
                        </div>
                      </div>
                      <p className="investigator-notice">
                        ⓘ Investigator accounts require admin clearance before login.
                      </p>
                    </div>
                  )}

                  {/* Username */}
                  <div className="form-field">
                    <label htmlFor="su1">Username</label>
                    <div className="input-container">
                      <Mail width={17} height={17} />
                      <input
                        id="su1"
                        name="username"
                        type="text"
                        value={signupData.username}
                        onChange={handleSignupChange}
                        autoComplete="username"
                        placeholder="3 to 20 letters, numbers or _"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="form-field">
                    <label htmlFor="sp">Password</label>
                    <div className="input-container">
                      <Lock width={17} height={17} />
                      <input
                        id="sp"
                        name="password"
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupData.password}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                        placeholder="8+ characters, letters &amp; numbers"
                        required
                      />
                      <button
                        className="visibility-button"
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? <EyeOff width={17} height={17} /> : <Eye width={17} height={17} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-field">
                    <label htmlFor="sc">Confirm Password</label>
                    <div className="input-container">
                      <Lock width={17} height={17} />
                      <input
                        id="sc"
                        name="confirmPassword"
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupData.confirmPassword}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                        placeholder="Repeat your password"
                        required
                      />
                    </div>
                  </div>

                  {/* Security Question */}
                  <div className="form-field">
                    <label htmlFor="sq">Security Question (used for reset)</label>
                    <div className="input-container">
                      <KeyRound width={17} height={17} />
                      <select
                        id="sq"
                        name="securityQuestion"
                        value={signupData.securityQuestion}
                        onChange={handleSignupChange}
                        className="auth-select"
                      >
                        <option value="What was the name of your first school?">What was the name of your first school?</option>
                        <option value="What was your first pet's name?">What was your first pet's name?</option>
                        <option value="In which town was your mother born?">In which town was your mother born?</option>
                      </select>
                    </div>
                  </div>

                  {/* Security Answer */}
                  <div className="form-field">
                    <label htmlFor="sa">Security Answer</label>
                    <div className="input-container">
                      <KeyRound width={17} height={17} />
                      <input
                        id="sa"
                        name="securityAnswer"
                        type="text"
                        value={signupData.securityAnswer}
                        onChange={handleSignupChange}
                        placeholder="Your secret answer"
                        required
                      />
                    </div>
                  </div>

                  {/* Error & Success Alerts */}
                  {signupError && (
                    <p className="form-message" role="alert">
                      {signupError}
                    </p>
                  )}
                  {signupSuccess && (
                    <p className="form-message success" role="status">
                      {signupSuccess}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="signup-action-row">
                    <button className="login-button" type="submit" disabled={signupLoading}>
                      <span>{signupLoading ? 'Creating Account...' : 'Create Account'}</span>
                      <ArrowRight width={17} height={17} />
                    </button>
                    <button
                      type="button"
                      className="signup-clear-btn"
                      onClick={handleSignupReset}
                      disabled={signupLoading}
                    >
                      Clear
                    </button>
                  </div>
                </form>

                <p className="signup-prompt" style={{ marginTop: '16px' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                  >
                    Log In
                  </button>
                </p>
              </div>
            )}

            {/* Quick Demo Test Accounts & Data Section */}
            <div className="demo-credentials-card">
              <div className="demo-cred-header">
                <ShieldCheck width={16} height={16} style={{ color: '#38bdf8' }} />
                <span>Test Accounts & Demo Data (1-Click Login)</span>
              </div>
              <p className="demo-cred-desc">
                Testing from a live deployment or another website? Click any test profile below to log in and run the dashboard instantly with full synthetic data:
              </p>

              <div className="demo-cred-grid">
                {/* Admin */}
                <button
                  type="button"
                  className="demo-cred-btn"
                  onClick={() => handleQuickFill('admin', 'Admin@123', 'Admin')}
                  title="Click to sign in as Admin"
                >
                  <div className="demo-cred-badge admin">ADMIN</div>
                  <div className="demo-cred-name">Aditya Roy</div>
                  <div className="demo-cred-role">System Director</div>
                  <div className="demo-cred-meta">
                    <span>User: <b>admin</b></span>
                    <span>Pass: <b>Admin@123</b></span>
                  </div>
                  <div className="demo-cred-action">1-Click Launch ↗</div>
                </button>

                {/* Investigator */}
                <button
                  type="button"
                  className="demo-cred-btn"
                  onClick={() => handleQuickFill('investigator', 'Investigator@123', 'Investigator')}
                  title="Click to sign in as Investigator"
                >
                  <div className="demo-cred-badge inv">INVESTIGATOR</div>
                  <div className="demo-cred-name">Vikram Singh</div>
                  <div className="demo-cred-role">Cyber Crime Cell</div>
                  <div className="demo-cred-meta">
                    <span>User: <b>investigator</b></span>
                    <span>Pass: <b>Investigator@123</b></span>
                  </div>
                  <div className="demo-cred-action">1-Click Launch ↗</div>
                </button>

                {/* Victim / Citizen */}
                <button
                  type="button"
                  className="demo-cred-btn"
                  onClick={() => handleQuickFill('victim', 'Victim@123', 'Victim')}
                  title="Click to sign in as Victim / Citizen"
                >
                  <div className="demo-cred-badge vic">VICTIM / CITIZEN</div>
                  <div className="demo-cred-name">Priya Sharma</div>
                  <div className="demo-cred-role">Citizen / Victim</div>
                  <div className="demo-cred-meta">
                    <span>User: <b>victim</b></span>
                    <span>Pass: <b>Victim@123</b></span>
                  </div>
                  <div className="demo-cred-action">1-Click Launch ↗</div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Decorative waves */}
      <div className="wave wave-back" />
      <div className="wave wave-front" />

      {/* Toast Notification */}
      {signupToast && (
        <div className="signup-toast-fixed" role="status" aria-live="polite">
          <Check width={18} height={18} className="text-emerald-400" />
          <span>{signupToast}</span>
        </div>
      )}

      {/* Google SSO Account Picker Modal */}
      {showGoogleModal && (
        <div className="google-modal-backdrop" onClick={() => setShowGoogleModal(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-body">
              <div className="google-header-logo">
                <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <h2 className="google-modal-title">Choose an account</h2>
              <p className="google-modal-subtitle">
                to continue to <b>FinShield Sentinel</b>
              </p>

              <div className="google-account-list">
                {GOOGLE_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    className="google-account-item"
                    onClick={() => handleGoogleAccountSelect(acc)}
                  >
                    <div className="google-account-avatar" style={{ backgroundColor: acc.avatarBg }}>
                      {acc.initial}
                    </div>
                    <div className="google-account-info">
                      <div className="google-account-name">
                        <span>{acc.name}</span>
                        <span className="google-badge-role">{acc.role}</span>
                      </div>
                      <div className="google-account-email">{acc.email}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="google-custom-account">
                <input
                  type="email"
                  placeholder="Or enter any Google email..."
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customGoogleEmail.trim()) {
                      e.preventDefault();
                      handleGoogleAccountSelect({
                        name: customGoogleEmail.split('@')[0],
                        email: customGoogleEmail.trim(),
                        role: 'Victim'
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customGoogleEmail.trim()) {
                      handleGoogleAccountSelect({
                        name: customGoogleEmail.split('@')[0],
                        email: customGoogleEmail.trim(),
                        role: 'Victim'
                      });
                    }
                  }}
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="google-modal-footer">
              <span>Enterprise Google SSO</span>
              <button
                type="button"
                className="google-cancel-btn"
                onClick={() => setShowGoogleModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="forgot-modal-backdrop" onClick={handleCloseForgotModal}>
          <div className="forgot-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="forgot-modal-close"
              onClick={handleCloseForgotModal}
              aria-label="Close modal"
            >
              <X width={18} height={18} />
            </button>

            <div className="forgot-modal-body">
              {forgotStep === 1 && (
                <form onSubmit={handleRequestResetCode}>
                  <div className="forgot-header-icon">
                    <KeyRound width={26} height={26} />
                  </div>
                  <h2 className="forgot-modal-title">Reset Your Password</h2>
                  <p className="forgot-modal-subtitle">
                    Enter your email or username to receive a secure 6-digit reset code.
                  </p>

                  <div className="form-field">
                    <label htmlFor="forgotEmail">Email or Username</label>
                    <div className="input-container">
                      <Mail width={18} height={18} />
                      <input
                        id="forgotEmail"
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. admin@finguard.soc or admin"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {forgotError && <p className="form-message" role="alert">{forgotError}</p>}

                  <button
                    type="submit"
                    className="login-button"
                    style={{ marginTop: '16px' }}
                    disabled={forgotLoading}
                  >
                    <span>{forgotLoading ? 'Sending Code...' : 'Send Verification Code'}</span>
                    <ArrowRight width={18} height={18} />
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleConfirmResetPassword}>
                  <div className="forgot-header-icon">
                    <Lock width={26} height={26} />
                  </div>
                  <h2 className="forgot-modal-title">Enter Verification Code</h2>
                  <p className="forgot-modal-subtitle">
                    Enter the code for <b>{forgotIdentifier}</b> and set your new password.
                  </p>

                  {demoCodeHint && (
                    <div className="forgot-code-hint">
                      <span>Verification Code:</span>
                      <b>{demoCodeHint}</b>
                    </div>
                  )}

                  <div className="form-field">
                    <label htmlFor="forgotCode">6-Digit Code</label>
                    <div className="input-container">
                      <KeyRound width={18} height={18} />
                      <input
                        id="forgotCode"
                        type="text"
                        maxLength={6}
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value)}
                        placeholder="Enter 6-digit code (e.g. 123456)"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="forgotNewPass">New Password</label>
                    <div className="input-container">
                      <Lock width={18} height={18} />
                      <input
                        id="forgotNewPass"
                        type={showNewPassword ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                      />
                      <button
                        className="visibility-button"
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showNewPassword ? <EyeOff width={18} height={18} /> : <Eye width={18} height={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="forgotConfirmPass">Confirm New Password</label>
                    <div className="input-container">
                      <Lock width={18} height={18} />
                      <input
                        id="forgotConfirmPass"
                        type={showNewPassword ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        required
                      />
                    </div>
                  </div>

                  {forgotError && <p className="form-message" role="alert">{forgotError}</p>}
                  {forgotSuccess && <p className="form-message success" role="status">{forgotSuccess}</p>}

                  <button
                    type="submit"
                    className="login-button"
                    style={{ marginTop: '16px' }}
                    disabled={forgotLoading}
                  >
                    <span>{forgotLoading ? 'Updating Password...' : 'Reset & Save Password'}</span>
                    <ArrowRight width={18} height={18} />
                  </button>

                  <button
                    type="button"
                    className="text-link"
                    style={{ display: 'block', margin: '12px auto 0', textAlign: 'center' }}
                    onClick={() => setForgotStep(1)}
                  >
                    Use different account or resend code
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <div style={{ textAlign: 'center' }}>
                  <div className="forgot-header-icon success">
                    <ShieldCheck width={32} height={32} />
                  </div>
                  <h2 className="forgot-modal-title">Password Reset Complete!</h2>
                  <p className="forgot-modal-subtitle">
                    Your password has been successfully updated. You can now log in immediately.
                  </p>

                  <button
                    type="button"
                    className="login-button"
                    onClick={handleCloseForgotModal}
                    style={{ marginTop: '16px' }}
                  >
                    <span>Return to Login</span>
                    <Check width={18} height={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Login;
