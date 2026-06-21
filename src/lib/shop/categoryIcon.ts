// Maps a grocery category slug to a lucide icon component. Used as a friendly
// placeholder when a product has no image, and as a small accent next to the
// category filter pills. Falls back to ShoppingBasket for unknown slugs.

import {
  Apple,
  Archive,
  Baby,
  Candy,
  Carrot,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  Fish,
  Ham,
  Milk,
  PawPrint,
  ShoppingBasket,
  ShowerHead,
  Snowflake,
  Soup,
  SprayCan,
  Wheat,
  Wine,
  type LucideIcon
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  pieczywo: Croissant,
  'nabial-jaja': Milk,
  'mieso-drob': Drumstick,
  wedliny: Ham,
  ryby: Fish,
  owoce: Apple,
  warzywa: Carrot,
  mrozonki: Snowflake,
  spizarnia: Wheat,
  konserwy: Archive,
  'sosy-przyprawy': Soup,
  slodycze: Candy,
  przekaski: Cookie,
  napoje: CupSoda,
  'kawa-herbata': Coffee,
  alkohol: Wine,
  'dla-dziecka': Baby,
  higiena: ShowerHead,
  chemia: SprayCan,
  'dla-zwierzat': PawPrint
};

export function categoryIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return ShoppingBasket;
  return ICONS[slug] ?? ShoppingBasket;
}
