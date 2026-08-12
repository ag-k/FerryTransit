export type AdFormat = 'text' | 'banner' | 'image'

export interface TextAdContent {
  advertiserName: string
  headline: string
  body: string
  cta: string
}

export interface ImageAdContent {
  assetUrl: string
  altText: string
  width: number
  height: number
}

export type DeliveredAd = {
  id: string
  slotId: string
  clickUrl: string | null
} & (
  | { format: 'text'; content: TextAdContent }
  | { format: 'banner' | 'image'; content: ImageAdContent }
)
