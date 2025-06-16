# Todger
> Collaborative TODO Manager for teams & organizations

## Dev/Testing Setup
### Requirements
- PostgreSQL
- NodeJS & NPM
- Flyway

### Backend API
```bash
# Clone repo
git clone https://github.com/TodoGroup5/Todo todger

# Run migrations
cd todger/migrations
$EDITOR flyway.conf # Ensure configs match your local PostgreSQL
flyway migrate

# Set environment variables
cd ..
cp .env.example .env
$EDITOR .env

# Install Node modules
npm install

# Run API server
npm run dev
```

## Frontend server
```bash
# Install Node modules
cd client/
npm install

# Run frontend server
npm run dev
```

# Demo Info

Use `alice@example.com` with password `password` (don't worry you can't actually create a password like this during sign up). This is an admin account, thus you will be able to do whatever you need to. Feel free to create other accounts and whatnot :)