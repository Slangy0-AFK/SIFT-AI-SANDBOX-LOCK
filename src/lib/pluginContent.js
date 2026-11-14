// The plug-in's own words, in one place: the page and the delivered zip both read
// these, so the file a customer keeps can never disagree with the screen it came from.

export const PLUGIN_SETUP_STEPS = [
  'Copy the file into your product, next to the code that calls your model.',
  'Set SIFT_LICENSE_KEY to your SIFT AI license key. Your own copy of it is on your license page.',
  'Call the guard before your model sees a message, and around every tool your model asks for. Both files show this at the top.',
  'Tell it which tools your product is allowed to run, and with which arguments, so the tool gate has something to check against.',
  'When filesystem access is unavailable, supply a synchronous JavaScript sink that persists each audit entry and returns true only after success.',
  'Test it in a test environment first, with the checklist below, before it goes anywhere near real traffic.'
];

export const PLUGIN_ENV_READS = [
  ['SIFT_LICENSE_KEY', 'Your SIFT AI license key.'],
  ['SIFT_MODEL_NAME', 'The ONE model or product this key is for. The key locks to it on first use.'],
  ['SIFT_DEPLOYMENT_ID', 'The deployment or domain it runs on. Not a person\u2019s details, just where the model lives.'],
  ['SIFT_VALIDATE_URL', 'Optional HTTPS validation endpoint. Failed validation blocks guarded actions.'],
  ['SIFT_CACHE_SECONDS', 'Optional validation cache duration from 0 to 600 seconds.'],
  ['SIFT_KILL_SWITCH', 'Optional. On, or unreadable, stops everything before anything else runs.'],
  ['SIFT_AUDIT_LOG', 'Optional. Audit file path when filesystem access is available. Defaults to ./sift-guard-audit.log.']
];

export const PLUGIN_TESTS = [
  {
    title: 'A normal question passes',
    text: 'It goes through to your model as usual, and the audit log gets one entry with the category none.'
  },
  {
    title: 'A direct override is refused',
    text: 'Something like "ignore all previous instructions": you get one short refusal, your model is never called, and the log entry carries the category only, never the message.'
  },
  {
    title: 'Content pasted in from elsewhere is refused',
    text: 'An instruction hidden inside a document, a quote or a pasted block is refused as pasted_instruction, and the log says nothing more than that.'
  },
  {
    title: 'The same key on a second model',
    text: 'It is refused with one plain line, "This key is already locked to another model." Guarded actions on the second model are blocked and the key is flagged for the SIFT AI team.'
  },
  {
    title: 'The switches and the ceiling',
    text: 'Turn SIFT_KILL_SWITCH on and check that nothing runs and the log records the stop. Let a loop run past the step ceiling and check that it stops, logs why, and does not restart itself.'
  }
];