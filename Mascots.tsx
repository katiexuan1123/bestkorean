import React from "react";
import readingMascotImg from "../assets/images/reading_mascot_1780637025283.png";

/**
 * Top-Left Mascot: A squishy, organic yellow confused potato/blob character.
 * Replicated in ultra-high fidelity from the user's hand-drawn Image 1.
 * Completely borderless, authentic organic contours, and bold expression.
 */
export const ConfusedBlobMascot: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-14 h-14 md:w-16 md:h-16"
      style={{ filter: "drop-shadow(0px 2px 4px rgba(78, 71, 68, 0.04))" }}
      {...props}
    >
      {/* Main organic squishy body - a perfect replication of the hand-drawn yellow blob in Image 1 */}
      <path
        d="M 52,14 
           C 66,14 83,23 90,40 
           C 96,55 93,73 87,83 
           C 78,94 65,97 53,95 
           C 39,94 28,95 19,83 
           C 11,73 13,54 20,41 
           C 25,25 38,14 52,14 Z"
        fill="#FED255"
      />

      {/* Under-eye blush accent - subtle, ultra-soft orange blend */}
      <path
        d="M 19,65 C 21,70 28,70 30,65 Z"
        fill="#FCBC4E"
        opacity="0.15"
      />
      <path
        d="M 78,65 C 80,70 87,70 89,65 Z"
        fill="#FCBC4E"
        opacity="0.15"
      />

      {/* Asymmetric hand-drawn white eyeballs pointing up-right */}
      {/* Left eyeball white */}
      <ellipse
        cx="41.5"
        cy="47.5"
        rx="11.5"
        ry="15"
        transform="rotate(-8, 41.5, 47.5)"
        fill="#FFFFFF"
      />
      {/* Left eyeball black pupil */}
      <ellipse
        cx="46"
        cy="41.5"
        rx="7"
        ry="9"
        transform="rotate(-8, 46, 41.5)"
        fill="#111111"
      />

      {/* Right eyeball white (larger, sits higher as in Image 1) */}
      <ellipse
        cx="63.5"
        cy="41.5"
        rx="10.5"
        ry="16"
        transform="rotate(10, 63.5, 41.5)"
        fill="#FFFFFF"
      />
      {/* Right eyeball black pupil */}
      <ellipse
        cx="67.5"
        cy="33.5"
        rx="6.5"
        ry="10"
        transform="rotate(10, 67.5, 33.5)"
        fill="#111111"
      />

      {/* Confused red inverted U-shaped mouth with perfect marker-like curves */}
      <path
        d="M 45.5,73 C 46.5,59 57.5,59 58.5,72"
        stroke="#DA414C"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Bottom-Right Mascot: Sitting yellow potato blob character wearing a teal-blue beret,
 * reading a brown star notebook.
 * Replaced with the exact original artwork PNG file.
 */
export const ReadingBlobMascot: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  return (
    <img
      src={readingMascotImg}
      alt="Reading Mascot"
      className="w-24 h-24 md:w-32 md:h-32 object-contain"
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};

/**
 * Surprised / Gasping Grey Mascot: An organic grey squishy blob character.
 * Replicated in ultra-high fidelity from the user's hand-drawn Image 4.
 * Completely borderless with authentic organic contour curves, large big white eyes reflecting 
 * up-right coordinates, and a cute vertically-oriented red-coral gasp mouth.
 */
export const SurprisedGreyMascot: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 h-24 md:w-32 md:h-32"
      {...props}
    >
      {/* Main organic squishy grey body matching the user's grey image shape precisely with that cute bottom right bump */}
      <path
        d="M 52,14 
           C 66,13 81,18 89,35 
           C 95,47 91,61 97,71 
           C 102,80 102,90 92,97 
           C 82,104 64,103 50,103 
           C 36,103 24,103 17,92 
           C 11,81 13,63 15,48 
           C 17,31 34,15 52,14 Z"
        fill="#BEBEBE"
      />

      {/* Under-eye blush accent - subtle soft darker grey shadow under the eyes */}
      <path
        d="M 19,68 C 21,73 28,73 30,68 Z"
        fill="#A5A5A5"
        opacity="0.2"
      />
      <path
        d="M 78,68 C 80,73 87,73 89,68 Z"
        fill="#A5A5A5"
        opacity="0.2"
      />

      {/* Left eyeball white (large oval) */}
      <ellipse
        cx="40.5"
        cy="43.5"
        rx="13.5"
        ry="18.5"
        transform="rotate(-15, 40.5, 43.5)"
        fill="#FFFFFF"
      />
      {/* Left eyeball black pupil (massive, looking upwards and slightly rightwards as in the grey image) */}
      <ellipse
        cx="41.5"
        cy="36.5"
        rx="9"
        ry="13"
        transform="rotate(-15, 41.5, 36.5)"
        fill="#111111"
      />

      {/* Right eyeball white (sitting slightly lower/differently as in Hand-drawn image) */}
      <ellipse
        cx="68.5"
        cy="41.5"
        rx="13.5"
        ry="17.5"
        transform="rotate(12, 68.5, 41.5)"
        fill="#FFFFFF"
      />
      {/* Right eyeball black pupil (looking upwards as well) */}
      <ellipse
        cx="66.5"
        cy="33.5"
        rx="9"
        ry="12"
        transform="rotate(12, 66.5, 33.5)"
        fill="#111111"
      />

      {/* Gasping/shocked open mouth: cute vertical drop/egg-shaped red marker contour */}
      <path
        d="M 55,59 
           C 51.5,59 48,62 48,68.5 
           C 48,75.5 51.5,81.5 55,81.5 
           C 58.5,81.5 62,75.5 62,68.5 
           C 62,62 58.5,59 55,59 Z"
        fill="#E5404B"
      />
    </svg>
  );
};
