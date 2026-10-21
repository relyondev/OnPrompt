import React from 'react';

/**
 * OnPromptLogo — Brand master SVG (conversation vector recreation).
 *
 * Preserved geometry per brand spec v1.0.0:
 *  - Blue/cyan gradient shell (speech-bubble + ears)
 *  - White rounded face counter
 *  - Two #006BFF circular eyes
 *  - Blue antenna stem
 *  - Yellow (#FFC800) circular antenna tip
 *  - Rounded lower-right speech tail
 *
 * Use `variant` to switch color modes:
 *  - "color"  (default): full brand gradient
 *  - "white":  all positive shapes white (for dark backgrounds)
 *
 * Clear space: at least (size * 26 / 256) px on every side.
 */

interface OnPromptLogoProps {
  /** CSS width/height in px; aspect ratio 1:1 is preserved */
  size?: number;
  /** Visual color variant: color (default), white (for dark backgrounds), navy, or black */
  variant?: 'color' | 'white' | 'navy' | 'black';
  /** Additional class names */
  className?: string;
  /** Aria role override; set to true when neighbouring text supplies the name */
  ariaHidden?: boolean;
}

// Each inline SVG instance needs unique IDs to avoid gradient & mask conflicts.
let _instanceId = 0;

const OnPromptLogo: React.FC<OnPromptLogoProps> = ({
  size = 40,
  variant = 'color',
  className = '',
  ariaHidden = false,
}) => {
  // Stable ref for this instance's IDs
  const [id] = React.useState(() => `op-logo-${++_instanceId}`);
  const gradId = `${id}-grad`;
  const maskId = `${id}-mask`;
  const titleId = `${id}-title`;

  // Monochrome variants (white, navy, black) with real mask face cutout & visible eyes
  if (variant === 'white' || variant === 'navy' || variant === 'black') {
    const fillColor =
      variant === 'white' ? '#FFFFFF' : variant === 'navy' ? '#0B1F44' : '#000000';

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        width={size}
        height={size}
        className={`op-logo-icon ${className}`}
        role={ariaHidden ? 'presentation' : 'img'}
        aria-hidden={ariaHidden || undefined}
        aria-labelledby={!ariaHidden ? titleId : undefined}
        style={{ flexShrink: 0 }}
      >
        {!ariaHidden && <title id={titleId}>On Prompt by Relyon Dev</title>}
        <defs>
          <mask id={maskId}>
            {/* Base transparent */}
            <rect width="256" height="256" fill="black" />
            {/* Outer positive shapes in white (reveal) */}
            <rect x="20" y="112" width="23" height="63" rx="11.5" fill="white" />
            <rect x="213" y="112" width="23" height="63" rx="11.5" fill="white" />
            <path
              d="M100 73H156C190 73 211 96 211 129V157C211 177 202 190 189 199V219C189 230 177 233 169 226L151 211H100C66 211 45 190 45 157V129C45 96 66 73 100 73Z"
              fill="white"
            />
            {/* Face counter cutout in black (conceal/transparent) */}
            <rect x="67" y="101" width="122" height="81" rx="39" fill="black" />
            {/* Eyes in white (reveal inside transparent face) */}
            <circle cx="104" cy="142" r="13" fill="white" />
            <circle cx="151" cy="142" r="13" fill="white" />
            {/* Antenna stem & tip in white (reveal) */}
            <path d="M119 54H137L142 82C144 103 112 103 114 82Z" fill="white" />
            <circle cx="128" cy="42" r="18" fill="white" />
          </mask>
        </defs>
        <rect width="256" height="256" fill={fillColor} mask={`url(#${maskId})`} />
      </svg>
    );
  }

  // Default: full color variant
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={`op-logo-icon ${className}`}
      role={ariaHidden ? 'presentation' : 'img'}
      aria-hidden={ariaHidden || undefined}
      aria-labelledby={!ariaHidden ? titleId : undefined}
      style={{ flexShrink: 0 }}
    >
      {!ariaHidden && <title id={titleId}>On Prompt by Relyon Dev</title>}
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#006BFF" />
          <stop offset="1" stopColor="#00D2FF" />
        </linearGradient>
      </defs>
      {/* Shell: ears + speech-bubble body */}
      <g fill={`url(#${gradId})`}>
        <rect x="20" y="112" width="23" height="63" rx="11.5" />
        <rect x="213" y="112" width="23" height="63" rx="11.5" />
        <path d="M100 73H156C190 73 211 96 211 129V157C211 177 202 190 189 199V219C189 230 177 233 169 226L151 211H100C66 211 45 190 45 157V129C45 96 66 73 100 73Z" />
      </g>
      {/* White face counter */}
      <rect x="67" y="101" width="122" height="81" rx="39" fill="#FFFFFF" />
      {/* Eyes + antenna stem */}
      <g fill="#006BFF">
        <circle cx="104" cy="142" r="13" />
        <circle cx="151" cy="142" r="13" />
        <path d="M119 54H137L142 82C144 103 112 103 114 82Z" />
      </g>
      {/* Antenna tip — Relyon Yellow accent */}
      <circle cx="128" cy="42" r="18" fill="#FFC800" />
    </svg>
  );
};

export default OnPromptLogo;
