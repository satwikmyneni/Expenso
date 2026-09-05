export type BankBrandKey =
  | "default"
  | "sbi"
  | "hdfc"
  | "icici"
  | "axis"
  | "kotak"
  | "bank-of-baroda"
  | "canara"
  | "idfc-first"
  | "indusind"
  | "yes-bank"
  | "federal"
  | "pnb"
  | "bank-of-india"
  | "union-bank"
  | "indian-bank"
  | "rbl"
  | "bandhan"
  | "bank-of-maharashtra"
  | "central-bank-of-india"
  | "indian-overseas-bank"
  | "punjab-and-sind-bank"
  | "uco-bank"
  | "idbi"
  | "csb"
  | "city-union"
  | "dcb"
  | "dhanlaxmi"
  | "jammu-kashmir"
  | "karnataka-bank"
  | "karur-vysya"
  | "nainital"
  | "south-indian"
  | "tamilnad-mercantile"
  | "au-small-finance"
  | "capital-small-finance"
  | "equitas"
  | "esaf"
  | "suryoday"
  | "ujjivan"
  | "utkarsh"
  | "jana"
  | "north-east-small-finance"
  | "shivalik"
  | "unity-small-finance"
  | "airtel-payments"
  | "india-post-payments"
  | "fino-payments"
  | "chase"
  | "bank-of-america"
  | "wells-fargo"
  | "citi"
  | "goldman-sachs"
  | "morgan-stanley"
  | "us-bank"
  | "capital-one"
  | "pnc"
  | "truist"
  | "td-bank-us"
  | "bny-mellon"
  | "state-street"
  | "bmo"
  | "citizens"
  | "fifth-third"
  | "keybank"
  | "huntington"
  | "regions"
  | "m-and-t"
  | "first-citizens"
  | "ally"
  | "discover"
  | "american-express"
  | "charles-schwab"
  | "usaa"
  | "synchrony"
  | "comerica"
  | "zions"
  | "frost"
  | "webster"
  | "old-national"
  | "associated-bank"
  | "east-west-bank"
  | "first-horizon"
  | "fulton-bank"
  | "valley-bank"
  | "popular-bank"
  | "santander-us"
  | "bancorp-bank"
  | "sofi"
  | "marcus"
  | "nbkc"
  | "live-oak"
  | "slice"
;

export type VerifiedBankLogoId =
  | "axis-bank"
  | "bank-of-america"
  | "chase"
  | "discover"
  | "goldman-sachs"
  | "hdfc-bank"
  | "icici-bank"
  | "wells-fargo"
  | "american-express";

export type BankLogoAvailability =
  | { status: "VERIFIED_LOGO"; id: VerifiedBankLogoId; source: "Simple Icons via react-icons" }
  | { status: "TEXT_ONLY_FALLBACK"; id: null; source: null };

export interface BankBrand {
  key: BankBrandKey;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  iconColor: string;
  borderColor: string;
  decorationColor: string;
  statusBackgroundColor: string;
  statusTextColor: string;
  statusBorderColor: string;
  backgroundGradient: string;
  logo: BankLogoAvailability;
}

type BankBrandInput = Omit<BankBrand, "logo" | "statusBackgroundColor" | "statusTextColor" | "statusBorderColor"> & Partial<Pick<BankBrand, "statusBackgroundColor" | "statusTextColor" | "statusBorderColor">>;

const textOnlyFallback = Object.freeze({ status: "TEXT_ONLY_FALLBACK", id: null, source: null } as const);

const brand = (value: BankBrandInput): BankBrand => Object.freeze({
  statusBackgroundColor: "#dffcef",
  statusTextColor: "#063b2b",
  statusBorderColor: "rgba(104,213,170,.38)",
  logo: textOnlyFallback,
  ...value,
});

export const defaultBankBrand = brand({
  key: "default", displayName: "Expenso", primaryColor: "#173b76", secondaryColor: "#071936", accentColor: "#38c7e8", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.62)", iconColor: "#bfeeff", borderColor: "rgba(255,255,255,.15)", decorationColor: "rgba(255,255,255,.10)",
  backgroundGradient: "radial-gradient(circle at 15% 10%, rgba(56,199,232,.26), transparent 34%), radial-gradient(circle at 90% 5%, rgba(59,130,246,.46), transparent 42%), linear-gradient(145deg,#173b76 0%,#0a2552 55%,#071936 100%)",
});

