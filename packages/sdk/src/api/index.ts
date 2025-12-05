/**
 * ZendFi API Modules
 * 
 * Namespaced APIs for the Agentic Intent Protocol:
 * - agent: Agent API keys and sessions
 * - intents: Payment intents (two-phase flow)
 * - pricing: PPP and AI-powered pricing
 * - autonomy: Autonomous agent signing
 * - smartPayments: AI-powered payment routing
 */

export { AgentAPI } from './agent';
export { PaymentIntentsAPI } from './intents';
export { PricingAPI } from './pricing';
export { AutonomyAPI } from './autonomy';
export { SmartPaymentsAPI } from './smart-payments';

export type { RequestFn } from './agent';
