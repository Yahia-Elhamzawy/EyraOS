// EyraOS Tiered Selective Retrieval Engine

import { Entity, Relation, Episode, Procedure, TieredRetrievalResult, Subgraph } from '../types/memory.types';
import { EntityRepository } from '../db/repositories/entity.repo';
import { RelationRepository } from '../db/repositories/relation.repo';
import { EpisodeRepository } from '../db/repositories/episode.repo';
import { ProcedureRepository } from '../db/repositories/procedure.repo';
import { isArabicMatch, extractKeywords, normalizeArabic } from './arabic';

export class RetrievalEngine {
    /**
     * Performs multi-tier selective retrieval based on user input and session context.
     */
    static async retrieve(
        userInput: string,
        workingMemory: Record<string, any> = {}
    ): Promise<TieredRetrievalResult> {
        const keywords = extractKeywords(userInput);
        const allEntities = await EntityRepository.findAll();
        const allRelations = await RelationRepository.findActive();

        // 1. Identify matched entities (1-hop focal nodes)
        const matchedEntities: Entity[] = [];
        for (const e of allEntities) {
            if (
                isArabicMatch(userInput, e.name) ||
                keywords.some(k => isArabicMatch(k, e.name))
            ) {
                matchedEntities.push(e);
                // Track access asynchronously
                EntityRepository.incrementAccess(e.id).catch(() => {});
            }
        }

        // 2. 1-hop Subgraph expansion
        const matchedNames = new Set(matchedEntities.map(e => normalizeArabic(e.name)));
        const subgraphRelations: Relation[] = [];
        const additionalEntityNames = new Set<string>();

        for (const r of allRelations) {
            const fromNorm = normalizeArabic(r.from_entity);
            const toNorm = normalizeArabic(r.to_entity);

            if (matchedNames.has(fromNorm) || matchedNames.has(toNorm)) {
                subgraphRelations.push(r);
                if (!matchedNames.has(fromNorm)) additionalEntityNames.add(fromNorm);
                if (!matchedNames.has(toNorm)) additionalEntityNames.add(toNorm);
            }
        }

        // Include connected 1-hop neighbor entities
        const subgraphEntities = [...matchedEntities];
        for (const e of allEntities) {
            if (additionalEntityNames.has(normalizeArabic(e.name))) {
                if (!subgraphEntities.some(se => se.id === e.id)) {
                    subgraphEntities.push(e);
                }
            }
        }

        const subgraph: Subgraph = {
            entities: subgraphEntities,
            relations: subgraphRelations
        };

        // 3. Episodic Memory Retrieval
        const relevantEpisodes = await EpisodeRepository.search(keywords);
        if (relevantEpisodes.length === 0) {
            const recent = await EpisodeRepository.findRecent(3);
            relevantEpisodes.push(...recent);
        }

        // 4. Procedural Memory Retrieval
        const allProcedures = await ProcedureRepository.findAll();
        const triggeredProcedures: Procedure[] = [];

        for (const proc of allProcedures) {
            const hasTrigger = proc.trigger_keywords.some(kw =>
                userInput.toLowerCase().includes(kw.toLowerCase()) ||
                keywords.some(k => isArabicMatch(k, kw))
            );
            if (hasTrigger) {
                triggeredProcedures.push(proc);
            }
        }

        return {
            workingMemory,
            subgraph,
            relevantEpisodes,
            triggeredProcedures
        };
    }
}
