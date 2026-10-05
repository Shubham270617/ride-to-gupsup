import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

import Reveal from "../ui/Reveal";
import Button from "../ui/Button";

import { useSiteImages, useSiteSettings, pickText } from "../../lib/publicData";
import { brand } from "../../data/content";

import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  StravaIcon,
} from "../ui/SocialIcons";

/* =========================================================
   SOCIAL LINKS
   ========================================================= */

const socials = [
  {
    platform: "instagram",
    icon: InstagramIcon,
    ...brand.social.instagram,
  },
  {
    platform: "facebook",
    icon: FacebookIcon,
    ...brand.social.facebook,
  },
  {
    platform: "youtube",
    icon: YoutubeIcon,
    ...brand.social.youtube,
  },
  {
    platform: "strava",
    icon: StravaIcon,
    ...brand.social.strava,
  },
];

/* =========================================================
   CONTACT
   ========================================================= */

const CONTACT_CITY = "Delhi";

/* =========================================================
   FOOTER COLUMNS
   ========================================================= */

const cols = [
  {
    title: "Community",
    links: [
      {
        to: "/about",
        label: "About RTG",
      },
      {
        to: "/community",
        label: "Our Community",
      },
      {
        to: "/weekly-rides",
        label: "Weekly Rides",
      },
      {
        to: "/gallery",
        label: "Gallery",
      },
      {
        to: "/community",
        label: "Volunteer",
      },
    ],
  },

  {
    title: "Get Involved",
    links: [
      {
        to: "/events",
        label: "Events",
      },
      {
        to: "/challenges",
        label: "Challenges",
      },
      {
        to: "/race-calendar",
        label: "Race Calendar",
      },
      {
        to: "/race-results",
        label: "Race Results",
      },
      {
        to: "/leaderboard",
        label: "Leaderboard",
      },
      {
        to: "/sponsors",
        label: "Sponsor With RTG",
      },
      {
        to: "/contact",
        label: "Become Chapter Captain",
      },
    ],
  },

  {
    title: "More",
    links: [
      {
        to: "/merchandise",
        label: "Store",
      },
      {
        to: "/merchandise",
        label: "Kit",
      },
      {
        to: "/blog",
        label: "Resources",
      },
      {
        to: "/safety",
        label: "Safety",
      },
      {
        to: "/faq",
        label: "FAQ",
      },
      {
        to: "/contact",
        label: "Contact",
      },
      {
        to: "/contact",
        label: "Media",
      },
    ],
  },

  {
    title: "Legal",
    links: [
      {
        to: "/community-guidelines",
        label: "Community Guidelines",
      },
      {
        to: "/privacy",
        label: "Privacy Policy",
      },
      {
        to: "/terms",
        label: "Terms",
      },
    ],
  },
];

/* =========================================================
   JOIN CTA + FOOTER
   ========================================================= */

