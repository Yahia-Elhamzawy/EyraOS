// ═══════════════════════════════════════════════════════════════
// EyraOS — Cognitive Memory & Chat Server (Upgraded Architecture)
// Memory Layers, Selective Tiered Retrieval & Reflection Engine
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Gemini API Setup ──────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in .env! Please define it in your .env file.');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'MISSING_API_KEY');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════
// Arabic Text Normalization & Matching Utilities
// ═══════════════════════════════════════════════════════════════

function normalizeArabic(text) {
    if (!text) return '';
    let s = text.trim();
    // Remove diacritics / tashkeel
    s = s.replace(/[\u064B-\u065F\u0670]/g, '');
    // Normalize alef variants (أ, إ, آ, ٱ -> ا)
    s = s.replace(/[أإآٱ]/g, 'ا');
    // Normalize teh marbuta (ة -> ه)
    s = s.replace(/ة/g, 'ه');
    // Normalize alef maksura (ى -> ي)
    s = s.replace(/ى/g, 'ي');
    // Remove tatweel / kashida
    s = s.replace(/ـ/g, '');
    return s.toLowerCase();
}

function stripArabicPrefix(word) {
    let w = normalizeArabic(word);
    if (w.startsWith('ال') && w.length > 3) {
        return w.substring(2);
    }
    return w;
}

function isArabicMatch(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = normalizeArabic(name1);
    const n2 = normalizeArabic(name2);
    if (n1 === n2) return true;

    // Check with stripped 'ال' prefix
    const s1 = stripArabicPrefix(name1);
    const s2 = stripArabicPrefix(name2);
    if (s1 === s2) return true;

    return false;
}

// ═══════════════════════════════════════════════════════════════
// Relation Contradiction & Exclusivity Definitions
// ═══════════════════════════════════════════════════════════════

// Exclusive 1-to-1 relations where a new target supersedes old target
const EXCLUSIVE_RELATIONS = [
    'lives_in', 'lives_at', 'located_in', 'current_role', 'current_status',
    'status_is', 'works_at', 'born_in', 'current_location', 'resides_in',
    'يعيش_في', 'يسكن_في', 'يقع_في', 'وظيفته_الحالية', 'حالته_الحالية'
];

// Direct opposite / polarity relations
const OPPOSITE_RELATIONS = {
    'likes': ['dislikes', 'hates'],
    'dislikes': ['likes', 'loves'],
    'loves': ['hates', 'dislikes'],
    'hates': ['loves', 'likes'],
    'prefers': ['avoids'],
    'avoids': ['prefers'],
    'يحب': ['يكره', 'لا_يحب'],
    'يكره': ['يحب', 'يعشق']
};

// ═══════════════════════════════════════════════════════════════
// Memory Engine — Core Cognitive Architecture
// ═══════════════════════════════════════════════════════════════

const MEMORY_FILE = path.join(__dirname, 'memory_store.json');

class MemoryEngine {
    constructor() {
        this.entities = [];
        this.relations = [];
        this.episodes = [];
        this.attributes = [];
        this.procedures = [];
        this.conversationHistory = [];
        this.load();
    }

    // ── Persistence ───────────────────────────────────────────
    load() {
        try {
            if (fs.existsSync(MEMORY_FILE)) {
                const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
                this.entities = data.entities || [];
                this.relations = data.relations || [];
                this.episodes = data.episodes || [];
                this.attributes = data.attributes || [];
                this.procedures = data.procedures || [];
                
                // Ensure statuses exist on old stores
                this.entities.forEach(e => { if (!e.status) e.status = 'active'; });
                this.relations.forEach(r => { if (!r.status) r.status = 'active'; });
            }
        } catch (err) {
            console.error('⚠️ Failed to load memory store:', err.message);
        }
    }

