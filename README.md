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