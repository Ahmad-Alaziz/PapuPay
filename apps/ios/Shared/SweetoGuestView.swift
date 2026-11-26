import SwiftUI
import UIKit
import NetworkExtension

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
  let language: SweetoLanguage
  let posterScale: CGFloat
  var isSweeto = false

  var paper: Color { isSweeto ? Papu.cream : Color(hex: "F7F0E2") }
  var surface: Color { Color(hex: isSweeto ? "FFFCF6" : "FFF9EE") }
  var frosting: Color { isSweeto ? Papu.cream : Color(hex: "FFF6E6") }
  var ink: Color { isSweeto ? Papu.ink : Color(hex: "102E24") }
  var forest: Color { isSweeto ? Papu.ink : Color(hex: "0B241C") }
  var primary: Color { isSweeto ? Papu.orange : Color(hex: "FF7A38") }
  var peach: Color { isSweeto ? Papu.butter : Color(hex: "FFB78D") }
  var muted: Color { isSweeto ? Papu.muted : Color(hex: "486253") }
  var line: Color { isSweeto ? Papu.line : Color(hex: "E6D8C1") }
  var onAccent: Color { ink }
  var actionCorner: CGFloat { isSweeto ? 24 : 16 }

  func display(_ style: Font.TextStyle) -> Font {
    let size: CGFloat = switch style {
    case .largeTitle: 36
    case .title: 29
    case .title2: 24
    default: 18
    }
    return language == .ru
      ? .system(style, weight: .heavy)
      : .custom(isSweeto ? "PapuDisplay-Bold" : "PapuDisplay-ExtraBold", size: size, relativeTo: style)
  }

  func poster(_ size: CGFloat) -> Font {
    if language == .ru {
      return isSweeto
        ? .system(size: size * posterScale, weight: .black).width(.condensed)
        : .system(.largeTitle, weight: .black).width(.condensed)
    }
    return .custom("PapuPoster-Regular", size: size, relativeTo: .largeTitle)
  }
}

struct PapupayGuestView: View {
  @AppStorage("papupay-native-language") private var language: SweetoLanguage = .pl
  @Namespace private var paperTransition
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.openURL) private var openURL
  @ScaledMetric(relativeTo: .largeTitle) private var posterScale: CGFloat = 1
  @State private var path: [VenueGuestScreen] = []
  @State private var link = VenueGuestLink.starter
  @State private var homeStamps: VenueLoyaltyCard?
  @State private var homeStampsAreSaved = false
  @State private var ticketPull: CGFloat = 0
  @State private var welcome = PapuGuestArrival()
  @State private var showLaunchHandoff = true
  @State private var config: VenueGuestConfig?
  @State private var configFailed = false
  @State private var badLink = false
  @State private var walletRecovery: VenueWalletRecovery?
  @State private var membershipRevision = UUID()
  @State private var wifiBusy = false
  @State private var wifiAccepted = false
  @State private var wifiFailed = false
  @State private var wifiDetails: VenueGuestWiFi?
#if !PAPUPAY_APP_CLIP
  @AppStorage("papupay-native-resumed-clip-on-launch") private var resumedClipOnLaunch = false
  @State private var showVenues = false
  @State private var handledInvocation = false
#endif

  private var palette: VenueGuestPalette {
    VenueGuestPalette(language: language, posterScale: posterScale, isSweeto: isSweeto)
  }
  private var api: VenueGuestAPI { VenueGuestAPI(venue: link) }
  private var isSweeto: Bool { link.slug == "sweeto" }
  private var venueName: String { config?.name ?? (isSweeto ? "Sweeto" : link.slug) }
  private var address: String { config?.address ?? (isSweeto ? "Puławska 246/8, Warszawa" : "") }
  private var venueCover: URL? {
    let value = config?.photoUrl
    // The bundled poster is the offline version of Sweeto's default identity.
    if isSweeto && value == "/assets/sweeto/matylda-puddle.webp" { return nil }
    return link.imageURL(value)
  }
  private func venueLogo(onPhoto: Bool) -> URL? {
    let logo = config?.logoUrl
    let photographLogo = config?.logoWhiteUrl
    if isSweeto && (logo == nil || logo == "/assets/sweeto/logo-blue.png")
      && (photographLogo == nil || photographLogo == "/assets/sweeto/logo-white.png") {
      return nil
    }
    return link.imageURL(onPhoto ? (photographLogo ?? logo) : logo)
  }
  private var maps: URL? {
    link.googleMapsURL(config?.mapUrl) ?? (isSweeto ? URL(string: "https://www.google.com/maps?cid=12629433022150019195") : nil)
  }
  private var reviewURL: URL? {
    if let config { return link.googleReviewURL(config.reviewUrl) }
    guard isSweeto else { return nil }
    return URL(string: "https://search.google.com/local/writereview?placeid=ChIJZSkE8-IzGUcRewjXh2vCRK8")
  }
  private var guestWiFiDetails: VenueGuestWiFi? {
    wifiDetails ?? config?.wifi ?? VenueGuestDemo.configuration(for: link)?.wifi
  }
  private var wifiAvailabilityHint: String? {
    guard guestWiFiDetails == nil,
          config != nil || configFailed || VenueGuestDemo.configuration(for: link) != nil else { return nil }
    return t("Zapytaj obsługę", "Ask staff for access", "Уточните у сотрудников")
  }
  private var standardSweetoMenu: Bool {
    let fallback = config?.menuFallback
    return isSweeto && (fallback == nil || fallback == "/assets/sweeto/menu.pdf")
  }
  private var translatedMenuURL: URL? { link.imageURL(config?.menuPdf?[language.rawValue] ?? nil) }
  private var venueMenuPDF: URL? {
    translatedMenuURL ?? link.imageURL(config?.menuPdf?["pl"] ?? nil)
      ?? (standardSweetoMenu ? nil : link.imageURL(config?.menuFallback))
  }
  private var showsDessertCatalog: Bool {
    let image = config?.menuImageUrl
    return standardSweetoMenu && venueMenuPDF == nil && (image == nil || image == "/assets/sweeto/menu-original.jpg")
  }

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    NavigationStack(path: $path) {
      home
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: VenueGuestScreen.self) { screen in
          guestDestination(screen)
            .modifier(GuestPaperNavigation(
              screen: screen, namespace: paperTransition, isDestination: true,
              reduceMotion: reduceMotion || (isSweeto && screen == .menu)
            ))
        }
    }
    .tint(palette.ink)
    .preferredColorScheme(path.isEmpty ? .dark : .light)
    .overlay {
      if showLaunchHandoff && isSweeto && path.isEmpty && !reduceMotion {
        PapuLaunchHandoff()
          .transition(.opacity)
      }
    }
    .environment(\.locale, Locale(identifier: language.rawValue))
    .onChange(of: path) { _, screens in
      if screens.isEmpty { walletRecovery = nil }
    }
    .onOpenURL(perform: follow)
    .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
      if let url = activity.webpageURL { follow(url) }
    }
    .task(id: link) { await load() }
    .task(id: scenePhase) {
      guard scenePhase == .active, showLaunchHandoff else { return }
      if reduceMotion || !path.isEmpty || !isSweeto {
        showLaunchHandoff = false
      } else {
        try? await Task.sleep(for: .milliseconds(50))
        withAnimation(.easeOut(duration: 0.30)) { showLaunchHandoff = false }
      }
    }
    .task(id: path.isEmpty && scenePhase == .active && isSweeto && !reduceMotion && !showLaunchHandoff) {
      if !path.isEmpty || !isSweeto || reduceMotion { welcome.finish(); return }
      guard scenePhase == .active, !showLaunchHandoff else { return }
      await welcome.play()
    }
    .task(id: path.isEmpty && scenePhase == .active ? link : nil) { await refreshHomeStamps() }
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
      .environment(\.colorScheme, .light)
    }
