// Base de données des utilisateurs simplifiée
const USERS_DATABASE = [
    {
        id: 1,
        prenom: "Jean",
        nom: "Dupont",
        passwordHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", // "hello"
    },
    {
        id: 2,
        prenom: "Marie",
        nom: "Martin",
        passwordHash: "fcf730b6d95236ecd3c9fc2d92d7b6b2bb061514961aec041d6c7a7192f592e4", // "secret123"
    },
    {
        id: 3,
        prenom: "Pierre",
        nom: "Bernard",
        passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // "password"
    }
];

// Fonction pour hacher un mot de passe (SHA-256)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fonction pour trouver un utilisateur par prénom et nom
function findUserByName(prenom, nom) {
    return USERS_DATABASE.find(user => 
        user.prenom.toLowerCase() === prenom.toLowerCase() && 
        user.nom.toLowerCase() === nom.toLowerCase()
    );
}

// Fonction pour authentifier un utilisateur
async function authenticateUser(prenom, nom, password) {
    const user = findUserByName(prenom, nom);
    if (!user) {
        return { success: false, message: "Utilisateur non trouvé" };
    }

    const enteredPasswordHash = await hashPassword(password);
    
    if (enteredPasswordHash === user.passwordHash) {
        return { 
            success: true, 
            user: {
                id: user.id,
                prenom: user.prenom,
                nom: user.nom
            }
        };
    } else {
        return { success: false, message: "Mot de passe incorrect" };
    }
}

// Fonction pour obtenir l'adresse IP publique
async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'IP:', error);
        return 'Non disponible';
    }
}

// Fonction pour obtenir les informations de géolocalisation
async function getLocationInfo(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            country: data.country_name || 'Non disponible',
            region: data.region || 'Non disponible',
            city: data.city || 'Non disponible',
            latitude: data.latitude || null,
            longitude: data.longitude || null
        };
    } catch (error) {
        return {
            country: 'Non disponible',
            region: 'Non disponible',
            city: 'Non disponible',
            latitude: null,
            longitude: null
        };
    }
}

// Fonction pour obtenir les informations du navigateur
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Inconnu';
    let browserVersion = 'Inconnu';

    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Inconnu';
    } else if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Inconnu';
    } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
        browserName = 'Safari';
        browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Inconnu';
    } else if (ua.indexOf('Edg') > -1) {
        browserName = 'Edge';
        browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Inconnu';
    }

    return `${browserName} ${browserVersion}`;
}

// Fonction pour gérer les utilisateurs connectés (simplifiée)
function manageConnectedUsers(action, userInfo = null) {
    const connectedUsers = JSON.parse(localStorage.getItem('connectedUsers') || '{}');
    const currentTime = Date.now();
    
    // Nettoyer les sessions expirées (plus de 30 minutes d'inactivité)
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    Object.keys(connectedUsers).forEach(userKey => {
        if (currentTime - connectedUsers[userKey].lastActivity > sessionTimeout) {
            delete connectedUsers[userKey];
        }
    });

    switch (action) {
        case 'add':
            if (userInfo) {
                const userKey = `${userInfo.prenom}_${userInfo.nom}`;
                connectedUsers[userKey] = {
                    ...userInfo,
                    loginTime: currentTime,
                    lastActivity: currentTime,
                    sessionId: generateSessionId()
                };
            }
            break;
        case 'remove':
            if (userInfo) {
                const userKey = `${userInfo.prenom}_${userInfo.nom}`;
                if (connectedUsers[userKey]) {
                    delete connectedUsers[userKey];
                }
            }
            break;
        case 'update':
            if (userInfo) {
                const userKey = `${userInfo.prenom}_${userInfo.nom}`;
                if (connectedUsers[userKey]) {
                    connectedUsers[userKey].lastActivity = currentTime;
                }
            }
            break;
        case 'get':
            return connectedUsers;
        case 'count':
            return Object.keys(connectedUsers).length;
    }

    localStorage.setItem('connectedUsers', JSON.stringify(connectedUsers));
    return connectedUsers;
}

// Générer un ID de session unique
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Fonction pour enregistrer la connexion (simplifiée)
function logConnection(user, ip, location, browser) {
    const connections = JSON.parse(localStorage.getItem('connectionLogs') || '[]');
    
    const connectionLog = {
        userId: user.id,
        prenom: user.prenom,
        nom: user.nom,
        ip: ip,
        browser: browser,
        country: location.country,
        region: location.region,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR'),
        sessionId: generateSessionId()
    };

    connections.unshift(connectionLog);
    localStorage.setItem('connectionLogs', JSON.stringify(connections));
}

