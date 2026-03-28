

'use strict';


const MAX_BOOKINGS = 20;

const FARES = {
  Ola: {
    logo: 'O', logoClass: 'ola-logo', tag: 'India\'s Ride App',
    rides: [
      { type: 'Bike', icon: '🏍️', ratePerKm: 5, basePrice: 25, eta: '3 min' },
      { type: 'Mini', icon: '🚗', ratePerKm: 10, basePrice: 40, eta: '5 min' },
      { type: 'Sedan', icon: '🚙', ratePerKm: 15, basePrice: 60, eta: '7 min' },
    ]
  },
  Uber: {
    logo: 'U', logoClass: 'uber-logo', tag: 'Reliable · Fast',
    rides: [
      { type: 'Bike', icon: '🏍️', ratePerKm: 6, basePrice: 28, eta: '4 min' },
      { type: 'Mini', icon: '🚗', ratePerKm: 11, basePrice: 45, eta: '6 min' },
      { type: 'Sedan', icon: '🚙', ratePerKm: 16, basePrice: 65, eta: '8 min' },
    ]
  },
  Rapido: {
    logo: 'R', logoClass: 'rapido-logo', tag: 'Bike Taxi Leader',
    rides: [
      { type: 'Bike Lite', icon: '🛵', ratePerKm: 3.5, basePrice: 15, eta: '2 min' },
      { type: 'Bike', icon: '🏍️', ratePerKm: 4, basePrice: 20, eta: '3 min' },
    ]
  }
};

const SAMPLE_ROUTES = [
  { from: 'Connaught Place', to: 'IGI Airport' },
  { from: 'Bandra West', to: 'Lower Parel' },
  { from: 'Koramangala', to: 'Whitefield' },
  { from: 'Hitech City', to: 'Secunderabad' },
];


const store = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        const b = store.get('farex_bookings', []);
        if (b.length > 0) {
          b.shift();
          localStorage.setItem('farex_bookings', JSON.stringify(b));
          return store.set(key, val);
        }
      }
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { }
  }
};

const session = {
  get() { return store.get('farex_session', null); },
  set(userObj) { store.set('farex_session', userObj); },
  clear() { store.remove('farex_session'); }
};

const users = {
  getAll() { return store.get('farex_users', []); },
  find(email) { return users.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()); },
  add(u) {
    const all = users.getAll();
    all.push(u);
    store.set('farex_users', all);
  }
};


const bookings = {
  getAll() { return store.get('farex_bookings', []); },
  forUser(email) {
    return bookings.getAll().filter(b => b.user.toLowerCase() === email.toLowerCase());
  },
  add(b) {
    let all = bookings.getAll();
    // FIFO cap
    if (all.length >= MAX_BOOKINGS) all.shift();
    all.push(b);
    store.set('farex_bookings', all);
  },
  removeById(id) {
    let all = bookings.getAll().filter(b => bookingKey(b) !== id);
    store.set('farex_bookings', all);
  },
  clearForUser(email) {
    let all = bookings.getAll().filter(b => b.user.toLowerCase() !== email.toLowerCase());
    store.set('farex_bookings', all);
  }
};


const recent = {
  get() { return store.get('farex_recent', []); },
  add(from, to) {
    let r = recent.get();
    // Remove duplicate
    r = r.filter(x => !(x.from === from && x.to === to));
    r.unshift({ from, to });
    if (r.length > 5) r = r.slice(0, 5);
    store.set('farex_recent', r);
  }
};

function navigate(page) {
  const app = document.getElementById('app');
  const user = session.get();

  if ((page === 'compare' || page === 'myrides') && !user) {
    page = 'login';
  }

  document.querySelectorAll('.nav-btn').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  const nav = document.getElementById('navMenu');
  if (nav.classList.contains('show')) {
    const toggler = document.querySelector('.navbar-toggler');
    if (toggler) toggler.click();
  }

  switch (page) {
    case 'home': renderHome(app); break;
    case 'login': renderLogin(app); break;
    case 'signup': renderSignup(app); break;
    case 'compare': renderCompare(app); break;
    case 'myrides': renderMyRides(app); break;
    case 'contact': renderContact(app); break;
    default: renderHome(app);
  }
}

function updateNav() {
  const user = session.get();
  const loggedIn = !!user;

  document.getElementById('navCompare').style.display = loggedIn ? '' : 'none';
  document.getElementById('navRides').style.display = loggedIn ? '' : 'none';
  document.getElementById('navLogout').style.display = loggedIn ? '' : 'none';
  document.getElementById('navLogin').style.display = loggedIn ? 'none' : '';
}

function logout() {
  const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
  modal.show();
}

function confirmLogout() {
  const modalEl = document.getElementById('logoutModal');
  bootstrap.Modal.getInstance(modalEl).hide();
  session.clear();
  updateNav();
  showToast('Logged out. See you soon! 👋', 'info');
  navigate('home');
}

