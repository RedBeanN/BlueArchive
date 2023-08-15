export interface FavorItem {
  Id: number,
  IsReleased: boolean[],
  Category: "Favor",
  Rarity: string,
  Quality: number,
  Tags: string,
  SynthQuality: number[],
  ExpValue: number,
  Shops: [],
  Icon: string,
  Name: string,
  Desc: string,
}