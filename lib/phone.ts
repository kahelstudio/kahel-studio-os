const PH_MOBILE_PREFIXES = new Set([
  // Globe / TM / GOMO
  "905","906","915","916","917","926","927","935","936","937","945","955","956","965","966","975","976","977","995","996","997",
  // Smart / TNT / Sun
  "813","907","908","909","910","912","918","919","920","921","928","929","930","938","939","946","947","948","949","950","951","961","963","968","969","981","989","998","999",
  // DITO Telecommunity
  "895","896","897","898","991","992","993","994",
]);

/** Validates a PH mobile stored as 10 digits (no leading 0, no +63 prefix). */
export function isValidPhMobile(digits: string): boolean {
  return digits.length === 10 && PH_MOBILE_PREFIXES.has(digits.slice(0, 3));
}
