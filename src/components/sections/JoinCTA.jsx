import { useMemo } from "react";
import Reveal from "../ui/Reveal";
import SmartLink from "../ui/SmartLink";
import Footer from "../Footer";
import { useSiteImages, useSiteSettings, buildJoinCopy, buildCommunityJoinCopy } from "../../lib/publicData";
import useIsMobile from "../../hooks/useIsMobile";
import useLittleAthletes from "../../lib/useLittleAthletes";

const CTA_BUTTON =
  "inline-flex items-center justify-center min-h-[52px] px-[27px] rounded-full text-[10.5px] font-bold tracking-[0.08em] uppercase text-white transition-all duration-300 hover:-translate-y-0.5";
const CTA_PRIMARY = `${CTA_BUTTON} btn-shine bg-gradient-to-r from-[#f45b18] to-[#ff7a1a] shadow-[0_14px_28px_rgba(247,107,28,0.22)]`;

// "Join the Movement" with the site footer underneath, as one continuous
// photo-backed band — the ending of the Home and Community pages (Layout
// decides which pages get it; every other page ends with the plain
// <Footer />). The photo is pinned to the viewport on desktop
// (`background-attachment: fixed`) while the content scrolls over it;
// phones fall back to a normal background, where fixed ones misbehave.
//
// `onPrimaryClick`, when given, replaces the first button's link with an
// action (the Community page uses it to open the sign-up panel).
// `community` swaps in the Community page's own wording for the band
// (Site Content -> Community) in place of the shared one.
// `play` adds the small "little athletes" button under the two buttons: a
// press sends a few figures once across the band (lib/useLittleAthletes.jsx).
export default function JoinCTA({ onPrimaryClick, community = false, play = false }) {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const isMobile = useIsMobile();
  const athletes = useLittleAthletes(images);
  const join = useMemo(() => (community ? buildCommunityJoinCopy(settings) : buildJoinCopy(settings)), [settings, community]);

  return (
    <section id="join-rtg" className="theme-night relative isolate overflow-hidden bg-[#21143c]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: `url(${images.homeCTA})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: isMobile ? "scroll" : "fixed",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(22,13,40,0.67)_0%,rgba(20,11,38,0.69)_50%,rgba(18,10,34,0.71)_100%)]" />

      <div className="relative flex items-center justify-center min-h-[485px] px-6 pt-[82px] pb-16">
        {play && athletes.field}
        <Reveal className="relative z-10 flex flex-col items-center max-w-[980px] text-center">
          <span className="mb-[15px] text-[10px] font-semibold leading-none tracking-[0.25em] uppercase text-[#ff7b2c]">{join.eyebrow}</span>
          <h2 className="font-display text-[clamp(3.75rem,6.65vw,7.875rem)] leading-[0.88] text-white">
            {join.title} <span className="text-gradient">{join.titleAccent}</span>
          </h2>
          <p className="mt-5 max-w-[760px] text-sm leading-[1.55] text-white/80">{join.subtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 mt-[30px]">
            {onPrimaryClick ? (
              <button type="button" onClick={onPrimaryClick} className={CTA_PRIMARY}>
                {join.primaryLabel}
              </button>
            ) : (
              <SmartLink to={join.primaryLink} className={CTA_PRIMARY}>
                {join.primaryLabel}
              </SmartLink>
            )}
            <SmartLink to={join.secondaryLink} className={`${CTA_BUTTON} border border-white/35 hover:bg-white/10`}>
              {join.secondaryLabel}
            </SmartLink>
          </div>
          {play && join.playLabel && (
            <button type="button" className="rtg-play-button" onClick={athletes.send}>
              <span aria-hidden="true">▸</span> {join.playLabel}
            </button>
          )}
        </Reveal>
      </div>

      <Footer variant="overlay" />
    </section>
  );
}
