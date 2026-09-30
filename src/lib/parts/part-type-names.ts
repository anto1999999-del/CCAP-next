/**
 * Part types, as people read them and as people search for them.
 *
 * The supplier's feed identifies a part type by a code such as
 * `LEFT_DOOR_MIRROR`, and many of those codes are cut short to fit a column:
 * `PWR_DR_WIND_SWITCH`, `FRT_XMEMBER_CRADLE`, `A_C_COMPRESSOR`. The filter used
 * to show them raw, underscores and all, in a native select that can only jump
 * to an entry by its first letters -- so finding a door mirror meant already
 * knowing it was filed under "LEFT".
 *
 * The code stays the value everywhere it is stored or sent: it is what the
 * catalogue matches on and what `?part_type=` URLs carry, and changing it would
 * change every filtered URL Google has seen. Only what people see and type
 * against changes here.
 */

/**
 * Codes the word-by-word rules cannot read properly, written out in full.
 *
 * Mostly codes that pack several alternatives into one, or where a single
 * letter stands for a word. Checked against every code in the live catalogue
 * on 30 Sep 2026.
 */
const LABEL_OVERRIDES: Record<string, string> = {
  "2ND_SEAT_REAR_SEAT": "2nd Row / Rear Seat",
  "3RD_SEAT": "3rd Row Seat",
  ADBLUE_TANK: "AdBlue Tank",
  AIR_CLEANER_DUCT_HOS: "Air Cleaner Duct / Hose",
  A_C_COMPRESSOR: "A/C Compressor",
  A_C_CONDENSER: "A/C Condenser",
  A_C_EVAPORATOR: "A/C Evaporator",
  A_C_HOSES: "A/C Hoses",
  A_C_VENT: "A/C Vent",
  BOOTLID_TAILGATE: "Bootlid / Tailgate",
  BOOTLID_TGATE_HINGE: "Bootlid / Tailgate Hinge",
  COIL_COIL_PACK: "Coil / Coil Pack",
  CONV_LIFT_MOTOR: "Convertible Roof Motor",
  DOOR_BOOT_GATE_LOCK: "Door / Boot / Tailgate Lock",
  DOOR_HINGE_RUNNER: "Door Hinge / Runner",
  F_BAR_REINFORC_BRACK: "Front Bumper Reinforcement / Bracket",
  FLYWHEEL_FLEXPLATE: "Flywheel / Flexplate",
  FRT_XMEMBER_CRADLE: "Front Crossmember / Cradle",
  FUEL_DOOR_FILLER: "Fuel Door / Filler",
  GEAR_STICK_SHIFTER: "Gear Stick / Shifter",
  HEATER_AC_CONTROLS: "Heater / A/C Controls",
  HEATER_CORE_BOX: "Heater Core / Box",
  IGNITION_W_KEY: "Ignition with Key",
  LEFT_FRONT_1Q_DOOR_GLASS: "Left Front Quarter Glass",
  LEFT_INDICATOR_FOG_SIDE: "Left Indicator / Fog / Side Light",
  LEFT_REAR_1Q_DOOR_GLASS: "Left Rear Quarter Glass",
  MISC_SWITCH_RELAY: "Misc Switch / Relay",
  P_S_RESERVOIR: "Power Steering Reservoir",
  PARCEL_SHELF_CARGO_BLIND: "Parcel Shelf / Cargo Blind",
  PARTICULATE_FILTER_DPF: "Diesel Particulate Filter (DPF)",
  R_BAR_BRACKET_REINFO: "Rear Bumper Bracket / Reinforcement",
  REAR_AXLE_BEAM_FWD: "Rear Axle Beam (FWD)",
  R_BEAM_CRADLE_XMEMBR: "Rear Beam / Cradle / Crossmember",
  RADIO_CD_DVD_SAT_TV: "Radio / CD / DVD / Sat Nav / TV",
  RIGHT_FRONT_1Q_DOOR_GLASS: "Right Front Quarter Glass",
  RIGHT_INDICATOR_FOG_SIDE: "Right Indicator / Fog / Side Light",
  RIGHT_REAR_1Q_DOOR_GLASS: "Right Rear Quarter Glass",
  LEFT_REAR_DOOR_SLIDING: "Left Rear / Sliding Door",
  RIGHT_REAR_DOOR_SLIDING: "Right Rear / Sliding Door",
  STEERING_BOX_RACK: "Steering Box / Rack",
  WATER_PIPES_OUTLETS: "Water Pipes / Outlets",
  WHEEL_MAG: "Mag Wheel",
  WHEEL_STANDARD_STEEL: "Steel Wheel",
  ROOF_GLASS_SUNROOF_T: "Roof Glass / Sunroof / T-Top",
  TRANS_GEARBOX: "Transmission / Gearbox",
  WHEEL_COVER_HUB_CAP: "Wheel Cover / Hub Cap",
};

