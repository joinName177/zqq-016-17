import './ui/styles.css';
import { TreeEngineAdapter } from './adapters/tree-engine.adapter';
import { LocalSpecimenAdapter } from './adapters/local-specimen.adapter';
import { CounterfactualTree } from './core/models';
import { renderTreeApp, SearchPanelState } from './ui/app';

const treeAdapter = new TreeEngineAdapter();
const specimenAdapter = new LocalSpecimenAdapter();

const PRESETS = [
  '如果当初我留在了故乡小城',
  '如果当初我鼓起勇气向TA表白了心意',
  '如果当年我选择了读纯艺术专业',
  '如果当年我没有接受那家大厂的Offer'
];

let currentTree: CounterfactualTree = treeAdapter.createTree(PRESETS[0]);
let isCabinetOpen = false;

// Path search state: keyword is kept so the box survives re-renders
// (watering / pruning / harvesting); focusedNodeId marks the located result.
let searchState: SearchPanelState = {
  keyword: '',
  results: [],
  focusedNodeId: null
};

const rootEl = document.getElementById('app')!;

// Re-run the current keyword against a mutated tree so live/pruned badges
// and newly sprouted serendipity branches stay in sync with search results.
function refreshResultsFor(tree: CounterfactualTree): SearchPanelState {
  if (!searchState.keyword.trim()) return searchState;
  return { ...searchState, results: treeAdapter.search(tree, searchState.keyword) };
}

function refreshView(options: { scrollToFocused?: boolean } = {}) {
  const specimens = specimenAdapter.getAll();

  renderTreeApp(
    rootEl,
    currentTree,
    specimens,
    isCabinetOpen,
    PRESETS,
    searchState,
    {
      onGrowNewTree: (assumption: string) => {
        currentTree = treeAdapter.createTree(assumption);
        // A brand-new tree invalidates prior search results and focus.
        searchState = { keyword: '', results: [], focusedNodeId: null };
        refreshView();
      },
      onWaterNode: (nodeId: string) => {
        currentTree = treeAdapter.water(currentTree, nodeId);
        searchState = refreshResultsFor(currentTree);
        refreshView();
      },
      onPruneNode: (nodeId: string) => {
        currentTree = treeAdapter.prune(currentTree, nodeId);
        searchState = refreshResultsFor(currentTree);
        refreshView();
      },
      onHarvestNode: (nodeId: string) => {
        const sp = treeAdapter.harvest(currentTree, nodeId);
        specimenAdapter.save(sp);
        alert(`已成功将节点【${sp.title}】收入平行人生标本馆！`);
        refreshView();
      },
      onDeleteSpecimen: (id: string) => {
        specimenAdapter.remove(id);
        refreshView();
      },
      onToggleCabinet: (open: boolean) => {
        isCabinetOpen = open;
        refreshView();
      },
      onSearchChange: (keyword: string) => {
        searchState = {
          keyword,
          results: treeAdapter.search(currentTree, keyword),
          focusedNodeId: null
        };
        refreshView();
      },
      onClearSearch: () => {
        searchState = { keyword: '', results: [], focusedNodeId: null };
        refreshView();
      },
      onLocateNode: (nodeId: string) => {
        searchState = { ...searchState, focusedNodeId: nodeId };
        refreshView({ scrollToFocused: true });
      }
    }
  );

  if (options.scrollToFocused && searchState.focusedNodeId) {
    const target = rootEl.querySelector(
      `#tree-node-${CSS.escape(searchState.focusedNodeId)}`
    ) as HTMLElement | null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

// Initial render
refreshView();
