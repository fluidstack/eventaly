import { ImageSourcePropType } from "react-native";

export type TemplateId =
  | "birthday"
  | "wedding"
  | "dinner"
  | "baby"
  | "christmas"
  | "newyear"
  | "christening";

export type Template = {
  id: TemplateId;
  name: string;
  tagline: string;
  accent: string;
  image: ImageSourcePropType;
  copyHints: string[];
  /** Templates flagged premium are gated behind Event Pro / Host Plus. */
  premium?: boolean;
};

/**
 * Free tier ships with exactly 2 templates (Birthday, Wedding). Everything
 * else is premium and requires Event Pro (per event) or Host Plus.
 */
export const FREE_TEMPLATE_IDS: TemplateId[] = ["birthday", "wedding"];

export const PREMIUM_TEMPLATE_IDS: TemplateId[] = [
  "dinner",
  "baby",
  "christmas",
  "newyear",
  "christening",
];

export function isPremiumTemplate(id: TemplateId | string | undefined): boolean {
  return PREMIUM_TEMPLATE_IDS.includes(id as TemplateId);
}

export const TEMPLATES: Template[] = [
  {
    id: "birthday",
    name: "Birthday",
    tagline: "Cake, candles & loud confetti",
    accent: "#F43F5E",
    image: require("../assets/images/template-birthday.png"),
    copyHints: [
      "Another year, another reason to celebrate. Join us for cake & chaos.",
      "Pull up — we're turning the music up and the candles on.",
      "Come dance, eat cake, and embarrass me with old photos.",
    ],
  },
  {
    id: "wedding",
    name: "Wedding",
    tagline: "Vows under string lights",
    accent: "#8B5CF6",
    image: require("../assets/images/template-wedding.png"),
    copyHints: [
      "We're getting married — and we'd love to have you there.",
      "Two hearts, one party. Save the date and pack your dancing shoes.",
      "Please join us as we say I do, then eat, drink and celebrate.",
    ],
  },
  {
    id: "dinner",
    name: "Dinner Party",
    tagline: "Long table, longer stories",
    accent: "#F59E0B",
    image: require("../assets/images/template-dinner.png"),
    premium: true,
    copyHints: [
      "Friends, food, and far too much wine. Come hungry.",
      "I'm cooking. You're eating. Bring an appetite and a story.",
      "A long table, candles low, and people I actually like. You in?",
    ],
  },
  {
    id: "baby",
    name: "Baby Shower",
    tagline: "Tiny socks & sweet wishes",
    accent: "#14B8A6",
    image: require("../assets/images/template-baby.png"),
    premium: true,
    copyHints: [
      "A little someone is on the way — come shower us with love.",
      "Small feet, big plans. Join us to celebrate the new arrival.",
      "Soft hugs, sweet treats, and the tiniest guest of honor.",
    ],
  },
  {
    id: "christmas",
    name: "Christmas",
    tagline: "Warm fires & wrapped gifts",
    accent: "#DC2626",
    image: require("../assets/images/template-christmas.png"),
    premium: true,
    copyHints: [
      "Merry, bright, and a little bit chaotic — come spend Christmas with us.",
      "Mulled wine is on, the tree is up, and your seat at the table is waiting.",
      "Cozy sweaters, twinkly lights, and people we love. Join us this Christmas.",
    ],
  },
  {
    id: "newyear",
    name: "New Year's",
    tagline: "Champagne & midnight kisses",
    accent: "#CA8A04",
    image: require("../assets/images/template-newyear.png"),
    premium: true,
    copyHints: [
      "One more night of the year — let's send it off in style.",
      "Glitter, champagne, and a countdown together. Join us on NYE.",
      "Pop the bubbly and pull up — we're ringing in the new year together.",
    ],
  },
  {
    id: "christening",
    name: "Christening",
    tagline: "A little blessing, a big day",
    accent: "#0EA5E9",
    image: require("../assets/images/template-christening.png"),
    premium: true,
    copyHints: [
      "Please join us as we celebrate our little one's christening.",
      "A quiet morning of blessings, followed by lunch with the people we love.",
      "Soft prayers, sweet smiles — come share this special day with us.",
    ],
  },
];

export function getTemplate(id: TemplateId | string | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
