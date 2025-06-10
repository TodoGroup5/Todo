import type { TokenProvider } from "./types";

export class JWTTokenProvider implements TokenProvider {
  private readonly cookieName = "auth_token";
  private readonly defaultMaxAge = 60 * 60;

  getToken(): string | null {
    try {
      const cookies = document.cookie.split(';');
      
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === this.cookieName) {
          return decodeURIComponent(value);
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to retrieve token from cookies:', error);
      return null;
    }
  }

  setToken(token: string, options?: { maxAge?: number }): void {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided');
    }

    try {
      const { maxAge = this.defaultMaxAge } = options || {};
      const isHTTPS = window.location.protocol === 'https:';

      let cookieString = `${this.cookieName}=${encodeURIComponent(token)}`;
      cookieString += `; Max-Age=${maxAge}`;
      cookieString += `; Path=/`;
      cookieString += `; SameSite=Strict`;
      
      if (isHTTPS) {
        cookieString += `; Secure`; 
      }

      document.cookie = cookieString;
    } catch (error) {
      console.error('Failed to store token in cookies:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  removeToken(): void {
    try {
      const isHTTPS = window.location.protocol === 'https:';
      
      let cookieString = `${this.cookieName}=; Max-Age=0; Path=/; SameSite=Strict`;
      
      if (isHTTPS) {
        cookieString += `; Secure`;
      }

      document.cookie = cookieString;
    } catch (error) {
      console.warn('Failed to remove token cookie:', error);
    }
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }

  refreshTokenExpiration(options?: { maxAge?: number }): void {
    const currentToken = this.getToken();
    if (currentToken) {
      this.setToken(currentToken, options);
    }
  }
}