# leaf-nest

A small REST API for managing plants and tracking when they were last watered, built with NestJS, TypeORM and SQLite. It is the `api` workspace of this repository; the Angular frontend that uses it is in `apps/web`.

## Features

- Create, read, update and delete plants
- Track when each plant was last watered
- Upload a photo per plant, compressed in the background through TinyPNG
- SQLite database, created automatically on first start
- Interactive API docs (Swagger UI) at `/api`

## Requirements

- Node.js 24
- A [TinyPNG API key](https://tinypng.com/developers)

## Setup

Dependencies are installed once, at the repository root:

```bash
npm install                                  # at the repository root
cp apps/api/.env.example apps/api/.env
```

Then set both values in `apps/api/.env`:

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `LEAF_API_KEY`   | Key that clients must send with every API request    |
| `TINIFY_API_KEY` | TinyPNG key used to compress uploaded images         |

Optional environment variables:

| Variable        | Default     | Purpose                      |
| --------------- | ----------- | ---------------------------- |
| `PORT`          | `3000`      | Port the server listens on   |
| `DATABASE_PATH` | `plants.db` | Location of the SQLite file  |

## Running the app

The commands in this README run from `apps/api`. From the repository root, add `-w api` (e.g. `npm run start:dev -w api`, or the root shortcut `npm run dev:api`).

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

## Running with Docker

```bash
cp .env.example .env   # then set LEAF_API_KEY and TINIFY_API_KEY

docker compose up -d           # (re)build and start on http://localhost:3000
docker compose logs -f         # follow logs
docker compose down            # stop
```

The database and uploaded images are kept in the `db` and `uploads` named volumes, so they survive rebuilds. `docker compose down -v` deletes them.

The image is built with the repository root as its context, because the lockfile lives there; `compose.yaml` sets that up. To build without compose, run `docker build -f apps/api/Dockerfile .` from the root.

## Tests

```bash
npm test
```

The suite boots the real application and exercises it over HTTP against a temporary database. TinyPNG is mocked, so no requests leave the machine.

## Linting and formatting

```bash
npm run lint
npm run format
```

## Authentication

Every API route requires the key from `LEAF_API_KEY` as an `apiKey` query parameter:

```bash
curl "http://localhost:3000/plants?apiKey=your_key"
```

Requests without a key, or with a wrong one, get `401 Unauthorized`. Files under `/static/` and the docs at `/api` are served without a key.

## API

A plant looks like this:

```json
{
  "id": 1,
  "name": "My Plant",
  "imagePath": "/static/defaultPlant.png",
  "lastWatered": "2025-01-29T10:30:00.000Z"
}
```

| Method   | Path                | Description              |
| -------- | ------------------- | ------------------------ |
| `GET`    | `/plants`           | List all plants          |
| `GET`    | `/plants/:id`       | Get one plant            |
| `POST`   | `/plants`           | Create a plant           |
| `PATCH`  | `/plants/:id`       | Update a plant           |
| `DELETE` | `/plants/:id`       | Delete a plant           |
| `POST`   | `/plants/:id/image` | Upload a plant image     |

### Create or update a plant

`POST /plants` and `PATCH /plants/:id` accept the same JSON body. Unknown properties are rejected with `400 Bad Request`.

```json
{
  "name": "My Plant",
  "lastWatered": "2025-01-29T10:30:00.000Z"
}
```

- `name`: string. Required when creating a plant.
- `lastWatered`: ISO 8601 date. To record a watering, `PATCH` the plant with the new date.
- `imagePath` cannot be sent; only the image upload sets it.

### Upload a plant image

`POST /plants/:id/image` takes `multipart/form-data` with the file in a field named `image`.

- Supported formats: JPG, JPEG, PNG, GIF
- File size limit: 10MB

```bash
curl -X POST "http://localhost:3000/plants/1/image?apiKey=your_key" \
  -F "image=@/path/to/your/image.jpg"
```

The response is the updated plant, with `imagePath` pointing at the stored file:

```json
{
  "id": 1,
  "name": "My Plant",
  "imagePath": "/static/plant_1_1704067200000.jpg",
  "lastWatered": "2025-01-29T10:30:00.000Z"
}
```

Uploading a new image replaces the previous one, and deleting a plant deletes its image.

## Database

The application uses SQLite. The file is `plants.db` in the working directory unless `DATABASE_PATH` says otherwise, and it is created automatically on first start.

## File storage

Uploaded images are stored in the `static/` directory and served under `/static/`.