    save() {
        try {
            const data = {
                entities: this.entities,
                relations: this.relations,
                episodes: this.episodes,
                attributes: this.attributes,
                procedures: this.procedures,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error('⚠️ Failed to save memory store:', err.message);
        }
    }

    // ── Entity Management ─────────────────────────────────────
    addEntity(name, type, metadata = {}) {
        const trimmedName = name.trim();
        const existing = this.entities.find(e => isArabicMatch(e.name, trimmedName));

        if (existing) {
            if (type && type !== 'unknown') {
                existing.type = type;
            }
            existing.updatedAt = new Date().toISOString();
            existing.accessCount = (existing.accessCount || 0) + 1;
            existing.lastAccessedAt = new Date().toISOString();
            if (metadata.attributes) {
                existing.attributes = { ...existing.attributes, ...metadata.attributes };
            }
            this.save();
            return existing;
        }

        const entity = {
            id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: trimmedName,
            type: type || 'unknown',
            attributes: metadata.attributes || {},
            confidence: metadata.confidence || 0.8,
            source: metadata.source || 'conversation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            accessCount: 1,
            status: 'active'
        };

        this.entities.push(entity);
        this.save();
        return entity;
    }

    // ── Entity Deletion ───────────────────────────────────────
    deleteEntity(name) {
        const trimmed = name.trim();
        const initialEntityCount = this.entities.length;
        this.entities = this.entities.filter(e => !isArabicMatch(e.name, trimmed));

        const initialRelationCount = this.relations.length;
        this.relations = this.relations.filter(r =>
            !isArabicMatch(r.from, trimmed) && !isArabicMatch(r.to, trimmed)
        );

        this.save();
        console.log(`🗑️ Deleted entity "${trimmed}" and removed ${initialRelationCount - this.relations.length} relations.`);
        return {
            removedEntity: initialEntityCount > this.entities.length,
            removedRelationsCount: initialRelationCount - this.relations.length
        };
    }

    // ── Relation & Contradiction Management ───────────────────
    revokeRelation(fromName, relation, toName, reason) {
        const from = fromName.trim();
        const to = toName.trim();
        const superseded = [];

        this.relations.forEach(r => {
            if (r.status === 'active' && isArabicMatch(r.from, from) && isArabicMatch(r.to, to)) {
                if (!relation || r.relation.toLowerCase() === relation.toLowerCase() ||
                    relation.includes(r.relation) || r.relation.includes(relation)) {
                    r.status = 'superseded';
                    r.supersededAt = new Date().toISOString();
                    r.supersededReason = reason || 'Explicitly revoked / negated by user';
                    superseded.push(r);
                    console.log(`⚡ Relation explicitly revoked: "${r.from} ${r.relation} ${r.to}"`);
                }
            }
        });

        // Check if target entity has ANY remaining active relations; if not, mark entity as superseded
        const remainingActive = this.relations.filter(r =>
            r.status === 'active' && (isArabicMatch(r.from, to) || isArabicMatch(r.to, to))
        );
        if (remainingActive.length === 0) {
            const targetEnt = this.entities.find(e => isArabicMatch(e.name, to));
            if (targetEnt && targetEnt.status === 'active') {
                targetEnt.status = 'superseded';
                targetEnt.supersededReason = 'Isolated node after relation revocation';
                console.log(`⚡ Isolated entity marked superseded: "${targetEnt.name}"`);
            }
        }

        this.save();
        return superseded;
    }

    deleteRelation(id) {
        const initialCount = this.relations.length;
        this.relations = this.relations.filter(r => r.id !== id);
        this.save();
        console.log(`🗑️ Deleted relation ID: ${id}`);
        return { success: initialCount > this.relations.length };
    }

    addRelation(fromName, relation, toName, metadata = {}) {
        const from = fromName.trim();
        const relStr = relation.trim().toLowerCase();
        const to = toName.trim();

        // Check for Negative Relation (e.g. does_not_live_in, not_in, no_longer_lives_in)
        const isNegative = relStr.startsWith('does_not_') || relStr.startsWith('not_') ||
                           relStr.startsWith('no_longer_') || relStr.startsWith('لا_') ||
                           relStr.startsWith('مش_') || relStr.startsWith('ليس_') ||
                           relStr === 'left' || relStr === 'ترك';

        if (isNegative) {
            let positiveBase = relStr
                .replace(/^does_not_/, '')
                .replace(/^not_/, '')
                .replace(/^no_longer_/, '')
                .replace(/^لا_/, '')
                .replace(/^مش_/, '')
                .replace(/^ليس_/, '');
            if (positiveBase === 'live_in') positiveBase = 'lives_in';
            if (positiveBase === 'like') positiveBase = 'likes';
            if (relStr === 'left' || relStr === 'ترك') positiveBase = 'lives_in';

            const superseded = this.revokeRelation(from, positiveBase, to, `Negated by: ${relStr}`);
            return { relation: null, superseded, isRevocation: true };
        }

        // 1. Check for exact duplicate relation
        const existingExact = this.relations.find(r =>
            isArabicMatch(r.from, from) &&
            r.relation.toLowerCase() === relStr &&
            isArabicMatch(r.to, to) &&
            r.status === 'active'
        );

        if (existingExact) {
            existingExact.confidence = Math.min(1.0, (existingExact.confidence || 0.8) + 0.05);
            existingExact.updatedAt = new Date().toISOString();
            existingExact.reinforcementCount = (existingExact.reinforcementCount || 1) + 1;
            this.save();
            return { relation: existingExact, superseded: [] };
        }

        const supersededList = [];

        // 2. Check for Exclusive Relation Conflict (e.g. lives_in: Cairo -> Alexandria)
        const isExclusive = EXCLUSIVE_RELATIONS.includes(relStr);
        if (isExclusive) {
            const conflicting = this.relations.filter(r =>
                isArabicMatch(r.from, from) &&
                r.relation.toLowerCase() === relStr &&
                !isArabicMatch(r.to, to) &&
                r.status === 'active'
            );

            conflicting.forEach(oldRel => {
                oldRel.status = 'superseded';
                oldRel.supersededAt = new Date().toISOString();
                oldRel.supersededReason = `Changed destination to: ${to}`;
                supersededList.push(oldRel);
                console.log(`⚡ Memory Conflict Resolved: "${oldRel.from} ${oldRel.relation} ${oldRel.to}" superseded by "${to}"`);
            });
        }

        // 3. Check for Opposite Polarity Conflict (e.g. likes Pizza -> dislikes Pizza)
        const opposites = OPPOSITE_RELATIONS[relStr] || [];
        if (opposites.length > 0) {
            const oppositeConflicting = this.relations.filter(r =>
                isArabicMatch(r.from, from) &&
                isArabicMatch(r.to, to) &&
                opposites.includes(r.relation.toLowerCase()) &&
                r.status === 'active'
            );

            oppositeConflicting.forEach(oldRel => {
                oldRel.status = 'superseded';
                oldRel.supersededAt = new Date().toISOString();
                oldRel.supersededReason = `Polarity reversed by: ${relStr}`;
                supersededList.push(oldRel);
                console.log(`⚡ Polarity Conflict Resolved: "${oldRel.from} ${oldRel.relation} ${oldRel.to}" superseded by "${relStr}"`);
            });
        }

        // 4. Create new relation
        const newRel = {
            id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            from,
            relation: relStr,
            to,
            confidence: metadata.confidence || 0.8,
            source: metadata.source || 'conversation',
            type: metadata.type || 'fact',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            reinforcementCount: 1,
            status: 'active'
        };

        this.relations.push(newRel);
        this.save();
        return { relation: newRel, superseded: supersededList };
    }

    // ── Episode Management ────────────────────────────────────
    addEpisode(episode) {
        const ep = {
            id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            summary: episode.summary,
            type: episode.type || 'event',
            participants: episode.participants || [],
            timestamp: new Date().toISOString(),
            context: episode.context || '',
            significance: episode.significance || 'normal'
        };

        this.episodes.push(ep);
        this.save();
        return ep;
    }

    // ── Procedural Memory Management (Layer 5) ────────────────
    getProcedures() {
        return this.procedures;
    }

    getProcedureById(id) {
        return this.procedures.find(p => p.id === id);
    }

    findProcedureByQuery(query) {
        if (!query) return null;
        const normQuery = normalizeArabic(query);
        for (const proc of this.procedures) {
            const normName = normalizeArabic(proc.name);
            if (normQuery.includes(normName) || normName.includes(normQuery)) {
                return proc;
            }
            if (proc.triggerKeywords && Array.isArray(proc.triggerKeywords)) {
                for (const kw of proc.triggerKeywords) {
                    if (normQuery.includes(normalizeArabic(kw))) {
                        return proc;
                    }
                }
            }
        }
        return null;
    }

    addProcedure(procData) {
        if (!procData || !procData.name) return null;
        const normName = normalizeArabic(procData.name);
        const existing = this.procedures.find(p => normalizeArabic(p.name) === normName);

        if (existing) {
            existing.description = procData.description || existing.description;
            existing.steps = procData.steps || existing.steps;
            existing.category = procData.category || existing.category;
            existing.triggerKeywords = [...new Set([...(existing.triggerKeywords || []), ...(procData.triggerKeywords || [])])];
            existing.updatedAt = new Date().toISOString();
            this.save();
            console.log(`⚙️ Procedural Memory: Updated procedure "${existing.name}"`);
            return existing;
        }

        const procedure = {
            id: procData.id || `proc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: procData.name.trim(),
            triggerKeywords: procData.triggerKeywords || [],
            description: procData.description || '',
            category: procData.category || 'general',
            steps: procData.steps || [],
            confidence: procData.confidence || 0.9,
            source: procData.source || 'learned_from_user',
            executionCount: 0,
            lastExecutedAt: null,
            createdAt: new Date().toISOString()
        };

        this.procedures.push(procedure);
        this.save();
        console.log(`⚙️ Procedural Memory: Learned new procedure "${procedure.name}" (${procedure.steps.length} steps)`);
        return procedure;
    }

    deleteProcedure(id) {
        const initialCount = this.procedures.length;
        this.procedures = this.procedures.filter(p => p.id !== id);
        this.save();
        console.log(`🗑️ Deleted procedure ID: ${id}`);
        return { success: initialCount > this.procedures.length };
    }

    executeProcedure(id, details = {}) {
        const proc = this.procedures.find(p => p.id === id);
        if (!proc) return null;

        proc.executionCount = (proc.executionCount || 0) + 1;
        proc.lastExecutedAt = new Date().toISOString();

        // Record in Episodic Memory
        this.addEpisode({
            summary: `تنفيذ إجرائي: تم تشغيل بروتوكول "${proc.name}" بنجاح (${proc.steps.length} خطوات)`,
            type: 'procedure_execution',
            participants: ['EyraOS', details.user || 'يحيى'],
            context: `Execution of ${proc.id}`
        });

        this.save();
        console.log(`🚀 Executed procedure "${proc.name}" (Count: ${proc.executionCount})`);
        return proc;
    }

    // ── Selective Tiered Retrieval Engine ─────────────────────
    // Implements "Memory != Context": Retrieves only the relevant subgraph
    retrieveRelevantContext(userMessage, budget = { maxEntities: 8, maxRelations: 12 }) {
        const normMsg = normalizeArabic(userMessage);
        const tokens = normMsg.split(/\s+/).filter(t => t.length > 2);

        // 1. Identify Seed Entities mentioned in user message
        const seedEntities = this.entities.filter(e => {
            if (e.status !== 'active') return false;
            const normEntityName = normalizeArabic(e.name);
            const stripped = stripArabicPrefix(e.name);

            // Exact or substring match in message
            if (normMsg.includes(normEntityName) || normMsg.includes(stripped)) {
                return true;
            }
            // Token match
            return tokens.some(token => normEntityName.includes(token) || token.includes(normEntityName));
        });

        let candidateEntities = new Map();
        let candidateRelations = new Map();

        seedEntities.forEach(e => {
            candidateEntities.set(e.name.toLowerCase(), e);
            // Update last accessed
            e.lastAccessedAt = new Date().toISOString();
            e.accessCount = (e.accessCount || 0) + 1;
        });

        // 2. 1-Hop Graph Traversal: Find relations connected to seed entities
        if (seedEntities.length > 0) {
            seedEntities.forEach(seed => {
                const connected = this.relations.filter(r =>
                    r.status === 'active' &&
                    (isArabicMatch(r.from, seed.name) || isArabicMatch(r.to, seed.name))
                );

                connected.forEach(r => {
                    if (candidateRelations.size < budget.maxRelations) {
                        candidateRelations.set(r.id, r);

                        // Also add neighbor entity
                        const neighborName = isArabicMatch(r.from, seed.name) ? r.to : r.from;
                        const neighborObj = this.entities.find(e => isArabicMatch(e.name, neighborName) && e.status === 'active');
                        if (neighborObj && candidateEntities.size < budget.maxEntities) {
                            candidateEntities.set(neighborObj.name.toLowerCase(), neighborObj);
                        }
                    }
                });
            });
        } else {
            // 3. Fallback: If no direct entity match in message, take top recent/frequently accessed entities
            const recentEntities = [...this.entities]
                .filter(e => e.status === 'active')
                .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
                .slice(0, 4);

            recentEntities.forEach(e => {
                candidateEntities.set(e.name.toLowerCase(), e);
                const connected = this.relations.filter(r =>
                    r.status === 'active' &&
                    (isArabicMatch(r.from, e.name) || isArabicMatch(r.to, e.name))
                ).slice(0, 3);

                connected.forEach(r => {
                    if (candidateRelations.size < budget.maxRelations) {
                        candidateRelations.set(r.id, r);
                    }
                });
            });
        }

        const retrievedEntities = Array.from(candidateEntities.values());
        const retrievedRelations = Array.from(candidateRelations.values());

        // Build concise selective context string
        let contextText = '';
        if (retrievedEntities.length === 0 && retrievedRelations.length === 0) {
            contextText = 'No specific prior memories directly relevant to this query.';
        } else {
            contextText += `=== RETRIEVED RELEVANT MEMORIES (${retrievedEntities.length}/${this.entities.length} entities) ===\n`;
            if (retrievedEntities.length > 0) {
                contextText += 'Relevant Entities:\n';
                retrievedEntities.forEach(e => {
                    contextText += `- ${e.name} [Type: ${e.type}]`;
                    if (e.attributes && Object.keys(e.attributes).length > 0) {
                        contextText += ` (${JSON.stringify(e.attributes)})`;
                    }
                    contextText += '\n';
                });
            }
            if (retrievedRelations.length > 0) {
                contextText += '\nRelevant Relationships:\n';
                retrievedRelations.forEach(r => {
                    contextText += `- ${r.from} —[${r.relation}]→ ${r.to} (confidence: ${r.confidence})\n`;
                });
            }
        }

        // Include recent episodes (last 3)
        const recentEpisodes = this.episodes.slice(-3);
        if (recentEpisodes.length > 0) {
            contextText += '\nRecent Contextual Events:\n';
            recentEpisodes.forEach(ep => {
                contextText += `- ${ep.summary}\n`;
            });
        }

        // Check for relevant procedure in Procedural Memory (Layer 5)
        const matchedProcedure = this.findProcedureByQuery(userMessage);
        if (matchedProcedure) {
            contextText += `\n=== RELEVANT PROCEDURAL MEMORY (Layer 5: How-To Knowledge) ===\n`;
            contextText += `Procedure: ${matchedProcedure.name} (ID: ${matchedProcedure.id})\n`;
            contextText += `Description: ${matchedProcedure.description}\n`;
            contextText += `Steps:\n`;
            matchedProcedure.steps.forEach(s => {
                contextText += `  Step ${s.stepNumber}: ${s.title} — ${s.instruction} [Outcome: ${s.expectedOutcome}]\n`;
            });
        }

        const totalActiveEntities = this.entities.filter(e => e.status === 'active').length;
        const totalActiveRelations = this.relations.filter(r => r.status === 'active').length;

        const telemetry = {
            retrievedEntitiesCount: retrievedEntities.length,
            totalEntities: this.entities.length,
            totalActiveEntities,
            retrievedRelationsCount: retrievedRelations.length,
            totalRelations: this.relations.length,
            totalActiveRelations,
            retrievalPercentage: Math.round((retrievedEntities.length / (totalActiveEntities || 1)) * 100),
            retrievedEntitiesList: retrievedEntities.map(e => e.name),
            matchedProcedureName: matchedProcedure ? matchedProcedure.name : null
        };

        return {
            contextText,
            retrievedEntities,
            retrievedRelations,
            matchedProcedure,
            telemetry
        };
    }

    // ── Reflection & Memory Consolidation (Layer 9) ───────────
    async consolidateMemory() {
        console.log('🔄 Running Cognitive Consolidation & Reflection Cycle...');

        const recentEpisodes = this.episodes.slice(-25);
        const activeEntities = this.entities.filter(e => e.status === 'active');
        const activeRelations = this.relations.filter(r => r.status === 'active');

        if (recentEpisodes.length === 0 && activeRelations.length === 0) {
            return {
                success: true,
                message: 'No significant experiences yet to consolidate.',
                insights: 'الذاكرة لا تزال في بدايتها، لا توجد أحداث كافية للتأمل.',
                newInferences: [],
                mergedCount: 0
            };
        }

        const consolidationPrompt = `You are the Reflection & Memory Consolidation layer of EyraOS (Cognitive Layer 9).
Your role is to reflect upon episodic experiences and semantic relations to synthesize higher-level understanding.

=== RECENT EPISODES (What happened) ===
${recentEpisodes.map(ep => `[${ep.timestamp}] (${ep.type}): ${ep.summary}`).join('\n')}

=== CURRENT ACTIVE RELATIONS ===
${activeRelations.map(r => `${r.from} -> ${r.relation} -> ${r.to} (conf: ${r.confidence}, count: ${r.reinforcementCount || 1})`).join('\n')}

=== ACTIVE ENTITIES ===
${activeEntities.map(e => `${e.name} (${e.type})`).join(', ')}

Your Tasks:
1. Synthesize 1 to 3 generalized behavioral inferences or confirmed preferences that emerged from repeated interactions (e.g., user preferences, patterns).
2. Detect if any entities are duplicates or Arabic spelling variants (e.g. "احمد" vs "أحمد") that should be unified.
3. Formulate a short, intelligent reflection summary in Arabic explaining what the robot has consolidated and learned.

Output MUST be strictly valid JSON format only:
{
  "insights": "ملخص التأمل والوعي باللغة العربية...",
  "newInferences": [
    {
      "from": "EntityName",
      "relation": "prefers|habits|values|mastered",
      "to": "ConceptName",
      "confidence": 0.85,
      "reason": "Brief explanation of how this was inferred"
    }
  ],
  "duplicateMerges": [
    {
      "primary": "CorrectName",
      "duplicate": "VariantName"
    }
  ]
}`;

        try {
            const result = await model.generateContent(consolidationPrompt);
            let cleaned = result.response.text().trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();

            const parsed = JSON.parse(cleaned);
            const appliedInferences = [];

            // Apply new inferences
            if (parsed.newInferences && Array.isArray(parsed.newInferences)) {
                for (const inf of parsed.newInferences) {
                    if (inf.from && inf.relation && inf.to) {
                        this.addEntity(inf.from, 'person');
                        this.addEntity(inf.to, 'concept');
                        const added = this.addRelation(inf.from, inf.relation, inf.to, {
                            confidence: inf.confidence || 0.85,
                            source: 'reflection_consolidation',
                            type: 'inference'
                        });
                        appliedInferences.push(added.relation);
                    }
                }
            }

            // Handle duplicate merges if any
            let mergedCount = 0;
            if (parsed.duplicateMerges && Array.isArray(parsed.duplicateMerges)) {
                for (const merge of parsed.duplicateMerges) {
                    if (merge.primary && merge.duplicate && merge.primary !== merge.duplicate) {
                        const dupEntity = this.entities.find(e => isArabicMatch(e.name, merge.duplicate));
                        if (dupEntity) {
                            dupEntity.status = 'superseded';
                            dupEntity.supersededReason = `Merged into ${merge.primary}`;
                            mergedCount++;
                            // Re-route relations
                            this.relations.forEach(r => {
                                if (isArabicMatch(r.from, merge.duplicate)) r.from = merge.primary;
                                if (isArabicMatch(r.to, merge.duplicate)) r.to = merge.primary;
                            });
                        }
                    }
                }
            }

            // Log consolidation event
            this.addEpisode({
                summary: `Cognitive Consolidation: ${parsed.insights || 'Synthesized patterns from recent experiences'}`,
                type: 'consolidation',
                participants: ['EyraOS'],
                context: 'System reflection cycle'
            });

            this.save();

            return {
                success: true,
                insights: parsed.insights,
                newInferences: appliedInferences,
                mergedCount,
                stats: this.getStats()
            };

        } catch (err) {
            console.error('⚠️ Consolidation error:', err.message);
            return {
                success: false,
                error: err.message,
                insights: 'حدث خطأ أثناء دورة التجميع والتأمل.'
            };
        }
    }

    // ── Graph & Statistics ────────────────────────────────────
    getFullGraph() {
        return {
            entities: this.entities,
            relations: this.relations
        };
    }

    getStats() {
        const activeEntities = this.entities.filter(e => e.status === 'active');
        const activeRelations = this.relations.filter(r => r.status === 'active');
        const supersededRelations = this.relations.filter(r => r.status === 'superseded');

        return {
            totalEntities: this.entities.length,
            activeEntities: activeEntities.length,
            totalRelations: this.relations.length,
            activeRelations: activeRelations.length,
            supersededRelations: supersededRelations.length,
            totalEpisodes: this.episodes.length,
            totalProcedures: this.procedures.length,
            entityTypes: [...new Set(this.entities.map(e => e.type))],
            conversationLength: this.conversationHistory.length,
            lastUpdated: new Date().toISOString()
        };
    }

    clearAll() {
        this.entities = [];
        this.relations = [];
        this.episodes = [];
        this.attributes = [];
        this.conversationHistory = [];
        this.save();
    }
}

const memory = new MemoryEngine();

// ═══════════════════════════════════════════════════════════════
// Session Manager — Working Memory & Dual-Stream Cognitive Engine
// ═══════════════════════════════════════════════════════════════

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

class SessionManager {
    constructor(memoryEngine) {
        this.memoryEngine = memoryEngine;
        this.currentSession = this.createNewSession();
    }

    createNewSession() {
        return {
            id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            startedAt: new Date().toISOString(),
            lastActivity: Date.now(),
            workingMemory: [], // raw dialog buffer in current active session
            status: 'active'
        };
    }

    isExpired() {
        if (!this.currentSession.workingMemory || this.currentSession.workingMemory.length === 0) {
            return false;
        }
        return (Date.now() - this.currentSession.lastActivity) > SESSION_TIMEOUT_MS;
    }

    addExchange(userMsg, botReply) {
        this.currentSession.workingMemory.push(
            { role: 'user', content: userMsg, timestamp: new Date().toISOString() },
            { role: 'eyra', content: botReply, timestamp: new Date().toISOString() }
        );
        this.currentSession.lastActivity = Date.now();
        this.memoryEngine.conversationHistory = this.currentSession.workingMemory;
    }

    getStatus() {
        const now = Date.now();
        const elapsed = now - this.currentSession.lastActivity;
        const remainingMs = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
        const hasMessages = this.currentSession.workingMemory.length > 0;
        return {
            sessionId: this.currentSession.id,
            status: this.currentSession.status,
            startedAt: this.currentSession.startedAt,
            lastActivity: new Date(this.currentSession.lastActivity).toISOString(),
            workingMemoryCount: this.currentSession.workingMemory.length,
            workingMemory: this.currentSession.workingMemory,
            timeoutMs: SESSION_TIMEOUT_MS,
            remainingMs: hasMessages ? remainingMs : SESSION_TIMEOUT_MS,
            remainingSeconds: Math.floor((hasMessages ? remainingMs : SESSION_TIMEOUT_MS) / 1000)
        };
    }

    async consolidateAndFlushSession(reason = 'inactivity_timeout') {
        const sessionToConsolidate = this.currentSession;
        if (!sessionToConsolidate.workingMemory || sessionToConsolidate.workingMemory.length === 0) {
            return {
                consolidated: false,
                message: 'الذاكرة العاملة فارغة بالفعل، لا يوجد حوار لتلخيصه.',
                sessionId: sessionToConsolidate.id,
                session: this.getStatus()
            };
        }

        console.log(`🧠 [Session Manager] Consolidating session ${sessionToConsolidate.id} (${reason})...`);

        const sessionTranscript = sessionToConsolidate.workingMemory.map(m =>
            `${m.role === 'user' ? 'المستخدم' : 'Eyra'}: ${m.content}`
        ).join('\n');

        const activeEntities = this.memoryEngine.entities.filter(e => e.status === 'active').map(e => e.name);

        const postSessionPrompt = `You are the Post-Session Cognitive Consolidation Engine of EyraOS (Layer 11).
A conversational session has ended (Reason: ${reason}).
Review the entire dialog transcript of this session holistically.

=== FULL SESSION TRANSCRIPT ===
${sessionTranscript}

=== CURRENT ACTIVE KNOWLEDGE GRAPH ENTITIES ===
${activeEntities.join(', ')}

Your Tasks:
1. Formulate a concise summary of this entire session to be permanently stored as an Episode in Episodic Memory.
2. Identify 1 to 2 implicit behavioral patterns, habits, or persistent interests demonstrated by the user (e.g. prefers concise answers, interested in robots, software engineering).
3. Determine if there is any crucial knowledge that should be permanently added to the Semantic Graph that was NOT captured in the fast-path. (Filter out trivial banter, casual greetings, or temporary questions).
4. Provide a clear Arabic explanation of what was consolidated and stored.

Output MUST be strictly valid JSON format only without markdown blocks:
{
  "episodeSummary": "ملخص شامل ومركز لما دار في الجلسة باللغة العربية",
  "learnedInferences": [
    {
      "from": "EntityName",
      "relation": "prefers|interested_in|dislikes|values",
      "to": "ConceptName",
      "confidence": 0.88,
      "reason": "Brief reason in Arabic"
    }
  ],
  "consolidationNotes": "ملخص باللغة العربية يوضح ما تم تعلمه وتثبيته وتفريغ الذاكرة العاملة"
}`;

        try {
            const result = await model.generateContent(postSessionPrompt);
            let cleaned = result.response.text().trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();
            const parsed = JSON.parse(cleaned);

            // 1. Commit Episode to Episodic Memory
            if (parsed.episodeSummary) {
                this.memoryEngine.addEpisode({
                    summary: `جلسة منتهية: ${parsed.episodeSummary}`,
                    type: 'session_closure',
                    participants: ['User', 'Eyra'],
                    context: `Session ${sessionToConsolidate.id} closed via ${reason}`
                });
            }

            // 2. Commit Learned Inferences to Semantic Memory
            const appliedInferences = [];
            if (parsed.learnedInferences && Array.isArray(parsed.learnedInferences)) {
                for (const inf of parsed.learnedInferences) {
                    if (inf.from && inf.relation && inf.to) {
                        this.memoryEngine.addEntity(inf.from, 'person');
                        this.memoryEngine.addEntity(inf.to, 'concept');
                        const outcome = this.memoryEngine.addRelation(inf.from, inf.relation, inf.to, {
                            confidence: inf.confidence || 0.88,
                            source: 'post_session_consolidation',
                            type: 'inference'
                        });
                        if (outcome.relation) appliedInferences.push(outcome.relation);
                    }
                }
            }

            this.memoryEngine.save();

            // 3. Flush Working Memory and start fresh session
            const oldId = sessionToConsolidate.id;
            const msgCount = sessionToConsolidate.workingMemory.length;
            this.currentSession = this.createNewSession();
            this.memoryEngine.conversationHistory = [];

            return {
                consolidated: true,
                sessionId: oldId,
                messagesFlushed: msgCount,
                episodeSummary: parsed.episodeSummary,
                learnedInferences: appliedInferences,
                notes: parsed.consolidationNotes,
                newSessionId: this.currentSession.id,
                stats: this.memoryEngine.getStats(),
                graph: this.memoryEngine.getFullGraph(),
                session: this.getStatus()
            };
        } catch (err) {
            console.error('⚠️ Post-session consolidation fallback:', err.message);
            this.memoryEngine.addEpisode({
                summary: `انتهت جلسة حوارية وتفريغ الذاكرة العاملة (${sessionToConsolidate.workingMemory.length} رسائل)`,
                type: 'session_closure',
                participants: ['User', 'Eyra']
            });
            this.memoryEngine.save();
            const oldId = sessionToConsolidate.id;
            const count = sessionToConsolidate.workingMemory.length;
            this.currentSession = this.createNewSession();
            this.memoryEngine.conversationHistory = [];
            return {
                consolidated: true,
                sessionId: oldId,
                messagesFlushed: count,
                notes: 'تم إنهاء الجلسة وتفريغ الذاكرة العاملة.',
                newSessionId: this.currentSession.id,
                stats: this.memoryEngine.getStats(),
                session: this.getStatus()
            };
        }
    }
}

const sessionManager = new SessionManager(memory);

// ═══════════════════════════════════════════════════════════════
// Gemini Integration — Structured Dialog & Extraction
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are Eyra, an intelligent cognitive robot assistant powered by EyraOS.
You operate on a Multi-Layer Cognitive Architecture:
1. Online Fast-Stream (Immediate Declarative Facts):
   Extract ONLY clear, explicit, declarative facts directly stated by the user (such as name, city of residence, profession, declared likes/dislikes, or explicit objects).
   Do NOT extract casual chatter, temporary greetings, or transient conversational filler into 'entities' or 'relations'.
2. Active Working Memory (Current Session):
   Maintain the natural context, references, and pronouns of the ongoing conversation.
3. If the user states they NO LONGER live somewhere, NO LONGER like something, or negates a previously held fact:
   Put this in "revokedRelations": [
     {
       "from": "entity name",
       "relation": "positive relation being revoked (e.g. lives_in, likes, works_at)",
       "to": "entity name"
     }
   ]
   IMPORTANT: Do NOT create negative relations (such as does_not_live_in or not_in) in "relations". Only record them in "revokedRelations".
4. Procedural Memory (Layer 5: How-To Skills & Action Sequences):
   - If the user is teaching you a workflow, how-to procedure, or sequential protocol (e.g. "خطوات كذا هي: 1... 2..."):
     Extract it in "learnedProcedure":
     {
       "name": "اسم الإجراء أو المهارة بالعربية",
       "triggerKeywords": ["كلمات", "مفتاحية"],
       "description": "وصف مقتضب للهدف من الإجراء",
       "category": "workflow|diagnostic|navigation|safety|general",
       "steps": [
         { "stepNumber": 1, "title": "عنوان الخطوة", "instruction": "ماذا تفعل بالضبط", "expectedOutcome": "النتيجة المتوقعة" }
       ]
     }
   - If the user asks you to RUN, EXECUTE, SIMULATE, or EXPLAIN a procedure (or if a relevant procedure is in the retrieved context):
     Respond explaining what will be done and include "proceduralExecution": {
       "procedureId": "id_if_known",
       "procedureName": "اسم الإجراء",
       "status": "completed",
       "executedSteps": [
         { "stepNumber": 1, "title": "عنوان الخطوة", "status": "completed" }
       ]
     }
5. Classify each interaction as an episode.

IMPORTANT: Respond in valid JSON format only without markdown blocks.

JSON Structure:
{
  "reply": "Your natural conversational reply to the user",
  "entities": [
    {
      "name": "clean entity name",
      "type": "person|place|food|object|concept|organization|technology|other",
      "attributes": {}
    }
  ],
  "relations": [
    {
      "from": "entity name",
      "relation": "short positive verb relation (e.g. likes, lives_in, works_on, is_a, created, prefers)",
      "to": "entity name",
      "confidence": 0.9,
      "source": "direct_statement"
    }
  ],
  "revokedRelations": [
    {
      "from": "entity name",
      "relation": "lives_in|likes|works_at",
      "to": "entity name"
    }
  ],
  "learnedProcedure": null,
  "proceduralExecution": null,
  "episode": {
    "summary": "Brief summary of interaction",
    "type": "fact|inference|event|question"
  }
}`;

async function processMessage(userMessage) {
    try {
        // Check if previous session expired due to inactivity
        let previousSessionConsolidated = null;
        if (sessionManager.isExpired()) {
            previousSessionConsolidated = await sessionManager.consolidateAndFlushSession('inactivity_timeout');
        }

        // 1. Selective Tiered Retrieval (Memory != Context)
        const retrieval = memory.retrieveRelevantContext(userMessage);

        // 2. Active Working Memory (Session dialogue buffer)
        const recentHistory = sessionManager.currentSession.workingMemory.slice(-8).map(msg =>
            `${msg.role}: ${msg.content}`
        ).join('\n');

        const fullPrompt = `${SYSTEM_PROMPT}

${retrieval.contextText}

=== WORKING MEMORY (Active Session Dialog) ===
${recentHistory || 'No previous conversation in current session working memory.'}

=== USER MESSAGE ===
${userMessage}

Respond with valid JSON only:`;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        let parsed;
        try {
            let cleaned = responseText.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error('⚠️ JSON Parse Warning:', parseErr.message);
            parsed = {
                reply: responseText,
                entities: [],
                relations: [],
                episode: { summary: 'Conversation exchange', type: 'event' }
            };
        }

        // Store extracted entities (Online Fast-Stream)
        const newEntities = [];
        if (parsed.entities && Array.isArray(parsed.entities)) {
            for (const entity of parsed.entities) {
                if (entity.name) {
                    const added = memory.addEntity(entity.name, entity.type, {
                        attributes: entity.attributes,
                        confidence: entity.confidence || 0.85
                    });
                    newEntities.push(added);
                }
            }
        }

        // Store extracted relations with contradiction detection
        const newRelations = [];
        const supersededRelations = [];
        if (parsed.relations && Array.isArray(parsed.relations)) {
            for (const rel of parsed.relations) {
                if (rel.from && rel.relation && rel.to) {
                    memory.addEntity(rel.from, 'unknown');
                    memory.addEntity(rel.to, 'unknown');

                    const outcome = memory.addRelation(rel.from, rel.relation, rel.to, {
                        confidence: rel.confidence || 0.85,
                        source: rel.source || 'direct_statement',
                        type: 'fact'
                    });
                    if (outcome.relation) {
                        newRelations.push(outcome.relation);
                    }
                    if (outcome.superseded && outcome.superseded.length > 0) {
                        supersededRelations.push(...outcome.superseded);
                    }
                }
            }
        }

        // Process explicit revoked relations (negation / retraction)
        if (parsed.revokedRelations && Array.isArray(parsed.revokedRelations)) {
            for (const rev of parsed.revokedRelations) {
                if (rev.from && rev.to) {
                    const revoked = memory.revokeRelation(rev.from, rev.relation, rev.to, 'Explicitly revoked by user');
                    if (revoked.length > 0) {
                        supersededRelations.push(...revoked);
                    }
                }
            }
        }

        // Check if a procedure was learned
        let learnedProcedure = null;
        if (parsed.learnedProcedure && parsed.learnedProcedure.name && Array.isArray(parsed.learnedProcedure.steps) && parsed.learnedProcedure.steps.length > 0) {
            learnedProcedure = memory.addProcedure(parsed.learnedProcedure);
        }

        // Check if a procedure was executed
        let executedProcedure = null;
        if (parsed.proceduralExecution && (parsed.proceduralExecution.procedureId || parsed.proceduralExecution.procedureName)) {
            const targetId = parsed.proceduralExecution.procedureId || (retrieval.matchedProcedure ? retrieval.matchedProcedure.id : null);
            if (targetId) {
                executedProcedure = memory.executeProcedure(targetId);
            }
        } else if (retrieval.matchedProcedure && (userMessage.includes('شغل') || userMessage.includes('نفذ') || userMessage.includes('run') || userMessage.includes('ابدأ') || userMessage.includes('ابدأ الإجراء'))) {
            executedProcedure = memory.executeProcedure(retrieval.matchedProcedure.id);
        }

        // Store episode
        if (parsed.episode && parsed.episode.summary) {
            memory.addEpisode({
                summary: parsed.episode.summary,
                type: parsed.episode.type,
                participants: parsed.entities ? parsed.entities.map(e => e.name) : [],
                context: userMessage
            });
        }

        // Update active working memory buffer
        sessionManager.addExchange(userMessage, parsed.reply);

        return {
            reply: parsed.reply,
            extractedEntities: newEntities,
            extractedRelations: newRelations,
            supersededRelations,
            episode: parsed.episode,
            graph: memory.getFullGraph(),
            stats: memory.getStats(),
            retrievalStats: retrieval.telemetry,
            session: sessionManager.getStatus(),
            previousSessionConsolidated,
            learnedProcedure,
            executedProcedure,
            matchedProcedure: retrieval.matchedProcedure || null
        };

    } catch (error) {
        console.error('❌ Gemini API Error:', error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }
        const result = await processMessage(message.trim());
        res.json(result);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message', details: error.message });
    }
});

// Get Session & Working Memory Status
app.get('/api/session', (req, res) => {
    res.json(sessionManager.getStatus());
});

// ── Procedural Memory Routes (Layer 5) ────────────────────────
app.get('/api/memory/procedures', (req, res) => {
    res.json(memory.getProcedures());
});

app.post('/api/memory/procedure', (req, res) => {
    try {
        const proc = memory.addProcedure(req.body);
        if (!proc) return res.status(400).json({ error: 'Invalid procedure data' });
        res.json({ success: true, procedure: proc, stats: memory.getStats() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add procedure', details: err.message });
    }
});

app.post('/api/memory/procedure/:id/execute', (req, res) => {
    try {
        const proc = memory.executeProcedure(req.params.id, req.body || {});
        if (!proc) return res.status(404).json({ error: 'Procedure not found' });
        res.json({ success: true, procedure: proc, stats: memory.getStats() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to execute procedure', details: err.message });
    }
});

app.delete('/api/memory/procedure/:id', (req, res) => {
    try {
        const result = memory.deleteProcedure(req.params.id);
        res.json({ ...result, stats: memory.getStats() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete procedure', details: err.message });
    }
});

// Trigger Post-Session Consolidation & Flush Working Memory (Inactivity or Manual Simulation)
app.post('/api/session/timeout', async (req, res) => {
    try {
        const report = await sessionManager.consolidateAndFlushSession('manual_simulation');
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Session consolidation failed', details: err.message });
    }
});

// Run Reflection & Memory Consolidation
app.post('/api/memory/consolidate', async (req, res) => {
    try {
        const report = await memory.consolidateMemory();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Consolidation failed', details: error.message });
    }
});

// Delete specific entity and its relations
app.delete('/api/memory/entity/:name', (req, res) => {
    try {
        const entityName = decodeURIComponent(req.params.name);
        const result = memory.deleteEntity(entityName);
        res.json({ success: true, entityName, ...result, stats: memory.getStats(), graph: memory.getFullGraph() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete entity', details: err.message });
    }
});

// Delete specific relation
app.delete('/api/memory/relation/:id', (req, res) => {
    try {
        const result = memory.deleteRelation(req.params.id);
        res.json({ success: true, relationId: req.params.id, ...result, stats: memory.getStats(), graph: memory.getFullGraph() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete relation', details: err.message });
    }
});

app.get('/api/memory', (req, res) => {
    res.json(memory.getFullGraph());
});

app.get('/api/memory/stats', (req, res) => {
    res.json(memory.getStats());
});

app.get('/api/memory/episodes', (req, res) => {
    res.json(memory.episodes.slice(-50));
});

app.delete('/api/memory', (req, res) => {
    memory.clearAll();
    res.json({ success: true, message: 'Memory cleared' });
});

// ═══════════════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`
=======================================================
🧠 EyraOS Cognitive Memory Server (v2 Advanced) Running!
📁 Directory: EyraOS
🔗 URL: http://localhost:${PORT}
🤖 Model: gemini-3.5-flash-lite
⚡ Features: Selective Retrieval, Contradiction Engine, Reflection
📊 Initial Memory: ${memory.entities.length} entities, ${memory.relations.length} relations
=======================================================
    `);
});
