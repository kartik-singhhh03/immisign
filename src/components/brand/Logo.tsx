import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { APP_TAGLINE } from '@/lib/brand';

type LogoVariant = 'dark' | 'light';

type LogoProps = {
  className?: string;
  href?: string;
  width?: number;
  priority?: boolean;
  variant?: LogoVariant;
  showTagline?: boolean;
  /** Use PNG logo image instead of CSS wordmark */
  useImage?: boolean;
  imageClassName?: string;
  /** Crop embedded tagline from PNG (navbar) */
  clipTagline?: boolean;
};

const LOGO_SRC = '/logos/immimate-logo.png';
const LOGO_LIGHT_SRC = '/logos/immimate-white.png';

function LogoWordmark({
  className,
  showTagline,
  inverted = false,
}: {
  className?: string;
  showTagline?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn('inline-flex flex-col', className)}>
      <span className="inline-flex items-baseline font-sans text-[1.35rem] font-semibold italic leading-none tracking-tight">
        <span className={inverted ? 'text-white/80' : 'text-mate-muted'}>immi</span>
        <span
          className={cn(
            'ml-0.5 skew-x-[-8deg] px-1.5 py-0.5 text-[1.35rem] font-semibold not-italic',
            inverted ? 'bg-white text-mate-primary' : 'bg-mate-primary text-white',
          )}
        >
          mate
        </span>
      </span>
      {showTagline && (
        <span
          className={cn(
            'mt-1 self-end text-[9px] font-medium tracking-wide',
            inverted ? 'text-white/45' : 'text-mate-muted',
          )}
        >
          {APP_TAGLINE}
        </span>
      )}
    </div>
  );
}

export function Logo({
  className,
  href = '/',
  width = 148,
  priority = false,
  variant = 'dark',
  showTagline = false,
  useImage = false,
  imageClassName,
  clipTagline = false,
}: LogoProps) {
  const imageSrc = variant === 'light' ? LOGO_LIGHT_SRC : LOGO_SRC;

  const content = useImage ? (
    showTagline ? (
      <div className={cn('inline-flex flex-col', className)}>
        <Image
          src={imageSrc}
          alt="ImmiMate"
          width={width}
          height={Math.round(width * 0.32)}
          priority={priority}
          className={cn(
            'h-auto w-auto object-contain object-left',
            imageClassName ?? 'max-h-11',
          )}
        />
        <span
          className={cn(
            'mt-1.5 text-[9px] font-medium tracking-wide',
            variant === 'light' ? 'text-white/45' : 'text-mate-muted',
          )}
        >
          {APP_TAGLINE}
        </span>
      </div>
    ) : clipTagline ? (
      <div className={cn('h-11 overflow-hidden sm:h-12', className)}>
        <Image
          src={imageSrc}
          alt="ImmiMate"
          width={width}
          height={Math.round(width * 0.5)}
          priority={priority}
          className={cn(
            'w-auto object-left object-top',
            imageClassName ?? 'h-14 min-w-[180px]',
          )}
        />
      </div>
    ) : (
      <Image
        src={imageSrc}
        alt="ImmiMate"
        width={width}
        height={Math.round(width * 0.36)}
        priority={priority}
        className={cn(
          'h-auto w-auto object-contain object-left',
          imageClassName ?? 'max-h-11',
          className,
        )}
      />
    )
  ) : variant === 'dark' ? (
    <LogoWordmark className={className} showTagline={showTagline} />
  ) : showTagline ? (
    <LogoWordmark className={className} showTagline inverted />
  ) : (
    <Image
      src={LOGO_LIGHT_SRC}
      alt="ImmiMate — Compliance Proof Your Practice"
      width={width}
      height={Math.round(width * 0.32)}
      priority={priority}
      className={cn('h-auto w-auto max-h-11 object-contain object-left', className)}
    />
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center transition-opacity hover:opacity-85">
      {content}
    </Link>
  );
}
