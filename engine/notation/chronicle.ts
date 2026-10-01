// The dated record every history question is proved from: each event, object and invention a lesson
// names, with its year or span and where the date was read, and each source a lesson shows on a
// source card, with who made it and whether they were there. A lesson that names something not
// here is refused by the history checker, so no date reaches a child without a source.
// .docs/history.md, "Principles" and "Sources", says what counts as a source.

/** Where dates are read. `wikipedia` is used only to check a date quickly and is named as such. */
export const SOURCES = {
    nasm: "Smithsonian National Air and Space Museum, airandspace.si.edu",
    nhm: "Natural History Museum, London, nhm.ac.uk",
    un: "United Nations, un.org, History of the United Nations",
    nasa: "NASA, nasa.gov, history pages",
    bm: "British Museum, britishmuseum.org, collection online",
    britannica: "Encyclopaedia Britannica, britannica.com",
    wikipedia:
        "Wikipedia, en.wikipedia.org, read as a check and still to be confirmed against Britannica",
} as const;
export type SourceId = keyof typeof SOURCES;

/** Where one date was read: the source, the page, and whether it was read when written or recalled. */
export interface Cite {
    in: SourceId;
    page: string;
    checked: "read" | "recalled";
}

export interface Entry {
    /** How lessons write it, lowercased; the first is the name the record goes by. */
    names: readonly string[];
    /** A year below nought is that many years BC; there is no year nought. */
    year: number;
    /** The last year of a span, when the record gives one. */
    to?: number;
    /** Known only roughly, so a question may order it but never ask for it exactly. */
    about?: true;
    from: Cite;
}

const read = (inSource: SourceId, page: string): Cite => ({ in: inSource, page, checked: "read" });
const recalled = (inSource: SourceId, page: string): Cite => ({
    in: inSource,
    page,
    checked: "recalled",
});

