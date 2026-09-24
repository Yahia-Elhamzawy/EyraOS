// EyraOS Cognitive Memory Engine

import { Entity, Relation, Episode, Procedure } from '../types/memory.types';
import { EntityRepository } from '../db/repositories/entity.repo';
import { RelationRepository } from '../db/repositories/relation.repo';
import { EpisodeRepository } from '../db/repositories/episode.repo';
import { ProcedureRepository } from '../db/repositories/procedure.repo';
import { ConflictEngine } from './conflict';
import { isArabicMatch } from './arabic';

export class MemoryEngine {
    /**
     * Finds or creates an entity.
     */
    static async ensureEntity(name: string, type: string = 'unknown', attributes: Record<string, any> = {}): Promise<Entity> {
        const trimmed = name.trim();
        const existing = await EntityRepository.findByName(trimmed);
        if (existing) {
            if (Object.keys(attributes).length > 0) {
                return (await EntityRepository.updateAttributes(existing.id, attributes)) || existing;
            }
            return existing;
        }

        const id = `e_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return await EntityRepository.create({
            id,
            name: trimmed,
            type,
            attributes,
            confidence: 0.8,
            source: 'conversation',
            status: 'active',
            access_count: 1
        });
    }

    /**
     * Adds a relation with automatic conflict resolution, state transitions, and reinforcement.
     */
    static async addRelation(
        fromName: string,
        relationType: string,
        toName: string,
        metadata: {
            confidence?: number;
            source?: string;
            type?: 'fact' | 'inference' | 'learned';
        } = {}
    ): Promise<{ relation: Relation; supersededCount: number }> {
        // Ensure both entities exist
        await this.ensureEntity(fromName);
        await this.ensureEntity(toName);

        const allRelations = await RelationRepository.findAll();

        // 1. Check for duplicate active relation to reinforce
        const existingIdentical = allRelations.find(r =>
            r.status === 'active' &&
            isArabicMatch(r.from_entity, fromName) &&
            r.relation.toLowerCase().trim() === relationType.toLowerCase().trim() &&
            isArabicMatch(r.to_entity, toName)
        );

        if (existingIdentical) {
            const reinforced = await RelationRepository.reinforce(existingIdentical.id);
            return { relation: reinforced || existingIdentical, supersededCount: 0 };
        }

        // 2. Conflict Detection & FSM Transition
        const conflict = ConflictEngine.detectConflict(allRelations, fromName, relationType, toName);
        let supersededCount = 0;

        if (conflict.hasConflict) {
            for (const oldRel of conflict.conflictingRelations) {
                await RelationRepository.supersede(oldRel.id, conflict.reason);
                supersededCount++;
                console.log(`[EyraOS Memory] Superseded relation: '${oldRel.from_entity} ${oldRel.relation} ${oldRel.to_entity}' -> Reason: ${conflict.reason}`);
            }
        }

        // 3. Create New Relation
        const id = `r_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const newRel = await RelationRepository.create({
            id,
            from_entity: fromName.trim(),
            relation: relationType.trim(),
            to_entity: toName.trim(),
            confidence: metadata.confidence ?? 1.0,
            source: metadata.source || 'direct_statement',
            type: metadata.type || 'fact',
            reinforcement_count: 1,
            status: 'active'
        });

        return { relation: newRel, supersededCount };
    }

    /**
     * Records a new episodic event.
     */
    static async addEpisode(
        summary: string,
        participants: string[] = [],
        type: Episode['type'] = 'fact',
        context?: string
    ): Promise<Episode> {
        const id = `ep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return await EpisodeRepository.create({
            id,
            summary,
            type,
            participants,
            timestamp: new Date().toISOString(),
            context: context || '',
            significance: 'normal'
        });
    }

    /**
     * Learns or registers a procedure into procedural memory.
     */
    static async registerProcedure(procedureData: Partial<Procedure> & { name: string; trigger_keywords: string[]; steps: any[] }): Promise<Procedure> {
        const id = procedureData.id || `proc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        return await ProcedureRepository.create({
            ...procedureData,
            id,
            category: procedureData.category || 'workflow',
            confidence: procedureData.confidence ?? 0.9,
            source: procedureData.source || 'learned_from_user',
            execution_count: 0
        });
    }

    /**
     * Retrieves full state for visual graph representation in UI.
     */
    static async getFullGraph(): Promise<{ entities: Entity[]; relations: Relation[]; episodes: Episode[]; procedures: Procedure[] }> {
        const [entities, relations, episodes, procedures] = await Promise.all([
            EntityRepository.findAll(),
            RelationRepository.findAll(),
            EpisodeRepository.findAll(100),
            ProcedureRepository.findAll()
        ]);
        return { entities, relations, episodes, procedures };
    }
}
