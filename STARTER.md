# STARTER.md — Get All Stacks Running with Simple CRUD
### Your first real goal: every service running, talking to each other, something on screen.

---

## What You Are Building

A simple **"Items"** app. That's it.

- **Mobile app** → shows a list of items, can add and delete
- **Admin web** → shows a table of items, can create, edit, delete
- **Backend API** → serves the data
- **PostgreSQL** → stores the data
- **Redis** → running (used for cache later)
- **Nginx** → routes everything

No login. No auth. No complex relations. Just one table, full CRUD, all stacks connected.

```
┌─────────────────┐     ┌─────────────────┐
│  Mobile App     │     │  Admin Web      │
│  (Expo)         │     │  (Next.js)      │
│                 │     │                 │
│  • List items   │     │  • List items   │
│  • Add item     │     │  • Add item     │
│  • Delete item  │     │  • Edit item    │
└────────┬────────┘     │  • Delete item  │
         │              └────────┬────────┘
         │    REST API           │
         └──────────┬────────────┘
                    │
             ┌──────▼──────┐
             │  Laravel    │
             │  API        │
             └──────┬──────┘
                    │
          ┌─────────┴──────────┐
          │                    │
   ┌──────▼──────┐    ┌────────▼──────┐
   │ PostgreSQL  │    │    Redis      │
   │ (items)     │    │  (running)    │
   └─────────────┘    └───────────────┘
```

**The single database table:**

```
items
├── id        (UUID, primary key)
├── name      (string, required)
├── description (text, nullable)
├── created_at
└── updated_at
```

---

## Folder Structure

```
starter/
├── apps/
│   ├── mobile/          ← Expo React Native
│   ├── admin-web/       ← Next.js
│   └── api/             ← Laravel
├── docker/
│   ├── nginx/
│   │   ├── Dockerfile
│   │   └── conf.d/
│   │       └── default.conf
│   └── php/
│       └── Dockerfile
├── docker-compose.yml
└── STARTER.md
```

---

## Phase 1 — Docker + Laravel API + PostgreSQL

Get the backend running first. No mobile, no admin web yet.

---

### Step 1 — Create the folder structure

Open your terminal (PowerShell or VS Code terminal):

```bash
mkdir starter
cd starter
mkdir -p apps/mobile apps/admin-web apps/api
mkdir -p docker/nginx/conf.d docker/php
```

---

### Step 2 — Create `docker-compose.yml`

Create `starter/docker-compose.yml`:

```yaml
version: '3.9'

services:

  nginx:
    build:
      context: ./docker/nginx
    container_name: starter_nginx
    ports:
      - "8080:80"
    volumes:
      - ./apps/api:/var/www/html
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
    depends_on:
      - apidock
    networks:
      - starter_network

  api:
    build:
      context: ./docker/php
    container_name: starter_api
    working_dir: /var/www/html
    volumes:
      - ./apps/api:/var/www/html
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - starter_network

  postgres:
    image: postgres:16-alpine
    container_name: starter_postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: starter_db
      POSTGRES_USER: starter_user
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U starter_user -d starter_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - starter_network

  redis:
    image: redis:7-alpine
    container_name: starter_redis
    ports:
      - "6379:6379"
    networks:
      - starter_network

volumes:
  postgres_data:

networks:
  starter_network:
    driver: bridge
```

---

### Step 3 — Create PHP Dockerfile

Create `docker/php/Dockerfile`:

```dockerfile
FROM php:8.3-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpq-dev

# Install PHP extensions for PostgreSQL
RUN docker-php-ext-install pdo pdo_pgsql

# Install Redis PHP extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
```

---

### Step 4 — Create Nginx Dockerfile and config

Create `docker/nginx/Dockerfile`:

```dockerfile
FROM nginx:alpine
```

Create `docker/nginx/conf.d/default.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass api:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

---

### Step 5 — Start containers and install Laravel

```bash
# From the starter/ root folder
# Build and start all containers
docker compose up -d --build

