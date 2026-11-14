import { useCallback, useEffect, useMemo, useState } from 'react';
import { BASES, BaseInputError, compareRationalValues, convertToAllBases, parseBaseNumber } from './math/baseEngine.js';
import { entropyHexToBitString } from './math/entropy.js';
import { inspectBitSample } from './math/entropyStats.js';

const BASE_NAMES = {
  2: 'Binary',
  10: 'Decimal',
  12: 'Duodecimal',
  60: 'Sexagesimal'
};
const QRNG_BIT_OPTIONS = [8, 16, 32, 64, 256, 512, 1024, 4096, 8192];

function BasePicker({ value, onChange, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {BASES.map((base) => (
          <option value={base} key={base}>Base {base} · {BASE_NAMES[base]}</option>
        ))}
      </select>
    </label>
  );
}

function ConversionCards({ conversions }) {
  return (
    <div className="conversion-grid">
      {conversions.map((conversion) => (
        <article className="conversion-card" key={conversion.base}>
          <div className="card-heading">
            <div>
              <span className="eyebrow">BASE {conversion.base}</span>
              <h3>{BASE_NAMES[conversion.base]}</h3>
            </div>
            <span className={conversion.roundTripVerified ? 'verification verified' : 'verification'}>
              {conversion.roundTripVerified ? 'Round-trip verified' : 'Verification failed'}
            </span>
          </div>
          <p className="value-label">Exact value</p>
          <code className="number-value">{conversion.exactFraction}</code>
          <p className="value-label">Positional expansion</p>
          <code className="number-value">{conversion.expansion}</code>
          {!conversion.terminating && (
            <p className="subtle">
              {conversion.repeating
                ? 'Parentheses mark the repeating digit cycle.'
                : 'Expansion display limit reached; the exact fraction above is unchanged.'}
            </p>
          )}
          <details className="steps">
            <summary>Inspect conversion steps</summary>
            <p>
              Exact fractions are reduced using integer arithmetic. The positional
              expansion uses repeated division; no floating-point arithmetic is used.
            </p>
            {conversion.steps.integerDivision.length > 0 && (
              <>
                <h4>Integer division remainders</h4>
                <ol>
                  {conversion.steps.integerDivision.slice(0, 24).map((step, index) => (
                    <li key={`${step.dividend}-${index}`}>
                      {step.dividend} ÷ {conversion.base}: quotient {step.quotient},
                      remainder {step.remainder}
                    </li>
                  ))}
                </ol>
                {conversion.steps.integerDivision.length > 24 && <p>Remaining integer steps omitted from this view.</p>}
              </>
            )}
            {conversion.steps.fractionalDivision.length > 0 && (
              <>
                <h4>Fractional long division</h4>
                <ol>
                  {conversion.steps.fractionalDivision.slice(0, 24).map((step, index) => (
                    <li key={`${step.remainder}-${index}`}>
                      remainder {step.remainder} × {conversion.base} gives digit {step.digit};
                      next remainder {step.nextRemainder}
                    </li>
                  ))}
                </ol>
                {conversion.steps.fractionalDivision.length > 24 && <p>Remaining fractional steps omitted from this view.</p>}
              </>
            )}
          </details>
        </article>
      ))}
    </div>
  );
}

function Converter() {
  const [input, setInput] = useState('101010');
  const [sourceBase, setSourceBase] = useState(2);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    setError('');
    try {
      setResult(convertToAllBases(input, sourceBase));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof BaseInputError ? caught.message : 'The conversion could not be completed.');
    }
  };

  return (
    <section className="panel" aria-labelledby="converter-title">
      <div className="section-intro">
        <span className="eyebrow">EXACT ARITHMETIC</span>
        <h2 id="converter-title">Convert across four bases</h2>
        <p>
          Enter an integer, a finite radix fraction, or an exact fraction such as
          <code> 1/3</code>. Base 60 digits use bracketed pairs, for example
          <code> [01] [30]</code>.
        </p>
      </div>
      <form className="converter-form" onSubmit={submit}>
        <label className="field input-field">
          <span>Number to convert</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={10000}
            autoComplete="off"
            spellCheck="false"
            aria-describedby="base-input-help"
          />
          <small id="base-input-help">
            Base 12 uses 0–9, A, B. Base 60 uses digits [00] through [59].
            Use a slash for an exact fraction.
          </small>
        </label>
        <BasePicker value={sourceBase} onChange={setSourceBase} label="Input base" />
        <button className="button primary-button" type="submit">Convert exactly</button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      {result && (
        <div className="results">
          <p className="result-summary">
            {result.input} in base {result.sourceBase} is the exact rational
            <code> {result.rational.numerator}/{result.rational.denominator}</code>
            <span> (decimal integer pair, for internal verification).</span>
          </p>
          <ConversionCards conversions={result.conversions} />
        </div>
      )}
    </section>
  );
}