export const EVENTS: readonly Entry[] = [
    // things in a street, by when each first appeared
    {
        names: ["horse and cart", "horse", "horse and carriage"],
        year: -3500,
        to: -2000,
        about: true,
        from: recalled("britannica", "Wheel; Horse, domestication"),
    },
    {
        names: ["hot-air balloon", "balloon", "first balloon flight"],
        year: 1783,
        from: read("wikipedia", "Montgolfier brothers: Annonay, 4 June 1783"),
    },
    {
        names: ["steam train", "train", "first steam train"],
        year: 1804,
        from: read("wikipedia", "Richard Trevithick: Penydarren, 21 February 1804"),
    },
    {
        names: ["bicycle"],
        year: 1885,
        from: read("wikipedia", "Safety bicycle: the Rover safety bicycle of 1885"),
    },
    {
        names: ["motor car", "car", "first motor car"],
        year: 1886,
        from: read("wikipedia", "Benz Patent-Motorwagen: patent DRP 37435, 1886"),
    },
    {
        names: ["electric street light", "electric light"],
        year: 1878,
        to: 1882,
        about: true,
        from: read(
            "wikipedia",
            "Incandescent light bulb: Swan, January 1879; Edison, October 1879",
        ),
    },
    {
        names: ["aeroplane", "first flight", "wright flyer"],
        year: 1903,
        from: read("nasm", "1903 Wright Flyer: Kitty Hawk, 17 December 1903"),
    },
    {
        names: ["television aerial", "television", "first television service"],
        year: 1936,
        from: read("wikipedia", "BBC Television Service: regular service from 2 November 1936"),
    },
    {
        names: ["mobile phone", "first mobile phone call"],
        year: 1973,
        to: 1983,
        about: true,
        from: recalled("britannica", "Mobile telephone: Martin Cooper's handheld call, April 1973"),
    },
    // toys, by when each kind was first made
    {
        names: ["spinning top", "top"],
        year: -3500,
        to: -500,
        about: true,
        from: recalled("bm", "Ancient Greek terracotta spinning tops"),
    },
    {
        names: ["kite"],
        year: -500,
        to: -300,
        about: true,
        from: recalled("britannica", "Kite: China, by the 4th century BC"),
    },
    {
        names: ["rag doll", "doll"],
        year: 1,
        to: 500,
        about: true,
        from: recalled("bm", "Rag doll from Roman Egypt, 1st to 5th century AD"),
    },
    {
        names: ["teddy bear"],
        year: 1902,
        to: 1903,
        from: read("wikipedia", "Teddy bear: Steiff and Michtom, 1902"),
    },
    {
        names: ["building bricks", "plastic bricks"],
        year: 1949,
        to: 1958,
        from: read("wikipedia", "Lego: interlocking bricks from 1949"),
    },
    {
        names: ["puzzle cube"],
        year: 1974,
        from: read("wikipedia", "Rubik's Cube: invented 1974 by Ernő Rubik"),
    },
    // the twentieth century by decades
    {
        names: ["penicillin found", "penicillin"],
        year: 1928,
        from: read("wikipedia", "Alexander Fleming: 28 September 1928"),
    },
    {
        names: ["first person in space", "gagarin in space"],
        year: 1961,
        from: read("wikipedia", "Yuri Gagarin: Vostok 1, 12 April 1961, 108 minutes"),
    },
    {
        names: ["moon landing", "first moon landing", "apollo 11"],
        year: 1969,
        from: recalled("nasa", "Apollo 11: landing on 20 July 1969"),
    },
    {
        names: ["world wide web", "the web"],
        year: 1991,
        from: read("wikipedia", "World Wide Web: opened to the whole Internet, 23 August 1991"),
    },
    // flight
    {
        names: ["across the channel", "first flight across the channel"],
        year: 1909,
        from: read(
            "wikipedia",
            "Louis Blériot: the first aeroplane flight across the English Channel, 1909",
        ),
    },
    {
        names: ["across the atlantic", "first flight across the atlantic"],
        year: 1919,
        from: read(
            "wikipedia",
            "Alcock and Brown: first non-stop transatlantic flight, 14 June 1919",
        ),
    },
    {
        names: ["first public steam railway", "stockton and darlington railway"],
        year: 1825,
        from: read("wikipedia", "Stockton and Darlington Railway: opened 27 September 1825"),
    },
    // two great fires and what came after
    {
        names: ["great fire of london", "london fire"],
        year: 1666,
        from: read(
            "wikipedia",
            "Great Fire of London: from 2 September 1666, in Farriner's bakery, Pudding Lane",
        ),
    },
    {
        names: ["great fire of edo", "edo fire", "meireki fire"],
        year: 1657,
        from: read(
            "wikipedia",
            "Great fire of Meireki: 2 March 1657, 60 to 70 per cent of Edo destroyed",
        ),
    },
    {
        names: ["monument built", "the monument"],
        year: 1671,
        to: 1677,
        from: read(
            "wikipedia",
            "Monument to the Great Fire of London: built 1671 to 1677, 202 feet",
        ),
    },
    {
        names: ["new st paul's finished", "st paul's cathedral finished"],
        year: 1710,
        from: read("wikipedia", "St Paul's Cathedral: the present building completed in 1710"),
    },
    // lives that changed what we know
    {
        names: ["mary anning born"],
        year: 1799,
        from: read("nhm", "Mary Anning: born 1799 in Lyme Regis"),
    },
    {
        names: ["ichthyosaur found"],
        year: 1811,
        to: 1812,
        from: read("nhm", "Mary Anning: Joseph's skull, autumn 1811; the skeleton, November 1812"),
    },
    {
        names: ["plesiosaur found"],
        year: 1823,
        from: read("nhm", "Mary Anning: the first complete Plesiosaurus, December 1823"),
    },
    {
        names: ["mary anning died"],
        year: 1847,
        from: read("nhm", "Mary Anning: died 1847, aged 47"),
    },
    {
        names: ["marie curie born"],
        year: 1867,
        from: read("wikipedia", "Marie Curie: born 7 November 1867"),
    },
    {
        names: ["first nobel prize", "curie's first nobel prize"],
        year: 1903,
        from: read("wikipedia", "Marie Curie: Nobel Prize in Physics, 1903"),
    },
    {
        names: ["second nobel prize", "curie's second nobel prize"],
        year: 1911,
        from: read("wikipedia", "Marie Curie: Nobel Prize in Chemistry, 1911"),
    },
    {
        names: ["marie curie died"],
        year: 1934,
        from: read("wikipedia", "Marie Curie: died 4 July 1934"),
    },
    // people from each country's past, for the grade two national units
    {
        names: ["florence nightingale born"],
        year: 1820,
        from: read("wikipedia", "Florence Nightingale: born 12 May 1820"),
    },
    {
        names: ["nightingale reached scutari"],
        year: 1854,
        from: read("wikipedia", "Florence Nightingale: arrived at Scutari early in November 1854"),
    },
    {
        names: ["nursing school opened"],
        year: 1860,
        from: read(
            "wikipedia",
            "Florence Nightingale: nursing school at St Thomas' Hospital, 1860",
        ),
    },
    {
        names: ["florence nightingale died"],
        year: 1910,
        from: read("wikipedia", "Florence Nightingale: died 13 August 1910"),
    },
    {
        names: ["rosa parks born"],
        year: 1913,
        from: read("wikipedia", "Rosa Parks: born 4 February 1913"),
    },
    {
        names: ["rosa parks kept her seat"],
        year: 1955,
        from: read("wikipedia", "Rosa Parks: 1 December 1955, Montgomery, Alabama"),
    },
    {
        names: ["montgomery buses opened to all"],
        year: 1956,
        from: read("wikipedia", "Rosa Parks: buses integrated 20 December 1956, after 381 days"),
    },
    {
        names: ["rosa parks died"],
        year: 2005,
        from: read("wikipedia", "Rosa Parks: died 24 October 2005"),
    },
    {
        names: ["ino tadataka born"],
        year: 1745,
        from: read("wikipedia", "Inō Tadataka: born 11 February 1745"),
    },
    {
        names: ["survey of japan began"],
        year: 1800,
        from: read("wikipedia", "Inō Tadataka: survey authorised in 1800"),
    },
    {
        names: ["ino tadataka died"],
        year: 1818,
        from: read("wikipedia", "Inō Tadataka: died 17 May 1818"),
    },
    {
        names: ["map of japan finished"],
        year: 1821,
        from: read("wikipedia", "Inō Tadataka: the map completed by his team in 1821"),
    },
    {
        names: ["yuri gagarin born"],
        year: 1934,
        from: read("wikipedia", "Yuri Gagarin: born 9 March 1934, Klushino"),
    },
    {
        names: ["yuri gagarin died"],
        year: 1968,
        from: read("wikipedia", "Yuri Gagarin: died 27 March 1968"),
    },
    {
        names: ["yuan longping born"],
        year: 1930,
        from: read("wikipedia", "Yuan Longping: born 7 September 1930"),
    },
    {
        names: ["wild rice plant found"],
        year: 1961,
        from: read(
            "wikipedia",
            "Yuan Longping: in 1961 he spotted a seed-head of wild hybrid rice",
        ),
    },
    {
        names: ["first hybrid rice"],
        year: 1970,
        to: 1979,
        about: true,
        from: read("wikipedia", "Yuan Longping: the first hybrid rice varieties in the 1970s"),
    },
    {
        names: ["yuan longping died"],
        year: 2021,
        from: read("wikipedia", "Yuan Longping: died 22 May 2021"),
    },
    // grade three: the first people, the first farmers and the first cities
    {
        names: ["flint hand axe", "hand axe", "stone age tools"],
        year: -480000,
        about: true,
        from: read("wikipedia", "Boxgrove Quarry: hand axes around 480,000 years ago"),
    },
    {
        names: ["bronze axe", "bronze age in britain"],
        year: -2500,
        to: -800,
        about: true,
        from: read("wikipedia", "Bronze Age Britain: c. 2500 to c. 800 BC"),
    },
    {
        names: ["iron sickle", "iron age in britain"],
        year: -800,
        to: 43,
        about: true,
        from: read("wikipedia", "British Iron Age: c. 800 BC to the Roman period"),
    },
    {
        names: ["first farming", "first farmers"],
        year: -10000,
        to: -8000,
        about: true,
        from: read("wikipedia", "Neolithic Revolution: 10,000 to 8,000 BC in the Fertile Crescent"),
    },
    {
        names: ["farming in britain"],
        year: -4000,
        about: true,
        from: recalled("bm", "Neolithic Britain: farming from about 4000 BC"),
    },
    {
        names: ["skara brae"],
        year: -3180,
        to: -2500,
        about: true,
        from: read("wikipedia", "Skara Brae: occupied from about 3180 BC to about 2500 BC"),
    },
    {
        names: ["clay pot"],
        year: -3180,
        to: -2500,
        about: true,
        from: read(
            "wikipedia",
            "Skara Brae: pots from the village, occupied about 3180 to 2500 BC",
        ),
    },
    {
        names: ["lion coin", "first coins"],
        year: -700,
        to: -600,
        about: true,
        from: read(
            "wikipedia",
            "Lydia: electrum coins, among the oldest, around the 7th century BC",
        ),
    },
    {
        names: ["ban liang coin", "coin with a hole"],
        year: -221,
        about: true,
        from: read("wikipedia", "Ban Liang: made the one currency after the unification of 221 BC"),
    },
    {
        names: ["first olympic games", "olympic games begin"],
        year: -776,
        from: read("wikipedia", "Ancient Olympic Games: traditionally dated to 776 BC"),
    },
    {
        names: ["athens votes", "democracy in athens"],
        year: -508,
        from: read(
            "wikipedia",
            "Cleisthenes: the constitution set on a democratic footing in 508 BC",
        ),
    },
    {
        names: ["parthenon built"],
        year: -447,
        to: -432,
        from: read("wikipedia", "Parthenon: begun 447 BC, finished 432 BC"),
    },
    {
        names: ["appian way", "first great roman road"],
        year: -312,
        from: read("wikipedia", "Appian Way: first section built in 312 BC"),
    },
    {
        names: ["colosseum built"],
        year: 72,
        to: 80,
        from: read("wikipedia", "Colosseum: begun in 72, completed in AD 80"),
    },
    {
        names: ["hadrian's wall begun"],
        year: 122,
        from: read("wikipedia", "Hadrian's Wall: begun in AD 122"),
    },
    {
        names: ["ashoka's rule", "ashoka"],
        year: -268,
        to: -232,
        from: read("wikipedia", "Ashoka: emperor from about 268 BC until his death in 232 BC"),
    },
    {
        names: ["zero as a number", "brahmagupta's zero"],
        year: 628,
        from: read("wikipedia", "Brahmagupta: the Brahmasphutasiddhanta, 628"),
    },
    {
        names: ["digits reach europe", "liber abaci"],
        year: 1202,
        from: read("wikipedia", "Liber Abaci: Fibonacci's book of 1202"),
    },
    {
        names: ["han dynasty"],
        year: -202,
        to: 220,
        from: read("wikipedia", "Han dynasty: 202 BC to AD 220"),
    },
    {
        names: ["zhang qian sets out", "zhang qian's journey"],
        year: -138,
        from: read("wikipedia", "Zhang Qian: sent to the Western Regions in 138 BC"),
    },
    {
        names: ["marco polo's journey"],
        year: 1271,
        to: 1295,
        from: recalled("britannica", "Marco Polo: travelled from 1271 and returned in 1295"),
    },
    {
        names: ["banknotes in europe", "stockholm banknotes"],
        year: 1661,
        from: read("wikipedia", "Stockholms Banco: began printing banknotes in 1661"),
    },
    {
        names: ["phoenician alphabet"],
        year: -1050,
        about: true,
        from: read("wikipedia", "Phoenician alphabet: the conventional date of 1050 BC"),
    },
    {
        names: ["greek alphabet"],
        year: -850,
        to: -750,
        about: true,
        from: read("wikipedia", "Greek alphabet: from the late 9th or early 8th century BC"),
    },
    {
        names: ["kana"],
        year: 800,
        to: 900,
        about: true,
        from: recalled(
            "britannica",
            "Kana: developed in Japan in the 9th century, in the Heian period",
        ),
    },
    {
        names: ["cyrillic alphabet"],
        year: 880,
        to: 910,
        about: true,
        from: recalled(
            "britannica",
            "Cyrillic alphabet: made in the First Bulgarian Empire in the late 9th century",
        ),
    },
    {
        names: ["hangul"],
        year: 1443,
        to: 1446,
        from: read("wikipedia", "Hangul: announced about 1443 and published in 1446"),
    },
    {
        names: ["vesuvius erupts", "vesuvius erupted"],
        year: 79,
        from: read("wikipedia", "Pliny the Younger: his uncle died in the eruption of AD 79"),
    },
    {
        names: ["vindolanda tablets"],
        year: 85,
        to: 130,
        about: true,
        from: read("wikipedia", "Vindolanda tablets: 1st and 2nd centuries AD"),
    },
    {
        names: ["records of the grand historian"],
        year: -109,
        to: -91,
        about: true,
        from: read(
            "wikipedia",
            "Records of the Grand Historian: more or less complete by about 91 BC",
        ),
    },
    {
        names: ["declaration of independence"],
        year: 1776,
        from: read("wikipedia", "Declaration of Independence: adopted 4 July 1776"),
    },
    {
        names: ["constitution written", "us constitution written"],
        year: 1787,
        from: read("wikipedia", "Constitution of the United States: framed May to September 1787"),
    },
    {
        names: ["louisiana purchase"],
        year: 1803,
        from: read("wikipedia", "Louisiana Purchase: 1803"),
    },
    {
        names: ["hawaii becomes a state", "fiftieth state"],
        year: 1959,
        from: read("wikipedia", "Hawaii: the most recent state, 21 August 1959"),
    },
    {
        names: ["great kanto earthquake"],
        year: 1923,
        from: read("wikipedia", "1923 Great Kantō earthquake: 1 September 1923"),
    },
    {
        names: ["disaster prevention day begins"],
        year: 1960,
        from: read("wikipedia", "Disaster Prevention Day: decided in June 1960"),
    },
    {
        names: ["great hanshin earthquake"],
        year: 1995,
        from: read("wikipedia", "Great Hanshin earthquake: 17 January 1995"),
    },
    {
        names: ["rus baptised", "baptism of rus"],
        year: 988,
        about: true,
        from: read("wikipedia", "Christianization of Kievan Rus': about 988, the year disputed"),
    },
    {
        names: ["st petersburg founded"],
        year: 1703,
        from: read("wikipedia", "Saint Petersburg: founded 27 May 1703"),
    },
    {
        names: ["moscow university founded"],
        year: 1755,
        from: read("wikipedia", "Moscow State University: decreed 23 January 1755"),
    },
    {
        names: ["gunpowder recipe written", "gunpowder"],
        year: 1040,
        to: 1044,
        from: read(
            "wikipedia",
            "Wujing Zongyao: written about 1040 to 1044, with gunpowder recipes",
        ),
    },
    {
        names: ["compass described", "magnetic compass"],
        year: 1088,
        from: read("wikipedia", "Dream Pool Essays: Shen Kuo, 1088"),
    },
    {
        names: ["movable type", "bi sheng's movable type"],
        year: 1039,
        to: 1048,
        about: true,
        from: read("wikipedia", "Bi Sheng: movable clay type, invented between 1039 and 1048"),
    },
    {
        names: ["baghdad founded"],
        year: 762,
        from: read("wikipedia", "Baghdad: construction commissioned 30 July 762"),
    },
    {
        names: ["al-khwarizmi at the house of wisdom", "house of wisdom"],
        year: 813,
        to: 833,
        about: true,
        from: read(
            "wikipedia",
            "Al-Khwarizmi: at the House of Wisdom around 820; al-Jabr 813 to 833",
        ),
    },
    {
        names: ["heian-kyo founded", "kyoto founded"],
        year: 794,
        from: read("wikipedia", "Heian-kyō: established by Emperor Kanmu in 794"),
    },
    {
        names: ["song dynasty begins", "song capital at kaifeng"],
        year: 960,
        from: read(
            "wikipedia",
            "Song dynasty: from 960, the Northern Song capital at Bianjing (Kaifeng)",
        ),
    },
    {
        names: ["tale of genji"],
        year: 1008,
        about: true,
        from: read("wikipedia", "The Tale of Genji: in circulation by 1008, from Murasaki's diary"),
    },
    {
        names: ["st sophia in kyiv"],
        year: 1011,
        to: 1037,
        about: true,
        from: read(
            "wikipedia",
            "Saint Sophia Cathedral, Kyiv: founded 1037, or 1011 on another reading",
        ),
    },
    {
        names: ["vikings in america", "l'anse aux meadows"],
        year: 1021,
        from: read("wikipedia", "L'Anse aux Meadows: tree-ring date of 1021"),
    },
    {
        names: ["walls of benin begun"],
        year: 800,
        to: 1400,
        about: true,
        from: read("wikipedia", "Walls of Benin: construction may have begun as early as 800"),
    },
    {
        names: ["kingdom of benin grows"],
        year: 1001,
        to: 1100,
        about: true,
        from: read(
            "wikipedia",
            "Kingdom of Benin: grew out of Igodomigodo around the 11th century",
        ),
    },
    {
        names: ["first king of england"],
        year: 927,
        from: read("wikipedia", "Æthelstan: King of the English from 927"),
    },
    {
        names: ["white tower begun", "tower of london begun"],
        year: 1078,
        to: 1085,
        about: true,
        from: read("wikipedia", "White Tower: traditionally begun 1078, built in the early 1080s"),
    },
    {
        names: ["kremlin walls built"],
        year: 1485,
        to: 1495,
        from: read("wikipedia", "Moscow Kremlin Wall: rebuilt between 1485 and 1495"),
    },
    {
        names: ["himeji castle rebuilt"],
        year: 1601,
        to: 1609,
        from: read("wikipedia", "Himeji Castle: rebuilt from 1601 to 1609"),
    },
    {
        names: ["great zimbabwe built"],
        year: 1001,
        to: 1450,
        about: true,
        from: read("wikipedia", "Great Zimbabwe: built from the 11th to the 15th century"),
    },
    {
        names: ["theodosian walls"],
        year: 401,
        to: 500,
        about: true,
        from: read("wikipedia", "Walls of Constantinople: the Theodosian walls, 5th century"),
    },
    {
        names: ["diamond sutra", "oldest dated printed book"],
        year: 868,
        from: read("wikipedia", "Diamond Sutra: dated 11 May 868, the oldest extant printed book"),
    },
    {
        names: ["jikji", "oldest book printed with metal type"],
        year: 1377,
        from: read("wikipedia", "Jikji: printed with movable metal type in 1377"),
    },
    {
        names: ["gutenberg bible"],
        year: 1452,
        to: 1455,
        from: read("wikipedia", "Gutenberg Bible: printed between 1452 and 1455"),
    },
    {
        names: ["caxton's press", "printing comes to england"],
        year: 1476,
        from: read("wikipedia", "William Caxton: set up a press at Westminster in 1476"),
    },
    {
        names: ["zheng he's first voyage", "treasure fleet sets out"],
        year: 1405,
        from: read("wikipedia", "Ming treasure voyages: the first voyage of 1405"),
    },
    {
        names: ["zheng he's last voyage"],
        year: 1431,
        to: 1433,
        from: read("wikipedia", "Ming treasure voyages: seven voyages between 1405 and 1433"),
    },
    {
        names: ["dias rounds the cape"],
        year: 1488,
        from: read("wikipedia", "1488: Bartolomeu Dias rounds the Cape of Good Hope"),
    },
    {
        names: ["columbus crosses the atlantic"],
        year: 1492,
        from: read(
            "wikipedia",
            "Christopher Columbus: left Palos in August 1492, landfall in the Americas",
        ),
    },
    {
        names: ["da gama reaches india"],
        year: 1498,
        from: read("wikipedia", "Vasco da Gama: landed at Kozhikode (Calicut) on 20 May 1498"),
    },
    {
        names: ["magellan's fleet sets out"],
        year: 1519,
        from: read("wikipedia", "Magellan expedition: left Spain on 20 September 1519"),
    },
    {
        names: ["victoria returns", "first voyage round the world"],
        year: 1522,
        from: read(
            "wikipedia",
            "Magellan expedition: Elcano returned to Spain on 6 September 1522",
        ),
    },
    {
        names: ["alfred becomes king"],
        year: 871,
        from: read("wikipedia", "Alfred the Great: King of the West Saxons from 871"),
    },
    {
        names: ["norman conquest", "william becomes king"],
        year: 1066,
        from: recalled(
            "wikipedia",
            "England: Edward the Confessor died in 1066, the year of the Norman Conquest",
        ),
    },
    {
        names: ["domesday book"],
        year: 1086,
        from: read("wikipedia", "Domesday Book: completed in 1086, the survey ordered in 1085"),
    },
    {
        names: ["jamestown founded"],
        year: 1607,
        from: read("wikipedia", "Jamestown: established as James Fort, May 1607"),
    },
    {
        names: ["plymouth colony founded"],
        year: 1620,
        from: read("wikipedia", "Plymouth Colony: founded in 1620"),
    },
    {
        names: ["georgia founded", "thirteenth colony founded"],
        year: 1732,
        from: read("wikipedia", "Province of Georgia: founded in 1732"),
    },
    {
        names: ["shinkansen opens", "first bullet train"],
        year: 1964,
        from: read("wikipedia", "Tōkaidō Shinkansen: opened in 1964"),
    },
    {
        names: ["novgorod first mentioned"],
        year: 859,
        from: read(
            "wikipedia",
            "Veliky Novgorod: first mentioned under 859 in the Nikon Chronicle",
        ),
    },
    {
        names: ["onfim's homework"],
        year: 1220,
        to: 1260,
        about: true,
        from: read("wikipedia", "Onfim: a boy in Novgorod about 1220 to 1260"),
    },
    {
        names: ["birch-bark letters found", "first birch-bark letter found"],
        year: 1951,
        from: read(
            "wikipedia",
            "Birch bark manuscript: the first found in Novgorod on 26 July 1951",
        ),
    },
    {
        names: ["dujiangyan built"],
        year: -256,
        about: true,
        from: read("wikipedia", "Dujiangyan: built around 256 BC by the State of Qin"),
    },
    {
        names: ["anji bridge built", "zhaozhou bridge built"],
        year: 595,
        to: 605,
        from: read("wikipedia", "Anji Bridge: built 595 to 605"),
    },
    {
        names: ["grand canal completed"],
        year: 609,
        from: read("wikipedia", "Grand Canal: completed by Emperor Yang of Sui in 609"),
    },
    {
        names: ["bridgewater canal"],
        year: 1761,
        from: read("wikipedia", "Bridgewater Canal: opened 1761, Worsley to Manchester"),
    },
    {
        names: ["spinning jenny"],
        year: 1764,
        to: 1765,
        from: read("wikipedia", "Spinning jenny: invented 1764 to 1765 by James Hargreaves"),
    },
    {
        names: ["cromford mill", "first water-powered cotton mill"],
        year: 1771,
        from: read("wikipedia", "Cromford Mill: developed by Richard Arkwright in 1771"),
    },
    {
        names: ["watt's steam engine"],
        year: 1776,
        from: read("wikipedia", "Watt steam engine: sold commercially from 1776"),
    },
    {
        names: ["first inter-city railway", "liverpool and manchester railway"],
        year: 1830,
        from: read("wikipedia", "Liverpool and Manchester Railway: opened 15 September 1830"),
    },
    {
        names: ["telephone", "first telephone call"],
        year: 1876,
        from: read("wikipedia", "Telephone: Alexander Graham Bell, 1876"),
    },
    {
        names: ["radio across the atlantic"],
        year: 1901,
        from: read(
            "wikipedia",
            "Guglielmo Marconi: signal received at Signal Hill, 12 December 1901",
        ),
    },
    {
        names: ["first world war"],
        year: 1914,
        to: 1918,
        from: recalled("britannica", "World War I: 1914 to 1918"),
    },
    {
        names: ["second world war"],
        year: 1939,
        to: 1945,
        from: read("wikipedia", "World War II: 1 September 1939 to 2 September 1945"),
    },
    {
        names: ["children evacuated from british cities"],
        year: 1939,
        from: recalled("wikipedia", "Operation Pied Piper: evacuation from 1 September 1939"),
    },
    {
        names: ["anne frank's diary"],
        year: 1942,
        to: 1944,
        from: read("wikipedia", "The Diary of a Young Girl: kept in hiding, 1942 to 1944"),
    },
    {
        names: ["rationing ends in britain"],
        year: 1954,
        from: read("wikipedia", "Rationing in the United Kingdom: ended in 1954"),
    },
    {
        names: ["first computer", "eniac"],
        year: 1945,
        from: read("wikipedia", "ENIAC: completed in 1945"),
    },
    {
        names: ["sputnik", "first satellite"],
        year: 1957,
        from: read("wikipedia", "Sputnik 1: launched 4 October 1957"),
    },
    {
        names: ["laika in orbit"],
        year: 1957,
        from: read("wikipedia", "Laika: in orbit November 1957"),
    },
    {
        names: ["first woman in space"],
        year: 1963,
        from: read("wikipedia", "Valentina Tereshkova: Vostok 6, 16 June 1963"),
    },
    {
        names: ["first spacewalk"],
        year: 1965,
        from: read("wikipedia", "Alexei Leonov: first spacewalk, 18 March 1965"),
    },
    {
        names: ["women vote in new zealand"],
        year: 1893,
        from: read("wikipedia", "Women's suffrage in New Zealand: royal assent 19 September 1893"),
    },
    {
        names: ["women vote in russia"],
        year: 1917,
        from: recalled("britannica", "Women's suffrage in Russia: granted in 1917"),
    },
    {
        names: ["women vote in britain"],
        year: 1918,
        from: read("wikipedia", "Representation of the People Act 1918"),
    },
    {
        names: ["women vote in the united states"],
        year: 1920,
        from: read("wikipedia", "Nineteenth Amendment: in effect 18 August 1920"),
    },
    {
        names: ["women vote in japan"],
        year: 1946,
        from: read(
            "wikipedia",
            "Women's suffrage in Japan: first election without distinction of sex, 1946",
        ),
    },
    {
        names: ["secret ballot in tasmania"],
        year: 1856,
        from: read("wikipedia", "Secret ballot: first in Tasmania, 7 February 1856"),
    },
    {
        names: ["secret ballot in britain", "ballot act"],
        year: 1872,
        from: read("wikipedia", "Ballot Act 1872"),
    },
    {
        names: ["united nations founded"],
        year: 1945,
        from: read("un", "History of the United Nations: came into existence 24 October 1945"),
    },
    {
        names: ["unicef founded"],
        year: 1946,
        from: read("wikipedia", "UNICEF: created 11 December 1946"),
    },
    {
        names: ["universal declaration of human rights"],
        year: 1948,
        from: read("wikipedia", "Universal Declaration of Human Rights: 10 December 1948"),
    },
    {
        names: ["rights of the child", "convention on the rights of the child"],
        year: 1989,
        from: read("wikipedia", "Convention on the Rights of the Child: adopted 20 November 1989"),
    },
    {
        names: ["magna carta"],
        year: 1215,
        from: read("wikipedia", "Magna Carta: sealed at Runnymede, 15 June 1215"),
    },
    {
        names: ["de montfort's parliament", "first parliament with towns"],
        year: 1265,
        from: read("wikipedia", "Simon de Montfort's Parliament: 20 January 1265"),
    },
    {
        names: ["voting age 18 in britain"],
        year: 1969,
        from: read("wikipedia", "Representation of the People Act 1969: voting age lowered to 18"),
    },
    {
        names: ["bill of rights ratified"],
        year: 1791,
        from: read("wikipedia", "United States Bill of Rights: ratified 15 December 1791"),
    },
    {
        names: ["constitution of japan in force"],
        year: 1947,
        from: read("wikipedia", "Constitution of Japan: in effect 3 May 1947"),
    },
    {
        names: ["constitution of russia adopted"],
        year: 1993,
        from: read("wikipedia", "Constitution of Russia: adopted by referendum 12 December 1993"),
    },
    {
        names: ["first national people's congress"],
        year: 1954,
        from: read(
            "wikipedia",
            "National People's Congress: the 1954 Constitution transferred the legislature to it",
        ),
    },
    {
        names: ["constitution of china of 1982"],
        year: 1982,
        from: read(
            "wikipedia",
            "Constitution of the People's Republic of China: adopted 4 December 1982",
        ),
    },
    {
        names: ["meiji constitution"],
        year: 1889,
        from: read("wikipedia", "Meiji Constitution: proclaimed 11 February 1889"),
    },
    {
        names: ["state duma first meets"],
        year: 1906,
        from: read("wikipedia", "State Duma (Russian Empire): first convened 27 April 1906"),
    },
    {
        names: ["people's republic of china founded"],
        year: 1949,
        from: read("wikipedia", "Proclamation of the People's Republic of China: 1 October 1949"),
    },
    {
        names: ["qin unites china", "china united under qin"],
        year: -221,
        from: read("wikipedia", "Ban Liang: Qin Shi Huang unified China in 221 BC"),
    },
    {
        names: ["caesar lands in britain"],
        year: -55,
        from: read("wikipedia", "Caesar's invasions of Britain: 55 and 54 BC"),
    },
    {
        names: ["augustus first emperor", "first roman emperor"],
        year: -27,
        from: read("wikipedia", "Augustus: first Roman emperor from 27 BC"),
    },
    {
        names: ["romans conquer britain", "roman conquest of britain"],
        year: 43,
        from: read(
            "wikipedia",
            "Roman conquest of Britain: began in earnest in AD 43 under Claudius",
        ),
    },
    {
        names: ["paper", "cai lun's paper", "paper made from bark and rags"],
        year: 105,
        from: read("wikipedia", "Cai Lun: improved papermaking in AD 105"),
    },
    {
        names: ["paper money", "first government paper money"],
        year: 1024,
        from: read("wikipedia", "Jiaozi: the first government notes, Sichuan, 1024"),
    },
    {
        names: ["cowrie shell money", "cowrie shell"],
        year: -1600,
        to: -1046,
        about: true,
        from: recalled("bm", "Cowrie shells used as money in Shang China"),
    },
    {
        names: ["stonehenge begun"],
        year: -3000,
        about: true,
        from: read("wikipedia", "Stonehenge: ditch and bank dug about 3000 BC"),
    },
    {
        names: ["stonehenge bluestones set"],
        year: -2400,
        to: -2200,
        about: true,
        from: read("wikipedia", "Stonehenge: bluestones placed between 2400 and 2200 BC"),
    },
    {
        names: ["uruk", "uruk at its biggest"],
        year: -3100,
        about: true,
        from: read("wikipedia", "Uruk: at its peak around 3100 BC"),
    },
    {
        names: [
            "writing on clay",
            "clay tablet",
            "clay tablet with wedge writing",
            "first writing",
        ],
        year: -3350,
        to: -3100,
        about: true,
        from: read(
            "wikipedia",
            "Proto-cuneiform: emerged in Mesopotamia about 3350 to 3200 BC, for accounts",
        ),
    },
    {
        names: ["egyptian hieroglyphs"],
        year: -3400,
        to: -3200,
        about: true,
        from: read("wikipedia", "Egyptian hieroglyphs: glyphs at Abydos, 3400 to 3200 BC"),
    },
    {
        names: ["mohenjo-daro built", "mohenjo-daro"],
        year: -2500,
        about: true,
        from: read("wikipedia", "Mohenjo-daro: built about 2500 BC"),
    },
    {
        names: ["shang dynasty", "shang china"],
        year: -1600,
        to: -1046,
        about: true,
        from: read("wikipedia", "Shang dynasty: about 1600 to 1046 BC"),
    },
    {
        names: ["oracle bone", "oracle bones"],
        year: -1250,
        to: -1050,
        about: true,
        from: read("wikipedia", "Oracle bones: Late Shang, about 1250 to 1050 BC"),
    },
    {
        names: ["great pyramid"],
        year: -2560,
        about: true,
        from: recalled("britannica", "Pyramids of Giza: the Great Pyramid, about 2560 BC"),
    },
    // grade three national units
    {
        names: ["cahokia"],
        year: 1050,
        to: 1350,
        about: true,
        from: read("wikipedia", "Cahokia: a city from about 1050 to 1350"),
    },
    {
        names: ["mesa verde cliff houses"],
        year: 1190,
        to: 1285,
        about: true,
        from: read("wikipedia", "Mesa Verde: Pueblo III building, last inhabitants about 1285"),
    },
    {
        names: ["electric rice cooker"],
        year: 1955,
        to: 1956,
        from: read("wikipedia", "Rice cooker: Toshiba ER-4, December 1955 (or 1956)"),
    },
    {
        names: ["television broadcasts in japan"],
        year: 1953,
        from: recalled("britannica", "NHK television broadcasting from 1953"),
    },
    {
        names: ["rostov first mentioned"],
        year: 862,
        from: recalled("britannica", "Rostov: first mentioned in the chronicle under 862"),
    },
    {
        names: ["yaroslavl first mentioned"],
        year: 1010,
        from: recalled("britannica", "Yaroslavl: founded about 1010"),
    },
    {
        names: ["suzdal first mentioned"],
        year: 1024,
        from: read("wikipedia", "Suzdal: first mentioned in the chronicles under 1024"),
    },
    {
        names: ["moscow first mentioned"],
        year: 1147,
        from: read("wikipedia", "Moscow: first documented in 1147"),
    },
    {
        names: ["banpo village"],
        year: -4800,
        to: -4300,
        about: true,
        from: recalled("britannica", "Banpo: a Yangshao village of about 4800 to 4300 BC"),
    },
    {
        names: ["rice farming in china"],
        year: -7000,
        about: true,
        from: recalled("britannica", "Rice: farmed in the Yangtze valley by about 7000 BC"),
    },
    // the Maya, ancient Egypt's stone, the Broad Street pump and the air (batch E, 1 October)
    {
        names: ["earliest maya long count date", "earliest long count date"],
        year: -36,
        from: read(
            "wikipedia",
            "Maya numerals: earliest Long Count date, 36 BC, Stela 2 at Chiapa de Corzo",
        ),
    },
    {
        names: ["classic maya cities", "classic maya period"],
        year: 250,
        to: 900,
        about: true,
        from: read("wikipedia", "Maya civilization: the Classic period, about AD 250 to 900"),
    },
    {
        names: ["chichen itza at its height"],
        year: 830,
        to: 950,
        about: true,
        from: read(
            "wikipedia",
            "Maya civilization: Chichen Itza in the Terminal Classic, AD 830 to 950",
        ),
    },
    {
        names: ["dresden codex written", "dresden codex"],
        year: 1200,
        to: 1345,
        about: true,
        from: read(
            "wikipedia",
            "Dresden Codex: about 1200 to 1345, from the region of Chichen Itza",
        ),
    },
    {
        names: ["rosetta stone carved", "rosetta decree"],
        year: -196,
        from: read("wikipedia", "Rosetta Stone: the decree of Ptolemy V, 196 BC"),
    },
    {
        names: ["last hieroglyphs carved", "last hieroglyphic inscription"],
        year: 394,
        from: read(
            "wikipedia",
            "Egyptian hieroglyphs: the Graffito of Esmet-Akhom at Philae, AD 394",
        ),
    },
    {
        names: ["rosetta stone found"],
        year: 1799,
        from: read(
            "wikipedia",
            "Rosetta Stone: found near Rosetta by Pierre-François Bouchard, July 1799",
        ),
    },
    {
        names: ["hieroglyphs read", "champollion reads the hieroglyphs"],
        year: 1822,
        from: read(
            "wikipedia",
            "Rosetta Stone: Champollion announced his decipherment in Paris in 1822",
        ),
    },
    {
        names: ["john snow born"],
        year: 1813,
        from: read("wikipedia", "John Snow: born 15 March 1813"),
    },
    {
        names: ["snow's first essay on cholera", "on the mode of communication of cholera"],
        year: 1849,
        from: read("wikipedia", "1854 Broad Street cholera outbreak: Snow's essay of 1849"),
    },
    {
        names: ["broad street pump handle removed", "pump handle removed"],
        year: 1854,
        from: read(
            "wikipedia",
            "1854 Broad Street cholera outbreak: the handle removed on 8 September 1854",
        ),
    },
    {
        names: ["snow's second edition", "snow's map published"],
        year: 1855,
        from: read(
            "wikipedia",
            "1854 Broad Street cholera outbreak: the second edition of 1855, with the map",
        ),
    },
    {
        names: ["john snow died"],
        year: 1858,
        from: read("wikipedia", "John Snow: died 16 June 1858"),
    },
    {
        names: ["great smog of london", "great smog"],
        year: 1952,
        from: read("wikipedia", "Great Smog of London: 5 to 9 December 1952"),
    },
    {
        names: ["clean air act"],
        year: 1956,
        from: read("wikipedia", "Great Smog of London: the Clean Air Act 1956"),
    },
    {
        names: ["ozone hole reported", "hole in the ozone layer found"],
        year: 1985,
        from: read(
            "wikipedia",
            "Montreal Protocol: Farman, Gardiner and Shanklin's results from Halley Bay, 1985",
        ),
    },
    {
        names: ["montreal protocol agreed", "montreal protocol"],
        year: 1987,
        from: read("wikipedia", "Montreal Protocol: agreed 16 September 1987"),
    },
    {
        names: ["montreal protocol in force"],
        year: 1989,
        from: read("wikipedia", "Montreal Protocol: entered into force 1 January 1989"),
    },
];

