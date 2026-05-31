"""
Round 2 translation update — legal + remaining pages (2026-05-31)
Writes nl.json (verbatim NL) then rebuilds en.json and 4 sentinel locales.
"""
import json
import copy
import os

ROOT = r"C:\Users\cruzb\Projects\alpaca-farm-redesign\translations"

nl = json.load(open(os.path.join(ROOT, "nl.json"), encoding="utf-8"))
en = json.load(open(os.path.join(ROOT, "en.json"), encoding="utf-8"))

# ──────────────────────────────────────────────────────────────────────────────
# 1. TERMS — replace 7-section stub with full 18-article live T&C
# ──────────────────────────────────────────────────────────────────────────────
nl["terms"] = {
    "title": "Algemene Voorwaarden",
    "subtitle": "Lees deze voorwaarden voordat u gebruikmaakt van onze website en boekingsdiensten",
    "lastUpdated": "Geen datum vermeld op de pagina. Neem contact op via info@alpacasibiza.com met vragen.",
    "art1Title": "Artikel 1 - Begripsomschrijvingen",
    "art1Items": [
        "Aanvullende overeenkomst: een overeenkomst waarbij de consument op afstand producten of diensten verwerft met betrekking tot een eerdere overeenkomst op afstand.",
        "Bedenktijd: de termijn waarbinnen de consument gebruik kan maken van zijn herroepingsrecht.",
        "Consument: de natuurlijke persoon die niet handelt voor doeleinden in verband met zijn handels-, bedrijfs-, ambachts- of beroepsactiviteit.",
        "Dag: kalenderdag.",
        "Digitale inhoud: gegevens die in digitale vorm geproduceerd en geleverd worden.",
        "Duurovereenkomst: een overeenkomst die strekt tot de regelmatige levering van zaken, diensten en/of digitale inhoud gedurende een bepaalde periode.",
        "Duurzame gegevensdrager: ieder hulpmiddel dat de consument of ondernemer in staat stelt om informatie op te slaan op een manier die toekomstige raadpleging mogelijk maakt.",
        "Herroepingsrecht: de mogelijkheid van de consument om binnen de bedenktijd af te zien van de overeenkomst op afstand.",
        "Modelformulier voor herroeping: het Europese modelformulier voor herroeping dat op de website beschikbaar wordt gesteld.",
        "Ondernemer: de natuurlijke of rechtspersoon die producten, (toegang tot) digitale inhoud en/of diensten op afstand aan consumenten aanbiedt.",
        "Overeenkomst op afstand: een overeenkomst die tussen de ondernemer en de consument wordt gesloten in het kader van een georganiseerd systeem voor verkoop op afstand.",
        "Techniek voor communicatie op afstand: middel dat gebruikt kan worden voor het sluiten van een overeenkomst zonder dat consument en ondernemer tegelijkertijd in dezelfde ruimte zijn."
    ],
    "art2Title": "Artikel 2 - Identiteit van de ondernemer",
    "art2Items": [
        "Naam: Sandra De Wilde - Es Currals Alpacas Ibiza & Wishfulfilling Weaving",
        "Adres: C/3 Bungalow Park 22, 07850 San Carlos Baleares Espana",
        "Telefoon: +34 689 446 781",
        "E-mail: info@alpacasibiza.com",
        "BTW-nummer: ESY6917111J"
    ],
    "art3Title": "Artikel 3 - Toepasselijkheid",
    "art3Text": "Deze algemene voorwaarden zijn van toepassing op elk aanbod van de ondernemer en op elke tot stand gekomen overeenkomst op afstand. Voordat een overeenkomst op afstand wordt gesloten, wordt de tekst van deze algemene voorwaarden aan de consument beschikbaar gesteld, hetzij op schrift hetzij op een duurzame gegevensdrager.",
    "art4Title": "Artikel 4 - Het aanbod",
    "art4Text": "Afbeeldingen zijn een waarheidsgetrouwe weergave van de aangeboden producten. Kennelijke vergissingen of fouten in het aanbod binden de ondernemer niet. Elk aanbod bevat zodanige informatie dat voor de consument duidelijk is wat de rechten en verplichtingen zijn die aan de aanvaarding van het aanbod zijn verbonden.",
    "art5Title": "Artikel 5 - De overeenkomst",
    "art5Text": "De overeenkomst komt tot stand op het moment van aanvaarding door de consument van het aanbod en het voldoen aan de daarbij gestelde voorwaarden. De ondernemer bevestigt langs elektronische weg de ontvangst van de aanvaarding. Zolang de ontvangst niet is bevestigd, kan de consument de overeenkomst ontbinden.",
    "art6Title": "Artikel 6 - Herroepingsrecht",
    "art6ProductText": "Bij producten: De consument kan een overeenkomst met betrekking tot de aankoop van een product gedurende een bedenktijd van minimaal 14 dagen zonder opgave van redenen ontbinden.",
    "art6ServicesText": "Bij diensten en digitale inhoud: De consument kan een dienstenovereenkomst en een overeenkomst voor niet op een materiele drager geleverde digitale inhoud gedurende minimaal 14 dagen zonder opgave van redenen ontbinden.",
    "art6ExtendedText": "Verlengde bedenktijd: Als de ondernemer de consument de wettelijk verplichte informatie over het herroepingsrecht niet heeft verstrekt, loopt de bedenktijd af twaalf maanden na het einde van de oorspronkelijke bedenktijd.",
    "art7Title": "Artikel 7 - Verplichtingen van de consument tijdens de bedenktijd",
    "art7Text": "De consument zal zorgvuldig omgaan met het product en de verpakking. Hij zal het product slechts uitpakken of gebruiken in de mate die nodig is om de aard, de kenmerken en de werking van het product vast te stellen. De consument is aansprakelijk voor waardevermindering van het product die het gevolg is van een manier van omgaan met het product die verder gaat dan toegestaan.",
    "art8Title": "Artikel 8 - Uitoefening van het herroepingsrecht door de consument en kosten daarvan",
    "art8Text": "Als de consument gebruik maakt van zijn herroepingsrecht, meldt hij dit binnen de bedenktermijn via het modelformulier voor herroeping of op een andere ondubbelzinnige wijze aan de ondernemer. Het product dient binnen 14 dagen na de melding te worden geretourneerd, in de originele staat samen met alle geleverde toebehoren. De consument draagt de directe kosten van het terugzenden van het product.",
    "art9Title": "Artikel 9 - Verplichtingen van de ondernemer bij herroeping",
    "art9Text": "De ondernemer vergoedt alle betalingen van de consument, inclusief eventuele leveringskosten, zo snel mogelijk doch binnen 14 dagen volgend op de dag waarop de consument hem de herroeping meldt. Terugbetaling geschiedt via hetzelfde betaalmiddel als door de consument gebruikt, tenzij de consument instemt met een andere methode.",
    "art10Title": "Artikel 10 - Uitsluiting herroepingsrecht",
    "art10Text": "De ondernemer kan de volgende producten en diensten uitsluiten van het herroepingsrecht:",
    "art10Items": [
        "Producten waarvan de prijs gebonden is aan schommelingen op de financiele markt",
        "Producten aangeschaft via een openbare veiling",
        "Volledig uitgevoerde diensten (met voorafgaande uitdrukkelijke toestemming van de consument)",
        "Pakketreizen en personenvervoer",
        "Accommodaties voor een bepaalde datum",
        "Evenementen en voorstellingen met een bepaalde datum",
        "Op maat gemaakte of gepersonaliseerde producten",
        "Snel bederfelijke producten",
        "Verzegelde gezondheids- of hygieneproducten die na levering zijn geopend",
        "Producten die na levering onlosmakelijk met andere producten zijn vermengd",
        "Alcoholische dranken met prijsafspraken bij orderdatum",
        "Verzegelde audio/video/software-opnames die na levering zijn geopend",
        "Kranten, tijdschriften of magazines (behalve abonnementen)",
        "Niet op een materiele drager geleverde digitale inhoud (met voorafgaande toestemming)"
    ],
    "art11Title": "Artikel 11 - De prijs",
    "art11Text": "Gedurende de in het aanbod vermelde geldigheidsduur worden de prijzen van de aangeboden producten en/of diensten niet verhoogd, behalve bij BTW-wijzigingen. De in het aanbod van producten of diensten genoemde prijzen zijn inclusief btw. Prijsverhogingen binnen 3 maanden na de totstandkoming zijn alleen toegestaan indien zij het gevolg zijn van wettelijke regelingen. Na 3 maanden is een prijsverhoging alleen toegestaan indien de ondernemer dit overeengekomen is met de consument.",
    "art12Title": "Artikel 12 - Nakoming overeenkomst en extra garantie",
    "art12Text": "De ondernemer staat er voor in dat de producten en/of diensten voldoen aan de overeenkomst, de in het aanbod vermelde specificaties, aan de redelijke eisen van deugdelijkheid en/of bruikbaarheid en de op de datum van de totstandkoming van de overeenkomst bestaande wettelijke bepalingen en/of overheidsvoorschriften.",
    "art13Title": "Artikel 13 - Levering en uitvoering",
    "art13Text": "De ondernemer zal de grootst mogelijke zorgvuldigheid in acht nemen bij het in ontvangst nemen en bij de uitvoering van bestellingen van producten en bij de beoordeling van verzoeken tot verlening van diensten. De ondernemer zal geaccepteerde bestellingen met bekwame spoed doch uiterlijk binnen 30 dagen uitvoeren, tenzij een andere leveringstermijn is overeengekomen. Het risico van beschadiging en/of vermissing van producten berust bij de ondernemer tot het moment van bezorging aan de consument.",
    "art14Title": "Artikel 14 - Duurtransacties: duur, opzegging en verlenging",
    "art14Text": "De consument kan een overeenkomst die voor onbepaalde tijd is gesloten te allen tijde opzeggen met inachtneming van een opzegtermijn van ten hoogste een maand. Een overeenkomst die voor bepaalde tijd is gesloten heeft een looptijd van maximaal twee jaar. Stilzwijgende verlenging is alleen toegestaan voor kranten, tijdschriften en magazines met een maximale verlengingsperiode van drie maanden.",
    "art15Title": "Artikel 15 - Betaling",
    "art15Text": "De door de consument verschuldigde bedragen dienen te worden voldaan binnen 14 dagen na het ingaan van de bedenktermijn, of bij ontbreken van een bedenktermijn, binnen 14 dagen na het sluiten van de overeenkomst. Vooruitbetaling mag niet meer dan 50% van de aankoopprijs bedragen. Bij niet tijdige betaling is de consument, na kennisgeving door de ondernemer, de wettelijke rente verschuldigd over het nog verschuldigde bedrag.",
    "art16Title": "Artikel 16 - Klachtenregeling",
    "art16Text": "De ondernemer beschikt over een voldoende bekendgemaakte klachtenprocedure. Klachten over de uitvoering van de overeenkomst moeten binnen bekwame tijd nadat de consument de gebreken heeft geconstateerd, volledig en duidelijk omschreven worden ingediend bij de ondernemer. Ingediende klachten worden binnen een termijn van 14 dagen gerekend vanaf de datum van ontvangst beantwoord.",
    "art17Title": "Artikel 17 - Geschillen",
    "art17Text": "Op overeenkomsten tussen de ondernemer en de consument waarop deze algemene voorwaarden betrekking hebben, is uitsluitend Spaans recht van toepassing.",
    "art18Title": "Artikel 18 - Aanvullende of afwijkende bepalingen",
    "art18Text": "Aanvullende dan wel van deze algemene voorwaarden afwijkende bepalingen mogen niet ten nadele van de consument zijn en dienen schriftelijk te worden vastgelegd dan wel op zodanige wijze dat deze door de consument op een toegankelijke manier kunnen worden opgeslagen op een duurzame gegevensdrager."
}

