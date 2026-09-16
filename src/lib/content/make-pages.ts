/**
 * The ten make landing pages, one per major manufacturer in the yard.
 *
 * These exist for the same reason the part-category pages do: the catalogue
 * cannot rank for "hyundai wreckers". A filtered list of parts, different after
 * every sync, is not what that searcher wants; a page that says what the yard
 * holds for that make, which models, and how buying works, is. Combined AU
 * demand for the make-plus-wreckers searches these target is roughly 13,900 a
 * month at low keyword difficulty (Semrush, September 2026), and Search Console
 * shows the homepage half-ranking for the Central Coast variants with nothing
 * to land on.
 *
 * Copy rules, so the pages stay true after the next nightly sync:
 * - No stock counts in the copy. The route injects the live number.
 * - popularModels are curated from the catalogue as it stood on 16 Sep 2026
 *   (largest model groups first). They are a hint for the template, which may
 *   prefer live model counts.
 * - Australian English, and the site-wide rule about dashes applies.
 *
 * The make field is the EXACT catalogue manufacturer key (uppercase), because
 * that is what the route filters live stock on.
 */

export type MakePageFaq = { question: string; answer: string };

export type MakePage = {
  /** -> /wreckers/[slug] */
  slug: string;
  /** Exact catalogue manufacturer key, uppercase. */
  make: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  /** Small caps line above the heading. */
  tagline: string;
  intro: string;
  /** Plain text. Paragraphs separated by a blank line; the template formats. */
  body: string;
  popularModels: string[];
  faq: MakePageFaq[];
  /** A matching blog guide to cross-link, where one exists. */
  blogSlug?: string;
};

