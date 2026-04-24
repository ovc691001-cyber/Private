import type { RoundAsset } from "@/app/page";
import { NeonChart } from "./NeonChart";

type Props = {
  asset: RoundAsset;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  emphasis?: "lime" | "purple" | "cyan" | "red";
};

export function AssetCard({ asset, selected, disabled, onSelect, emphasis = "lime" }: Props) {
  return (
    <button type="button" className={`asset-card upliks-card ${selected ? "selected" : ""}`} disabled={disabled} onClick={onSelect}>
      <div className="asset-card-top">
        <div className={`asset-icon ${asset.iconToken}`}>
          <span>{asset.name.slice(0, 1)}</span>
        </div>
        <div className="asset-copy">
          <strong>{asset.name}</strong>
          <span>{asset.sector}</span>
        </div>
      </div>

      <div className="asset-graph-shell">
        <NeonChart points={asset.chartData} tone={emphasis} compact />
      </div>

      <div className="asset-meta">
        <span>{asset.volatilityLabel}</span>
        <div className="volatility-dots" aria-label={`Волатильность ${asset.volatilityScore} из 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={`${asset.id}-${index}`} className={index < asset.volatilityScore ? `on tone-${emphasis}` : ""} />
          ))}
        </div>
      </div>

      <p className="asset-description">{asset.description}</p>
      {asset.hint ? <p className="asset-hint">{asset.hint}</p> : null}
    </button>
  );
}
