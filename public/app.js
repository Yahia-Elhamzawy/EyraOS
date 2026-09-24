// ═══════════════════════════════════════════════════════════════
// EyraOS — Cognitive Memory Chat System
// Frontend Application — Chat + Live Knowledge Graph
// ═══════════════════════════════════════════════════════════════

(() => {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const API_BASE = '';
    const ENTITY_COLORS = {
        person:       { bg: '#06d6a0', border: '#05b88a', font: '#0a0e1a' },
        place:        { bg: '#3b82f6', border: '#2563eb', font: '#ffffff' },
        food:         { bg: '#f59e0b', border: '#d97706', font: '#0a0e1a' },
        concept:      { bg: '#8b5cf6', border: '#7c3aed', font: '#ffffff' },
        technology:   { bg: '#ef4444', border: '#dc2626', font: '#ffffff' },
        organization: { bg: '#ec4899', border: '#db2777', font: '#ffffff' },
        animal:       { bg: '#14b8a6', border: '#0d9488', font: '#0a0e1a' },
        object:       { bg: '#f97316', border: '#ea580c', font: '#0a0e1a' },
        other:        { bg: '#64748b', border: '#475569', font: '#ffffff' },
        unknown:      { bg: '#64748b', border: '#475569', font: '#ffffff' }
    };

    // ── DOM Elements ──────────────────────────────────────────
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const btnSend = document.getElementById('btnSend');
    const btnClear = document.getElementById('btnClear');
    const btnFitGraph = document.getElementById('btnFitGraph');
    const btnTogglePhysics = document.getElementById('btnTogglePhysics');
    const btnToggleSuperseded = document.getElementById('btnToggleSuperseded');
    const btnRunConsolidation = document.getElementById('btnRunConsolidation');
    const consolidationInsights = document.getElementById('consolidationInsights');
    const btnCloseDetails = document.getElementById('btnCloseDetails');
    const btnDeleteEntity = document.getElementById('btnDeleteEntity');
    const graphContainer = document.getElementById('graphContainer');
    const graphPlaceholder = document.getElementById('graphPlaceholder');
    const entityDetails = document.getElementById('entityDetails');
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsBody = document.getElementById('detailsBody');
    const chatStatus = document.getElementById('chatStatus');
    const panelResizer = document.getElementById('panelResizer');

    // Session & Working Memory Elements
    const sessionTimer = document.getElementById('sessionTimer');
    const sessionWmTag = document.getElementById('sessionWmTag');
    const sessionStatusText = document.getElementById('sessionStatusText');
    const sessionDot = document.getElementById('sessionDot');
    const btnSimulateTimeoutHeader = document.getElementById('btnSimulateTimeoutHeader');
    const btnSimulateTimeoutLayers = document.getElementById('btnSimulateTimeoutLayers');
    const sessionConsolidationResult = document.getElementById('sessionConsolidationResult');
    const layerRemainingTime = document.getElementById('layerRemainingTime');

    // Procedural Memory (Layer 5) Elements
    const btnToggleProceduresList = document.getElementById('btnToggleProceduresList');
    const btnOpenAddProcModal = document.getElementById('btnOpenAddProcModal');
    const proceduresListContainer = document.getElementById('proceduresListContainer');
    const layerProcCount = document.getElementById('layerProcCount');
    const erdProceduresCount = document.getElementById('erdProceduresCount');
    const procedureModal = document.getElementById('procedureModal');
    const btnCloseProcModal = document.getElementById('btnCloseProcModal');
    const btnCancelProcModal = document.getElementById('btnCancelProcModal');
    const procForm = document.getElementById('procForm');
    const btnAddStepRow = document.getElementById('btnAddStepRow');
    const procStepsContainer = document.getElementById('procStepsContainer');

    // ── State ─────────────────────────────────────────────────
    let isProcessing = false;
    let physicsEnabled = true;
    let showSuperseded = false;
    let selectedEntityName = null;
    let network = null;
    let nodes = null;
    let edges = null;
    let graphInitialized = false;
    let entityMap = new Map(); // name -> node id
    let nodeIdCounter = 1;
    let edgeIdCounter = 1;

    // Session State
    let sessionRemainingSeconds = 15 * 60;
    let sessionTimerInterval = null;
    let workingMemoryCount = 0;

    // Procedural State
    let proceduresCache = [];

    // ═══════════════════════════════════════════════════════════
    // Graph Module — vis.js Network
    // ═══════════════════════════════════════════════════════════

    function initGraph() {
        if (graphInitialized) return;

        nodes = new vis.DataSet([]);
        edges = new vis.DataSet([]);

        const options = {
            nodes: {
                shape: 'dot',
                size: 22,
                font: {
                    size: 13,
                    face: 'Cairo, Inter, sans-serif',
                    color: '#f1f5f9',
                    strokeWidth: 3,
                    strokeColor: '#0a0e1a'
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.3)',
                    size: 8,
                    x: 0,
                    y: 3
                },
                scaling: {
                    min: 18,
                    max: 40,
                    label: { min: 11, max: 18 }
                }
            },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 0.7, type: 'arrow' }
                },
                color: {
                    color: 'rgba(148, 163, 184, 0.25)',
                    highlight: '#06d6a0',
                    hover: '#06d6a0',
                    opacity: 0.8
                },
                font: {
                    size: 10,
                    face: 'Cairo, Inter, sans-serif',
                    color: '#94a3b8',
                    strokeWidth: 2,
                    strokeColor: '#0a0e1a',
                    align: 'middle'
                },
                smooth: {
                    type: 'continuous',
                    roundness: 0.3
                },
                width: 1.5,
                hoverWidth: 2.5,
                selectionWidth: 3
            },
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -60,
                    centralGravity: 0.008,
                    springLength: 160,
                    springConstant: 0.06,
                    damping: 0.35,
                    avoidOverlap: 0.5
                },
                stabilization: {
                    enabled: true,
                    iterations: 150,
                    updateInterval: 30
                },
                maxVelocity: 40,
                minVelocity: 0.5
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
                dragNodes: true,
                multiselect: false,
                navigationButtons: false,
                keyboard: false
            },
            layout: {
                improvedLayout: true,
                randomSeed: 42
            }
        };

        // Hide placeholder
        graphPlaceholder.style.display = 'none';

        network = new vis.Network(graphContainer, { nodes, edges }, options);
        graphInitialized = true;

        // Click event for node details
        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                showEntityDetails(nodeId);
            } else {
                hideEntityDetails();
            }
        });

        // Hover effects
        network.on('hoverNode', () => {
            graphContainer.style.cursor = 'pointer';
        });

        network.on('blurNode', () => {
            graphContainer.style.cursor = 'default';
        });
    }

    function getEntityColor(type) {
        return ENTITY_COLORS[type] || ENTITY_COLORS.unknown;
    }

    function addNodeToGraph(entity) {
        const name = entity.name.trim();
        const normalizedName = name.toLowerCase();

        if (entityMap.has(normalizedName)) {
            // Update existing node if type changed
            const existingId = entityMap.get(normalizedName);
            const existingNode = nodes.get(existingId);
            if (existingNode && entity.type && entity.type !== 'unknown' && existingNode.entityType === 'unknown') {
                const colors = getEntityColor(entity.type);
                nodes.update({
                    id: existingId,
                    color: {
                        background: colors.bg,
                        border: colors.border,
                        highlight: { background: colors.bg, border: '#ffffff' },
                        hover: { background: colors.bg, border: '#ffffff' }
                    },
                    entityType: entity.type
                });
            }
            return entityMap.get(normalizedName);
        }

        const id = nodeIdCounter++;
        const colors = getEntityColor(entity.type);

        nodes.add({
            id: id,
            label: name,
            title: `${name}\nنوع: ${entity.type || 'unknown'}`,
            color: {
                background: colors.bg,
                border: colors.border,
                highlight: { background: colors.bg, border: '#ffffff' },
                hover: { background: colors.bg, border: '#ffffff' }
            },
            font: { color: colors.font },
            entityType: entity.type || 'unknown',
            entityData: entity,
            mass: 1.5
        });

        entityMap.set(normalizedName, id);
        return id;
    }

    function addEdgeToGraph(relation) {
        const rawFrom = relation.from || relation.from_entity;
        const rawTo = relation.to || relation.to_entity;
        if (!rawFrom || !rawTo) return;

        const fromNorm = rawFrom.trim().toLowerCase();
        const toNorm = rawTo.trim().toLowerCase();

        const fromId = entityMap.get(fromNorm);
        const toId = entityMap.get(toNorm);

        if (!fromId || !toId) return;

        const isSuperseded = relation.status === 'superseded';
        if (isSuperseded && !showSuperseded) return;

        // Check for existing edge with same from, to and relation
        const existingEdges = edges.get({
            filter: (edge) =>
                edge.from === fromId &&
                edge.to === toId &&
                (edge.relationStr === relation.relation || edge.label === relation.relation)
        });

        if (existingEdges.length > 0) {
            if (isSuperseded) {
                edges.update({
                    id: existingEdges[0].id,
                    label: `${relation.relation} (ملغاة)`,
                    dashes: [6, 4],
                    width: 1,
                    color: { color: 'rgba(239, 68, 68, 0.45)', highlight: '#ef4444', hover: '#ef4444' },
                    font: { color: '#f87171', size: 9 }
                });
            }
            return;
        }

        const edgeId = edgeIdCounter++;
        const confidence = relation.confidence || 0.8;

        edges.add({
            id: edgeId,
            from: fromId,
            to: toId,
            relationStr: relation.relation,
            label: isSuperseded ? `${relation.relation} (ملغاة)` : relation.relation,
            title: isSuperseded 
                ? `[ملغاة / Superseded]\n${rawFrom} → ${relation.relation} → ${rawTo}`
                : `${rawFrom} → ${relation.relation} → ${rawTo}\nثقة: ${(confidence * 100).toFixed(0)}%`,
            width: isSuperseded ? 1 : 1 + confidence * 2,
            dashes: isSuperseded ? [6, 4] : false,
            color: {
                color: isSuperseded ? 'rgba(239, 68, 68, 0.45)' : `rgba(148, 163, 184, ${0.2 + confidence * 0.4})`,
                highlight: isSuperseded ? '#ef4444' : '#06d6a0',
                hover: isSuperseded ? '#ef4444' : '#06d6a0'
            },
            font: {
                color: isSuperseded ? '#f87171' : '#94a3b8',
                size: isSuperseded ? 9 : 10
            },
            relationData: relation,
            smooth: {
                type: 'curvedCCW',
                roundness: 0.15
            }
        });
    }

    function updateGraphFromResponse(data) {
        if (!graphInitialized) initGraph();

        // Add entities
        if (data.extractedEntities && data.extractedEntities.length > 0) {
            data.extractedEntities.forEach(entity => {
                addNodeToGraph(entity);
            });
        }

        // Add relations
        if (data.extractedRelations && data.extractedRelations.length > 0) {
            data.extractedRelations.forEach(relation => {
                addEdgeToGraph(relation);
            });
        }

        // Fit after update
        if (network && nodes.length > 0) {
            setTimeout(() => {
                network.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
            }, 500);
        }
    }

    function loadExistingGraph() {
        fetch(`${API_BASE}/api/memory`)
            .then(res => res.json())
            .then(data => {
                if (!graphInitialized) initGraph();
                if (nodes) nodes.clear();
                if (edges) edges.clear();
                entityMap.clear();
                nodeIdCounter = 1;
                edgeIdCounter = 1;

                if (data.entities && data.entities.length > 0) {
                    if (graphPlaceholder) graphPlaceholder.style.display = 'none';
                    data.entities.forEach(entity => addNodeToGraph(entity));
                    data.relations.forEach(relation => addEdgeToGraph(relation));
                    setTimeout(() => {
                        if (network) network.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
                    }, 600);
                } else {
                    if (graphPlaceholder) graphPlaceholder.style.display = 'flex';
                }
                updateStats(data);
            })
            .catch(err => console.error('Failed to load existing graph:', err));
    }

    function showEntityDetails(nodeId) {
        const node = nodes.get(nodeId);
        if (!node) return;

        selectedEntityName = node.label;
        detailsTitle.textContent = node.label;
        
        // Find all relations involving this entity
        const relatedEdges = edges.get({
            filter: (edge) => edge.from === nodeId || edge.to === nodeId
        });

        let html = `
            <div class="detail-row">
                <span class="detail-label">النوع</span>
                <span class="detail-value">${node.entityType}</span>
            </div>
        `;

        if (node.entityData && node.entityData.confidence) {
            html += `
                <div class="detail-row">
                    <span class="detail-label">الثقة</span>
                    <span class="detail-value">${(node.entityData.confidence * 100).toFixed(0)}%</span>
                </div>
            `;
        }

        if (relatedEdges.length > 0) {
            html += `<div style="margin-top: 8px; font-weight: 600; font-size: 0.75rem; color: var(--text-muted);">العلاقات:</div>`;
            relatedEdges.forEach(edge => {
                const fromNode = nodes.get(edge.from);
                const toNode = nodes.get(edge.to);
                const relId = edge.relationData ? edge.relationData.id : edge.id;
                if (fromNode && toNode) {
                    html += `
                        <div class="detail-relation">
                            <span>${fromNode.label}</span>
                            <span class="relation-arrow">→ ${edge.label} →</span>
                            <span>${toNode.label}</span>
                            <button class="btn-delete-rel" data-rel-id="${relId}" title="حذف هذه العلاقة">✕</button>
                        </div>
                    `;
                }
            });
        }

        detailsBody.innerHTML = html;
        entityDetails.style.display = 'block';
    }

    function hideEntityDetails() {
        entityDetails.style.display = 'none';
        selectedEntityName = null;
    }

    async function deleteEntity(entityName) {
        if (!entityName) return;
        if (!confirm(`هل أنت متأكد من حذف الكيان "${entityName}" وجميع علاقاته من الذاكرة؟`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/memory/entity/${encodeURIComponent(entityName)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ تم حذف الكيان "${entityName}" بنجاح`);
                hideEntityDetails();
                loadExistingGraph();
                updateLayersView();
                if (data.stats) updateStats(data.stats);
            } else {
                showToast('⚠️ فشل حذف الكيان');
            }
        } catch (err) {
            console.error('Delete entity error:', err);
            showToast('⚠️ خطأ في الاتصال أثناء الحذف');
        }
    }

    async function deleteRelation(relId) {
        if (!relId) return;
        if (!confirm('هل أنت متأكد من حذف هذه العلاقة من الذاكرة؟')) return;

        try {
            const res = await fetch(`${API_BASE}/api/memory/relation/${encodeURIComponent(relId)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast('✅ تم حذف العلاقة بنجاح');
                hideEntityDetails();
                loadExistingGraph();
                updateLayersView();
                if (data.stats) updateStats(data.stats);
            } else {
                showToast('⚠️ فشل حذف العلاقة');
            }
        } catch (err) {
            console.error('Delete relation error:', err);
            showToast('⚠️ خطأ في الاتصال أثناء الحذف');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Chat Module
    // ═══════════════════════════════════════════════════════════

    function createMessageElement(text, isUser) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (isUser) {
            avatar.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>`;
        } else {
            avatar.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="11" stroke="url(#msg-grad)" stroke-width="2"/>
                    <circle cx="14" cy="14" r="4.5" fill="url(#msg-grad)"/>
                    <defs>
                        <linearGradient id="msg-grad" x1="0" y1="0" x2="28" y2="28">
                            <stop offset="0%" stop-color="#06d6a0"/>
                            <stop offset="100%" stop-color="#7c3aed"/>
                        </linearGradient>
                    </defs>
                </svg>`;
        }

        const content = document.createElement('div');
        content.className = 'message-content';

        const name = document.createElement('div');
        name.className = 'message-name';
        name.textContent = isUser ? 'أنت' : 'Eyra';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.innerHTML = formatMessageText(text);

        content.appendChild(name);
        content.appendChild(textDiv);

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        return { msgDiv, content };
    }

    function formatMessageText(text) {
        // Simple formatting: bold, newlines
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function addExtractionBadges(contentEl, data) {
        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'extraction-info';

        // 1. Selective Retrieval Telemetry Badge
        if (data.retrievalStats) {
            const ret = data.retrievalStats;
            const badge = document.createElement('span');
            badge.className = 'extraction-badge badge-retrieval';
            badge.innerHTML = `🎯 استرجاع ذكي: ${ret.retrievedEntitiesCount}/${ret.totalActiveEntities || ret.totalEntities} كيان (${ret.retrievalPercentage}%)`;
            badge.title = 'Tiered Retrieval: تم استرجاع فقط الكيانات والعلاقات ذات الصلة بالسياق لحماية الميزانية المعرفية';
            badgesDiv.appendChild(badge);
        }

        // 2. Superseded Relations Badges
        if (data.supersededRelations && data.supersededRelations.length > 0) {
            data.supersededRelations.forEach(sRel => {
                const badge = document.createElement('span');
                badge.className = 'extraction-badge badge-superseded';
                badge.innerHTML = `⚡ تم حل نزاع: ألغيت "${sRel.from || sRel.from_entity} ${sRel.relation} ${sRel.to || sRel.to_entity}"`;
                badgesDiv.appendChild(badge);
            });
        }

        // 3. Extracted Entities Badges
        if (data.extractedEntities && data.extractedEntities.length > 0) {
            data.extractedEntities.forEach((entity, i) => {
                const badge = document.createElement('span');
                badge.className = 'extraction-badge badge-entity';
                badge.style.animationDelay = `${i * 0.1}s`;
                badge.innerHTML = `◈ ${entity.name} <small>(${entity.type})</small>`;
                badgesDiv.appendChild(badge);
            });
        }

        // 4. Extracted Relations Badges
        if (data.extractedRelations && data.extractedRelations.length > 0) {
            data.extractedRelations.forEach((rel, i) => {
                const badge = document.createElement('span');
                badge.className = 'extraction-badge badge-relation';
                badge.style.animationDelay = `${(i + (data.extractedEntities?.length || 0)) * 0.1}s`;
                badge.innerHTML = `⟷ ${rel.from || rel.from_entity} → ${rel.relation} → ${rel.to || rel.to_entity}`;
                badgesDiv.appendChild(badge);
            });
        }

        // 5. Matched Procedural Memory Badge
        if (data.matchedProcedure) {
            const badge = document.createElement('span');
            badge.className = 'extraction-badge badge-procedure';
            badge.innerHTML = `⚙️ مهارة مطابقة: ${data.matchedProcedure.name}`;
            badge.title = 'تم استرجاع إجراء مطابق من الذاكرة الإجرائية (Layer 5)';
            badgesDiv.appendChild(badge);
        }

        // 6. Learned Procedure Badge & Box
        if (data.learnedProcedure) {
            const lp = data.learnedProcedure;
            const badge = document.createElement('span');
            badge.className = 'extraction-badge badge-procedure';
            badge.style.background = 'rgba(16, 185, 129, 0.2)';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            badge.style.color = '#10b981';
            badge.innerHTML = `⚙️ حُفظت مهارة جديدة: ${lp.name} (${(lp.steps || []).length} خطوات)`;
            badgesDiv.appendChild(badge);

            // Create visual procedure checklist
            const procBox = document.createElement('div');
            procBox.className = 'chat-procedure-box';
            procBox.innerHTML = `
                <div class="chat-proc-header">
                    <span>⚙️ مهارة جديدة مسجلة: <strong>${lp.name}</strong></span>
                    <span class="badge-procedure">Layer 5</span>
                </div>
                <div class="chat-proc-steps">
                    ${(lp.steps || []).map((st, i) => `
                        <div class="chat-procedure-check">
                            <span class="step-num">${i + 1}</span>
                            <span><strong>${st.step || st.title || 'خطوة ' + (i+1)}:</strong> ${st.instruction || st.action || ''}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            badgesDiv.appendChild(procBox);
        }

        // 7. Executed Procedure Box
        if (data.executedProcedure) {
            const ep = data.executedProcedure;
            const execBox = document.createElement('div');
            execBox.className = 'chat-procedure-box';
            execBox.style.borderColor = '#06d6a0';
            execBox.innerHTML = `
                <div class="chat-proc-header" style="color: #06d6a0;">
                    <span>⚡ تم تنفيذ بروتوكول: <strong>${ep.procedureName || 'إجراء'}</strong></span>
                    <span class="badge-procedure" style="background: rgba(6,214,160,0.2); color: #06d6a0;">منفذ ✓</span>
                </div>
                <div class="chat-proc-steps">
                    ${(ep.stepsExecuted || []).map((st, i) => `
                        <div class="chat-procedure-check" style="color: #f1f5f9;">
                            <span class="step-num" style="background:#06d6a0; color:#0a0e1a;">✓</span>
                            <span><strong>خطوة ${i + 1} (${st.step || st.title || ''}):</strong> ${st.instruction || st.action || ''}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            badgesDiv.appendChild(execBox);
        }

        if (badgesDiv.children.length > 0) {
            contentEl.appendChild(badgesDiv);
        }
    }

    function showThinkingIndicator() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message bot-message';
        thinkingDiv.id = 'thinkingMessage';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="url(#think-grad)" stroke-width="2"/>
                <circle cx="14" cy="14" r="4.5" fill="url(#think-grad)"/>
                <defs>
                    <linearGradient id="think-grad" x1="0" y1="0" x2="28" y2="28">
                        <stop offset="0%" stop-color="#06d6a0"/>
                        <stop offset="100%" stop-color="#7c3aed"/>
                    </linearGradient>
                </defs>
            </svg>`;

        const indicator = document.createElement('div');
        indicator.className = 'thinking-indicator';
        indicator.innerHTML = `
            <div class="thinking-dots">
                <span></span><span></span><span></span>
            </div>
            <span class="thinking-text">بتفكر...</span>
        `;

        thinkingDiv.appendChild(avatar);
        thinkingDiv.appendChild(indicator);
        chatMessages.appendChild(thinkingDiv);
        scrollToBottom();
    }

    function removeThinkingIndicator() {
        const thinking = document.getElementById('thinkingMessage');
        if (thinking) thinking.remove();
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    // ── Update Stats ──────────────────────────────────────────
    function updateStats(data) {
        const stats = data.stats || data;
        
        const entityCount = stats.totalEntities || (data.entities ? data.entities.length : 0);
        const relationCount = stats.totalRelations || (data.relations ? data.relations.length : 0);
        const episodeCount = stats.totalEpisodes || 0;

        animateStat('statEntities', entityCount);
        animateStat('statRelations', relationCount);
        animateStat('statEpisodes', episodeCount);
    }

    function animateStat(elementId, newValue) {
        const el = document.getElementById(elementId);
        const valueEl = el.querySelector('.stat-value');
        const currentValue = parseInt(valueEl.textContent) || 0;

        if (newValue !== currentValue) {
            valueEl.textContent = newValue;
            el.classList.add('updated');
            setTimeout(() => el.classList.remove('updated'), 600);
        }
    }

    // ── Set Chat Status ───────────────────────────────────────
    function setChatStatus(status) {
        const dot = chatStatus.querySelector('.status-dot');
        const text = chatStatus.querySelector('span:last-child');

        dot.className = 'status-dot';

        switch (status) {
            case 'online':
                dot.classList.add('online');
                text.textContent = 'متصل';
                break;
            case 'thinking':
                dot.classList.add('thinking');
                text.textContent = 'بتفكر...';
                break;
            case 'error':
                text.textContent = 'خطأ';
                break;
        }
    }

    // ── Show Toast ────────────────────────────────────────────
    function showToast(message, duration = 3000) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // ═══════════════════════════════════════════════════════════
    // API Communication
    // ═══════════════════════════════════════════════════════════

    async function sendMessage(message) {
        if (isProcessing || !message.trim()) return;

        isProcessing = true;
        btnSend.disabled = true;
        setChatStatus('thinking');

        // Add user message to chat
        const { msgDiv: userMsg } = createMessageElement(message, true);
        chatMessages.appendChild(userMsg);
        scrollToBottom();

        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Show thinking
        showThinkingIndicator();

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Remove thinking
            removeThinkingIndicator();

            // Add bot response
            const { msgDiv: botMsg, content: botContent } = createMessageElement(data.reply, false);
            chatMessages.appendChild(botMsg);

            // Add extraction badges
            addExtractionBadges(botContent, data);

            scrollToBottom();

            // Update graph
            updateGraphFromResponse(data);

            // Update stats
            if (data.stats) updateStats(data);

            // Update procedural cache if learned or executed
            if (data.learnedProcedure || data.executedProcedure) {
                loadProcedures();
                updateLayersView();
            }

            // Update session UI
            if (data.session) updateSessionUI(data.session);
            if (data.previousSessionConsolidated && data.previousSessionConsolidated.consolidated) {
                showToast('⏱️ انتهت الجلسة السابقة وتفرغت الذاكرة العاملة!');
            }

            setChatStatus('online');

        } catch (error) {
            removeThinkingIndicator();
            console.error('Send message error:', error);

            const { msgDiv: errorMsg } = createMessageElement(
                `⚠️ حصل خطأ: ${error.message}. حاول تاني.`, false
            );
            chatMessages.appendChild(errorMsg);
            scrollToBottom();

            setChatStatus('error');
            setTimeout(() => setChatStatus('online'), 3000);
        }

        isProcessing = false;
        btnSend.disabled = false;
        chatInput.focus();
    }

    async function clearMemory() {
        if (!confirm('متأكد إنك عايز تمسح كل الذاكرة؟ مش هنقدر نرجعها.')) return;

        try {
            const response = await fetch(`${API_BASE}/api/memory`, { method: 'DELETE' });
            if (response.ok) {
                // Reset graph
                if (nodes) nodes.clear();
                if (edges) edges.clear();
                entityMap.clear();
                nodeIdCounter = 1;
                edgeIdCounter = 1;

                // Show placeholder
                if (graphPlaceholder) {
                    graphPlaceholder.style.display = 'flex';
                }
                graphInitialized = false;
                if (network) {
                    network.destroy();
                    network = null;
                }

                // Clear chat messages except welcome
                const messages = chatMessages.querySelectorAll('.message:not(.welcome-message)');
                messages.forEach(m => m.remove());

                // Reset stats
                animateStat('statEntities', 0);
                animateStat('statRelations', 0);
                animateStat('statEpisodes', 0);

                hideEntityDetails();
                showToast('✅ تم مسح الذاكرة بالكامل');
            }
        } catch (error) {
            console.error('Clear memory error:', error);
            showToast('⚠️ فشل مسح الذاكرة');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Panel Resizer
    // ═══════════════════════════════════════════════════════════

    function initResizer() {
        let isResizing = false;
        let startX = 0;
        let chatPanelWidth = 0;
        const chatPanel = document.querySelector('.chat-panel');
        const graphPanel = document.querySelector('.graph-panel');

        panelResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            chatPanelWidth = chatPanel.getBoundingClientRect().width;
            panelResizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // RTL: moving mouse left increases chat width
            const diff = startX - e.clientX;
            const containerWidth = document.querySelector('.main-content').getBoundingClientRect().width;
            const newChatWidth = Math.max(350, Math.min(containerWidth - 350, chatPanelWidth + diff));

            const chatPercent = (newChatWidth / containerWidth) * 100;
            chatPanel.style.flex = `0 0 ${chatPercent}%`;
            graphPanel.style.flex = `1`;

            // Resize graph
            if (network) {
                network.redraw();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                panelResizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (network) network.fit({ animation: { duration: 300 } });
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // View Navigation (Tabs)
    // ═══════════════════════════════════════════════════════════

    const navTabs = document.querySelectorAll('.nav-tab');
    const viewSections = document.querySelectorAll('.view-section');

    function switchView(viewName) {
        navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });
        viewSections.forEach(section => {
            const sectionView = section.id.replace('view', '').toLowerCase();
            section.classList.toggle('active', sectionView === viewName);
        });

        if (viewName === 'erd') {
            updateERDView();
            setTimeout(drawERDLines, 300);
        } else if (viewName === 'layers') {
            updateLayersView();
            loadProcedures();
        } else if (viewName === 'chat') {
            if (network) {
                setTimeout(() => network.redraw(), 100);
                setTimeout(() => network.fit({ animation: { duration: 400 } }), 200);
            }
        }
    }

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // ═══════════════════════════════════════════════════════════
    // ERD View
    // ═══════════════════════════════════════════════════════════

    function updateERDView() {
        fetch(`${API_BASE}/api/memory/stats`)
            .then(res => res.json())
            .then(stats => {
                const e = document.getElementById('erdEntitiesCount');
                const r = document.getElementById('erdRelationsCount');
                const ep = document.getElementById('erdEpisodesCount');
                const pr = document.getElementById('erdProceduresCount');
                if (e) e.textContent = `${stats.totalEntities || 0} rows`;
                if (r) r.textContent = `${stats.totalRelations || 0} rows`;
                if (ep) ep.textContent = `${stats.totalEpisodes || 0} rows`;
                if (pr) pr.textContent = `${stats.totalProcedures || 0} rows`;
            })
            .catch(err => console.error('ERD stats error:', err));
    }

    function drawERDLines() {
        const svg = document.getElementById('erdLines');
        const canvas = document.getElementById('erdCanvas');
        if (!svg || !canvas) return;

        const tables = {
            entities: document.getElementById('erdEntities'),
            relations: document.getElementById('erdRelations'),
            episodes: document.getElementById('erdEpisodes'),
            metadata: document.getElementById('erdMetadata')
        };
        if (!tables.entities || !tables.relations || !tables.episodes) return;

        const canvasRect = canvas.getBoundingClientRect();
        svg.setAttribute('width', canvas.scrollWidth);
        svg.setAttribute('height', canvas.scrollHeight);
        svg.style.width = canvas.scrollWidth + 'px';
        svg.style.height = canvas.scrollHeight + 'px';
        svg.innerHTML = '';

        // Arrow markers
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        ['#06d6a0', '#3b82f6', '#ec4899'].forEach((color, i) => {
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', `arrow${i}`);
            marker.setAttribute('markerWidth', '10');
            marker.setAttribute('markerHeight', '7');
            marker.setAttribute('refX', '10');
            marker.setAttribute('refY', '3.5');
            marker.setAttribute('orient', 'auto');
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', '0 0, 10 3.5, 0 7');
            poly.setAttribute('fill', color);
            poly.setAttribute('opacity', '0.6');
            marker.appendChild(poly);
            defs.appendChild(marker);
        });
        svg.appendChild(defs);

        function getEdge(el, side) {
            const rect = el.getBoundingClientRect();
            const x = rect.left - canvasRect.left + canvas.scrollLeft;
            const y = rect.top - canvasRect.top + canvas.scrollTop;
            switch (side) {
                case 'top': return { x: x + rect.width / 2, y };
                case 'bottom': return { x: x + rect.width / 2, y: y + rect.height };
                case 'left': return { x, y: y + rect.height / 2 };
                case 'right': return { x: x + rect.width, y: y + rect.height / 2 };
            }
        }

        function drawCurve(from, to, color, markerIdx, dashed) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const cx = (from.x + to.x) / 2 + (to.y - from.y) * 0.12;
            const cy = (from.y + to.y) / 2 - (to.x - from.x) * 0.12;
            path.setAttribute('d', `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '2');
            path.setAttribute('opacity', '0.4');
            path.setAttribute('marker-end', `url(#arrow${markerIdx})`);
            if (dashed) path.setAttribute('stroke-dasharray', '6 4');
            svg.appendChild(path);
        }

        // Relations -> Entities (FK: from, to)
        const eRect = tables.entities.getBoundingClientRect();
        const rRect = tables.relations.getBoundingClientRect();
        const fromSide = rRect.left < eRect.left ? 'right' : 'left';
        const toSide = fromSide === 'right' ? 'left' : 'right';
        drawCurve(getEdge(tables.relations, fromSide), getEdge(tables.entities, toSide), '#06d6a0', 0, false);

        // Episodes -> Entities (FK: participants)
        const epRect = tables.episodes.getBoundingClientRect();
        const epFromSide = epRect.left < eRect.left ? 'right' : 'left';
        const epToSide = epFromSide === 'right' ? 'left' : 'right';
        drawCurve(getEdge(tables.episodes, epFromSide), getEdge(tables.entities, epToSide === 'left' ? 'bottom' : 'bottom'), '#3b82f6', 1, true);

        // Metadata -> Entities (reads)
        if (tables.metadata) {
            drawCurve(getEdge(tables.metadata, 'top'), getEdge(tables.entities, 'bottom'), '#ec4899', 2, true);
        }
    }

    window.addEventListener('resize', () => {
        if (document.getElementById('viewERD').classList.contains('active')) {
            setTimeout(drawERDLines, 150);
        }
    });

    // ═══════════════════════════════════════════════════════════
    // Memory Layers View
    // ═══════════════════════════════════════════════════════════

    function updateLayersView() {
        fetch(`${API_BASE}/api/memory/stats`)
            .then(res => res.json())
            .then(stats => {
                const el = (id) => document.getElementById(id);
                if (el('layerEntCount')) el('layerEntCount').textContent = stats.totalEntities || 0;
                if (el('layerRelCount')) el('layerRelCount').textContent = stats.totalRelations || 0;
                if (el('layerTypeCount')) el('layerTypeCount').textContent = (stats.entityTypes || []).length;
                if (el('layerEpCount')) el('layerEpCount').textContent = stats.totalEpisodes || 0;
                if (el('layerCtxCount')) el('layerCtxCount').textContent = stats.conversationLength || 0;
                if (el('layerProcCount')) el('layerProcCount').textContent = stats.totalProcedures !== undefined ? stats.totalProcedures : (proceduresCache.length || 0);
            })
            .catch(err => console.error('Layers stats error:', err));
    }

    // ═══════════════════════════════════════════════════════════
    // Procedural Memory Module (Layer 5)
    // ═══════════════════════════════════════════════════════════

    async function loadProcedures() {
        try {
            const res = await fetch(`${API_BASE}/api/memory/procedures`);
            const data = await res.json();
            if (data.procedures) {
                proceduresCache = data.procedures;
                renderProceduresList(proceduresCache);
                if (layerProcCount) layerProcCount.textContent = proceduresCache.length;
                if (erdProceduresCount) erdProceduresCount.textContent = `${proceduresCache.length} rows`;
            }
        } catch (err) {
            console.error('Failed to load procedures:', err);
        }
    }

    function renderProceduresList(procedures) {
        if (!proceduresListContainer) return;

        if (!procedures || procedures.length === 0) {
            proceduresListContainer.innerHTML = `
                <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    لا توجد مهارات أو إجراءات مخزنة حالياً. يمكنك تعليم Eyra مهارة جديدة عبر المحادثة أو الضغط على زر "إضافة مهارة جديدة".
                </div>
            `;
            return;
        }

        let html = '';
        procedures.forEach(proc => {
            const stepsHtml = (proc.steps || []).map((step, idx) => `
                <div class="procedure-step-item">
                    <span class="step-badge-num">${step.stepNumber || idx + 1}</span>
                    <div style="flex:1;">
                        <div class="step-title">${step.title || step.step || 'خطوة ' + (idx + 1)}</div>
                        <div class="step-instruction">${step.instruction || step.action || ''}</div>
                    </div>
                </div>
            `).join('');

            const triggersHtml = (proc.triggerKeywords || []).map(kw => `
                <span class="step-badge-num" style="width:auto; padding:2px 8px; border-radius:10px; font-size:0.75rem; background:rgba(255,255,255,0.06); color:#94a3b8;">#${kw}</span>
            `).join(' ');

            html += `
                <div class="procedure-card" data-proc-id="${proc.id}">
                    <div class="procedure-card-header">
                        <div>
                            <h4 class="procedure-card-title">${proc.name}</h4>
                            <div class="procedure-card-category">📁 ${proc.category || 'عام'} • مرات التنفيذ: ${proc.executionCount || 0}</div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn-execute-proc" data-proc-id="${proc.id}" title="محاكاة تشغيل هذا الإجراء وتوثيقه">
                                ⚡ تشغيل الإجراء
                            </button>
                            <button class="btn-delete-rel" data-proc-del-id="${proc.id}" title="حذف هذا الإجراء" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 4px 8px; border-radius: 6px; cursor: pointer;">
                                ✕
                            </button>
                        </div>
                    </div>
                    <div class="procedure-card-desc">${proc.description || ''}</div>
                    ${triggersHtml ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">${triggersHtml}</div>` : ''}
                    <div class="procedure-steps-list">
                        ${stepsHtml}
                    </div>
                </div>
            `;
        });

        proceduresListContainer.innerHTML = html;
    }

    async function executeProcedureAction(procId) {
        if (!procId) return;
        try {
            showToast('⚡ جاري تنفيذ الإجراء وتوثيقه في الذاكرة العرضية...');
            const res = await fetch(`${API_BASE}/api/memory/procedure/${encodeURIComponent(procId)}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ details: 'Manual trigger from Layer 5 dashboard' })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ تم تنفيذ "${data.procedure.name}" بنجاح!`);
                loadProcedures();
                loadExistingGraph();
                updateLayersView();
                if (data.stats) updateStats(data.stats);

                // Add execution card into chat
                const { msgDiv: sysMsg, content } = createMessageElement(
                    `⚡ **[تنفيذ إجرائي — Layer 5]**<br>تم استدعاء وتنفيذ مهارة: **${data.procedure.name}**<br>• توثيق في الذاكرة العرضية (Episodic): تم الحفظ بنجاح.<br>• إجمالي مرات التنفيذ: ${data.procedure.executionCount}`,
                    false
                );
                chatMessages.appendChild(sysMsg);

                // Add checklist box
                const executionBox = document.createElement('div');
                executionBox.className = 'chat-procedure-box';
                executionBox.style.borderColor = '#06d6a0';
                executionBox.innerHTML = `
                    <div class="chat-proc-header" style="color: #06d6a0;">
                        <span>⚡ بروتوكول تنفيذي مكتمل: <strong>${data.procedure.name}</strong></span>
                        <span class="badge-procedure" style="background: rgba(6,214,160,0.2); color: #06d6a0;">مكتمل ✓</span>
                    </div>
                    <div class="chat-proc-steps">
                        ${(data.procedure.steps || []).map((st, i) => `
                            <div class="chat-procedure-check">
                                <span class="step-num" style="background:#06d6a0; color:#0a0e1a;">✓</span>
                                <span><strong>خطوة ${i + 1} (${st.title || st.step || ''}):</strong> ${st.instruction || st.action || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                content.appendChild(executionBox);
                scrollToBottom();
            } else {
                showToast('⚠️ فشل تشغيل الإجراء: ' + (data.error || ''));
            }
        } catch (err) {
            console.error('Execute procedure error:', err);
            showToast('⚠️ خطأ في الاتصال أثناء تنفيذ الإجراء');
        }
    }

    async function deleteProcedureAction(procId) {
        if (!procId) return;
        const proc = proceduresCache.find(p => p.id === procId);
        const name = proc ? proc.name : procId;
        if (!confirm(`هل أنت متأكد من حذف الإجراء "${name}" من الذاكرة الإجرائية؟`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/memory/procedure/${encodeURIComponent(procId)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast(`✅ تم حذف الإجراء "${name}" بنجاح`);
                loadProcedures();
                updateLayersView();
                if (data.stats) updateStats(data.stats);
            } else {
                showToast('⚠️ فشل حذف الإجراء');
            }
        } catch (err) {
            console.error('Delete procedure error:', err);
            showToast('⚠️ خطأ أثناء حذف الإجراء');
        }
    }

    function openProcedureModal() {
        if (!procedureModal) return;
        procedureModal.style.display = 'flex';
        if (procForm) procForm.reset();
        if (procStepsContainer) {
            procStepsContainer.innerHTML = `
                <div class="step-input-row">
                    <span class="step-num">1</span>
                    <input type="text" class="step-title-input" placeholder="عنوان الخطوة (مثال: إرسال حزم Ping)" required />
                    <input type="text" class="step-instruction-input" placeholder="تفاصيل التنفيذ وما يُفعل" required />
                </div>
            `;
        }
    }

    function closeProcedureModal() {
        if (procedureModal) procedureModal.style.display = 'none';
    }

    function addStepInputRow() {
        if (!procStepsContainer) return;
        const rows = procStepsContainer.querySelectorAll('.step-input-row');
        const nextNum = rows.length + 1;
        const row = document.createElement('div');
        row.className = 'step-input-row';
        row.innerHTML = `
            <span class="step-num">${nextNum}</span>
            <input type="text" class="step-title-input" placeholder="عنوان الخطوة" required />
            <input type="text" class="step-instruction-input" placeholder="تفاصيل الخطوة" required />
            <button type="button" class="btn-remove-step" title="حذف الخطوة" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem; padding:0 4px;">✕</button>
        `;
        const removeBtn = row.querySelector('.btn-remove-step');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                row.remove();
                reindexStepRows();
            });
        }
        procStepsContainer.appendChild(row);
    }

    function reindexStepRows() {
        if (!procStepsContainer) return;
        const rows = procStepsContainer.querySelectorAll('.step-input-row');
        rows.forEach((r, idx) => {
            const numSpan = r.querySelector('.step-num');
            if (numSpan) numSpan.textContent = idx + 1;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Session & Working Memory Module
    // ═══════════════════════════════════════════════════════════

    function updateSessionUI(session) {
        if (!session) return;
        workingMemoryCount = session.workingMemoryCount || 0;
        sessionRemainingSeconds = session.remainingSeconds !== undefined ? session.remainingSeconds : 15 * 60;

        if (sessionWmTag) sessionWmTag.textContent = `💭 ${workingMemoryCount}`;
        if (sessionStatusText) {
            sessionStatusText.textContent = workingMemoryCount > 0 ? 'جلسة نشطة' : 'جلسة جديدة';
        }
        if (sessionDot) {
            sessionDot.style.background = workingMemoryCount > 0 ? '#06d6a0' : '#3b82f6';
            sessionDot.style.boxShadow = `0 0 8px ${workingMemoryCount > 0 ? '#06d6a0' : '#3b82f6'}`;
        }

        const mins = Math.floor(sessionRemainingSeconds / 60);
        const secs = sessionRemainingSeconds % 60;
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (sessionTimer) sessionTimer.textContent = `⏱️ ${formatted}`;
        if (layerRemainingTime) layerRemainingTime.textContent = formatted;

        const layerCtxCount = document.getElementById('layerCtxCount');
        if (layerCtxCount) layerCtxCount.textContent = workingMemoryCount;
    }

    function startSessionTicker() {
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        sessionTimerInterval = setInterval(() => {
            if (workingMemoryCount > 0 && sessionRemainingSeconds > 0) {
                sessionRemainingSeconds--;
                const mins = Math.floor(sessionRemainingSeconds / 60);
                const secs = sessionRemainingSeconds % 60;
                const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                if (sessionTimer) sessionTimer.textContent = `⏱️ ${formatted}`;
                if (layerRemainingTime) layerRemainingTime.textContent = formatted;
            } else if (workingMemoryCount > 0 && sessionRemainingSeconds <= 0) {
                if (sessionStatusText) sessionStatusText.textContent = 'الجلسة انتهت (تأمل تلقائي)';
                if (sessionDot) sessionDot.style.background = '#f59e0b';
            }
        }, 1000);
    }

    async function triggerSessionTimeout() {
        if (btnSimulateTimeoutHeader) {
            btnSimulateTimeoutHeader.disabled = true;
            btnSimulateTimeoutHeader.innerHTML = '<span>⏳ جاري التأمل...</span>';
        }
        if (btnSimulateTimeoutLayers) {
            btnSimulateTimeoutLayers.disabled = true;
            btnSimulateTimeoutLayers.innerHTML = '<span>⏳ جاري التأمل وتفريغ الذاكرة...</span>';
        }

        try {
            const res = await fetch(`${API_BASE}/api/session/timeout`, { method: 'POST' });
            const data = await res.json();

            if (data.consolidated) {
                showToast(`✨ انتهت الجلسة وتفرغت الذاكرة العاملة (${data.messagesFlushed || 0} رسائل)`);

                const resultHtml = `
                    <div style="padding:10px; background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.4); border-radius:8px; margin-top:8px;">
                        <div style="font-weight:700; color:#06d6a0; margin-bottom:4px;">✨ نتيجة دورة التأمل الختامية للجلسة:</div>
                        <div style="color:#f1f5f9; font-size:0.85rem; margin-bottom:6px;"><strong>📝 الملخص العرضي (Episode):</strong> ${data.episodeSummary || 'تم توثيق الجلسة'}</div>
                        ${data.learnedInferences && data.learnedInferences.length > 0 ? 
                            `<div style="color:#a78bfa; font-size:0.85rem;"><strong>🧠 تم استنتاج وتثبيت ${data.learnedInferences.length} معرفة جديدة في الجراف:</strong><br>${data.learnedInferences.map(inf => `• ${inf.from} → ${inf.relation} → ${inf.to}`).join('<br>')}</div>` : 
                            `<div style="color:#94a3b8; font-size:0.8rem;">لم تسفر الجلسة عن استنتاجات جديدة للجراف (تمت تصفية الكلام العابر).</div>`}
                        <div style="color:#38bdf8; font-size:0.8rem; margin-top:6px;">🧹 تم تفريغ الذاكرة العاملة المؤقتة بنجاح وبدء جلسة نظيفة.</div>
                    </div>
                `;

                if (sessionConsolidationResult) {
                    sessionConsolidationResult.style.display = 'block';
                    sessionConsolidationResult.innerHTML = resultHtml;
                }

                // Add system message to chat
                const { msgDiv: sysMsg } = createMessageElement(
                    `⏱️ **[نظام الوعي المعرفي — EyraOS]**<br>انتهت الجلسة الحوارية وتم تشغيل دورة التأمل والتجميع:<br>• **الملخص:** ${data.episodeSummary || 'حفظ ملخص الجلسة'}<br>• **الذاكرة العاملة:** تم تفريغ ${data.messagesFlushed} رسائل لتصفية الذهن وبدء جلسة جديدة.`,
                    false
                );
                chatMessages.appendChild(sysMsg);
                scrollToBottom();

                if (data.session) updateSessionUI(data.session);
                loadExistingGraph();
                updateLayersView();
                if (data.stats) updateStats(data.stats);
            } else {
                showToast(data.message || 'الذاكرة العاملة فارغة بالفعل');
            }
        } catch (err) {
            console.error('Session timeout error:', err);
            showToast('⚠️ حدث خطأ أثناء إنهاء الجلسة');
        } finally {
            if (btnSimulateTimeoutHeader) {
                btnSimulateTimeoutHeader.disabled = false;
                btnSimulateTimeoutHeader.innerHTML = '<span>⚡ إنهاء وتأمل الجلسة</span>';
            }
            if (btnSimulateTimeoutLayers) {
                btnSimulateTimeoutLayers.disabled = false;
                btnSimulateTimeoutLayers.innerHTML = '<span>⏱️ محاكاة انقضاء الجلسة (15 دقيقة) وتفريغ الذاكرة</span>';
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Event Listeners
    // ═══════════════════════════════════════════════════════════

    btnSend.addEventListener('click', () => sendMessage(chatInput.value));

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    btnClear.addEventListener('click', clearMemory);

    btnFitGraph.addEventListener('click', () => {
        if (network) network.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
    });

    btnTogglePhysics.addEventListener('click', () => {
        physicsEnabled = !physicsEnabled;
        if (network) network.setOptions({ physics: { enabled: physicsEnabled } });
        btnTogglePhysics.classList.toggle('active', physicsEnabled);
        showToast(physicsEnabled ? '🔄 الفيزياء مفعّلة' : '⏸️ الفيزياء متوقفة');
    });

    if (btnToggleSuperseded) {
        btnToggleSuperseded.addEventListener('click', () => {
            showSuperseded = !showSuperseded;
            btnToggleSuperseded.classList.toggle('active', showSuperseded);
            showToast(showSuperseded ? '⚡ تم إظهار العلاقات الملغاة' : '⚡ تم إخفاء العلاقات الملغاة');
            loadExistingGraph();
        });
    }

    if (btnRunConsolidation) {
        btnRunConsolidation.addEventListener('click', async () => {
            btnRunConsolidation.disabled = true;
            btnRunConsolidation.innerHTML = '<span>⏳ جاري التأمل والتجميع...</span>';

            try {
                const res = await fetch(`${API_BASE}/api/memory/consolidate`, { method: 'POST' });
                const data = await res.json();

                if (data.success) {
                    showToast('✨ اكتملت دورة التأمل وتثبيت المعرفة!');
                    if (consolidationInsights) {
                        consolidationInsights.style.display = 'block';
                        let html = `<strong>💡 نتائج التأمل والتجميع (Consolidation Insights):</strong><br>${data.insights || 'تم مراجعة الذاكرة بنجاح.'}`;
                        if (data.newInferences && data.newInferences.length > 0) {
                            html += `<div style="margin-top:6px; color:#06d6a0;">+ تم استنتاج ${data.newInferences.length} علاقة سلوكية جديدة</div>`;
                        }
                        if (data.mergedCount > 0) {
                            html += `<div style="margin-top:4px; color:#fbbf24;">+ تم دمج ${data.mergedCount} كيان مكرر</div>`;
                        }
                        consolidationInsights.innerHTML = html;
                    }
                    loadExistingGraph();
                    updateLayersView();
                    if (data.stats) updateStats(data.stats);
                } else {
                    showToast('⚠️ لم تكتمل دورة التأمل: ' + (data.error || ''));
                }
            } catch (err) {
                console.error('Consolidation error:', err);
                showToast('⚠️ خطأ في الاتصال أثناء التجميع');
            } finally {
                btnRunConsolidation.disabled = false;
                btnRunConsolidation.innerHTML = '<span>⚡ تشغيل دورة التأمل والتجميع</span>';
            }
        });
    }

    btnCloseDetails.addEventListener('click', hideEntityDetails);

    if (btnDeleteEntity) {
        btnDeleteEntity.addEventListener('click', () => {
            if (selectedEntityName) {
                deleteEntity(selectedEntityName);
            }
        });
    }

    if (detailsBody) {
        detailsBody.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-delete-rel');
            if (delBtn) {
                const relId = delBtn.dataset.relId;
                if (relId) deleteRelation(relId);
            }
        });
    }

    // Keyboard Delete / Backspace shortcut for selected node
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
            const activeEl = document.activeElement;
            if (activeEl === chatInput || (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) {
                return;
            }
            if (network) {
                const selNodes = network.getSelectedNodes();
                if (selNodes.length > 0) {
                    const node = nodes.get(selNodes[0]);
                    if (node && node.label) {
                        deleteEntity(node.label);
                    }
                }
            }
        }
    });

    if (btnSimulateTimeoutHeader) {
        btnSimulateTimeoutHeader.addEventListener('click', triggerSessionTimeout);
    }
    if (btnSimulateTimeoutLayers) {
        btnSimulateTimeoutLayers.addEventListener('click', triggerSessionTimeout);
    }

    // Procedural Listeners
    if (btnToggleProceduresList && proceduresListContainer) {
        btnToggleProceduresList.addEventListener('click', () => {
            const isHidden = proceduresListContainer.style.display === 'none';
            proceduresListContainer.style.display = isHidden ? 'block' : 'none';
            btnToggleProceduresList.classList.toggle('active', isHidden);
            if (isHidden) loadProcedures();
        });
    }

    if (btnOpenAddProcModal) {
        btnOpenAddProcModal.addEventListener('click', openProcedureModal);
    }
    if (btnCloseProcModal) {
        btnCloseProcModal.addEventListener('click', closeProcedureModal);
    }
    if (btnCancelProcModal) {
        btnCancelProcModal.addEventListener('click', closeProcedureModal);
    }
    if (procedureModal) {
        procedureModal.addEventListener('click', (e) => {
            if (e.target === procedureModal) closeProcedureModal();
        });
    }
    if (btnAddStepRow) {
        btnAddStepRow.addEventListener('click', addStepInputRow);
    }

    if (procForm) {
        procForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('procNameInput');
            const keywordsInput = document.getElementById('procKeywordsInput');
            const descInput = document.getElementById('procDescInput');
            const catSelect = document.getElementById('procCategorySelect');

            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) return;

            const keywords = keywordsInput ? keywordsInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];
            const description = descInput ? descInput.value.trim() : '';
            const category = catSelect ? catSelect.value : 'workflow';

            const stepRows = procStepsContainer ? procStepsContainer.querySelectorAll('.step-input-row') : [];
            const steps = [];
            stepRows.forEach((row, i) => {
                const titleInput = row.querySelector('.step-title-input');
                const instInput = row.querySelector('.step-instruction-input');
                steps.push({
                    stepNumber: i + 1,
                    title: titleInput ? titleInput.value.trim() : `خطوة ${i + 1}`,
                    instruction: instInput ? instInput.value.trim() : ''
                });
            });

            if (steps.length === 0) {
                showToast('⚠️ يرجى إضافة خطوة واحدة على الأقل');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/memory/procedure`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description, category, triggerKeywords: keywords, steps })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`✨ تم حفظ المهارة "${name}" في الذاكرة الإجرائية!`);
                    closeProcedureModal();
                    loadProcedures();
                    updateLayersView();
                    if (data.stats) updateStats(data.stats);
                    if (proceduresListContainer) proceduresListContainer.style.display = 'block';
                } else {
                    showToast('⚠️ فشل حفظ المهارة: ' + (data.error || ''));
                }
            } catch (err) {
                console.error('Save procedure error:', err);
                showToast('⚠️ خطأ أثناء إرسال المهارة');
            }
        });
    }

    if (proceduresListContainer) {
        proceduresListContainer.addEventListener('click', (e) => {
            const execBtn = e.target.closest('.btn-execute-proc');
            if (execBtn) {
                const id = execBtn.dataset.procId;
                if (id) executeProcedureAction(id);
                return;
            }
            const delBtn = e.target.closest('[data-proc-del-id]');
            if (delBtn) {
                const id = delBtn.dataset.procDelId;
                if (id) deleteProcedureAction(id);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Initialize
    // ═══════════════════════════════════════════════════════════

    function init() {
        btnTogglePhysics.classList.add('active');
        initResizer();
        loadExistingGraph();
        loadProcedures();
        chatInput.focus();

        // Fetch initial session state
        fetch(`${API_BASE}/api/session`)
            .then(r => r.json())
            .then(sess => {
                updateSessionUI(sess);
                startSessionTicker();
            })
            .catch(e => console.error('Initial session fetch error:', e));
    }

    init();

})();

