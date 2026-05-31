/**
 * Alpacas Ibiza — Phase 1 content module.
 *
 * This file supplies the five content arrays for the alpacasibiza tenant.
 * It is consumed by staticTypescriptContentProvider() in lib/integrations/index.ts.
 *
 * UNMAPPED fields are null throughout per Rule 5 — do NOT invent bios, images,
 * prices, or durations. See OWNER_INPUT_NEEDED.md for the data collection request.
 *
 * Animals:    14 entries sourced from lib/data/alpacas.ts (canonical roster).
 * Experiences: 4 stubs — all numeric fields null (UNMAPPED).
 * Products:   [] — shop is FareHarbor-routed; no standalone product inventory.
 * Team:       [] — owner photos UNMAPPED; see OWNER_INPUT_NEEDED.md.
 * Reviews:    [] — Google Reviews gated on GOOGLE_PLACES_API_KEY (Tier 2 env var).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ACTIVATE AN ALPACA (bio + photo) — single-file edit:
 *
 *   Step 1: Drop the photo file at:
 *             public/images/alpacas/<id>.webp   (or .jpg)
 *
 *   Step 2: Edit the entry in the `animals` array below — set `bio` and `image`,
 *           then change no other file:
 *
 *     Before:
 *       { kind: 'animal', id: 'barbarella', name: 'Barbarella', bio: null, image: null },
 *
 *     After:
 *       { kind: 'animal', id: 'barbarella', name: 'Barbarella',
 *         bio: "Barbarella is the matriarch of the herd...",
 *         image: '/images/alpacas/barbarella.webp' },
 *
 *   Optional extended fields (add only when owner supplies):
 *     age: 7, breed: 'Huacaya', color: 'White', personality: 'Bold', fun_fact: '...'
 *
 *   For multi-language bios, use `localizedBio` instead of `bio`:
 *     localizedBio: { en: '...', nl: '...', de: '...' }, bio: null
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Bios migrated from live site 2026-05-31. EN translations are by automated assist; OWNER_REVIEW_TRANSLATION before launch.

import type { TenantContentModule } from '@/lib/integrations/content-static-typescript'
import type {
  AnimalEntity,
  ExperienceEntity,
} from '@/lib/integrations/content-types'

/** CDN base shared by all alpaca portrait URLs. */
const CDN = 'https://images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3'

// ── Animals ───────────────────────────────────────────────────────────────────
// Bios (nl): verbatim from live site scrape (handoff/LIVE_SITE_CONTENT_INVENTORY.md).
// Bios (en): translated from Dutch source; facts preserved.
// Images: full-size CDN URLs from the portrait inventory table.
// OWNER_REVIEW_TRANSLATION: each EN bio marked inline below.