function ParadoxExplorer({ qrngSample }) {
  const [draft, setDraft] = useState('');
  const [submission, setSubmission] = useState(null);
  const [claimKind, setClaimKind] = useState('mixed');
  const [clarification, setClarification] = useState('');
  const [reformulation, setReformulation] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [propositions, setPropositions] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [leftValue, setLeftValue] = useState('');
  const [rightValue, setRightValue] = useState('');
  const [relation, setRelation] = useState('equal');
  const [mathBase, setMathBase] = useState(10);
  const [hypothesisResult, setHypothesisResult] = useState(null);
  const [hypothesisError, setHypothesisError] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  const submitParadox = (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      setSubmissionError('Write the paradox in your own words before submitting.');
      return;
    }
    setSubmissionError('');
    setSubmission({ original: draft, submittedAt: new Date().toISOString() });
  };

  const testHypothesis = (event) => {
    event.preventDefault();
    setHypothesisError('');
    setHypothesisResult(null);
    try {
      if (!hypothesis.trim()) throw new BaseInputError('Write the mathematical hypothesis you want to test.');
      const left = parseBaseNumber(leftValue, mathBase);
      const right = parseBaseNumber(rightValue, mathBase);
      const comparison = compareRationalValues(left, right);
      const holds = relation === 'equal' ? comparison === 0
        : relation === 'less' ? comparison < 0
          : comparison > 0;
      setHypothesisResult({
        hypothesis,
        holds,
        relation,
        leftValue,
        rightValue,
        base: mathBase,
        leftConversions: convertToAllBases(leftValue, mathBase).conversions,
        rightConversions: convertToAllBases(rightValue, mathBase).conversions
      });
    } catch (caught) {
      setHypothesisError(caught instanceof BaseInputError ? caught.message : 'The calculation could not be completed.');
    }
  };

  const useQrngSample = () => {
    if (!qrngSample) return;
    setLeftValue(qrngSample.bitString);
    setMathBase(2);
  };

  const relationSymbols = { equal: '=', less: '<', greater: '>' };

  return (
    <section className="panel" aria-labelledby="paradox-title">
      <div className="section-intro">
        <span className="eyebrow">USER-LED EXPLORATION</span>
        <h2 id="paradox-title">What is your theological paradox?</h2>
        <p>
          Your wording stays in this browser. The app does not infer a belief,
          supply an answer, or treat a calculation as evidence for or against theology.
        </p>
      </div>
      <form className="stack-form" onSubmit={submitParadox}>
        <label className="field">
          <span>Your paradox, in your own words</span>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} maxLength={10000} />
        </label>
        {submissionError && <p className="error-message" role="alert">{submissionError}</p>}
        <button className="button primary-button" type="submit">Preserve and explore</button>
      </form>

      {submission && (
        <div className="exploration">
          <div className="original-wording">
            <span className="eyebrow">ORIGINAL WORDING · PRESERVED AS ENTERED</span>
            <pre>{submission.original}</pre>
          </div>

          <p className="clarifying-prompt">
            Clarifying question: which terms or conditions are ambiguous to you,
            and what do you intend them to mean? If none are ambiguous, note that.
          </p>
          <label className="field">
            <span>Your clarification (optional)</span>
            <textarea value={clarification} onChange={(event) => setClarification(event.target.value)} rows={3} />
          </label>
          <label className="field">
            <span>How would you classify the claim?</span>
            <select value={claimKind} onChange={(event) => setClaimKind(event.target.value)}>
              <option value="mathematical">Mathematical</option>
              <option value="philosophical">Philosophical</option>
              <option value="theological">Theological</option>
              <option value="mixed">Mixed or unsure</option>
            </select>
          </label>
          <div className="two-column-fields">
            <label className="field">
              <span>Assumptions you identify</span>
              <textarea value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={4} />
            </label>
            <label className="field">
              <span>Propositions you identify in your wording</span>
              <textarea value={propositions} onChange={(event) => setPropositions(event.target.value)} rows={4} />
            </label>
          </div>
          <label className="field">
            <span>Your reformulation (optional; original remains unchanged)</span>
            <textarea value={reformulation} onChange={(event) => setReformulation(event.target.value)} rows={3} />
          </label>
          <label className="field">
            <span>Testable mathematical hypothesis (your wording)</span>
            <input
              value={hypothesis}
              onChange={(event) => setHypothesis(event.target.value)}
              maxLength={2000}
              placeholder="For example: these two quantities have equal value"
            />
          </label>
          <p className="subtle">
            Assumptions, propositions, reformulations, and hypotheses are supplied by you;
            the app does not extract claims or assign beliefs. Mathematical output is
            kept separate from philosophical and theological interpretation.
          </p>

          <form className="stack-form math-question" onSubmit={testHypothesis}>
            <h3>Test a numeric relationship exactly</h3>
            <p>
              The comparison tests only these exact values in the selected base. It
              does not translate or validate the rest of the paradox.
            </p>
            <div className="converter-form">
              <label className="field input-field">
                <span>First exact value</span>
                <input value={leftValue} onChange={(event) => setLeftValue(event.target.value)} maxLength={10000} />
              </label>
              <label className="field">
                <span>Relationship</span>
                <select value={relation} onChange={(event) => setRelation(event.target.value)}>
                  <option value="equal">is equal to (=)</option>
                  <option value="less">is less than (&lt;)</option>
                  <option value="greater">is greater than (&gt;)</option>
                </select>
              </label>
              <label className="field input-field">
                <span>Second exact value</span>
                <input value={rightValue} onChange={(event) => setRightValue(event.target.value)} maxLength={10000} />
              </label>
              <BasePicker value={mathBase} onChange={setMathBase} label="Operand base" />
              <button className="button secondary-button" type="submit">Test exact hypothesis</button>
            </div>
            <div className="sample-handoff">
              <button className="button secondary-button" type="button" disabled={!qrngSample} onClick={useQrngSample}>
                Use latest QRNG sample as first value
              </button>
              <span>
                {qrngSample
                  ? `Available sample: ${qrngSample.bits} bits from ${qrngSample.source}.`
                  : 'No QRNG sample has been requested in this browser session.'}
              </span>
            </div>
            {hypothesisError && <p className="error-message" role="alert">{hypothesisError}</p>}
            {hypothesisResult && (
              <div className="hypothesis-result" role="status">
                <h4>Exact comparison</h4>
                <p><strong>Your hypothesis:</strong> {hypothesisResult.hypothesis}</p>
                <p>
                  {hypothesisResult.leftValue} {relationSymbols[hypothesisResult.relation]} {hypothesisResult.rightValue}
                  {' '}in base {hypothesisResult.base} is {hypothesisResult.holds ? 'true' : 'false'}
                  {' '}for these numeric inputs.
                </p>
                <p className="subtle">
                  The entered values are interpreted using the selected base and exact rational syntax.
                  This result does not prove or disprove a philosophical or theological claim.
                </p>
                <details>
                  <summary>Compare both values in all four bases</summary>
                  <h4>First value</h4>
                  <ConversionCards conversions={hypothesisResult.leftConversions} />
                  <h4>Second value</h4>
                  <ConversionCards conversions={hypothesisResult.rightConversions} />
                </details>
              </div>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

const LFD_SOURCE = 'Laboratory for Digitalisation (LfD) QRNG';
const LFD_ENDPOINT = 'https://lfdr.de/qrng_api/qrng';

function validateQrngResponse(data, expectedBits) {
  if (
    !data ||
    typeof data !== 'object' ||
    data.bits !== expectedBits ||
    data.source !== LFD_SOURCE ||
    data.providerEndpoint !== LFD_ENDPOINT ||
    typeof data.requestId !== 'string' ||
    !data.requestId ||
    typeof data.retrievedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.retrievedAt)) ||
    (data.providerRequestId !== null && typeof data.providerRequestId !== 'string')
  ) {
    throw new Error('The provider response failed local provenance validation. No sample was accepted.');
  }
  return { ...data, bitString: entropyHexToBitString(data.entropyHex, expectedBits) };
}

function QuantumPanel({ onSample, providerConnection, onProviderConnection }) {
  const [bits, setBits] = useState(256);
  const [providerStatus, setProviderStatus] = useState({ state: 'checking', message: 'Checking provider configuration…' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sample, setSample] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/qrng/status')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'QRNG status could not be loaded.');
        return data;
      })
      .then((data) => {
        if (active) setProviderStatus({
          state: data.configured ? 'configured' : 'unavailable',
          message: data.configured
            ? 'LfD QRNG endpoint is configured; live connectivity is reported separately.'
            : 'The provider endpoint is not configured.'
        });
      })
      .catch(() => {
        if (active) setProviderStatus({
          state: 'unavailable',
          message: 'Quantum entropy source not connected. The application API could not be reached.'
        });
      });
    return () => { active = false; };
  }, []);

  const generate = async (event) => {
    event.preventDefault();
    setError('');
    setSample(null);
    onSample(null);
    onProviderConnection({ state: 'checking', message: 'Checking LfD QRNG connectivity…' });
    setLoading(true);
    try {
      const response = await fetch('/api/qrng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bits })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Quantum entropy request failed.');
      const validatedSample = validateQrngResponse(data, bits);
      setSample(validatedSample);
      onSample(validatedSample);
      onProviderConnection({
        state: 'connected',
        source: validatedSample.source,
        retrievedAt: validatedSample.retrievedAt,
        requestId: validatedSample.requestId
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Quantum entropy request failed.');
      onProviderConnection({
        state: 'unavailable',
        message: 'Quantum entropy source not connected. No pseudorandom fallback was used.'
      });
    } finally {
      setLoading(false);
    }
  };

  const conversions = useMemo(() => {
    if (!sample) return null;
    return convertToAllBases(sample.bitString, 2).conversions;
  }, [sample]);
  const diagnostics = sample ? inspectBitSample(sample.bitString) : null;

  return (
    <section className="panel" aria-labelledby="qrng-title">
      <div className="section-intro">
        <span className="eyebrow">QUANTUM ENTROPY · SERVER-SIDE PROVIDER</span>
        <h2 id="qrng-title">Generate a QRNG sample</h2>
        <p>
          Requests are made by the server to the Laboratory for Digitalisation QRNG.
          Its documentation identifies an ID Quantique QRNG PCIe as the entropy source.
        </p>
      </div>
      <div className={`status-banner status-${providerStatus.state}`} role="status">
        <strong>{providerStatus.state === 'configured' ? 'Provider configured' : 'Provider status'}</strong>
        <span>{providerStatus.message}</span>
      </div>
      <div className={`status-banner status-${providerConnection.state}`} role="status">
        <strong>Quantum entropy source</strong>
        <span>
          {providerConnection.state === 'connected'
            ? `Connected to ${providerConnection.source}; last verified ${providerConnection.retrievedAt}.`
            : providerConnection.message || 'Quantum entropy source not connected.'}
        </span>
      </div>
      <form className="converter-form qrng-form" onSubmit={generate}>
        <label className="field">
          <span>Amount of entropy</span>
          <select value={bits} onChange={(event) => setBits(Number(event.target.value))}>
            {QRNG_BIT_OPTIONS.map((amount) => <option value={amount} key={amount}>{amount} bits</option>)}
          </select>
        </label>
        <button className="button primary-button" type="submit" disabled={loading || providerStatus.state !== 'configured'}>
          {loading ? 'Requesting entropy…' : 'Request quantum bits'}
        </button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      {sample && conversions && diagnostics && (
        <div className="results">
          <div className="sample-provenance">
            <span className="eyebrow">PROVENANCE</span>
            <dl>
              <div><dt>Source</dt><dd>{sample.source}</dd></div>
              <div><dt>Retrieved</dt><dd>{sample.retrievedAt}</dd></div>
              <div><dt>Request ID</dt><dd><code>{sample.requestId}</code> (generated by this server)</dd></div>
              <div><dt>Provider request ID</dt><dd>{sample.providerRequestId || 'Not supplied by provider'}</dd></div>
              <div><dt>Provider sample size</dt><dd>{sample.bits} bits</dd></div>
            </dl>
          </div>
          <p className="value-label">Returned bits</p>
          <code className="number-value bit-output">{sample.bitString}</code>
          <p className="value-label">Descriptive sample diagnostics</p>
          <p>{diagnostics.ones} ones · {diagnostics.zeros} zeros · {diagnostics.runs} runs in {diagnostics.length} bits</p>
          <ul className="diagnostic-list">
            <li>Monobit frequency: {diagnostics.monobit.status}{diagnostics.monobit.pValue === null ? '' : ` (p=${diagnostics.monobit.pValue.toFixed(4)})`}</li>
            <li>Runs test: {diagnostics.runsTest.status}{diagnostics.runsTest.pValue === null ? '' : ` (p=${diagnostics.runsTest.pValue.toFixed(4)})`}</li>
          </ul>
          <p className="subtle">
            These are basic NIST SP 800-22-style screening tests at a 0.01 threshold.
            Short samples are not tested. Statistical tests cannot prove that a source
            is quantum or establish that a provider is trustworthy.
          </p>
          <ConversionCards conversions={conversions} />
        </div>
      )}
      <p className="source-note">
        Provider: <a href="https://lfdr.de/QRNG/" target="_blank" rel="noreferrer">
          LfD QRNG API documentation
        </a>. If the provider is unavailable or returns malformed
        data, this feature reports an error and does not substitute other randomness.
      </p>
    </section>
  );
}

function SystemStatus({ active, providerConnection, setProviderConnection }) {
  const [apiState, setApiState] = useState('checking');
  const [providerConfigured, setProviderConfigured] = useState('checking');
  const [refreshing, setRefreshing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [healthResult, providerResult] = await Promise.allSettled([
      fetch('/health').then(async (response) => {
        if (!response.ok) throw new Error('API health check failed.');
        return response.json();
      }),
      fetch('/api/qrng/status').then(async (response) => {
        if (!response.ok) throw new Error('QRNG configuration status check failed.');
        return response.json();
      })
    ]);

    setApiState(healthResult.status === 'fulfilled' && healthResult.value.status === 'ok' ? 'online' : 'unavailable');
    setProviderConfigured(
      providerResult.status === 'fulfilled' && providerResult.value.configured ? 'configured' : 'unavailable'
    );
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const probeProvider = async () => {
    setProbing(true);
    setProbeError('');
    setProviderConnection({ state: 'checking', message: 'Checking LfD QRNG connectivity…' });
    try {
      const response = await fetch('/api/qrng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bits: 8 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'QRNG connectivity check failed.');
      const sample = validateQrngResponse(data, 8);
      setProviderConnection({
        state: 'connected',
        source: sample.source,
        retrievedAt: sample.retrievedAt,
        requestId: sample.requestId
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'QRNG connectivity check failed.';
      setProbeError(message);
      setProviderConnection({
        state: 'unavailable',
        message: 'Quantum entropy source not connected. No pseudorandom fallback was used.'
      });
    } finally {
      setProbing(false);
    }
  };

  const connectionMessage = providerConnection.state === 'connected'
    ? `Connected to ${providerConnection.source}; last verified ${providerConnection.retrievedAt}.`
    : providerConnection.message || 'Quantum entropy source not connected.';

  return (
    <section className="panel" aria-labelledby="status-title">
      <div className="section-intro">
        <span className="eyebrow">LIVE CHECKS · HONEST STATUS</span>
        <h2 id="status-title">System status &amp; test results</h2>
        <p>These checks report the current app instance. A passing health check is not a security certification.</p>
      </div>
      <div className="status-grid">
        <article className="status-card">
          <span className="eyebrow">APPLICATION API</span>
          <strong>{apiState === 'online' ? 'Online' : apiState === 'checking' ? 'Checking' : 'Unavailable'}</strong>
          <span>{apiState === 'online' ? 'The /health endpoint returned a healthy status.' : 'The API health endpoint has not reported healthy.'}</span>
        </article>
        <article className="status-card">
          <span className="eyebrow">QRNG API CONFIGURATION</span>
          <strong>{providerConfigured === 'configured' ? 'Configured' : providerConfigured === 'checking' ? 'Checking' : 'Unavailable'}</strong>
          <span>Configuration does not verify that the external entropy provider is reachable.</span>
        </article>
      </div>
      <div className={`status-banner status-${providerConnection.state}`} role="status">
        <strong>Quantum entropy source</strong>
        <span>{connectionMessage}</span>
      </div>
      <div className="status-actions">
        <button className="button secondary-button" type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh service status'}
        </button>
        <button className="button primary-button" type="button" onClick={probeProvider} disabled={probing}>
          {probing ? 'Checking QRNG…' : 'Check live QRNG (consume 8 bits)'}
        </button>
      </div>
      <p className="subtle">
        The QRNG check makes a real provider request and discards the returned 8 bits.
        It uses the same server-side rate limit as sample generation.
      </p>
      {probeError && <p className="error-message" role="alert">{probeError}</p>}

      <div className="test-results-card">
        <h3>Automated test results</h3>
        <p>
          Repository CI results are separate from this deployment’s live service status.
          Tests must be run against the current revision before release.
        </p>
        <ul>
          <li><a href="https://github.com/dougleslie00-afk/siftai/actions" target="_blank" rel="noreferrer">View repository CI runs</a></li>
          <li><a href="https://github.com/dougleslie00-afk/siftai/blob/main/TEST_REPORT.md" target="_blank" rel="noreferrer">Read the recorded test report</a></li>
        </ul>
      </div>
    </section>
  );
}

function SecuritySandbox() {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    setPreview(input);
  };

  return (
    <section className="panel" aria-labelledby="sandbox-title">
      <div className="section-intro">
        <span className="eyebrow">INERT INPUT SANDBOX · NO CODE EXECUTION</span>
        <h2 id="sandbox-title">Security sandbox</h2>
        <p>
          This is a safe text preview only. It does not execute user input, scan devices,
          test a network, or establish that your system is secure.
        </p>
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label className="field">
          <span>Text to preview (kept in this browser)</span>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={6} maxLength={10000} />
        </label>
        <button className="button primary-button" type="submit">Render as inert text</button>
      </form>
      {preview !== null && (
        <div className="sandbox-preview" role="status">
          <h3>Inert text preview</h3>
          <pre>{preview || '(empty input)'}</pre>
        </div>
      )}
      <ul className="security-boundaries">
        <li>No arbitrary code execution or prompt-driven tool access.</li>
        <li>Preview output is rendered as text, not interpreted as HTML.</li>
        <li>The app makes no device-scanning or threat-detection claims.</li>
      </ul>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('convert');
  const [apiStatus, setApiStatus] = useState('checking');
  const [qrngSample, setQrngSample] = useState(null);
  const [providerConnection, setProviderConnection] = useState({
    state: 'not-connected',
    message: 'Quantum entropy source not connected.'
  });

  useEffect(() => {
    let active = true;
    fetch('/health')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable');
        return response.json();
      })
      .then((health) => {
        if (active) setApiStatus(health.status === 'ok' ? 'online' : 'unavailable');
      })
      .catch(() => { if (active) setApiStatus('unavailable'); });
    return () => { active = false; };
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Mathematical and QRNG Lab home">
          <span className="brand-mark">∑</span>
          <span><strong>Exact Number Lab</strong><small>Mathematics · Meaning · Entropy</small></span>
        </a>
        <div className={`api-indicator api-${apiStatus}`} role="status">
          <span className="status-dot" /> API {apiStatus}
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">BASE 2 · BASE 10 · BASE 12 · BASE 60</span>
        <h1>Explore numbers without losing precision.</h1>
        <p>
          Exact conversions and user-led reflection in a browser. Quantum entropy
          is a separate, explicitly sourced service—not a substitute for mathematics.
        </p>
      </section>

      <nav className="tab-list" aria-label="Application sections">
        {[
          ['convert', 'Base converter'],
          ['paradox', 'Paradox Lab'],
          ['qrng', 'QRNG'],
          ['sandbox', 'Security Sandbox'],
          ['status', 'System Status & Test Results']
        ].map(([tab, label]) => (
          <button
            className={activeTab === tab ? 'tab active-tab' : 'tab'}
            type="button"
            key={tab}
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div hidden={activeTab !== 'convert'}><Converter /></div>
      <div hidden={activeTab !== 'paradox'}><ParadoxExplorer qrngSample={qrngSample} /></div>
      <div hidden={activeTab !== 'qrng'}>
        <QuantumPanel
          onSample={setQrngSample}
          providerConnection={providerConnection}
          onProviderConnection={setProviderConnection}
        />
      </div>
      <div hidden={activeTab !== 'sandbox'}><SecuritySandbox /></div>
      <div hidden={activeTab !== 'status'}>
        <SystemStatus
          active={activeTab === 'status'}
          providerConnection={providerConnection}
          setProviderConnection={setProviderConnection}
        />
      </div>

      <footer className="app-footer">
        <p>
          Calculations are exact within the documented input limits. They do not
          establish the truth of philosophical or theological claims.
        </p>
        <span>Paradox text remains in browser memory and is not submitted to the API.</span>
      </footer>
    </main>
  );
}
