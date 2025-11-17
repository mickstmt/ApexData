# API Endpoints Testing Guide

Test the following endpoints in your browser or with a tool like Postman/Thunder Client:

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### 1. Get all drivers
```
GET http://localhost:3000/api/drivers
```

Query parameters:
- `year` (optional): Filter by year (e.g., `?year=2024`)
- `limit` (optional): Number of results (e.g., `?limit=10`)
- `offset` (optional): Pagination offset (e.g., `?offset=10`)
- `nationality` (optional): Filter by nationality (e.g., `?nationality=British`)

Examples:
```
http://localhost:3000/api/drivers?year=2024
http://localhost:3000/api/drivers?limit=5
http://localhost:3000/api/drivers?nationality=British
```

### 2. Get specific driver
```
GET http://localhost:3000/api/drivers/[driverId]
```

Examples:
```
http://localhost:3000/api/drivers/hamilton
http://localhost:3000/api/drivers/verstappen
http://localhost:3000/api/drivers/alonso
```

### 3. Get all constructors/teams
```
GET http://localhost:3000/api/constructors
```

Query parameters (same as drivers):
- `year`, `limit`, `offset`, `nationality`

Examples:
```
http://localhost:3000/api/constructors?year=2024
http://localhost:3000/api/constructors?nationality=Italian
```

### 4. Get season information
```
GET http://localhost:3000/api/seasons/[year]
```

Examples:
```
http://localhost:3000/api/seasons/current
http://localhost:3000/api/seasons/2024
http://localhost:3000/api/seasons/2023
```

### 5. Get current standings
```
GET http://localhost:3000/api/standings/current
```

Query parameters:
- `type`: "drivers" or "constructors" (default: "drivers")

Examples:
```
http://localhost:3000/api/standings/current?type=drivers
http://localhost:3000/api/standings/current?type=constructors
```

## Response Format

All endpoints return JSON with the following structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "source": "database" | "jolpica",
  "total": 100,    // (if paginated)
  "limit": 20,     // (if paginated)
  "offset": 0      // (if paginated)
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Testing in Browser

Simply open any of these URLs in your browser:

1. http://localhost:3000/api/drivers?year=2024&limit=5
2. http://localhost:3000/api/drivers/hamilton
3. http://localhost:3000/api/constructors?year=2024
4. http://localhost:3000/api/seasons/current
5. http://localhost:3000/api/standings/current?type=drivers

## Testing with curl

```bash
# Get current drivers
curl http://localhost:3000/api/drivers?year=2024

# Get Hamilton's data
curl http://localhost:3000/api/drivers/hamilton

# Get current standings
curl http://localhost:3000/api/standings/current?type=drivers
```

## Expected Behavior

1. **First Request**: Data fetched from Jolpica F1 API (slower)
2. **Cached in Database**: For historical data
3. **Subsequent Requests**: Served from database (faster)

## Notes

- The database is currently empty, so all requests will fall back to Jolpica API
- After implementing seeding scripts, database will be populated
- Current season data is always fetched fresh from Jolpica