const animals: ReadonlyArray<AnimalEntity> = [
  {
    kind: 'animal',
    id: 'barbarella',
    name: 'Barbarella',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: 'Barbarella, soms ook wel Babs genoemd door haar vriendinnen, is zonder twijfel de braafste meid van de merrieweide. Hoewel ze naar Barbarella uit de sf-film werd vernoemd - een heuse intergalactische vamp - is onze Barbarella allesbehalve een vamp. Ze is vriendelijk, kalm en sociaal, altijd bereid een knuffel te ontvangen, en heeft nooit een kwaad woord voor een van haar kuddegenoten.',
      en: "Barbarella — nicknamed Babs by her friends — is without doubt the most well-behaved girl in the mares' paddock. Although she was named after Barbarella from the science-fiction film — a true intergalactic vamp — our Barbarella is anything but. She is friendly, calm and sociable, always ready for a cuddle, and never has a bad word for any of her herd-mates.",
    },
    breed: 'Huacaya',
    color: 'light rose grey',
    personality: 'calm, sociable, friendly',
    fun_fact: 'Despite being named after a sci-fi vamp, Barbarella is the gentlest, most easy-going mare in the paddock.',
    image: `${CDN}/d2625434-cecd-4c7e-a656-b6faef7b974b/BARBARELLA+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'avalon',
    name: 'Avalon',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Lieve, zachte Avalon. Genoemd naar de wereldhit van Roxy Music over een mytisch, paradijselijk eiland, is deze merrie zonder twijfel de allerliefste alpaca van de kudde. Avalon en Marrón zijn tante en nicht: Avalons moeder is namelijk de zus van Marrón. Avalon is een echte knuffelbeer en zal je altijd als eerste begroeten als je de wei instapt.",
      en: "Sweet, gentle Avalon. Named after the Roxy Music world hit about a mythical, paradise island, this mare is without doubt the most loveable alpaca in the herd. Avalon and Marrón are aunt and niece: Avalon's mother is the sister of Marrón. Avalon is a real cuddle-bear and will always be the first to greet you when you step into the paddock.",
    },
    breed: 'Huacaya',
    color: null,
    personality: 'sociable, calm, friendly',
    fun_fact: "Avalon and Marrón are aunt and niece — Avalon's mother is Marrón's sister.",
    image: `${CDN}/18b959ad-0cf1-4b30-87e6-f730c25f43ab/AVALON+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'bardot',
    name: 'Bardot',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: 'Onze jongste telg, geboren op 19 januari 2022, is een echt prinsesje. Letterlijk, gezien ze de dochter is van ons koningspaar Lewis en Marrón. Net als haar moeder heeft Bardot een slanke, elegante verschijning en is ze verguld met de mooiste ogen van de kudde. Ze werd vernoemd naar de iconische Franse actrice en dierenrechtenactiviste Brigitte Bardot.',
      en: 'Our youngest, born on 19 January 2022, is a true little princess — literally, given that she is the daughter of our royal couple Lewis and Marrón. Like her mother, Bardot has a slender, elegant bearing and is blessed with the most beautiful eyes in the herd. She was named after the iconic French actress and animal-rights activist Brigitte Bardot.',
    },
    breed: 'Huacaya',
    color: 'greyish-brown',
    personality: 'bold, sociable',
    fun_fact: 'Bardot is the youngest cria on the farm, born 19 January 2022, daughter of Lewis and Marrón.',
    image: `${CDN}/3148a6f3-5270-4cde-bb5d-d15db5a1fa76/BARDOT+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'chet',
    name: 'Chet',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: 'Een koningskind in alle betekenissen, dat is onze eerstgeboren cria Chet (naar Chet Baker). Zoon van Lewis en Marrón, allereerste alpaca ooit geboren op Ibiza (20 nov 2020). Als gecastreerde hengst heeft Chet een nobele uitstraling en een rustig, zelfverzekerd karakter. Hij is nieuwsgierig zonder opdringerig te zijn en vormt een mooie brug tussen de mannelijke en vrouwelijke leden van de kudde.',
      en: 'A royal child in every sense — that is our firstborn cria Chet, named after jazz legend Chet Baker. Son of Lewis and Marrón, Chet was the very first alpaca ever born on Ibiza (20 November 2020). As a gelding he carries a noble bearing and a calm, self-assured character. He is curious without being pushy, and forms a natural bridge between the male and female members of the herd.',
    },
    breed: 'Huacaya',
    color: null,
    personality: 'calm, independent',
    fun_fact: 'Chet was the first alpaca ever born on Ibiza, on 20 November 2020.',
    image: `${CDN}/6a435b6c-19ea-4251-a55a-8a570b79dd4d/CHET-needswork+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'dusty',
    name: 'Dusty',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Dusty is het meest nieuwsgierige merrietje van de groep en altijd en overal als eerste bij. Ze daagt haar vriendinnen voortdurend uit en heeft een uitgesproken speelse persoonlijkheid. Dusty en Moloko zijn halfzussen met dezelfde moeder. Dusty was een van de originele vijf alpaca's die op 10 augustus 2019 vanuit België naar Ibiza reisden.",
      en: 'Dusty is the most curious mare in the group and always first on the scene. She constantly challenges her friends and has a pronounced playful personality. Dusty and Moloko are half-sisters, sharing the same mother. Dusty was one of the original five alpacas who made the journey from Belgium to Ibiza on 10 August 2019.',
    },
    breed: 'Huacaya',
    color: 'white',
    personality: 'playful, bold',
    fun_fact: 'Dusty is half-sister to Moloko and was one of the founding five alpacas who arrived on Ibiza in 2019.',
    image: `${CDN}/5771b57d-c258-4489-ac5c-c7fedb208b3b/DUSTY+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'fela',
    name: 'Fela',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Genoemd naar de Afrikaanse muzieklegende Fela Kuti, is deze jonge gecastreerde hengst een echte hartendief. Zijn glanzende lichtbruine vacht en zijn vriendelijke, open blik maken hem tot een van de meest fotogenieke alpaca's van de boerderij. Fela arriveerde in maart 2021 op Ibiza en heeft zich sindsdien uitstekend ingepast in de kudde.",
      en: 'Named after African music legend Fela Kuti, this young gelding is a true heart-stealer. His gleaming light-brown fleece and friendly, open gaze make him one of the most photogenic alpacas on the farm. Fela arrived on Ibiza in March 2021 and has settled into the herd beautifully ever since.',
    },
    breed: 'Huacaya',
    color: 'brown',
    personality: 'sociable, friendly',
    fun_fact: 'Named after Afrobeat legend Fela Kuti, Fela arrived on Ibiza in March 2021 with his gleaming light-brown fleece.',
    image: `${CDN}/2f73fb70-67e6-4a91-9cae-7e1438e6b99f/FELA+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'fonda',
    name: 'Fonda',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: 'Ze kreeg haar naam van de legendarische actrice Jane Fonda en deze jonge merrie heeft ook de looks van een Hollywood-vamp. Fonkelende, donkeromrande ogen, een volle, weelderige vacht en een zelfbewuste manier van bewegen: Fonda is zich duidelijk bewust van haar eigen schoonheid. Maar achter die glamoureuze buitenkant gaat een lief en zacht karakter schuil.',
      en: 'She takes her name from legendary actress Jane Fonda, and this young mare certainly has the looks of a Hollywood vamp. Sparkling, dark-rimmed eyes, a full and luxurious fleece, and a self-assured way of moving — Fonda is clearly aware of her own beauty. But behind that glamorous exterior hides a sweet and gentle character.',
    },
    breed: 'Huacaya',
    color: null,
    personality: 'bold, sociable',
    fun_fact: 'Fonda carries the looks of her Hollywood namesake Jane Fonda — striking dark-rimmed eyes and a full, glamorous fleece.',
    image: `${CDN}/78dfb6f8-8aa0-4ba2-bb67-863332e95df2/FONDA+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'lewis',
    name: 'Lewis',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Lewis is de dekhengst van onze kudde en een echte macho. Als onvervalst alfamannetje regeert hij als de Koning van het Noorden over de finca en houdt hij nauwlettend toezicht op zijn harem van merries. Lewis is de vader van Chet, Toots en Bardot — de drie cria's die op de boerderij geboren zijn. Hij was een van de originele vijf alpaca's die in 2019 vanuit België arriveerden.",
      en: "Lewis is the stud male of our herd and a true alpha. As an undisputed alpha male he rules as King of the North over the finca, keeping a watchful eye over his harem of mares. Lewis is the father of Chet, Toots and Bardot — the three crias born on the farm. He was one of the original five alpacas who arrived from Belgium in 2019.",
    },
    breed: 'Huacaya',
    color: 'milk white',
    personality: 'bold, independent',
    fun_fact: "Lewis is the herd's stud male and father of all three Ibiza-born crias: Chet, Toots and Bardot.",
    image: `${CDN}/bf594c02-56e5-4dd2-a07a-ce02cdfcc0f2/LEWIS+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'marron',
    name: 'Marron',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Marrón – wat bruin betekent in het Spaans – is een echte diva. Met haar lange poten, haar beeldmooie snoet, haar betoverende ogen en haar ranke hals is ze de modeltype van de kudde. Marrón is de moeder van Chet, Toots en Bardot en de nicht van Avalon: Marrón's zus is de moeder van Avalon. Ze was een van de eerste vijf alpaca's die in 2019 op Ibiza arriveerden.",
      en: "Marrón — Spanish for brown — is a true diva. With her long legs, beautiful face, enchanting eyes and slender neck, she is the supermodel of the herd. Marrón is the mother of Chet, Toots and Bardot, and the aunt of Avalon: Marrón's sister is Avalon's mother. She was one of the first five alpacas to arrive on Ibiza in 2019.",
    },
    breed: 'Huacaya',
    color: 'brown',
    personality: 'bold, independent',
    fun_fact: 'Marrón\'s name means "brown" in Spanish — she is the supermodel of the herd and mother of three Ibiza-born crias.',
    image: `${CDN}/9aaf4ec1-0d95-4931-86d5-265830a9cbd7/MARRON+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'mojo',
    name: 'Mojo',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Mojo is onze Grote Vriendelijke Reus. Als gecastreerde hengst gaf hij een deel van zijn mannelijkheid op om de wei te kunnen delen met de dominante Lewis, maar dat heeft zijn vrolijke karakter geen enkele knak gegeven. Mojo is de grootste alpaca van de kudde, kalm, vriendelijk en altijd in voor een knuffel. Hij was een van de originele vijf alpaca's die in 2019 vanuit België arriveerden.",
      en: 'Mojo is our Big Friendly Giant. As a gelding he gave up part of his masculinity to be able to share the paddock with the dominant Lewis, but that has not dented his cheerful character one bit. Mojo is the largest alpaca in the herd — calm, friendly and always up for a cuddle. He was one of the original five alpacas who arrived from Belgium in 2019.',
    },
    breed: 'Huacaya',
    color: 'light beige, curly coat in three brown tones',
    personality: 'calm, sociable, friendly',
    fun_fact: 'Mojo is the largest alpaca in the herd and the ultimate gentle giant — one of the original five who arrived from Belgium in 2019.',
    image: `${CDN}/a472e021-29b9-4fe6-b95b-c8703a920c94/MOJO+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'moloko',
    name: 'Moloko',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: 'Vernoemd naar de Britse dance-popgroep Moloko en haar charismatische zangeres Róisín Murphy, die op Ibiza woont en haar wollige naamgenote al bezocht heeft. Moloko is stil en gereserveerd, met een dikke, prachtige vacht. Ze is de halfzus van Dusty: ze delen dezelfde moeder.',
      en: 'Named after British dance-pop act Moloko and its charismatic singer Róisín Murphy, who lives on Ibiza and has already visited her woolly namesake. Moloko is quiet and reserved, with a thick and beautiful fleece. She is the half-sister of Dusty, sharing the same mother.',
    },
    breed: 'Huacaya',
    color: null,
    personality: 'shy, calm',
    fun_fact: 'Singer Róisín Murphy of the band Moloko — who lives on Ibiza — has personally visited her woolly namesake at the farm.',
    image: `${CDN}/585b2090-d734-4eba-817f-f67185bd991a/MOLOKO-needswork+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'nelson',
    name: 'Nelson',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Deze jonge gecastreerde hengst is de meest schichtige van onze alpaca's. Hij schrikt op bij elk geluid of elke beweging, maar maakt elke dag vorderingen in zijn vertrouwen. Nelson is een echte overlever met een groot hart, en wie geduld heeft om zijn vertrouwen te winnen, wordt rijkelijk beloond met zijn gezelschap.",
      en: 'This young gelding is the most skittish of our alpacas. He startles at every sound or movement, but makes progress in his confidence every single day. Nelson is a true survivor with a big heart, and whoever has the patience to earn his trust is richly rewarded with his company.',
    },
    breed: 'Huacaya',
    color: 'white with orange tint',
    personality: 'shy, independent',
    fun_fact: 'Nelson is the most skittish alpaca on the farm — earning his trust takes patience, but the reward is priceless.',
    image: `${CDN}/b6dfabf6-e859-43c7-9036-e6e60a7c2a11/NELSON-needswork+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'suki',
    name: 'Suki',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: "Suki, niet toevallig vernoemd naar de vurige vampierdame uit 'True Blood', is een speciaal geval. Met haar 'medium fawn'-wolkleur lijkt ze op een vicuña, het wild levende neefje van de alpaca. Suki is een van de meest bijzondere en fotogenieke alpaca's van de boerderij en heeft een pittig, eigenzinnig karakter dat volledig past bij haar naamgenote.",
      en: "Suki — fittingly named after the fiery vampire lady from True Blood — is a special case. With her medium-fawn fleece colour she resembles a vicuña, the wild cousin of the alpaca. Suki is one of the most distinctive and photogenic alpacas on the farm, and has a spirited, headstrong character that perfectly matches her namesake.",
    },
    breed: 'Huacaya',
    color: 'medium fawn with lighter belly, muzzle, and legs',
    personality: 'bold, independent',
    fun_fact: "Suki's medium-fawn fleece makes her look like a wild vicuña — the rarest colour in the herd.",
    image: `${CDN}/1f8eeef2-0378-45e0-a4e9-6ff510255081/SUKI+kopie.jpg`,
  },
  {
    kind: 'animal',
    id: 'toots',
    name: 'Toots',
    bio: null,
    // OWNER_REVIEW_TRANSLATION
    localizedBio: {
      nl: 'Als tweede alpaca ooit op 3 februari 2021 geboren op Ibiza na zijn halfbroer Chet, is Toots – naar Belgische jazzlegende Toots Thielemans – compleet een ander type dan zijn halfbroer. Waar Chet rustig en zelfverzekerd is, is Toots een uitbundige, speelse en nieuwsgierige jongen die altijd centraal wil staan. Toots is een zoon van Lewis en Marrón.',
      en: 'Born on 3 February 2021 as the second alpaca ever born on Ibiza after his half-brother Chet, Toots — named after Belgian jazz legend Toots Thielemans — is a completely different type from his half-brother. Where Chet is calm and self-assured, Toots is an exuberant, playful and curious youngster who always wants to be centre of attention. Toots is a son of Lewis and Marrón.',
    },
    breed: 'Huacaya',
    color: 'orange-reddish with long curls',
    personality: 'playful, sociable, bold',
    fun_fact: 'Named after Belgian jazz legend Toots Thielemans, Toots was the second alpaca ever born on Ibiza (3 February 2021).',
    image: `${CDN}/ae38973d-7ac0-46c9-bab7-16614327b782/TOOTS-needwork+kopie.jpg`,
  },
] as const