# Verify all 4 containers are running
docker compose ps
```

You should see: `starter_nginx`, `starter_api`, `starter_postgres`, `starter_redis` — all `running`.

Now install Laravel inside the container:

```bash
# Shell into the PHP container
docker exec -it starter_api bash

# Inside the container — install Laravel
composer create-project laravel/laravel . --prefer-dist

# Exit the container
exit
```

---

### Step 6 — Configure Laravel `.env`

Open `apps/api/.env` and update these values:

```env
APP_NAME=Starter
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

# Change from sqlite to pgsql
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=starter_db
DB_USERNAME=starter_user
DB_PASSWORD=secret

REDIS_HOST=redis
REDIS_PORT=6379

CACHE_STORE=redis
SESSION_DRIVER=redis
```

Generate the app key:

```bash
docker exec starter_api php artisan key:generate
```

---

### Step 7 — Create the Items migration

```bash
docker exec starter_api php artisan make:migration create_items_table
```

Open the migration file that was created inside `apps/api/database/migrations/` and replace the `up()` method:

```php
public function up(): void
{
    Schema::create('items', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->string('name');
        $table->text('description')->nullable();
        $table->timestamps();
    });
}
```

Run the migration:

```bash
docker exec starter_api php artisan migrate
```

**Verify it worked** — connect to PostgreSQL with TablePlus:
- Host: `localhost`
- Port: `5432`
- Database: `starter_db`
- User: `starter_user`
- Password: `secret`

You should see the `items` table.

---

### Step 8 — Create the Item model

```bash
docker exec starter_api php artisan make:model Item
```

Open `apps/api/app/Models/Item.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['name', 'description'];
}
```

---

### Step 9 — Create the API controller

```bash
docker exec starter_api php artisan make:controller ItemController --api
```

Open `apps/api/app/Http/Controllers/ItemController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    // GET /api/items — list all items
    public function index()
    {
        $items = Item::latest()->get();

        return response()->json([
            'success' => true,
            'data'    => $items,
        ]);
    }

    // POST /api/items — create an item
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $item = Item::create($validated);

        return response()->json([
            'success' => true,
            'data'    => $item,
            'message' => 'Item created',
        ], 201);
    }

    // GET /api/items/{id} — get one item
    public function show(Item $item)
    {
        return response()->json([
            'success' => true,
            'data'    => $item,
        ]);
    }

    // PUT /api/items/{id} — update an item
    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'data'    => $item,
            'message' => 'Item updated',
        ]);
    }

    // DELETE /api/items/{id} — delete an item
    public function destroy(Item $item)
    {
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted',
        ]);
    }
}
```

---

### Step 10 — Register the routes

Open `apps/api/routes/api.php` and replace all content:

```php
<?php

use App\Http\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn() => response()->json(['status' => 'ok']));

// Items CRUD
Route::apiResource('items', ItemController::class);
```

---

### Step 11 — Test the API

Test using Bruno or just your browser/curl:

```bash
# Health check
curl http://localhost/api/health
# Expected: {"status":"ok"}

# Create an item
curl -X POST http://localhost/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "First Item", "description": "Hello world"}'

# List all items
curl http://localhost/api/items

# Update an item (replace UUID with the real one from the create response)
curl -X PUT http://localhost/api/items/YOUR-UUID-HERE \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Item", "description": "Changed"}'

# Delete an item
curl -X DELETE http://localhost/api/items/YOUR-UUID-HERE
```

**Milestone reached:** Laravel API is running in Docker, connected to PostgreSQL, full CRUD working.

---

## Phase 2 — React Native Mobile App

---

### Step 1 — Create the Expo app

```bash
# On your HOST machine (not inside Docker)
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
```

Install required packages:

```bash
npx expo install axios
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
```

---

### Step 2 — Find your local IP address

```bash
# Windows PowerShell
ipconfig
# Look for: IPv4 Address under Wi-Fi
# Example: 192.168.1.10
```

Write this down. You will use it as the API base URL.

---

### Step 3 — Create the API client

Create `apps/mobile/src/api/client.ts`:

```typescript
import axios from 'axios';