export const MAKE_PAGES: MakePage[] = [
  {
    slug: "hyundai",
    make: "HYUNDAI",
    label: "Hyundai",
    title: "Hyundai Wreckers Central Coast | Used Hyundai Parts NSW",
    description:
      "Used Hyundai parts from the largest Hyundai stock on the Central Coast. i30, Tucson, iLoad, Santa Fe and more, tested, warrantied and shipped Australia-wide.",
    h1: "Hyundai Wreckers Central Coast",
    tagline: "HYUNDAI PARTS, BERKELEY VALE NSW",
    intro:
      "Hyundai is the single biggest make in our yard at Berkeley Vale, and by a wide margin. If you drive an i30, Tucson, iLoad, Accent, Santa Fe or ix35, there is a very good chance the part you need has already been removed, inspected and photographed, and is ready to collect or ship today.",
    body:
      "Hyundai became the make Australians actually buy, and that shows in what arrives at a wrecking yard. Late model i30 hatches and sedans, Tucsons across every generation, iLoad and iMax vans off tradie and courier fleets, Accents, Santa Fes and the ix35 that preceded the Tucson: these are the cars we dismantle most weeks, so the parts for them are not a matter of luck.\n\nWhat that depth means for you is choice. Common Hyundai jobs, a door in the right colour, a tailgate, a headlight, an alternator, a complete engine or gearbox, can usually be matched to your exact year and variant rather than a near enough alternative. For the iLoad and iMax in particular, where fleets keep vans running to high kilometres, we hold body panels, sliding door hardware, mirrors and mechanical parts that dealers often quote weeks for.\n\nEvery Hyundai part we sell is off a named donor vehicle with its odometer reading recorded, so you can see exactly where it came from. Give us your registration or VIN and we check fitment before anything leaves the yard, because Hyundai ran running changes inside model generations and the badge alone is not enough to guarantee a match.\n\nWe ship Hyundai parts Australia-wide daily with delivery quoted live at checkout, and Central Coast customers are welcome to collect from Berkeley Vale. Major components carry our warranty, and everything is sold with a tax invoice from a licensed NSW auto dismantler.",
    popularModels: ["i30", "Tucson", "iLoad / iMax", "Accent", "Santa Fe", "ix35", "Kona", "i40"],
    faq: [
      {
        question: "Do you have parts for my Hyundai i30?",
        answer:
          "Almost certainly. The i30 is the most common model in our yard, across hatch and sedan, petrol and diesel, from the mid 2000s to recent years. Search the catalogue by year or call us with your registration and we will confirm what is on the shelf.",
      },
      {
        question: "Can you supply iLoad and iMax van parts?",
        answer:
          "Yes, and this is one of our strongest lines. Body panels, sliding door components, mirrors, lights, engines and gearboxes for the iLoad and iMax are regularly in stock, and we ship them to fleets and workshops across Australia.",
      },
      {
        question: "Will a part from a different year Hyundai fit mine?",
        answer:
          "Sometimes, and sometimes not, because Hyundai made changes inside a model generation. Send us your VIN and we check the interchange before dispatch rather than guessing from the model name.",
      },
      {
        question: "Do used Hyundai parts come with a warranty?",
        answer:
          "Major components carry our parts warranty, and Australian Consumer Law protections apply because you are buying from a licensed business, not a private seller. Warranty terms are on our terms page and on every invoice.",
      },
    ],
  },

  {
    slug: "kia",
    make: "KIA",
    label: "Kia",
    title: "Kia Wreckers Central Coast | Used Kia Parts NSW",
    description:
      "Used Kia parts from Berkeley Vale: Carnival, Cerato, Rio, Sorento and Sportage. Tested off named donor cars, warrantied, shipped Australia-wide or collect.",
    h1: "Kia Wreckers Central Coast",
    tagline: "KIA PARTS, BERKELEY VALE NSW",
    intro:
      "Kia is the second largest make in our yard, led by an unusually deep stock of Carnival and Grand Carnival parts alongside Cerato, Rio, Sorento and Sportage. If you have been quoted a long wait for a genuine Kia part, there is a fair chance it is sitting on a shelf at Berkeley Vale.",
    body:
      "The Carnival is the reason our Kia stock is so deep. Australia bought them as family buses in huge numbers, they work hard, and when one is written off it yields dozens of parts that other Carnival owners need: sliding doors and their mechanisms, tailgates, seats in every row, mirrors, lights, and the mechanical components underneath. If you own a Carnival or Grand Carnival, we are the yard to ring first.\n\nBeyond the Carnival, we carry a steady flow of Cerato hatch and sedan parts, Rio, the K4, Sorento and Sportage, Optima and Picanto. Kia shares platforms and components with Hyundai, and because we hold the largest Hyundai stock on the Coast as well, our interchange knowledge across the two brands is genuinely useful when a part is scarce under one badge and plentiful under the other.\n\nEvery Kia part is removed from a named donor vehicle with its kilometres recorded, inspected, photographed and listed individually. Kia's warranty era means many owners keep these cars well past the factory cover, and a tested used part at a fraction of the new price is how they stay on the road economically.\n\nWe ship Australia-wide with delivery quoted at checkout, or you can collect from Berkeley Vale. Send your VIN with any enquiry and we confirm fitment before the part leaves.",
    popularModels: ["Carnival / Grand Carnival", "Cerato", "K4", "Rio", "Sorento", "Sportage", "Optima", "Picanto"],
    faq: [
      {
        question: "Do you stock Kia Carnival parts?",
        answer:
          "Yes, more than any other Kia model. Sliding door hardware, tailgates, seats, lights, mirrors, engines and gearboxes for the Carnival and Grand Carnival are regularly in stock. Tell us the year and we will check the exact fit.",
      },
      {
        question: "Are Kia and Hyundai parts interchangeable?",
        answer:
          "Some are, because the brands share platforms and components, and some are not. We hold large stocks of both makes and check the actual interchange against your VIN rather than assuming.",
      },
      {
        question: "Can you ship Kia parts interstate?",
        answer:
          "Yes. We send Kia parts everywhere in Australia daily, with freight quoted live at checkout. Larger items like doors, engines and gearboxes go by carrier to your workshop or door.",
      },
      {
        question: "How do I know the used part is in good condition?",
        answer:
          "Each part is inspected and photographed individually, listed against its donor car and odometer reading, and major components are sold with our warranty. You see the actual item, not a stock image.",
      },
    ],
    blogSlug: "kia-common-problems-australia",
  },

  {
    slug: "toyota",
    make: "TOYOTA",
    label: "Toyota",
    title: "Toyota Wreckers Central Coast | Used Toyota Parts NSW",
    description:
      "Used Toyota parts from Berkeley Vale: RAV4, Corolla, Camry, Kluger, Tarago and more. Inspected off named donors, warrantied, shipped Australia-wide or collect.",
    h1: "Toyota Wreckers Central Coast",
    tagline: "TOYOTA PARTS, BERKELEY VALE NSW",
    intro:
      "Toyota wreckers is the most searched wrecker term in Australia, and our Toyota stock is built around the models people actually own on the Central Coast: RAV4, Corolla, Camry and Kluger, plus Tarago and Estima people movers and HiAce vans. Genuine used Toyota parts, inspected and warrantied, from a licensed yard.",
    body:
      "Toyota parts hold their value because the cars last, which is exactly why a used genuine part makes sense: the donor may have done two hundred thousand kilometres and the panel, light or alternator you need is still a genuine Toyota part with plenty left in it. Our Toyota stock leans towards the passenger and SUV range, with RAV4 the single largest group, followed by Corolla, Camry and Kluger.\n\nFor RAV4 owners, we regularly hold tailgates, doors, mirrors, headlights, radiators and mechanical components across the generations Australians have bought since the early 2000s. Corolla and Camry parts move quickly because so many are on the road, so if you see the part listed, it is worth securing. Kluger, Tarago and Estima parts, particularly interior and body, are harder to find elsewhere and we are often the yard people are referred to.\n\nEvery Toyota part is listed against its donor vehicle with the odometer reading recorded, photographed individually and inspected before sale. Toyota changed specifications between series updates, so send your VIN or registration and we confirm fitment before dispatch.\n\nDelivery is quoted live at checkout to anywhere in Australia, or collect from Berkeley Vale. Major components carry our warranty and every sale comes with a tax invoice.",
    popularModels: ["RAV4", "Corolla", "Camry", "Kluger", "Tarago", "Estima", "HiAce"],
    faq: [
      {
        question: "Do you have Toyota RAV4 parts in stock?",
        answer:
          "The RAV4 is our largest Toyota model group. Body panels, tailgates, lights, mirrors, cooling parts and mechanical components are regularly available across the generations sold in Australia. Search by year or call with your registration.",
      },
      {
        question: "Do you stock Toyota HiLux parts?",
        answer:
          "Only occasionally. Our Toyota stock is concentrated on RAV4, Corolla, Camry, Kluger and the people movers. If you need a HiLux part, ask us and we will tell you honestly whether we have it or can source it.",
      },
      {
        question: "Are used Toyota parts genuine?",
        answer:
          "Yes. Every part we sell was fitted to a real Toyota by the factory or a dealer and removed by us. That is the point of buying from a wrecker rather than an aftermarket copy: it is the same part, with some kilometres on it.",
      },
      {
        question: "How quickly can you ship a Toyota part?",
        answer:
          "Parts in stock are dispatched within one to two business days with freight quoted at checkout. Central Coast customers can collect from Berkeley Vale, usually the same day.",
      },
    ],
    blogSlug: "toyota-hilux-common-problems-australia",
  },

  {
    slug: "subaru",
    make: "SUBARU",
    label: "Subaru",
    title: "Subaru Wreckers Central Coast | Used Subaru Parts NSW",
    description:
      "Used Subaru parts from Berkeley Vale: Forester, Impreza, Crosstrek, WRX, XV and Outback. Tested off named donors, warrantied, shipped Australia-wide or collect.",
    h1: "Subaru Wreckers Central Coast",
    tagline: "SUBARU PARTS, BERKELEY VALE NSW",
    intro:
      "Subaru owners tend to keep their cars a long time, and the Central Coast has more than its share of them. Our Subaru stock is one of the deepest in the yard, led by Forester, with strong Impreza, Crosstrek, WRX, XV and Outback lines, all removed from named donor cars and inspected before sale.",
    body:
      "Subaru parts are worth buying used because Subaru built the cars to be kept. A ten year old Forester is a perfectly good car that deserves a genuine panel or a genuine sensor, not a copy, and a wrecking yard is where genuine Subaru parts live at a fraction of the dealer price.\n\nThe Forester is our largest Subaru model group by a distance, followed by Impreza, the Crosstrek and XV that share so much with it, WRX and Outback. For Forester and Outback owners we regularly hold tailgates, doors, roof and body hardware, headlights, mirrors and the cooling and mechanical parts that wear on high kilometre cars. WRX parts, understandably, do not sit around long.\n\nSubaru engines and gearboxes are a specialist area and we treat them that way: every unit is listed with its donor kilometres, inspected, and sold with our warranty. If you are chasing a boxer engine or an all wheel drive gearbox, ask us about the donor history before you compare prices anywhere else.\n\nWe ship Subaru parts to every state with delivery quoted live at checkout, or you can collect from Berkeley Vale. Send your VIN with your enquiry so we can confirm the exact fit before anything leaves the yard.",
    popularModels: ["Forester", "Impreza", "Crosstrek", "WRX", "XV", "Outback", "BRZ"],
    faq: [
      {
        question: "Do you have Subaru Forester parts?",
        answer:
          "The Forester is our biggest Subaru line. Body panels, tailgates, lights, mirrors, suspension, cooling and mechanical parts are regularly in stock across the generations sold in Australia.",
      },
      {
        question: "Do you sell used Subaru engines and gearboxes?",
        answer:
          "Yes. Each unit is listed with its donor vehicle and odometer reading, inspected before sale and covered by our warranty on major components. Ask us for the donor history before you buy anywhere.",
      },
      {
        question: "Are XV and Crosstrek parts interchangeable with Impreza?",
        answer:
          "Often, because they share a platform, but not always. We check the interchange against your VIN so you get the right part the first time.",
      },
      {
        question: "Can I collect Subaru parts from your yard?",
        answer:
          "Yes, from Berkeley Vale on the Central Coast. If you are further away, we ship Australia-wide with freight quoted live at checkout.",
      },
    ],
  },

  {
    slug: "mitsubishi",
    make: "MITSUBISHI",
    label: "Mitsubishi",
    title: "Mitsubishi Wreckers Central Coast | Used Mitsubishi Parts",
    description:
      "Used Mitsubishi parts from Berkeley Vale: Triton, Lancer, Outlander, Pajero and Eclipse Cross. Inspected off named donors, warrantied, shipped Australia-wide.",
    h1: "Mitsubishi Wreckers Central Coast",
    tagline: "MITSUBISHI PARTS, BERKELEY VALE NSW",
    intro:
      "From Triton utes off worksites to Lancers, Outlanders and Pajeros off the school run, Mitsubishi is one of the most common makes through our yard. We hold genuine used Mitsubishi parts across all of them, inspected, photographed and listed against the donor vehicle they came from.",
    body:
      "The Triton is the heart of our Mitsubishi stock. Work utes lead hard lives and get written off, and every one we dismantle yields tubs, tailgates, doors, mirrors, lights, bars and the mechanical parts that other Triton owners need to keep working. If you run a Triton for a living, a genuine used panel from us is usually the quickest and cheapest way back on the job.\n\nLancer parts are the next largest group, followed by Outlander, Pajero and Eclipse Cross. Pajero owners in particular know how dear genuine parts have become; a wrecker is the sensible source for panels, glass, interior and the four wheel drive components that rarely need replacing but cost a fortune when they do.\n\nEvery Mitsubishi part we list is off a named donor with its odometer reading recorded and is inspected before sale. Mitsubishi ran long production runs with mid life changes, so we confirm fitment against your VIN or registration rather than the model year alone.\n\nWe ship Australia-wide with delivery quoted live at checkout, and Central Coast customers can collect from Berkeley Vale. Major components carry our warranty and every sale comes with a tax invoice from a licensed NSW dismantler.",
    popularModels: ["Triton", "Lancer", "Outlander", "Pajero", "Eclipse Cross"],
    faq: [
      {
        question: "Do you stock Mitsubishi Triton parts?",
        answer:
          "Yes, the Triton is our largest Mitsubishi line. Tubs, tailgates, doors, mirrors, lights, bars, engines and gearboxes are regularly in stock across the generations sold in Australia.",
      },
      {
        question: "Can you get Pajero parts?",
        answer:
          "We regularly hold Pajero body panels, glass, interior and mechanical parts, including four wheel drive components. Send your VIN and we will check what is on the shelf for your exact model.",
      },
      {
        question: "Do you sell Lancer and Outlander parts to workshops?",
        answer:
          "Yes. We supply mechanics and smash repairers across the Central Coast and Australia-wide, with trade enquiries welcome by phone or through the catalogue.",
      },
      {
        question: "Are the parts inspected before sale?",
        answer:
          "Every part is removed, inspected and photographed individually and listed against its donor vehicle with the kilometres recorded. Major components are sold with our warranty.",
      },
    ],
  },

  {
    slug: "mazda",
    make: "MAZDA",
    label: "Mazda",
    title: "Mazda Wreckers Central Coast | Used Mazda Parts NSW",
    description:
      "Used Mazda parts from Berkeley Vale: CX-5, BT-50, CX-9, Mazda 6, CX-7 and Mazda 3. Inspected off named donors, warrantied, shipped Australia-wide or collect.",
    h1: "Mazda Wreckers Central Coast",
    tagline: "MAZDA PARTS, BERKELEY VALE NSW",
    intro:
      "Mazda is one of the biggest sellers on the Central Coast and one of the biggest makes in our yard. We hold genuine used parts for the CX-5, BT-50, CX-9, Mazda 6, CX-7 and Mazda 3, each removed from a named donor vehicle, inspected and photographed before it is listed.",
    body:
      "The CX-5 leads our Mazda stock, which reflects how many of them Australians bought. Tailgates, doors, mirrors, headlights and taillights, radiators, and the engines and gearboxes underneath are regularly available across the generations. If your CX-5 has had a car park hit, a genuine used panel in the right colour is the repair that makes financial sense.\n\nThe BT-50 is our second largest Mazda line. It shares its underpinnings with the Ford Ranger, and because we also hold a deep Ranger stock, we can often help a BT-50 owner from either side of that shared platform when a part is scarce under one badge. CX-9, Mazda 6, CX-7 and Mazda 3 parts round out the range.\n\nMazda parts are worth buying used because the cars are well built and long lived; a genuine panel or component from a donor with recorded kilometres will outlast most aftermarket copies. Every part we list is inspected, and major components carry our warranty.\n\nSend your VIN or registration with any enquiry and we confirm the exact fit before dispatch. We ship Australia-wide with delivery quoted live at checkout, or collect from Berkeley Vale on the Central Coast.",
    popularModels: ["CX-5", "BT-50", "CX-9", "Mazda 6", "CX-7", "Mazda 3", "CX-30"],
    faq: [
      {
        question: "Do you have Mazda CX-5 parts?",
        answer:
          "The CX-5 is our largest Mazda model group. Panels, tailgates, lights, mirrors, cooling parts, engines and gearboxes are regularly in stock across the generations sold here. Search by year or call with your registration.",
      },
      {
        question: "Are BT-50 and Ford Ranger parts interchangeable?",
        answer:
          "Many mechanical and chassis parts are shared between the BT-50 and the Ranger of the same generation, while panels and interiors differ. We hold both makes and check the real interchange against your VIN.",
      },
      {
        question: "Do you ship Mazda parts interstate?",
        answer:
          "Yes, to every state, with freight quoted live at checkout. Panels and mechanical parts go by carrier to your door or your workshop.",
      },
      {
        question: "Is there a warranty on used Mazda parts?",
        answer:
          "Major components carry our parts warranty, and because you buy from a licensed business, Australian Consumer Law protections apply. Terms are on our terms page and every invoice.",
      },
    ],
  },

  {
    slug: "lexus",
    make: "LEXUS",
    label: "Lexus",
    title: "Lexus Wreckers Central Coast | Used Lexus Parts NSW",
    description:
      "Used Lexus parts from Berkeley Vale: RX, IS250, IS200 and IS300, CT200h, NX and GS. Genuine parts off named donors, warrantied, shipped Australia-wide or collect.",
    h1: "Lexus Wreckers Central Coast",
    tagline: "LEXUS PARTS, BERKELEY VALE NSW",
    intro:
      "Genuine Lexus parts are expensive new and often slow to arrive, which is why our Lexus stock matters. We hold parts for the RX range, IS250 and IS250C, IS200 and IS300, CT200h, NX and GS, removed from named donor vehicles, inspected and photographed, at a fraction of the dealer price.",
    body:
      "The RX is our largest Lexus model group, followed by the IS range across its generations. Owners of these cars usually want genuine parts, and rightly so: a Lexus is built to a standard that aftermarket copies rarely match. A used genuine panel, light, mirror or component from a low kilometre donor is the way to keep a Lexus genuinely Lexus without the dealer bill.\n\nWe regularly hold body panels, headlights and taillights, mirrors, interior trim and electronics, and the mechanical parts for the RX, IS, CT200h and NX. Lexus interiors in particular are worth sourcing used; leather seats, trims and switchgear are among the dearest items to buy new and among the most durable to buy second hand.\n\nLexus shares a great deal with Toyota underneath, and because we hold deep Toyota stock as well, we can sometimes help with a mechanical part under the Toyota badge when the Lexus badged version is scarce. We check every interchange against your VIN before dispatch.\n\nEvery part is inspected, listed against its donor with kilometres recorded, and major components carry our warranty. We ship Australia-wide with delivery quoted at checkout, or collect from Berkeley Vale.",
    popularModels: ["RX", "IS250 / IS250C", "IS200 / IS300", "CT200h", "NX", "GS"],
    faq: [
      {
        question: "Do you have Lexus RX parts in stock?",
        answer:
          "The RX is our largest Lexus line. Body panels, lights, mirrors, interior and mechanical parts are regularly available across the generations sold in Australia. Search by year or call with your registration.",
      },
      {
        question: "Can Toyota parts be used on a Lexus?",
        answer:
          "Some mechanical parts are shared with Toyota models underneath, while body and interior parts are Lexus specific. We hold both makes and confirm the real interchange against your VIN.",
      },
      {
        question: "Are used Lexus interior parts worth buying?",
        answer:
          "Very much so. Seats, trims and switchgear are among the most expensive Lexus items new and among the most durable second hand. Every interior part is photographed so you see its actual condition.",
      },
      {
        question: "Do you ship Lexus parts Australia-wide?",
        answer:
          "Yes, with delivery quoted live at checkout. Central Coast customers can collect from Berkeley Vale.",
      },
    ],
  },

  {
    slug: "nissan",
    make: "NISSAN",
    label: "Nissan",
    title: "Nissan Wreckers Central Coast | Used Nissan Parts NSW",
    description:
      "Used Nissan parts from Berkeley Vale: Navara, X-Trail, Elgrand, Pulsar and Pathfinder. Inspected off named donors, warrantied, shipped Australia-wide or collect.",
    h1: "Nissan Wreckers Central Coast",
    tagline: "NISSAN PARTS, BERKELEY VALE NSW",
    intro:
      "Nissan parts are a strong line in our yard, led by the Navara ute and the X-Trail, with Elgrand people movers, Pulsar and Pathfinder behind them. Every Nissan part is removed from a named donor vehicle, inspected, photographed and listed with its kilometres, then shipped Australia-wide or collected from Berkeley Vale.",
    body:
      "The Navara is our largest Nissan model group. Like every work ute, it gets used hard and written off often, and each one we dismantle supplies the tubs, tailgates, doors, mirrors, lights and mechanical parts that keep other Navaras earning. If you run a Navara, we are worth a call before the dealer.\n\nThe X-Trail is next, with panels, tailgates, lights and mechanical parts regularly in stock across its generations. Elgrand parts are a specialty: these imported people movers are hard to source parts for in Australia, and our stock of Elgrand doors, interior, glass and mechanical components is one of the reasons owners find us from interstate. Pulsar and Pathfinder round out the range.\n\nEvery Nissan part is inspected before sale and listed against its donor with the odometer reading recorded. Nissan changed specifications between series, so we confirm fitment against your VIN or registration rather than the model year alone.\n\nWe ship Australia-wide daily with delivery quoted live at checkout. Major components carry our warranty and every sale comes with a tax invoice from a licensed NSW dismantler.",
    popularModels: ["Navara", "X-Trail", "Elgrand", "Pulsar", "Pathfinder"],
    faq: [
      {
        question: "Do you stock Nissan Navara parts?",
        answer:
          "Yes, the Navara is our largest Nissan line. Tubs, tailgates, doors, mirrors, lights, engines and gearboxes are regularly in stock across the generations sold in Australia.",
      },
      {
        question: "Can you get Nissan Elgrand parts?",
        answer:
          "Yes, and we are one of the few yards that regularly can. Elgrand doors, interior, glass and mechanical parts are often in stock, and we ship them interstate for owners who cannot find them locally.",
      },
      {
        question: "Do you have X-Trail body panels?",
        answer:
          "Regularly, including tailgates, doors, bonnets and bumpers across the generations. Send your VIN and colour and we will check what is on the shelf.",
      },
      {
        question: "Is there a warranty on used Nissan parts?",
        answer:
          "Major components carry our parts warranty, and Australian Consumer Law applies because you buy from a licensed business. Terms are on our terms page and every invoice.",
      },
    ],
  },

  {
    slug: "ford",
    make: "FORD",
    label: "Ford",
    title: "Ford Wreckers Central Coast | Used Ford Parts NSW",
    description:
      "Used Ford parts from Berkeley Vale, led by a deep Ranger stock plus Escape and Transit. Inspected off named donors, warrantied, shipped Australia-wide or collect.",
    h1: "Ford Wreckers Central Coast",
    tagline: "FORD PARTS, BERKELEY VALE NSW",
    intro:
      "Our Ford stock is built around the Ranger, Australia's other best selling ute, with Escape and Transit parts alongside it. If you need a genuine used Ranger part, tub, tailgate, door, light, engine or gearbox, it has very likely already been removed from a named donor, inspected and photographed at Berkeley Vale.",
    body:
      "The Ranger dominates our Ford stock the way it dominates Australian roads. PX, PX2 and PX3 Rangers arrive at the yard regularly, and each one yields the parts that other Ranger owners search for: tubs and tailgates from work damage, doors and mirrors, headlights, bars, and the mechanical components underneath, including gearboxes and engines with recorded donor kilometres.\n\nBecause the Ranger shares its platform with the Mazda BT-50 of the same generation, and we hold a deep BT-50 stock as well, we can often help from either side when a mechanical part is scarce under one badge. We check the real interchange against your VIN rather than assuming.\n\nEscape and Transit parts complete the range. Transit owners in particular, running vans for a living, know how expensive genuine panels and mirrors are new; a genuine used part from us is usually the fastest and cheapest way back on the road.\n\nEvery Ford part is inspected before sale, listed against its donor with the odometer reading recorded, and major components carry our warranty. We ship Australia-wide with delivery quoted live at checkout, or you can collect from Berkeley Vale on the Central Coast.",
    popularModels: ["Ranger", "Escape", "Transit"],
    faq: [
      {
        question: "Do you stock Ford Ranger parts?",
        answer:
          "Yes, the Ranger is our largest Ford line by far. Tubs, tailgates, doors, mirrors, lights, bars, engines and gearboxes are regularly in stock across PX, PX2 and PX3 generations.",
      },
      {
        question: "Do you have used Ranger gearboxes?",
        answer:
          "Regularly, both automatic and manual, listed with the donor vehicle and its kilometres and covered by our warranty on major components. Tell us your engine and year and we will confirm what is available.",
      },
      {
        question: "Are Ranger and BT-50 parts interchangeable?",
        answer:
          "Many mechanical and chassis parts are shared between the two for the same generation, while panels and interiors differ. We hold both makes and check the real interchange against your VIN.",
      },
      {
        question: "Can you ship Ford parts to my workshop?",
        answer:
          "Yes, Australia-wide, with freight quoted live at checkout. We supply mechanics and smash repairers as well as owners, and trade enquiries are welcome.",
      },
    ],
    blogSlug: "ford-ranger-common-problems-australia",
  },

  {
    slug: "holden",
    make: "HOLDEN",
    label: "Holden",
    title: "Holden Wreckers Central Coast | Used Holden Parts NSW",
    description:
      "Used Holden parts from Berkeley Vale, led by Colorado with Commodore alongside. Genuine parts for a make no longer made, inspected, warrantied, shipped Australia-wide.",
    h1: "Holden Wreckers Central Coast",
    tagline: "HOLDEN PARTS, BERKELEY VALE NSW",
    intro:
      "Holden stopped being made in 2020, which means wreckers are now the main supply of genuine parts for every Holden still on the road. Our Holden stock is led by the Colorado ute, with Commodore parts alongside, each removed from a named donor, inspected and photographed at Berkeley Vale.",
    body:
      "With no factory behind the brand, a genuine Holden part is a finite thing, and that changes how you should think about buying. If you rely on a Colorado for work, the panels, tailgates, doors, mirrors and mechanical parts we hold today are the ones that will be hard to find in a few years. Buying the part you know your ute will need, while it is plentiful and cheap, is not hoarding; it is planning.\n\nThe Colorado is by some distance our largest Holden line, reflecting how many were sold as work and family utes. Commodore parts come through in smaller numbers and sell quickly, particularly anything body style specific, so if you see a Commodore part listed that fits your car, it is worth securing.\n\nEvery Holden part is inspected, photographed and listed against its donor vehicle with the odometer reading recorded. Holden ran running changes and multiple body styles, so we confirm fitment against your VIN rather than the badge.\n\nWe ship Australia-wide with delivery quoted live at checkout, or collect from Berkeley Vale. And if you have a Holden that is no longer worth repairing, we buy them for parts: one donor keeps a dozen other Holdens on the road.",
    popularModels: ["Colorado", "Commodore"],
    faq: [
      {
        question: "Can you still get Holden parts now the brand is gone?",
        answer:
          "Yes. Dismantled Holdens are the main source of genuine parts now, and we hold a steady stock led by the Colorado. The older or rarer your Holden, the more it pays to buy needed parts early while donors are common.",
      },
      {
        question: "Do you stock Holden Colorado parts?",
        answer:
          "The Colorado is our largest Holden line. Panels, tailgates, doors, mirrors, lights, engines and gearboxes are regularly in stock. Send your VIN and we will confirm the exact fit.",
      },
      {
        question: "Do you have Commodore parts?",
        answer:
          "In smaller numbers than Colorado, and they sell fast. Check the catalogue or call us; if we do not have the part today, tell us what you need and we will let you know when a donor comes in.",
      },
      {
        question: "Will you buy my old Holden for parts?",
        answer:
          "Yes. We buy Holdens for parts across the Central Coast, collect the car and handle the paperwork. Use the Sell Your Car page or call us with the details.",
      },
    ],
    blogSlug: "holden-wreckers-parts-guide",
  },
];

/** Lookup by slug for the route. */
export function makePageBySlug(slug: string): MakePage | undefined {
  return MAKE_PAGES.find((page) => page.slug === slug);
}
