import { navigate } from "../../shared/navigation";
import { ScrollArea } from "../../shared/ScrollArea";
import type { CurrentUser } from "../../shared/types";
import { DeveloperHero } from "./components/DeveloperHero";
import { GuideRail } from "./components/GuideRail";
import { PromptPanel } from "./components/PromptPanel";
import { ToolsPanel } from "./components/ToolsPanel";
import { useSubmissionPrompt } from "./model/useSubmissionPrompt";

export function DevelopersPage({ user }: { user: CurrentUser }) {
  const submission = useSubmissionPrompt();
  return (
    <main className="app-shell developer-page">
      <header className="topbar desktop-topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <nav>
          <button className="ghost-button" type="button" onClick={() => navigate("/templates")}>
            Templates
          </button>
          <span className="template-user">{user.name}</span>
        </nav>
      </header>
      <ScrollArea className="developer-page__scroll" ariaLabel="Game developer guide">
        <div className="developer-page__content">
          <DeveloperHero
            promptReady={Boolean(submission.prompt)}
            copied={submission.copied}
            onCopy={() => void submission.copyPrompt()}
          />
          <GuideRail />
          <div className="developer-grid">
            <PromptPanel
              prompt={submission.prompt}
              error={submission.promptError}
              copied={submission.copied}
              onCopy={() => void submission.copyPrompt()}
            />
            <ToolsPanel />
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
