import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { FinShieldLogo } from '../components/FinShieldLogo.jsx';
import './SignUp.css';

export function SignUp() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3200);
  };

  const handleReset = () => {
    setFormData({
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
    setError('');
    setSuccessMsg('');
  };

  const pwOk = (password) =>
    password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const {
      name,
      username,
      password,
      confirmPassword,
      role,
      department,
      officialId,
      securityQuestion,
      securityAnswer
    } = formData;

    const trimmedName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const trimmedAnswer = securityAnswer.trim().toLowerCase();
    const trimmedDept = department.trim();
    const trimmedId = officialId.trim();

    if (trimmedName.length < 2) {
      setError('Enter your full name.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3–20 letters, numbers or underscores.');
      return;
    }

    if (!pwOk(password)) {
      setError('Password needs at least 8 characters, including letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (trimmedAnswer.length < 2) {
      setError('Enter an answer to the security question.');
      return;
    }

    if (role === 'Investigator' && (trimmedDept.length < 2 || trimmedId.length < 3)) {
      setError('Investigators must provide their department and official ID.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.signup({
        name: trimmedName,
        username: cleanUsername,
        password,
        confirmPassword,
        role,
        department: trimmedDept,
        officialId: trimmedId,
        securityQuestion,
        securityAnswer: trimmedAnswer
      });

      const message =
        role === 'Victim' || role === 'Citizen'
          ? 'Account created. You can now log in.'
          : 'Account created. An Admin must approve it before login.';

      setSuccessMsg(message);
      showToast(message);

      // Reset form and transition to login after toast
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setError(err.message || 'Account could not be created. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isInvestigator = formData.role === 'Investigator';

  return (
    <div className="signup-page-container">
      <main className="signup-card">
        <header className="signup-brand">
          <div className="signup-brand-mark" aria-hidden="true">
            <FinShieldLogo variant="icon" size={38} light={false} />
          </div>
          <h1>
            Fin<span>Shield</span>
          </h1>
          <p>Create your account to continue</p>
        </header>

        <form id="signupForm" className="signup-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="sn">Full name</label>
          <input
            id="sn"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            placeholder="e.g. John Doe"
            required
          />

          <label htmlFor="sr">I am signing up as</label>
          <select id="sr" name="role" value={formData.role} onChange={handleChange}>
            <option value="Victim">Victim (citizen / reported party)</option>
            <option value="Investigator">Investigator</option>
          </select>

          {isInvestigator && (
            <div id="investigatorFields" className="signup-investigator-fields">
              <label htmlFor="sd">Department or organization (investigators only)</label>
              <input
                id="sd"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Cyber Crime Cell, State Police"
              />

              <label htmlFor="sb">Official ID (investigators only)</label>
              <input
                id="sb"
                name="officialId"
                type="text"
                value={formData.officialId}
                onChange={handleChange}
                placeholder="e.g. POL-88234"
              />
              <p className="muted-tip">
                Investigator accounts need approval from an Admin before login.
              </p>
            </div>
          )}

          <label htmlFor="su1">Username</label>
          <input
            id="su1"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            placeholder="3 to 20 letters, numbers or _"
            required
          />

          <label htmlFor="sp">Password</label>
          <input
            id="sp"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="8+ characters, letters and numbers"
            required
          />

          <label htmlFor="sc">Confirm password</label>
          <input
            id="sc"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="Repeat your password"
            required
          />

          <label htmlFor="sq">Security question (used to reset your password)</label>
          <select
            id="sq"
            name="securityQuestion"
            value={formData.securityQuestion}
            onChange={handleChange}
          >
            <option value="What was the name of your first school?">
              What was the name of your first school?
            </option>
            <option value="What was your first pet's name?">
              What was your first pet's name?
            </option>
            <option value="In which town was your mother born?">
              In which town was your mother born?
            </option>
          </select>

          <label htmlFor="sa">Answer</label>
          <input
            id="sa"
            name="securityAnswer"
            type="text"
            value={formData.securityAnswer}
            onChange={handleChange}
            placeholder="Your security answer"
            required
          />

          {error && (
            <div id="error" className="signup-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="signup-success" role="status" aria-live="polite">
              {successMsg}
            </div>
          )}

          <div className="signup-actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <button type="button" id="resetBtn" onClick={handleReset} disabled={loading}>
              Clear form
            </button>
          </div>
        </form>

        <div className="signup-login-prompt">
          Already have an account?
          <button type="button" onClick={() => navigate('/login')}>
            Log In
          </button>
        </div>

        <div className="signup-note">
          Demo only: accounts are saved in the system with secure salted password hash.
          Investigator accounts include department and official badge ID verification.
        </div>
      </main>

      {toastMsg && (
        <div id="toast" className="signup-toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default SignUp;
