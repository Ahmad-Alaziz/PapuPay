# PapuPay design and Apple HIG review

## Design thesis

PapuPay should feel like the friendly host at a shared table: warm, appetizing, and clear enough to order immediately. The signature is a dimensional papaya with QR-like seeds, paired with expressive food photography, butter paper surfaces, forest-green controls, and restrained orange moments.

The ordering hierarchy is: table context → cravings → restaurant → dish → one basket → separate kitchen tickets → pickup. The brand makes the opening memorable; controls use familiar conventions.

## Research and type decision

Reviewed Dribbble and Behance food-ordering and identity work, including:

- [Eatsy — Food Delivery App UI & Visual Identity](https://www.behance.net/gallery/232601021/Food-Delivery-App-UI-Visual-Identity): warm identity and clear contrast between expressive branding and ordering information. Its Recoleta direction was considered, not copied.
- [Purrmato — Delivery Mobile iOS App](https://dribbble.com/shots/24642221-Delivery-Mobile-iOS-App-Design-Concept): orange accents, large food images, and disciplined interface typography. Its Forma direction informed the need for calmer controls.
- [Fresh Food delivery UI](https://dribbble.com/shots/16973141): food imagery and discovery hierarchy, reviewed during initial research.

Compared the actual PapuPay wordmark, Polish headings and menu cards in Bricolage Grotesque + Manrope and Fraunces + Manrope. Selected **Bricolage Grotesque**: distinctive forms and a strong lowercase rhythm without the uniformly bubbly appearance of the previous Fredoka direction. Fraunces was too editorial for the main ordering flow.

The logo is explicitly **PapuPay**, capital P twice, weight 800, optical sizing, tighter wordmark tracking. The 3D papaya adds depth without making every UI component decorative.

Fonts are self-hosted, OFL-licensed, and include Polish glyphs. iOS uses named static Bricolage instances for predictable rendering and smaller bundles; native body and controls use system text styles with Dynamic Type.

## Tokens and hierarchy

| Role | Web | iOS |
| --- | --- | --- |
| Brand | Bricolage 800, 29 mobile / 36 desktop | Bricolage 800, 27 navigation |
| Hero | Bricolage 750, 43–58 mobile / 56–80 desktop | Bricolage Bold, 43–48 base, Dynamic Type |
| Section title | Bricolage 700, 34 mobile / 44 desktop | Bricolage Bold, 34 base |
| Card heading | Bricolage 650–700, 22–26 | Bricolage Bold, 23 |
| Main body | Manrope 500, 16–17 | SF body/callout styles |
| Metadata | Manrope 11–14, medium | SF caption/footnote styles |

Spacing scale: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64**. Mobile page gutters 20 web / 24 native; desktop gutters 40. Sheets use 24 mobile / 32 desktop. Card gaps 16 mobile and 24 desktop, with more vertical separation between restaurants. Primary actions are at least 52 high. Compact icon actions, favorites, close, map zoom, and quantity controls have 44-point/pixel targets.

| Color | Purpose |
| --- | --- |
| `#173C2B` | Primary text and main actions |
| `#FBF7ED` | Paper background |
| `#FFF2D6` | Butter accents / text on dark buttons |
| `#FF8848` | Brand papaya and decorative orange |
| `#C95521` | Large orange headline text |
| `#2B744B` | Green accents |
| `#536451` | Secondary reading text |

Measured on paper: primary text 11.43:1. The original muted `#61705F` was 4.92:1; the final muted tone is darker. Orange headline `#C95521` is 4.09:1, suitable for large bold text. Bright papaya orange is reserved for logos, illustration and accents, not small reading text.

## Apple Design Skill applied

User-requested skill: [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill/blob/main/SKILL.md). Read its accessibility, layout, typography, color, iOS, branding, motion, Liquid Glass, buttons and cross-platform references before this pass.

Audit findings and changes, using the skill’s review format:

| Severity | Finding → correction | Reference |
| --- | --- | --- |
| High | Small quantity/favorite targets → 44-point targets, without relying on tiny glyphs | `references/accessibility.md`, buttons and touch targets |
| High | Mobile sticky add-to-basket footer partly offscreen → anchored at bottom 0 with safe-area padding | `references/layout.md`, safe areas |
| Medium | All headings had the same bubbly voice → expressive Bricolage headings plus restrained body text | `references/typography.md`, hierarchy; `branding.md` |
| Medium | Restaurant names shrank to fit → natural wrapping; native accessibility sizes use a single column | `references/accessibility.md`, larger text |
| Medium | Native custom small body fonts → native text-style roles with Dynamic Type | `references/typography.md` |
| Medium | Bright orange headline contrast → darker text-specific orange | `references/color.md`, contrast |
| Medium | Glass used for static table content → solid paper pill; native glass retained for navigation and actions | `references/liquid-glass.md`, control layer |
| Medium | Lock Screen inherited device RTL layout despite English content → explicit selected-language locale and LTR activity content | `references/designing-for-ios.md`, platform behavior |
| Low | Decorative labels competed with food → reduced hero ornaments and consistent metadata spacing | `references/branding.md`, deference to content |

Native navigation uses system TabView and NavigationStack, with actual iOS 26 Liquid Glass rather than a web imitation. The browser uses translucent CSS navigation as an analogous treatment. Both retain solid food cards. Reduced Motion replaces the Rive animation with the static papaya; web transitions honor the media query. Web increased-contrast / reduced-transparency requests make the floating controls opaque. Native glass follows system accessibility behavior.

The demo deliberately has a light art direction. A full semantic dark palette, exhaustive VoiceOver auditing and testing every Dynamic Type size on physical hardware remain production work; this document does not claim complete HIG compliance.

## Motion

Motion answers a user action: scan focuses the papaya, adding food confirms locally, checkout celebrates, map selection highlights a destination. Idle movement is gentle. The Rive is a custom state machine with an embedded dimensional illustration, not a real-time 3D model. See `MOTION.md` for editable sources and reproduction.