// Gestion de l'affichage/masquage du mot de passe
document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// Gestion de la soumission du formulaire
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const prenomInput = document.getElementById('prenom');
    const nomInput = document.getElementById('nom');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const prenom = prenomInput.value.trim();
    const nom = nomInput.value.trim();
    const password = passwordInput.value;

    // Masquer le message d'erreur
    errorMessage.style.display = 'none';

    // Validation basique
    if (!prenom || !nom || !password) {
        errorMessage.textContent = 'Veuillez remplir tous les champs.';
        errorMessage.style.display = 'block';
        return;
    }

    // Affichage du loading
    this.classList.add('loading');

    try {
        // Authentifier l'utilisateur
        const authResult = await authenticateUser(prenom, nom, password);
        
        if (authResult.success) {
            // Authentification réussie
            const user = authResult.user;
            
            // Récupérer les informations de connexion
            const ip = await getPublicIP();
            const location = await getLocationInfo(ip);
            const browser = getBrowserInfo();

            // Enregistrer la connexion
            logConnection(user, ip, location, browser);

            // Ajouter l'utilisateur aux utilisateurs connectés
            manageConnectedUsers('add', user);

            // Stocker l'authentification
            sessionStorage.setItem('authenticated', 'true');
            sessionStorage.setItem('authTime', Date.now().toString());
            sessionStorage.setItem('userInfo', JSON.stringify(user));
            
            // Animation de succès
            prenomInput.style.borderColor = '#10B981';
            nomInput.style.borderColor = '#10B981';
            passwordInput.style.borderColor = '#10B981';
            
            // Message de bienvenue personnalisé
            const welcomeMessage = document.createElement('div');
            welcomeMessage.textContent = `Bienvenue ${user.prenom} ${user.nom} !`;
            welcomeMessage.style.cssText = `
                color: #10B981;
                text-align: center;
                margin-top: 15px;
                font-weight: bold;
                font-size: 16px;
                padding: 10px;
                background: rgba(16, 185, 129, 0.1);
                border-radius: 8px;
                border: 1px solid rgba(16, 185, 129, 0.2);
            `;
            this.appendChild(welcomeMessage);
            
            // Rediriger vers le portail après un court délai
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Authentification échouée
            errorMessage.textContent = authResult.message;
            errorMessage.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
            
            // Animation d'erreur
            prenomInput.style.borderColor = '#EF4444';
            nomInput.style.borderColor = '#EF4444';
            passwordInput.style.borderColor = '#EF4444';
            setTimeout(() => {
                prenomInput.style.borderColor = '';
                nomInput.style.borderColor = '';
                passwordInput.style.borderColor = '';
            }, 2000);
        }
    } catch (error) {
        errorMessage.textContent = 'Erreur technique. Veuillez réessayer.';
        errorMessage.style.display = 'block';
    } finally {
        // Retirer le loading
        this.classList.remove('loading');
    }
});

// Vérifier si l'utilisateur est déjà connecté
function checkAuthentication() {
    const authenticated = sessionStorage.getItem('authenticated');
    const authTime = sessionStorage.getItem('authTime');
    const userInfoStr = sessionStorage.getItem('userInfo');
    
    if (authenticated === 'true' && authTime && userInfoStr) {
        // Vérifier si la session n'a pas expiré (24 heures)
        const currentTime = Date.now();
        const sessionAge = currentTime - parseInt(authTime);
        const sessionTimeout = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
        
        if (sessionAge < sessionTimeout) {
            const userInfo = JSON.parse(userInfoStr);
            // Session valide, mettre à jour l'activité de l'utilisateur
            manageConnectedUsers('update', userInfo);
            // Rediriger vers le index.html
            window.location.href = 'index.html';
        } else {
            // Session expirée, nettoyer
            const userInfo = JSON.parse(userInfoStr);
            manageConnectedUsers('remove', userInfo);
            sessionStorage.removeItem('authenticated');
            sessionStorage.removeItem('authTime');
            sessionStorage.removeItem('userInfo');
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'authentification au chargement de la page
    checkAuthentication();
    
    // Focus automatique sur le champ prénom
    document.getElementById('prenom').focus();
    
    // Gérer l'appui sur Entrée
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginForm').dispatchEvent(new Event('submit'));
        }
    });

    USERS_DATABASE.forEach(user => {
        console.log(`- ${user.prenom} ${user.nom}`);
    });
});

// Fonction utilitaire pour calculer le hash d'un mot de passe (pour les tests)
async function calculatePasswordHash(password) {
    const hash = await hashPassword(password);
    return hash;
}

// Fonction de test simple
function testAuthentication() {
    
    // Test Jean Dupont
    authenticateUser('Jean', 'Dupont', 'hello').then(result => {
        console.log('Test Jean Dupont + hello:', result);
    });
    
    // Test Marie Martin
    authenticateUser('Marie', 'Martin', 'secret123').then(result => {
        console.log('Test Marie Martin + secret123:', result);
    });
    
    // Test Pierre Bernard
    authenticateUser('Pierre', 'Bernard', 'password').then(result => {
        console.log('Test Pierre Bernard + password:', result);
    });
    
    // Test avec mauvais mot de passe
    authenticateUser('Jean', 'Dupont', 'mauvais').then(result => {
        console.log('Test Jean Dupont + mauvais mot de passe:', result);
    });
    
    // Test utilisateur inexistant
    authenticateUser('Paul', 'Durand', 'test').then(result => {
        console.log('Test utilisateur inexistant:', result);
    });
}