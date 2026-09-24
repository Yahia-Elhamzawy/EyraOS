import { query } from '../connection';
import { Entity } from '../../types/memory.types';

export class EntityRepository {
    static async findAll(): Promise<Entity[]> {
        const res = await query<Entity>('SELECT * FROM entities ORDER BY access_count DESC, updated_at DESC');
        return res.rows;
    }

    static async findById(id: string): Promise<Entity | null> {
        const res = await query<Entity>('SELECT * FROM entities WHERE id = $1', [id]);
        return res.rows[0] || null;
    }

    static async findByName(name: string): Promise<Entity | null> {
        const res = await query<Entity>('SELECT * FROM entities WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))', [name]);
        return res.rows[0] || null;
    }

    static async create(entity: Partial<Entity> & { id: string; name: string }): Promise<Entity> {
        const res = await query<Entity>(
            `INSERT INTO entities (id, name, type, attributes, confidence, source, status, access_count, created_at, updated_at, last_accessed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
             RETURNING *`,
            [
                entity.id,
                entity.name.trim(),
                entity.type || 'unknown',
                JSON.stringify(entity.attributes || {}),
                entity.confidence ?? 0.8,
                entity.source || 'conversation',
                entity.status || 'active',
                entity.access_count ?? 0
            ]
        );
        return res.rows[0];
    }

    static async updateAttributes(id: string, attributes: Record<string, any>): Promise<Entity | null> {
        const res = await query<Entity>(
            `UPDATE entities 
             SET attributes = attributes || $2::jsonb, updated_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [id, JSON.stringify(attributes)]
        );
        return res.rows[0] || null;
    }

    static async incrementAccess(id: string): Promise<void> {
        await query(
            `UPDATE entities 
             SET access_count = access_count + 1, last_accessed_at = NOW() 
             WHERE id = $1`,
            [id]
        );
    }

    static async delete(id: string): Promise<boolean> {
        const res = await query('DELETE FROM entities WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
    }
}
