/**
 * BytePlus API Clients Export
 *
 * @module api
 */

// Main clients
export { BytePlusClient, BytePlusAPIError } from './byteplus-client.js';
export { TextGenerationClient } from './text-generation-client.js';
export { BytePlusAI } from './byteplus-ai.js';

// Services
export { PromptOptimizer } from '../services/prompt-optimizer.js';
export { PromptChain } from '../services/prompt-chain.js';
export type {
  PromptChainStep,
  PromptChainResult,
} from '../services/prompt-chain.js';

// Re-export types
export type {
  BytePlusConfig,
  ImageGenerationModel,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationModel,
  VideoGenerationRequest,
  VideoGenerationResponse,
  TextGenerationModel,
  TextGenerationRequest,
  TextGenerationResponse,
  PromptType,
  PromptOptimizationRequest,
  PromptOptimizationResponse,
} from '../types/byteplus.js';
