import LanguageToggle from "@/components/layout/LanguageToggle";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="onboarding-layout relative min-h-screen flex flex-col items-center justify-start bg-background text-foreground transition-colors duration-200 px-4 py-6 sm:py-8">
      {/* Top action bar: Theme Toggle first, then Language Toggle */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-6 bg-card/80 backdrop-blur-xl p-1.5 rounded-2xl border border-border shadow-md">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      {children}
    </div>
  );
}