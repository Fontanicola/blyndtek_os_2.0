type SistemaEnVivoProps = {
  urlSistema: string;
};
import { ArrowUpRightIcon } from "@/components/ui/icons";

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SistemaEnVivo({ urlSistema }: SistemaEnVivoProps) {
  const domain = extractDomain(urlSistema);

  return (
    <div className="overflow-hidden rounded-card border border-line-soft bg-white transition-colors duration-fast ease-fast hover:bg-paper">
      <a href={urlSistema} target="_blank" rel="noreferrer noopener" className="block">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-label uppercase tracking-[0.16em] text-graphite">Sistema en vivo</p>
              <h2 className="mt-1 text-xl font-title text-carbon">Abrir sistema</h2>
              <p className="mt-2 text-sm text-graphite">{domain}</p>
            </div>

            <span className="text-signal" aria-hidden="true">
              <ArrowUpRightIcon />
            </span>
          </div>

          <p className="mt-4 text-sm font-label text-signal">Abrir sistema →</p>
        </div>
      </a>
    </div>
  );
}
