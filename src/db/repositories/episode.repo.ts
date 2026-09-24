import { query } from '../connection';
import { Episode } from '../../types/memory.types';

export class EpisodeRepository {
    static async findAll(limit: number = 50): Promise<Episode[]> {
        const res = await query<Episode>(
            'SELECT * FROM episodes ORDER BY timestamp DESC LIMIT $1',
            [limit]
        );
        return res.rows;
    }

    static async findRecent(count: number = 5): Promise<Episode[]> {
        return this.findAll(count);
    }

    static async create(episode: Partial<Episode> & { id: string; summary: string }): Promise<Episode> {
        const res = await query<Episode>(
            `INSERT INTO episodes (id, summary, type, participants, timestamp, context, significance)
             VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()), $6, $7)
             RETURNING *`,
            [
                episode.id,
                episode.summary,
                episode.type || 'fact',
                JSON.stringify(episode.participants || []),
                episode.timestamp || null,
                episode.context || null,
                episode.significance || 'normal'
            ]
        );
        return res.rows[0];
    }

    static async search(keywords: string[]): Promise<Episode[]> {
        if (keywords.length === 0) return [];
        // Match summary or context
        const clauses = keywords.map((_, i) => `(summary ILIKE $${i + 1} OR context ILIKE $${i + 1})`).join(' OR ');
        const params = keywords.map(k => `%${k}%`);
        const res = await query<Episode>(
            `SELECT * FROM episodes WHERE ${clauses} ORDER BY timestamp DESC LIMIT 10`,
            params
        );
        return res.rows;
    }
}
