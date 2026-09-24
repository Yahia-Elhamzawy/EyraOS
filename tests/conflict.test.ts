import { ConflictEngine, EXCLUSIVE_RELATIONS } from '../src/core/conflict';
import { Relation } from '../src/types/memory.types';

describe('Conflict Resolution Engine & FSM', () => {
    const existingRelations: Relation[] = [
        {
            id: 'rel_1',
            from_entity: 'يحيى',
            relation: 'lives_in',
            to_entity: 'المنيا',
            confidence: 1.0,
            source: 'direct_statement',
            type: 'fact',
            reinforcement_count: 1,
            status: 'active'
        },
        {
            id: 'rel_2',
            from_entity: 'يحيى',
            relation: 'likes',
            to_entity: 'القهوة',
            confidence: 0.9,
            source: 'direct_statement',
            type: 'fact',
            reinforcement_count: 1,
            status: 'active'
        }
    ];

    test('detects conflict for exclusive relation with different target (lives_in)', () => {
        const result = ConflictEngine.detectConflict(
            existingRelations,
            'يحيى',
            'lives_in',
            'الجيزة'
        );

        expect(result.hasConflict).toBe(true);
        expect(result.conflictingRelations).toHaveLength(1);
        expect(result.conflictingRelations[0].id).toBe('rel_1');
        expect(result.conflictingRelations[0].to_entity).toBe('المنيا');
    });

    test('does not conflict when re-stating the same exclusive target', () => {
        const result = ConflictEngine.detectConflict(
            existingRelations,
            'يحيى',
            'lives_in',
            'المنيا'
        );

        expect(result.hasConflict).toBe(false);
    });

    test('detects opposite polarity conflict (likes vs dislikes)', () => {
        const result = ConflictEngine.detectConflict(
            existingRelations,
            'يحيى',
            'dislikes',
            'القهوة'
        );

        expect(result.hasConflict).toBe(true);
        expect(result.conflictingRelations[0].id).toBe('rel_2');
    });

    test('detects Arabic opposite polarity (يحب vs يكره)', () => {
        const arabicRels: Relation[] = [
            {
                id: 'rel_ar_1',
                from_entity: 'يحيى',
                relation: 'يحب',
                to_entity: 'المعماريات المعرفية',
                confidence: 1.0,
                source: 'direct_statement',
                type: 'fact',
                reinforcement_count: 1,
                status: 'active'
            }
        ];

        const result = ConflictEngine.detectConflict(
            arabicRels,
            'يحيى',
            'يكره',
            'المعماريات المعرفية'
        );

        expect(result.hasConflict).toBe(true);
        expect(result.conflictingRelations[0].id).toBe('rel_ar_1');
    });

    test('ignores non-conflicting relations for same entities', () => {
        const result = ConflictEngine.detectConflict(
            existingRelations,
            'يحيى',
            'studies_at',
            'جامعة القاهرة الجديدة التكنولوجية'
        );

        expect(result.hasConflict).toBe(false);
    });
});