const plain = (s: string): string =>
    s
        .trim()
        .toLowerCase()
        .replace(/[.!?]$/, "")
        .replace(/^(a|an|the) /, "");

const BY_NAME: ReadonlyMap<string, Entry> = new Map(
    EVENTS.flatMap((e) => e.names.map((name) => [plain(name), e] as const)),
);

/** The record for the words a lesson writes an event in, if it holds one. */
export const entryFor = (label: string): Entry | undefined => BY_NAME.get(plain(label));

/** The first and last year an entry may be, as signed years. */
export const spanOf = (e: Entry): [number, number] => [e.year, e.to ?? e.year];

/** A source a source card shows: who made it, when and where, and whether they saw it happen. */
export interface Document {
    title: string;
    who: string;
    when: string;
    where: string;
    there: 0 | 1;
    /** A real source's record, or why a made-up one was written for a lesson. */
    from: Cite | { invented: string };
}

export const DOCUMENTS: readonly Document[] = [
    {
        title: "Anne Frank's diary",
        who: "Anne Frank, a girl in hiding",
        when: "1942 to 1944",
        where: "Amsterdam",
        there: 1,
        from: read(
            "wikipedia",
            "The Diary of a Young Girl: kept in hiding in Amsterdam, 1942 to 1944",
        ),
    },
    {
        title: "A history of the twentieth century",
        who: "A historian",
        when: "2015",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on the twentieth century" },
    },
    {
        title: "Onfim's birch-bark homework",
        who: "Onfim, a boy of about six or seven",
        when: "about 1220 to 1260",
        where: "Novgorod",
        there: 1,
        from: read("wikipedia", "Onfim: notes and homework on birch bark, about 1220 to 1260"),
    },
    {
        title: "The Domesday Book",
        who: "King William's officials",
        when: "1086",
        where: "every shire of England",
        there: 1,
        from: read("wikipedia", "Domesday Book: the king sent his agents to survey every shire"),
    },
    {
        title: "Pigafetta's journal",
        who: "Antonio Pigafetta, who sailed with the fleet",
        when: "1519 to 1522",
        where: "on board the ships",
        there: 1,
        from: read("wikipedia", "Antonio Pigafetta: kept a journal of the voyage"),
    },
    {
        title: "Ma Huan's survey of the ocean shores",
        who: "Ma Huan, an interpreter on the fleet",
        when: "about 1416 to 1451",
        where: "written from the voyages",
        there: 1,
        from: read("wikipedia", "Ma Huan: first draft about 1416, final version about 1451"),
    },
    {
        title: "A book about the great explorers",
        who: "A writer of children's books",
        when: "2010",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lessons on voyages" },
    },
    {
        title: "Ashoka's rock edict",
        who: "Emperor Ashoka, carved by his order",
        when: "about 250 BC",
        where: "on rocks across his empire, India",
        there: 1,
        from: read(
            "wikipedia",
            "Edicts of Ashoka: inscriptions by Ashoka, who ruled 268 to 232 BC",
        ),
    },
    {
        title: "Records of the Grand Historian",
        who: "Sima Qian, a Han court historian",
        when: "about 91 BC",
        where: "Chang'an, Han China",
        there: 0,
        from: read("wikipedia", "Records of the Grand Historian: complete by about 91 BC"),
    },
    {
        title: "Pliny's letter about Vesuvius",
        who: "Pliny the Younger, who watched from across the bay",
        when: "about AD 106, of AD 79",
        where: "Misenum, near Vesuvius",
        there: 1,
        from: read("wikipedia", "Pliny the Younger: letters to Tacitus on the eruption of AD 79"),
    },
    {
        title: "A birthday invitation from Vindolanda",
        who: "Claudia Severa, a commander's wife",
        when: "about AD 100",
        where: "Vindolanda, Roman Britain",
        there: 1,
        from: recalled("bm", "Vindolanda tablet 291, the birthday invitation"),
    },
    {
        title: "An encyclopaedia entry on Rome",
        who: "The encyclopaedia's writers",
        when: "2020",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on sources" },
    },
    {
        title: "Photograph of the first flight",
        who: "John T. Daniels, with the Wrights' camera",
        when: "17 December 1903",
        where: "Kill Devil Hills, North Carolina",
        there: 1,
        from: read("wikipedia", "John T. Daniels: took the photograph of the first powered flight"),
    },
    {
        title: "A book about flying machines",
        who: "A writer of children's books",
        when: "2003",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on the first flight" },
    },
    {
        title: "Samuel Pepys's diary",
        who: "Samuel Pepys, who lived in London",
        when: "2 September 1666",
        where: "London",
        there: 1,
        from: read("wikipedia", "Great Fire of London: Pepys's diary of the fire"),
    },
    {
        title: "A history of London",
        who: "A historian",
        when: "1950",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on the great fires" },
    },
    {
        title: "The Rosetta Stone",
        who: "Egyptian priests, for King Ptolemy V",
        when: "196 BC",
        where: "Egypt; found at Rosetta in 1799",
        there: 1,
        from: read(
            "wikipedia",
            "Rosetta Stone: a decree of 196 BC issued at Memphis for Ptolemy V",
        ),
    },
    {
        title: "A book about ancient Egypt",
        who: "A writer of children's books",
        when: "2001",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on Egypt" },
    },
    {
        title: "The Dresden Codex",
        who: "Eight Maya scribes",
        when: "about 1200 to 1345",
        where: "the region of Chichen Itza, Yucatán",
        there: 1,
        from: read(
            "wikipedia",
            "Dresden Codex: eight scribes, about 1200 to 1345, near Chichen Itza",
        ),
    },
    {
        title: "An encyclopaedia entry on the Maya",
        who: "The encyclopaedia's writers",
        when: "2018",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on the Maya" },
    },
    {
        title: "On the Mode of Communication of Cholera",
        who: "John Snow, a doctor who lived near Broad Street",
        when: "1855",
        where: "London",
        there: 1,
        from: read("wikipedia", "1854 Broad Street cholera outbreak: Snow's second edition, 1855"),
    },
    {
        title: "A history of medicine",
        who: "A historian",
        when: "1990",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on the Broad Street pump" },
    },
    {
        title: "The ozone report from Halley Bay",
        who: "Joe Farman, Brian Gardiner and Jon Shanklin",
        when: "1985",
        where: "Halley Bay, Antarctica",
        there: 1,
        from: read(
            "wikipedia",
            "Montreal Protocol: the British Antarctic Survey's results from Halley Bay, 1985",
        ),
    },
    {
        title: "A school book about the planet",
        who: "A writer of children's books",
        when: "2015",
        where: "not stated",
        there: 0,
        from: { invented: "a second-hand account written for the lesson on the air we share" },
    },
];
