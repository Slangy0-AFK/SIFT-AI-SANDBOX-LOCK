export function getApiErrorMessage(error, fallback = 'Request failed') {
  if (typeof error !== 'object' || error === null) return fallback;

  if ('response' in error) {
    const response = error.response;
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data;
      if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
        return data.error;
      }
    }
  }

  if ('message' in error && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return fallback;
}
