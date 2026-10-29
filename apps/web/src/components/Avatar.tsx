import type { Talent } from "@/lib/api";

export default function Avatar({ talent, className = "" }: { talent: Talent; className?: string }) {
  const src = talent.photos[0];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={talent.displayName} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-600 ${className}`}>
      {talent.displayName.charAt(0)}
    </div>
  );
}
