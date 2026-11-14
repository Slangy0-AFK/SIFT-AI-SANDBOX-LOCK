import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

const originalFetch = globalThis.fetch;
let qrngAvailable = true;
let invalidQrngProvenance = false;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

beforeEach(() => {
  qrngAvailable = true;
  invalidQrngProvenance = false;
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    if (url === '/health') return jsonResponse({ status: 'ok' });
    if (url === '/api/qrng/status') {
      return jsonResponse({
        configured: true,
        source: 'Laboratory for Digitalisation (LfD) QRNG'
      });
    }
    if (url === '/api/qrng' && options.method === 'POST') {
      if (!qrngAvailable) {
        return jsonResponse({ error: 'Quantum entropy is unavailable; no fallback source was used.' }, 502);
      }
      const { bits } = JSON.parse(options.body);
      return jsonResponse({
        entropyHex: BigInt(3).toString(16).padStart(bits / 4, '0'),
        bits,
        providerRequestId: 'provider-test-id',
        source: 'Laboratory for Digitalisation (LfD) QRNG',
        providerEndpoint: invalidQrngProvenance ? 'https://example.invalid/entropy' : 'https://lfdr.de/qrng_api/qrng',
        retrievedAt: '2026-01-01T00:00:00.000Z',
        requestId: 'server-test-id'
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe('application interactions', () => {
  it('converts an entered number through the base converter controls', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Number to convert/), { target: { value: '1010' } });
    fireEvent.change(screen.getByLabelText('Input base'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Convert exactly' }));

    expect(screen.getByText(/in base 2 is the exact rational/)).toBeTruthy();
    expect(screen.getAllByText('10', { selector: '.number-value' }).length).toBeGreaterThan(0);
  });

  it('preserves the original paradox and lets the user explore an exact hypothesis', () => {
    const original = 'If an omnipotent being creates a stone...\nCan it be lifted?';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Paradox Lab' }));
    fireEvent.change(screen.getByLabelText('Your paradox, in your own words'), { target: { value: original } });

    fireEvent.click(screen.getByRole('button', { name: 'QRNG' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paradox Lab' }));
    expect(screen.getByLabelText('Your paradox, in your own words').value).toBe(original);
    fireEvent.click(screen.getByRole('button', { name: 'Preserve and explore' }));

    expect(document.querySelector('.original-wording pre').textContent).toBe(original);
    expect(screen.getByText(/Clarifying question:/)).toBeTruthy();
    expect(screen.getByText(/the app does not extract claims or assign beliefs/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('How would you classify the claim?'), {
      target: { value: 'philosophical' }
    });
    fireEvent.change(screen.getByLabelText('Assumptions you identify'), {
      target: { value: 'The terms are being used consistently.' }
    });
    fireEvent.change(screen.getByLabelText('Propositions you identify in your wording'), {
      target: { value: 'The claim concerns a possible action.' }
    });
    fireEvent.change(screen.getByLabelText(/Your reformulation/), {
      target: { value: 'A reformulation authored by the user.' }
    });
    fireEvent.change(screen.getByLabelText('Testable mathematical hypothesis (your wording)'), {
      target: { value: 'These equivalent fractions are equal.' }
    });
    fireEvent.change(screen.getByLabelText('First exact value'), { target: { value: '1/3' } });
    fireEvent.change(screen.getByLabelText('Second exact value'), { target: { value: '2/6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test exact hypothesis' }));

    expect(screen.getByText(/in base 10 is true for these numeric inputs/)).toBeTruthy();
    expect(screen.getAllByText('0.(3)')).toHaveLength(2);
    expect(screen.getByLabelText('Assumptions you identify').value).toContain('consistently');
    expect(screen.getByLabelText('Propositions you identify in your wording').value).toContain('possible action');
    expect(screen.getByText(/do not establish the truth of philosophical or theological claims/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Your paradox, in your own words'), {
      target: { value: 'Edited wording after submission.' }
    });
    expect(document.querySelector('.original-wording pre').textContent).toBe(original);
  });

  it('reports an upstream QRNG outage without presenting a substitute sample', async () => {
    qrngAvailable = false;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'QRNG' }));

    await waitFor(() => {
      expect(document.querySelector('[aria-labelledby="qrng-title"]').textContent)
        .toMatch(/Quantum entropy source not connected/);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request quantum bits' }));

    await waitFor(() => {
      expect(document.querySelector('.error-message').textContent).toMatch(/no fallback source was used/);
    });
    expect(document.querySelector('.bit-output')).toBeNull();
  });

  it('displays and converts a provenance-validated QRNG response', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'QRNG' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Request quantum bits' }).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Amount of entropy'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request quantum bits' }));

    await waitFor(() => expect(screen.getByText('0000000000000011')).toBeTruthy());
    expect(screen.getAllByText('[03]', { selector: '.number-value' }).length).toBeGreaterThan(0);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/qrng', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 16 })
    });
  });

  it('rejects QRNG samples with mismatched provenance metadata', async () => {
    invalidQrngProvenance = true;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'QRNG' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Request quantum bits' }).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Request quantum bits' }));

    await waitFor(() => expect(screen.getByText(/provenance validation/)).toBeTruthy());
    expect(document.querySelector('.bit-output')).toBeNull();
  });

  it('passes the latest successful QRNG sample to the paradox math input', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'QRNG' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Request quantum bits' }).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Amount of entropy'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request quantum bits' }));
    await waitFor(() => expect(screen.getByText('0000000000000011')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Paradox Lab' }));
    fireEvent.change(screen.getByLabelText('Your paradox, in your own words'), { target: { value: 'A sample hypothesis.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preserve and explore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use latest QRNG sample as first value' }));
    expect(screen.getByLabelText('First exact value').value).toBe('0000000000000011');
    expect(screen.getByLabelText('Operand base').value).toBe('2');
  });

  it('renders sandbox input as inert text rather than HTML', () => {
    const payload = '<img src=x onerror=alert(1)>';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Security Sandbox' }));
    fireEvent.change(screen.getByLabelText('Text to preview (kept in this browser)'), {
      target: { value: payload }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Render as inert text' }));

    expect(document.querySelector('.sandbox-preview pre').textContent).toBe(payload);
    expect(document.querySelector('.sandbox-preview img')).toBeNull();
  });

  it('verifies live QRNG connectivity from System Status without displaying the probe sample', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'System Status & Test Results' }));
    await waitFor(() => expect(screen.getByText('Online')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Check live QRNG (consume 8 bits)' }));

    await waitFor(() => {
      expect(document.querySelector('[aria-labelledby="status-title"]').textContent)
        .toMatch(/Connected to Laboratory for Digitalisation/);
    });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/qrng', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bits: 8 })
    });
    expect(document.querySelector('.bit-output')).toBeNull();
  });
});