#endif
  }

  private func guestDestination(_ screen: VenueGuestScreen) -> some View {
#if PAPUPAY_APP_CLIP
    destination(screen)
      .safeAreaInset(edge: .top, spacing: 0) { destinationHeader }
      .toolbar(.hidden, for: .navigationBar)
      .accessibilityAction(.escape, popGuestScreen)
#else
    destination(screen)
      .navigationBarTitleDisplayMode(.inline)
      .toolbarBackground(palette.paper, for: .navigationBar)
      .toolbarBackground(.visible, for: .navigationBar)
      .toolbar(.visible, for: .navigationBar)
      .toolbar {
        ToolbarItem(placement: .principal) { destinationIdentity }
        ToolbarItem(placement: .topBarTrailing) { languagePicker(ink: palette.ink) }
      }
#endif
  }

  @ViewBuilder private var destinationIdentity: some View {
    if isSweeto {
      VenueIdentityMark(
        name: venueName, isSweeto: true, logo: venueLogo(onPhoto: false), ink: palette.ink,
        width: dynamicTypeSize.isAccessibilitySize ? 83 : 113
      )
    } else {
      VenueIdentityMark(
        name: venueName, isSweeto: false, logo: link.imageURL(config?.logoUrl),
        ink: palette.ink, width: 100
      )
    }
  }

