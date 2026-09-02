import type { CurrentUser } from "../../shared/types";
import { ScrollableAppPage } from "../../shared/ui/ScrollableAppPage";
import { DeveloperHero } from "./components/DeveloperHero";
import { GuideRail } from "./components/GuideRail";
import { PromptPanel } from "./components/PromptPanel";
import { ToolsPanel } from "./components/ToolsPanel";
import { useSubmissionPrompt } from "./model/useSubmissionPrompt";

export function DevelopersPage({ user }: { user: CurrentUser }) {
  const submission = useSubmissionPrompt();
  return (
    <ScrollableAppPage
      className="developer-page"
      scrollClassName="developer-page__scroll"
      contentClassName="developer-page__content"
      ariaLabel="Game developer guide"
      topbarActions={[{ label: "Templates", href: "/templates" }]}
      topbarEnd={<span className="topbar-user">{user.name}</span>}
    >
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
    </ScrollableAppPage>
  );
}
