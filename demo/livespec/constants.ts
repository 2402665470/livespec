import { SpecData } from './types';

export const INITIAL_DATA: SpecData = {
  viewMode: "graph",
  meta: { "name": "BigFish Desktop", "version": "0.2.0" },
  nodes: [
    { "id": "root", "type": "feature", "label": "Plugin System", "parentId": null, "status": "approved", "width": 320, "height": 140 },
    { "id": "feat_import", "type": "feature", "label": "Import Module", "parentId": "root", "status": "approved", "width": 280, "height": 180 },
    { "id": "feat_list", "type": "feature", "label": "Installed List", "parentId": "root", "status": "pending", "width": 280, "height": 180 },
    { "id": "task_select", "type": "task", "label": "Select File", "parentId": "feat_import", "status": "verified", "width": 220, "height": 70 },
    { "id": "task_validate", "type": "task", "label": "Validate Zip", "parentId": "feat_import", "status": "pending", "width": 220, "height": 70 },
    { "id": "task_remove", "type": "task", "label": "Uninstall", "parentId": "feat_list", "status": "broken", "width": 220, "height": 70 }
  ],
  edges: [
    { "from": "task_select", "to": "task_validate", "label": "On Selected" },
    { "from": "task_validate", "to": "task_remove", "label": "Mock Logic" }
  ],
  layoutNodes: []
};