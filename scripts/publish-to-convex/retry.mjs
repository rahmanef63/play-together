const DEFAULT_ATTEMPTS = 5;
const DEFAULT_DELAY_MS = 400;

export async function retryManifestFetch(
  operation,
  { attempts = DEFAULT_ATTEMPTS, delayMs = DEFAULT_DELAY_MS, sleep = wait } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!isManifestFetchFailure(error) || attempt === attempts) throw error;
      await sleep(delayMs * attempt);
    }
  }
  throw lastError;
}

export function isManifestFetchFailure(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    error.data.code === "MANIFEST_FETCH_FAILED"
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
