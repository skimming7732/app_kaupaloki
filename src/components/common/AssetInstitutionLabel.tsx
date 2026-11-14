import React from 'react';
import { AssetInstitutionLogo } from './InstitutionLogo';
import type { AssetInstitution } from '../../utils/institutions';

type Asset = {
  id: string;
  activo?: string;
  titular?: string;
  institucion?: string;
  wallet?: string;
  institution?: AssetInstitution | null;
};

export function resolveTransactionAsset(assets: Asset[], id?: string, historicalName?: string) {
  if (id) return assets.find(asset => asset.id === id);
  const name = historicalName?.trim().toLowerCase();
  return name ? assets.find(asset => [asset.activo, asset.titular, asset.wallet].some(value => value?.trim().toLowerCase() === name)) : undefined;
}

/** Display the linked institution; preserve the historical label for missing accounts. */
export function AssetInstitutionLabel({ assets, assetId, fallback }: { assets: Asset[]; assetId?: string; fallback?: string }) {
  const asset = resolveTransactionAsset(assets, assetId, fallback);
  const institution = asset?.institution?.name || asset?.institucion;
  const holder = asset?.titular || asset?.activo || fallback;
  const label = institution || holder || 'Sin registro';
  const detail = institution && holder && holder !== institution ? holder : undefined;
  return <span className="inline-flex max-w-[210px] items-center gap-2 align-middle" title={[label, detail].filter(Boolean).join(' · ')}>
    <AssetInstitutionLogo institution={asset?.institution} name={label} sizeClass="h-6 w-6" />
    <span className="min-w-0 text-left leading-tight">
      <span className="block truncate text-[11px] font-semibold text-foreground">{label}</span>
      {detail && <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{detail}</span>}
    </span>
  </span>;
}