const bankBrands: Record<Exclude<BankBrandKey, "default">, BankBrand> = {
  "sbi": brand({ key: "sbi", displayName: "SBI", primaryColor: "#07589b", secondaryColor: "#052f68", accentColor: "#53c7f0", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#53c7f0", borderColor: "rgba(83,199,240,.24)", decorationColor: "rgba(83,199,240,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(83,199,240,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(7,88,155,.40), transparent 43%), linear-gradient(145deg,#07589b 0%,#052f68 100%)" }),
  "hdfc": brand({ key: "hdfc", displayName: "HDFC Bank", primaryColor: "#114e91", secondaryColor: "#082a59", accentColor: "#ef5261", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ef5261", borderColor: "rgba(239,82,97,.24)", decorationColor: "rgba(239,82,97,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,82,97,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(17,78,145,.40), transparent 43%), linear-gradient(145deg,#114e91 0%,#082a59 100%)" }),
  "icici": brand({ key: "icici", displayName: "ICICI Bank", primaryColor: "#8a254b", secondaryColor: "#4d1734", accentColor: "#f49a45", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f49a45", borderColor: "rgba(244,154,69,.24)", decorationColor: "rgba(244,154,69,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,154,69,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(138,37,75,.40), transparent 43%), linear-gradient(145deg,#8a254b 0%,#4d1734 100%)" }),
  "axis": brand({ key: "axis", displayName: "Axis Bank", primaryColor: "#8b174c", secondaryColor: "#421029", accentColor: "#ef95ba", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ef95ba", borderColor: "rgba(239,149,186,.24)", decorationColor: "rgba(239,149,186,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,149,186,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(139,23,76,.40), transparent 43%), linear-gradient(145deg,#8b174c 0%,#421029 100%)" }),
  "kotak": brand({ key: "kotak", displayName: "Kotak Mahindra Bank", primaryColor: "#aa2532", secondaryColor: "#51151c", accentColor: "#ff9399", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ff9399", borderColor: "rgba(255,147,153,.24)", decorationColor: "rgba(255,147,153,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,147,153,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(170,37,50,.40), transparent 43%), linear-gradient(145deg,#aa2532 0%,#51151c 100%)" }),
  "bank-of-baroda": brand({ key: "bank-of-baroda", displayName: "Bank of Baroda", primaryColor: "#ba501d", secondaryColor: "#672413", accentColor: "#ffb166", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ffb166", borderColor: "rgba(255,177,102,.24)", decorationColor: "rgba(255,177,102,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,177,102,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(186,80,29,.40), transparent 43%), linear-gradient(145deg,#ba501d 0%,#672413 100%)" }),
  "canara": brand({ key: "canara", displayName: "Canara Bank", primaryColor: "#0870a6", secondaryColor: "#064264", accentColor: "#f4c542", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f4c542", borderColor: "rgba(244,197,66,.24)", decorationColor: "rgba(244,197,66,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,197,66,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(8,112,166,.40), transparent 43%), linear-gradient(145deg,#0870a6 0%,#064264 100%)" }),
  "idfc-first": brand({ key: "idfc-first", displayName: "IDFC FIRST Bank", primaryColor: "#8f2037", secondaryColor: "#3c2140", accentColor: "#729bd0", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#729bd0", borderColor: "rgba(114,155,208,.24)", decorationColor: "rgba(114,155,208,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(114,155,208,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(143,32,55,.40), transparent 43%), linear-gradient(145deg,#8f2037 0%,#3c2140 100%)" }),
  "indusind": brand({ key: "indusind", displayName: "IndusInd Bank", primaryColor: "#a61f39", secondaryColor: "#3d0b19", accentColor: "#ef825a", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ef825a", borderColor: "rgba(239,130,90,.24)", decorationColor: "rgba(239,130,90,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,130,90,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(166,31,57,.40), transparent 43%), linear-gradient(145deg,#a61f39 0%,#3d0b19 100%)" }),
  "yes-bank": brand({ key: "yes-bank", displayName: "YES BANK", primaryColor: "#12549a", secondaryColor: "#092d66", accentColor: "#ef4854", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ef4854", borderColor: "rgba(239,72,84,.24)", decorationColor: "rgba(239,72,84,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,72,84,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(18,84,154,.40), transparent 43%), linear-gradient(145deg,#12549a 0%,#092d66 100%)" }),
  "federal": brand({ key: "federal", displayName: "Federal Bank", primaryColor: "#176d91", secondaryColor: "#0b3c5d", accentColor: "#e9b449", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e9b449", borderColor: "rgba(233,180,73,.24)", decorationColor: "rgba(233,180,73,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(233,180,73,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,109,145,.40), transparent 43%), linear-gradient(145deg,#176d91 0%,#0b3c5d 100%)" }),
  "pnb": brand({ key: "pnb", displayName: "Punjab National Bank", primaryColor: "#7f2638", secondaryColor: "#471420", accentColor: "#e9b649", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e9b649", borderColor: "rgba(233,182,73,.24)", decorationColor: "rgba(233,182,73,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(233,182,73,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(127,38,56,.40), transparent 43%), linear-gradient(145deg,#7f2638 0%,#471420 100%)" }),
  "bank-of-india": brand({ key: "bank-of-india", displayName: "Bank of India", primaryColor: "#1762a3", secondaryColor: "#0b3568", accentColor: "#f2b548", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b548", borderColor: "rgba(242,181,72,.24)", decorationColor: "rgba(242,181,72,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,181,72,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,98,163,.40), transparent 43%), linear-gradient(145deg,#1762a3 0%,#0b3568 100%)" }),
  "union-bank": brand({ key: "union-bank", displayName: "Union Bank of India", primaryColor: "#8f2731", secondaryColor: "#273d68", accentColor: "#ed6b73", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ed6b73", borderColor: "rgba(237,107,115,.24)", decorationColor: "rgba(237,107,115,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(237,107,115,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(143,39,49,.40), transparent 43%), linear-gradient(145deg,#8f2731 0%,#273d68 100%)" }),
  "indian-bank": brand({ key: "indian-bank", displayName: "Indian Bank", primaryColor: "#1a5ca4", secondaryColor: "#0c3769", accentColor: "#f4b936", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f4b936", borderColor: "rgba(244,185,54,.24)", decorationColor: "rgba(244,185,54,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,185,54,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(26,92,164,.40), transparent 43%), linear-gradient(145deg,#1a5ca4 0%,#0c3769 100%)" }),
  "rbl": brand({ key: "rbl", displayName: "RBL Bank", primaryColor: "#8a255e", secondaryColor: "#461438", accentColor: "#ec86bd", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ec86bd", borderColor: "rgba(236,134,189,.24)", decorationColor: "rgba(236,134,189,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(236,134,189,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(138,37,94,.40), transparent 43%), linear-gradient(145deg,#8a255e 0%,#461438 100%)" }),
  "bandhan": brand({ key: "bandhan", displayName: "Bandhan Bank", primaryColor: "#8b1d3b", secondaryColor: "#451121", accentColor: "#ef829b", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ef829b", borderColor: "rgba(239,130,155,.24)", decorationColor: "rgba(239,130,155,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,130,155,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(139,29,59,.40), transparent 43%), linear-gradient(145deg,#8b1d3b 0%,#451121 100%)" }),
  "bank-of-maharashtra": brand({ key: "bank-of-maharashtra", displayName: "Bank of Maharashtra", primaryColor: "#9a2630", secondaryColor: "#4b1720", accentColor: "#f0b43c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f0b43c", borderColor: "rgba(240,180,60,.24)", decorationColor: "rgba(240,180,60,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(240,180,60,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(154,38,48,.40), transparent 43%), linear-gradient(145deg,#9a2630 0%,#4b1720 100%)" }),
  "central-bank-of-india": brand({ key: "central-bank-of-india", displayName: "Central Bank of India", primaryColor: "#1764a2", secondaryColor: "#0a3565", accentColor: "#efb640", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#efb640", borderColor: "rgba(239,182,64,.24)", decorationColor: "rgba(239,182,64,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,182,64,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,100,162,.40), transparent 43%), linear-gradient(145deg,#1764a2 0%,#0a3565 100%)" }),
  "indian-overseas-bank": brand({ key: "indian-overseas-bank", displayName: "Indian Overseas Bank", primaryColor: "#0d5b9c", secondaryColor: "#08335c", accentColor: "#f2bd45", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2bd45", borderColor: "rgba(242,189,69,.24)", decorationColor: "rgba(242,189,69,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,189,69,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(13,91,156,.40), transparent 43%), linear-gradient(145deg,#0d5b9c 0%,#08335c 100%)" }),
  "punjab-and-sind-bank": brand({ key: "punjab-and-sind-bank", displayName: "Punjab & Sind Bank", primaryColor: "#1e4d87", secondaryColor: "#102b51", accentColor: "#e8b849", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e8b849", borderColor: "rgba(232,184,73,.24)", decorationColor: "rgba(232,184,73,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(232,184,73,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(30,77,135,.40), transparent 43%), linear-gradient(145deg,#1e4d87 0%,#102b51 100%)" }),
  "uco-bank": brand({ key: "uco-bank", displayName: "UCO Bank", primaryColor: "#1a4e88", secondaryColor: "#0c2c55", accentColor: "#f1b83d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f1b83d", borderColor: "rgba(241,184,61,.24)", decorationColor: "rgba(241,184,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(241,184,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(26,78,136,.40), transparent 43%), linear-gradient(145deg,#1a4e88 0%,#0c2c55 100%)" }),
  "idbi": brand({ key: "idbi", displayName: "IDBI Bank", primaryColor: "#005ca8", secondaryColor: "#063b6d", accentColor: "#f3a53a", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f3a53a", borderColor: "rgba(243,165,58,.24)", decorationColor: "rgba(243,165,58,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(243,165,58,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,92,168,.40), transparent 43%), linear-gradient(145deg,#005ca8 0%,#063b6d 100%)" }),
  "csb": brand({ key: "csb", displayName: "CSB Bank", primaryColor: "#9a2335", secondaryColor: "#4a1520", accentColor: "#e8ad3c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e8ad3c", borderColor: "rgba(232,173,60,.24)", decorationColor: "rgba(232,173,60,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(232,173,60,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(154,35,53,.40), transparent 43%), linear-gradient(145deg,#9a2335 0%,#4a1520 100%)" }),
  "city-union": brand({ key: "city-union", displayName: "City Union Bank", primaryColor: "#12548d", secondaryColor: "#092d54", accentColor: "#e5b63d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e5b63d", borderColor: "rgba(229,182,61,.24)", decorationColor: "rgba(229,182,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(229,182,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(18,84,141,.40), transparent 43%), linear-gradient(145deg,#12548d 0%,#092d54 100%)" }),
  "dcb": brand({ key: "dcb", displayName: "DCB Bank", primaryColor: "#e45b26", secondaryColor: "#6e2715", accentColor: "#f4c36c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f4c36c", borderColor: "rgba(244,195,108,.24)", decorationColor: "rgba(244,195,108,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,195,108,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(228,91,38,.40), transparent 43%), linear-gradient(145deg,#e45b26 0%,#6e2715 100%)" }),
  "dhanlaxmi": brand({ key: "dhanlaxmi", displayName: "Dhanlaxmi Bank", primaryColor: "#b3262d", secondaryColor: "#57151a", accentColor: "#f1b34c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f1b34c", borderColor: "rgba(241,179,76,.24)", decorationColor: "rgba(241,179,76,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(241,179,76,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(179,38,45,.40), transparent 43%), linear-gradient(145deg,#b3262d 0%,#57151a 100%)" }),
  "jammu-kashmir": brand({ key: "jammu-kashmir", displayName: "Jammu & Kashmir Bank", primaryColor: "#d1293b", secondaryColor: "#67131e", accentColor: "#f3c24e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f3c24e", borderColor: "rgba(243,194,78,.24)", decorationColor: "rgba(243,194,78,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(243,194,78,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(209,41,59,.40), transparent 43%), linear-gradient(145deg,#d1293b 0%,#67131e 100%)" }),
  "karnataka-bank": brand({ key: "karnataka-bank", displayName: "Karnataka Bank", primaryColor: "#0b5b91", secondaryColor: "#063553", accentColor: "#e7ad36", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e7ad36", borderColor: "rgba(231,173,54,.24)", decorationColor: "rgba(231,173,54,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(231,173,54,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(11,91,145,.40), transparent 43%), linear-gradient(145deg,#0b5b91 0%,#063553 100%)" }),
  "karur-vysya": brand({ key: "karur-vysya", displayName: "Karur Vysya Bank", primaryColor: "#e52a30", secondaryColor: "#64141a", accentColor: "#f4b43f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f4b43f", borderColor: "rgba(244,180,63,.24)", decorationColor: "rgba(244,180,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,180,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(229,42,48,.40), transparent 43%), linear-gradient(145deg,#e52a30 0%,#64141a 100%)" }),
  "nainital": brand({ key: "nainital", displayName: "Nainital Bank", primaryColor: "#0a6b9d", secondaryColor: "#063b58", accentColor: "#e8bd49", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e8bd49", borderColor: "rgba(232,189,73,.24)", decorationColor: "rgba(232,189,73,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(232,189,73,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(10,107,157,.40), transparent 43%), linear-gradient(145deg,#0a6b9d 0%,#063b58 100%)" }),
  "south-indian": brand({ key: "south-indian", displayName: "South Indian Bank", primaryColor: "#f0a51b", secondaryColor: "#7b3e08", accentColor: "#fff0a5", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#fff0a5", borderColor: "rgba(255,240,165,.24)", decorationColor: "rgba(255,240,165,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,240,165,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(240,165,27,.40), transparent 43%), linear-gradient(145deg,#f0a51b 0%,#7b3e08 100%)" }),
  "tamilnad-mercantile": brand({ key: "tamilnad-mercantile", displayName: "Tamilnad Mercantile Bank", primaryColor: "#174e92", secondaryColor: "#092c5d", accentColor: "#eebc46", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#eebc46", borderColor: "rgba(238,188,70,.24)", decorationColor: "rgba(238,188,70,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(238,188,70,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,78,146,.40), transparent 43%), linear-gradient(145deg,#174e92 0%,#092c5d 100%)" }),
  "au-small-finance": brand({ key: "au-small-finance", displayName: "AU Small Finance Bank", primaryColor: "#f58220", secondaryColor: "#7a2e0c", accentColor: "#ffd36b", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ffd36b", borderColor: "rgba(255,211,107,.24)", decorationColor: "rgba(255,211,107,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,211,107,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(245,130,32,.40), transparent 43%), linear-gradient(145deg,#f58220 0%,#7a2e0c 100%)" }),
  "capital-small-finance": brand({ key: "capital-small-finance", displayName: "Capital Small Finance Bank", primaryColor: "#124c8c", secondaryColor: "#082c55", accentColor: "#e8b73f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e8b73f", borderColor: "rgba(232,183,63,.24)", decorationColor: "rgba(232,183,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(232,183,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(18,76,140,.40), transparent 43%), linear-gradient(145deg,#124c8c 0%,#082c55 100%)" }),
  "equitas": brand({ key: "equitas", displayName: "Equitas Small Finance Bank", primaryColor: "#f05a28", secondaryColor: "#752116", accentColor: "#ffd36e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ffd36e", borderColor: "rgba(255,211,110,.24)", decorationColor: "rgba(255,211,110,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,211,110,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(240,90,40,.40), transparent 43%), linear-gradient(145deg,#f05a28 0%,#752116 100%)" }),
  "esaf": brand({ key: "esaf", displayName: "ESAF Small Finance Bank", primaryColor: "#0e7184", secondaryColor: "#073c48", accentColor: "#f2b94a", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b94a", borderColor: "rgba(242,185,74,.24)", decorationColor: "rgba(242,185,74,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,185,74,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(14,113,132,.40), transparent 43%), linear-gradient(145deg,#0e7184 0%,#073c48 100%)" }),
  "suryoday": brand({ key: "suryoday", displayName: "Suryoday Small Finance Bank", primaryColor: "#1f4c8c", secondaryColor: "#102b57", accentColor: "#f3b844", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f3b844", borderColor: "rgba(243,184,68,.24)", decorationColor: "rgba(243,184,68,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(243,184,68,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(31,76,140,.40), transparent 43%), linear-gradient(145deg,#1f4c8c 0%,#102b57 100%)" }),
  "ujjivan": brand({ key: "ujjivan", displayName: "Ujjivan Small Finance Bank", primaryColor: "#d22630", secondaryColor: "#64151c", accentColor: "#f2b73e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b73e", borderColor: "rgba(242,183,62,.24)", decorationColor: "rgba(242,183,62,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,183,62,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(210,38,48,.40), transparent 43%), linear-gradient(145deg,#d22630 0%,#64151c 100%)" }),
  "utkarsh": brand({ key: "utkarsh", displayName: "Utkarsh Small Finance Bank", primaryColor: "#1d4d8f", secondaryColor: "#0d2d58", accentColor: "#efb93e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#efb93e", borderColor: "rgba(239,185,62,.24)", decorationColor: "rgba(239,185,62,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,185,62,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(29,77,143,.40), transparent 43%), linear-gradient(145deg,#1d4d8f 0%,#0d2d58 100%)" }),
  "jana": brand({ key: "jana", displayName: "Jana Small Finance Bank", primaryColor: "#4a258a", secondaryColor: "#24104c", accentColor: "#f2a33b", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2a33b", borderColor: "rgba(242,163,59,.24)", decorationColor: "rgba(242,163,59,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,163,59,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(74,37,138,.40), transparent 43%), linear-gradient(145deg,#4a258a 0%,#24104c 100%)" }),
  "north-east-small-finance": brand({ key: "north-east-small-finance", displayName: "North East Small Finance Bank", primaryColor: "#e84a35", secondaryColor: "#702015", accentColor: "#f4c05a", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f4c05a", borderColor: "rgba(244,192,90,.24)", decorationColor: "rgba(244,192,90,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,192,90,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(232,74,53,.40), transparent 43%), linear-gradient(145deg,#e84a35 0%,#702015 100%)" }),
  "shivalik": brand({ key: "shivalik", displayName: "Shivalik Small Finance Bank", primaryColor: "#0c5f8d", secondaryColor: "#07354f", accentColor: "#e9b743", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e9b743", borderColor: "rgba(233,183,67,.24)", decorationColor: "rgba(233,183,67,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(233,183,67,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(12,95,141,.40), transparent 43%), linear-gradient(145deg,#0c5f8d 0%,#07354f 100%)" }),
  "unity-small-finance": brand({ key: "unity-small-finance", displayName: "Unity Small Finance Bank", primaryColor: "#163d75", secondaryColor: "#0b2448", accentColor: "#efb43d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#efb43d", borderColor: "rgba(239,180,61,.24)", decorationColor: "rgba(239,180,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,180,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(22,61,117,.40), transparent 43%), linear-gradient(145deg,#163d75 0%,#0b2448 100%)" }),
  "airtel-payments": brand({ key: "airtel-payments", displayName: "Airtel Payments Bank", primaryColor: "#e3282e", secondaryColor: "#651018", accentColor: "#ffb1a9", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ffb1a9", borderColor: "rgba(255,177,169,.24)", decorationColor: "rgba(255,177,169,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,177,169,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(227,40,46,.40), transparent 43%), linear-gradient(145deg,#e3282e 0%,#651018 100%)" }),
  "india-post-payments": brand({ key: "india-post-payments", displayName: "India Post Payments Bank", primaryColor: "#e35a25", secondaryColor: "#76260f", accentColor: "#ffd067", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ffd067", borderColor: "rgba(255,208,103,.24)", decorationColor: "rgba(255,208,103,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,208,103,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(227,90,37,.40), transparent 43%), linear-gradient(145deg,#e35a25 0%,#76260f 100%)" }),
  "fino-payments": brand({ key: "fino-payments", displayName: "Fino Payments Bank", primaryColor: "#00a8a0", secondaryColor: "#04534f", accentColor: "#ffcc55", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#ffcc55", borderColor: "rgba(255,204,85,.24)", decorationColor: "rgba(255,204,85,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(255,204,85,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,168,160,.40), transparent 43%), linear-gradient(145deg,#00a8a0 0%,#04534f 100%)" }),
  "chase": brand({ key: "chase", displayName: "Chase", primaryColor: "#1174b9", secondaryColor: "#063b68", accentColor: "#5bc5f2", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#5bc5f2", borderColor: "rgba(91,197,242,.24)", decorationColor: "rgba(91,197,242,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(91,197,242,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(17,116,185,.40), transparent 43%), linear-gradient(145deg,#1174b9 0%,#063b68 100%)" }),
  "bank-of-america": brand({ key: "bank-of-america", displayName: "Bank of America", primaryColor: "#b51f3a", secondaryColor: "#64101e", accentColor: "#4f9de8", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#4f9de8", borderColor: "rgba(79,157,232,.24)", decorationColor: "rgba(79,157,232,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(79,157,232,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(181,31,58,.40), transparent 43%), linear-gradient(145deg,#b51f3a 0%,#64101e 100%)" }),
  "wells-fargo": brand({ key: "wells-fargo", displayName: "Wells Fargo", primaryColor: "#c41230", secondaryColor: "#670b1c", accentColor: "#f4b33f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f4b33f", borderColor: "rgba(244,179,63,.24)", decorationColor: "rgba(244,179,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(244,179,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(196,18,48,.40), transparent 43%), linear-gradient(145deg,#c41230 0%,#670b1c 100%)" }),
  "citi": brand({ key: "citi", displayName: "Citi", primaryColor: "#174b83", secondaryColor: "#0a2d59", accentColor: "#eb4d5c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#eb4d5c", borderColor: "rgba(235,77,92,.24)", decorationColor: "rgba(235,77,92,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(235,77,92,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,75,131,.40), transparent 43%), linear-gradient(145deg,#174b83 0%,#0a2d59 100%)" }),
  "goldman-sachs": brand({ key: "goldman-sachs", displayName: "Goldman Sachs", primaryColor: "#6b7a8c", secondaryColor: "#27303b", accentColor: "#b7d3e8", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#b7d3e8", borderColor: "rgba(183,211,232,.24)", decorationColor: "rgba(183,211,232,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(183,211,232,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(107,122,140,.40), transparent 43%), linear-gradient(145deg,#6b7a8c 0%,#27303b 100%)" }),
  "morgan-stanley": brand({ key: "morgan-stanley", displayName: "Morgan Stanley", primaryColor: "#1c4772", secondaryColor: "#0a2742", accentColor: "#68a9d6", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#68a9d6", borderColor: "rgba(104,169,214,.24)", decorationColor: "rgba(104,169,214,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(104,169,214,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(28,71,114,.40), transparent 43%), linear-gradient(145deg,#1c4772 0%,#0a2742 100%)" }),
  "us-bank": brand({ key: "us-bank", displayName: "U.S. Bank", primaryColor: "#d9272e", secondaryColor: "#6e0e15", accentColor: "#4a93d1", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#4a93d1", borderColor: "rgba(74,147,209,.24)", decorationColor: "rgba(74,147,209,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(74,147,209,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(217,39,46,.40), transparent 43%), linear-gradient(145deg,#d9272e 0%,#6e0e15 100%)" }),
  "capital-one": brand({ key: "capital-one", displayName: "Capital One", primaryColor: "#004879", secondaryColor: "#00253f", accentColor: "#d71920", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#d71920", borderColor: "rgba(215,25,32,.24)", decorationColor: "rgba(215,25,32,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(215,25,32,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,72,121,.40), transparent 43%), linear-gradient(145deg,#004879 0%,#00253f 100%)" }),
  "pnc": brand({ key: "pnc", displayName: "PNC Bank", primaryColor: "#f58025", secondaryColor: "#74310b", accentColor: "#4b8ac6", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#4b8ac6", borderColor: "rgba(75,138,198,.24)", decorationColor: "rgba(75,138,198,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(75,138,198,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(245,128,37,.40), transparent 43%), linear-gradient(145deg,#f58025 0%,#74310b 100%)" }),
  "truist": brand({ key: "truist", displayName: "Truist", primaryColor: "#3c1b70", secondaryColor: "#21103d", accentColor: "#8f73d8", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#8f73d8", borderColor: "rgba(143,115,216,.24)", decorationColor: "rgba(143,115,216,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(143,115,216,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(60,27,112,.40), transparent 43%), linear-gradient(145deg,#3c1b70 0%,#21103d 100%)" }),
  "td-bank-us": brand({ key: "td-bank-us", displayName: "TD Bank", primaryColor: "#008a4b", secondaryColor: "#004c2b", accentColor: "#74d5a5", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#74d5a5", borderColor: "rgba(116,213,165,.24)", decorationColor: "rgba(116,213,165,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(116,213,165,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,138,75,.40), transparent 43%), linear-gradient(145deg,#008a4b 0%,#004c2b 100%)" }),
  "bny-mellon": brand({ key: "bny-mellon", displayName: "BNY Mellon", primaryColor: "#0d4d7b", secondaryColor: "#082b45", accentColor: "#4ca6d6", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#4ca6d6", borderColor: "rgba(76,166,214,.24)", decorationColor: "rgba(76,166,214,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(76,166,214,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(13,77,123,.40), transparent 43%), linear-gradient(145deg,#0d4d7b 0%,#082b45 100%)" }),
  "state-street": brand({ key: "state-street", displayName: "State Street", primaryColor: "#1e4b78", secondaryColor: "#0c2943", accentColor: "#6eb1d8", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#6eb1d8", borderColor: "rgba(110,177,216,.24)", decorationColor: "rgba(110,177,216,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(110,177,216,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(30,75,120,.40), transparent 43%), linear-gradient(145deg,#1e4b78 0%,#0c2943 100%)" }),
  "bmo": brand({ key: "bmo", displayName: "BMO Bank", primaryColor: "#007a5e", secondaryColor: "#034538", accentColor: "#e85c5c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#e85c5c", borderColor: "rgba(232,92,92,.24)", decorationColor: "rgba(232,92,92,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(232,92,92,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,122,94,.40), transparent 43%), linear-gradient(145deg,#007a5e 0%,#034538 100%)" }),
  "citizens": brand({ key: "citizens", displayName: "Citizens Bank", primaryColor: "#008a70", secondaryColor: "#004c3d", accentColor: "#9bd9c8", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#9bd9c8", borderColor: "rgba(155,217,200,.24)", decorationColor: "rgba(155,217,200,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(155,217,200,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,138,112,.40), transparent 43%), linear-gradient(145deg,#008a70 0%,#004c3d 100%)" }),
  "fifth-third": brand({ key: "fifth-third", displayName: "Fifth Third Bank", primaryColor: "#00539b", secondaryColor: "#062f5d", accentColor: "#f2c23f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2c23f", borderColor: "rgba(242,194,63,.24)", decorationColor: "rgba(242,194,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,194,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,83,155,.40), transparent 43%), linear-gradient(145deg,#00539b 0%,#062f5d 100%)" }),
  "keybank": brand({ key: "keybank", displayName: "KeyBank", primaryColor: "#c8102e", secondaryColor: "#680817", accentColor: "#f6b63f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f6b63f", borderColor: "rgba(246,182,63,.24)", decorationColor: "rgba(246,182,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(246,182,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(200,16,46,.40), transparent 43%), linear-gradient(145deg,#c8102e 0%,#680817 100%)" }),
  "huntington": brand({ key: "huntington", displayName: "Huntington Bank", primaryColor: "#006b54", secondaryColor: "#003d31", accentColor: "#f1b83f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f1b83f", borderColor: "rgba(241,184,63,.24)", decorationColor: "rgba(241,184,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(241,184,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,107,84,.40), transparent 43%), linear-gradient(145deg,#006b54 0%,#003d31 100%)" }),
  "regions": brand({ key: "regions", displayName: "Regions Bank", primaryColor: "#006c8e", secondaryColor: "#003d51", accentColor: "#79c7d9", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#79c7d9", borderColor: "rgba(121,199,217,.24)", decorationColor: "rgba(121,199,217,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(121,199,217,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,108,142,.40), transparent 43%), linear-gradient(145deg,#006c8e 0%,#003d51 100%)" }),
  "m-and-t": brand({ key: "m-and-t", displayName: "M&T Bank", primaryColor: "#005a9c", secondaryColor: "#06345d", accentColor: "#f2b83d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b83d", borderColor: "rgba(242,184,61,.24)", decorationColor: "rgba(242,184,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,184,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,90,156,.40), transparent 43%), linear-gradient(145deg,#005a9c 0%,#06345d 100%)" }),
  "first-citizens": brand({ key: "first-citizens", displayName: "First Citizens Bank", primaryColor: "#002d62", secondaryColor: "#001b3b", accentColor: "#b8cbe3", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#b8cbe3", borderColor: "rgba(184,203,227,.24)", decorationColor: "rgba(184,203,227,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(184,203,227,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,45,98,.40), transparent 43%), linear-gradient(145deg,#002d62 0%,#001b3b 100%)" }),
  "ally": brand({ key: "ally", displayName: "Ally Bank", primaryColor: "#6d1e7c", secondaryColor: "#37103e", accentColor: "#d5a4df", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#d5a4df", borderColor: "rgba(213,164,223,.24)", decorationColor: "rgba(213,164,223,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(213,164,223,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(109,30,124,.40), transparent 43%), linear-gradient(145deg,#6d1e7c 0%,#37103e 100%)" }),
  "discover": brand({ key: "discover", displayName: "Discover Bank", primaryColor: "#f58220", secondaryColor: "#71320d", accentColor: "#f8c46b", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f8c46b", borderColor: "rgba(248,196,107,.24)", decorationColor: "rgba(248,196,107,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(248,196,107,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(245,130,32,.40), transparent 43%), linear-gradient(145deg,#f58220 0%,#71320d 100%)" }),
  "american-express": brand({ key: "american-express", displayName: "American Express", primaryColor: "#006fcf", secondaryColor: "#003b70", accentColor: "#72b9f1", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#72b9f1", borderColor: "rgba(114,185,241,.24)", decorationColor: "rgba(114,185,241,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(114,185,241,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,111,207,.40), transparent 43%), linear-gradient(145deg,#006fcf 0%,#003b70 100%)" }),
  "charles-schwab": brand({ key: "charles-schwab", displayName: "Charles Schwab", primaryColor: "#00a3e0", secondaryColor: "#005274", accentColor: "#f2b83d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b83d", borderColor: "rgba(242,184,61,.24)", decorationColor: "rgba(242,184,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,184,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,163,224,.40), transparent 43%), linear-gradient(145deg,#00a3e0 0%,#005274 100%)" }),
  "usaa": brand({ key: "usaa", displayName: "USAA", primaryColor: "#00529b", secondaryColor: "#002d5b", accentColor: "#77b7e5", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#77b7e5", borderColor: "rgba(119,183,229,.24)", decorationColor: "rgba(119,183,229,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(119,183,229,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,82,155,.40), transparent 43%), linear-gradient(145deg,#00529b 0%,#002d5b 100%)" }),
  "synchrony": brand({ key: "synchrony", displayName: "Synchrony Bank", primaryColor: "#0069a6", secondaryColor: "#00385a", accentColor: "#f2b83d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b83d", borderColor: "rgba(242,184,61,.24)", decorationColor: "rgba(242,184,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,184,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,105,166,.40), transparent 43%), linear-gradient(145deg,#0069a6 0%,#00385a 100%)" }),
  "comerica": brand({ key: "comerica", displayName: "Comerica Bank", primaryColor: "#006fba", secondaryColor: "#00385e", accentColor: "#f3b83f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f3b83f", borderColor: "rgba(243,184,63,.24)", decorationColor: "rgba(243,184,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(243,184,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,111,186,.40), transparent 43%), linear-gradient(145deg,#006fba 0%,#00385e 100%)" }),
  "zions": brand({ key: "zions", displayName: "Zions Bank", primaryColor: "#007a9e", secondaryColor: "#043f52", accentColor: "#f0b83f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f0b83f", borderColor: "rgba(240,184,63,.24)", decorationColor: "rgba(240,184,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(240,184,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,122,158,.40), transparent 43%), linear-gradient(145deg,#007a9e 0%,#043f52 100%)" }),
  "frost": brand({ key: "frost", displayName: "Frost Bank", primaryColor: "#005c97", secondaryColor: "#073653", accentColor: "#9ac8e5", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#9ac8e5", borderColor: "rgba(154,200,229,.24)", decorationColor: "rgba(154,200,229,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(154,200,229,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,92,151,.40), transparent 43%), linear-gradient(145deg,#005c97 0%,#073653 100%)" }),
  "webster": brand({ key: "webster", displayName: "Webster Bank", primaryColor: "#0073a8", secondaryColor: "#053b57", accentColor: "#f0b841", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f0b841", borderColor: "rgba(240,184,65,.24)", decorationColor: "rgba(240,184,65,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(240,184,65,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,115,168,.40), transparent 43%), linear-gradient(145deg,#0073a8 0%,#053b57 100%)" }),
  "old-national": brand({ key: "old-national", displayName: "Old National Bank", primaryColor: "#174f8c", secondaryColor: "#0b2b51", accentColor: "#eab83f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#eab83f", borderColor: "rgba(234,184,63,.24)", decorationColor: "rgba(234,184,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(234,184,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,79,140,.40), transparent 43%), linear-gradient(145deg,#174f8c 0%,#0b2b51 100%)" }),
  "associated-bank": brand({ key: "associated-bank", displayName: "Associated Bank", primaryColor: "#007f8b", secondaryColor: "#04454c", accentColor: "#f1b83e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f1b83e", borderColor: "rgba(241,184,62,.24)", decorationColor: "rgba(241,184,62,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(241,184,62,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,127,139,.40), transparent 43%), linear-gradient(145deg,#007f8b 0%,#04454c 100%)" }),
  "east-west-bank": brand({ key: "east-west-bank", displayName: "East West Bank", primaryColor: "#174a85", secondaryColor: "#0b2b53", accentColor: "#f2b83f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b83f", borderColor: "rgba(242,184,63,.24)", decorationColor: "rgba(242,184,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,184,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,74,133,.40), transparent 43%), linear-gradient(145deg,#174a85 0%,#0b2b53 100%)" }),
  "first-horizon": brand({ key: "first-horizon", displayName: "First Horizon Bank", primaryColor: "#0071a8", secondaryColor: "#053b59", accentColor: "#efb73d", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#efb73d", borderColor: "rgba(239,183,61,.24)", decorationColor: "rgba(239,183,61,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(239,183,61,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,113,168,.40), transparent 43%), linear-gradient(145deg,#0071a8 0%,#053b59 100%)" }),
  "fulton-bank": brand({ key: "fulton-bank", displayName: "Fulton Bank", primaryColor: "#006f9b", secondaryColor: "#073a51", accentColor: "#f2b63e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b63e", borderColor: "rgba(242,182,62,.24)", decorationColor: "rgba(242,182,62,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,182,62,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,111,155,.40), transparent 43%), linear-gradient(145deg,#006f9b 0%,#073a51 100%)" }),
  "valley-bank": brand({ key: "valley-bank", displayName: "Valley Bank", primaryColor: "#0067a6", secondaryColor: "#053657", accentColor: "#f0b640", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f0b640", borderColor: "rgba(240,182,64,.24)", decorationColor: "rgba(240,182,64,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(240,182,64,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,103,166,.40), transparent 43%), linear-gradient(145deg,#0067a6 0%,#053657 100%)" }),
  "popular-bank": brand({ key: "popular-bank", displayName: "Popular Bank", primaryColor: "#006aa6", secondaryColor: "#05365b", accentColor: "#f2b43e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b43e", borderColor: "rgba(242,180,62,.24)", decorationColor: "rgba(242,180,62,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,180,62,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,106,166,.40), transparent 43%), linear-gradient(145deg,#006aa6 0%,#05365b 100%)" }),
  "santander-us": brand({ key: "santander-us", displayName: "Santander Bank", primaryColor: "#e1261c", secondaryColor: "#6b0e0a", accentColor: "#f5bd35", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f5bd35", borderColor: "rgba(245,189,53,.24)", decorationColor: "rgba(245,189,53,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(245,189,53,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(225,38,28,.40), transparent 43%), linear-gradient(145deg,#e1261c 0%,#6b0e0a 100%)" }),
  "bancorp-bank": brand({ key: "bancorp-bank", displayName: "The Bancorp Bank", primaryColor: "#174f87", secondaryColor: "#0a2d52", accentColor: "#f0b63c", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f0b63c", borderColor: "rgba(240,182,60,.24)", decorationColor: "rgba(240,182,60,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(240,182,60,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(23,79,135,.40), transparent 43%), linear-gradient(145deg,#174f87 0%,#0a2d52 100%)" }),
  "sofi": brand({ key: "sofi", displayName: "SoFi Bank", primaryColor: "#1f2937", secondaryColor: "#111827", accentColor: "#36cfc9", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#36cfc9", borderColor: "rgba(54,207,201,.24)", decorationColor: "rgba(54,207,201,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(54,207,201,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(31,41,55,.40), transparent 43%), linear-gradient(145deg,#1f2937 0%,#111827 100%)" }),
  "marcus": brand({ key: "marcus", displayName: "Marcus by Goldman Sachs", primaryColor: "#6b7a8c", secondaryColor: "#27303b", accentColor: "#8bd3ff", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#8bd3ff", borderColor: "rgba(139,211,255,.24)", decorationColor: "rgba(139,211,255,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(139,211,255,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(107,122,140,.40), transparent 43%), linear-gradient(145deg,#6b7a8c 0%,#27303b 100%)" }),
  "nbkc": brand({ key: "nbkc", displayName: "NBKC Bank", primaryColor: "#007c91", secondaryColor: "#043f49", accentColor: "#f2b53e", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b53e", borderColor: "rgba(242,181,62,.24)", decorationColor: "rgba(242,181,62,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,181,62,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,124,145,.40), transparent 43%), linear-gradient(145deg,#007c91 0%,#043f49 100%)" }),
  "live-oak": brand({ key: "live-oak", displayName: "Live Oak Bank", primaryColor: "#008a9a", secondaryColor: "#03464e", accentColor: "#f2b73f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.67)", iconColor: "#f2b73f", borderColor: "rgba(242,183,63,.24)", decorationColor: "rgba(242,183,63,.14)", backgroundGradient: "radial-gradient(circle at 13% 8%, rgba(242,183,63,.38), transparent 36%), radial-gradient(circle at 92% 4%, rgba(0,138,154,.40), transparent 43%), linear-gradient(145deg,#008a9a 0%,#03464e 100%)" }),
  "slice": brand({ key: "slice", displayName: "Slice", primaryColor: "#913c9f", secondaryColor: "#40154f", accentColor: "#ff8b5f", textColor: "#ffffff", mutedTextColor: "rgba(255,255,255,.7)", iconColor: "#ffb3e6", borderColor: "rgba(255,197,255,.24)", decorationColor: "rgba(255,184,241,.16)", backgroundGradient: "radial-gradient(circle at 12% 8%, rgba(255,139,95,.5), transparent 37%), radial-gradient(circle at 92% 3%, rgba(229,67,171,.48), transparent 44%), linear-gradient(145deg,#a348a8 0%,#762f8f 48%,#40154f 100%)" }),
};

const verifiedLogoByBrand: Partial<Record<Exclude<BankBrandKey, "default">, VerifiedBankLogoId>> = {
  "axis": "axis-bank",
  "bank-of-america": "bank-of-america",
  "chase": "chase",
  "discover": "discover",
  "goldman-sachs": "goldman-sachs",
  "hdfc": "hdfc-bank",
  "icici": "icici-bank",
  "wells-fargo": "wells-fargo",
  "american-express": "american-express",
};

for (const [key, logoId] of Object.entries(verifiedLogoByBrand) as Array<[Exclude<BankBrandKey, "default">, VerifiedBankLogoId]>) {
  const logo: BankLogoAvailability = { status: "VERIFIED_LOGO", id: logoId, source: "Simple Icons via react-icons" };
  bankBrands[key] = Object.freeze({
    ...bankBrands[key],
    logo,
  });
}
Object.freeze(bankBrands);

const aliases: Record<Exclude<BankBrandKey, "default">, readonly string[]> = {
  "sbi": ["sbi", "state bank", "state bank of india"],
  "hdfc": ["hdfc", "hdfc bank"],
  "icici": ["icici", "icici bank"],
  "axis": ["axis", "axis bank"],
  "kotak": ["kotak", "kotak bank", "kotak mahindra", "kotak mahindra bank"],
  "bank-of-baroda": ["bank of baroda", "bob"],
  "canara": ["canara", "canara bank"],
  "idfc-first": ["idfc", "idfc first", "idfc first bank"],
  "indusind": ["indusind", "indusind bank"],
  "yes-bank": ["yes bank"],
  "federal": ["federal", "federal bank"],
  "pnb": ["pnb", "punjab national bank"],
  "bank-of-india": ["bank of india", "boi"],
  "union-bank": ["ubi", "union bank", "union bank of india"],
  "indian-bank": ["indian bank"],
  "rbl": ["rbl", "rbl bank"],
  "bandhan": ["bandhan", "bandhan bank"],
  "bank-of-maharashtra": ["bank of maharashtra"],
  "central-bank-of-india": ["central bank of india"],
  "indian-overseas-bank": ["indian overseas bank"],
  "punjab-and-sind-bank": ["punjab & sind bank", "punjab and sind bank"],
  "uco-bank": ["uco bank"],
  "idbi": ["idbi", "idbi bank"],
  "csb": ["csb", "csb bank"],
  "city-union": ["city union", "city union bank"],
  "dcb": ["dcb", "dcb bank"],
  "dhanlaxmi": ["dhanlaxmi", "dhanlaxmi bank"],
  "jammu-kashmir": ["jammu & kashmir bank", "jammu kashmir"],
  "karnataka-bank": ["karnataka bank"],
  "karur-vysya": ["karur vysya", "karur vysya bank"],
  "nainital": ["nainital", "nainital bank"],
  "south-indian": ["south indian", "south indian bank"],
  "tamilnad-mercantile": ["tamilnad mercantile", "tamilnad mercantile bank"],
  "au-small-finance": ["au small finance", "au small finance bank"],
  "capital-small-finance": ["capital small finance", "capital small finance bank"],
  "equitas": ["equitas", "equitas small finance bank"],
  "esaf": ["esaf", "esaf small finance bank"],
  "suryoday": ["suryoday", "suryoday small finance bank"],
  "ujjivan": ["ujjivan", "ujjivan small finance bank"],
  "utkarsh": ["utkarsh", "utkarsh small finance bank"],
  "jana": ["jana", "jana small finance bank"],
  "north-east-small-finance": ["north east small finance", "north east small finance bank"],
  "shivalik": ["shivalik", "shivalik small finance bank"],
  "unity-small-finance": ["unity small finance", "unity small finance bank"],
  "airtel-payments": ["airtel payments", "airtel payments bank"],
  "india-post-payments": ["india post payments", "india post payments bank"],
  "fino-payments": ["fino payments", "fino payments bank"],
  "chase": ["chase", "chase bank", "jp morgan", "jp morgan chase", "jpmorgan chase", "jpmorgan chase bank"],
  "bank-of-america": ["bank of america", "bank of america na", "boa"],
  "wells-fargo": ["wells fargo", "wells fargo bank"],
  "citi": ["citi", "citi bank", "citibank"],
  "goldman-sachs": ["goldman sachs"],
  "morgan-stanley": ["morgan stanley"],
  "us-bank": ["u.s. bank", "us bank"],
  "capital-one": ["capital one", "capital one bank"],
  "pnc": ["pnc", "pnc bank"],
  "truist": ["truist"],
  "td-bank-us": ["td bank", "td bank us", "td bank usa"],
  "bny-mellon": ["bank of new york mellon", "bny", "bny mellon"],
  "state-street": ["state street"],
  "bmo": ["bmo", "bmo bank"],
  "citizens": ["citizens", "citizens bank"],
  "fifth-third": ["fifth third", "fifth third bank"],
  "keybank": ["keybank"],
  "huntington": ["huntington", "huntington bank"],
  "regions": ["regions", "regions bank"],
  "m-and-t": ["m and t", "m and t bank", "m&t", "m&t bank"],
  "first-citizens": ["first citizens", "first citizens bank"],
  "ally": ["ally", "ally bank"],
  "discover": ["discover", "discover bank"],
  "american-express": ["american express", "amex"],
  "charles-schwab": ["charles schwab", "schwab"],
  "usaa": ["usaa"],
  "synchrony": ["synchrony", "synchrony bank"],
  "comerica": ["comerica", "comerica bank"],
  "zions": ["zions", "zions bank"],
  "frost": ["frost", "frost bank"],
  "webster": ["webster", "webster bank"],
  "old-national": ["old national", "old national bank"],
  "associated-bank": ["associated bank"],
  "east-west-bank": ["east west bank"],
  "first-horizon": ["first horizon", "first horizon bank"],
  "fulton-bank": ["fulton bank"],
  "valley-bank": ["valley bank"],
  "popular-bank": ["popular bank"],
  "santander-us": ["santander bank", "santander us"],
  "bancorp-bank": ["bancorp bank", "the bancorp bank"],
  "sofi": ["sofi", "sofi bank"],
  "marcus": ["marcus", "marcus by goldman sachs"],
  "nbkc": ["nbkc", "nbkc bank"],
  "live-oak": ["live oak", "live oak bank"],
  "slice": ["slice", "slice card", "slice pay"],
};

export function normalizeInstitutionName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(?:private|pvt|limited|ltd|incorporated|inc|corporation|corp|n a|na)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasIndex = new Map<string, Exclude<BankBrandKey, "default">>(
  Object.entries(aliases).flatMap(([key, values]) => values.map((value) => [normalizeInstitutionName(value), key as Exclude<BankBrandKey, "default">])),
 );

export function resolveBankBrand(institutionName: string | null | undefined): BankBrand {
  const normalized = normalizeInstitutionName(institutionName);
  const key = aliasIndex.get(normalized);
  return key ? bankBrands[key] : defaultBankBrand;
}

export const institutionCatalog = Object.freeze(Object.values(bankBrands));

export function getBankBrandCoverageReport() {
  const verifiedLogos = institutionCatalog.filter((item) => item.logo.status === "VERIFIED_LOGO");
  const textOnlyFallbacks = institutionCatalog.filter((item) => item.logo.status === "TEXT_ONLY_FALLBACK");
  return {
    total: institutionCatalog.length,
    verifiedLogos,
    textOnlyFallbacks,
    missing: institutionCatalog.filter((item) => !item.logo),
    aliases: Object.values(aliases).reduce((total, values) => total + values.length, 0),
  };
}

export { aliases as bankBrandAliases, bankBrands };
