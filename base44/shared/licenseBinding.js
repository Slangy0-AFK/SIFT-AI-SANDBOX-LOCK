function normalizeModel(value) {
  return String(value || '').trim().toLowerCase();
}

export function modelBindingMatches(issuedModel, requestedModel) {
  const issued = normalizeModel(issuedModel);
  return !issued || issued === normalizeModel(requestedModel);
}

export function createBindingUpdate(license, wanted, timestamp) {
  if (!modelBindingMatches(license.model_name, wanted.model)) return null;

  const update = {
    deployment_id: wanted.deployment,
    binding_locked_at: timestamp,
    activations: 1,
    activated_at: timestamp
  };
  if (!String(license.model_name || '').trim()) update.model_name = wanted.model;
  return update;
}
