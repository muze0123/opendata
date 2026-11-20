export const NODE_CODES = [
  "execute",
  "review",
  "cc",
  "lims",
  "tara",
  "email",
  "sms",
  "condition",
  "parallel",
] as const;
export type NodeKind = (typeof NODE_CODES)[number];
export const TYPE_CODES = ["normal", "project"] as const;
export const FIELD_CODES = [
  "approvalResult",
  "returnCount",
  "projectStatus",
  "projectStage",
  "activityStatus",
] as const;
export const PROJECT_ROLE_CODES = [
  "projectOwner",
  "securityOwner",
  "activityOwner",
  "reviewer",
] as const;
export interface Leaf {
  id: string;
  field: string;
  operator: string;
  value: string | string[] | number;
}
export interface Condition {
  id: string;
  logic: "and" | "or";
  children: (Condition | Leaf)[];
}
export interface Assignment {
  mode: "members" | "roles" | "projectRoles" | "field" | "auto";
  ids: string[];
  field?: string;
}
export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  name?: string;
  assignment: Assignment;
  approval: "all" | "any";
  message?: {
    source: "custom" | "template";
    templateId?: string;
    title: string;
    content: string;
    attachments?: Attachment[];
  };
  branches?: Branch[];
}
export interface Attachment {
  name: string;
  type: string;
  data: string;
  size: number;
}
export interface Branch {
  id: string;
  priority: number;
  fallback: boolean;
  condition: Condition;
  nodes: WorkflowNode[];
}
export interface Definition {
  id: string;
  name: string;
  description: string;
  type: "normal" | "project";
  enabled: boolean;
  revision: number;
  builtin?: "extension" | "risk";
  nodes: WorkflowNode[];
}
export interface Template {
  id: string;
  name: string;
  channel: "email" | "sms";
  title: string;
  content: string;
  attachments: Attachment[];
}
export interface Bootstrap {
  definitions: Definition[];
  templates: Template[];
  dictionaries: Record<string, string[]>;
}
export const newCondition = (): Condition => ({
  id: crypto.randomUUID(),
  logic: "and",
  children: [{ id: crypto.randomUUID(), field: "", operator: "", value: "" }],
});
export function newNode(kind: NodeKind, type: string): WorkflowNode {
  return {
    id: crypto.randomUUID(),
    kind,
    assignment: {
      mode: type === "project" ? "projectRoles" : "members",
      ids: [],
    },
    approval: "all",
    ...(["email", "sms"].includes(kind)
      ? {
          message: {
            source: "custom" as const,
            title: "",
            content: "",
            attachments: [],
          },
        }
      : {}),
    ...(["condition", "parallel"].includes(kind)
      ? {
          branches: [false, false, true].map((fallback, i) => ({
            id: crypto.randomUUID(),
            priority: i + 1,
            fallback,
            condition: newCondition(),
            nodes: [],
          })),
        }
      : {}),
  };
}