function renderHome(app) {
  const user = session.get();
  app.innerHTML = `
  <!-- HERO -->
  <section class="hero-section">
    <div class="hero-bg-orb orb-1"></div>
    <div class="hero-bg-orb orb-2"></div>
    <div class="hero-bg-orb orb-3"></div>
    <div class="container py-3">
      <div class="row align-items-center g-5">
        <div class="col-lg-6">
          <div class="hero-badge">
            <i class="bi bi-stars"></i> India's smartest fare comparison
          </div>
          <h1 class="hero-title">
            Compare Fares.<br><span>Ride Smart.</span>
          </h1>
          <p class="hero-sub">
            Instantly compare prices across Ola, Uber & Rapido.
            Find the best deal, see it on a map, and book in seconds.
          </p>
          <div class="hero-cta-wrap">
            <button class="btn-hero" onclick="${user ? "navigate('compare')" : "navigate('signup')"}">
              <i class="bi bi-search"></i>
              ${user ? 'Start Comparing' : 'Get Started Free'}
            </button>
            ${user ? '' : `<button class="btn-hero-ghost" onclick="navigate('login')">
              <i class="bi bi-person-circle"></i>Sign In
            </button>`}
          </div>
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-num">3+</span>
              <span class="stat-label">Services</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">7+</span>
              <span class="stat-label">Ride Types</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">100%</span>
              <span class="stat-label">Free to Use</span>
            </div>
          </div>
        </div>
        <div class="col-lg-6 hero-visual">
          <div class="hero-phone-card">
            <div class="mb-3">
              <div style="font-size:0.7rem;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:0.5rem;">BEST RESULTS FOR</div>
              <div style="font-weight:700;color:white;font-family:var(--font-display);">Connaught Place → IGI Airport</div>
              <div style="font-size:0.78rem;color:rgba(255,255,255,0.4);">Approx. 23 km · 3 options</div>
            </div>
            <div class="mini-service-card best">
              <div>
                <div class="mini-s-name">Rapido <span class="best-badge">Best Price</span></div>
                <div class="mini-s-type">Bike Lite · 2 min away</div>
              </div>
              <div class="mini-s-price price-green">₹95</div>
            </div>
            <div class="mini-service-card">
              <div>
                <div class="mini-s-name">Ola</div>
                <div class="mini-s-type">Bike · 3 min away</div>
              </div>
              <div class="mini-s-price price-orange">₹140</div>
            </div>
            <div class="mini-service-card">
              <div>
                <div class="mini-s-name">Uber</div>
                <div class="mini-s-type">Bike · 4 min away</div>
              </div>
              <div class="mini-s-price price-yellow">₹166</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FEATURES STRIP -->
  <section class="features-strip">
    <div class="container">
      <div class="row g-3">
        <div class="col-6 col-lg-3">
          <div class="feature-chip" style="animation-delay:0.05s">
            <div class="feature-chip-icon bg-orange-soft"><i class="bi bi-speedometer2"></i></div>
            <div class="feature-chip-text">
              <strong>Instant Compare</strong>
              <span>Real-time pricing</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="feature-chip" style="animation-delay:0.1s">
            <div class="feature-chip-icon bg-green-soft"><i class="bi bi-piggy-bank-fill"></i></div>
            <div class="feature-chip-text">
              <strong>Best Price</strong>
              <span>Auto-highlighted</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="feature-chip" style="animation-delay:0.15s">
            <div class="feature-chip-icon bg-yellow-soft"><i class="bi bi-map-fill"></i></div>
            <div class="feature-chip-text">
              <strong>Live Map</strong>
              <span>See your route</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="feature-chip" style="animation-delay:0.2s">
            <div class="feature-chip-icon bg-purple-soft"><i class="bi bi-shield-check-fill"></i></div>
            <div class="feature-chip-text">
              <strong>Secure</strong>
              <span>Offline-first app</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="how-section">
    <div class="container">
      <div class="section-center-eyebrow"><i class="bi bi-info-circle me-1"></i>Simple Process</div>
      <h2 class="section-center-title">How RideSync Works</h2>
      <p class="section-center-sub">Three easy steps to find the best ride deal in your city.</p>
      <div class="row g-0 justify-content-center">
        <div class="col-md-4">
          <div class="step-card" style="animation-delay:0.05s">
            <div class="step-num">1</div>
            <div style="font-size:2.5rem;margin-bottom:1rem;">📍</div>
            <div class="step-title">Enter Locations</div>
            <div class="step-desc">Type your pickup point and destination, or use GPS to auto-detect your current location.</div>
            <div class="step-connector"></div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="step-card" style="animation-delay:0.15s">
            <div class="step-num">2</div>
            <div style="font-size:2.5rem;margin-bottom:1rem;">⚖️</div>
            <div class="step-title">Compare Fares</div>
            <div class="step-desc">We instantly compare Ola, Uber & Rapido fares for all ride types and highlight the cheapest option.</div>
            <div class="step-connector"></div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="step-card" style="animation-delay:0.25s">
            <div class="step-num">3</div>
            <div style="font-size:2.5rem;margin-bottom:1rem;">🚀</div>
            <div class="step-title">Book & Ride</div>
            <div class="step-desc">Pick your ride, confirm the booking, and open the app directly to start your journey.</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- BENEFITS -->
  <section class="benefits-section">
    <div class="container">
      <div class="section-center-eyebrow"><i class="bi bi-star-fill me-1"></i>Why Choose Us</div>
      <h2 class="section-center-title">Built for Smart Riders</h2>
      <p class="section-center-sub">Everything you need to make the best ride decision, every single time.</p>
      <div class="row g-4">
        <div class="col-md-4" style="animation-delay:0.05s">
          <div class="benefit-card">
            <div class="benefit-icon bg-orange-soft"><i class="bi bi-currency-rupee"></i></div>
            <div class="benefit-title">Save Money Every Trip</div>
            <div class="benefit-desc">Our smart comparison engine finds fare differences up to 40% across services. The savings add up fast.</div>
          </div>
        </div>
        <div class="col-md-4" style="animation-delay:0.1s">
          <div class="benefit-card">
            <div class="benefit-icon bg-green-soft"><i class="bi bi-lightning-charge-fill"></i></div>
            <div class="benefit-title">Lightning Fast Results</div>
            <div class="benefit-desc">No waiting. Fare results appear in under 2 seconds with real-time pricing across all available ride types.</div>
          </div>
        </div>
        <div class="col-md-4" style="animation-delay:0.15s">
          <div class="benefit-card">
            <div class="benefit-icon bg-yellow-soft"><i class="bi bi-map-fill"></i></div>
            <div class="benefit-title">See Your Route on Map</div>
            <div class="benefit-desc">Visual route preview with pickup and drop markers powered by OpenStreetMap — fully free, no API key needed.</div>
          </div>
        </div>
        <div class="col-md-4" style="animation-delay:0.2s">
          <div class="benefit-card">
            <div class="benefit-icon bg-purple-soft"><i class="bi bi-clock-history"></i></div>
            <div class="benefit-title">Complete Ride History</div>
            <div class="benefit-desc">All your bookings saved locally. Revisit past trips, track spend, and manage your ride history anytime.</div>
          </div>
        </div>
        <div class="col-md-4" style="animation-delay:0.25s">
          <div class="benefit-card">
            <div class="benefit-icon bg-orange-soft"><i class="bi bi-phone-fill"></i></div>
            <div class="benefit-title">Open In-App Instantly</div>
            <div class="benefit-desc">One tap opens the Ola, Uber, or Rapido app on your phone directly. No copy-pasting, no friction.</div>
          </div>
        </div>
        <div class="col-md-4" style="animation-delay:0.3s">
          <div class="benefit-card">
            <div class="benefit-icon bg-green-soft"><i class="bi bi-moon-stars-fill"></i></div>
            <div class="benefit-title">Dark Mode & Privacy</div>
            <div class="benefit-desc">Fully offline, dark-mode ready, and all data stays on your device. No tracking, no servers, no nonsense.</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-4 col-md-6">
          <div class="footer-brand">
            <i class="bi bi-signpost-split-fill me-2" style="color:var(--brand-orange)"></i>Ride<span style="color:var(--brand-orange)">Sync</span>
          </div>
          <div class="footer-tagline">Compare Fares. Ride Smart. Save More.</div>
          <div style="color:rgba(255,255,255,0.35);font-size:0.82rem;line-height:1.7;max-width:280px;">
            India's smartest ride fare comparison tool. Built for daily commuters who deserve better deals.
          </div>
        </div>
        <div class="col-lg-2 col-md-3 col-6">
          <div class="footer-heading">Navigate</div>
          <button class="footer-link" onclick="navigate('home')"><i class="bi bi-house-door me-2 opacity-50"></i>Home</button>
          <button class="footer-link" onclick="navigate('compare')"><i class="bi bi-bar-chart-line me-2 opacity-50"></i>Compare</button>
          <button class="footer-link" onclick="navigate('myrides')"><i class="bi bi-clock-history me-2 opacity-50"></i>My Rides</button>
          <button class="footer-link" onclick="navigate('contact')"><i class="bi bi-chat-dots me-2 opacity-50"></i>Contact</button>
        </div>
        <div class="col-lg-2 col-md-3 col-6">
          <div class="footer-heading">Services</div>
          <div class="footer-link" style="cursor:default"><i class="bi bi-circle-fill me-2" style="font-size:0.4rem;vertical-align:middle;opacity:0.4;color:var(--brand-yellow)"></i>Ola</div>
          <div class="footer-link" style="cursor:default"><i class="bi bi-circle-fill me-2" style="font-size:0.4rem;vertical-align:middle;opacity:0.4;color:white"></i>Uber</div>
          <div class="footer-link" style="cursor:default"><i class="bi bi-circle-fill me-2" style="font-size:0.4rem;vertical-align:middle;opacity:0.4;color:var(--brand-orange)"></i>Rapido</div>
        </div>
        <div class="col-lg-4 col-md-6">
          <div class="footer-heading">Connect</div>
          <div style="color:rgba(255,255,255,0.4);font-size:0.82rem;margin-bottom:1rem;">
            <i class="bi bi-envelope me-2"></i>hello@ridesync.app
          </div>
          <div class="social-row">
            <a href="#" class="social-btn" title="Twitter/X"><i class="bi bi-twitter-x"></i></a>
            <a href="#" class="social-btn" title="Instagram"><i class="bi bi-instagram"></i></a>
            <a href="#" class="social-btn" title="LinkedIn"><i class="bi bi-linkedin"></i></a>
            <a href="#" class="social-btn" title="GitHub"><i class="bi bi-github"></i></a>
          </div>
        </div>
      </div>
      <hr class="footer-divider"/>
      <div class="footer-copy">© 2025 RideSync. Made with <i class="bi bi-heart-fill" style="color:var(--brand-orange)"></i> for Indian commuters.</div>
    </div>
  </footer>
  `;
}

