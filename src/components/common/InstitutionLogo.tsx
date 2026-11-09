import React, { useEffect, useState } from 'react';
import type { AssetInstitution } from '../../utils/institutions';

export const extractDomain = (rawUrl?: string | null): string => {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const urlObj = new URL(withProtocol);
    return urlObj.hostname.replace(/^www\./i, '');
  } catch {
    return trimmed
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
      .split('/')[0]
      .trim();
  }
};

export const buildAutoLogoUrl = (website?: string | null): string => {
  const domain = extractDomain(website);
  return domain ? `https://icon.horse/icon/${domain}` : '';
};

export const InstitutionLogo: React.FC<{
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  sizeClass?: string;
  fallbackIcon?: string;
}> = ({ name, logoUrl, websiteUrl, fallbackIcon, sizeClass = 'w-8 h-8' }) => {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  const domain = extractDomain(websiteUrl);
  const googleFallback = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : '';

  const src = !failedPrimary && logoUrl ? logoUrl : !failedFallback && googleFallback ? googleFallback : '';

  useEffect(() => {
    setFailedPrimary(false);
    setFailedFallback(false);
  }, [logoUrl, websiteUrl]);

  if (!src) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground shrink-0 font-bold text-xs`}
        title={name}
      >
        {fallbackIcon || !name ? <i className={(fallbackIcon || 'ri-bank-line') + ' text-sm'} aria-hidden="true" /> : name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-white p-0.5 border border-border/80 flex items-center justify-center overflow-hidden shrink-0 shadow-xs`}
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        className="w-full h-full object-contain"
        onError={() => {
          if (!failedPrimary && logoUrl) {
            setFailedPrimary(true);
          } else {
            setFailedFallback(true);
          }
        }}
      />
    </div>
  );
};

export function AssetInstitutionLogo({ institution, name, sizeClass }: {
  institution?: AssetInstitution | null;
  name?: string;
  sizeClass?: string;
}) {
  return <InstitutionLogo name={institution?.name || name || ''} logoUrl={institution?.logo_url}
    websiteUrl={institution?.website_url} sizeClass={sizeClass} />;
}
