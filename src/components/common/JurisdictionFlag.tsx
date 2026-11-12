import React, { useState } from 'react';
import { formatJurisdiction } from '../../utils/countryJurisdiction';

export interface JurisdictionFlagProps {
  countryName?: string;
  className?: string;
}

export const JurisdictionFlag: React.FC<JurisdictionFlagProps> = ({
  countryName,
  className = 'w-4 h-2.5 rounded-xs object-cover inline-block shrink-0',
}) => {
  const jur = formatJurisdiction(countryName);
  const [imgError, setImgError] = useState(false);

  if (!jur.flagUrl || imgError) {
    return <span className="leading-none select-none text-xs">{jur.flag}</span>;
  }

  return (
    <img
      src={jur.flagUrl}
      alt={jur.name}
      className={className}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};