function renderLogin(app) {
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo-wrap">
        <div class="auth-logo-icon"><i class="bi bi-signpost-split-fill"></i></div>
        <h2 class="auth-title">Welcome back</h2>
        <p class="auth-subtitle">Sign in to your RideSync account</p>
      </div>

      <form id="loginForm" novalidate autocomplete="off">
        <div class="mb-3">
          <label class="form-label">Email Address</label>
          <div class="input-icon-wrap">
            <i class="bi bi-envelope-fill input-icon"></i>
            <input type="email" class="form-control" id="loginEmail" placeholder="you@example.com" autocomplete="email"/>
          </div>
          <div class="form-error" id="loginEmailErr">Please enter a valid email.</div>
        </div>

        <div class="mb-4">
          <label class="form-label">Password</label>
          <div class="input-icon-wrap pass-wrap">
            <i class="bi bi-lock-fill input-icon"></i>
            <input type="password" class="form-control" id="loginPass" placeholder="Enter your password" autocomplete="current-password"/>
            <button type="button" class="btn-eye" onclick="togglePass('loginPass','loginEyeIcon')" title="Show/hide password">
              <i class="bi bi-eye-fill" id="loginEyeIcon"></i>
            </button>
          </div>
          <div class="form-error" id="loginPassErr">Password is required.</div>
          <div class="form-error" id="loginCredsErr">Incorrect email or password.</div>
        </div>

        <button type="submit" class="btn-grad w-100 py-3">
          <i class="bi bi-arrow-right-circle-fill me-2"></i>Sign In
        </button>
      </form>

      <div class="divider-auth">or</div>

      <p class="text-center" style="font-size:0.9rem;color:var(--brand-muted)">
        Don't have an account?
        <a href="#" onclick="navigate('signup')" style="color:var(--brand-orange);font-weight:600;text-decoration:none;">
          Create one free
        </a>
      </p>
    </div>
  </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    handleLogin();
  });
}

function handleLogin() {
  // Reset errors
  clearErrors(['loginEmailErr', 'loginPassErr', 'loginCredsErr']);
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  let valid = true;

  if (!isValidEmail(email)) {
    showError('loginEmailErr'); valid = false;
  }
  if (!pass) {
    showError('loginPassErr'); valid = false;
  }
  if (!valid) return;

  const user = users.find(email);
  if (!user || user.password !== hashish(pass)) {
    showError('loginCredsErr'); return;
  }

  session.set({ name: user.name, email: user.email });
  updateNav();
  showToast(`Welcome back, ${user.name}! 🎉`);
  navigate('compare');
}

