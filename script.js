        // --- LOCAL STORAGE UTILITIES ---
        const LS_KEY_USERS = 'gt_users';
        const LS_KEY_LOGGED_USER = 'gt_logged_user_id';
        const LS_KEY_TREELOGS = 'gt_tree_logs';
        const LS_KEY_REPORTS = 'gt_reports';

        function getStoredUsers() {
            try {
                return JSON.parse(localStorage.getItem(LS_KEY_USERS) || '{}');
            } catch (e) {
                console.error("Error reading users from local storage:", e);
                return {};
            }
        }

        function setStoredUsers(users) {
            localStorage.setItem(LS_KEY_USERS, JSON.stringify(users));
        }

        function getStoredData(key) {
            try {
                return JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) {
                console.error(`Error reading ${key} from local storage:`, e);
                return [];
            }
        }

        function setStoredData(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        }

        // --- GLOBAL STATE & ROUTING ---
        window.appState = {
            userId: localStorage.getItem(LS_KEY_LOGGED_USER),
            userRole: 'volunteer',
            isAuthenticated: !!localStorage.getItem(LS_KEY_LOGGED_USER),
            userProfile: {
                displayName: 'Volunteer',
                treesLogged: 0,
                pointsEarned: 0,
                ecoTeam: null
            }
        };

        const router = {
            routes: {
                'login': 'login-page',
                'signup': 'signup-page',
                'dashboard': 'dashboard-page',
                'map': 'map-page',
                'events': 'events-page',
                'guide': 'guide-page',
                'profile': 'profile-page',
            },
            currentRoute: 'login',

            showPage(pageName) {
                const pages = document.querySelectorAll('.page-content');
                pages.forEach(p => p.classList.add('hidden'));

                const targetPageId = this.routes[pageName];
                const targetPage = document.getElementById(targetPageId);
                if (targetPage) {
                    targetPage.classList.remove('hidden');
                    this.currentRoute = pageName;
                    // Update the active nav item
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('text-green-600', 'font-bold');
                        if (item.getAttribute('data-page') === pageName) {
                            item.classList.add('text-green-600', 'font-bold');
                        }
                    });
                }
            },
            
            navigate(pageName) {
                if (pageName === 'login' || pageName === 'signup') {
                    this.showPage(pageName);
                } else if (window.appState.isAuthenticated) {
                    this.showPage(pageName);
                } else {
                    this.showPage('login');
                    console.warn("Attempted to navigate to protected route without authentication.");
                }
            }
        };

        window.router = router;

        // --- AUTHENTICATION FUNCTIONS (LOCAL STORAGE) ---
        function generateUniqueId() {
            return 'user-' + Date.now() + Math.random().toString(16).slice(2);
        }

        async function handleSignUp(isOrganizer, email, password, teamName = null) {
            const users = getStoredUsers();
            if (Object.values(users).some(user => user.email === email)) {
                alertCustom('Error', 'User with this email already exists.');
                return;
            }

            const userId = generateUniqueId();
            const role = isOrganizer ? 'organizer' : 'volunteer';
            const displayName = email.split('@')[0];

            users[userId] = {
                userId,
                email,
                password, // NOTE: Storing plain password for simulation ONLY. NEVER do this in production.
                role,
                displayName,
                treesLogged: 0,
                pointsEarned: 0,
                ecoTeam: teamName
            };
            setStoredUsers(users);

            // Directly log the user in after successful sign up
            loginUser(userId, users[userId]);
            alertCustom('Success', 'Account created! Logging in...');
            router.navigate('dashboard');
        }

        async function handleLogin(email, password) {
            const users = getStoredUsers();
            const userEntry = Object.entries(users).find(([id, user]) => user.email === email && user.password === password);

            if (userEntry) {
                const [userId, userData] = userEntry;
                loginUser(userId, userData);
                router.navigate('dashboard');
            } else {
                alertCustom('Error', 'Invalid email or password.');
            }
        }

        function loginUser(userId, userData) {
            localStorage.setItem(LS_KEY_LOGGED_USER, userId);
            window.appState.userId = userId;
            window.appState.isAuthenticated = true;
            updateUserProfile(userData);
        }

        async function handleSignOut() {
            localStorage.removeItem(LS_KEY_LOGGED_USER);
            window.appState.userId = null;
            window.appState.isAuthenticated = false;
            window.appState.userRole = 'volunteer';
            router.navigate('login');
        }

        function recoverPassword(email) {
            alertCustom('Info', 'Password reset simulation: If this were real, an email would be sent to ' + email + '.');
            console.log("Simulated: password recovery requested for:", email);
        }

        // --- UI / DATA UPDATE FUNCTIONS ---

        function updateUserProfile(userData) {
            if (!userData) {
                console.error("No user data provided for update.");
                return;
            }
            window.appState.userProfile = userData;
            window.appState.userRole = userData.role;
            
            // Update UI
            const name = userData.displayName || 'Volunteer';
            document.getElementById('welcome-name').textContent = `Hello, ${name}!`;
            document.getElementById('profile-name').textContent = name;
            document.getElementById('profile-role').textContent = userData.role || 'Volunteer';
            document.getElementById('profile-userid-display').textContent = userData.userId || 'N/A';
            document.getElementById('dashboard-trees-logged').textContent = userData.treesLogged || 0;
            document.getElementById('dashboard-points-earned').textContent = userData.pointsEarned || 0;
        }

        function loadInitialData() {
            if (window.appState.isAuthenticated) {
                const users = getStoredUsers();
                const user = users[window.appState.userId];
                if (user) {
                    updateUserProfile(user);
                    router.navigate('dashboard');
                } else {
                    handleSignOut(); // User ID in storage is invalid
                }
            } else {
                router.navigate('login');
            }
        }
        
        // --- MODAL AND UI LOGIC ---

        function setupModal(modalId, openBtnId, closeBtnId, submitBtnId, handleSubmit) {
            const modal = document.getElementById(modalId);
            const openBtn = document.getElementById(openBtnId);
            const closeBtn = document.getElementById(closeBtnId);
            const submitBtn = document.getElementById(submitBtnId);

            if (openBtn) openBtn.onclick = () => modal.classList.remove('hidden');
            if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
            if (submitBtn) {
                submitBtn.onclick = (e) => {
                    e.preventDefault();
                    if (handleSubmit()) {
                        modal.classList.add('hidden');
                    }
                };
            }
            // Close when clicking outside the modal content
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        }
        window.setupModal = setupModal; 

        function alertCustom(title, message) {
            const modal = document.getElementById('custom-alert');
            document.getElementById('alert-title').textContent = title;
            document.getElementById('alert-message').textContent = message;
            modal.classList.remove('hidden');
            // Auto-hide after a few seconds
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 3000);
        }
        window.alertCustom = alertCustom; 

        // --- EVENT HANDLER SETUP (onload) ---

        window.onload = function() {
            // General Navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const page = item.getAttribute('data-page');
                    router.navigate(page);
                });
            });
            
            // --- AUTH PAGES HANDLERS ---
            document.getElementById('login-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                handleLogin(email, password);
            });

            document.getElementById('signup-form')?.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const roleSelect = document.getElementById('signup-role');
                const isOrganizer = roleSelect ? roleSelect.value === 'organizer' : false;
                const teamName = document.getElementById('signup-team-name')?.value || '';
                handleSignUp(isOrganizer, email, password, teamName);
            });
            
            document.getElementById('signup-role')?.addEventListener('change', (e) => {
                const teamNameGroup = document.getElementById('team-name-group');
                if (e.target.value === 'organizer') {
                    teamNameGroup.classList.remove('hidden');
                } else {
                    teamNameGroup.classList.add('hidden');
                }
            });
            
            document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                if (email) {
                    recoverPassword(email);
                } else {
                    alertCustom('Input Needed', 'Please enter your email in the field above.');
                }
            });
            
            document.getElementById('sign-up-here-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('signup');
            });
            
            document.getElementById('login-here-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('login');
            });

            // --- PROFILE HANDLERS ---
            document.getElementById('logout-btn')?.addEventListener('click', handleSignOut);
            document.getElementById('view-achievements-btn')?.addEventListener('click', () => {
                document.getElementById('achievements-modal').classList.remove('hidden');
            });
            document.getElementById('close-achievements-modal')?.addEventListener('click', () => {
                document.getElementById('achievements-modal').classList.add('hidden');
            });

            // --- MODAL SETUP ---
            
            // 5. Tree Planting Tracker (Log Tree)
            const handleLogTreeSubmit = () => {
                const species = document.getElementById('log-tree-species').value;
                const location = document.getElementById('log-tree-location').value;
                const photoInput = document.getElementById('log-tree-photo');
                const photoFile = photoInput.files[0];

                if (!species || !location) {
                    alertCustom('Validation', 'Species and Location details are required.');
                    return false;
                }
                
                const currentUserId = window.appState.userId;
                if (!currentUserId) {
                    alertCustom('Error', 'User not authenticated.');
                    return false;
                }
                
                // A. Add Tree Log (Local Storage)
                const treeLogs = getStoredData(LS_KEY_TREELOGS);
                treeLogs.push({
                    id: generateUniqueId(),
                    userId: currentUserId,
                    species: species,
                    location: location,
                    date: new Date().toISOString(),
                    photoUploaded: !!photoFile ? photoFile.name : 'No photo',
                    co2ImpactEstimate: 10
                });
                setStoredData(LS_KEY_TREELOGS, treeLogs);

                // B. Update User Progress
                const users = getStoredUsers();
                const user = users[currentUserId];
                if (user) {
                    user.treesLogged = (user.treesLogged || 0) + 1;
                    user.pointsEarned = (user.pointsEarned || 0) + 5;
                    setStoredUsers(users);
                    // Update global state and UI
                    updateUserProfile(user);
                }

                alertCustom('Success', 'Tree planting logged! Progress updated.');
                // Reset form fields
                document.getElementById('log-tree-form').reset();
                return true;
            };

            // 7. Report Feature (Log Report)
            const handleLogReportSubmit = () => {
                const nearestLocation = document.getElementById('log-report-location').value;
                const summary = document.getElementById('log-report-summary').value;
                const detailedReport = document.getElementById('log-report-details').value;
                const photoInput = document.getElementById('log-report-photo');
                const photoFile = photoInput.files[0];

                if (!summary) {
                    alertCustom('Validation', 'Report Summary is required.');
                    return false;
                }
                
                const currentUserId = window.appState.userId;
                if (!currentUserId) {
                    alertCustom('Error', 'User not authenticated.');
                    return false;
                }

                // C. Add Report Log (Local Storage)
                const reports = getStoredData(LS_KEY_REPORTS);
                reports.push({
                    id: generateUniqueId(),
                    reporterId: currentUserId,
                    nearestLocation: nearestLocation,
                    summary: summary,
                    details: detailedReport,
                    date: new Date().toISOString(),
                    status: 'Pending Verification',
                    photoUploaded: !!photoFile ? photoFile.name : 'No photo',
                });
                setStoredData(LS_KEY_REPORTS, reports);

                alertCustom('Success', 'Environmental issue reported! An Organizer/EcoTeam will be notified for verification.');
                // Reset form fields
                document.getElementById('log-report-form').reset();
                return true;
            };

            // Setup Log Tree Modal
            setupModal('log-tree-modal', 'log-new-trees-btn', 'close-log-tree-modal', 'submit-log-tree', handleLogTreeSubmit);
            
            // Setup Log Report Modal
            setupModal('log-report-modal', 'log-report-btn', 'close-log-report-modal', 'submit-log-report', handleLogReportSubmit);


            // --- DATA LOADING ON DASHBOARD (MOCK/SIMULATION) ---
            document.getElementById('current-challenge-start').addEventListener('click', () => {
                alertCustom('Challenge Started', 'You are now tracking your "Plant 1 Tree This Week" challenge!');
            });
            
            // --- EVENTS LISTENER (MOCK/SIMULATION) ---
            document.querySelectorAll('.join-event-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const eventCard = e.target.closest('.event-card');
                    const eventTitle = eventCard.querySelector('.event-title').textContent;
                    
                    // Prevent joining twice
                    if (e.target.textContent === 'Attending') return;

                    // Simulate joining
                    e.target.textContent = 'Attending';
                    e.target.classList.remove('bg-green-500', 'hover:bg-green-600');
                    e.target.classList.add('bg-gray-400', 'cursor-default');
                    e.target.disabled = true;

                    alertCustom('Joined!', `You successfully joined the event: ${eventTitle}`);
                });
            });

            // --- MAP FEATURE MOCK/SIMULATION ---
            document.getElementById('filter-map-btn').addEventListener('click', () => {
                alertCustom('Feature Disabled', 'Map filtering is a non-functional placeholder for the current scope.');
            });
            
            // --- GUIDE FEATURE MOCK/SIMULATION ---
            document.querySelectorAll('.guide-item-details').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const species = e.target.closest('.guide-item').querySelector('.species-name').textContent;
                    alertCustom('Species Details', `Showing detailed conservation information for ${species}.`);
                });
            });
            
            // Set initial state
            loadInitialData();
        };
        
        window.handleSignOut = handleSignOut;

