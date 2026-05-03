import { ImageSourcePropType } from "react-native";

export type TemplateId = "birthday" | "wedding" | "dinner" | "baby";

export type Template = {
  id: TemplateId;
  name: string;
  tagline: string;
  accent: string;
  image: ImageSourcePropType;
  copyHints: string[];
};

export const TEMPLATES: Template[] = [
  {
    id: "birthday",
    name: "Birthday",
    tagline: "Cake, candles & loud confetti",
    accent: "#E85A4F",
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
    accent: "#B8556B",
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
    accent: "#D4A574",
    image: require("../assets/images/template-dinner.png"),
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
    accent: "#E8A87C",
    image: require("../assets/images/template-baby.png"),
    copyHints: [
      "A little someone is on the way — come shower us with love.",
      "Small feet, big plans. Join us to celebrate the new arrival.",
      "Soft hugs, sweet treats, and the tiniest guest of honor.",
    ],
  },
];

export function getTemplate(id: TemplateId | string | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