function renderSignup(app) {
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo-wrap">
        <div class="auth-logo-icon"><i class="bi bi-signpost-split-fill"></i></div>
        <h2 class="auth-title">Create account</h2>
        <p class="auth-subtitle">Join RideSync and start saving on rides</p>
      </div>

      <form id="signupForm" novalidate autocomplete="off">
        <div class="mb-3">
          <label class="form-label">Full Name</label>
          <div class="input-icon-wrap">
            <i class="bi bi-person-fill input-icon"></i>
            <input type="text" class="form-control" id="signupName" placeholder="Your full name"/>
          </div>
          <div class="form-error" id="signupNameErr">Please enter your name (min 2 chars).</div>
        </div>

        <div class="mb-3">
          <label class="form-label">Email Address</label>
          <div class="input-icon-wrap">
            <i class="bi bi-envelope-fill input-icon"></i>
            <input type="email" class="form-control" id="signupEmail" placeholder="you@example.com"/>
          </div>
          <div class="form-error" id="signupEmailErr">Please enter a valid email.</div>
          <div class="form-error" id="signupDupErr">An account with this email already exists.</div>
        </div>

        <div class="mb-4">
          <label class="form-label">Password</label>
          <div class="input-icon-wrap pass-wrap">
            <i class="bi bi-lock-fill input-icon"></i>
            <input type="password" class="form-control" id="signupPass" placeholder="Minimum 6 characters"/>
            <button type="button" class="btn-eye" onclick="togglePass('signupPass','signupEyeIcon')" title="Show/hide password">
              <i class="bi bi-eye-fill" id="signupEyeIcon"></i>
            </button>
          </div>
          <div class="form-error" id="signupPassErr">Password must be at least 6 characters.</div>
        </div>

        <button type="submit" class="btn-grad w-100 py-3">
          <i class="bi bi-person-plus-fill me-2"></i>Create Account
        </button>
      </form>

      <div class="divider-auth">or</div>

      <p class="text-center" style="font-size:0.9rem;color:var(--brand-muted)">
        Already have an account?
        <a href="#" onclick="navigate('login')" style="color:var(--brand-orange);font-weight:600;text-decoration:none;">
          Sign in
        </a>
      </p>
    </div>
  </div>
  `;

  document.getElementById('signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    handleSignup();
  });
}

function handleSignup() {
  clearErrors(['signupNameErr', 'signupEmailErr', 'signupDupErr', 'signupPassErr']);
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPass').value;
  let valid = true;

  if (name.length < 2) { showError('signupNameErr'); valid = false; }
  if (!isValidEmail(email)) { showError('signupEmailErr'); valid = false; }
  if (pass.length < 6) { showError('signupPassErr'); valid = false; }
  if (!valid) return;

  if (users.find(email)) { showError('signupDupErr'); return; }

  users.add({ name, email, password: hashish(pass) });
  session.set({ name, email });
  updateNav();
  showToast(`Welcome to RideSync, ${name}! 🚀`);
  navigate('compare');
}

function renderCompare(app) {
  // Only show searches that were made this session (after doCompare is called)
  // We read from store but only show if non-empty (seeded data removed — see seedSampleData fix)
  const recentSearches = recent.get();

  app.innerHTML = `
  <div class="page-section">
    <div class="container">

      <!-- Compare Input Card -->
      <div class="compare-hero">
        <div class="section-eyebrow"><i class="bi bi-bar-chart-line-fill me-1"></i>Smart Comparison</div>
        <h2 class="section-title">Where are you headed?</h2>
        <p style="color:var(--brand-muted);font-size:0.9rem;margin-bottom:2rem;">Enter your pickup and destination to compare live fares.</p>

        <div class="row g-3 align-items-start">
          <!-- Pickup -->
          <div class="col-md-5">
            <label class="form-label"><i class="bi bi-record-circle-fill me-1" style="color:var(--brand-green)"></i>Pickup Location</label>
            <div class="location-input-wrap">
              <span class="location-dot dot-green"></span>
              <input type="text" class="form-control" id="pickupInput" placeholder="Enter pickup point"/>
            </div>
            <div class="form-error" id="pickupErr">Please enter a pickup location.</div>
          </div>

          <!-- Swap icon (desktop) -->
          <div class="col-md-2 text-center d-none d-md-flex align-items-end justify-content-center pb-1" style="min-height:68px;">
            <button class="btn-outline-brand px-3 py-2" onclick="swapLocations()" title="Swap locations">
              <i class="bi bi-arrow-left-right"></i>
            </button>
          </div>

          <!-- Destination -->
          <div class="col-md-5">
            <label class="form-label"><i class="bi bi-geo-alt-fill me-1" style="color:var(--brand-orange)"></i>Destination</label>
            <div class="location-input-wrap">
              <span class="location-dot dot-orange"></span>
              <input type="text" class="form-control" id="destInput" placeholder="Enter destination"/>
            </div>
            <div class="form-error" id="destErr">Please enter a destination.</div>
          </div>
        </div>

        <!-- Actions row -->
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3 mb-3">
          <button class="btn-current-loc" onclick="useCurrentLocation()">
            <i class="bi bi-crosshair2"></i> Use Current Location
          </button>
          <button class="btn-current-loc d-md-none" onclick="swapLocations()">
            <i class="bi bi-arrow-down-up"></i> Swap
          </button>
        </div>

        <!-- Same location error -->
        <div class="form-error" id="sameLocErr">Pickup and destination cannot be the same.</div>

        <!-- Recent searches — only shown after user has searched -->
        ${recentSearches.length > 0 ? `
        <div class="mb-3">
          <div style="font-size:0.78rem;color:var(--brand-muted);font-weight:600;letter-spacing:0.5px;margin-bottom:0.5rem;">
            <i class="bi bi-clock-history me-1"></i>RECENT SEARCHES
          </div>
          <div class="d-flex flex-wrap">
            ${recentSearches.map(r => `
              <span class="recent-pill" onclick="fillRoute('${escapeHtml(r.from)}','${escapeHtml(r.to)}')">
                <i class="bi bi-arrow-right-short"></i>${escapeHtml(r.from)} → ${escapeHtml(r.to)}
              </span>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <button class="btn-grad px-5 py-3" onclick="doCompare()">
          <i class="bi bi-search me-2"></i>Compare Fares
        </button>

        <!-- Map -->
        <div id="mapContainer" style="display:none">
          <div id="rideMap"></div>
        </div>
      </div>

      <!-- Results container -->
      <div id="resultsContainer"></div>

    </div>
  </div>
  `;
}

function fillRoute(from, to) {
  const p = document.getElementById('pickupInput');
  const d = document.getElementById('destInput');
  if (p) p.value = from;
  if (d) d.value = to;
}

function swapLocations() {
  const p = document.getElementById('pickupInput');
  const d = document.getElementById('destInput');
  if (!p || !d) return;
  const tmp = p.value;
  p.value = d.value;
  d.value = tmp;
}

function useCurrentLocation() {
  const p = document.getElementById('pickupInput');
  if (!p) return;

  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser.', 'info');
    return;
  }

  p.placeholder = 'Detecting location…';
  p.disabled = true;

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      const { latitude, longitude } = pos.coords;

      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        .then(r => r.json())
        .then(data => {
          const addr = data.address;
          const label = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || 'Current Location';
          const city = addr.city || addr.town || addr.state_district || '';
          p.value = city ? `${label}, ${city}` : label;
          p.disabled = false;
          p.placeholder = 'Enter pickup point';
          showToast('📍 Location detected!', 'info');
          if (window._rideMap) {
            updateMapPickup(latitude, longitude, p.value);
          }
        })
        .catch(() => {
          p.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          p.disabled = false;
          p.placeholder = 'Enter pickup point';
          showToast('📍 Location detected!', 'info');
        });
    },
    function () {
      p.disabled = false;
      p.placeholder = 'Enter pickup point';
      showToast('Could not get your location. Please enter manually.', 'info');
    },
    { timeout: 8000 }
  );
}


function calcDistance(from, to) {
  let seed = 0;
  const str = (from + to).toLowerCase();
  for (let i = 0; i < str.length; i++) seed += str.charCodeAt(i);
  // Deterministic but varied: 2km – 45km range
  const base = ((seed * 31) % 43) + 2;
  const decimal = ((seed * 7) % 10) / 10;
  return +(base + decimal).toFixed(1);
}

function calcFare(ratePerKm, basePrice, distKm) {
  return Math.round(basePrice + ratePerKm * distKm);
}

function findCheapest(results) {
  let min = Infinity, cheapestService = null, cheapestRide = null;
  results.forEach(svc => {
    svc.rides.forEach(r => {
      if (r.fare < min) { min = r.fare; cheapestService = svc.service; cheapestRide = r.type; }
    });
  });
  return { service: cheapestService, ride: cheapestRide, fare: min };
}

function doCompare() {
  clearErrors(['pickupErr', 'destErr', 'sameLocErr']);
  const from = document.getElementById('pickupInput').value.trim();
  const to = document.getElementById('destInput').value.trim();
  let valid = true;

  if (!from) { showError('pickupErr'); valid = false; }
  if (!to) { showError('destErr'); valid = false; }
  if (!valid) return;

  if (from.toLowerCase() === to.toLowerCase()) { showError('sameLocErr'); return; }

  const distance = calcDistance(from, to);

  recent.add(from, to);

  const results = Object.entries(FARES).map(([service, data]) => ({
    service,
    logo: data.logo,
    logoClass: data.logoClass,
    tag: data.tag,
    rides: data.rides.map(r => ({
      type: r.type, icon: r.icon, eta: r.eta,
      ratePerKm: r.ratePerKm,
      fare: calcFare(r.ratePerKm, r.basePrice, distance)
    }))
  }));

  const cheapest = findCheapest(results);

  const container = document.getElementById('resultsContainer');
  container.innerHTML = `
  <div class="spinner-wrap">
    <div class="custom-spinner"></div>
    <span class="spinner-text">Fetching best fares for you…</span>
  </div>`;


  showMap(from, to);
  setTimeout(() => {
    renderResults(container, results, cheapest, from, to, distance);
  }, 1500);
}
function renderResults(container, results, cheapest, from, to, distance) {
  const cardsHtml = results.map((svc, idx) => {
    const isCheapest = svc.service === cheapest.service;


    const ridesHtml = svc.rides.map(r => {
      const isThisCheapest = (svc.service === cheapest.service && r.type === cheapest.ride);
      const safeFrom = escapeHtml(from);
      const safeTo = escapeHtml(to);
      const safeService = escapeHtml(svc.service);
      const safeType = escapeHtml(r.type);
      return `
      <div class="ride-option-row">
        <div class="ride-type-info">
          <div class="ride-icon">${r.icon}</div>
          <div>
            <div class="ride-name">
              ${r.type}
              ${isThisCheapest ? '<span class="cheapest-row-badge">Cheapest</span>' : ''}
            </div>
            <div class="ride-eta"><i class="bi bi-clock me-1"></i>${r.eta}</div>
          </div>
        </div>
        <div class="ride-price-col d-flex align-items-center gap-2">
          <div>
            <div class="ride-price">₹${r.fare}</div>
            <div class="ride-km-rate">₹${r.ratePerKm}/km</div>
          </div>
          <button class="btn-book-row ${isThisCheapest ? 'btn-book-row--green' : ''}"
            onclick="bookRide('${safeService}','${safeFrom}','${safeTo}','${safeType}',${r.fare},${distance})">
            <i class="bi bi-lightning-charge-fill"></i> Book
          </button>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="col-md-4" style="animation-delay:${idx * 0.08}s">
      <div class="service-card ${isCheapest ? 'cheapest' : ''}">
        <div class="service-card-header">
          <div class="service-logo-wrap">
            <div class="service-logo ${svc.logoClass}">${svc.logo}</div>
            <div>
              <div class="service-name">${svc.service}</div>
              <div class="service-tag">${svc.tag}</div>
            </div>
          </div>
          ${isCheapest ? `<span class="best-price-badge"><i class="bi bi-award-fill me-1"></i>Best Price</span>` : ''}
        </div>
        <div class="ride-options">${ridesHtml}</div>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
  <div class="results-section">
    <div class="d-flex align-items-center flex-wrap gap-3 mb-4">
      <div class="distance-badge">
        <i class="bi bi-geo text-orange"></i>
        <strong>${escapeHtml(from)}</strong>
        <i class="bi bi-arrow-right text-muted"></i>
        <strong>${escapeHtml(to)}</strong>
        <span class="text-muted">·</span>
        <span class="text-orange fw-700">~${distance} km</span>
      </div>
      <span style="font-size:0.82rem;color:var(--brand-muted);">
        <i class="bi bi-trophy-fill text-warning me-1"></i>
        Best: <strong>${cheapest.service} ${cheapest.ride}</strong> at <strong class="text-orange">₹${cheapest.fare}</strong>
      </span>
    </div>
    <div class="row g-4">
      ${cardsHtml}
    </div>
  </div>`;
}

function bookRide(service, from, to, rideType, fare, distance) {
  const user = session.get();
  if (!user) { navigate('login'); return; }

  const dateTime = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const booking = { id, user: user.email, from, to, service, rideType, price: fare, distance, dateTime };
  bookings.add(booking);


  document.getElementById('modalDetails').innerHTML = `
    <div class="detail-row"><span class="detail-label"><i class="bi bi-box-arrow-in-right me-1"></i>From</span><span class="detail-value">${escapeHtml(from)}</span></div>
    <div class="detail-row"><span class="detail-label"><i class="bi bi-geo-alt-fill me-1"></i>To</span><span class="detail-value">${escapeHtml(to)}</span></div>
    <div class="detail-row"><span class="detail-label"><i class="bi bi-car-front-fill me-1"></i>Service</span><span class="detail-value">${escapeHtml(service)} · ${escapeHtml(rideType)}</span></div>
    <div class="detail-row"><span class="detail-label"><i class="bi bi-currency-rupee me-1"></i>Fare</span><span class="detail-value" style="color:var(--brand-green);font-weight:800;">₹${fare}</span></div>
    <div class="detail-row"><span class="detail-label"><i class="bi bi-calendar3 me-1"></i>Date & Time</span><span class="detail-value">${dateTime}</span></div>
  `;


  const appLinks = {
    Ola: 'https://www.olacabs.com/',
    Uber: 'https://m.uber.com/',
    Rapido: 'https://rapido.bike/'
  };
  const appBtn = document.getElementById('openInAppBtn');
  if (appBtn) {
    appBtn.href = appLinks[service] || '#';
    appBtn.textContent = '';
    appBtn.innerHTML = `<i class="bi bi-box-arrow-up-right me-2"></i>Open ${service} App`;
  }

  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  modal.show();
  showToast(`✅ ${escapeHtml(rideType)} booked with ${escapeHtml(service)}!`);
}

function togglePass(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'bi bi-eye-slash-fill';
  } else {
    input.type = 'password';
    icon.className = 'bi bi-eye-fill';
  }
}

const CITY_COORDS = {
  'delhi': [28.6139, 77.2090], 'new delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777], 'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946], 'hyderabad': [17.3850, 78.4867],
  'chennai': [13.0827, 80.2707], 'kolkata': [22.5726, 88.3639],
  'pune': [18.5204, 73.8567], 'jaipur': [26.9124, 75.7873],
  'ahmedabad': [23.0225, 72.5714], 'surat': [21.1702, 72.8311],
  'lucknow': [26.8467, 80.9462], 'kanpur': [26.4499, 80.3319],
  'nagpur': [21.1458, 79.0882], 'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126], 'visakhapatnam': [17.6868, 83.2185],
  'patna': [25.5941, 85.1376], 'vadodara': [22.3072, 73.1812],
  'gurgaon': [28.4595, 77.0266], 'gurugram': [28.4595, 77.0266],
  'noida': [28.5355, 77.3910], 'chandigarh': [30.7333, 76.7794],
  'kochi': [9.9312, 76.2673], 'coimbatore': [11.0168, 76.9558],
  'bandra': [19.0596, 72.8295], 'bandra west': [19.0596, 72.8295],
  'connaught place': [28.6315, 77.2167], 'koramangala': [12.9352, 77.6245],
  'whitefield': [12.9698, 77.7499], 'hitech city': [17.4474, 78.3762],
  'secunderabad': [17.4399, 78.4983], 'lower parel': [18.9967, 72.8310],
  'igi airport': [28.5562, 77.1000], 'csia': [19.0896, 72.8656],
  'park street': [22.5513, 88.3516],
};

function getCoordsForLocation(name) {
  const key = name.toLowerCase().trim();

  if (CITY_COORDS[key]) return CITY_COORDS[key];
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(city) || city.includes(key.split(',')[0].trim())) {
      return coords;
    }
  }
  return null;
}

function geocodeLocation(name) {
  return fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&countrycodes=in&limit=1&format=json`)
    .then(r => r.json())
    .then(data => {
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    })
    .catch(() => null);
}

