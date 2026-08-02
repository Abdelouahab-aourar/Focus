import "./App.css";
import { Button } from "@/components/ui/button";

function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
        <section className="w-full rounded-4px border border-border/60 bg-card/80 p-8 shadow-xl shadow-black/5 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Tauri starter
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
                Tailwind and shadcn/ui are ready.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                This Tauri app now includes the Tailwind CSS pipeline, shadcn-style theme tokens,
                and a Button component wired through the local alias.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
