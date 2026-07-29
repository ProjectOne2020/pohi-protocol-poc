/**
 * Unit Tests for @pohi-protocol/sdk-web
 *
 * Tests PoHISession lifecycle, event ingestion, memory sanitization, and worker handler.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPoHISession,
  handleWorkerProverRequest,
  type PoHISDKConfig,
  type WorkerProverRequest,
} from '../dist/index.js';

describe('@pohi-protocol/sdk-web Session Lifecycle', () => {
  it('should instantiate a PoHISession with createPoHISession factory function', () => {
    const config: PoHISDKConfig = {
      contextLength: 40,
      sessionHash: '0x1234567890abcdef',
    };

    const session = createPoHISession(config);
    assert.ok(session);
    assert.equal(typeof session.attach, 'function');
    assert.equal(typeof session.detach, 'function');
    assert.equal(typeof session.processSession, 'function');
    assert.equal(typeof session.destroy, 'function');
    session.destroy();
  });

  it('should process a session and return valid scoreResult structure', async () => {
    const config: PoHISDKConfig = {
      contextLength: 40,
      sessionHash: '0xabcdef1234567890',
    };

    const session = createPoHISession(config);
    const result = await session.processSession();

    assert.ok(result);
    assert.ok('scoreResult' in result);
    assert.ok('rawEventCount' in result);
    assert.equal(result.rawEventCount, 0);
    assert.equal(typeof result.scoreResult.compositeScore, 'number');
    assert.equal(typeof result.scoreResult.isValid, 'boolean');
    session.destroy();
  });

  it('should execute zero-overwrite sanitization on destroy without throwing errors', () => {
    const config: PoHISDKConfig = {
      contextLength: 100,
      sessionHash: '0xdeadbeef',
    };

    const session = createPoHISession(config);
    assert.doesNotThrow(() => {
      session.destroy();
    });
  });
});

describe('@pohi-protocol/sdk-web Worker RPC Handler', () => {
  it('should return PROOF_ERROR for invalid request types', async () => {
    const invalidRequest = {
      type: 'INVALID_TYPE',
    } as unknown as WorkerProverRequest;

    const response = await handleWorkerProverRequest(invalidRequest);
    assert.equal(response.type, 'PROOF_ERROR');
    assert.ok(response.error?.includes('Unsupported request type'));
  });
});
