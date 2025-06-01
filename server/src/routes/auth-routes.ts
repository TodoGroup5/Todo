import { Express, Router } from "express";
import jwt from "jsonwebtoken";

let refreshTokens: string[] = [];

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

    router.post('/login', async (req, res) => {
        const username = req.body.username;
        const user = { name: username };

        const accessToken = generateJWTToken(user, 'access');
        const refreshToken = generateJWTToken(user, 'refresh');
        refreshTokens.push(refreshToken);

        // Store refresh token in httpOnly cookie
        // res.cookie('refreshToken', refreshToken, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production',
        //     sameSite: 'strict',
        //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        // });

        res.json({
            accessToken,
            refreshToken
        });
    });

    //generate access token from refresh token
    router.post('/refresh', (req, res) => {
        const refreshToken = req.body.token;
        //const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
        if (!refreshTokens.includes(refreshToken)) return res.status(401).json({ error: 'Refresh token invalid'});

        const secret = process.env.REFRESH_TOKEN_SECRET;
        if (!secret) throw new Error("REFRESH_TOKEN_SECRET is not defined");

        jwt.verify(refreshToken, secret, (err: any, user: any) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }
            const accessToken = generateJWTToken({ name: user.name }, 'access');
            res.json({ accessToken });
        });
    });

    router.delete('/logout', (req, res) => {
        //remove refresh token from list
        refreshTokens = refreshTokens.filter(token => token !== req.body.token);
        return res.sendStatus(204)
    });

    app.use('/auth', router);
}
