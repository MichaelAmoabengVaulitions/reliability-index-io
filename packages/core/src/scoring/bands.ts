/*
 * Score band ranges from the API specification: Low 0-49, Medium 50-74, High
 * 75-100. The backend decides the band. These are only for drawing the scale,
 * so its zones line up with the band the backend reports.
 */
export const MEDIUM_BAND_MIN = 50;
export const HIGH_BAND_MIN = 75;