// Replace with YOUR local IP address
const API_BASE_URL = 'http://192.168.1.10/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default client;
```

Create `apps/mobile/src/api/items.ts`:

```typescript
import client from './client';

export type Item = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export const getItems = async (): Promise<Item[]> => {
  const response = await client.get('/items');
  return response.data.data;
};

export const createItem = async (name: string, description: string): Promise<Item> => {
  const response = await client.post('/items', { name, description });
  return response.data.data;
};

export const deleteItem = async (id: string): Promise<void> => {
  await client.delete(`/items/${id}`);
};
```

---

### Step 4 — Build the main screen

Replace the content of `apps/mobile/App.tsx`:

```typescript
import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, FlatList,
  TouchableOpacity, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { getItems, createItem, deleteItem, Item } from './src/api/items';

export default function App() {
  const [items, setItems]         = useState<Item[]>([]);
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);

  // Load items on first render
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load items. Is your API running?');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    setAdding(true);
    try {
      const newItem = await createItem(name.trim(), description.trim());
      setItems(prev => [newItem, ...prev]);  // Add to top of list
      setName('');
      setDesc('');
    } catch (error) {
      Alert.alert('Error', 'Could not create item');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (item: Item) => {
    Alert.alert(
      'Delete Item',
      `Delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              setItems(prev => prev.filter(i => i.id !== item.id));
            } catch {
              Alert.alert('Error', 'Could not delete item');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Items</Text>

      {/* Add form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Item name *"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={description}
          onChangeText={setDesc}
        />
        <Button
          title={adding ? 'Adding...' : 'Add Item'}
          onPress={handleAdd}
          disabled={adding}
        />
      </View>

      {/* Items list */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={loadItems}
          ListEmptyComponent={
            <Text style={styles.empty}>No items yet. Add one above.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.cardDesc}>{item.description}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 },
  title:      { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  form:       { marginBottom: 20, gap: 10 },
  input:      { borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
                padding: 10, fontSize: 16 },
  empty:      { textAlign: 'center', color: '#999', marginTop: 40 },
  card:       { flexDirection: 'row', alignItems: 'center', padding: 16,
                borderWidth: 1, borderColor: '#eee', borderRadius: 8,
                marginBottom: 10 },
  cardTitle:  { fontSize: 16, fontWeight: '600' },
  cardDesc:   { fontSize: 14, color: '#666', marginTop: 4 },
  deleteBtn:  { color: 'red', fontWeight: '600', paddingLeft: 10 },
});
```

---

### Step 5 — Run the mobile app

```bash
# Make sure Docker containers are still running
docker compose ps

# Start Expo (from apps/mobile folder)
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go on your iPhone.

You should see the Items screen, connected to your Dockerized Laravel API.

**Try it:**
- Add an item on your phone
- Open TablePlus and refresh the `items` table — the row is there
- Delete it on your phone — the row disappears from the database

**Milestone reached:** Mobile app talking to Laravel API talking to PostgreSQL, all in Docker.

---

## Phase 3 — Next.js Admin Web

---

### Step 1 — Create the Next.js app

```bash
# On your HOST machine
cd apps/admin-web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-eslint
```

When prompted:
- Import alias: just press Enter (default `@/*`)

---

### Step 2 — Add axios

```bash
npm install axios
```

---

### Step 3 — Create the API client

Create `apps/admin-web/lib/api.ts`:

```typescript
import axios from 'axios';

// Admin web runs on your host browser, so use localhost
const api = axios.create({
  baseURL: 'http://localhost/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default api;
```

---

### Step 4 — Build the admin items page

Replace `apps/admin-web/app/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type Item = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function AdminPage() {
  const [items, setItems]           = useState<Item[]>([]);
  const [loading, setLoading]       = useState(true);
  const [name, setName]             = useState('');
  const [description, setDesc]      = useState('');
  const [editingItem, setEditing]   = useState<Item | null>(null);
  const [editName, setEditName]     = useState('');
  const [editDesc, setEditDesc]     = useState('');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/items');
      setItems(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/items', { name, description });
    setName('');
    setDesc('');
    loadItems();
  };

  const handleEdit = (item: Item) => {
    setEditing(item);
    setEditName(item.name);
    setEditDesc(item.description ?? '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await api.put(`/items/${editingItem.id}`, {
      name: editName,
      description: editDesc,
    });
    setEditing(null);
    loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/items/${id}`);
    loadItems();
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Items Admin</h1>

      {/* Create form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Item</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            className="border rounded-lg px-4 py-2"
            placeholder="Name *"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-4 py-2"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDesc(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Item</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3">
              <input
                className="border rounded-lg px-4 py-2"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
              />
              <input
                className="border rounded-lg px-4 py-2"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Description"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 bg-gray-200 rounded-lg px-4 py-2 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No items yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 pr-4 font-semibold">Name</th>
              <th className="py-3 pr-4 font-semibold">Description</th>
              <th className="py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-3 pr-4">{item.name}</td>
                <td className="py-3 pr-4 text-gray-600">
                  {item.description ?? '—'}
                </td>
                <td className="py-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

### Step 5 — Run the admin web

```bash
# From apps/admin-web folder
npm run dev
```

Open your browser: `http://localhost:3000`

You should see the admin table connected to the same API and same database.

**Try it:**
- Add an item from the admin web
- Check your phone's Expo app — pull to refresh — the item appears
- Delete from mobile — refresh admin — it's gone

**Milestone reached:** All three apps (mobile + admin + API) reading and writing to the same PostgreSQL database through the same Laravel API.

---

## Quick Reference — Daily Commands

```bash
# ── Docker ──────────────────────────────────────
# Start everything
docker compose up -d

# Stop everything
docker compose stop

# Check status
docker compose ps

# View API logs
docker compose logs api -f

# ── Laravel ─────────────────────────────────────
# Run migrations
docker exec starter_api php artisan migrate

# Fresh migration (wipes all data)
docker exec starter_api php artisan migrate:fresh

# Shell into API container
docker exec -it starter_api bash

# Clear all caches
docker exec starter_api php artisan cache:clear

# ── Database ─────────────────────────────────────
# Open psql
docker exec -it starter_postgres psql -U starter_user -d starter_db

# Quick query from outside
docker exec starter_postgres psql -U starter_user -d starter_db \
  -c "SELECT * FROM items;"

# ── Mobile ───────────────────────────────────────
# Start Expo (from apps/mobile)
npx expo start

# ── Admin Web ────────────────────────────────────
# Start Next.js dev server (from apps/admin-web)
npm run dev
```

---

## What You Have Learned

By completing this starter project you now understand:

| Concept | Where you experienced it |
|---|---|
| Docker containers | All 4 services running with one command |
| Docker networking | `DB_HOST=postgres` instead of `localhost` |
| Docker volumes | Database data persists after container restart |
| PostgreSQL | Real table, real queries, UUID primary keys |
| Laravel API | Controller, Model, Routes, Migrations, Validation |
| REST API conventions | GET, POST, PUT, DELETE with proper status codes |
| Consistent API responses | `{ success, data, message }` envelope |
| React Native | FlatList, state, API calls, Alert, StyleSheet |
| Expo hot reload | Save file → phone updates instantly |
| Next.js App Router | Client component, fetch on mount, form handling |
| Full stack data flow | Add on phone → see it in admin → both hit same DB |

---

## Next Steps

Once this is comfortable, go back to `CLAUDE.md` and start the full BookEase project — adding auth, bookings, preorder items, and the full feature set. Everything in this starter is the foundation of that larger project.
