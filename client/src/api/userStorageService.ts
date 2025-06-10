interface UserData {
  userId: number;
  email: string;
}

class UserStorageService {
  private static readonly USER_KEY = 'user_data';

  static setUser(userId: number, email: string): void {
    const userData: UserData = { userId, email };
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
  }

  static getUser(): UserData | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as UserData;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      this.clearUser();
      return null;
    }
  }

  static getUserId(): number | null {
    const user = this.getUser();
    return user ? user.userId : null;
  }

  static getEmail(): string | null {
    const user = this.getUser();
    return user ? user.email : null;
  }

  static updateUserId(userId: number): void {
    const currentUser = this.getUser();
    if (currentUser) {
      this.setUser(userId, currentUser.email);
    }
  }

  static updateEmail(email: string): void {
    const currentUser = this.getUser();
    if (currentUser) {
      this.setUser(currentUser.userId, email);
    }
  }

  static clearUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  static isUserLoggedIn(): boolean {
    return this.getUser() !== null;
  }
}

export default UserStorageService;