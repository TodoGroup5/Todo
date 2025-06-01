import { Express, Router } from "express";
import jwt from "jsonwebtoken";
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authenticateToken } from "../middleware";

// Simple in-memory user store (use database in production)
interface User {
    username: string;
    password: string; // Add proper password hashing in production
    twoFactorSecret: string;
}

const users: User[] = [];
let refreshTokens: string[] = [];

function findUser(username: string): User | undefined {
    return users.find(u => u.username === username);
}
function createUser(username: string, password: string): User {
    // Generate 2FA secret immediately upon user creation
    const secret = speakeasy.generateSecret({
        name: `TodoApp-Group-5`,
        issuer: 'TodoApp',
        length: 20
    });

    const user: User = {
        username,
        password,
        twoFactorSecret: secret.base32
    };
    users.push(user);
    return user;
}

function generateJWTToken(payload: object, type: 'access' | 'refresh'): string {
    const secret = type === 'access'
        ? process.env.ACCESS_TOKEN_SECRET
        : process.env.REFRESH_TOKEN_SECRET;

    if (!secret) throw new Error(`${type} token secret not defined`);

    const expiresIn = type === 'access' ? '15s' : '7d';
    return jwt.sign(payload, secret, { expiresIn });
}

export function registerAuthRoutes(app: Express) {
    const router = Router(); 
    // Register endpoint - automatically sets up 2FA
    router.post('/register', async (req, res) => {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Check if user already exists
        const existingUser = findUser(username);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Create new user with 2FA secret automatically generated
        const user = createUser(username, password);

        try {
            // Generate QR code for immediate 2FA setup
            const secret = speakeasy.generateSecret({
                name: `TodoApp-Group-5`,
                issuer: 'TodoApp',
                length: 20
            });
            
            // Update user with the secret
            user.twoFactorSecret = secret.base32;
            
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
            
            res.status(201).json({
                message: 'User registered successfully. Please set up 2FA to complete registration.',
                qrCode: qrCodeUrl,
                manualEntryKey: secret.base32,
                username: user.username,
                requiresSetup: true
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate 2FA setup' });
        }
    });

    // Complete registration by confirming 2FA setup
    router.post('/register/confirm', async (req, res) => {
        const { username, token } = req.body;
        
        if (!username || !token) {
            return res.status(400).json({ error: 'Username and 2FA token required' });
        }

        const user = findUser(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify the 2FA token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(401).json({ error: 'Invalid 2FA token' });
        }

        // Registration complete - generate tokens
        const userPayload = { username: user.username };
        const accessToken = generateJWTToken(userPayload, 'access');
        const refreshToken = generateJWTToken(userPayload, 'refresh');
        refreshTokens.push(refreshToken);

        res.json({
            message: 'Registration completed successfully',
            accessToken,
            refreshToken,
            user: {
                username: user.username
            }
        });
    });

    // Login endpoint - Verify credentials and return QR code
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find user
        const user = findUser(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        try {
            // Generate QR code using the user's existing 2FA secret
            const otpauthUrl = speakeasy.otpauthURL({
                secret: user.twoFactorSecret,
                label: `TodoApp-Group-5`,
                issuer: 'Your App Name',
                encoding: 'base32'
            });
            
            const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
            
            res.json({
                message: 'Credentials verified. Please scan QR code or enter 2FA token.',
                qrCode: qrCodeUrl,
                manualEntryKey: user.twoFactorSecret,
                username: user.username,
                requiresToken: true
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate QR code' });
        }
    });

    // Login endpoint - Verify 2FA token and complete login
    router.post('/login/verify', async (req, res) => {
        const { username, twoFactorToken } = req.body;
        
        if (!username || !twoFactorToken) {
            return res.status(400).json({ error: 'Username and 2FA token required' });
        }

        // Find user
        const user = findUser(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify the 2FA token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorToken,
            window: 2
        });

        if (!verified) {
            return res.status(401).json({ error: 'Invalid 2FA token' });
        }

        // Generate JWT tokens
        const userPayload = { username: user.username };
        const accessToken = generateJWTToken(userPayload, 'access');
        const refreshToken = generateJWTToken(userPayload, 'refresh');
        refreshTokens.push(refreshToken);

        res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                username: user.username
            }
        });
    });

    // Generate access token from refresh token
    router.post('/refresh', (req, res) => {
        const refreshToken = req.body.token;
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
        if (!refreshTokens.includes(refreshToken)) return res.status(401).json({ error: 'Refresh token invalid'});

        const secret = process.env.REFRESH_TOKEN_SECRET;
        if (!secret) throw new Error("REFRESH_TOKEN_SECRET is not defined");

        jwt.verify(refreshToken, secret, (err: any, decoded: any) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }
            
            const accessToken = generateJWTToken({
                username: decoded.username
            }, 'access');
            
            res.json({ accessToken });
        });
    });

    // Logout
    router.delete('/logout', (req, res) => {
        refreshTokens = refreshTokens.filter(token => token !== req.body.token);
        return res.sendStatus(204);
    });

    app.use('/auth', router);
}




