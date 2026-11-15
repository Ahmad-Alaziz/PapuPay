import SwiftUI
import UIKit

enum SweetoLanguage: String, CaseIterable {
  case pl, en, ru

  var label: String {
    switch self {
    case .pl: "Polski"
    case .en: "English"
    case .ru: "Русский"
    }
  }

  func text(_ polish: String, _ english: String, _ russian: String) -> String {
    switch self {
    case .pl: polish
    case .en: english
    case .ru: russian
    }
  }
}

struct VenueGuestPalette {
  let paper: Color
  let ink: Color
  let primary: Color
  let muted: Color
  let line: Color
  let language: SweetoLanguage
  let font: String
  let motionTheme: String

  init(_ theme: VenueGuestTheme?, language: SweetoLanguage) {
    paper = Color(hex: theme?.background ?? "FFFCF7")
    ink = Color(hex: theme?.ink ?? "0C477B")
    primary = Color(hex: theme?.accent ?? "1765A8")
    muted = Color(hex: theme?.muted ?? "526273")
    line = Color(hex: theme?.surface ?? "E8F0F8")
    self.language = language
    font = theme?.font ?? "bricolage"
    motionTheme = theme?.motionTheme ?? "sweeto"
  }

  func display(_ style: Font.TextStyle) -> Font {
    let size: CGFloat = switch style {
    case .largeTitle: 33
    case .title: 27
    case .title2: 30
    default: 18
    }
    return switch font {
    case "serif": .system(style, design: .serif, weight: .semibold)
    case "system": .system(style, weight: .semibold)
    case "dm-sans" where language != .ru: .custom("PapuDisplay-Bold", size: size, relativeTo: style)
    case "bricolage" where language != .ru: .custom("BricolageGrotesque-96ptExtraBold", size: size, relativeTo: style)
    default:
      .custom("Manrope-ExtraLight", size: size, relativeTo: style)
        .weight(.semibold)
    }
  }
}

struct SweetoGuestView: View {
  @AppStorage("papupay-native-language") private var language: SweetoLanguage = .pl
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.openURL) private var openURL
  @Environment(\.scenePhase) private var scenePhase
  @State private var path: [VenueGuestScreen] = []
  @State private var link = VenueGuestLink.starter
  @State private var config: VenueGuestConfig?
  @State private var configFailed = false
  @State private var badLink = false
  @State private var wifiBusy = false
  @State private var wifiAccepted = false
  @State private var wifiFailed = false
  @State private var wifiDetails: VenueGuestWiFi?
  @State private var activeHomeArt: VenueActionArt.Kind?
  @State private var animatedHomeVenue: String?
  @State private var menuVisible = false
#if !PAPUPAY_APP_CLIP
  @AppStorage("papupay-native-resumed-clip-on-launch") private var resumedClipOnLaunch = false
  @State private var showVenues = false
  @State private var handledInvocation = false
#endif

  private var palette: VenueGuestPalette { VenueGuestPalette(config?.theme, language: language) }
  private var api: VenueGuestAPI { VenueGuestAPI(venue: link) }
  private var isSweeto: Bool { link.slug == "sweeto" }
  private var venueName: String { config?.name ?? (isSweeto ? "Sweeto" : "PapuPay") }
  private var address: String { config?.address ?? (isSweeto ? "Puławska 246/8, Warszawa" : "") }
  private var homeMotionKey: String? {
    !reduceMotion && path.isEmpty && (config != nil || isSweeto) ? link.slug : nil
  }
  private var maps: URL? {
    link.googleMapsURL(config?.mapUrl) ?? (isSweeto ? URL(string: "https://www.google.com/maps?cid=12629433022150019195") : nil)
  }
  private var reviewURL: URL? {
    if let config { return link.googleReviewURL(config.reviewUrl) }
    guard isSweeto else { return nil }
    return URL(string: "https://search.google.com/local/writereview?placeid=ChIJZSkE8-IzGUcRewjXh2vCRK8")
  }

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    NavigationStack(path: $path) {
      home
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { header }
        .navigationDestination(for: VenueGuestScreen.self) { screen in
          destination(screen)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { header }
        }
    }
    .tint(palette.primary)
    .preferredColorScheme(.light)
    .environment(\.locale, Locale(identifier: language.rawValue))
    .onOpenURL(perform: follow)
    .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
      if let url = activity.webpageURL { follow(url) }
    }
    .task(id: link) { await load() }
    .alert(t("Sprawdź kod", "Check your QR code", "Проверьте QR-код"), isPresented: $badLink) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(t("Zeskanuj ponownie kod lokalu.", "Scan the venue’s QR code again.", "Отсканируйте QR-код заведения ещё раз."))
    }
    .alert(t("Ustawienia Wi-Fi zapisane", "Wi-Fi settings added", "Настройки Wi-Fi добавлены"), isPresented: $wifiAccepted) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(wifiDetails?.ssid ?? config?.wifi?.ssid ?? "")
    }
