import { query } from '../db/connection';
import { Session } from '../types/memory.types';
import { MemoryEngine } from './memory.engine';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export class SessionManager {
    private static currentSession: Session | null = null;

    static async getActiveSession(): Promise<Session> {
        if (this.currentSession && !this.isExpired(this.currentSession)) {
            return this.currentSession;
        }

        // Try to load existing active session from database
        const res = await query<Session>(
            "SELECT * FROM sessions WHERE status = 'active' ORDER BY last_activity DESC LIMIT 1"
        );

        if (res.rows.length > 0 && !this.isExpired(res.rows[0])) {
            this.currentSession = res.rows[0];
            return this.currentSession;
        }

        // Create a new session
        const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const createRes = await query<Session>(
            `INSERT INTO sessions (id, status, started_at, last_activity, working_memory, turns)
             VALUES ($1, 'active', NOW(), NOW(), '{}'::jsonb, '[]'::jsonb)
             RETURNING *`,
            [newSessionId]
        );

        this.currentSession = createRes.rows[0];
        return this.currentSession;
    }

    static isExpired(session: Session): boolean {
        const last = new Date(session.last_activity).getTime();
        return Date.now() - last > SESSION_TIMEOUT_MS;
    }

    static async addExchange(userMsg: string, botReply: string): Promise<void> {
        const session = await this.getActiveSession();
        const newTurns = [
            ...(session.turns || []),
            { role: 'user' as const, content: userMsg, timestamp: new Date().toISOString() },
            { role: 'assistant' as const, content: botReply, timestamp: new Date().toISOString() }
        ];

        await query(
            `UPDATE sessions 
             SET turns = $2::jsonb, last_activity = NOW() 
             WHERE id = $1`,
            [session.id, JSON.stringify(newTurns)]
        );

        session.turns = newTurns;
        session.last_activity = new Date().toISOString();
    }

    static async flushSession(reason: string = 'manual_close'): Promise<{ sessionId: string; turnsCount: number }> {
        const session = await this.getActiveSession();
        const turnsCount = session.turns ? session.turns.length : 0;

        if (turnsCount > 0) {
            await MemoryEngine.addEpisode(
                `جلسة حوارية مكتملة: تم إجراء ${turnsCount / 2} تبادل حواري وتفريغ الذاكرة العاملة المؤقتة.`,
                ['User', 'Eyra'],
                'session_closure',
                `Session ${session.id} closed via ${reason}`
            );
        }

        await query(
            "UPDATE sessions SET status = 'closed', last_activity = NOW() WHERE id = $1",
            [session.id]
        );

        this.currentSession = null;
        return { sessionId: session.id, turnsCount };
    }
}
