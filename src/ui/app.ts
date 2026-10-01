import { CounterfactualTree, LifeSpecimen, LifeNode } from '../core/models';
import { NodeSearchResult } from '../core/tree-engine';

export interface TreeUIHandlers {
  onGrowNewTree: (assumption: string) => void;
  onWaterNode: (nodeId: string) => void;
  onPruneNode: (nodeId: string) => void;
  onHarvestNode: (nodeId: string) => void;
  onDeleteSpecimen: (id: string) => void;
  onToggleCabinet: (open: boolean) => void;
  onSearchChange: (keyword: string) => void;
  onClearSearch: () => void;
  onLocateNode: (nodeId: string) => void;
}

export interface SearchPanelState {
  keyword: string;
  results: NodeSearchResult[];
  focusedNodeId: string | null;
}

export function renderTreeApp(
  container: HTMLElement,
  tree: CounterfactualTree,
  specimens: LifeSpecimen[],
  isCabinetOpen: boolean,
  presets: string[],
  search: SearchPanelState,
  handlers: TreeUIHandlers
) {
  const esc = (s: string) =>
    s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

  // Remember whether the search box held focus so it can be restored after
  // the full innerHTML replacement triggered by live typing.
  const activeEl = document.activeElement as HTMLElement | null;
  const hadSearchFocus = activeEl?.id === 'pathSearchInput';

  // Escape text, then wrap every keyword occurrence (case-insensitive) in <mark>.
  const highlight = (text: string) => {
    const safe = esc(text);
    const terms = search.keyword
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (terms.length === 0) return safe;
    return safe.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark class="search-mark">$1</mark>');
  };

  // Organize nodes by layer index (0 to 4)
  const layers: LifeNode[][] = [[], [], [], [], []];
  Object.values(tree.nodes).forEach(n => {
    if (layers[n.layerIndex]) {
      layers[n.layerIndex].push(n);
    }
  });

  const eraTitles = ['起点分歧点', '+1年·涟漪微漾', '+3年·风向转折', '+5年·航道分野', '+10年·宿命标本'];

  // When a search result is located, mark the target node and every ancestor
  // on its causal pathway so the user can read the branch end-to-end.
  const pathNodeIds = new Set<string>();
  if (search.focusedNodeId && tree.nodes[search.focusedNodeId]) {
    let cursor: LifeNode | undefined = tree.nodes[search.focusedNodeId];
    while (cursor) {
      pathNodeIds.add(cursor.id);
      cursor = cursor.parentId ? tree.nodes[cursor.parentId] : undefined;
    }
  }

  const trimmedKeyword = search.keyword.trim();
  const liveResultCount = search.results.filter(r => !r.isPruned).length;
  const prunedResultCount = search.results.length - liveResultCount;

  container.innerHTML = `
    <div class="tree-app">
      <header class="app-header">
        <div class="brand">
          <div class="tree-icon">🌿</div>
          <div>
            <h1>反事实平行人生树 · 平行人生标本集</h1>
            <p>COUNTERFACTUAL LIFE TREE &amp; PARALLEL SPECIMENS · v1.0.0</p>
          </div>
        </div>
        <button class="cabinet-btn" id="btnOpenCabinet">
          🗄️ 平行人生标本馆 (${specimens.length})
        </button>
      </header>

      <!-- Assumption Generator Hub -->
      <section class="generator-hub">
        <div class="assumption-input-wrap">
          <input type="text" class="assumption-input" id="assumptionInput" value="${esc(tree.assumption)}" placeholder="输入一个'如果当初……'的假设，观察平行人生分支生长" />
          <button class="btn-grow" id="btnGrowTree">生长反事实树 🌱</button>
        </div>
        <div class="preset-list">
          <span style="color:var(--text-muted);">经典假设母题：</span>
          ${presets.map(p => `<button class="btn-preset" data-preset="${esc(p)}">${esc(p)}</button>`).join('')}
        </div>
      </section>

      <!-- Main Tree Container -->
      <main class="tree-container">
        <div class="tree-header">
          <h2>🌳 当前反事实时空谱系：${esc(tree.assumption)}</h2>
          <span style="font-size:12px;color:var(--text-muted);">
            提示：点击【💧浇水】注入可能性能量，点击【✂️修剪】减除不想要的走向，点击【📌采集】定格标本
          </span>
        </div>

        <!-- Path Search Hub -->
        <section class="path-search">
          <div class="search-input-wrap">
            <span class="search-icon">🔭</span>
            <input
              type="text"
              class="search-input"
              id="pathSearchInput"
              value="${esc(search.keyword)}"
              placeholder="按节点标题或故事关键词搜索命运路径（多个词以空格分隔）"
              autocomplete="off"
            />
            ${
              trimmedKeyword
                ? `<button class="search-clear" id="btnClearSearch" title="清除搜索">✕</button>`
                : ''
            }
          </div>

          ${
            trimmedKeyword === ''
              ? `
            <div class="search-hint search-hint-idle">
              🔍 输入关键词以在平行时空中定位枝桠——可匹配节点【标题】【故事描述】与【命运箴言】。
            </div>
          `
              : search.results.length === 0
                ? `
            <div class="search-hint search-hint-empty">
              🍂 在当前这棵反事实树上，没有任何节点匹配「${esc(trimmedKeyword)}」。
              它或许属于另一条从未被浇灌的因果支流——换个关键词，或生长一棵新的假设之树试试。
            </div>
          `
                : `
            <div class="search-results">
              <div class="search-results-meta">
                找到 <strong>${search.results.length}</strong> 个相关节点
                （${liveResultCount} 个在生${prunedResultCount > 0 ? `，<span class="meta-pruned">${prunedResultCount} 个已修剪</span>` : ''}）
                —— 点击结果即可沿因果路径定位到树上
              </div>
              <div class="search-results-list">
                ${search.results
                  .map(
                    r => `
                  <button class="search-result-item ${r.isPruned ? 'pruned' : ''} ${
                      search.focusedNodeId === r.node.id ? 'focused' : ''
                    }" data-locate="${r.node.id}" style="--cat-color: ${r.node.color};">
                    <div class="result-head">
                      <span class="result-era">${esc(r.eraLabel)}</span>
                      <span class="result-fields">命中：${r.matchFields.map(esc).join(' / ')}</span>
                      ${
                        r.isPruned
                          ? '<span class="result-pruned-tag">🥀 已修剪·定格于虚空中</span>'
                          : '<span class="result-live-tag">🌿 在生枝桠</span>'
                      }
                    </div>
                    <div class="result-title">${highlight(r.node.title)}</div>
                    <div class="result-snippet">${highlight(r.node.scenarioDescription)}</div>
                    <div class="result-path">
                      ${r.pathWay.map((p, i) => (i === r.pathWay.length - 1 ? highlight(p) : esc(p))).join(' ← ')}
                    </div>
                    ${
                      r.isPruned
                        ? '<div class="result-pruned-note">该枝桠已被修剪，仍可点击查看它在树上的凋零之处。</div>'
                        : ''
                    }
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
          }
        </section>

        <div class="generations-track">
          ${layers
            .map(
              (layerNodes, idx) => `
            <div class="generation-column">
              <div class="column-header">${eraTitles[idx]}</div>
              ${layerNodes
                .map(
                  node => `
                <div class="node-card ${node.isPruned ? 'pruned' : ''} ${
                  pathNodeIds.has(node.id) ? 'on-path' : ''
                } ${search.focusedNodeId === node.id ? 'focused-node' : ''}"
                     id="tree-node-${node.id}"
                     style="--cat-color: ${node.color};"
                     data-id="${node.id}">
                  <span class="node-category-tag">${esc(node.categoryName)}</span>
                  <div class="node-title">${esc(node.title)}</div>
                  <div class="node-desc">${esc(node.scenarioDescription)}</div>
                  <div class="node-quote">${esc(node.specimenQuote)}</div>
                  
                  <div class="vitality-bar-bg">
                    <div class="vitality-bar-fill" style="width: ${node.vitality}%;"></div>
                  </div>

                  <div class="node-actions">
                    <button class="btn-action btn-water" data-id="${node.id}" title="注入生命力" ${node.isPruned ? 'disabled' : ''}>
                      💧 浇水 (${node.waterCount})
                    </button>
                    <button class="btn-action btn-prune" data-id="${node.id}" title="剪除此分支">
                      ✂️ 修剪
                    </button>
                    <button class="btn-action btn-harvest" data-id="${node.id}" title="收录进标本馆">
                      📌 采集标本
                    </button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
      </main>

      <!-- Specimen Cabinet Modal -->
      ${
        isCabinetOpen
          ? `
        <div class="modal-overlay" id="cabinetOverlay">
          <div class="modal-content">
            <div class="cabinet-header">
              <h2>🗄️ 平行人生植物学标本集 (Herbarium of What-Ifs)</h2>
              <button class="btn-action" id="btnCloseCabinet" style="font-size:16px;">✕ 关闭</button>
            </div>

            ${
              specimens.length === 0
                ? `
              <div style="text-align:center;padding:40px;color:var(--text-muted);">
                🌱 标本柜暂空。请在反事实树上点击节点的【📌 采集标本】按钮，将某段平行人生命运封存入馆。
              </div>
            `
                : `
              <div class="specimens-grid">
                ${specimens
                  .map(
                    s => `
                  <div class="specimen-card">
                    <span class="specimen-tag">标本领域 · ${esc(s.butterflyTag)}</span>
                    <div class="specimen-title">${esc(s.title)}</div>
                    <div class="specimen-quote">${esc(s.quote)}</div>
                    <div class="specimen-path">
                      <strong>演化因果链：</strong><br />
                      ${s.pathWay.map(p => `↳ ${esc(p)}`).join('<br />')}
                    </div>
                    <div class="specimen-footer">
                      <span>采集时空：${s.harvestedAt}</span>
                      <button class="btn-del-specimen" data-delid="${s.id}">移出标本集</button>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div style="text-align:right;margin-top:24px;">
                <button class="cabinet-btn" onclick="window.print()">🖨️ 导出 / 打印标本图册</button>
              </div>
            `
            }
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  // Attach event listeners
  container.querySelector('#btnOpenCabinet')?.addEventListener('click', () => handlers.onToggleCabinet(true));
  container.querySelector('#btnCloseCabinet')?.addEventListener('click', () => handlers.onToggleCabinet(false));
  container.querySelector('#cabinetOverlay')?.addEventListener('click', e => {
    if (e.target === container.querySelector('#cabinetOverlay')) {
      handlers.onToggleCabinet(false);
    }
  });

  const inputEl = container.querySelector('#assumptionInput') as HTMLInputElement;
  const triggerGrow = () => {
    const val = inputEl.value.trim();
    if (val) handlers.onGrowNewTree(val);
  };

  container.querySelector('#btnGrowTree')?.addEventListener('click', triggerGrow);
  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerGrow();
  });

  container.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      if (preset) {
        inputEl.value = preset;
        handlers.onGrowNewTree(preset);
      }
    });
  });

  // Action buttons on nodes
  container.querySelectorAll('.btn-water').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onWaterNode(id);
    });
  });

  container.querySelectorAll('.btn-prune').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onPruneNode(id);
    });
  });

  container.querySelectorAll('.btn-harvest').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) handlers.onHarvestNode(id);
    });
  });

  container.querySelectorAll('.btn-del-specimen').forEach(btn => {
    btn.addEventListener('click', () => {
      const delId = btn.getAttribute('data-delid');
      if (delId) handlers.onDeleteSpecimen(delId);
    });
  });

  // Path search: live filtering on every keystroke. The whole view is
  // re-rendered on input, so restore focus + caret to keep typing smooth.
  // IME composition (pinyin etc.) is deferred until compositionend so that
  // re-rendering does not interrupt in-progress character assembly.
  const searchInput = container.querySelector('#pathSearchInput') as HTMLInputElement | null;
  if (searchInput) {
    if (hadSearchFocus) {
      searchInput.focus();
      const caret = searchInput.value.length;
      searchInput.setSelectionRange(caret, caret);
    }

    let isComposing = false;
    const emitSearch = () => handlers.onSearchChange(searchInput.value);

    searchInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    searchInput.addEventListener('compositionend', () => {
      isComposing = false;
      emitSearch();
    });
    searchInput.addEventListener('input', e => {
      if (!isComposing && !(e as InputEvent).isComposing) emitSearch();
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !isComposing) {
        searchInput.value = '';
        handlers.onClearSearch();
      }
    });
  }

  container.querySelector('#btnClearSearch')?.addEventListener('click', () => {
    handlers.onClearSearch();
  });

  container.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const nodeId = item.getAttribute('data-locate');
      if (nodeId) handlers.onLocateNode(nodeId);
    });
  });
}
