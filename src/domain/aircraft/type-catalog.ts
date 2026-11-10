/**
 * Aircraft type catalogue (v1).
 *
 * Maps the free-text model strings found in regulator lists and operator websites to a
 * canonical type. It records identity and ThePrivate's commercial category ONLY. Performance
 * specifications (range, speed, baggage) are deliberately absent: they must come from a cited
 * source and are added through the admin console, never inferred here.
 *
 * Categories are ThePrivate's classification for search and filtering. They are editable
 * by admins and are labelled as a platform classification in the UI.
 */

import type { AirframeClass } from '../imports/normalize';

export type AircraftCategory =
  | 'PISTON'
  | 'TURBOPROP'
  | 'LIGHT_JET'
  | 'MIDSIZE_JET'
  | 'SUPER_MIDSIZE_JET'
  | 'HEAVY_JET'
  | 'ULTRA_LONG_RANGE_JET'
  | 'VIP_AIRLINER'
  | 'AIRLINER'
  | 'HELICOPTER_SINGLE'
  | 'HELICOPTER_TWIN'
  | 'BALLOON'
  | 'GLIDER';

export interface CatalogType {
  key: string; // stable slug, e.g. "bombardier-global-7500"
  manufacturer: string;
  model: string;
  family: string;
  category: AircraftCategory;
  airframeClass: AirframeClass;
}

export type TypeMatch =
  | { kind: 'MATCHED'; type: CatalogType; rule: string }
  | { kind: 'AMBIGUOUS'; family: string; candidates: string[]; rule: string }
  | { kind: 'UNMATCHED' };

type Rule = { re: RegExp; type: Omit<CatalogType, 'key'> } | { re: RegExp; ambiguous: { family: string; candidates: string[] } };

const t = (
  manufacturer: string,
  model: string,
  family: string,
  category: AircraftCategory,
  airframeClass: AirframeClass,
): Omit<CatalogType, 'key'> => ({ manufacturer, model, family, category, airframeClass });

const FW = 'FIXED_WING' as const;
const RW = 'ROTARY_WING' as const;

/**
 * Rules are tested in order against an UPPER-CASE key with all non-alphanumerics removed
 * (e.g. "BD-700-2A12 (G7500)" → "BD7002A12G7500"). Specific rules come before general ones.
 */
