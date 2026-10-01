import { CounterfactualTree, LifeSpecimen } from '../core/models';
import { NodeSearchResult } from '../core/tree-engine';

export interface TreeEnginePort {
  createTree(assumption: string): CounterfactualTree;
  water(tree: CounterfactualTree, nodeId: string): CounterfactualTree;
  prune(tree: CounterfactualTree, nodeId: string): CounterfactualTree;
  harvest(tree: CounterfactualTree, nodeId: string): LifeSpecimen;
  search(tree: CounterfactualTree, keyword: string): NodeSearchResult[];
}