#if PAPUPAY_APP_CLIP
  private func popGuestScreen() {
    if !path.isEmpty { path.removeLast() }
  }

  private var destinationHeader: some View {
    Group {
      if dynamicTypeSize.isAccessibilitySize {
        HStack(spacing: 8) {
          destinationBack
          destinationIdentity.frame(maxWidth: .infinity, alignment: .leading)
          languagePicker(ink: palette.ink, outlined: isSweeto)
        }
      } else {
        ZStack {
          destinationIdentity
          HStack {
            destinationBack
            Spacer(minLength: 0)
            languagePicker(ink: palette.ink, outlined: isSweeto)
          }
        }
      }
    }
    .foregroundStyle(palette.ink)
    .padding(.horizontal, isSweeto ? 20 : 18)
    .padding(.vertical, 5)
    .background(isSweeto ? palette.surface : palette.paper)
    .overlay(alignment: .bottom) {
      Rectangle().fill(palette.line).frame(height: 1)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
  }

  private var destinationBack: some View {
    Button(action: popGuestScreen) {
      Image(systemName: "chevron.left")
        .font(.system(size: 16, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(palette.ink)
        .background(isSweeto ? palette.peach : palette.surface, in: .circle)
        .overlay {
          if !isSweeto { Circle().strokeBorder(palette.line).allowsHitTesting(false) }
        }
        .contentShape(.circle)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(t("Wstecz", "Back", "Назад"))
    .accessibilitySortPriority(1)
  }
#endif

  private func languagePicker(ink: Color, onPhoto: Bool = false, outlined: Bool = false) -> some View {
    Menu {
      Picker(t("Język", "Language", "Язык"), selection: $language) {
        ForEach(SweetoLanguage.allCases, id: \.self) { value in Text(value.label).tag(value) }
      }
    } label: {
      HStack(spacing: 5) {
        Image(systemName: "globe").font(.system(size: 15, weight: .medium))
        Text(language.rawValue.uppercased()).font(.system(.footnote, design: .monospaced, weight: .semibold))
        Image(systemName: "chevron.down").font(.system(size: 9, weight: .bold))
      }
      .foregroundStyle(ink)
      .padding(.leading, isSweeto ? (onPhoto || outlined ? 11 : 4) : 8)
      .padding(.trailing, isSweeto ? (onPhoto || outlined ? 11 : 4) : 0)
      .frame(minWidth: 44, minHeight: 44)
      .background(onPhoto ? palette.forest.opacity(0.82) : outlined ? palette.surface : .clear, in: .capsule)
      .overlay {
        if onPhoto || outlined {
          Capsule().strokeBorder(onPhoto ? ink.opacity(0.32) : palette.line)
            .allowsHitTesting(false)
        }
      }
      .contentShape(.capsule)
    }
    .accessibilityLabel(t("Język", "Language", "Язык"))
    .accessibilityValue(language.label)
  }

  private var home: some View {
    GeometryReader { viewport in
      let statusInset = viewport.safeAreaInsets.top
      let venueIsReady = config != nil || isSweeto
      let availableHeight = viewport.size.height + statusInset
      ScrollView {
        VStack(spacing: 0) {
          if venueIsReady {
            let posterHeight = isSweeto ? min(460, max(320, viewport.size.width * 1.05))
              : min(470, max(345, viewport.size.width * 0.94))
            let actionHeight = isSweeto ? min(64, max(52, (availableHeight - posterHeight - 100) / 4)) : 56
            menuHero(topInset: statusInset, height: posterHeight)

            VStack(spacing: 8) {
              guestActions(rowHeight: actionHeight)
                .buttonStyle(GuestActionPress(palette: palette, cornerRadius: 13, tactileEdge: isSweeto))
              if !isSweeto { venueDetails }
            }
            .padding(.horizontal, 20)
            .padding(.top, isSweeto ? 14 : 16)
            .padding(.bottom, isSweeto ? 3 : 0)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
            .background(palette.paper)

            if isSweeto {
              Spacer(minLength: 23)
              homeFooter
                .padding(.horizontal, 20)
                .frame(maxWidth: 560)
                .padding(.bottom, 10)
                .frame(maxWidth: .infinity)
            } else {
              Spacer(minLength: 16)
              GuestWordmark(palette: palette, size: 15)
                .padding(.bottom, 12)
            }
          } else {
            venueStatus(topInset: statusInset)
          }
        }
        .frame(minHeight: venueIsReady ? availableHeight : nil, alignment: .top)
      }
      .scrollBounceBehavior(.basedOnSize)
      .overlay(alignment: .top) {
        if statusInset > 0 {
          LinearGradient(
            stops: [
              .init(color: .black.opacity(0.60), location: 0),
              .init(color: .black.opacity(0.42), location: 0.62),
              .init(color: .clear, location: 1)
            ],
            startPoint: .top, endPoint: .bottom
          )
          .frame(height: statusInset + 8)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
        }
      }
      .ignoresSafeArea(.container, edges: .top)
    }
    .background(alignment: .top) {
      palette.forest.frame(height: 110).ignoresSafeArea(.container, edges: .top)
    }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
  }

  @ViewBuilder private func menuHero(topInset: CGFloat, height: CGFloat) -> some View {
    if dynamicTypeSize.isAccessibilitySize || (isSweeto && dynamicTypeSize >= .xxxLarge) {
      let photographHeight = min(300, max(200, height * (isSweeto ? 0.64 : 0.73)))
      VStack(spacing: 0) {
        heroHeader(topInset: topInset)
          .padding(.horizontal, 20)
          .frame(maxWidth: 560)
          .frame(maxWidth: .infinity, minHeight: photographHeight, alignment: .top)
          .background { heroPhotograph(withText: false) }
          .clipShape(.rect(bottomLeadingRadius: isSweeto ? 22 : 0, bottomTrailingRadius: isSweeto ? 22 : 0))
        heroCopy(onPhoto: false)
          .padding(.horizontal, 20)
          .padding(.top, 15)
          .frame(maxWidth: 560)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      .background(palette.paper)
    } else {
      VStack(alignment: .leading, spacing: 0) {
        heroHeader(topInset: topInset)
        Spacer(minLength: isSweeto ? height * 0.14 : 30).accessibilityHidden(true)
        heroCopy(onPhoto: true)
      }
      .padding(.horizontal, isSweeto ? 20 : 22)
      .padding(.bottom, isSweeto ? 18 : 22)
      .frame(maxWidth: 560)
      .frame(maxWidth: .infinity, minHeight: height, maxHeight: isSweeto ? height : nil)
      .background { heroPhotograph(withText: true) }
      .clipShape(.rect(bottomLeadingRadius: isSweeto ? 22 : 0, bottomTrailingRadius: isSweeto ? 22 : 0))
    }
  }

  private func heroHeader(topInset: CGFloat) -> some View {
    HStack {
      homeVenueIdentity
      Spacer(minLength: 12)
      languagePicker(ink: palette.frosting, onPhoto: isSweeto)
    }
    .padding(.top, topInset + 3)
  }

  private func heroCopy(onPhoto: Bool) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      if isSweeto && venueCover == nil && dynamicTypeSize < .accessibility3 {
        HStack(spacing: 8) {
          Rectangle().fill(palette.primary).frame(width: 17, height: 2)
            .accessibilityHidden(true)
          Text(t("Matylda czekoladowa", "Matylda chocolate cake", "Шоколадная Матильда"))
            .font(.footnote.weight(.semibold))
            .foregroundStyle(onPhoto ? palette.peach : palette.muted)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      Text(isSweeto ? t("Menu deserów", "Dessert menu", "Меню десертов") : t("Menu", "Menu", "Меню"))
        .font(dynamicTypeSize.isAccessibilitySize ? .title.weight(.bold) : palette.poster(47))
        .textCase(isSweeto && !dynamicTypeSize.isAccessibilitySize ? .uppercase : nil)
        .tracking(-0.4)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
      if isSweeto {
        Text(t("Zamów przy ladzie", "Order at the counter", "Заказ у стойки"))
          .font(.footnote)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .multilineTextAlignment(.leading)
    .foregroundStyle(onPhoto ? palette.frosting : palette.ink)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func heroPhotograph(withText: Bool) -> some View {
    GeometryReader { photo in
      let isTableScene = isSweeto && venueCover == nil
      GuestCoverArt(palette: palette, isSweeto: isSweeto, remotePhoto: venueCover)
        .frame(width: photo.size.width, height: photo.size.height)
        .clipped()
        .overlay {
          if !withText {
            LinearGradient(stops: [
              .init(color: .black.opacity(0.58), location: 0),
              .init(color: .clear, location: 0.58)
            ], startPoint: .top, endPoint: .bottom)
          } else if isTableScene {
            ZStack {
              LinearGradient(
                colors: [.black.opacity(0.35), .clear, .clear],
                startPoint: .top, endPoint: .bottom
              )
              LinearGradient(stops: [
                .init(color: .clear, location: 0.62),
                .init(color: .black.opacity(0.10), location: 0.77),
                .init(color: Color(hex: "1A1711"), location: 1)
              ], startPoint: .top, endPoint: .bottom)
              LinearGradient(stops: [
                .init(color: .clear, location: 0.48),
                .init(color: .black.opacity(0.65), location: 0.74),
                .init(color: .black.opacity(0.85), location: 1)
              ], startPoint: .top, endPoint: .bottom)
              .mask {
                LinearGradient(stops: [
                  .init(color: .white, location: 0),
                  .init(color: .white.opacity(0.94), location: 0.34),
                  .init(color: .white.opacity(0.24), location: 0.73),
                  .init(color: .clear, location: 1)
                ], startPoint: .leading, endPoint: .trailing)
              }
            }
          } else {
            LinearGradient(stops: [
              .init(color: .black.opacity(isSweeto ? 0.80 : 0.35), location: 0),
              .init(color: .clear, location: 0.35),
              .init(color: .black.opacity(0.16), location: 0.5),
              .init(color: .black.opacity(0.76), location: 0.79),
              .init(color: Color(hex: "1A1711"), location: 1)
            ], startPoint: .top, endPoint: .bottom)
          }
        }
    }
    .background(withText ? palette.forest : Color(hex: "1A1711"))
    .accessibilityHidden(true)
  }

  private func venueStatus(topInset: CGFloat) -> some View {
    VStack(spacing: 0) {
      HStack {
        VenueIdentityMark(name: venueName, isSweeto: false, logo: nil, ink: palette.frosting, width: 145)
        Spacer()
        languagePicker(ink: palette.frosting)
      }
      .padding(.top, topInset + 3)
      .padding(.bottom, 8)
      .padding(.horizontal, 20)
      .background(palette.forest)
      if configFailed {
        ContentUnavailableView(
          t("Nie znaleziono lokalu", "Venue unavailable", "Заведение недоступно"),
          systemImage: "mappin.slash",
          description: Text(t("Sprawdź adres lub kod QR.", "Check the link or QR code.", "Проверьте ссылку или QR-код."))
        )
        Button(t("Spróbuj ponownie", "Try again", "Повторить")) { Task { await load() } }
          .font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44)
      } else {
        ProgressView(t("Wczytywanie lokalu…", "Loading venue…", "Загрузка заведения…"))
          .tint(palette.ink)
          .frame(maxWidth: .infinity, minHeight: 240)
      }
    }
  }

  @ViewBuilder private func guestActions(rowHeight: CGFloat) -> some View {
    let actions = VStack(spacing: isSweeto ? 9 : 0) {
      NavigationLink(value: VenueGuestScreen.menu) {
        guestAction(t("Zobacz menu", "View menu", "Открыть меню"), symbol: "book", rowHeight: rowHeight)
      }
      .modifier(GuestPaperNavigation(screen: .menu, namespace: paperTransition, reduceMotion: reduceMotion || isSweeto))

      venueActionDivider
      Button { openTicket() } label: {
        guestAction(
          isSweeto && homeStamps == nil ? t("Otwórz kartę", "Open your card", "Открыть карту")
            : t("Twoja karta", "Your stamp card", "Ваша карта"),
          symbol: isSweeto ? "list.clipboard" : "wallet.pass", detail: isSweeto ? ticketCaption : compactTicketProgress,
          pull: ticketPull, ticket: isSweeto, rowHeight: rowHeight
        )
      }
      .accessibilityValue(ticketCaption)
      .overlay(alignment: .trailing) {
        GuestTicketPull(opensOnRelease: isSweeto, pull: { ticketPull = $0 }, release: { releaseTicket(open: $0) }, tap: { openTicket() })
          .frame(width: 60)
          .frame(maxHeight: .infinity)
          .accessibilityHidden(true)
      }
      .modifier(GuestPaperNavigation(screen: .card, namespace: paperTransition, reduceMotion: reduceMotion))

      venueActionDivider
      NavigationLink(value: VenueGuestScreen.wifi) {
        guestAction(t("Wi-Fi dla gości", "Guest Wi-Fi", "Гостевой Wi-Fi"),
                    symbol: "wifi", detail: isSweeto ? wifiAvailabilityHint : nil, rowHeight: rowHeight)
      }
      .accessibilityHint(wifiAvailabilityHint ?? "")

      venueActionDivider
      if let reviewURL {
        Button { review(reviewURL) } label: {
          guestAction(t("Oceń w Google", "Review on Google", "Оценить в Google"), symbol: "star", outbound: true, rowHeight: rowHeight)
        }
        .accessibilityHint(isSweeto ? t("Otwiera Google", "Opens Google", "Открывает Google") : "")
      } else {
        NavigationLink(value: VenueGuestScreen.reviews) {
          guestAction(t("Opinie Google", "Google reviews", "Отзывы Google"), symbol: "star", rowHeight: rowHeight)
        }
      }
    }
    if isSweeto {
      actions
    } else {
      actions
        .background(palette.surface)
        .clipShape(.rect(cornerRadius: 14))
        .overlay {
          RoundedRectangle(cornerRadius: 14)
            .strokeBorder(palette.ink.opacity(0.16))
            .allowsHitTesting(false)
        }
    }
  }

  @ViewBuilder private var venueActionDivider: some View {
    if !isSweeto {
      Rectangle().fill(palette.ink.opacity(0.14))
        .frame(height: 1)
        .padding(.horizontal, 16)
        .accessibilityHidden(true)
    }
  }

  @ViewBuilder private func guestAction(
    _ title: String, symbol: String, detail: String? = nil, pull: CGFloat = 0, outbound: Bool = false,
    ticket: Bool = false, rowHeight: CGFloat
  ) -> some View {
    let row = HStack(spacing: 12) {
      Image(systemName: symbol)
        .font(.system(size: 18, weight: .medium))
        .frame(width: 22)
        .accessibilityHidden(true)

      actionCopy(title, detail: detail)
        .font((isSweeto ? Font.subheadline : .body).weight(.semibold))
        .multilineTextAlignment(.leading)
        .frame(maxWidth: .infinity, alignment: .leading)

      actionArrow(outbound: outbound)
        .opacity(isSweeto && ticket ? 0 : 1)
        .rotationEffect(.degrees(reduceMotion ? 0 : 4 * Double(pull)))
        .offset(x: reduceMotion ? 0 : 6 * pull)
    }
    .padding(.horizontal, isSweeto ? 14 : 16)
    .padding(.vertical, isSweeto ? 8 : 9)
    .frame(maxWidth: .infinity, minHeight: rowHeight)
    .foregroundStyle(palette.ink)
    if isSweeto {
      row
        .background(palette.surface, in: .rect(cornerRadius: 13))
        .overlay {
          RoundedRectangle(cornerRadius: 13)
            .strokeBorder(palette.ink.opacity(0.16))
            .allowsHitTesting(false)
        }
        .overlay(alignment: .trailing) {
          if ticket {
            ticketStub(pull: pull)
          }
        }
        .contentShape(.rect(cornerRadius: 13))
    } else {
      row.contentShape(.rect)
    }
  }

  private func actionArrow(outbound: Bool = false) -> some View {
    Image(systemName: outbound ? "arrow.up.right" : "arrow.right")
      .font(.system(size: 15, weight: .semibold))
      .frame(width: 34, height: 34)
      .foregroundStyle(palette.ink)
      .background(palette.primary, in: .circle)
      .accessibilityHidden(true)
  }

  private func ticketStub(pull: CGFloat) -> some View {
    let travel = reduceMotion ? 0 : 6 * min(pull, 1.25)
    let stock = UnevenRoundedRectangle(bottomTrailingRadius: 13, topTrailingRadius: 13)
    return ZStack {
      if travel > 0 {
        stock.fill(palette.surface)
          .overlay {
            stock.strokeBorder(palette.ink.opacity(0.16))
              .mask { LinearGradient(colors: [.clear, .black], startPoint: .leading, endPoint: .trailing) }
          }
          .shadow(color: palette.ink.opacity(0.10), radius: 2, x: -2, y: 1)
      }
      actionArrow()
    }
    .frame(width: 60)
    .frame(maxHeight: .infinity)
    .overlay(alignment: .leading) {
      GuestPerforation(color: palette.ink.opacity(0.34), vertical: true, cutout: palette.paper, notchRadius: 2.5)
    }
    .offset(x: travel)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  @ViewBuilder private func actionCopy(_ title: String, detail: String?) -> some View {
    let description = detail.map {
      Text($0)
        .font(isSweeto ? .caption.weight(.medium) : .footnote.weight(.semibold))
        .foregroundStyle(palette.muted)
        .monospacedDigit()
        .contentTransition(.numericText())
        .accessibilityHidden(true)
    }
    if isSweeto {
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
        if let description { description }
      }
      .fixedSize(horizontal: false, vertical: true)
    } else {
      ViewThatFits(in: .horizontal) {
        HStack(spacing: 8) {
          Text(title).fixedSize()
          if let description { description.fixedSize() }
        }
        VStack(alignment: .leading, spacing: 3) {
          Text(title)
          if let description { description }
        }
        .fixedSize(horizontal: false, vertical: true)
      }
    }
  }

  private var compactTicketProgress: String? {
    guard let card = homeStamps else { return nil }
    if homeStampsAreSaved { return t("Zapisana karta", "Saved card", "Сохранённая карта") }
    if card.rewardAvailable { return t("Nagroda", "Reward ready", "Есть награда") }
    let count = min(max(0, card.stamps), card.goal)
    return t("\(count) z \(card.goal)", "\(count) of \(card.goal)", "\(count) из \(card.goal)")
  }

  private var ticketCaption: String {
    guard let card = homeStamps else {
      return t("Zbieraj pieczątki za wizyty", "Collect stamps when you visit", "Собирайте отметки за визиты")
    }
    if homeStampsAreSaved {
      return t("Zapisana karta dostępna offline", "Saved card available offline", "Карта доступна офлайн")
    }
    if card.rewardAvailable { return t("Nagroda do odbioru", "Your reward is ready", "Награда доступна") }
    let count = min(max(0, card.stamps), card.goal)
    return t("\(count) z \(card.goal) " + (card.goal == 1 ? "pieczątki" : "pieczątek"),
             "\(count) of \(card.goal) " + (card.goal == 1 ? "stamp" : "stamps"),
             "\(count) из \(card.goal) " + (card.goal == 1 ? "отметки" : "отметок"))
  }

  private func openTicket() {
    guard path.isEmpty else { return }
    path.append(.card)
  }

  private func releaseTicket(open: Bool) {
    if open { openTicket() }
    let returnAnimation: Animation = isSweeto ? .spring(response: 0.29, dampingFraction: 0.77) : .easeOut(duration: 0.2)
    withAnimation(reduceMotion ? nil : returnAnimation) { ticketPull = 0 }
  }

  @ViewBuilder private var homeVenueIdentity: some View {
    let mark = VenueIdentityMark(name: venueName, isSweeto: isSweeto, logo: venueLogo(onPhoto: true),
                                 ink: palette.frosting, width: isSweeto ? 142 : 145)
#if PAPUPAY_APP_CLIP
    mark
#else
    Button { showVenues = true } label: {
      HStack(spacing: 7) {
        mark
        Image(systemName: "chevron.down")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(palette.frosting)
          .accessibilityHidden(true)
      }
      .frame(minHeight: 44)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(t("Zmień lokal", "Change venue", "Сменить заведение"))
    .accessibilityValue(venueName)
#endif
  }

  private var homeFooter: some View {
    HStack(spacing: 12) {
      venueDetails
      GuestWordmark(palette: palette, size: 14, welcome: welcome)
    }
    .frame(maxWidth: .infinity)
  }

  private var venueDetails: some View {
    addressLink
      .font(.footnote.weight(.medium))
      .foregroundStyle(palette.muted)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder private var addressLink: some View {
    if !address.isEmpty {
      if let maps {
        Link(destination: maps) {
          HStack(spacing: 6) {
            Image(systemName: "mappin.and.ellipse").accessibilityHidden(true)
            Text(address)
              .multilineTextAlignment(.leading)
              .fixedSize(horizontal: false, vertical: true)
            Image(systemName: "arrow.up.right").font(.caption2).accessibilityHidden(true)
          }
          .frame(minHeight: 44)
        }
      } else { Label(address, systemImage: "mappin.and.ellipse") }
    }
  }

  @MainActor private func refreshHomeStamps() async {
    guard path.isEmpty, scenePhase == .active else { return }
    let venue = link
    if let demo = VenueGuestDemo.loyaltyConfiguration(for: venue) {
      homeStamps = demo.loyaltyCard(for: venue)
      homeStampsAreSaved = false
      return
    }
    if homeStamps == nil, let saved = api.cachedCard() {
      homeStamps = saved
      homeStampsAreSaved = true
    }
    do {
      let card = try await api.card()
      guard !Task.isCancelled, link == venue else { return }
      homeStamps = card.flatMap { $0.goal > 0 ? $0 : nil }
      homeStampsAreSaved = false
    } catch {
      guard !Task.isCancelled, link == venue else { return }
      homeStamps = api.cachedCard()
      homeStampsAreSaved = homeStamps != nil
    }
  }

  @ViewBuilder private func destination(_ screen: VenueGuestScreen) -> some View {
    switch screen {
    case .menu:
      let backup = standardSweetoMenu ? Bundle.main.url(forResource: "menu", withExtension: "pdf") : nil
      if showsDessertCatalog {
        VenueDessertMenu(original: backup, language: language, palette: palette,
                         kcalPerServing: config?.dessertKcalPerServing ?? [:])
      } else if venueMenuPDF == nil, let imageURL = link.imageURL(config?.menuImageUrl) {
        VenueImageMenu(image: imageURL, language: language, palette: palette)
      } else {
        VenuePDFMenu(url: venueMenuPDF, fallback: backup, language: language,
                     isPolish: translatedMenuURL == nil, palette: palette)
      }
    case .card, .checkout:
      if let recovery = walletRecovery, recovery.venue == link {
        if case let .demonstration(stamps) = recovery.source {
          VenueLoyaltyView(api: api, venueName: venueName, language: language, palette: palette, showPreview: false,
                           logo: venueLogo(onPhoto: true), snapshotOnly: VenueLoyaltyCard(
                             code: "DEMO2026", checkout: "PAPUPAY-DEMO:SWEETO:DEMO2026", stamps: stamps,
                             goal: VenueDemoLoyalty.goal, rewardAvailable: stamps == VenueDemoLoyalty.goal))
            .id(recovery.id)
        } else {
          VenueWalletRecoveryView(link: recovery, palette: palette) {
            walletRecovery = nil
            membershipRevision = UUID()
          }
          .id(recovery.id)
        }
      } else {
        VenueLoyaltyView(
          api: api, venueName: venueName, language: language,
          palette: palette, showPreview: Self.walletPreviewEnabled,
          logo: venueLogo(onPhoto: true), showingCheckout: screen == .checkout
        )
        .id(link)
        .id(membershipRevision)
      }
    case .reviews:
      ScrollView {
        VStack(alignment: .leading, spacing: 14) {
          GuestFeatureIcon(symbol: "star", palette: palette)
          Text(t("Opinie Google", "Google reviews", "Отзывы Google"))
            .font(palette.display(.largeTitle)).accessibilityAddTraits(.isHeader)
          if let reviewURL {
            Text(t("Podziel się opinią po wizycie.", "Share how your visit went.", "Поделитесь впечатлениями."))
              .font(.subheadline).foregroundStyle(palette.muted)
            VenueNativeButton(
              title: t("Dodaj opinię", "Leave a review", "Оставить отзыв"),
              systemImage: "arrow.up.right", palette: palette
            ) { review(reviewURL) }
          } else {
            Text(t("Link do opinii jest niedostępny.", "The review link is unavailable.", "Ссылка на отзывы недоступна."))
              .font(.subheadline).foregroundStyle(palette.muted)
          }
        }
        .padding(20)
        .frame(maxWidth: 520, alignment: .leading)
        .frame(maxWidth: .infinity)
      }
      .foregroundStyle(palette.ink)
      .background(palette.paper.ignoresSafeArea())
    case .wifi:
      VenueWiFiHelp(
        details: guestWiFiDetails,
        failed: wifiFailed, language: language, palette: palette, busy: wifiBusy,
        isDemo: VenueGuestDemo.configuration(for: link) != nil
      ) {
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
    if let recovery = VenueWalletRecovery(url) {
      showLaunchHandoff = false
      welcome.finish()
#if !PAPUPAY_APP_CLIP
      handledInvocation = true
      showVenues = false
#endif
      walletRecovery = recovery
      if case let .demonstration(stamps) = recovery.source,
         let demo = VenueGuestDemo.loyaltyConfiguration(for: recovery.venue), demo.cardCode == "DEMO2026" {
        let namespace = demo.loyaltyNamespace(for: recovery.venue)
        var ledger = VenueDemoLoyalty.load(namespace: namespace)
        if !ledger.created {
          ledger.restoreSavedPass(stamps: stamps)
          ledger.save(namespace: namespace)
        }
        walletRecovery = nil
      }
      membershipRevision = UUID()
      choose(recovery.venue, screen: .card)
      return
    }
    guard let (location, screen, preferredLanguage) = VenueGuestLink.parse(url) else { badLink = true; return }
    walletRecovery = nil
    if screen != nil || location.slug != "sweeto" {
      showLaunchHandoff = false
      welcome.finish()
    }
#if !PAPUPAY_APP_CLIP
    handledInvocation = true
#endif
    if let preferredLanguage { language = preferredLanguage }
    if screen == .checkout { membershipRevision = UUID() }
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
      homeStamps = nil
      homeStampsAreSaved = false
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
      let available: VenueGuestWiFi?
      if let demoWiFi = VenueGuestDemo.configuration(for: current)?.wifi {
        available = demoWiFi
      } else {
        available = try await api.wifi()
      }
      guard let details = available else { throw VenueWiFiJoinError.unavailable }
      guard current == link else { return }
      wifiDetails = details
      try await VenueWiFiJoin.apply(details)
      guard current == link else { return }
      wifiAccepted = true
      wifiFailed = false
    } catch let error as NSError where error.domain == NEHotspotConfigurationErrorDomain &&
      error.code == NEHotspotConfigurationError.userDenied.rawValue {
      guard current == link else { return }
      wifiFailed = false
    } catch {
      guard current == link else { return }
      wifiFailed = true
      if path.last != .wifi { path.append(.wifi) }
    }
  }
}

struct VenueIdentityMark: View {
  let name: String
  let isSweeto: Bool
  let logo: URL?
  let ink: Color
  let width: CGFloat

  var body: some View {
    Group {
      if let logo {
        AsyncImage(url: logo) { phase in
          if let image = phase.image {
            image.resizable().scaledToFit().frame(maxWidth: width, maxHeight: 36)
          } else { fallbackMark }
        }
      } else { fallbackMark }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(name)
  }

  @ViewBuilder private var fallbackMark: some View {
    if isSweeto && name.caseInsensitiveCompare("Sweeto") == .orderedSame {
      Image("SweetoWordmark")
        .renderingMode(.template)
        .resizable()
        .scaledToFit()
        .frame(width: width)
        .foregroundStyle(ink)
    } else { venueName }
  }

  private var venueName: some View {
    Text(name)
      .font(.headline.weight(.heavy))
      .foregroundStyle(ink)
      .lineLimit(1)
      .minimumScaleFactor(0.72)
  }
}

private struct GuestWordmark: View {
  let palette: VenueGuestPalette
  let size: CGFloat
  var welcome: PapuGuestArrival? = nil

  var body: some View {
    HStack(spacing: 4) {
      palette.muted
        .mask { GuestPapayaMark(palette: palette) }
        .frame(width: size * 1.05, height: size * 1.13)
        .opacity(welcome?.player == nil ? 1 : 0)
        .overlay {
          if let welcome { PapuGuestArrivalMark(welcome: welcome) }
        }
      Text("papupay")
        .font(Papu.wordmark(size))
        .tracking(-0.7)
    }
    .foregroundStyle(palette.muted)
    .fixedSize(horizontal: true, vertical: false)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Papupay")
  }
}

struct GuestPapayaMark: View {
  let palette: VenueGuestPalette
  var outline: Color? = nil

  var body: some View {
    Canvas { context, size in
      var art = context
      art.scaleBy(x: size.width / 80, y: size.height / 88)

      func printShape(_ path: Path, _ fill: Color) {
        if let outline { art.stroke(path, with: .color(outline), lineWidth: 0.8) }
        else { art.fill(path, with: .color(fill)) }
      }
      var leaf = Path()
      leaf.move(to: CGPoint(x: 55, y: 23))
      leaf.addQuadCurve(to: CGPoint(x: 75, y: 3), control: CGPoint(x: 57, y: 6))
      leaf.addQuadCurve(to: CGPoint(x: 55, y: 23), control: CGPoint(x: 77, y: 20))
      leaf.closeSubpath()
      printShape(leaf, Color(hex: "38845A"))

      var rind = Path()
      rind.move(to: CGPoint(x: 49, y: 18))
      rind.addCurve(to: CGPoint(x: 67, y: 44), control1: CGPoint(x: 63, y: 12), control2: CGPoint(x: 70, y: 24))
      rind.addCurve(to: CGPoint(x: 42, y: 83), control1: CGPoint(x: 66, y: 66), control2: CGPoint(x: 66, y: 79))
      rind.addCurve(to: CGPoint(x: 8, y: 63), control1: CGPoint(x: 21, y: 88), control2: CGPoint(x: 6, y: 78))
      rind.addCurve(to: CGPoint(x: 49, y: 18), control1: CGPoint(x: 9, y: 43), control2: CGPoint(x: 34, y: 28))
      rind.closeSubpath()
      printShape(rind, palette.primary)

      var flesh = Path()
      flesh.move(to: CGPoint(x: 50, y: 29))
      flesh.addCurve(to: CGPoint(x: 55, y: 51), control1: CGPoint(x: 59, y: 24), control2: CGPoint(x: 57, y: 38))
      flesh.addCurve(to: CGPoint(x: 38, y: 73), control1: CGPoint(x: 53, y: 62), control2: CGPoint(x: 53, y: 70))
      flesh.addCurve(to: CGPoint(x: 20, y: 62), control1: CGPoint(x: 27, y: 75), control2: CGPoint(x: 19, y: 70))
      flesh.addCurve(to: CGPoint(x: 50, y: 29), control1: CGPoint(x: 22, y: 50), control2: CGPoint(x: 38, y: 37))
      flesh.closeSubpath()
      printShape(flesh, palette.surface)

      for (x, y) in [(34.0, 45.0), (45, 50), (25, 58)] {
        let outer = CGRect(x: x, y: y, width: 7, height: 7)
        let inner = outer.insetBy(dx: 2, dy: 2)
        printShape(Path(roundedRect: outer, cornerRadius: 2), palette.ink)
        if outline == nil { art.fill(Path(roundedRect: inner, cornerRadius: 0.6), with: .color(palette.surface)) }
      }
      for (x, y) in [(43.0, 39.0), (49, 44), (39, 54), (35, 59), (42, 63), (34, 66)] {
        let seed = CGRect(x: x, y: y, width: 3.5, height: 3.5)
        art.fill(Path(roundedRect: seed, cornerRadius: 0.9), with: .color(outline ?? palette.ink))
      }
    }
    .accessibilityHidden(true)
  }
}

struct GuestFeatureIcon: View {
  let symbol: String
  let palette: VenueGuestPalette

  var body: some View {
    Image(systemName: symbol)
      .font(.system(size: 26, weight: .medium))
      .foregroundStyle(palette.ink)
      .frame(width: 60, height: 60)
      .background(palette.peach, in: .circle)
      .accessibilityHidden(true)
  }
}

struct GuestArrow: View {
  let outbound: Bool

  var body: some View {
    Image(systemName: outbound ? "arrow.up.right" : "arrow.right")
      .font(.system(size: 16, weight: .semibold))
      .accessibilityHidden(true)
  }
}

struct GuestPerforation: View {
  let color: Color
  var vertical = false
  var cutout: Color?
  var notchRadius: CGFloat = 7

  var body: some View {
    Canvas { context, size in
      let length = vertical ? size.height : size.width
      let inset = cutout == nil ? 0 : notchRadius
      var rule = Path()
      if vertical {
        rule.move(to: CGPoint(x: size.width / 2, y: inset))
        rule.addLine(to: CGPoint(x: size.width / 2, y: length - inset))
      } else {
        rule.move(to: CGPoint(x: inset, y: size.height / 2))
        rule.addLine(to: CGPoint(x: length - inset, y: size.height / 2))
      }
      context.stroke(rule, with: .color(color), style: StrokeStyle(lineWidth: 1, dash: [2, 4]))
      if let cutout {
        let center = vertical ? size.width / 2 : size.height / 2
        let first = vertical
          ? CGRect(x: center - inset, y: -inset, width: inset * 2, height: inset * 2)
          : CGRect(x: -inset, y: center - inset, width: inset * 2, height: inset * 2)
        let second = first.offsetBy(dx: vertical ? 0 : length, dy: vertical ? length : 0)
        context.fill(Path(ellipseIn: first), with: .color(cutout))
        context.fill(Path(ellipseIn: second), with: .color(cutout))
      }
    }
    .frame(width: vertical ? (cutout == nil ? 1 : notchRadius * 2) : nil,
           height: vertical ? nil : (cutout == nil ? 1 : notchRadius * 2))
    .accessibilityHidden(true)
    .allowsHitTesting(false)
  }
}

struct GuestPaperGrain: View {
  let ink: Color

  var body: some View {
    Canvas { context, size in
      guard size.width > 0, size.height > 0 else { return }
      let count = min(2100, Int(size.width * size.height / 38))
      var light = Path()
      var dark = Path()
      for index in 0..<count {
        let x = Double((index * 4373 + 113) % 14741) / 14741 * size.width
        let y = Double((index * 7841 + 577) % 17449) / 17449 * size.height
        let mark = CGRect(x: x, y: y, width: index.isMultiple(of: 7) ? 1.15 : 0.65, height: 0.65)
        if index.isMultiple(of: 3) { dark.addEllipse(in: mark) }
        else { light.addEllipse(in: mark) }
      }
      context.fill(light, with: .color(ink.opacity(0.13)))
      context.fill(dark, with: .color(ink.opacity(0.26)))
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

struct GuestActionLabel: View {
  let title: String
  var symbol: String? = nil
  let arrow: String
  let palette: VenueGuestPalette
  var detail: String?
  var prominent = false
  var ticket = false
  var pull: CGFloat = 0

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    HStack(spacing: 12) {
      if let symbol {
        Image(systemName: symbol)
          .font(.system(size: 17, weight: .semibold))
          .frame(width: 34, height: 34)
          .background(ticket ? palette.peach.opacity(0.58) : palette.ink.opacity(0.07), in: .circle)
          .accessibilityHidden(true)
      }

      VStack(alignment: .leading, spacing: 3) {
        Text(title).font(.system(palette.isSweeto ? .subheadline : .body, weight: .semibold))
        if let detail {
          Text(detail)
            .font(.footnote.weight(.medium))
            .foregroundStyle(prominent ? palette.onAccent : palette.muted)
            .monospacedDigit()
            .contentTransition(.numericText())
            .accessibilityHidden(true)
        }
      }
      .multilineTextAlignment(.leading)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)

      Image(systemName: arrow)
        .font(.system(size: 14, weight: .semibold))
        .frame(width: 34, height: 34)
        .foregroundStyle(prominent ? palette.frosting : palette.ink)
        .background(prominent ? palette.ink : ticket ? palette.primary : palette.paper, in: .circle)
        .rotationEffect(.degrees(reduceMotion ? 0 : 7 * Double(pull)))
        .offset(x: reduceMotion ? 0 : 8 * pull)
        .accessibilityHidden(true)
    }
    .padding(.leading, symbol == nil ? 16 : 12)
    .padding(.trailing, 12)
    .padding(.vertical, 11)
    .frame(maxWidth: .infinity, minHeight: 56)
    .foregroundStyle(prominent ? palette.onAccent : palette.ink)
    .background(prominent ? palette.primary : .clear, in: .rect(cornerRadius: palette.actionCorner))
    .contentShape(.rect(cornerRadius: prominent ? palette.actionCorner : 0))
  }
}

struct GuestActionPress: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var prominent = false
  var palette: VenueGuestPalette? = nil
  var cornerRadius: CGFloat? = nil
  var tactileEdge = false

  func makeBody(configuration: Configuration) -> some View {
    if let palette, !palette.isSweeto {
      configuration.label
        .scaleEffect(configuration.isPressed && !reduceMotion ? 0.995 : 1)
        .background(configuration.isPressed ? Color(hex: "F3E2C8") : .clear)
        .animation(reduceMotion ? nil : .easeOut(duration: configuration.isPressed ? 0.09 : 0.16), value: configuration.isPressed)
    } else if tactileEdge, let palette {
      paperPress(configuration, palette: palette)
    } else {
      sweetoPress(configuration)
    }
  }

  private func paperPress(_ configuration: Configuration, palette: VenueGuestPalette) -> some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius ?? 13)
    let edgeDepth: CGFloat = 2.5
    let pressed = configuration.isPressed
    return configuration.label
      .overlay {
        shape.strokeBorder(palette.ink.opacity(pressed ? 0.34 : 0))
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
      .offset(y: pressed && !reduceMotion ? edgeDepth : 0)
      .background {
        shape.fill(palette.ink.opacity(pressed && reduceMotion ? 0.06 : 0.14))
          .offset(y: edgeDepth)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
      .animation(reduceMotion ? nil : .easeOut(duration: pressed ? 0.07 : 0.16), value: pressed)
  }

  private func sweetoPress(_ configuration: Configuration) -> some View {
    configuration.label
      .overlay {
        if configuration.isPressed {
          let shape = RoundedRectangle(cornerRadius: cornerRadius ?? (prominent ? (palette?.actionCorner ?? 16) : 0))
          Group {
            if let palette, palette.isSweeto {
              shape.strokeBorder(palette.ink.opacity(0.32))
            } else {
              shape.fill(Color(hex: "102E24").opacity(0.10))
            }
          }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
      }
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: configuration.isPressed ? 0.09 : 0.16), value: configuration.isPressed)
  }
}

private struct GuestTicketPull: UIViewRepresentable {
  let opensOnRelease: Bool
  let pull: (CGFloat) -> Void
  let release: (Bool) -> Void
  let tap: () -> Void

  func makeUIView(context: Context) -> TouchRegion {
    let view = TouchRegion()
    view.isAccessibilityElement = false
    view.isOpaque = false
    return view
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView: TouchRegion, context: Context) -> CGSize? {
    guard let w = proposal.width, let h = proposal.height else { return nil }
    return CGSize(width: w, height: h)
  }

  func updateUIView(_ view: TouchRegion, context: Context) {
    view.opensOnRelease = opensOnRelease
    view.pull = pull
    view.release = release
    view.tap = tap
  }

  final class TouchRegion: UIView, UIGestureRecognizerDelegate {
    var pull: (CGFloat) -> Void = { _ in }
    var release: (Bool) -> Void = { _ in }
    var tap: () -> Void = {}
    private let thresholdFeedback = UIImpactFeedbackGenerator(style: .light)
    private var signalledThreshold = false
    var opensOnRelease = true {
      didSet { gesture.opensOnRelease = opensOnRelease }
    }
    private lazy var gesture = PullGesture(target: self, action: #selector(track(_:)))

    override func didMoveToWindow() {
      super.didMoveToWindow()
      gesture.view?.removeGestureRecognizer(gesture)
      guard let window else { return }
      var parent = superview
      while let view = parent, !(view is UIScrollView) { parent = view.superview }
      gesture.delegate = self
      gesture.cancelsTouchesInView = false
      (parent ?? window).addGestureRecognizer(gesture)
    }

    func gestureRecognizer(_ gesture: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
      window != nil && bounds.contains(touch.location(in: self))
    }

    func gestureRecognizer(_ gesture: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
      true
    }

    @objc private func track(_ gesture: PullGesture) {
      switch gesture.state {
      case .began, .changed:
        if gesture.state == .began { thresholdFeedback.prepare() }
        signalThreshold(for: gesture)
        pull(min(gesture.outwardDistance / gesture.threshold, opensOnRelease ? 1.25 : 1))
      case .ended:
        signalThreshold(for: gesture)
        signalledThreshold = false
        if gesture.isTap { tap() }
        else { release(gesture.outwardDistance >= gesture.threshold) }
      case .cancelled:
        signalledThreshold = false
        release(false)
      default: break
      }
    }

    private func signalThreshold(for gesture: PullGesture) {
      guard !signalledThreshold, gesture.outwardDistance >= gesture.threshold else { return }
      signalledThreshold = true
      thresholdFeedback.impactOccurred()
    }
  }

  // Measure displacement in window coordinates. A slow drag can begin at zero velocity.
  final class PullGesture: UIGestureRecognizer {
    var opensOnRelease = true
    var threshold: CGFloat { opensOnRelease ? 36 : 30 }
    private var start: CGPoint = .zero
    private(set) var outwardDistance: CGFloat = 0
    private(set) var isTap = false

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
      guard touches.count == 1, numberOfTouches <= 1, let touch = touches.first else { state = .failed; return }
      start = touch.location(in: nil)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
      guard let touch = touches.first else { return }
      update(at: touch.location(in: nil), finished: false)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
      guard let touch = touches.first else { return }
      update(at: touch.location(in: nil), finished: true)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
      state = state == .possible ? .failed : .cancelled
    }

    override func reset() {
      super.reset()
      outwardDistance = 0
      isTap = false
    }

    private func update(at point: CGPoint, finished: Bool) {
      guard state == .possible || state == .began || state == .changed else { return }
      let dx = point.x - start.x
      let dy = abs(point.y - start.y)
      outwardDistance = max(0, dx)
      if state == .possible {
        if max(abs(dx), dy) <= 5 {
          if finished { isTap = true; state = .recognized }
          return
        }
        guard dx > dy * 1.3 else { state = .failed; return }
      }
      if opensOnRelease && dy > outwardDistance + 24 {
        state = .cancelled
      } else if finished || (!opensOnRelease && outwardDistance >= threshold) {
        state = .ended
      } else {
        state = state == .possible ? .began : .changed
      }
    }
  }
}

private struct GuestPaperNavigation: ViewModifier {
  let screen: VenueGuestScreen
  let namespace: Namespace.ID
  var isDestination = false
  let reduceMotion: Bool

  @ViewBuilder func body(content: Content) -> some View {
    if #available(iOS 18.0, *), !reduceMotion, screen == .menu || screen == .card {
      if isDestination {
        content.navigationTransition(.zoom(sourceID: screen, in: namespace))
      } else {
        content.matchedTransitionSource(id: screen, in: namespace)
      }
    } else {
      content
    }
  }
}

private struct GuestCoverArt: View {
  let palette: VenueGuestPalette
  let isSweeto: Bool
  let remotePhoto: URL?

  @ViewBuilder var body: some View {
    if let remotePhoto {
      AsyncImage(url: remotePhoto) { phase in
        if let image = phase.image { image.resizable().scaledToFill() }
        else { fallback }
      }
    } else { fallback }
  }

  @ViewBuilder private var fallback: some View {
    if isSweeto, let art = UIImage(named: "sweeto-table-cover") ?? UIImage(named: "menu-matylda") {
      Image(uiImage: art).resizable().scaledToFill()
    } else { palette.forest }
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

  private var palette: VenueGuestPalette { VenueGuestPalette(language: language, posterScale: 1) }

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
                    Text(address).font(.footnote).foregroundStyle(palette.muted)
                  }
                }
                Spacer()
                if current == entry.id { Image(systemName: "checkmark").accessibilityHidden(true) }
              }
              .frame(minHeight: 44)
              .contentShape(.rect)
            }
            .accessibilityAddTraits(current == entry.id ? .isSelected : [])
            .listRowBackground(palette.surface)
            .listRowSeparatorTint(palette.line)
          }
          .listStyle(.plain)
          .scrollContentBackground(.hidden)
        } else if failed {
          VStack(spacing: 12) {
            Text(language.text("Nie udało się pobrać listy.", "Couldn’t load the venue list.", "Не удалось загрузить список заведений."))
            Button(language.text("Spróbuj ponownie", "Try again", "Повторить")) { Task { await load() } }
          }.padding()
        } else {
          ProgressView(language.text("Wczytywanie lokali…", "Loading venues…", "Загрузка заведений…"))
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(palette.paper.ignoresSafeArea())
      .foregroundStyle(palette.ink)
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
