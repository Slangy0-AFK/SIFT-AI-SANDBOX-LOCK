import { useEffect, useMemo, useState } from 'react';
import { BASES, BaseInputError, convertToAllBases } from './math/baseEngine.js';
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

function ParadoxExplorer() {
  const [draft, setDraft] = useState('');
  const [submission, setSubmission] = useState(null);
  const [claimKind, setClaimKind] = useState('mixed');
  const [clarification, setClarification] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [propositions, setPropositions] = useState('');
  const [mathInput, setMathInput] = useState('');
  const [mathBase, setMathBase] = useState(10);
  const [mathResult, setMathResult] = useState(null);
  const [mathError, setMathError] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  const submitParadox = (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      setSubmissionError('Write the paradox in your own words before submitting.');
      return;
    }
    setSubmissionError('');
    setSubmission({ original: draft, submittedAt: new Date().toISOString() });
    setMathResult(null);
  };

  const exploreMath = (event) => {
    event.preventDefault();
    setMathError('');
    try {
      setMathResult(convertToAllBases(mathInput, mathBase));
    } catch (caught) {
      setMathResult(null);
      setMathError(caught instanceof BaseInputError ? caught.message : 'The calculation could not be completed.');
    }
  };

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
            Clarifying question: which terms or conditions should be understood in
            your intended sense? If the meaning is not ambiguous, you can say so.
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
              <span>Assumptions you want to examine</span>
              <textarea value={assumptions} onChange={(event) => setAssumptions(event.target.value)} rows={4} />
            </label>
            <label className="field">
              <span>Propositions in your wording</span>
              <textarea value={propositions} onChange={(event) => setPropositions(event.target.value)} rows={4} />
            </label>
          </div>
          <p className="subtle">
            These are your classifications and notes, not an automated interpretation.
            Mathematical, philosophical, and theological claims are kept distinct at your direction.
          </p>

          <form className="stack-form math-question" onSubmit={exploreMath}>
            <h3>Explore a numeric relationship</h3>
            <p>
              Enter one exact rational number or finite base expression that you
              want to examine. This calculator does not translate the rest of the
              paradox into mathematics.
            </p>
            <div className="converter-form">
              <label className="field input-field">
                <span>Numeric expression</span>
                <input value={mathInput} onChange={(event) => setMathInput(event.target.value)} maxLength={10000} />
              </label>
              <BasePicker value={mathBase} onChange={setMathBase} label="Expression base" />
              <button className="button secondary-button" type="submit">Calculate exact conversions</button>
            </div>
            {mathError && <p className="error-message" role="alert">{mathError}</p>}
            {mathResult && <ConversionCards conversions={mathResult.conversions} />}
          </form>
        </div>
      )}
    </section>
  );
}

function QuantumPanel() {
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
            ? 'LfD QRNG endpoint is configured; live connectivity is checked when entropy is requested.'
            : 'Quantum entropy is unavailable: the provider endpoint is not configured.'
        });
      })
      .catch(() => {
        if (active) setProviderStatus({
          state: 'unavailable',
          message: 'Quantum entropy is unavailable: the application API could not be reached.'
        });
      });
    return () => { active = false; };
  }, []);

  const generate = async (event) => {
    event.preventDefault();
    setError('');
    setSample(null);
    setLoading(true);
    try {
      const response = await fetch('/api/qrng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bits })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Quantum entropy request failed.');
      if (data.bits !== bits) {
        throw new Error('The provider response failed local validation. No sample was accepted.');
      }
      const bitString = entropyHexToBitString(data.entropyHex, bits);
      setSample({ ...data, bitString });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Quantum entropy request failed.');
      setProviderStatus((previous) => ({
        ...previous,
        message: 'The provider could not supply a validated sample. No pseudorandom fallback was used.'
      }));
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

export default function App() {
  const [activeTab, setActiveTab] = useState('convert');
  const [apiStatus, setApiStatus] = useState('checking');

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
          ['paradox', 'Theological paradox'],
          ['qrng', 'Quantum entropy']
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

      {activeTab === 'convert' && <Converter />}
      {activeTab === 'paradox' && <ParadoxExplorer />}
      {activeTab === 'qrng' && <QuantumPanel />}

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