#if !PAPUPAY_APP_CLIP
    .task { resumeClipCardOnLaunch() }
    .sheet(isPresented: $showVenues) {
      VenueDirectory(api: api, language: language, current: link.slug) { slug in
        choose(VenueGuestLink(origin: link.origin, slug: slug))
        showVenues = false
      }
    }
#endif
  }

  @ToolbarContentBuilder private var header: some ToolbarContent {
    ToolbarItem(placement: .principal) {
      if !path.isEmpty {
        Text(venueName).font(.headline).foregroundStyle(palette.ink)
      }
    }
#if !PAPUPAY_APP_CLIP
    ToolbarItem(placement: .topBarLeading) {
      if path.isEmpty {
        Button { showVenues = true } label: {
          Image(systemName: "building.2").frame(minWidth: 44, minHeight: 44)
        }
        .accessibilityLabel(t("Lokale", "Venues", "Заведения"))
      }
    }
#endif
    ToolbarItem(placement: .topBarTrailing) {
      Menu {
        Picker(t("Język", "Language", "Язык"), selection: $language) {
          ForEach(SweetoLanguage.allCases, id: \.self) { value in Text(value.label).tag(value) }
        }
      } label: {
        Text(language.rawValue.uppercased())
          .font(.system(.footnote, design: .monospaced, weight: .bold))
          .frame(minWidth: 44, minHeight: 44)
      }
      .accessibilityLabel(t("Język", "Language", "Язык"))
    }
  }

  private var home: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        if config != nil || isSweeto {
          venueLogo
            .padding(.bottom, 6)
          NavigationLink(value: VenueGuestScreen.menu) { menuCard }
            .accessibilityLabel(t("Menu", "Menu", "Меню"))
            .overlayPreferenceValue(MenuPhotoFrame.self) { anchor in
              if let anchor, let drip = menuDrip, shouldAnimateMenuDrip {
                GeometryReader { card in
                  let photo = card[anchor]
                  MenuLiquidDrip(
                    color: Color(hex: drip.color),
                    source: CGPoint(x: photo.minX + photo.width * drip.x, y: photo.maxY - 1),
                    landingY: card.size.height + 40
                  )
                  .frame(width: card.size.width, height: card.size.height + 44)
                }
                .allowsHitTesting(false)
                .accessibilityHidden(true)
              }
            }
            .onGeometryChange(for: Bool.self) { proxy in
              let frame = proxy.frame(in: .scrollView)
              guard let bounds = proxy.bounds(of: .scrollView) else { return false }
              return frame.maxY > 0 && frame.minY < bounds.height
            } action: { isVisible in
              menuVisible = isVisible
            }
            .zIndex(1)
          NavigationLink(value: VenueGuestScreen.card) {
            option(
              t("Twoja karta", "Loyalty card", "Ваша карта"),
              subtitle: t("Zbieraj pieczątki", "Collect stamps", "Собирайте отметки"),
              art: .loyalty
            )
          }
          if let reviewURL {
            Button { review(reviewURL) } label: { reviewOption(outbound: true) }
          } else {
            NavigationLink(value: VenueGuestScreen.reviews) { reviewOption(outbound: false) }
          }
          wifiButton
          footer
        } else if configFailed {
          ContentUnavailableView(
            t("Nie znaleziono lokalu", "Venue unavailable", "Заведение недоступно"),
            systemImage: "mappin.slash",
            description: Text(t("Sprawdź adres lub kod QR.", "Check the link or QR code.", "Проверьте ссылку или QR-код."))
          )
        } else {
          ProgressView(t("Wczytywanie lokalu…", "Loading venue…", "Загрузка заведения…"))
            .frame(maxWidth: .infinity, minHeight: 240)
        }
      }
      .buttonStyle(PressStyle())
      .padding(.horizontal, 18)
      .padding(.vertical, 10)
      .frame(maxWidth: 530, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
    .task(id: homeMotionKey) { await animateHomeArt() }
  }

  private func animateHomeArt() async {
    activeHomeArt = nil
    guard let venue = homeMotionKey, venue != animatedHomeVenue else { return }
    do {
      try await Task.sleep(for: .milliseconds(160))
      animatedHomeVenue = venue
      for art: VenueActionArt.Kind in [.menu, .loyalty, .review] {
        activeHomeArt = art
        try await Task.sleep(for: .milliseconds(art.duration + 110))
      }
      activeHomeArt = nil
    } catch {}
  }

  private var venueLogo: some View {
    VenueImage(
      url: link.imageURL(config?.logoUrl),
      bundled: isSweeto ? "logo-blue.png" : nil
    ) {
      Text(venueName).font(palette.display(.largeTitle))
    }
    .frame(maxWidth: 155, minHeight: 31, maxHeight: 50, alignment: .leading)
    .accessibilityLabel(venueName)
    .accessibilityAddTraits(.isHeader)
  }

  private var menuCard: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: 10) {
          menuCopy
          menuPhoto.frame(width: 152, height: 152).frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, menuDrip == nil ? 16 : 0)
      } else {
        GeometryReader { geometry in
          let photoWidth = min(168, geometry.size.width * 0.46)
          HStack(spacing: 8) {
            menuCopy.frame(maxWidth: .infinity, alignment: .leading)
            menuPhoto
              .frame(width: photoWidth, height: 156)
              .frame(height: geometry.size.height, alignment: menuDrip == nil ? .center : .bottom)
          }
          .padding(.leading, 16)
          .padding(.trailing, 8)
          .frame(height: geometry.size.height)
        }
        .frame(height: 164)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background {
      if bundledMenuPhoto != nil {
        LinearGradient(
          colors: [Color(hex: "FBEDD8"), Color(hex: "EAD2BA")],
          startPoint: .topLeading, endPoint: .bottomTrailing
        )
      } else {
        palette.line
      }
    }
    .clipShape(.rect(cornerRadius: 21))
    .overlay(RoundedRectangle(cornerRadius: 21).strokeBorder(palette.ink.opacity(0.10)))
    .contentShape(.rect(cornerRadius: 21))
  }

  private var menuCopy: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(t("Menu", "Menu", "Меню"))
        .font(palette.display(.largeTitle))
        .lineLimit(1)
        .minimumScaleFactor(0.78)
      Text(t("Zobacz, co podajemy", "See what’s on the menu", "Посмотрите наше меню"))
        .font(.footnote.weight(.medium))
        .fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 6) {
        VenueActionArt(kind: .menu, theme: palette.motionTheme, animated: activeHomeArt == .menu)
          .frame(width: 44, height: 44)
        Text(t("Otwórz", "Open", "Открыть"))
          .font(.footnote.weight(.semibold))
        homeArrow()
      }
        .accessibilityHidden(true)
    }
  }

  private var menuPhoto: some View {
    VenueImage(
      url: bundledMenuPhoto == nil ? link.imageURL(config?.photoUrl) : nil,
      bundled: bundledMenuPhoto,
      alignment: menuDrip == nil ? .center : .bottom,
      reportsPhotoFrame: menuDrip != nil
    ) {
      VenueActionArt(kind: .menu, theme: palette.motionTheme)
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .rotationEffect(bundledMenuPhoto == "menu-bowl-cutout.webp" ? .degrees(-6) : .zero)
    .background(alignment: .bottom) {
      if bundledMenuPhoto != nil {
        Ellipse()
          .fill(Color(hex: "583628").opacity(0.23))
          .frame(width: 116, height: 20)
          .blur(radius: 9)
          .offset(x: 12, y: menuDrip == nil ? -9 : 1)
      }
    }
  }

  private var bundledMenuPhoto: String? {
    guard isSweeto else { return nil }
    switch config?.photoUrl {
    case nil, "/assets/sweeto/matylda-drip.webp": return "matylda-drip.webp"
    case "/assets/sweeto/matylda-cutout.webp":
      return config?.animatesMenuSauce == true && config?.photoDrip == nil
        ? "matylda-drip.webp" : "matylda-cutout.webp"
    case "/assets/sweeto/menu-scene-v2.webp", "/assets/sweeto/menu-bowl-cutout.webp": return "menu-bowl-cutout.webp"
    default: return nil
    }
  }

  private var menuDrip: VenueGuestPhotoDrip? {
    guard config?.animatesMenuSauce == true || (config == nil && isSweeto) else { return nil }
    if let drip = config?.photoDrip, drip.isValid { return drip }
    guard bundledMenuPhoto == "matylda-drip.webp" else { return nil }
    return VenueGuestPhotoDrip(x: 0.536, color: "#631f00")
  }

  private var shouldAnimateMenuDrip: Bool {
    !reduceMotion && scenePhase == .active && path.isEmpty && menuVisible
  }

  private func reviewOption(outbound: Bool) -> some View {
    option(
      t("Oceń w Google", "Google reviews", "Отзыв в Google"),
      subtitle: t("Podziel się wrażeniami", "Share your experience", "Поделитесь впечатлениями"),
      art: .review, outbound: outbound
    )
  }

  private func option(_ title: String, subtitle: String, art: VenueActionArt.Kind, outbound: Bool = false) -> some View {
    let isLoyalty = art == .loyalty
    let arrow = Text(Image(systemName: outbound ? "arrow.up.right" : "arrow.right"))
      .font(.system(size: 16, weight: .medium))
    let copy = VStack(alignment: .leading, spacing: 6) {
      Text("\(title)\u{00a0}\(arrow)")
        .font(palette.display(.title2))
        .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 2)
        .minimumScaleFactor(0.74)
        .foregroundStyle(isLoyalty ? Color.white : palette.ink)
        .accessibilityLabel(title)
      Text(subtitle)
        .font(.footnote.weight(.medium))
        .foregroundStyle(isLoyalty ? Color.white.opacity(0.87) : palette.muted)
        .fixedSize(horizontal: false, vertical: true)
    }
    .multilineTextAlignment(.leading)
    .frame(maxWidth: .infinity, alignment: .leading)

    let illustration = VenueActionArt(kind: art, theme: palette.motionTheme, animated: activeHomeArt == art)
      .frame(width: 102, height: 102)
      .padding(isLoyalty ? 6 : 0)
      .background(isLoyalty ? palette.line : Color.clear, in: .rect(cornerRadius: 15))
      .rotationEffect(isLoyalty ? .degrees(5) : .zero)

    return Group {
      if dynamicTypeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: 10) {
          copy
          illustration.frame(maxWidth: .infinity, alignment: .trailing)
        }
      } else {
        HStack(spacing: 10) {
          copy
          illustration
        }
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, minHeight: 164, alignment: .leading)
    .background(isLoyalty ? palette.ink : Color.white, in: .rect(cornerRadius: 21))
    .overlay(RoundedRectangle(cornerRadius: 21).strokeBorder(isLoyalty ? Color.clear : palette.line))
    .contentShape(.rect(cornerRadius: 21))
    .accessibilityElement(children: .combine)
  }

  private func homeArrow(outbound: Bool = false) -> some View {
    Image(systemName: outbound ? "arrow.up.right" : "arrow.right")
      .font(.system(size: 16, weight: .medium))
      .accessibilityHidden(true)
  }

  private var wifiButton: some View {
    Button {
      if config?.wifi != nil { Task { await connectWiFi() } }
      else { path = [.wifi] }
    } label: {
      HStack(spacing: 10) {
        VenueActionArt(kind: .wifi, theme: palette.motionTheme)
          .frame(width: 42, height: 42)
        Text(wifiBusy
          ? t("Łączenie…", "Connecting…", "Подключение…")
          : t("Połącz z Wi-Fi", "Connect to Wi-Fi", "Подключиться к Wi-Fi"))
          .font(.subheadline.weight(.semibold))
        Spacer()
        Image(systemName: "arrow.right").font(.footnote.weight(.semibold)).accessibilityHidden(true)
      }
      .padding(.horizontal, 13)
      .frame(minHeight: 49)
      .background(palette.line.opacity(0.48), in: .rect(cornerRadius: 13))
    }
    .disabled(wifiBusy)
  }

  private var footer: some View {
    VStack(spacing: 7) {
      Text(t("Zamówienia przyjmujemy przy ladzie", "Order with us at the counter", "Заказ можно сделать у стойки"))
      ViewThatFits {
        HStack(spacing: 9) { addressLine; poweredBy }
        VStack(spacing: 7) { addressLine; poweredBy }
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
    .font(.caption)
    .foregroundStyle(palette.muted)
  }

  @ViewBuilder private var addressLine: some View {
    if !address.isEmpty {
      if let maps { Link(address, destination: maps) }
      else { Text(address) }
    }
  }

  private var poweredBy: some View {
    HStack(spacing: 4) {
      Text(t("Obsługiwane przez", "Powered by", "На платформе"))
      BrandView(size: 13.5)
    }
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder private func destination(_ screen: VenueGuestScreen) -> some View {
    switch screen {
    case .menu:
      let translated = link.imageURL(config?.menuPdf?[language.rawValue] ?? nil)
      let polish = link.imageURL(config?.menuPdf?["pl"] ?? nil)
      let configuredFallback = config?.menuFallback
      let isStandardSweetoMenu = isSweeto && (configuredFallback == nil || configuredFallback == "/assets/sweeto/menu.pdf")
      let backup = isStandardSweetoMenu ? Bundle.main.url(forResource: "menu", withExtension: "pdf") : nil
      VenuePDFMenu(
        url: translated ?? polish ?? (isStandardSweetoMenu ? nil : link.imageURL(configuredFallback)),
        fallback: backup, language: language, isPolish: translated == nil, palette: palette
      )
    case .card:
      VenueLoyaltyView(
        api: api, venueName: venueName, language: language,
        palette: palette, showPreview: Self.walletPreviewEnabled
      )
      .id(link)
    case .reviews:
      VStack(alignment: .leading, spacing: 14) {
        VenueActionArt(kind: .review, theme: palette.motionTheme, animated: true)
          .frame(width: 61, height: 61)
        Text(t("Opinie Google", "Google reviews", "Отзывы Google"))
          .font(palette.display(.largeTitle))
        if let reviewURL {
          Text(t("Podziel się opinią po wizycie.", "Share how your visit went.", "Поделитесь впечатлениями."))
          VenueNativeButton(
            title: t("Dodaj opinię", "Leave a review", "Оставить отзыв"),
            systemImage: "arrow.up.right", palette: palette
          ) { review(reviewURL) }
        } else {
          Text(t("Link do opinii jest niedostępny.", "The review link is unavailable.", "Ссылка на отзывы недоступна."))
        }
        Spacer()
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(20)
      .foregroundStyle(palette.ink)
      .background(palette.paper.ignoresSafeArea())
    case .wifi:
      VenueWiFiHelp(details: wifiDetails ?? config?.wifi, failed: wifiFailed, language: language, palette: palette) {
        Task { await connectWiFi() }
      }
    }
  }

  private static var walletPreviewEnabled: Bool {
#if DEBUG
    true
#else
    false
#endif
  }

  private func follow(_ url: URL) {
    guard let (location, screen, preferredLanguage) = VenueGuestLink.parse(url) else { badLink = true; return }
#if !PAPUPAY_APP_CLIP
    handledInvocation = true
#endif
    if let preferredLanguage { language = preferredLanguage }
    choose(location, screen: screen)
  }

#if !PAPUPAY_APP_CLIP
  private func resumeClipCardOnLaunch() {
    guard !resumedClipOnLaunch else { return }
    resumedClipOnLaunch = true
    guard !handledInvocation, path.isEmpty, let previous = VenueMembership.clipVenueForUpgrade() else { return }
    choose(previous, screen: .card)
  }
#endif

  private func choose(_ location: VenueGuestLink, screen: VenueGuestScreen? = nil) {
    if location != link {
      config = nil
      configFailed = false
      wifiDetails = nil
      wifiFailed = false
      link = location
    }
    path = screen.map { [$0] } ?? []
  }

  @MainActor private func load() async {
    let current = link
    do {
      let remote = try await api.configuration()
      guard !Task.isCancelled, current == link else { return }
      config = remote
      configFailed = false
    } catch {
      if !Task.isCancelled, current == link { configFailed = true }
    }
  }

  private func review(_ url: URL) {
    openURL(url)
    let current = api
    Task { await current.countReview() }
  }

  @MainActor private func connectWiFi() async {
    guard !wifiBusy else { return }
    let current = link
    wifiBusy = true
    defer { wifiBusy = false }
    do {
      guard let details = try await api.wifi() else { throw VenueWiFiJoinError.unavailable }
      guard current == link else { return }
      wifiDetails = details
      try await VenueWiFiJoin.apply(details)
      guard current == link else { return }
      wifiAccepted = true
      wifiFailed = false
    } catch {
      guard current == link else { return }
      wifiFailed = true
      if path.last != .wifi { path.append(.wifi) }
    }
  }
}

private struct MenuPhotoFrame: PreferenceKey {
  static let defaultValue: Anchor<CGRect>? = nil

  static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) {
    value = nextValue() ?? value
  }
}

private struct MenuLiquidDrip: View {
  let color: Color
  let source: CGPoint
  let landingY: CGFloat

  @State private var startedAt = Date()
  private let cycle = 6.4

  var body: some View {
    TimelineView(.animation(minimumInterval: 1.0 / 30)) { timeline in
      Canvas { context, _ in
        let elapsed = max(0, timeline.date.timeIntervalSince(startedAt))
        let phase = elapsed.truncatingRemainder(dividingBy: cycle) / cycle
        draw(phase, in: context)
      }
    }
  }

  private func draw(_ phase: Double, in context: GraphicsContext) {
    switch phase {
    case 0.20..<0.46:
      let growth = smooth((phase - 0.20) / 0.26)
      let length = 13 * growth
      drawDrop(in: context, top: source.y, length: length, width: 7.6 * growth, neck: 3.4)
    case 0.46..<0.50:
      let pinch = (phase - 0.46) / 0.04
      drawDrop(
        in: context, top: source.y, length: 13 + 5 * pinch * pinch,
        width: 7.6 - 0.5 * pinch, neck: 3.4 * (1 - pinch)
      )
    case 0.50..<0.61:
      let fall = (phase - 0.50) / 0.11
      let bottom = source.y + 18 + (landingY - source.y - 18) * fall * fall
      let length = 14 + 2 * fall
      drawDrop(in: context, top: bottom - length, length: length, width: 7.1 - 0.7 * fall, neck: 0)
      let retract = max(0, 1 - fall * 4)
      let tail = CGRect(x: source.x - 0.9, y: source.y - 1, width: 1.8, height: 5 * retract)
      context.fill(Path(ellipseIn: tail), with: .color(color.opacity(retract)))
    case 0.61..<0.68:
      let impact = (phase - 0.61) / 0.07
      let flatten = 1 - pow(1 - impact, 3)
      let width = 6.4 + 14 * flatten
      let height = 16 - 13 * flatten
      let pool = CGRect(x: source.x - width / 2, y: landingY - height, width: width, height: height)
      context.fill(Path(ellipseIn: pool), with: .color(color.opacity(1 - smooth(impact))))
    default:
      break
    }

    if (0.625..<0.76).contains(phase) {
      let ripple = (phase - 0.625) / 0.135
      let width = 6 + 29 * ripple
      let pool = CGRect(x: source.x - width / 2, y: landingY - 3, width: width, height: 5)
      context.stroke(Path(ellipseIn: pool), with: .color(color.opacity(0.28 * (1 - ripple))), lineWidth: 1)
    }
  }

  private func drawDrop(in context: GraphicsContext, top: CGFloat, length: CGFloat, width: CGFloat, neck: CGFloat) {
    guard length > 0, width > 0 else { return }
    let x = source.x
    let center = top + length * 0.62
    let bottom = top + length
    var shape = Path()
    shape.move(to: CGPoint(x: x - neck / 2, y: top))
    shape.addCurve(
      to: CGPoint(x: x, y: bottom),
      control1: CGPoint(x: x - neck / 2, y: center),
      control2: CGPoint(x: x - width, y: bottom - length * 0.16)
    )
    shape.addCurve(
      to: CGPoint(x: x + neck / 2, y: top),
      control1: CGPoint(x: x + width, y: bottom - length * 0.16),
      control2: CGPoint(x: x + neck / 2, y: center)
    )
    shape.closeSubpath()
    context.fill(shape, with: .color(color))
    let glint = CGRect(x: x - width * 0.13, y: top + length * 0.65, width: width * 0.20, height: length * 0.13)
    context.fill(Path(ellipseIn: glint), with: .color(.white.opacity(0.25)))
  }

  private func smooth(_ progress: Double) -> Double {
    progress * progress * (3 - 2 * progress)
  }
}

private struct VenueImage<Fallback: View>: View {
  let url: URL?
  let bundled: String?
  var alignment: Alignment = .leading
  var reportsPhotoFrame = false
  @ViewBuilder let fallback: () -> Fallback

  var body: some View {
    GeometryReader { geometry in
      Group {
        if let url {
          AsyncImage(url: url) { phase in
            if let image = phase.image { rendered(image) }
            else { local }
          }
        } else { local }
      }
      .frame(width: geometry.size.width, height: geometry.size.height, alignment: alignment)
      .clipped()
    }
  }

  @ViewBuilder private var local: some View {
    if let bundled,
      let path = Bundle.main.url(forResource: bundled, withExtension: nil)?.path,
      let image = UIImage(contentsOfFile: path) {
      rendered(Image(uiImage: image))
    } else {
      fallback()
    }
  }

  private func rendered(_ image: Image) -> some View {
    image.resizable().scaledToFit()
      .anchorPreference(key: MenuPhotoFrame.self, value: .bounds) { reportsPhotoFrame ? $0 : nil }
      .accessibilityHidden(true)
  }
}

#if !PAPUPAY_APP_CLIP
private struct VenueDirectory: View {
  let api: VenueGuestAPI
  let language: SweetoLanguage
  let current: String
  let select: (String) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var venues: [VenueGuestConfig]?
  @State private var failed = false

  var body: some View {
    NavigationStack {
      Group {
        if let venues {
          List(venues.compactMap { venue in venue.id.map { Entry(id: $0, venue: venue) } }) { entry in
            Button { select(entry.id) } label: {
              HStack {
                VStack(alignment: .leading, spacing: 4) {
                  Text(entry.venue.name ?? entry.id).font(.headline)
                  if let address = entry.venue.address, !address.isEmpty {
                    Text(address).font(.footnote).foregroundStyle(.secondary)
                  }
                }
                Spacer()
                if current == entry.id { Image(systemName: "checkmark") }
              }
              .frame(minHeight: 44)
            }
          }
        } else if failed {
          VStack(spacing: 12) {
            Text(language.text("Nie udało się pobrać listy.", "Couldn’t load the venue list.", "Не удалось загрузить список заведений."))
            Button(language.text("Spróbuj ponownie", "Try again", "Повторить")) { Task { await load() } }
          }.padding()
        } else {
          ProgressView(language.text("Wczytywanie lokali…", "Loading venues…", "Загрузка заведений…"))
        }
      }
      .navigationTitle(language.text("Lokale", "Venues", "Заведения"))
      .toolbar { Button(language.text("Gotowe", "Done", "Готово")) { dismiss() } }
      .task { await load() }
    }
  }

  private struct Entry: Identifiable {
    let id: String
    let venue: VenueGuestConfig
  }

  @MainActor private func load() async {
    failed = false
    do { venues = try await api.venues() }
    catch { if !Task.isCancelled { failed = true } }
  }
}
#endif