// ── Experiences ───────────────────────────────────────────────────────────────
// 4 stubs matching the FareHarbor tour names. All numeric fields null = UNMAPPED.
// durationMin, priceEur, capacity: fill in when owner supplies FareHarbor item data.

const experiences: ReadonlyArray<ExperienceEntity> = [
  {
    kind: 'experience',
    id: 'meet-the-herd',
    name: 'Meet the Herd',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
  {
    kind: 'experience',
    id: 'weaving-workshop',
    name: 'Weaving Workshop',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
  {
    kind: 'experience',
    id: 'farm-experience',
    name: 'Farm Experience',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
  {
    kind: 'experience',
    id: 'photo-session',
    name: 'Photo Session',
    bio: null,
    image: null,
    durationMin: null, // OWNER_INPUT_NEEDED
    priceEur: null,    // OWNER_INPUT_NEEDED
    capacity: null,    // OWNER_INPUT_NEEDED
  },
] as const

// ── Products ──────────────────────────────────────────────────────────────────
// Empty: Alpacas Ibiza routes shop purchases through FareHarbor.
// Populate when a standalone product catalogue is needed (ADR 004).

// ── Team ──────────────────────────────────────────────────────────────────────
// Empty: owner photos are UNMAPPED (see OWNER_INPUT_NEEDED.md "Team profiles").

// ── Reviews ───────────────────────────────────────────────────────────────────
// Empty: Google Reviews API is gated on GOOGLE_PLACES_API_KEY (Tier 2 env var).
// The live badge reads from the /api/google-reviews route when the key is set.

export const alpacasibizaContent: TenantContentModule = {
  animals,
  experiences,
  products: [],
  team: [],
  reviews: [],
}
