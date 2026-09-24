// EyraOS Cognitive Memory Type Definitions

export type MemoryStatus = 'active' | 'superseded' | 'decayed';

export interface Entity {
    id: string;
    name: string;
    type: string;
    attributes: Record<string, any>;
    confidence: number;
    source: string;
    status: MemoryStatus;
    access_count: number;
    last_accessed_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Relation {
    id: string;
    from_entity: string;
    relation: string;
    to_entity: string;
    confidence: number;
    source: string;
    type: 'fact' | 'inference' | 'learned';
    reinforcement_count: number;
    status: MemoryStatus;
    superseded_at?: string | null;
    superseded_reason?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Episode {
    id: string;
    summary: string;
    type: 'fact' | 'question' | 'event' | 'session_closure' | 'consolidation' | 'procedure_execution' | 'conversation';
    participants: string[];
    timestamp: string;
    context?: string;
    significance?: 'low' | 'normal' | 'high' | 'critical';
}

export interface ProcedureStep {
    stepNumber: number;
    title: string;
    instruction: string;
    expectedOutcome: string;
}

export interface Procedure {
    id: string;
    name: string;
    trigger_keywords: string[];
    description: string;
    category: 'workflow' | 'hardware_diagnostic' | 'navigation_power' | 'safety' | 'general';
    steps: ProcedureStep[];
    confidence: number;
    source: string;
    execution_count: number;
    last_executed_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Session {
    id: string;
    status: 'active' | 'closed';
    started_at: string;
    last_activity: string;
    working_memory: Record<string, any>;
    turns: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
    }>;
}

export interface Subgraph {
    entities: Entity[];
    relations: Relation[];
}

export interface TieredRetrievalResult {
    workingMemory: Record<string, any>;
    subgraph: Subgraph;
    relevantEpisodes: Episode[];
    triggeredProcedures: Procedure[];
}
