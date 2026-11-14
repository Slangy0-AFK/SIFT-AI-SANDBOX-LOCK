import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBindingUpdate, modelBindingMatches } from '../../base44/shared/licenseBinding.js';

test('a license cannot be rebound to a model other than the one issued', () => {
  assert.equal(modelBindingMatches('SIFT Model', 'sift model'), true);
  assert.equal(modelBindingMatches('SIFT Model', 'Other Model'), false);
  assert.equal(
    createBindingUpdate(
      { model_name: 'SIFT Model' },
      { model: 'Other Model', deployment: 'production' },
      '2026-11-14T00:00:00.000Z'
    ),
    null
  );
});

test('an existing purchase model is preserved when a deployment is first bound', () => {
  assert.deepEqual(
    createBindingUpdate(
      { model_name: 'SIFT Model' },
      { model: 'SIFT Model', deployment: 'production' },
      '2026-11-14T00:00:00.000Z'
    ),
    {
      deployment_id: 'production',
      binding_locked_at: '2026-11-14T00:00:00.000Z',
      activations: 1,
      activated_at: '2026-11-14T00:00:00.000Z'
    }
  );
});

test('a founding license without an issued model binds its model once', () => {
  assert.deepEqual(
    createBindingUpdate(
      { model_name: '' },
      { model: 'SIFT Model', deployment: 'production' },
      '2026-11-14T00:00:00.000Z'
    ),
    {
      deployment_id: 'production',
      binding_locked_at: '2026-11-14T00:00:00.000Z',
      activations: 1,
      activated_at: '2026-11-14T00:00:00.000Z',
      model_name: 'SIFT Model'
    }
  );
});