/** Truncated or abbreviated words, and the acronyms that stay in capitals. */
const WORDS: Record<string, string> = {
  ABS: "ABS",
  ASSY: "Assembly",
  CYLIND: "Cylinder",
  DR: "Door",
  ECU: "ECU",
  EGR: "EGR",
  FRT: "Front",
  INSTRUMENTCLUSTER: "Instrument Cluster",
  MAG: "Mag",
  PWR: "Power",
  QTR: "Quarter",
  REG: "Regulator",
  SHRO: "Shroud",
  STEER: "Steering",
  WND: "Window",
  WIND: "Window",
};

function titleCase(word: string): string {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/** "LEFT_DOOR_MIRROR" -> "Left Door Mirror". */
export function partTypeLabel(code: string): string {
  const override = LABEL_OVERRIDES[code];
  if (override) return override;

  return code
    .split("_")
    .filter(Boolean)
    .map((word) => WORDS[word] ?? titleCase(word))
    .join(" ");
}

/**
 * Words people type that the catalogue spells differently.
 *
 * Keyed by a word that appears in a label; the listed words make that part
 * type findable by them too. Driver and passenger follow Australian vehicles:
 * the driver sits on the right.
 */
const ALSO_KNOWN_AS: Record<string, string[]> = {
  left: ["passenger", "lh", "nearside"],
  right: ["driver", "rh", "offside"],
  headlamp: ["headlight", "head", "light", "lamp"],
  taillight: ["tail", "light", "lamp", "rear"],
  lamp: ["light"],
  light: ["lamp"],
  // Not "mirror" alone: nobody calls the interior mirror a wing mirror.
  "door mirror": ["wing", "side"],
  "a/c": ["ac", "aircon", "air", "conditioning", "conditioner"],
  ecu: ["computer", "module", "engine"],
  "instrument cluster": ["dash", "dashboard", "speedo", "gauge"],
  transmission: ["auto", "manual"],
  gearbox: ["transmission"],
  guard: ["fender"],
  bonnet: ["hood"],
  bootlid: ["boot", "trunk"],
  mag: ["rim", "alloy", "wheel"],
  wheel: ["rim"],
  strut: ["shock", "suspension"],
  "shock absorber": ["suspension"],
  windscreen: ["windshield", "glass"],
  radio: ["stereo", "head", "unit"],
  "reverse camera": ["reversing", "backup"],
  "seat belt": ["seatbelt", "belt"],
  alternator: ["charging"],
  starter: ["motor"],
  catalytic: ["cat"],
};

/** Lowercase words, keeping "a/c" whole and dropping the slashes between options. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\s*\/\s*(?!c\b)/g, " ")
    .split(/[\s()-]+/)
    .filter(Boolean);
}

/** Every word a part type can be found by: its own, and what people call it. */
export function partTypeSearchWords(code: string): string[] {
  const label = partTypeLabel(code).toLowerCase();
  const found = new Set(words(label));

  for (const [key, extra] of Object.entries(ALSO_KNOWN_AS)) {
    const present = key.includes(" ")
      ? label.includes(key)
      : found.has(key) || label.includes(key);
    if (present) for (const word of extra) found.add(word);
  }

  return [...found];
}

export type PartTypeOption = { code: string; label: string };

/**
 * The part types a search matches, best first.
 *
 * Every word typed has to begin some word of the part type -- anywhere in the
 * name, not just the start -- so "door" finds Left Door Mirror and Right Front
 * Door, and "left door" narrows that to the left-hand ones. Matching the start
 * of words rather than any substring stops "ear" from finding Rear and Gearbox.
 *
 * Ordered so that names beginning with what was typed come first, then names
 * matched on their own words, then names matched only by what people call
 * them; alphabetical within each.
 */
export function matchPartTypes(
  codes: readonly string[],
  query: string,
): PartTypeOption[] {
  const typed = words(query);
  const options = codes.map((code) => ({ code, label: partTypeLabel(code) }));
  const byLabel = (a: PartTypeOption, b: PartTypeOption) =>
    a.label.localeCompare(b.label);

  if (typed.length === 0) return options.sort(byLabel);

  const ranked: { option: PartTypeOption; rank: number }[] = [];

  for (const option of options) {
    const own = words(option.label);
    const all = partTypeSearchWords(option.code);
    const hit = (pool: string[]) =>
      typed.every((t) => pool.some((word) => word.startsWith(t)));

    if (!hit(all)) continue;

    const rank = option.label
      .toLowerCase()
      .startsWith(query.trim().toLowerCase())
      ? 0
      : hit(own)
        ? 1
        : 2;
    ranked.push({ option, rank });
  }

  return ranked
    .sort((a, b) => a.rank - b.rank || byLabel(a.option, b.option))
    .map(({ option }) => option);
}
