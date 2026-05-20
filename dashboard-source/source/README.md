# OVERVIEW

This is a MERN stack web application developed by Verticode. This project is structured as a monorepo with separate folders for the the frontend and the backend.

## Table of Contents

- [Setup](#setup)
- [Development](#development)
- [Production Build](#production-build)
- [Environment Variables](#environment-variables)

## Setup

To get started with this project, ensure you have the necessary dependencies and configurations.

### Prerequisites

- Node.js
- npm

### Installing Dependencies

Install all dependencies for both frontend and backend:

```sh
npm run install:all
```

## Development

To start the development servers for both frontend and backend:

```sh
npm start
```

This will concurrently run both the backend and frontend servers.

#### Frontend Server

URL: http://localhost:5173

#### Backend Server

URL: http://localhost:3001

## Production Build

To create a production build of the project:

```sh
npm run build
```

This will concurrently build both the frontend and backend applications.

## Environment Variables

The project uses environment variables for configuration. You need to update the .env files in both the front and back directories before running the application.

### Frontend Environment Variables

The frontend environment variables can be found in the following files and should be updated accordingly:

```
front/.env.development
front/.env.production
```

VITE_API_URL: Update this to the appropriate production API URL.

### Backend Environment Variables

The backend environment variables can be found in the following files and should be updated accordingly:

```
back/src/.env.development
back/src/.env.production
```

Make sure to fill in all the necessary keys:

 - DB_CONNECTION_STRING: MongoDB connection string.

 - JWT_SECRET: JWT secret key.

 - REFRESH_SECRET: Refresh token secret key.

Updating back/src/.env.production

You need to update the basic configurations to match your production infrastructure. Ensure the following are updated:

SITE_URL: Update to the production URL of your frontend application.

Fill in all the key values (DB_CONNECTION_STRING, JWT_SECRET, REFRESH_SECRET) with the correct production credentials.