function showMap(from, to) {
  const mapContainer = document.getElementById('mapContainer');
  if (!mapContainer) return;
  mapContainer.style.display = 'block';

  if (window._rideMap) {
    window._rideMap.remove();
    window._rideMap = null;
  }
  const defaultCenter = [20.5937, 78.9629];

  const map = L.map('rideMap', { zoomControl: true, scrollWheelZoom: false }).setView(defaultCenter, 5);
  window._rideMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);


  const greenIcon = L.divIcon({
    html: '<div style="width:16px;height:16px;background:#22C55E;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [16, 16], iconAnchor: [8, 8], className: ''
  });
  const orangeIcon = L.divIcon({
    html: '<div style="width:16px;height:16px;background:#FF6B2C;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [16, 16], iconAnchor: [8, 8], className: ''
  });

  const fromLocal = getCoordsForLocation(from);
  const toLocal = getCoordsForLocation(to);

  if (fromLocal && toLocal) {
    placeMapMarkers(map, fromLocal, toLocal, from, to, greenIcon, orangeIcon);
  } else {

    Promise.all([
      fromLocal ? Promise.resolve(fromLocal) : geocodeLocation(from),
      toLocal ? Promise.resolve(toLocal) : geocodeLocation(to)
    ]).then(([fc, tc]) => {
      if (fc && tc) {
        placeMapMarkers(map, fc, tc, from, to, greenIcon, orangeIcon);
      } else if (fc) {
        L.marker(fc, { icon: greenIcon }).addTo(map).bindPopup(`<b>📍 ${escapeHtml(from)}</b>`).openPopup();
        map.setView(fc, 12);
      } else if (tc) {
        L.marker(tc, { icon: orangeIcon }).addTo(map).bindPopup(`<b>🏁 ${escapeHtml(to)}</b>`).openPopup();
        map.setView(tc, 12);
      }
    });
  }
}

