// EyraOS Conflict Resolution Engine & Memory FSM

import { Relation } from '../types/memory.types';
import { isArabicMatch } from './arabic';

export const EXCLUSIVE_RELATIONS = [
    'lives_in', 'lives_at', 'located_in', 'current_role', 'current_status',
    'status_is', 'works_at', 'born_in', 'current_location', 'resides_in',
    'يعيش_في', 'يسكن_في', 'يقع_في', 'وظيفته_الحالية', 'حالته_الحالية'
];

export const OPPOSITE_RELATIONS: Record<string, string[]> = {
    'likes': ['dislikes', 'hates'],
    'dislikes': ['likes', 'loves'],
    'loves': ['hates', 'dislikes'],
    'hates': ['loves', 'likes'],
    'prefers': ['avoids'],
    'avoids': ['prefers'],
    'يحب': ['يكره', 'لا_يحب'],
    'يكره': ['يحب', 'يعشق']
};

export interface ConflictCheckResult {
    hasConflict: boolean;
    conflictingRelations: Relation[];
    reason: string;
}

export class ConflictEngine {
    /**
     * Checks if a new relation contradicts or supersedes any existing active relation.
     */
    static detectConflict(
        existingRelations: Relation[],
        fromEntity: string,
        relationType: string,
        toEntity: string
    ): ConflictCheckResult {
        const active = existingRelations.filter(r => r.status === 'active');
        const conflicts: Relation[] = [];
        let reason = '';

        const relLower = relationType.toLowerCase().trim();

        // 1. Check Exclusive 1-to-1 Relations
        const isExclusive = EXCLUSIVE_RELATIONS.some(
            ex => ex.toLowerCase() === relLower
        );

        if (isExclusive) {
            for (const r of active) {
                if (
                    isArabicMatch(r.from_entity, fromEntity) &&
                    r.relation.toLowerCase().trim() === relLower &&
                    !isArabicMatch(r.to_entity, toEntity)
                ) {
                    conflicts.push(r);
                    reason = `Exclusive relation '${relationType}' superseded by new target '${toEntity}'`;
                }
            }
        }

        // 2. Check Opposite / Polarity Relations
        const opposites = OPPOSITE_RELATIONS[relLower] || [];
        for (const opp of opposites) {
            for (const r of active) {
                if (
                    isArabicMatch(r.from_entity, fromEntity) &&
                    r.relation.toLowerCase().trim() === opp.toLowerCase() &&
                    isArabicMatch(r.to_entity, toEntity)
                ) {
                    conflicts.push(r);
                    reason = `Opposite relation contradiction: '${relationType}' contradicts '${r.relation}'`;
                }
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflictingRelations: conflicts,
            reason
        };
    }
}
