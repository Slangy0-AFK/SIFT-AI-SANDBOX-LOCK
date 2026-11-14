import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

const originalFetch = globalThis.fetch;
let qrngConfigured = false;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

beforeEach(() => {
  qrngConfigured = false;
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    if (url === '/health') return jsonResponse({ status: 'ok' });
    if (url === '/api/qrng/status') {
      return jsonResponse({
        configured: qrngConfigured,
        source: 'Australian National University QRNG'
      });
    }
    if (url === '/api/qrng' && options.method === 'POST') {
      return jsonResponse({
        entropyHex: '0003',
        bits: 16,
        providerRequestId: 'provider-test-id',
        source: 'Australian National University QRNG',
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

  it('preserves paradox wording and leaves clarification, assumptions, and claim classification to the user', () => {
    const original = 'If an omnipotent being creates a stone...\nCan it be lifted?';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Theological paradox' }));
    fireEvent.change(screen.getByLabelText('Your paradox, in your own words'), { target: { value: original } });
    fireEvent.click(screen.getByRole('button', { name: 'Preserve and explore' }));

    expect(document.querySelector('.original-wording pre').textContent).toBe(original);
    expect(screen.getByText(/Clarifying question:/)).toBeTruthy();
    expect(screen.getByText(/not an automated interpretation/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('How would you classify the claim?'), {
      target: { value: 'philosophical' }
    });
    fireEvent.change(screen.getByLabelText('Assumptions you want to examine'), {
      target: { value: 'The terms are being used consistently.' }
    });
    fireEvent.change(screen.getByLabelText('Propositions in your wording'), {
      target: { value: 'The claim concerns a possible action.' }
    });
    expect(screen.getByLabelText('How would you classify the claim?').value).toBe('philosophical');
    expect(screen.getByLabelText('Assumptions you want to examine').value).toContain('consistently');
    expect(screen.getByLabelText('Propositions in your wording').value).toContain('possible action');

    fireEvent.change(screen.getByLabelText('Numeric expression'), { target: { value: '1/3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate exact conversions' }));
    expect(screen.getByText('0.(3)')).toBeTruthy();
    expect(screen.getByText(/do not establish the truth of philosophical or theological claims/)).toBeTruthy();
  });

  it('does not enable QRNG generation when the real provider is unconfigured', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Quantum entropy' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Request quantum bits' }).disabled).toBe(true);
    });
    expect(screen.getByText(/server has no ANU QRNG credential configured/)).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/qrng', expect.anything());
  });

  it('displays and converts a validated QRNG API response', async () => {
    qrngConfigured = true;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Quantum entropy' }));
    await waitFor(() => expect(screen.getByText('Provider configured')).toBeTruthy());
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
});