export default function JoinCTA({
  primaryLabel = "Join Community",
  primaryTo = "/community",
  onPrimaryClick,

  secondaryLabel = "Explore Events",
  secondaryTo = "/events",
}) {
  const images = useSiteImages();
  const settings = useSiteSettings();

  const t = (key, fallback) => {
    return pickText(settings, key, fallback);
  };

  return (
    <section
      className="
        theme-night
        relative
        isolate
        overflow-hidden
        bg-rtg-purple-950
      "
    >
      {/* =====================================================
          CONTINUOUS BACKGROUND IMAGE
          
          IMPORTANT:
          There is ONLY ONE background image for both:
          - Join CTA
          - Footer

          No scroll-linked y animation is used.
          ===================================================== */}

      <motion.div
        className="
          absolute
          inset-0
          z-0
          overflow-hidden
          pointer-events-none
        "
        initial={{
          scale: 1.08,
        }}
        whileInView={{
          scale: 1,
        }}
        viewport={{
          once: true,
          amount: 0.1,
        }}
        transition={{
          duration: 1.5,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* Background Image */}

        <img
          src={images.homeCTA}
          alt=""
          aria-hidden="true"
          className="
            absolute
            inset-0
            w-full
            h-full
            object-cover
            object-center
          "
        />

        {/* =================================================
            MAIN DARK OVERLAY

            This keeps the image visible but makes the
            white text readable.
            ================================================= */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-[rgba(27,17,48,0.82)]
            via-[rgba(27,17,48,0.89)]
            to-[rgba(27,17,48,0.97)]
          "
        />

        {/* =================================================
            EXTRA FOOTER DARKNESS

            Bottom part is intentionally darker like the
            reference screenshot.
            ================================================= */}

        <div
          className="
            absolute
            left-0
            right-0
            bottom-0
            h-[48%]
            bg-[rgba(27,17,48,0.18)]
          "
        />
      </motion.div>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <div className="relative z-10">
        {/* ===================================================
            JOIN CTA
            =================================================== */}

        <div
          className="
            min-h-[620px]
            md:min-h-[700px]
            flex
            items-center
            justify-center
            px-6
            md:px-10
            py-28
            md:py-40
          "
        >
          <div
            className="
              w-full
              max-w-4xl
              mx-auto
              text-center
            "
          >
            <Reveal>
              {/* Small heading */}

              <span
                className="
                  inline-block
                  text-rtg-orange-400
                  font-semibold
                  tracking-[0.2em]
                  uppercase
                  text-xs
                  md:text-sm
                  mb-5
                "
              >
                Your Next Chapter Starts Here
              </span>

              {/* Main heading */}

              <h2
                className="
                  font-display
                  text-5xl
                  md:text-8xl
                  leading-[0.92]
                  mb-6
                  text-rtg-white
                "
              >
                Join the{" "}
                <span className="text-gradient">
                  Movement
                </span>
              </h2>

              {/* Description */}

              <p
                className="
                  text-rtg-mist
                  text-base
                  md:text-xl
                  max-w-xl
                  mx-auto
                  mb-10
                "
              >
                500+ athletes across India are already
                riding, running, and growing together.
                Your seat at the chai stop is waiting.
              </p>

              {/* Buttons */}

              <div
                className="
                  flex
                  flex-col
                  sm:flex-row
                  items-center
                  justify-center
                  gap-4
                "
              >
                {/* Primary Button */}

                {onPrimaryClick ? (
                  <Button
                    onClick={onPrimaryClick}
                    size="lg"
                  >
                    {primaryLabel}
                  </Button>
                ) : (
                  <Button
                    to={primaryTo}
                    size="lg"
                  >
                    {primaryLabel}
                  </Button>
                )}

                {/* Secondary Button */}

                <Button
                  to={secondaryTo}
                  variant="outline"
                  size="lg"
                >
                  {secondaryLabel}
                </Button>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer
          className="
            relative
            px-6
            md:px-10
            pt-14
            pb-6
          "
        >
          <div className="max-w-7xl mx-auto">
            {/* ===============================================
                FOOTER MAIN GRID
                =============================================== */}

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                md:grid-cols-3
                xl:grid-cols-6
                gap-10
                mb-10
              "
            >
              {/* =============================================
                  BRAND / DESCRIPTION
                  ============================================= */}

              <div
                className="
                  sm:col-span-2
                  xl:col-span-2
                "
              >
                {/* Logo */}

                <img
                  src={images.logo}
                  alt={brand.name}
                  className="
                    h-9
                    w-auto
                    mb-3
                  "
                />

                {/* Description */}

                <p
                  className="
                    text-rtg-mist
                    text-sm
                    leading-relaxed
                    max-w-xs
                    mb-4
                  "
                >
                  {t(
                    "text.footer.description",
                    "India's endurance sports community for cycling, running, swimming, challenges, races, and unforgettable adventures."
                  )}
                </p>

                {/* Social icons */}

                <div className="flex gap-2.5">
                  {socials.map((social) => {
                    const Icon = social.icon;

                    return (
                      <a
                        key={social.platform}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          w-9
                          h-9
                          rounded-full
                          glass
                          flex
                          items-center
                          justify-center
                          text-rtg-white
                          hover:text-rtg-orange-400
                          hover:border-rtg-orange-400/60
                          transition-colors
                        "
                        aria-label={social.handle}
                      >
                        <Icon size={16} />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* =============================================
                  FOOTER LINK COLUMNS
                  ============================================= */}

              {cols.map((column) => (
                <div key={column.title}>
                  {/* Column title */}

                  <h4
                    className="
                      font-display
                      text-base
                      tracking-wide
                      mb-3
                      text-rtg-orange-400
                    "
                  >
                    {column.title}
                  </h4>

                  {/* Links */}

                  <ul className="space-y-2">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="
                            text-sm
                            text-rtg-mist
                            hover:text-rtg-white
                            transition-colors
                          "
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* =============================================
                  CONTACT
                  ============================================= */}

              <div>
                <h4
                  className="
                    font-display
                    text-base
                    tracking-wide
                    mb-3
                    text-rtg-orange-400
                  "
                >
                  Contact
                </h4>

                <ul
                  className="
                    space-y-2
                    text-sm
                    text-rtg-mist
                  "
                >
                  {/* Email */}

                  <li className="flex items-start gap-2">
                    <Mail
                      size={15}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {brand.email}
                    </span>
                  </li>

                  {/* Phone */}

                  <li className="flex items-start gap-2">
                    <Phone
                      size={15}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {brand.phone}
                    </span>
                  </li>

                  {/* Location */}

                  <li className="flex items-start gap-2">
                    <MapPin
                      size={15}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {CONTACT_CITY}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ===============================================
                FOOTER BOTTOM
                =============================================== */}

            <div
              className="
                border-t
                border-white/10
                pt-4
                flex
                flex-col
                md:flex-row
                items-center
                justify-between
                gap-2
                text-xs
                text-rtg-mist
              "
            >
              {/* Copyright */}

              <p>
                © {new Date().getFullYear()}{" "}
                {t(
                  "text.footer.copyright",
                  "Ride Tea GupShup. All rights reserved."
                )}
              </p>

              {/* Tagline */}

              <p>
                {t(
                  "text.footer.tagline",
                  "Built for athletes, by athletes."
                )}
              </p>
            </div>
          </div>
        </footer>

        {/* ===================================================
            FADED LOGO WATERMARK

            This is kept at the very bottom of the combined
            section so it doesn't create a separate image box.
            =================================================== */}

        <img
          src={images.logo}
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none
            select-none
            absolute
            left-1/2
            bottom-16
            -translate-x-1/2
            h-20
            md:h-28
            w-auto
            max-w-[80%]
            object-contain
            opacity-[0.08]
            mix-blend-screen
          "
        />
      </div>
    </section>
  );
}