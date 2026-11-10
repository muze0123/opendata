import { defineStore } from 'pinia';
import { ref } from 'vue';
import { directories, vehicles, type Directory, type Vehicle } from '../data/vehicles';
export interface ProjectReference { id: string; name: string; directories: string[]; type: 'vehicle' | 'other'; status: 'pending' | 'active' | 'completed'; usedParts: string[]; snapshot: string[] }
export const useVehiclesStore = defineStore('vehicles', () => {
  const tree = ref<Directory[]>(structuredClone(directories));
  const rows = ref<Vehicle[]>(structuredClone(vehicles));
  const hierarchyLevels = ref(4);
  // Local relationship fixtures until the project module supplies its contract.
  const projects = ref<ProjectReference[]>([
    { id: 'P-A', name: 'MT-SUV-A 开发项目', directories: ['default'], type: 'vehicle', status: 'active', usedParts: ['PN-GW-B02'], snapshot: ['PN-DCU-A01', 'PN-GW-B02', 'PN-TBOX-C03'] },
    { id: 'P-B', name: 'MT-SUV-A 已完成项目', directories: ['high'], type: 'vehicle', status: 'completed', usedParts: [], snapshot: [] },
  ]);
  return { tree, rows, hierarchyLevels, projects };
});
