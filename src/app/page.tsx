import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-6xl font-bold mb-4">
          <span className="text-foreground">Apex</span>
          <span className="text-primary">Data</span>
        </h1>
        <p className="text-2xl text-muted-foreground mb-8">
          Formula 1 Data Platform
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">Coming Soon</Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </div>
    </main>
  );
}
