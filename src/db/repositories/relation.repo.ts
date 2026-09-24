import { query } from '../connection';
import { Relation, MemoryStatus } from '../../types/memory.types';

export class RelationRepository {
    static async findAll(statusFilter?: MemoryStatus): Promise<Relation[]> {
        if (statusFilter) {
            const res = await query<Relation>('SELECT * FROM relations WHERE status = $1 ORDER BY updated_at DESC', [statusFilter]);
            return res.rows;
        }
        const res = await query<Relation>('SELECT * FROM relations ORDER BY updated_at DESC');
        return res.rows;
    }

    static async findActive(): Promise<Relation[]> {
        return this.findAll('active');
    }

    static async findByEntity(entityName: string): Promise<Relation[]> {
        const res = await query<Relation>(
            `SELECT * FROM relations 
             WHERE (LOWER(TRIM(from_entity)) = LOWER(TRIM($1)) OR LOWER(TRIM(to_entity)) = LOWER(TRIM($1)))
             ORDER BY updated_at DESC`,
            [entityName]
        );
        return res.rows;
    }

    static async create(relation: Partial<Relation> & { id: string; from_entity: string; relation: string; to_entity: string }): Promise<Relation> {
        const res = await query<Relation>(
            `INSERT INTO relations (id, from_entity, relation, to_entity, confidence, source, type, reinforcement_count, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING *`,
            [
                relation.id,
                relation.from_entity.trim(),
                relation.relation.trim(),
                relation.to_entity.trim(),
                relation.confidence ?? 1.0,
                relation.source || 'direct_statement',
                relation.type || 'fact',
                relation.reinforcement_count ?? 1,
                relation.status || 'active'
            ]
        );
        return res.rows[0];
    }

    static async reinforce(id: string): Promise<Relation | null> {
        const res = await query<Relation>(
            `UPDATE relations 
             SET reinforcement_count = reinforcement_count + 1, updated_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [id]
        );
        return res.rows[0] || null;
    }

    static async supersede(id: string, reason: string): Promise<Relation | null> {
        const res = await query<Relation>(
            `UPDATE relations 
             SET status = 'superseded', superseded_at = NOW(), superseded_reason = $2, updated_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [id, reason]
        );
        return res.rows[0] || null;
    }

    static async delete(id: string): Promise<boolean> {
        const res = await query('DELETE FROM relations WHERE id = $1', [id]);
        return (res.rowCount ?? 0) > 0;
    }
}