# ──────────────────────────────────────────────────────────────────────────────
# 2. CORPORATE — enrich with live verbatim copy
# ──────────────────────────────────────────────────────────────────────────────
nl["corporate"]["liveBodyNL"] = (
    "Geen betere plek om met je zakelijke collegas achteruit en vooruit te blikken dan "
    "temidden van onze alpacas in de pure natuur van Noord-Ibiza. Een omgeving van pure zen "
    "die alleen maar verse inspiratie en geniale ideeen oplevert! Op aanvraag verzorgen we een "
    "compleet pakket met catering ter plekke of in een van de diverse gezellige nabijgelegen restaurantjes."
)
nl["corporate"]["subheadAlt"] = "Blikken te midden van onze alpacas in de pure natuur van Noord-Ibiza"

# ──────────────────────────────────────────────────────────────────────────────
# 3. WEDDINGS — full NL from live site
# ──────────────────────────────────────────────────────────────────────────────
nl["weddings"] = {
    "eyebrow": "Bruiloften & Fotoshoots",
    "title": "Alpacas op Jouw Bruiloft",
    "subtitle": (
        "Alpaca-verlovingen, alpaca weddings en alpaca trouwfotos zijn in de VS al jaren de trend "
        "— nu ook in Europa. Als eerste en enige alpacaboerderij op Ibiza bieden wij unieke "
        "bruiloftservaringen temidden van onze 14 alpacas."
    ),
    "includedTitle": "Wat is Inbegrepen",
    "includedSubtitle": "Pakketdetails worden op maat gemaakt voor jouw evenement. Neem contact op voor een volledige offerte.",
    "contactForDetails": "Neem contact op voor details",
    "useCasesTitle": "Perfect voor Elke Gelegenheid",
    "useCases": {
        "bridal": "Bruidsreportage",
        "ringBearer": "Ring-drager ceremonie",
        "engagement": "Verlovingsportret",
        "family": "Familie-fotosessie",
        "socialMedia": "Social media & content shoots"
    },
    "details": {
        "alpacaCount": "Alpacas inbegrepen",
        "duration": "Duur",
        "radius": "Reisradius buiten locatie",
        "handler": "Begeleider"
    },
    "welfareTitle": "Dierenwelzijn Staat Voorop",
    "welfareText": (
        "Onze alpacas zijn gesocialiseerd, rustig en gewend aan bezoekers. Alle optredens worden "
        "begeleid door een ervaren handler. We accepteren alleen boekingen waarbij we zeker zijn "
        "dat het veilig en prettig is voor de kudde."
    ),
    "welfare": {
        "gentle": "Zacht & gesocialiseerd",
        "gentleDesc": "Onze kudde is gewend aan mensen en rustig in nieuwe omgevingen.",
        "supervised": "Altijd begeleid",
        "supervisedDesc": "Een ervaren handler begeleidt elk optreden.",
        "allergy": "Hypoallergeen vlies",
        "allergyDesc": "Alpacavezel is laag-allergeen — vriendelijk voor gevoelige gasten."
    },
    "bookingTitle": "Plan Jouw Bruiloft met Alpacas",
    "bookingText": (
        "Of je nu op onze finca trouwt of wil dat wij de alpacas naar jouw locatie brengen: "
        "we werken samen om de perfecte ervaring te creeren. Neem contact op om te beginnen met plannen."
    ),
    "bookAtFarm": "Boek op de Boerderij",
    "bookOffSite": "Aanvraag buiten locatie",
    "faq": {
        "notice": {
            "q": "Hoe ver van tevoren moet ik boeken?",
            "a": (
                "We raden aan zo vroeg mogelijk te boeken — minimaal 4-6 weken van tevoren voor "
                "fotoshoots en zo vroeg mogelijk voor bruiloften. Populaire data zijn snel "
                "volgeboekt in het hoogseizoen (mei-oktober)."
            )
        },
        "location": {
            "q": "Kunnen jullie alpacas naar onze locatie brengen?",
            "a": (
                "Ja, externe optredens zijn mogelijk. Neem contact op met je locatiegegevens en "
                "we bevestigen of het binnen ons reisgebied valt en geven een offerte."
            )
        },
        "kids": {
            "q": "Zijn alpacas veilig rondom kinderen?",
            "a": (
                "Ja. Onze alpacas zijn gesocialiseerd en rustig. Alle interacties worden begeleid "
                "door een handler. We adviseren kinderen rustig te benaderen en de aanwijzingen "
                "van de handler op te volgen."
            )
        },
        "cancellation": {
            "q": "Wat is jullie annuleringsbeleid voor bruiloften?",
            "a": (
                "Annuleringsvoorwaarden zijn afhankelijk van het pakket. Neem contact op voor "
                "het specifieke beleid voor jouw boeking. We streven ernaar zo flexibel mogelijk te zijn."
            )
        }
    }
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. ABOUT — add metaTitle if missing
# ──────────────────────────────────────────────────────────────────────────────
if "metaTitle" not in nl["about"]:
    nl["about"]["metaTitle"] = "Over Alpacas Ibiza - Es Currals Boerderij"

# ──────────────────────────────────────────────────────────────────────────────
# 5. WEAVING — fill all missing keys from live content
# ──────────────────────────────────────────────────────────────────────────────
nl["weaving"].update({
    "processTitle": "Van vlies tot afgewerkt weefsel",
    "processStep1Title": "Scheren",
    "processStep1Body": (
        "Elk voorjaar worden de alpacas met de hand geschoren op Es Currals. "
        "De zachte vliesjes worden per dier zorgvuldig bewaard."
    ),
    "processStep2Title": "Wassen & Kaarden",
    "processStep2Body": (
        "San wast en kaard het vlies met de hand. Geen industrieel proces — pure ambachtelijkheid."
    ),
    "processStep3Title": "Spinnen & Verven",
    "processStep3Body": (
        "Het garen wordt gesponnen en geverd met natuurlijke plantenextracten — "
        "hibiscus, avocado en andere bloemen."
    ),
    "processStep4Title": "Weven op Big Ben",
    "processStep4Body": (
        "San weeft op een traditioneel Zweeds houten weefgetouw genaamd Big Ben, met eeuwenoude "
        "patronen uit historische manuscripten, gecombineerd met hedendaagse mode."
    ),
    "studioHistoryTitle": "Het Atelier",
    "studioHistoryBody": (
        "San raakte in 2013 in de ban van het weven. Ze begon met kleine tafelweefgetouwen en "
        "investeerde vervolgens in een traditioneel Zweeds houten weefgetouw van een 92-jarige "
        "meester-wever die haar priveles gaf en de naam Big Ben gaf aan het getouw. Elke stap "
        "van scheren tot afgewerkt doek wordt met de hand gedaan op Es Currals. Zachter dan zijde, "
        "zeldzamer dan cashmere, warmer dan schapenwol — en hypoallergeen."
    ),
    "photoStudio": "[UNMAPPED – foto atelier interieur]",
    "photoLoom": "[UNMAPPED – foto weefgetouw in actie]",
    "photoScarves": "[UNMAPPED – foto afgewerkte sjaals]",
    "ownerConfirmHeader": "Eigenaar bevestiging vereist",
    "ownerConfirmBody": (
        "De volgende items zijn nog niet bevestigd door de eigenaar en moeten worden aangevuld voor de lancering:"
    ),
    "collectionTitle": "One With Nature",
    "collectionSubhead": "Made in Ibiza, embracing the world — Ontdek onze eigen collectie",
    "enquireCta": "Aanvraag doen",
    "priceOnRequest": "Prijs op aanvraag",
    "crossSellYogaTitle": "Yoga bij de Alpacas",
    "crossSellYogaBody": "Begin de dag met een yoga-sessie terwijl de kudde vrij graast op de finca.",
    "crossSellWorkshopsTitle": "Weefworkshops",
    "crossSellWorkshopsBody": "Leer weven op een traditioneel weefgetouw in het atelier van San op Es Currals."
})

# Write NL
with open(os.path.join(ROOT, "nl.json"), "w", encoding="utf-8") as f:
    json.dump(nl, f, ensure_ascii=False, indent=2)
print("NL saved. terms keys:", len(nl["terms"]), "| weaving keys:", len(nl["weaving"]), "| weddings keys:", len(nl["weddings"]))

# ──────────────────────────────────────────────────────────────────────────────
# 6. EN — rebuild terms to 18 articles + add weddings + weaving keys
# ──────────────────────────────────────────────────────────────────────────────
en["terms"] = {
    "title": "General Terms and Conditions",
    "subtitle": "Please read these terms before using our website and booking services",
    "lastUpdated": "No date shown on the live page. Contact info@alpacasibiza.com with questions.",
    "art1Title": "Article 1 - Definitions",
    "art1Items": [
        "Supplementary agreement: a contract whereby the consumer acquires products or services at a distance in relation to an earlier distance contract.",
        "Cooling-off period: the period within which the consumer may exercise their right of withdrawal.",
        "Consumer: the natural person who does not act for purposes relating to their trade, business, craft or professional activity.",
        "Day: calendar day.",
        "Digital content: data produced and supplied in digital form.",
        "Duration contract: a contract for the regular supply of goods, services and/or digital content over a set period.",
        "Durable medium: any tool enabling the consumer or entrepreneur to store information for future reference.",
        "Right of withdrawal: the consumer's ability to cancel a distance contract within the cooling-off period.",
        "Model withdrawal form: the European model withdrawal form made available on the website.",
        "Entrepreneur: the natural or legal person offering products, access to digital content and/or services to consumers at a distance.",
        "Distance contract: a contract concluded between the entrepreneur and the consumer within an organised distance-selling system.",
        "Distance communication technique: any means enabling a contract to be concluded without the consumer and entrepreneur being simultaneously present in the same space."
    ],
    "art2Title": "Article 2 - Entrepreneur Identity",
    "art2Items": [
        "Name: Sandra De Wilde - Es Currals Alpacas Ibiza & Wishfulfilling Weaving",
        "Address: C/3 Bungalow Park 22, 07850 San Carlos Baleares Spain",
        "Telephone: +34 689 446 781",
        "Email: info@alpacasibiza.com",
        "VAT number: ESY6917111J"
    ],
    "art3Title": "Article 3 - Applicability",
    "art3Text": (
        "These general terms and conditions apply to every offer by the entrepreneur and to every "
        "distance contract concluded. Before a distance contract is formed, the text of these terms "
        "is made available to the consumer either in writing or on a durable medium."
    ),
    "art4Title": "Article 4 - The Offer",
    "art4Text": (
        "Images truthfully represent the products offered. Obvious errors do not bind the entrepreneur. "
        "Every offer contains sufficient information for the consumer to understand the rights and "
        "obligations arising from acceptance."
    ),
    "art5Title": "Article 5 - The Agreement",
    "art5Text": (
        "The contract is formed at the moment the consumer accepts the offer and meets its conditions. "
        "The entrepreneur confirms receipt of acceptance electronically. Until receipt is confirmed, "
        "the consumer may cancel the contract."
    ),
    "art6Title": "Article 6 - Right of Withdrawal",
    "art6ProductText": (
        "For products: the consumer may cancel a product purchase within a minimum cooling-off period "
        "of 14 days without stating reasons."
    ),
    "art6ServicesText": (
        "For services and non-physical digital content: the consumer may cancel within a minimum of "
        "14 days without stating reasons. The period begins the day after the contract is formed."
    ),
    "art6ExtendedText": (
        "Extended cooling-off period: if the entrepreneur fails to provide the required withdrawal "
        "information, the cooling-off period expires twelve months after the end of the original period."
    ),
    "art7Title": "Article 7 - Consumer Obligations During the Cooling-Off Period",
    "art7Text": (
        "The consumer shall handle the product and its packaging with care. They may only unpack or "
        "use the product to the extent necessary to assess its nature, characteristics and functioning. "
        "The consumer is liable for any diminished value resulting from handling that goes beyond what is permitted."
    ),
    "art8Title": "Article 8 - Exercising the Right of Withdrawal and Associated Costs",
    "art8Text": (
        "If the consumer exercises their right of withdrawal, they must notify the entrepreneur within "
        "the cooling-off period using the model withdrawal form or another unambiguous statement. "
        "The product must be returned within 14 days of notification in its original condition with "
        "all accessories. The consumer bears the direct cost of return shipping."
    ),
    "art9Title": "Article 9 - Entrepreneur Obligations Upon Withdrawal",
    "art9Text": (
        "The entrepreneur shall refund all consumer payments, including delivery costs, as quickly "
        "as possible and within 14 days of the withdrawal notice. Refunds are made via the same "
        "payment method used by the consumer, unless the consumer agrees to a different method."
    ),
    "art10Title": "Article 10 - Exclusions from the Right of Withdrawal",
    "art10Text": "The entrepreneur may exclude the following products and services from the right of withdrawal:",
    "art10Items": [
        "Products whose price depends on fluctuations in the financial market",
        "Products purchased via a public auction",
        "Fully performed services (with prior explicit consumer consent)",
        "Package travel and passenger transport",
        "Accommodation bookings for a specified date",
        "Events and performances with a scheduled date",
        "Made-to-measure or personalised products",
        "Rapidly perishable products",
        "Sealed health or hygiene products opened after delivery",
        "Products irreversibly mixed with other products after delivery",
        "Alcoholic beverages with prices agreed at the time of order",
        "Sealed audio, video or software recordings opened after delivery",
        "Newspapers, magazines (except subscriptions)",
        "Non-physical digital content (with prior explicit consent)"
    ],
    "art11Title": "Article 11 - Pricing",
    "art11Text": (
        "During the stated validity period, prices of offered products and/or services will not be "
        "increased except for VAT changes. Stated prices include VAT. Price increases within 3 months "
        "of contract formation are only permitted if required by law. After 3 months, a price increase "
        "is only permitted if agreed with the consumer."
    ),
    "art12Title": "Article 12 - Contract Performance and Extended Warranty",
    "art12Text": (
        "The entrepreneur guarantees that products and/or services conform to the contract, the "
        "advertised specifications, reasonable standards of quality and usability, and applicable "
        "laws and regulations in effect on the date the contract was formed."
    ),
    "art13Title": "Article 13 - Delivery and Execution",
    "art13Text": (
        "The entrepreneur shall exercise the utmost care in receiving and fulfilling product orders. "
        "Accepted orders will be fulfilled promptly and no later than 30 days, unless a different "
        "delivery period was agreed. The risk of damage or loss rests with the entrepreneur until "
        "delivery to the consumer."
    ),
    "art14Title": "Article 14 - Duration Contracts: Term, Cancellation and Renewal",
    "art14Text": (
        "The consumer may cancel an indefinite-duration contract at any time with a maximum one-month "
        "notice period. Fixed-term contracts run for a maximum of two years. Tacit renewal is only "
        "permitted for newspapers, magazines and periodicals with a maximum renewal period of three months."
    ),
    "art15Title": "Article 15 - Payment",
    "art15Text": (
        "Amounts owed by the consumer must be paid within 14 days after the start of the cooling-off "
        "period, or, where no cooling-off period applies, within 14 days of contract formation. "
        "Prepayment may not exceed 50% of the purchase price. Late payment triggers statutory interest "
        "after the entrepreneur gives notice."
    ),
    "art16Title": "Article 16 - Complaints Procedure",
    "art16Text": (
        "The entrepreneur maintains a sufficiently publicised complaints procedure. Complaints about "
        "contract performance must be submitted promptly after the consumer discovers a defect, fully "
        "and clearly described. Submitted complaints are answered within 14 days of receipt."
    ),
    "art17Title": "Article 17 - Disputes",
    "art17Text": (
        "Contracts between the entrepreneur and the consumer to which these general terms and conditions "
        "apply are exclusively governed by Spanish law."
    ),
    "art18Title": "Article 18 - Additional or Divergent Provisions",
    "art18Text": (
        "Additional or divergent provisions may not be to the detriment of the consumer and must be "
        "recorded in writing or stored in a way that is accessible to the consumer on a durable medium."
    )
}

# EN corporate live body
en["corporate"]["liveBodyEN"] = (
    "There is no better place to reflect on the past and plan for the future with your business "
    "colleagues than among our alpacas in the unspoilt nature of northern Ibiza. An environment "
    "of pure zen that can only inspire fresh ideas and brilliant insights! On request we put together "
    "a complete package with catering on-site or at one of the charming nearby restaurants."
)
en["corporate"]["subheadAlt"] = "Reflecting and planning amidst our alpacas in the unspoilt nature of northern Ibiza"

# EN weddings — already populated in en.json from a previous cycle; just ensure live subtitle is present
if "subtitle" in en["weddings"]:
    # Enrich subtitle with live copy nuance
    en["weddings"]["subtitleLive"] = (
        "Alpaca weddings and photoshoots have been a US trend for years — now available in Europe. "
        "As the first and only alpaca farm on Ibiza, we offer unique wedding experiences among our 14 alpacas."
    )

# EN weaving — already has process keys; update body with live content
en["weaving"]["studioHistoryBody"] = (
    "San fell in love with weaving in 2013. She started on small table looms, then invested in a "
    "traditional Swedish wooden loom from a 92-year-old master weaver who gave her private lessons "
    "and named the loom Big Ben. Every step from shearing to finished cloth is done by hand on "
    "Es Currals. Softer than silk, rarer than cashmere, warmer than sheep's wool — and hypoallergenic."
)
en["weaving"]["processStep1Body"] = (
    "Each spring the alpacas are hand-shorn at Es Currals. The soft fleece is carefully stored per animal."
)
en["weaving"]["processStep2Body"] = (
    "San washes and cards the fleece by hand. No industrial process — pure craftsmanship."
)
en["weaving"]["processStep3Body"] = (
    "The yarn is spun and dyed with natural plant extracts — hibiscus, avocado, and other flowers."
)
en["weaving"]["processStep4Body"] = (
    "San weaves on Big Ben, a traditional Swedish wooden loom, using centuries-old patterns from "
    "historical manuscripts combined with contemporary fashion."
)
en["weaving"]["collectionSubhead"] = "Made in Ibiza, embracing the world — Discover our own collection"

# Write EN
with open(os.path.join(ROOT, "en.json"), "w", encoding="utf-8") as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
print("EN saved. terms keys:", len(en["terms"]))

# ──────────────────────────────────────────────────────────────────────────────
# 7. Sentinel locales — es/de/fr/it
# ──────────────────────────────────────────────────────────────────────────────

SENTINEL_LOCALES = ["es", "de", "fr", "it"]

# Build the new EN keys that need sentinels
# Terms: all art* keys
SENTINEL_TERMS_KEYS = [k for k in en["terms"] if k.startswith("art")]
SENTINEL_CORPORATE_KEYS = ["liveBodyEN", "subheadAlt"]
SENTINEL_WEDDINGS_KEYS = ["subtitleLive"]
SENTINEL_WEAVING_KEYS = ["studioHistoryBody", "processStep1Body", "processStep2Body",
                          "processStep3Body", "processStep4Body", "collectionSubhead"]

for loc in SENTINEL_LOCALES:
    path = os.path.join(ROOT, f"{loc}.json")
    data = json.load(open(path, encoding="utf-8"))

    # Terms articles
    if "terms" not in data:
        data["terms"] = {}
    for k in SENTINEL_TERMS_KEYS:
        if k not in data["terms"]:
            data["terms"][k] = f"__UNTRANSLATED__: {en['terms'][k]}"

    # Corporate
    if "corporate" not in data:
        data["corporate"] = {}
    for k in SENTINEL_CORPORATE_KEYS:
        if k not in data["corporate"]:
            data["corporate"][k] = f"__UNTRANSLATED__: {en['corporate'].get(k, '')}"

    # Weddings
    if "weddings" not in data:
        data["weddings"] = {}
    for k in SENTINEL_WEDDINGS_KEYS:
        if k not in data["weddings"]:
            val = en["weddings"].get(k, "")
            data["weddings"][k] = f"__UNTRANSLATED__: {val}"

    # Weaving
    if "weaving" not in data:
        data["weaving"] = {}
    for k in SENTINEL_WEAVING_KEYS:
        if k not in data["weaving"]:
            data["weaving"][k] = f"__UNTRANSLATED__: {en['weaving'].get(k, '')}"

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"{loc} saved.")

# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
nl2 = json.load(open(os.path.join(ROOT, "nl.json"), encoding="utf-8"))
en2 = json.load(open(os.path.join(ROOT, "en.json"), encoding="utf-8"))

nl_terms_keys = len(nl2["terms"])
en_terms_keys = len(en2["terms"])
nl_weddings_keys = len(nl2["weddings"])
nl_weaving_keys = len(nl2["weaving"])

print(f"\nSummary:")
print(f"  NL terms keys: {nl_terms_keys} (was 13, now 18-article full set)")
print(f"  EN terms keys: {en_terms_keys}")
print(f"  NL weddings keys: {nl_weddings_keys} (was 0)")
print(f"  NL weaving keys: {nl_weaving_keys} (was 4)")
print(f"  Sentinel locales updated: {SENTINEL_LOCALES}")
