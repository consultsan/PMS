# TRUE Partner Management System

A comprehensive partner management system for healthcare organizations, built with React, Node.js, and PostgreSQL.

## Features

- Multi-hospital architecture with role-based access control
- Secure authentication with JWT
- Hospital-wise data segregation
- Modern, responsive UI built with React and Tailwind CSS
- Excel data import/export capabilities
- File upload management

## Tech Stack

### Frontend
- React
- Tailwind CSS
- React Query
- JWT Authentication

### Backend
- Node.js with Express
- Prisma ORM
- PostgreSQL
- JWT for authentication
- Multer for file uploads

## Project Structure

```
pms/
├── client/                 # Frontend React application
├── server/                 # Backend Node.js application
└── README.md              # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   - Create `.env` files in both client and server directories
   - Configure database connection and JWT secret

4. Start the development servers:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend server
   cd ../client
   npm start
   ```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/pms_db"
JWT_SECRET="your-jwt-secret"
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

## License

MIT 