const RULES: Rule[] = [
  // ---- Balloons -------------------------------------------------------------------------
  { re: /CAMERONA(\d{3})/, type: t('Cameron Balloons', 'A-$1', 'Cameron A', 'BALLOON', 'BALLOON') },
  { re: /T210ULTRAMAGIC|ULTRAMAGICT210/, type: t('Ultramagic', 'T-210', 'Ultramagic T', 'BALLOON', 'BALLOON') },
  { re: /ULTRAMAGIC([MN])(\d{3})/, type: t('Ultramagic', '$1-$2', 'Ultramagic $1', 'BALLOON', 'BALLOON') },

  // ---- Airliners / VIP airliners ---------------------------------------------------------
  { re: /A319115CJ|A319CORPORATE|ACJ319/, type: t('Airbus', 'ACJ319', 'Airbus A319', 'VIP_AIRLINER', FW) },
  { re: /A?C?J?A318ELITE|ACJ318/, type: t('Airbus', 'A318 Elite', 'Airbus A318', 'VIP_AIRLINER', FW) },
  { re: /^A320/, type: t('Airbus', 'A320', 'Airbus A320', 'AIRLINER', FW) },
  { re: /B737800FREIGHTER/, type: t('Boeing', '737-800 Freighter', 'Boeing 737', 'AIRLINER', FW) },
  { re: /^B7379$/, type: t('Boeing', '737 MAX 9', 'Boeing 737', 'AIRLINER', FW) },
  { re: /BBJ1|BOEINGBUSINESSJETBBJ1/, type: t('Boeing', 'BBJ (737-700)', 'Boeing Business Jet', 'VIP_AIRLINER', FW) },
  { re: /^BOEINGBUSINESSJET$/, ambiguous: { family: 'Boeing Business Jet', candidates: ['BBJ', 'BBJ2', 'BBJ3', 'BBJ MAX'] } },
  { re: /LINEAGE1000|1901?00ECJ/, type: t('Embraer', 'Lineage 1000', 'Embraer E190', 'VIP_AIRLINER', FW) },
  { re: /ERJ170200|E175/, type: t('Embraer', 'E175 (ERJ 170-200)', 'Embraer E-Jet', 'AIRLINER', FW) },
  { re: /EMBRAER135ER|EMB135LR|^EMBRAER135ER$/, type: t('Embraer', 'ERJ 135', 'Embraer ERJ 135', 'AIRLINER', FW) },
  { re: /DASH8Q400|DHC8400/, type: t('De Havilland Canada', 'Dash 8-400', 'Dash 8', 'AIRLINER', FW) },
  { re: /DHC8300/, type: t('De Havilland Canada', 'Dash 8-300', 'Dash 8', 'AIRLINER', FW) },
  { re: /DHC8200/, type: t('De Havilland Canada', 'Dash 8-200', 'Dash 8', 'AIRLINER', FW) },

  // ---- Bombardier ------------------------------------------------------------------------
  { re: /G7500|GLOBAL7500|BD7002A12/, type: t('Bombardier', 'Global 7500', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /GLOBAL5000\/?6000|GLOBAL50006000/, ambiguous: { family: 'Bombardier Global', candidates: ['Global 5000', 'Global 6000'] } },
  { re: /GLOBAL6500/, type: t('Bombardier', 'Global 6500', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /G6000|GLOBAL6000/, type: t('Bombardier', 'Global 6000', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /GLOBAL5500/, type: t('Bombardier', 'Global 5500', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /GLOBAL5000/, type: t('Bombardier', 'Global 5000', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /GLOBALEXPRESSXRS|GLOBALXRS/, type: t('Bombardier', 'Global Express XRS', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /GLOBALEXPRESS/, type: t('Bombardier', 'Global Express', 'Bombardier Global', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /BD7001A11/, ambiguous: { family: 'Bombardier Global', candidates: ['Global 5000', 'Global 5500'] } },
  { re: /BD7001A10/, ambiguous: { family: 'Bombardier Global', candidates: ['Global Express', 'Global Express XRS', 'Global 6000', 'Global 6500'] } },
  { re: /^BOMBARDIERGLOBAL$/, ambiguous: { family: 'Bombardier Global', candidates: ['Global 5000', 'Global 6000', 'Global 6500', 'Global 7500'] } },
  { re: /CHALLENGER3500/, type: t('Bombardier', 'Challenger 3500', 'Bombardier Challenger 300', 'SUPER_MIDSIZE_JET', FW) },
  { re: /BD1001A10/, ambiguous: { family: 'Bombardier Challenger 300', candidates: ['Challenger 300', 'Challenger 350', 'Challenger 3500'] } },
  { re: /CHALLENGER650|CL650/, type: t('Bombardier', 'Challenger 650', 'Bombardier Challenger 600', 'HEAVY_JET', FW) },
  { re: /CL605|CHALLENGER605/, type: t('Bombardier', 'Challenger 605', 'Bombardier Challenger 600', 'HEAVY_JET', FW) },
  { re: /CL604|604VARIANT|CHALLENGER604/, type: t('Bombardier', 'Challenger 604', 'Bombardier Challenger 600', 'HEAVY_JET', FW) },
  { re: /LEARJET60/, type: t('Bombardier', 'Learjet 60XR', 'Learjet', 'MIDSIZE_JET', FW) },
  { re: /LEARJET45/, type: t('Bombardier', 'Learjet 45', 'Learjet', 'LIGHT_JET', FW) },
  { re: /LEARJET40/, type: t('Bombardier', 'Learjet 40XR', 'Learjet', 'LIGHT_JET', FW) },

  // ---- Gulfstream ------------------------------------------------------------------------
  { re: /G650ER/, type: t('Gulfstream', 'G650ER', 'Gulfstream G650', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /G600/, type: t('Gulfstream', 'G600', 'Gulfstream G600', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /G550|GVSP/, type: t('Gulfstream', 'G550', 'Gulfstream GV', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /G450/, type: t('Gulfstream', 'G450', 'Gulfstream GIV', 'HEAVY_JET', FW) },
  { re: /G200$|^G200/, type: t('Gulfstream', 'G200', 'Gulfstream G200', 'SUPER_MIDSIZE_JET', FW) },
  { re: /G150$|^G150/, type: t('Gulfstream', 'G150', 'Gulfstream G150', 'MIDSIZE_JET', FW) },

  // ---- Dassault --------------------------------------------------------------------------
  { re: /FALCON8X/, type: t('Dassault', 'Falcon 8X', 'Dassault Falcon', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /FALCON7X/, type: t('Dassault', 'Falcon 7X', 'Dassault Falcon', 'ULTRA_LONG_RANGE_JET', FW) },
  { re: /FALCON900DX/, type: t('Dassault', 'Falcon 900DX', 'Dassault Falcon 900', 'HEAVY_JET', FW) },
  { re: /FALCON900EX/, type: t('Dassault', 'Falcon 900EX', 'Dassault Falcon 900', 'HEAVY_JET', FW) },
  { re: /FALCON2000LX/, type: t('Dassault', 'Falcon 2000LX', 'Dassault Falcon 2000', 'SUPER_MIDSIZE_JET', FW) },
  { re: /FALCON2000EX/, type: t('Dassault', 'Falcon 2000EX', 'Dassault Falcon 2000', 'SUPER_MIDSIZE_JET', FW) },
  { re: /FALCON2000$/, type: t('Dassault', 'Falcon 2000', 'Dassault Falcon 2000', 'SUPER_MIDSIZE_JET', FW) },

  // ---- Embraer business jets -------------------------------------------------------------
  { re: /LEGACY650/, type: t('Embraer', 'Legacy 650', 'Embraer Legacy 600', 'HEAVY_JET', FW) },
  { re: /LEGACY600/, type: t('Embraer', 'Legacy 600', 'Embraer Legacy 600', 'HEAVY_JET', FW) },
  { re: /^(EMB|EMBRAER)135BJ$/, ambiguous: { family: 'Embraer Legacy 600', candidates: ['Legacy 600', 'Legacy 650'] } },
  { re: /PHENOM100|EMB500/, type: t('Embraer', 'Phenom 100', 'Embraer Phenom', 'LIGHT_JET', FW) },

  // ---- Textron (Cessna / Beechcraft / Hawker) -------------------------------------------
  { re: /CITATIONM2/, type: t('Cessna', 'Citation M2', 'Cessna CitationJet', 'LIGHT_JET', FW) },
  { re: /CITATIONCJ4|^CESSNACITATIONCJ4$/, type: t('Cessna', 'Citation CJ4', 'Cessna CitationJet', 'LIGHT_JET', FW) },
  { re: /560XLS/, type: t('Cessna', 'Citation XLS+', 'Cessna Citation Excel', 'MIDSIZE_JET', FW) },
  { re: /560XL/, type: t('Cessna', 'Citation Excel (560XL)', 'Cessna Citation Excel', 'MIDSIZE_JET', FW) },
  { re: /CJII|CJ2|525A/, type: t('Cessna', 'Citation CJ2 (525A)', 'Cessna CitationJet', 'LIGHT_JET', FW) },
  { re: /CITATIONIII|CITATION650/, type: t('Cessna', 'Citation III (650)', 'Cessna Citation III', 'MIDSIZE_JET', FW) },
  { re: /CITATIONII$/, type: t('Cessna', 'Citation II (550)', 'Cessna Citation II', 'LIGHT_JET', FW) },
  { re: /CARAVAN208B|208B/, type: t('Cessna', 'Grand Caravan (208B)', 'Cessna Caravan', 'TURBOPROP', FW) },
  { re: /T?206H$/, type: t('Cessna', '206H Stationair', 'Cessna 206', 'PISTON', FW) },
  { re: /R?172[SK]$/, type: t('Cessna', '172 Skyhawk', 'Cessna 172', 'PISTON', FW) },
  { re: /PREMIER1A/, type: t('Beechcraft', 'Premier IA', 'Beechcraft Premier', 'LIGHT_JET', FW) },
  { re: /HAWKER4000/, type: t('Hawker Beechcraft', 'Hawker 4000', 'Hawker', 'SUPER_MIDSIZE_JET', FW) },
  { re: /HAWKER400AXP|HAWKER400XP/, type: t('Hawker Beechcraft', 'Hawker 400XP', 'Hawker', 'LIGHT_JET', FW) },
  { re: /900XP/, type: t('Hawker Beechcraft', 'Hawker 900XP', 'Hawker 800', 'MIDSIZE_JET', FW) },
  { re: /850XP/, type: t('Hawker Beechcraft', 'Hawker 850XP', 'Hawker 800', 'MIDSIZE_JET', FW) },
  { re: /800XP/, type: t('Hawker Beechcraft', 'Hawker 800XP', 'Hawker 800', 'MIDSIZE_JET', FW) },
  { re: /HAWKER750/, type: t('Hawker Beechcraft', 'Hawker 750', 'Hawker 800', 'MIDSIZE_JET', FW) },
  { re: /B300|300LW|KINGAIR350/, type: t('Beechcraft', 'King Air 350 / 300 series', 'Beechcraft King Air 300', 'TURBOPROP', FW) },
  { re: /B200GT|KINGAIR250|^B200GT$/, type: t('Beechcraft', 'King Air B200GT / 250', 'Beechcraft King Air 200', 'TURBOPROP', FW) },
  { re: /B200|SKAB200/, type: t('Beechcraft', 'King Air B200', 'Beechcraft King Air 200', 'TURBOPROP', FW) },
  { re: /C90GTI/, type: t('Beechcraft', 'King Air C90GTi', 'Beechcraft King Air 90', 'TURBOPROP', FW) },
  { re: /C90B/, type: t('Beechcraft', 'King Air C90B', 'Beechcraft King Air 90', 'TURBOPROP', FW) },
  { re: /C90A/, type: t('Beechcraft', 'King Air C90A', 'Beechcraft King Air 90', 'TURBOPROP', FW) },

  // ---- Other fixed wing -------------------------------------------------------------------
  { re: /PC24/, type: t('Pilatus', 'PC-24', 'Pilatus PC-24', 'LIGHT_JET', FW) },
  { re: /PC12/, type: t('Pilatus', 'PC-12', 'Pilatus PC-12', 'TURBOPROP', FW) },
  { re: /P180AVANTI/, type: t('Piaggio', 'P.180 Avanti II', 'Piaggio Avanti', 'TURBOPROP', FW) },
  { re: /DO228/, type: t('Dornier', 'Do 228-201', 'Dornier 228', 'TURBOPROP', FW) },
  { re: /DHC6300|TWINOTTER/, type: t('De Havilland Canada', 'DHC-6-300 Twin Otter', 'Twin Otter', 'TURBOPROP', FW) },
  { re: /P68OB|P68C/, type: t('Vulcanair', 'P68', 'Partenavia/Vulcanair P68', 'PISTON', FW) },
  { re: /PA46350P/, type: t('Piper', 'PA-46-350P Malibu Mirage', 'Piper PA-46', 'PISTON', FW) },
  { re: /P2006T/, type: t('Tecnam', 'P2006T', 'Tecnam P2006T', 'PISTON', FW) },
  { re: /P2010/, type: t('Tecnam', 'P2010', 'Tecnam P2010', 'PISTON', FW) },
  { re: /STEMMES6/, type: t('Stemme', 'S6-RT', 'Stemme S6', 'GLIDER', FW) },

  // ---- Helicopters ------------------------------------------------------------------------
  { re: /AW189/, type: t('Leonardo', 'AW189', 'Leonardo AW189', 'HELICOPTER_TWIN', RW) },
  { re: /AW169/, type: t('Leonardo', 'AW169', 'Leonardo AW169', 'HELICOPTER_TWIN', RW) },
  { re: /AW139/, type: t('Leonardo', 'AW139', 'Leonardo AW139', 'HELICOPTER_TWIN', RW) },
  { re: /A?W?119KOALA|A119/, type: t('Leonardo', 'AW119 Koala', 'Leonardo AW119', 'HELICOPTER_SINGLE', RW) },
  { re: /AW109SP|A109SP|GRANDAGUSTA109S|A109S$/, type: t('Leonardo', 'AW109S Grand / SP', 'Leonardo AW109', 'HELICOPTER_TWIN', RW) },
  { re: /A109E|AGUSTA109E/, type: t('Leonardo', 'A109E Power', 'Leonardo AW109', 'HELICOPTER_TWIN', RW) },
  { re: /^(AGUSTAWESTLAND|AGUSTA|LEONARDO)?A?W?109$/, ambiguous: { family: 'Leonardo AW109', candidates: ['A109E Power', 'AW109S Grand / SP', 'AW109 Trekker'] } },
  { re: /ALHDHRUV|DHRUV/, type: t('HAL', 'Dhruv (ALH)', 'HAL Dhruv', 'HELICOPTER_TWIN', RW) },
  { re: /AS355|AS355N|AS355F1/, type: t('Airbus Helicopters', 'AS355 Ecureuil 2', 'Airbus AS355', 'HELICOPTER_TWIN', RW) },
  { re: /AS350B3E(?!CUREUIL)/, type: t('Airbus Helicopters', 'H125 (AS350 B3e)', 'Airbus AS350', 'HELICOPTER_SINGLE', RW) },
  { re: /AS350B3/, type: t('Airbus Helicopters', 'AS350 B3', 'Airbus AS350', 'HELICOPTER_SINGLE', RW) },
  { re: /AS350B2/, type: t('Airbus Helicopters', 'AS350 B2', 'Airbus AS350', 'HELICOPTER_SINGLE', RW) },
  { re: /365N3|AS365N3/, type: t('Airbus Helicopters', 'AS365 N3 Dauphin', 'Airbus AS365 Dauphin', 'HELICOPTER_TWIN', RW) },
  { re: /365N2/, type: t('Airbus Helicopters', 'AS365 N2 Dauphin', 'Airbus AS365 Dauphin', 'HELICOPTER_TWIN', RW) },
  { re: /SA365N$/, type: t('Airbus Helicopters', 'SA365 N Dauphin', 'Airbus AS365 Dauphin', 'HELICOPTER_TWIN', RW) },
  { re: /^DAUPHIN2$/, ambiguous: { family: 'Airbus AS365 Dauphin', candidates: ['SA365 N', 'AS365 N2', 'AS365 N3'] } },
  { re: /H160/, type: t('Airbus Helicopters', 'H160', 'Airbus H160', 'HELICOPTER_TWIN', RW) },
  { re: /H145|BK117D/, type: t('Airbus Helicopters', 'H145', 'Airbus H145', 'HELICOPTER_TWIN', RW) },
  { re: /H130|EC130/, type: t('Airbus Helicopters', 'H130 (EC130)', 'Airbus H130', 'HELICOPTER_SINGLE', RW) },
  { re: /EC135/, type: t('Airbus Helicopters', 'H135 (EC135)', 'Airbus H135', 'HELICOPTER_TWIN', RW) },
  { re: /EC120/, type: t('Airbus Helicopters', 'EC120 B Colibri', 'Airbus EC120', 'HELICOPTER_SINGLE', RW) },
  { re: /BELL429/, type: t('Bell', '429', 'Bell 429', 'HELICOPTER_TWIN', RW) },
  { re: /BELL427/, type: t('Bell', '427', 'Bell 427', 'HELICOPTER_TWIN', RW) },
  { re: /BELL412/, type: t('Bell', '412', 'Bell 412', 'HELICOPTER_TWIN', RW) },
  { re: /BELL212412/, ambiguous: { family: 'Bell 212/412', candidates: ['212', '412'] } },
  { re: /BELL212/, type: t('Bell', '212', 'Bell 212', 'HELICOPTER_TWIN', RW) },
  { re: /BELL407/, type: t('Bell', '407', 'Bell 407', 'HELICOPTER_SINGLE', RW) },
  { re: /BELL206L/, type: t('Bell', '206L LongRanger', 'Bell 206', 'HELICOPTER_SINGLE', RW) },
  { re: /BELL206$/, type: t('Bell', '206', 'Bell 206', 'HELICOPTER_SINGLE', RW) },
  { re: /MI171A2/, type: t('Mil', 'Mi-171A2', 'Mil Mi-17', 'HELICOPTER_TWIN', RW) },
  { re: /MI172/, type: t('Mil', 'Mi-172', 'Mil Mi-17', 'HELICOPTER_TWIN', RW) },
  { re: /R66/, type: t('Robinson', 'R66', 'Robinson R66', 'HELICOPTER_SINGLE', RW) },
  { re: /R44|ROBINSON44/, type: t('Robinson', 'R44 Raven II', 'Robinson R44', 'HELICOPTER_SINGLE', RW) },
  { re: /S76D/, type: t('Sikorsky', 'S-76D', 'Sikorsky S-76', 'HELICOPTER_TWIN', RW) },
  { re: /S76C/, type: t('Sikorsky', 'S-76C++', 'Sikorsky S-76', 'HELICOPTER_TWIN', RW) },
];

export function modelKey(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function typeKey(manufacturer: string, model: string): string {
  return `${manufacturer} ${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function matchAircraftType(raw: string | null | undefined): TypeMatch {
  if (!raw) return { kind: 'UNMATCHED' };
  const key = modelKey(raw);
  if (!key) return { kind: 'UNMATCHED' };
  for (const rule of RULES) {
    const m = rule.re.exec(key);
    if (!m) continue;
    if ('ambiguous' in rule) return { kind: 'AMBIGUOUS', family: rule.ambiguous.family, candidates: rule.ambiguous.candidates, rule: String(rule.re) };
    const fill = (s: string) => s.replace(/\$(\d)/g, (_, i: string) => m[Number(i)] ?? '');
    const type = { ...rule.type, model: fill(rule.type.model), family: fill(rule.type.family) };
    return { kind: 'MATCHED', type: { ...type, key: typeKey(type.manufacturer, type.model) }, rule: String(rule.re) };
  }
  return { kind: 'UNMATCHED' };
}
