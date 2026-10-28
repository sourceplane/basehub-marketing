import { ThemeProvider } from "next-themes";
import { Toolbar } from "basehub/next-toolbar";

import { BaseHubThemeProvider } from "@/context/basehub-theme-provider";
import { TooltipProvider } from "@/common/tooltip";
import { isBaseHubConnected } from "@/lib/basehub/connection";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider enableSystem attribute="class" defaultTheme="system">
      {/* BaseHub's toolbar (draft mode, live preview) needs the repository
          token; before BaseHub is connected there is nothing to preview. */}
      {isBaseHubConnected() ? <Toolbar /> : null}
      <BaseHubThemeProvider />
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
