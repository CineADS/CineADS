/**
 * Rule Triggers — templates de regras pré-configuradas para sellers.
 * Usado pela UI para oferecer regras prontas que o seller pode ativar.
 */
import type { RuleCondition, RuleAction, RuleType } from "./rule-types";
import type { DomainEventType } from "@/events/event-types";

export interface RuleTemplate {
  name: string;
  description: string;
  ruleType: RuleType;
  triggerEvents: DomainEventType[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: string;
}

export const ruleTemplates: RuleTemplate[] = [
  {
    name: "Alerta de estoque baixo",
    description: "Notifica quando o estoque de um produto fica abaixo de 5 unidades",
    ruleType: "stock_alert",
    triggerEvents: ["STOCK_UPDATED", "STOCK_LOW"],
    conditions: [
      { field: "newQuantity", operator: "less_than", value: 5 },
    ],
    actions: [
      {
        type: "notify_user",
        params: { title: "Estoque Baixo", message: "Um produto está com estoque crítico." },
      },
      {
        type: "create_log",
        params: { message: "Estoque baixo detectado pela automação" },
      },
    ],
    priority: "HIGH",
  },
  {
    name: "Pausar anúncio sem estoque",
    description: "Pausa automaticamente o anúncio quando o estoque chega a zero",
    ruleType: "stock_pause_listing",
    triggerEvents: ["STOCK_OUT"],
    conditions: [
      { field: "newQuantity", operator: "equals", value: 0 },
    ],
    actions: [
      { type: "pause_listing", params: {} },
      {
        type: "notify_user",
        params: { title: "Anúncio Pausado", message: "Anúncio pausado automaticamente por falta de estoque." },
      },
    ],
    priority: "HIGH",
  },
  {
    name: "Alerta de pedido atrasado",
    description: "Notifica quando um pedido não é despachado em 48h",
    ruleType: "order_delayed",
    triggerEvents: ["ORDER_UPDATED"],
    conditions: [
      { field: "status", operator: "equals", value: "pending" },
    ],
    actions: [
      {
        type: "notify_user",
        params: { title: "Pedido Atrasado", message: "Um pedido está pendente há mais de 48 horas." },
      },
    ],
    priority: "MEDIUM",
  },
  {
    name: "Alerta de erro de sincronização",
    description: "Notifica o administrador quando uma sincronização falha",
    ruleType: "sync_error_alert",
    triggerEvents: ["SYNC_FAILED", "INTEGRATION_ERROR"],
    conditions: [],
    actions: [
      {
        type: "notify_user",
        params: { title: "Erro de Sincronização", message: "Uma sincronização falhou. Verifique os logs." },
      },
      {
        type: "create_log",
        params: { message: "Erro de sincronização detectado pela automação" },
      },
    ],
    priority: "HIGH",
  },
];
