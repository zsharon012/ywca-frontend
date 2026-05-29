import eye from './eye.svg?react';
import eyeClosed from './eyeclosed.svg?react';
import link from './link.svg?react';

/**
 * How to add new icons:
 * 1. Create a new .svg file in /src/assets/icons (e.g., myicon.svg)
 * 2. Paste the SVG markup of the icon into that file
 * 3. Import the icon here using the ?react suffix:
 *    import myIcon from './myicon.svg?react';
 * 4. Add the new icon to the Icon object below:
 *    export const Icon = { eye, eyeClosed, myIcon };
 *
 * Great icon resource: https://tablericons.com/
 */

export const Icon = {
  eye,
  eyeClosed,
  link,
};
