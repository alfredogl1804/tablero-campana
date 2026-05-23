export type NodeStatus = "ACTIVE" | "DEGRADED" | "SPRINT" | "FUTURE";

export interface BoardDistrict {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  health: number;
  grid_origin: [number, number];
  grid_size: [number, number];
}

export interface BoardNode {
  id: string;
  district: string;
  label: string;
  description: string;
  status: NodeStatus;
  loc: number;
  connections_in: string[];
  connections_out: string[];
  grid_position: [number, number];
  last_updated: string;
  gap?: string;
}

export interface BoardData {
  meta: {
    generated_from: string;
    timestamp: string;
    version: string;
    total_nodes: number;
    system_health: number;
  };
  districts: BoardDistrict[];
  nodes: BoardNode[];
}
