import jwt from "jsonwebtoken";

export function authenticateToken(req: any, res: any, next: any) {
    //verify that its correct user
    const authHeader = req.headers['authorization'];
    const token = extractBearerToken(authHeader);

    if (!token) return res.sendStatus(401); 

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
        throw new Error("secret is not defined");
    }

    jwt.verify(token, secret, (err, decodedUser) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = decodedUser
        next();
    })
}

export function generateJWTToken(user:any, type: string) {

    const secret = type === 'access' ? process.env.ACCESS_TOKEN_SECRET : process.env.REFRESH_TOKEN_SECRET
    if (!secret) {
        throw new Error("secret is not defined");
    }

    return jwt.sign(user, secret, {expiresIn: type === 'access' ? '15s': '1d'});
}


function extractBearerToken(authorizationHeader?: string): string | undefined {
    if(!authorizationHeader){ 
        return undefined;
    } else{
        const parts = authorizationHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
          return undefined;
        } else{
            return parts[1];
        }
    }
}