function placeMapMarkers(map, fromCoords, toCoords, fromName, toName, greenIcon, orangeIcon) {
  const fromMarker = L.marker(fromCoords, { icon: greenIcon }).addTo(map);
  fromMarker.bindPopup(`<div style="font-family:sans-serif;font-size:13px"><b>📍 Pickup</b><br>${escapeHtml(fromName)}</div>`);

  const toMarker = L.marker(toCoords, { icon: orangeIcon }).addTo(map);
  toMarker.bindPopup(`<div style="font-family:sans-serif;font-size:13px"><b>🏁 Drop</b><br>${escapeHtml(toName)}</div>`);

  const line = L.polyline([fromCoords, toCoords], {
    color: '#FF6B2C', weight: 3, opacity: 0.8, dashArray: '8, 8'
  }).addTo(map);

  map.fitBounds([fromCoords, toCoords], { padding: [40, 40] });
}

function updateMapPickup(lat, lng, label) {
  if (!window._rideMap) return;
  const greenIcon = L.divIcon({
    html: '<div style="width:16px;height:16px;background:#22C55E;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
    iconSize: [16, 16], iconAnchor: [8, 8], className: ''
  });
  L.marker([lat, lng], { icon: greenIcon })
    .addTo(window._rideMap)
    .bindPopup(`<b>📍 ${escapeHtml(label)}</b>`)
    .openPopup();
  window._rideMap.setView([lat, lng], 13);
}

