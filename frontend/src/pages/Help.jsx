import HelpSection from "@/components/help/HelpSection"
import { HELP_SECTIONS } from "@/components/help/helpContent"

export default function Help() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <p className="mb-2 text-sm text-muted-foreground">
        Panduan singkat konsep dan cara kerja MINT RT OS. Klik judul untuk
        membuka atau menutup.
      </p>
      {HELP_SECTIONS.map((section, i) => (
        <HelpSection
          key={section.id}
          title={section.title}
          paragraphs={section.paragraphs}
          items={section.items}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  )
}