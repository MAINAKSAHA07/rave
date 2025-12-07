'use client';

import BounceCards from './BounceCards';

type EventImagesProps = {
  images: string[];
  title: string;
  subtitle: string;
};

export function EventImages({ images, title, subtitle }: EventImagesProps) {
  if (!images || images.length === 0) return null;

  const cover = images[0];
  const gallery = images.slice(1);

  const transformStyles = [
    'rotate(8deg) translateX(-60px)',
    'rotate(4deg) translateX(-30px)',
    'rotate(0deg) translateX(0px)',
    'rotate(-4deg) translateX(30px)',
    'rotate(-8deg) translateX(60px)',
  ];

  return (
    <section className="px-4 pt-4 space-y-3">
      {/* COVER IMAGE – like the HighApe ref */}
      <div className="relative rounded-3xl overflow-hidden bg-black/40">
        <img
          src={cover}
          alt={title}
          className="h-[260px] w-full object-cover"
        />
        {/* gradient for text readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {/* text overlay */}
        <div className="absolute inset-x-4 bottom-4 space-y-1">
          <h1 className="text-xl font-semibold text-white drop-shadow-md">
            {title}
          </h1>
          <p className="text-xs text-white/80 drop-shadow">
            {subtitle}
          </p>
        </div>
      </div>

      {/* GALLERY – rest of images using BounceCards */}
      {gallery.length > 0 && (
        <div className="flex justify-center py-4">
          <BounceCards
            className="custom-bounceCards"
            images={gallery}
            containerWidth={380}
            containerHeight={180}
            animationDelay={0.3}
            animationStagger={0.1}
            easeType="cubic-bezier(0.68, -0.55, 0.265, 1.55)"
            transformStyles={transformStyles.slice(0, gallery.length)}
            enableHover={true}
          />
        </div>
      )}
    </section>
  );
}

