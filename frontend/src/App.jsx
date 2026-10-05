import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">MINT RT OS</h1>
      <p className="text-muted-foreground">
        Phase 8: React + Tailwind CSS + shadcn/ui sudah siap.
      </p>
      <div className="rounded-lg bg-emerald-600 px-4 py-2 text-white">
        Kotak hijau ini membuktikan Tailwind aktif
      </div>
      <Button>Tombol shadcn/ui</Button>
    </div>
  )
}

export default App