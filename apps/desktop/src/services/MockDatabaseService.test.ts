
import { describe, it, expect, beforeEach } from 'vitest';
import { MockDatabaseService } from './MockDatabaseService';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

describe('MockDatabaseService', () => {
    let db: MockDatabaseService;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        db = new MockDatabaseService();
    });

    it('should initialize correctly', async () => {
        await db.initialize();
        expect(db.isInitialized()).toBe(true);
    });

    it('should insert and update character data with name mappings', async () => {
        await db.initialize();

        // 1. Insert a character
        const characterId = 'char_1';
        const initialData = JSON.stringify({
            id: characterId,
            name: 'Test Character',
            nameMappings: []
        });

        await db.execute(`
      INSERT INTO characters (id, world_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [characterId, 'world_1', initialData, new Date().toISOString(), new Date().toISOString()]);

        // Verify insert
        const rows = await db.query<any>('SELECT * FROM characters WHERE id = ?', [characterId]);
        expect(rows.length).toBe(1);
        expect(JSON.parse(rows[0].data).nameMappings.length).toBe(0);

        // 2. Update character with a name mapping
        const updatedData = JSON.stringify({
            id: characterId,
            name: 'Test Character',
            nameMappings: [
                {
                    id: 'map_1',
                    realWorld: 'Tokyo',
                    fantasyWorld: 'Imperial City',
                    category: 'location',
                    status: 'confirmed'
                }
            ]
        });

        const updateResult = await db.execute(`
      UPDATE characters
      SET world_id = ?, data = ?, updated_at = ?
      WHERE id = ?
    `, ['world_1', updatedData, new Date().toISOString(), characterId]);

        expect(updateResult).toBe(1);

        // 3. Verify update
        const updatedRows = await db.query<any>('SELECT * FROM characters WHERE id = ?', [characterId]);
        expect(updatedRows.length).toBe(1);
        const loadedData = JSON.parse(updatedRows[0].data);
        expect(loadedData.nameMappings.length).toBe(1);
        expect(loadedData.nameMappings[0].realWorld).toBe('Tokyo');
    });

    it('should handle complex JSON with special characters', async () => {
        await db.initialize();
        const characterId = 'char_complex';
        // JSON with commas, quotes, and question marks
        const complexData = JSON.stringify({
            note: "This contains a comma, and a 'quote', and a question mark?",
            nested: { value: "More, commas" }
        });

        await db.execute(`
      INSERT INTO characters (id, world_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [characterId, 'world_1', complexData, new Date().toISOString(), new Date().toISOString()]);

        const rows = await db.query<any>('SELECT * FROM characters WHERE id = ?', [characterId]);
        expect(rows.length).toBe(1);
        const loaded = JSON.parse(rows[0].data);
        expect(loaded.note).toBe("This contains a comma, and a 'quote', and a question mark?");
    });
});
