import { AddNodeDirection, NodeDirection, NodeId } from "@/features/mindmap/types/node";

/*
영향 범위
remote: 모든 참여자에게
local: 나만
*/
export type MindmapCommandScope = "remote" | "local";

/**
 * 누가 실행한 커맨드인지
 * local: 나
 * remote: 다른 참여자
 */
export type MindmapCommandOrigin = "local" | "remote" | "system";

export type MindmapCommandMeta = {
    origin: MindmapCommandOrigin;
    timestamp: number;
    txId?: string;
    userId?: string;
    layout?: "auto" | "skip";
};

type BaseCommand<
    TType extends string,
    TScope extends MindmapCommandScope,
    TPayload extends Record<string, unknown> = Record<string, unknown>,
> = {
    type: TType;
    scope: TScope;
    payload: TPayload;
    meta: MindmapCommandMeta;
};

export type MindmapCommand =
    | BaseCommand<
          "NODE/ADD",
          "remote",
          {
              baseId: NodeId;
              direction: NodeDirection;
              side: AddNodeDirection;
              data?: { contents?: string };
          }
      >
    | BaseCommand<
          "NODE/MOVE",
          "remote",
          {
              targetId: NodeId;
              movingId: NodeId;
              direction: NodeDirection;
              side?: AddNodeDirection;
          }
      >
    | BaseCommand<"NODE/DELETE", "remote", { nodeId: NodeId }>
    | BaseCommand<"NODE/RESIZE", "remote", { nodeId: NodeId; width: number; height: number }>
    | BaseCommand<"NODE/UPDATE_CONTENTS", "remote", { nodeId: NodeId; contents: string }>
    | BaseCommand<"SELECTION/SET", "local", { nodeId: NodeId | null }>
    | BaseCommand<"INTERACTION/START_CREATE", "local">
    | BaseCommand<"INTERACTION/CANCEL", "local">
    | BaseCommand<"VIEWPORT/SET", "local", { x: number; y: number; scale: number }>;
