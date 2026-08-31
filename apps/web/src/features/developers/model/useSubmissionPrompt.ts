import { useEffect, useState } from "react";

export function useSubmissionPrompt() {
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptError, setPromptError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/docs/submitting-games.prompt.txt", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Prompt document is unavailable");
        return response.text();
      })
      .then((text) => setPrompt(text.trim()))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setPromptError(true);
      });
    return () => controller.abort();
  }, []);
  const copyPrompt = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_700);
  };
  return { copied, copyPrompt, prompt, promptError };
}