function renderContact(app) {
  app.innerHTML = `
  <div class="contact-hero">
    <div class="container" style="position:relative;z-index:1">
      <div class="hero-badge" style="display:inline-flex;margin-bottom:1rem;">
        <i class="bi bi-chat-heart-fill"></i> We'd love to hear from you
      </div>
      <div class="contact-hero-title">Get In Touch</div>
      <p class="contact-hero-sub">Have a question, suggestion, or just want to say hi? Drop us a message.</p>
    </div>
  </div>

  <!-- Contact Grid -->
  <div class="contact-grid">
    <div class="container">
      <div class="row g-4">

        <!-- Info Card -->
        <div class="col-lg-4">
          <div class="contact-info-card">
            <h5 class="fw-700 mb-4" style="font-family:var(--font-display)">
              <i class="bi bi-info-circle-fill me-2" style="color:var(--brand-orange)"></i>Contact Info
            </h5>

            <div class="contact-info-row">
              <div class="contact-info-icon bg-orange-soft"><i class="bi bi-envelope-fill"></i></div>
              <div>
                <div class="contact-info-label">Email</div>
                <div class="contact-info-value">hello@ridesync.app</div>
              </div>
            </div>

            <div class="contact-info-row">
              <div class="contact-info-icon bg-green-soft"><i class="bi bi-telephone-fill"></i></div>
              <div>
                <div class="contact-info-label">Phone</div>
                <div class="contact-info-value">+91 98765 43210</div>
              </div>
            </div>

            <div class="contact-info-row">
              <div class="contact-info-icon bg-yellow-soft"><i class="bi bi-geo-alt-fill"></i></div>
              <div>
                <div class="contact-info-label">Location</div>
                <div class="contact-info-value">Delhi, New Delhi, India</div>
              </div>
            </div>

            <div class="contact-info-row">
              <div class="contact-info-icon bg-purple-soft"><i class="bi bi-clock-fill"></i></div>
              <div>
                <div class="contact-info-label">Support Hours</div>
                <div class="contact-info-value">Mon–Sat, 9 AM – 7 PM IST</div>
              </div>
            </div>

            <div class="mt-1">
              <div style="font-size:0.78rem;color:var(--brand-muted);font-weight:600;letter-spacing:0.5px;margin-bottom:0.75rem;">FOLLOW US</div>
              <div class="social-row">
                <a href="#" class="social-btn" title="Twitter/X"><i class="bi bi-twitter-x"></i></a>
                <a href="#" class="social-btn" title="Instagram"><i class="bi bi-instagram"></i></a>
                <a href="#" class="social-btn" title="LinkedIn"><i class="bi bi-linkedin"></i></a>
                <a href="#" class="social-btn" title="GitHub"><i class="bi bi-github"></i></a>
                <a href="#" class="social-btn" title="YouTube"><i class="bi bi-youtube"></i></a>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Form -->
        <div class="col-lg-8">
          <div class="contact-form-card">
            <h5 class="fw-700 mb-1" style="font-family:var(--font-display)">
              <i class="bi bi-send-fill me-2" style="color:var(--brand-orange)"></i>Send a Message
            </h5>
            <p style="color:var(--brand-muted);font-size:0.88rem;margin-bottom:1.75rem;">
              Fill out the form below and we'll get back to you within 24 hours.
            </p>

            <div id="contactFormWrap">
              <form id="contactForm" novalidate autocomplete="off">
                <div class="row g-3 mb-3">
                  <div class="col-sm-6">
                    <label class="form-label"><i class="bi bi-person-fill me-1"></i>Full Name</label>
                    <input type="text" class="form-control" id="cName" placeholder="Your full name"/>
                    <div class="form-error" id="cNameErr">Please enter your name.</div>
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label"><i class="bi bi-envelope-fill me-1"></i>Email Address</label>
                    <input type="email" class="form-control" id="cEmail" placeholder="you@example.com"/>
                    <div class="form-error" id="cEmailErr">Please enter a valid email.</div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label"><i class="bi bi-tag-fill me-1"></i>Subject</label>
                  <select class="form-control" id="cSubject">
                    <option value="">Select a topic…</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Booking Issue">Booking Issue</option>
                    <option value="Other">Other</option>
                  </select>
                  <div class="form-error" id="cSubjectErr">Please select a subject.</div>
                </div>

                <div class="mb-4">
                  <label class="form-label"><i class="bi bi-chat-left-text-fill me-1"></i>Message</label>
                  <textarea class="form-control" id="cMessage" rows="5"
                    placeholder="Tell us what's on your mind…"
                    style="resize:vertical;min-height:120px"></textarea>
                  <div class="form-error" id="cMessageErr">Please enter a message (min 10 chars).</div>
                </div>

                <button type="submit" class="btn-grad px-5 py-3 w-100">
                  <i class="bi bi-send-fill me-2"></i>Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="footer-brand">
            <i class="bi bi-signpost-split-fill me-2" style="color:var(--brand-orange)"></i>Ride<span style="color:var(--brand-orange)">Sync</span>
          </div>
          <div class="footer-tagline">Compare Fares. Ride Smart. Save More.</div>
        </div>
        <div class="col-lg-4">
          <div class="footer-heading">Quick Links</div>
          <button class="footer-link" onclick="navigate('home')"><i class="bi bi-house-door me-2 opacity-50"></i>Home</button>
          <button class="footer-link" onclick="navigate('compare')"><i class="bi bi-bar-chart-line me-2 opacity-50"></i>Compare</button>
          <button class="footer-link" onclick="navigate('contact')"><i class="bi bi-chat-dots me-2 opacity-50"></i>Contact</button>
        </div>
        <div class="col-lg-4">
          <div class="footer-heading">Contact</div>
          <div style="color:rgba(255,255,255,0.4);font-size:0.82rem;">
            <i class="bi bi-envelope me-2"></i>hello@ridesync.app
          </div>
        </div>
      </div>
      <hr class="footer-divider"/>
      <div class="footer-copy">© 2025 RideSync. Made with <i class="bi bi-heart-fill" style="color:var(--brand-orange)"></i> for Indian commuters.</div>
    </div>
  </footer>
  `;

  // Attach contact form submit handler
  document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    handleContactSubmit();
  });
}

