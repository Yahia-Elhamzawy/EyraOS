import { query } from '../connection';
import { Procedure } from '../../types/memory.types';

export class ProcedureRepository {
    static async findAll(): Promise<Procedure[]> {
        const res = await query<Procedure>('SELECT * FROM procedures ORDER BY execution_count DESC, updated_at DESC');
        return res.rows;
    }

    static async findById(id: string): Promise<Procedure | null> {
        const res = await query<Procedure>('SELECT * FROM procedures WHERE id = $1', [id]);
        return res.rows[0] || null;
    }

    static async create(procedure: Partial<Procedure> & { id: string; name: string }): Promise<Procedure> {
        const res = await query<Procedure>(
            `INSERT INTO procedures (id, name, trigger_keywords, description, category, steps, confidence, source, execution_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING *`,
            [
                procedure.id,
                procedure.name.trim(),
                JSON.stringify(procedure.trigger_keywords || []),
                procedure.description || '',
                procedure.category || 'workflow',
                JSON.stringify(procedure.steps || []),
                procedure.confidence ?? 1.0,
                procedure.source || 'learned_from_user',
                procedure.execution_count ?? 0
            ]
        );
        return res.rows[0];
    }

    static async incrementExecution(id: string): Promise<Procedure | null> {
        const res = await query<Procedure>(
            `UPDATE procedures 
             SET execution_count = execution_count + 1, last_executed_at = NOW(), updated_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [id]
        );
        return res.rows[0] || null;
    }

    static async findByKeyword(keyword: string): Promise<Procedure[]> {
        const res = await query<Procedure>(
            `SELECT * FROM procedures 
             WHERE name ILIKE $1 OR description ILIKE $1 OR trigger_keywords::text ILIKE $1`,
            [`%${keyword}%`]
        );
        return res.rows;
    }
}