function handleContactSubmit() {
  clearErrors(['cNameErr', 'cEmailErr', 'cSubjectErr', 'cMessageErr']);
  const name = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const subject = document.getElementById('cSubject').value;
  const message = document.getElementById('cMessage').value.trim();
  let valid = true;

  if (name.length < 2) { showError('cNameErr'); valid = false; }
  if (!isValidEmail(email)) { showError('cEmailErr'); valid = false; }
  if (!subject) { showError('cSubjectErr'); valid = false; }
  if (message.length < 10) { showError('cMessageErr'); valid = false; }
  if (!valid) return;

  // Dummy submission — show success state
  document.getElementById('contactFormWrap').innerHTML = `
    <div class="contact-success">
      <div class="contact-success-icon"><i class="bi bi-check-lg"></i></div>
      <h4 class="fw-700 mb-2">Message Sent!</h4>
      <p style="color:var(--brand-muted);max-width:340px;margin:0 auto 1.5rem;">
        Thanks, <strong>${escapeHtml(name)}</strong>! We've received your message about
        <em>"${escapeHtml(subject)}"</em> and will reply to <strong>${escapeHtml(email)}</strong> within 24 hours.
      </p>
      <button class="btn-grad px-4 py-2" onclick="navigate('home')">
        <i class="bi bi-house-door me-2"></i>Back to Home
      </button>
    </div>
  `;
  showToast('Message sent successfully! 📨');
}

function bookingKey(b) {

  return b.id || [b.user, b.from, b.to, b.service, b.rideType, b.price, b.dateTime].join('|');
}


function deleteBooking(id) {
  bookings.removeById(id);
  const app = document.getElementById('app');
  renderMyRides(app);
  showToast('Ride removed from history.', 'info');
}

function clearAllRides() {
  if (!confirm('Are you sure you want to delete all your ride history? This cannot be undone.')) return;
  const user = session.get();
  if (!user) return;
  bookings.clearForUser(user.email);
  const app = document.getElementById('app');
  renderMyRides(app);
  showToast('All rides cleared.', 'info');
}

function renderMyRides(app) {
  const user = session.get();
  const myBookings = bookings.forUser(user.email).reverse(); // newest first

  const pillClass = { Ola: 'pill-ola', Uber: 'pill-uber', Rapido: 'pill-rapido' };
  const svcIcon = { Ola: '🚕', Uber: '⚫', Rapido: '🟠' };

  const cardsHtml = myBookings.length === 0
    ? `<div class="col-12">
        <div class="empty-rides">
          <div class="empty-icon"><i class="bi bi-car-front-fill"></i></div>
          <h4 class="fw-700 mb-2">No rides yet</h4>
          <p style="color:var(--brand-muted);max-width:320px;margin:0 auto 1.5rem;">
            You haven't booked any rides. Start comparing fares to book your first ride!
          </p>
          <button class="btn-grad px-4 py-2" onclick="navigate('compare')">
            <i class="bi bi-search me-2"></i>Compare Rides
          </button>
        </div>
      </div>`
    : myBookings.map((b, i) => `
      <div class="col-md-6 col-lg-4" style="animation-delay:${i * 0.06}s">
        <div class="ride-history-card">
          <div class="rhc-header">
            <span class="service-pill ${pillClass[b.service] || ''}">${svcIcon[b.service] || '🚗'} ${b.service} · ${b.rideType}</span>
            <div class="d-flex align-items-center gap-2">
              <span class="price-tag">₹${b.price}</span>
              <button class="btn-delete-ride" onclick="deleteBooking('${escapeHtml(bookingKey(b))}')" title="Delete this ride">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
          <div class="rhc-body">
            <div class="route-line">
              <div class="route-dot" style="background:var(--brand-green)"></div>
              <div class="route-line-seg"></div>
              <div class="route-dot" style="background:var(--brand-orange)"></div>
            </div>
            <div class="route-text">
              <div class="route-from">${escapeHtml(b.from)}</div>
              <div class="route-to">${escapeHtml(b.to)}</div>
            </div>
          </div>
          <div class="rhc-footer">
            <span class="rhc-meta"><i class="bi bi-arrows-expand-vertical"></i> ~${b.distance} km</span>
            <span class="rhc-meta"><i class="bi bi-calendar3"></i> ${b.dateTime}</span>
          </div>
        </div>
      </div>
    `).join('');

  app.innerHTML = `
  <div class="page-section">
    <div class="container">

      <!-- Header -->
      <div class="rides-header-card">
        <div class="hero-bg-orb orb-1" style="opacity:0.1"></div>
        <div class="section-eyebrow"><i class="bi bi-clock-history me-1"></i>Ride History</div>
        <h2 class="section-title mb-1">My Rides</h2>
        <p style="color:rgba(255,255,255,0.6);font-size:0.9rem;">
          ${myBookings.length > 0 ? `All your past bookings — showing newest first.` : `Your booked rides will appear here.`}
        </p>
        <div class="d-flex align-items-center flex-wrap gap-3 mt-2">
          ${myBookings.length > 0 ? `
          <div class="rides-count-chip">
            <i class="bi bi-ticket-perforated"></i> ${myBookings.length} ride${myBookings.length !== 1 ? 's' : ''} booked
          </div>
          <button class="btn-clear-all" onclick="clearAllRides()">
            <i class="bi bi-trash3-fill me-1"></i>Clear All
          </button>` : ''}
        </div>
      </div>

      <!-- Cards -->
      <div class="row g-3">
        ${cardsHtml}
      </div>

    </div>
  </div>`;
}


function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('darkIcon').className = isDark ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
  store.set('farex_theme', isDark ? 'light' : 'dark');
}

function initTheme() {
  const saved = store.get('farex_theme', 'light');
  document.documentElement.setAttribute('data-theme', saved);
  const icon = document.getElementById('darkIcon');
  if (icon) icon.className = saved === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

function showToast(msg, type = 'success') {
  const toastEl = document.getElementById('appToast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toastEl || !toastMsg) return;

  toastMsg.textContent = msg;

 
  toastEl.style.background = type === 'info'
    ? 'linear-gradient(135deg, #1E3A5F, #2563EB)'
    : 'linear-gradient(135deg, #1C1C2E, #2D2D4A)';

  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
  toast.show();
}


function hashish(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function clearErrors(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


document.addEventListener('DOMContentLoaded', function () {
  
  initTheme();
  updateNav();
  seedSampleData();
  navigate('home');
  window.addEventListener('scroll', function () {
    const nav = document.getElementById('mainNav');
    if (nav) {
      nav.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.1)' : 'none';
    }
  });
});

function seedSampleData() {
  const seeded = store.get('farex_seeded', false);
  if (seeded) return;
  if (!users.find('demo@ridesync.app')) {
    users.add({ name: 'Demo User', email: 'demo@ridesync.app', password: hashish('demo123') });
  }
  if (!users.find('demo@farex.app')) {
    users.add({ name: 'Demo User', email: 'demo@farex.app', password: hashish('demo123') });
  }
  store.set('farex_recent', []);

  store.set('farex_seeded', true);
}
