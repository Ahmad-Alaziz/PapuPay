import CoreImage.CIFilterBuiltins
import NetworkExtension
import PassKit
import PDFKit
import SwiftUI
import UIKit

struct VenueDessertMenu: View {
  let original: URL?
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  @Environment(\.dynamicTypeSize) private var typeSize
  let kcalPerServing: [String: Int]
  @State private var presentation: Presentation?

  private struct Dessert: Identifiable, Decodable {
    struct Copy: Decodable {
      let name: String
      let summary: String
      let description: String
    }
    let id: String
    let pl: Copy
    let en: Copy
    let ru: Copy

    func text(for language: SweetoLanguage) -> Copy {
      switch language {
      case .pl: pl
      case .en: en
      case .ru: ru
      }
    }
  }

  private enum Presentation: Identifiable {
    case original, dessert(Dessert)

    var id: String {
      switch self {
      case .original: "original"
      case .dessert(let value): value.id
      }
    }
  }

  private static let desserts: [Dessert] = {
    guard let url = Bundle.main.url(forResource: "desserts", withExtension: "json"),
          let data = try? Data(contentsOf: url) else { return [] }
    return (try? JSONDecoder().decode([Dessert].self, from: data)) ?? []
  }()

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }
  var body: some View {
    ScrollView {
      LazyVStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 7) {
          Text(t("Menu deserów", "Dessert menu", "Меню десертов"))
            .font(palette.display(.largeTitle))
            .foregroundStyle(palette.forest)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
          Text(t("Zamów przy ladzie", "Order at the counter", "Закажите у стойки"))
            .font(.subheadline)
            .foregroundStyle(palette.muted)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.bottom, 14)
        ForEach(Self.desserts) { dessert in
          menuRule
          row(dessert).padding(.vertical, 9)
        }
        menuRule
        VStack(alignment: .leading, spacing: 9) {
          if original != nil {
            Button { presentation = .original } label: {
              Label(t("Oryginalne menu (PDF)", "Original Polish menu (PDF)", "Оригинальное меню по-польски (PDF)"), systemImage: "doc.text")
                .font(.footnote.weight(.semibold))
                .multilineTextAlignment(.leading)
                .padding(.horizontal, 12)
                .frame(minHeight: 44)
                .background(palette.surface, in: .rect(cornerRadius: 8))
                .overlay { RoundedRectangle(cornerRadius: 8).strokeBorder(palette.line).allowsHitTesting(false) }
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.top, 14)
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 20)
      .frame(maxWidth: 620, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
    .sheet(item: $presentation) { destination in
      switch destination {
      case .dessert(let dessert):
        dessertDetail(dessert)
      case .original:
        NavigationStack {
          VenuePDFMenu(url: nil, fallback: original, language: language, isPolish: true, palette: palette)
            .toolbar {
              ToolbarItem(placement: .topBarTrailing) {
                Button(t("Zamknij", "Close", "Закрыть")) { presentation = nil }
              }
            }
            .toolbarBackground(palette.paper, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
      }
    }
  }

  private var menuRule: some View {
    Rectangle().fill(palette.line).frame(height: 1).accessibilityHidden(true)
  }

  private func row(_ dessert: Dessert) -> some View {
    let words = dessert.text(for: language)
    let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 9))
      : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
    return Button { presentation = .dessert(dessert) } label: {
      layout {
        Image(dessert.id).resizable().scaledToFill()
          .frame(width: typeSize.isAccessibilitySize ? 144 : 100, height: typeSize.isAccessibilitySize ? 108 : 88)
          .clipShape(.rect(cornerRadius: 12))
          .accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 4) {
          Text(words.name).font(.headline.weight(.bold)).foregroundStyle(palette.ink)
          Text(words.summary).font(.subheadline).foregroundStyle(palette.muted)
        }
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        if !typeSize.isAccessibilitySize {
          Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(palette.muted)
            .accessibilityHidden(true)
        }
      }
      .multilineTextAlignment(.leading)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(words.name)
    .accessibilityValue(words.summary)
    .accessibilityHint(t("Otwiera szczegóły deseru", "Opens dessert details", "Открывает описание десерта"))
  }

  private func dessertDetail(_ dessert: Dessert) -> some View {
    let words = dessert.text(for: language)
    return NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 14) {
          Color.clear
            .aspectRatio(1.56, contentMode: .fit)
            .overlay {
              Image(dessert.id).resizable().scaledToFill()
            }
            .clipShape(.rect(cornerRadius: palette.actionCorner))
            .accessibilityHidden(true)
          VStack(alignment: .leading, spacing: 7) {
            Text(words.name)
              .font(typeSize.isAccessibilitySize ? .headline.weight(.bold) : palette.display(.title))
              .accessibilityAddTraits(.isHeader)
            Text(words.description).font(.body).foregroundStyle(palette.muted)
          }
          .fixedSize(horizontal: false, vertical: true)
          if language != .pl {
            menuFact(t("W polskim menu", "On the Polish menu", "В польском меню"), value: dessert.pl.name)
          }
          if let kcal = kcalPerServing[dessert.id] {
            menuFact(t("Wartość energetyczna porcji", "Energy per serving", "Энергетическая ценность порции"),
                     value: "\(kcal) " + t("kcal", "kcal", "ккал"))
          }
        }
        .padding(.horizontal, 20)
        .padding(.top, 2)
        .padding(.bottom, 16)
        .frame(maxWidth: 540, alignment: .leading)
        .frame(maxWidth: .infinity)
      }
      .scrollBounceBehavior(.basedOnSize)
      .background(palette.paper.ignoresSafeArea())
      .foregroundStyle(palette.ink)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button(t("Gotowe", "Done", "Готово")) { presentation = nil }
        }
      }
      .toolbarBackground(palette.paper, for: .navigationBar)
      .toolbarBackground(.visible, for: .navigationBar)
      .tint(palette.ink)
    }
    .presentationDragIndicator(.visible)
    .presentationDetents(typeSize >= .xxLarge ? [.large] : [.height(500), .large])
  }

  private func menuFact(_ label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      menuRule.padding(.bottom, 4)
      Text(label).font(.footnote).foregroundStyle(palette.muted)
      Text(value).font(.body.weight(.semibold))
    }
    .accessibilityElement(children: .combine)
  }
}

struct VenueImageMenu: View {
  let image: URL
  let language: SweetoLanguage
  let palette: VenueGuestPalette

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 15) {
        Text(language.text("Menu", "Menu", "Меню"))
          .font(palette.display(.title))
          .accessibilityAddTraits(.isHeader)
        AsyncImage(url: image) { phase in
          if let picture = phase.image {
            picture.resizable().scaledToFit()
              .accessibilityLabel(language.text("Zdjęcie menu", "Menu photograph", "Фотография меню"))
          } else if phase.error != nil {
            Text(language.text("Podgląd jest niedostępny.", "Menu preview unavailable.", "Предпросмотр недоступен."))
              .foregroundStyle(palette.muted)
          } else {
            ProgressView(language.text("Wczytywanie menu…", "Loading menu…", "Загрузка меню…"))
          }
        }
        Link(destination: image) {
          Label(language.text("Otwórz oryginał", "Open original", "Открыть оригинал"), systemImage: "arrow.up.right")
            .font(.footnote.weight(.semibold))
            .frame(minHeight: 44)
        }
      }
      .padding(20)
      .frame(maxWidth: 750, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .foregroundStyle(palette.ink)
    .background(palette.paper.ignoresSafeArea())
  }
}

struct VenuePDFMenu: View {
  let url: URL?
  let fallback: URL?
  let language: SweetoLanguage
  let isPolish: Bool
  let palette: VenueGuestPalette
  @State private var document: PDFDocument?
  @State private var shownInPolish = false
  @State private var failed = false

  var body: some View {
    VStack(spacing: 0) {
      if let document {
        HStack {
          Text(language.text("Menu", "Menu", "Меню"))
            .font(palette.display(.title))
            .accessibilityAddTraits(.isHeader)
          Spacer(minLength: 0)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        if shownInPolish && language != .pl {
          HStack(spacing: 7) {
            Image(systemName: "doc.text").accessibilityHidden(true)
            Text(language.text("Menu po polsku", "Menu in Polish", "Меню на польском языке"))
              .font(.footnote)
          }
          .accessibilityElement(children: .combine)
          .padding(.vertical, 5)
        }
        VenuePDFPresentation(document: document)
      } else if failed {
        ContentUnavailableView(
          language.text("Menu jest niedostępne", "Menu unavailable", "Меню недоступно"),
          systemImage: "doc",
          description: Text(language.text("Zapytaj obsługę o menu.", "Ask staff for the menu.", "Попросите меню у сотрудников."))
        )
      } else {
        ProgressView(language.text("Wczytywanie menu…", "Loading menu…", "Загрузка меню…"))
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .foregroundStyle(palette.ink)
    .background(palette.paper.ignoresSafeArea())
    .task(id: url) { await load() }
  }

  @MainActor private func load() async {
    failed = false
    document = fallback.flatMap(PDFDocument.init(url:))
    shownInPolish = document != nil
    if let url, url != fallback, !url.isFileURL {
      var request = URLRequest(url: url)
      request.timeoutInterval = 9
      if let (data, response) = try? await URLSession.shared.data(for: request),
        let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
        http.url?.scheme == "https", let pdf = PDFDocument(data: data), !Task.isCancelled {
        document = pdf
        shownInPolish = isPolish
      }
    }
    if !Task.isCancelled { failed = document == nil }
  }
}

private struct VenuePDFPresentation: UIViewRepresentable {
  let document: PDFDocument

  func makeUIView(context: Context) -> PDFView {
    let view = PDFView()
    view.autoScales = true
    view.displayMode = .singlePageContinuous
    view.displayDirection = .vertical
    view.backgroundColor = .white
    return view
  }

  func updateUIView(_ view: PDFView, context: Context) {
    guard view.document !== document else { return }
    view.document = document
    view.autoScales = true
  }
}

struct VenueNativeButton: View {
  let title: String
  let systemImage: String
  let palette: VenueGuestPalette
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      GuestActionLabel(title: title, arrow: systemImage, palette: palette, prominent: true)
    }
    .buttonStyle(GuestActionPress(prominent: true))
  }
}

struct VenueLoyaltyView: View {
  let api: VenueGuestAPI
  let venueName: String
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  let showPreview: Bool
  let logo: URL?
  var snapshotOnly: VenueLoyaltyCard? = nil
  @State var showingCheckout = false
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.openURL) private var openURL
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  private enum CardHeading: Hashable { case stamps, checkout }
  @AccessibilityFocusState private var focusedHeading: CardHeading?
  @State private var card: VenueLoyaltyCard?
  @State private var ready = false
  @State private var creating = false
  @State private var issuanceFailed = false
  @State private var readGeneration = 0
  @State private var failed = false
  @State private var balanceConfirmed = false
  @State private var checkingBalance = false
  @State private var walletRequest: WalletRequest?
  @State private var walletFailure: WalletRequest?
  @State private var wallet: NativeWalletPass?
  @State private var pendingWalletCheck: NativeWalletPass?
  @State private var installedPass: PKPass?
  @State private var walletUpdates = false
  @State private var walletSaveMotion = 0
  @AppStorage("papupay-last-verified-wallet-membership-v1") private var previouslyInstalled = Data()
  @State private var preview = false
  @State private var walletAvailable = false
  @State private var googleWalletAvailable = false
  @State private var walletChecked = false
  @State private var walletLookupFailed = false
  @State private var walletLookupAttempt = 0
  @State private var walletMembership: String?
  @State private var cardMotion = 0
  @State private var stampMotion = 0
  @State private var stampPlayback: SweetoStampPlayback?
  @State private var rewardArrival = false
  @State private var receivedStamps = 0
  @State private var focusCheckoutOnCreate = false
  @State private var demoLedger = VenueDemoLoyalty()
  @State private var demoPresented = false
  @State private var demoStage: DemoStage = .ready
  @State private var demoScanTask: Task<Void, Never>?
  @State private var confirmRedeem = false
  @State private var confirmReset = false

  private enum DemoStage: Equatable { case ready, scanning, stamped(Int), redeemed }
  private enum WalletRequest: Equatable { case addApple, refreshApple, addGoogle }
  private struct WalletLookup: Equatable {
    let membership: String
    let attempt: Int
  }
  private var stampConfirmed: Bool {
    guard case .stamped(let count) = demoStage, count > 0 else { return false }
    return card?.stamps == count && demoLedger.stamps == count
  }
  private var demo: VenueGuestDemo? { VenueGuestDemo.loyaltyConfiguration(for: api.venue) }
  private var showingSavedBalance: Bool { snapshotOnly == nil && demo == nil && !balanceConfirmed }
  private var walletLookup: WalletLookup? {
    guard let card, demo != nil || balanceConfirmed else { return nil }
    return WalletLookup(membership: card.checkout, attempt: walletLookupAttempt)
  }
  private var isSweeto: Bool { api.venue.slug == "sweeto" }
  private var cream: Color { isSweeto ? palette.frosting : palette.surface }
  private var receiptInk: Color { isSweeto ? palette.forest : palette.ink }
  private var stampStock: Color { isSweeto ? Papu.butter : palette.surface }
  private var receiptSeam: some View {
    GuestPerforation(color: receiptInk.opacity(0.35), cutout: palette.paper)
  }
  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 15) {
        if let snapshotOnly {
          sweetoMembership(snapshotOnly)
        } else if let card {
          Group {
            if isSweeto { sweetoMembership(card) }
            else { checkout(card) }
          }
            .transition(reduceMotion ? .identity : .offset(y: 12).combined(with: .opacity))
          if demo != nil { demoEntry }
        } else if ready {
          if failed {
            Text(t("Twoja karta", "Your card", "Ваша карта"))
              .font(palette.display(.title)).accessibilityAddTraits(.isHeader)
            Text(t("Nie udało się pobrać karty. Sprawdź połączenie i spróbuj ponownie.", "We couldn’t load your card. Check the connection and try again.", "Не удалось загрузить карту. Проверьте соединение и повторите попытку."))
              .font(.body).foregroundStyle(palette.muted)
            VenueNativeButton(title: t("Spróbuj ponownie", "Try again", "Повторить"), systemImage: "arrow.clockwise", palette: palette) {
              Task { await refresh() }
            }
          } else {
            Group {
              if isSweeto { sweetoMembership(nil) }
              else { firstCard }
            }
              .transition(reduceMotion ? .identity : .opacity)
            if issuanceFailed {
              Label(t("Nie udało się utworzyć karty. Spróbuj ponownie.", "Couldn’t create your card. Please try again.", "Не удалось создать карту. Попробуйте ещё раз."), systemImage: "exclamationmark.circle")
                .font(.footnote).foregroundStyle(palette.ink)
            }
          }
        } else {
          ProgressView(t("Wczytywanie karty…", "Loading your card…", "Загрузка карты…"))
        }
      }
      .padding(.horizontal, 20)
      .padding(.top, 14)
      .padding(.bottom, 20)
      .frame(maxWidth: 474, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .refreshable { await refresh() }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
    .sensoryFeedback(.success, trigger: cardMotion)
    .sensoryFeedback(.success, trigger: walletSaveMotion)
    .sensoryFeedback(trigger: stampMotion) { _, _ in
      isSweeto && !rewardArrival ? .impact(weight: .light) : .success
    }
    .task(id: reduceMotion) {
      if isSweeto && !reduceMotion { await SweetoStampMotionSource.prepare() }
    }
    .task(id: scenePhase) {
      guard snapshotOnly == nil, scenePhase == .active else { return }
      if let installedPass, !passIsInstalled(installedPass) {
        self.installedPass = nil
        if let card, previouslyInstalled == card.fingerprint(in: api.venue) { previouslyInstalled = Data() }
      }
      if demo != nil {
        await refresh()
      } else {
        while !Task.isCancelled {
          await refresh()
          do { try await Task.sleep(for: .seconds(5)) } catch { return }
        }
      }
    }
    .task(id: walletLookup) {
      guard let lookup = walletLookup, let membership = card, lookup.membership == membership.checkout else { return }
      guard walletMembership != lookup.membership || !walletChecked || walletLookupFailed else { return }
      walletAvailable = false
      googleWalletAvailable = false
      walletChecked = false
      walletLookupFailed = false
      walletUpdates = false
      installedPass = nil
      pendingWalletCheck = nil
      walletMembership = lookup.membership
      defer { if !Task.isCancelled, walletLookup == lookup { walletChecked = true } }
      if let demo {
        walletAvailable = demo.walletPassData(stamps: membership.stamps) != nil
      } else {
        guard let response = try? await api.wallet() else {
          if !Task.isCancelled, walletLookup == lookup { walletLookupFailed = true }
          return
        }
        guard !Task.isCancelled, walletLookup == lookup else { return }
        walletAvailable = response.status == .ready && response.passUrl != nil
        googleWalletAvailable = response.googleStatus == .ready
        walletUpdates = response.updatesEnabled == true
      }
      // Bundled demo passes can be checked locally, including after an App Clip reinstall.
      guard walletAvailable, demo != nil || previouslyInstalled == membership.fingerprint(in: api.venue),
        let pass = try? await signedPass(for: membership), !Task.isCancelled,
        card?.checkout == membership.checkout else { return }
      if passIsInstalled(pass) {
        installedPass = pass
        previouslyInstalled = membership.fingerprint(in: api.venue)
      } else { previouslyInstalled = Data() }
    }
    .task(id: walletRequest) {
      guard let walletRequest else { return }
      await prepareWallet(walletRequest)
    }
    .task(id: wallet == nil ? pendingWalletCheck?.id : nil) {
      guard wallet == nil, let review = pendingWalletCheck else { return }
      // PassKit signals dismissal for both Add and Cancel. Confirm the specific pass after dismissal.
      for delay in [0, 150, 350, 650] {
        if delay > 0 {
          do { try await Task.sleep(for: .milliseconds(delay)) } catch { return }
        }
        guard !Task.isCancelled, pendingWalletCheck?.id == review.id, card?.checkout == review.membership else { return }
        if passIsInstalled(review.pass) {
          installedPass = review.pass
          if let card { previouslyInstalled = card.fingerprint(in: api.venue) }
          if !review.wasInstalled && scenePhase == .active {
            walletSaveMotion += 1
            AccessibilityNotification.Announcement(t("Karta dodana do Wallet.", "Pass added to Wallet.", "Карта добавлена в Wallet.")).post()
          }
          break
        }
        installedPass = nil
      }
      pendingWalletCheck = nil
    }
    .onChange(of: scenePhase) { _, phase in
      if phase != .active {
        cancelDemoScan()
        stampPlayback?.settle()
        receivedStamps = 0
      }
    }
    .onDisappear { cancelDemoScan() }
    .sheet(item: $wallet) { pass in
      WalletPresentation(controller: pass.controller) { wallet = nil }
    }
    .sheet(isPresented: $preview) { cardPreview }
    .sheet(isPresented: $demoPresented, onDismiss: cancelDemoScan) { demoScanner }
    .alert(
      walletFailure == .addGoogle
        ? t("Nie udało się otworzyć Portfela Google", "Couldn’t open Google Wallet", "Не удалось открыть Google Кошелек")
        : t("Nie udało się otworzyć Apple Wallet", "Couldn’t open Apple Wallet", "Не удалось открыть Apple Wallet"),
      isPresented: Binding(get: { walletFailure != nil }, set: { if !$0 { walletFailure = nil } })
    ) {
      Button("OK", role: .cancel) { walletFailure = nil }
    } message: {
      Text(t("Spróbuj ponownie. Nadal możesz pokazać kod QR przy kasie.", "Try again. You can still show your QR code at the counter.", "Попробуйте ещё раз. Вы по-прежнему можете показать QR-код на кассе."))
    }
  }

  private func sweetoMembership(_ card: VenueLoyaltyCard?) -> some View {
    let backVisible = card != nil && showingCheckout
    let radius: CGFloat = 20
    return VStack(alignment: .leading, spacing: 16) {
      PocketCardLayout {
        stampFace(card)
          .background(receiptInk)
          .clipShape(.rect(cornerRadius: radius))
          .modifier(PocketCardSide(degrees: backVisible ? 180 : 0))
          .accessibilityHidden(backVisible)
          .allowsHitTesting(!backVisible)
        if let card {
          checkoutFace(card)
            .background(.white)
            .clipShape(.rect(cornerRadius: radius))
            .modifier(PocketCardSide(degrees: backVisible ? 0 : -180))
            .accessibilityHidden(!backVisible)
            .allowsHitTesting(backVisible)
        }
      }
      .frame(maxWidth: .infinity)
      .shadow(color: receiptInk.opacity(0.17), radius: 8, x: 0, y: 5)
      .animation(reduceMotion ? nil : .timingCurve(0.42, 0, 0.25, 1, duration: 0.42), value: backVisible)
      .task(id: card?.checkout) {
        guard card != nil, focusCheckoutOnCreate else { return }
        await Task.yield()
        guard !Task.isCancelled else { return }
        focusedHeading = backVisible ? .checkout : .stamps
        focusCheckoutOnCreate = false
      }
      if let card {
        cardEntryButton(
          title: backVisible ? t("Pokaż pieczątki", "Show stamps", "Показать отметки")
            : t("Pokaż przy kasie", "Show at checkout", "Показать на кассе"),
          systemImage: backVisible ? "rectangle.2.swap" : "qrcode"
        ) {
          showingCheckout.toggle()
        }
        .accessibilityIdentifier("sweeto-membership-turn")
        if showingSavedBalance { savedBalanceStatus }
        if receivedStamps > 0 && !showingSavedBalance {
          Label(stampReceipt(receivedStamps), systemImage: "checkmark.seal.fill")
            .font(.subheadline.weight(.semibold))
        }
        if snapshotOnly == nil && card.rewardAvailable && !showingSavedBalance && demo == nil {
          Text(t("Pokaż kod obsłudze, aby odebrać nagrodę.", "Show your code to staff to claim your reward.", "Покажите код сотрудникам, чтобы получить награду."))
            .font(.subheadline)
        }
        if snapshotOnly == nil { walletSection }
      } else {
        Text(t("Pokaż kod przy kasie, żeby zebrać pieczątkę. Pełna karta to nagroda.", "Show your code at checkout to collect a stamp. Fill the card to claim your reward.", "Показывайте код на кассе и собирайте отметки. Заполните карту, чтобы получить награду."))
          .font(.body).fixedSize(horizontal: false, vertical: true)
        cardEntryButton(
          title: creating ? t("Tworzenie karty…", "Creating your card…", "Создаём карту…")
            : demo != nil ? t("Utwórz kartę demo", "Create a demo card", "Создать демо-карту")
            : t("Utwórz kartę", "Create my card", "Создать карту"),
          systemImage: "arrow.right"
        ) { Task { await createCard() } }
          .disabled(creating)
      }
    }
  }

  private func stampFace(_ card: VenueLoyaltyCard?) -> some View {
    let balance = card?.stamps ?? 0
    let goal = card?.goal ?? VenueDemoLoyalty.goal
    let kind = demo == nil && snapshotOnly == nil ? t("Karta na pieczątki", "Stamp card", "Карта отметок")
      : t("Karta demo", "Demo card", "Демо-карта")
    let summary = if let card {
      showingSavedBalance ? t("Zapisane pieczątki", "Last saved stamps", "Сохранённые отметки")
        : card.rewardAvailable ? t("Nagroda do odbioru", "Reward ready to claim", "Награда готова")
        : t("\(remainingStamps(card)) do nagrody", "\(remainingStamps(card)) to your reward", "\(remainingStamps(card)) до награды")
    } else {
      t("Zbierz komplet pieczątek", "Collect your stamps", "Соберите все отметки")
    }
    return VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 6) {
        ViewThatFits(in: .horizontal) {
          HStack(alignment: .center, spacing: 16) {
            VenueIdentityMark(name: venueName, isSweeto: true, logo: logo, ink: cream, width: 105)
            Spacer(minLength: 0)
            Text(kind).fixedSize()
          }
          VStack(alignment: .leading, spacing: 5) {
            VenueIdentityMark(name: venueName, isSweeto: true, logo: logo, ink: cream, width: 105)
            Text(kind)
          }
        }
        .font(.caption.weight(.semibold))
        Spacer(minLength: 8)
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text(String(balance)).font(palette.poster(54))
          Text("/ " + String(goal)).font(palette.poster(31)).foregroundStyle(Color(hex: "F8AE73"))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(t("Pieczątki", "Stamps", "Отметки"))
        .accessibilityValue(t("\(balance) z \(goal)", "\(balance) of \(goal)", "\(balance) из \(goal)"))
        .accessibilityFocused($focusedHeading, equals: .stamps)
        .contentTransition(reduceMotion ? .identity : .numericText())
        .animation(reduceMotion ? nil : .easeOut(duration: 0.20), value: balance)
        Text(summary).font(.subheadline.weight(.semibold))
          .fixedSize(horizontal: false, vertical: true)
      }
      .padding(.horizontal, 18).padding(.vertical, 13)
      .foregroundStyle(cream)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .background(alignment: .trailing) {
        GeometryReader { geometry in
          let side = min(200, geometry.size.width * 0.48)
          GuestPapayaMark(palette: palette, outline: Color(hex: "658A65"))
            .aspectRatio(80 / 88, contentMode: .fit).frame(width: side)
            .rotationEffect(.degrees(14))
            .position(x: geometry.size.width - side * 0.34, y: geometry.size.height * 0.5 + 7)
        }
        .mask(LinearGradient(stops: [.init(color: .clear, location: 0.42), .init(color: .white.opacity(0.44), location: 0.72), .init(color: .white, location: 1)], startPoint: .leading, endPoint: .trailing))
        .clipped().allowsHitTesting(false)
      }
      stampRow(count: balance, goal: goal, animateNewest: demo == nil && receivedStamps > 0, diameter: 38)
        .accessibilityHidden(true)
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(Color(hex: "FFD3A4"))
    }
  }

  private func checkoutFace(_ card: VenueLoyaltyCard) -> some View {
    let arrangement = typeSize >= .xxLarge
      ? AnyLayout(VStackLayout(alignment: .leading, spacing: 14))
      : AnyLayout(HStackLayout(alignment: .center, spacing: 14))
    return arrangement {
      VStack(alignment: .leading, spacing: 8) {
        VenueIdentityMark(name: venueName, isSweeto: true, logo: nil, ink: receiptInk, width: 78)
        Text(t("Kod przy kasie", "Checkout code", "Код на кассе"))
          .font(palette.display(.title3)).fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
          .accessibilityFocused($focusedHeading, equals: .checkout)
        Text(card.code).font(.system(.subheadline, design: .monospaced, weight: .semibold))
          .textSelection(.enabled)
          .accessibilityLabel(t("Numer karty \(card.code)", "Card number \(card.code)", "Номер карты \(card.code)"))
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      GuestCheckoutCode(value: card.checkout, unavailable: t("Użyj numeru karty", "Use the card number", "Используйте номер карты"), side: 160)
        .accessibilityLabel(t("Kod QR karty", "Card QR code", "QR-код карты"))
        .frame(maxWidth: typeSize >= .xxLarge ? .infinity : 160)
        .offset(y: typeSize >= .xxLarge ? 0 : -6)
    }
    .foregroundStyle(receiptInk)
    .padding(15)
    .frame(maxHeight: .infinity, alignment: .center)
  }

  private var firstCard: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 8) {
        Text(demo == nil ? venueName : t("Karta demo", "Demo card", "Демо-карта"))
          .font(.system(.caption, design: .monospaced, weight: .semibold))
          .textCase(.uppercase)
          .foregroundStyle(palette.peach)
        HStack(alignment: .center, spacing: 14) {
          Text(t("Karta na pieczątki", "Stamp card", "Карта отметок"))
            .font(palette.display(.largeTitle))
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
          if !typeSize.isAccessibilitySize {
            printedSeal()
              .frame(width: 60, height: 60)
          }
        }
      }
      .padding(20).frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(cream).background(receiptInk)
      .overlay { GuestPaperGrain(ink: cream).opacity(0.45) }
      receiptSeam
      VStack(alignment: .leading, spacing: 15) {
        Text(t("Pokaż kod przy kasie, żeby zebrać pieczątkę. Pełna karta to nagroda.", "Show your code at the counter to collect a stamp. Fill the card to claim your reward.", "Показывайте код на кассе и собирайте отметки. Заполните карту, чтобы получить награду."))
          .font(.body).fixedSize(horizontal: false, vertical: true)
        cardEntryButton(
          title: creating ? t("Tworzenie karty…", "Creating your card…", "Создаём карту…")
            : demo != nil ? t("Utwórz kartę demo", "Create a demo card", "Создать демо-карту")
            : t("Utwórz kartę", "Create my card", "Создать карту"),
          systemImage: "arrow.right"
        ) { Task { await createCard() } }
          .disabled(creating)
        if demo != nil { demoNotice }
      }
      .padding(.horizontal, 17).padding(.bottom, 17).padding(.top, 7)
    }
    .background(palette.surface, in: .rect(cornerRadius: palette.actionCorner))
    .clipShape(.rect(cornerRadius: palette.actionCorner))
    .shadow(color: palette.ink.opacity(0.09), radius: 11, x: 0, y: 4)
  }

  private func cardEntryButton(title: String, systemImage: String, action: @escaping () -> Void) -> some View {
    VenueNativeButton(title: title, systemImage: systemImage, palette: palette, action: action)
  }

  private func remainingStamps(_ card: VenueLoyaltyCard) -> String {
    let n = max(0, card.goal - card.stamps)
    let last = n % 10
    let teen = (11...14).contains(n % 100)
    let few = (2...4).contains(last) && !teen
    let pl = n == 1 ? "pieczątka" : few ? "pieczątki" : "pieczątek"
    let ru = last == 1 && !teen ? "отметка" : few ? "отметки" : "отметок"
    return "\(n) " + t(pl, n == 1 ? "stamp" : "stamps", ru)
  }

  private func checkout(_ card: VenueLoyaltyCard) -> some View {
    let remainder = remainingStamps(card)
    return VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 6) {
        Text(demo == nil
          ? t("Karta na pieczątki", "Stamp card", "Карта отметок")
          : t("Karta demo", "Demo card", "Демо-карта"))
          .font(.system(.caption, design: .monospaced, weight: .semibold)).textCase(.uppercase)
          .foregroundStyle(palette.peach)
        Text(t("Pokaż przy kasie", "Show at the counter", "Покажите на кассе"))
          .font(palette.display(.largeTitle))
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
          .accessibilityFocused($focusedHeading, equals: .checkout)
          .task {
            guard focusCheckoutOnCreate else { return }
            await Task.yield()
            guard !Task.isCancelled else { return }
            focusedHeading = .checkout
            focusCheckoutOnCreate = false
          }
      }
      .padding(.horizontal, 19).padding(.vertical, 15)
      .frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(cream).background(receiptInk)
      .overlay { GuestPaperGrain(ink: cream).opacity(0.45) }
      VStack(spacing: 2) {
        ZStack {
          GuestCheckoutCode(value: card.checkout, unavailable: t("Użyj kodu poniżej", "Use the code below", "Используйте код ниже"), side: 174)
            .accessibilityLabel(t("Kod QR karty", "Card QR code", "QR-код карты"))
          GuestScanCorners(color: receiptInk.opacity(0.56))
            .frame(width: 177, height: 177)
        }
        .frame(height: 180)
        Text(card.code)
          .font(.system(.footnote, design: .monospaced, weight: .semibold))
          .tracking(1.2).foregroundStyle(palette.ink).textSelection(.enabled)
          .accessibilityLabel(t("Numer karty \(card.code)", "Card number \(card.code)", "Номер карты \(card.code)"))
      }
      .padding(.horizontal, 16).padding(.top, 10).padding(.bottom, 4)
      .frame(maxWidth: .infinity)
      .background(.white)
      receiptSeam
      VStack(alignment: .leading, spacing: 12) {
        ViewThatFits(in: .horizontal) {
          HStack(alignment: .firstTextBaseline, spacing: 12) {
            progressTitle(card, remainder: remainder).fixedSize()
            Spacer(minLength: 0)
            progressFraction(card)
          }
          VStack(alignment: .leading, spacing: 4) {
            progressTitle(card, remainder: remainder)
            progressFraction(card)
          }
        }
        stampRow(count: card.stamps, goal: card.goal, animateNewest: demo == nil && (!isSweeto || receivedStamps > 0))
        if receivedStamps > 0 && !showingSavedBalance {
          Label(stampReceipt(receivedStamps), systemImage: "checkmark.seal.fill")
            .font(.footnote.weight(.semibold))
            .accessibilityElement(children: .combine)
        }
        if card.rewardAvailable && demo == nil && !showingSavedBalance {
          Text(t("Pokaż ten kod obsłudze, aby odebrać nagrodę.", "Show this code to staff to claim your reward.", "Покажите этот код сотрудникам, чтобы получить награду."))
            .font(.footnote)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(receiptInk).padding(.horizontal, 16).padding(.vertical, 12)
      .background(rewardBand(available: card.rewardAvailable && !showingSavedBalance, animateArrival: demo == nil))
      if showingSavedBalance { savedBalanceStatus }
      walletSection
    }
    .background(palette.surface, in: .rect(cornerRadius: palette.actionCorner))
    .clipShape(.rect(cornerRadius: palette.actionCorner))
    .shadow(color: palette.ink.opacity(0.09), radius: 11, x: 0, y: 4)
  }

  private func progressTitle(_ card: VenueLoyaltyCard, remainder: String) -> some View {
    Text(showingSavedBalance
      ? t("Zapisane pieczątki", "Last saved stamps", "Последние сохранённые отметки")
      : card.rewardAvailable
      ? t("Nagroda do odbioru", "Reward ready to claim", "Награда готова")
      : t("\(remainder) do nagrody", "\(remainder) to your reward", "\(remainder) до награды"))
      .font(palette.display(.headline))
      .fixedSize(horizontal: false, vertical: true)
      .accessibilityAddTraits(.isHeader)
  }

  private var savedBalanceStatus: some View {
    VStack(alignment: .leading, spacing: 6) {
      Label {
        Text(t("Możesz pokazać zapisany kod przy kasie. Liczba pieczątek może się różnić.", "You can show your saved code at the counter. Your stamp count may have changed.", "Покажите сохранённый код на кассе. Количество отметок могло измениться."))
          .fixedSize(horizontal: false, vertical: true)
      } icon: {
        Image(systemName: "checkmark.shield").accessibilityHidden(true)
      }
      .font(.footnote)
      if failed {
        Button {
          Task { await refresh() }
        } label: {
          Label(t("Sprawdź pieczątki", "Check stamp balance", "Проверить отметки"), systemImage: "arrow.clockwise")
            .font(.footnote.weight(.semibold))
            .frame(minHeight: 44, alignment: .leading)
        }
        .disabled(checkingBalance)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .foregroundStyle(palette.ink)
    .padding(.horizontal, 16)
    .padding(.vertical, 11)
    .background(palette.surface)
  }

  private func progressFraction(_ card: VenueLoyaltyCard) -> some View {
    Text("\(card.stamps) / \(card.goal)")
      .font(.system(.footnote, design: .monospaced, weight: .semibold))
      .foregroundStyle(receiptInk)
      .fixedSize()
      .contentTransition(reduceMotion ? .identity : .numericText())
      .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: card.stamps)
      .accessibilityHidden(true)
  }

  private func rewardBand(available: Bool, animateArrival: Bool) -> some View {
    let animation: Animation? = animateArrival && isSweeto && rewardArrival && available && !reduceMotion && scenePhase == .active
      ? .timingCurve(0.22, 0.68, 0.26, 1, duration: 0.40).delay(0.24)
      : nil
    return ZStack {
      stampStock
      ZStack {
        isSweeto ? palette.primary.opacity(0.24) : palette.peach
        if isSweeto {
          GuestPaperGrain(ink: receiptInk).opacity(0.42)
          VStack {
            Spacer(minLength: 0)
            GuestPerforation(color: receiptInk.opacity(0.31))
              .padding(.horizontal, 14).padding(.bottom, 2)
          }
        }
      }
      .mask(GuestRewardPaper(progress: available ? 1 : 0).fill(.white))
      .animation(animation, value: available)
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  @ViewBuilder private func printedSeal(playback: SweetoStampPlayback? = nil, isReward: Bool = false) -> some View {
    let fallback = GuestPrintedSeal(palette: palette, fill: isSweeto ? palette.primary : palette.peach, ink: palette.ink)
    if isSweeto {
      SweetoStampImprint(playback: playback, guideInk: receiptInk, isReward: isReward) { fallback.rotationEffect(.degrees(-11)) }
    } else {
      fallback
    }
  }

  private func stampRow(count: Int, goal: Int, animateNewest: Bool = false, diameter: CGFloat = 41) -> some View {
    let visible = max(1, min(goal, 12))
    let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: min(visible, typeSize.isAccessibilitySize ? 3 : 6))
    return LazyVGrid(columns: columns, alignment: .center, spacing: 8) {
      ForEach(0..<visible, id: \.self) { index in
        let stamped = index < count
        let isReward = index == goal - 1
        ZStack {
          if stamped {
            printedSeal(playback: animateNewest && index == count - 1 ? stampPlayback : nil, isReward: isReward)
          } else if isReward {
            Circle().fill(cream)
            Circle().strokeBorder(receiptInk, lineWidth: 1.5)
            Image(systemName: "gift").font(.system(size: 15, weight: .semibold)).foregroundStyle(receiptInk)
          } else {
            Circle().strokeBorder(receiptInk.opacity(0.64), style: StrokeStyle(lineWidth: 1, dash: [2, 3]))
            if isSweeto {
              Text(String(index + 1)).font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(receiptInk)
            }
          }
        }
        .frame(maxWidth: diameter)
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(t("Pieczątki", "Stamps", "Отметки"))
    .accessibilityValue(t("\(count) z \(goal)", "\(count) of \(goal)", "\(count) из \(goal)"))
    .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: count)
  }

  private var demoNotice: some View {
    Text(t("Karta demonstracyjna · nagrody testowe", "Demo card · test rewards", "Демокарта · тестовые награды"))
      .font(.caption)
      .foregroundStyle(palette.muted)
      .fixedSize(horizontal: false, vertical: true)
  }

  private var demoEntry: some View {
    Button {
      rewardArrival = false
      demoStage = .ready
      demoPresented = true
    } label: {
      HStack(spacing: 12) {
        Image(systemName: "viewfinder").frame(width: 20)
        Text(t("Wypróbuj symulację kasy", "Try the counter simulation", "Попробовать симуляцию кассы"))
          .font(.subheadline.weight(.medium))
        Spacer(minLength: 4)
        Image(systemName: "chevron.right").font(.footnote.weight(.semibold))
      }
      .foregroundStyle(palette.muted)
      .frame(minHeight: 48).padding(.horizontal, 12)
      .contentShape(.rect)
      .accessibilityElement(children: .combine)
    }
    .buttonStyle(PressStyle())
  }

  @ViewBuilder private var walletSection: some View {
    if walletChecked, walletMembership == card?.checkout, walletLookup != nil || installedPass != nil {
      if !isSweeto { receiptSeam }
      VStack(spacing: 11) {
        if walletLookupFailed, walletLookup != nil {
          cardEntryButton(
            title: t("Sprawdź Wallet ponownie", "Retry Wallet setup", "Проверить Wallet ещё раз"),
            systemImage: "arrow.clockwise"
          ) { walletLookupAttempt += 1 }
        } else if installedPass != nil || canAddApplePass {
          HStack(spacing: 8) {
            appleWalletAction
            if walletLookup != nil && (googleWalletAvailable || canRefreshPass) {
              Menu {
                if canRefreshPass {
                  Button(t("Uaktualnij kartę w Wallet", "Update Wallet pass", "Обновить карту в Wallet"), systemImage: "arrow.clockwise") {
                    walletRequest = .refreshApple
                  }
                }
                if googleWalletAvailable {
                  Button(t("Dodaj do Portfela Google", "Add to Google Wallet", "Добавить в Google Кошелек"), systemImage: "wallet.pass") {
                    walletRequest = .addGoogle
                  }
                }
              } label: {
                Image(systemName: "ellipsis.circle").font(.title3).frame(width: 44, height: 44)
              }
              .accessibilityLabel(t("Opcje portfela", "Wallet options", "Параметры кошелька"))
              .disabled(walletRequest != nil)
            }
          }
        } else if walletLookup != nil && googleWalletAvailable {
          googleWalletAction
        } else if showPreview || demo != nil {
          cardEntryButton(
            title: demo != nil
              ? t("Podgląd karty demo", "Preview demo card", "Предпросмотр демо-карты")
              : t("Podgląd karty", "Preview card", "Предпросмотр карты"),
            systemImage: "wallet.pass"
          ) { preview = true }
        }
        if walletRequest != nil {
          ProgressView().accessibilityLabel(t("Przygotowujemy kartę…", "Preparing your pass…", "Подготавливаем карту…"))
        }
      }
      .padding(.horizontal, 19).padding(.vertical, 12)
      .frame(maxWidth: .infinity)
    }
  }

  private var canAddApplePass: Bool {
    walletAvailable && PKAddPassesViewController.canAddPasses()
  }

  private var canRefreshPass: Bool {
    installedPass != nil && canAddApplePass && !walletUpdates
  }

  @ViewBuilder private var appleWalletAction: some View {
    if let installedPass {
      if let url = installedPass.passURL {
        Link(destination: url) {
          Label(t("Otwórz w Apple Wallet", "Open in Apple Wallet", "Открыть в Apple Wallet"), systemImage: "wallet.pass.fill")
            .font(.subheadline.weight(.semibold)).frame(minHeight: 44)
        }
      } else {
        Label(t("Karta w Apple Wallet", "Pass in Apple Wallet", "Карта в Apple Wallet"), systemImage: "checkmark.circle.fill")
          .font(.headline)
      }
    } else {
      WalletAddButton(enabled: walletLookup != nil && walletRequest == nil) { walletRequest = .addApple }
        .frame(maxWidth: 210)
        .frame(height: 52)
    }
  }

  private var googleWalletAction: some View {
    Button { walletRequest = .addGoogle } label: {
      Image(t("GoogleWalletBadgePL", "GoogleWalletBadgeEN", "GoogleWalletBadgeRU"))
        .resizable().scaledToFit()
        .frame(height: 55)
        .accessibilityHidden(true)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(t("Dodaj do Portfela Google", "Add to Google Wallet", "Добавить в Google Кошелек"))
    .accessibilityHint(t("Otwiera stronę Portfela Google.", "Opens the Google Wallet website.", "Открывает сайт Google Кошелек."))
    .disabled(walletLookup == nil || walletRequest != nil)
  }

  private func previewField(_ label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(label).font(.system(.caption, design: .monospaced, weight: .semibold))
        .textCase(.uppercase).foregroundStyle(isSweeto ? palette.primary : palette.peach)
      Text(value).font(.headline.weight(.semibold)).foregroundStyle(cream)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }

  private func previewStampBand(_ card: VenueLoyaltyCard) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      progressTitle(card, remainder: remainingStamps(card))
      stampRow(count: card.stamps, goal: card.goal)
    }
    .foregroundStyle(receiptInk)
    .padding(.horizontal, 18).padding(.vertical, 14)
    .background(rewardBand(available: isSweeto && card.rewardAvailable, animateArrival: false))
  }

  private var walletIdentity: some View {
    let layout = typeSize.isAccessibilitySize
      ? AnyLayout(VStackLayout(alignment: .leading, spacing: 9))
      : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 16))
    return layout {
      HStack(spacing: 5) {
        GuestPapayaMark(palette: palette).frame(width: 23, height: 25)
        HStack(spacing: 0) {
          Text("Papu").foregroundStyle(cream)
          Text("Pay").foregroundStyle(palette.primary)
        }
        .font(Papu.wordmark(22))
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("PapuPay")
      Text(venueName)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(cream)
        .frame(maxWidth: .infinity, alignment: typeSize.isAccessibilitySize ? .leading : .trailing)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(.horizontal, 18).padding(.vertical, 16)
  }

  private var cardPreview: some View {
    NavigationStack {
      ScrollView {
        if let card {
          VStack(alignment: .leading, spacing: 16) {
            Text(isSweeto ? t("Podgląd karty", "Card preview", "Предпросмотр карты") : t("Podgląd w Wallet", "Wallet preview", "Предпросмотр Wallet"))
              .font(palette.display(.title))
              .foregroundStyle(receiptInk)
              .accessibilityAddTraits(.isHeader)
            if isSweeto {
              PocketCardLayout { stampFace(card) }
                .background(receiptInk)
                .clipShape(.rect(cornerRadius: 20))
              checkoutFace(card)
                .background(.white, in: .rect(cornerRadius: 20))
            } else {
              VStack(alignment: .leading, spacing: 0) {
                walletIdentity
                previewStampBand(card)
                previewField(
                  t("Przy kasie", "At checkout", "На кассе"),
                  value: t("Pokaż ten kod", "Show this code", "Покажите код")
                )
                .padding(.horizontal, 18).padding(.top, 15)
                VStack(spacing: 5) {
                  GuestCheckoutCode(value: card.checkout, unavailable: t("Kod QR niedostępny", "QR code unavailable", "QR-код недоступен"))
                    .accessibilityLabel(t("Kod QR karty", "Card QR code", "QR-код карты"))
                  Text(card.code)
                    .font(.system(.caption, design: .monospaced, weight: .semibold))
                    .tracking(1.5).foregroundStyle(palette.ink).textSelection(.enabled)
                    .accessibilityLabel(t("Numer karty \(card.code)", "Card number \(card.code)", "Номер карты \(card.code)"))
                }
                .padding(8)
                .background(.white, in: .rect(cornerRadius: 8))
                .frame(maxWidth: .infinity)
                .padding(16)
              }
              .background(receiptInk, in: .rect(cornerRadius: palette.actionCorner))
              .clipShape(.rect(cornerRadius: palette.actionCorner))
              .shadow(color: receiptInk.opacity(0.14), radius: 12, x: 0, y: 6)
            }
            Text(demo != nil
              ? t("Karta demonstracyjna. Kod działa tylko w symulacji kasy.", "Demo pass. This code works in the counter simulation.", "Демо-карта. Код предназначен для симуляции кассы.")
              : t("To podgląd karty. Przy kasie pokaż ten kod QR.", "This is a pass preview. You can show this QR code at the counter.", "Это предварительный просмотр. Покажите этот QR-код на кассе."))
              .font(.footnote).foregroundStyle(palette.muted)
              .fixedSize(horizontal: false, vertical: true)
          }
          .padding(18)
          .frame(maxWidth: 510)
          .frame(maxWidth: .infinity)
        }
      }
      .foregroundStyle(palette.ink)
      .background(palette.paper.ignoresSafeArea())
      .toolbar { Button(t("Gotowe", "Done", "Готово")) { preview = false } }
      .tint(receiptInk)
    }
    .presentationDragIndicator(.visible)
  }

  private var demoScanner: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text(t("Symulacja kasy", "Counter simulation", "Симуляция кассы"))
            .font(palette.display(.largeTitle))
            .foregroundStyle(receiptInk)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
          if let card { demoPunchCard(card) }
          VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .firstTextBaseline, spacing: 7) {
              if demoStage == .redeemed {
                Image(systemName: "checkmark.circle.fill").accessibilityHidden(true)
              }
              Text(demoTitle)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            }
            .font(palette.display(.title2))
            .foregroundStyle(demoStage == .redeemed ? Papu.green : receiptInk)
            Text(demoDescription).font(.subheadline).foregroundStyle(palette.muted)
              .fixedSize(horizontal: false, vertical: true)
          }
          demoAction
          Text(t("To demonstracja. Żadna prawdziwa nagroda nie zostanie wydana.", "This is a demo. No real reward will be issued.", "Это демонстрация. Настоящая награда не выдаётся."))
            .font(.caption).foregroundStyle(palette.muted)
        }
        .padding(24)
        .frame(maxWidth: 530, alignment: .leading)
        .frame(maxWidth: .infinity)
      }
      .background(palette.paper.ignoresSafeArea())
      .foregroundStyle(palette.ink)
      .tint(receiptInk)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button(t("Gotowe", "Done", "Готово")) { cancelDemoScan(); demoPresented = false }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Menu {
            Button(t("Zacznij demo od nowa", "Start demo again", "Начать демо заново"), systemImage: "arrow.counterclockwise") { confirmReset = true }
          } label: {
            Image(systemName: "ellipsis").frame(minWidth: 44, minHeight: 44)
          }.accessibilityLabel(t("Opcje demonstracji", "Demo options", "Настройки демо"))
        }
      }
      .confirmationDialog(t("Odebrać nagrodę testową?", "Redeem the test reward?", "Получить тестовую награду?"), isPresented: $confirmRedeem, titleVisibility: .visible) {
        Button(t("Potwierdź odbiór", "Confirm redemption", "Подтвердить получение")) { redeemDemo() }
        Button(t("Anuluj", "Cancel", "Отмена"), role: .cancel) {}
      }
      .confirmationDialog(t("Wyzerować demonstrację?", "Reset the demo?", "Сбросить демо?"), isPresented: $confirmReset, titleVisibility: .visible) {
        Button(t("Zacznij od nowa", "Start again", "Начать заново"), role: .destructive) { resetDemo() }
        Button(t("Anuluj", "Cancel", "Отмена"), role: .cancel) {}
      }
    }
    .presentationDragIndicator(.visible)
  }

  private var demoTitle: String {
    switch demoStage {
    case .scanning: t("Odczytujemy kartę…", "Reading your card…", "Считываем карту…")
    case .redeemed: t("Nagroda odebrana", "Reward redeemed", "Награда получена")
    case .stamped where stampConfirmed && card?.rewardAvailable != true: t("Pieczątka dodana", "Stamp collected", "Отметка получена")
    default: card?.rewardAvailable == true
      ? t("Nagroda czeka", "Your reward is ready", "Ваша награда готова")
      : t("Zeskanuj kartę", "Scan the card", "Отсканируйте карту")
    }
  }

  private var demoDescription: String {
    switch demoStage {
    case .scanning: t("Chwila na potwierdzenie wizyty", "Confirming your visit", "Подтверждаем ваш визит")
    case .redeemed: t("Nowa runda, ta sama karta. Zbieraj kolejne pieczątki.", "A new round, the same card. Collect your next stamps.", "Новый круг, та же карта. Собирайте следующие отметки.")
    case .stamped where stampConfirmed && card?.rewardAvailable != true: t("Pieczątka jest już na Twojej karcie.", "The stamp is now on your card.", "Отметка уже на вашей карте.")
    default: card?.rewardAvailable == true
      ? t("Obsługa potwierdza odbiór, a karta zaczyna kolejną rundę.", "Staff confirm redemption, then your card starts a new round.", "Сотрудник подтверждает получение, и карта начинает новый круг.")
      : t("Każdy testowy skan dodaje jedną pieczątkę.", "Each test scan adds one stamp.", "Каждое тестовое сканирование добавляет одну отметку.")
    }
  }

  private func demoPunchCard(_ card: VenueLoyaltyCard) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 9) {
        GuestPapayaMark(palette: palette).frame(width: 22, height: 24)
        Text(t("Karta demo", "Demo card", "Демо-карта"))
          .font(.system(.subheadline, design: .monospaced, weight: .semibold))
          .fixedSize(horizontal: false, vertical: true)
      }
      .padding(.horizontal, 16).padding(.vertical, 11)
      .frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(cream).background(receiptInk)
      VStack(spacing: 3) {
        ZStack {
          GuestCheckoutCode(value: card.checkout, unavailable: t("Kod QR niedostępny", "QR code unavailable", "QR-код недоступен"), side: 122)
            .accessibilityLabel(t("Kod QR karty demo", "Demo card QR code", "QR-код демо-карты"))
          GuestScanCorners(color: receiptInk.opacity(0.58)).frame(width: 132, height: 132)
          if demoStage == .scanning && !reduceMotion {
            GuestScanSweep(color: palette.primary).frame(width: 116, height: 116)
          }
        }
        .frame(height: 136)
        Text(card.code)
          .font(.system(.caption, design: .monospaced, weight: .semibold))
          .tracking(0.9)
          .accessibilityLabel(t("Numer karty \(card.code)", "Card number \(card.code)", "Номер карты \(card.code)"))
      }
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity)
      .background(.white)
      receiptSeam
      VStack(alignment: .leading, spacing: 8) {
        ViewThatFits(in: .horizontal) {
          HStack(spacing: 8) {
            Text(t("Pieczątki", "Stamps", "Отметки")).fixedSize()
            Spacer(minLength: 0)
            progressFraction(card)
          }
          VStack(alignment: .leading, spacing: 4) {
            Text(t("Pieczątki", "Stamps", "Отметки"))
            progressFraction(card)
          }
        }
        .font(palette.display(.headline))
        .accessibilityHidden(true)
        stampRow(count: card.stamps, goal: card.goal, animateNewest: stampConfirmed, diameter: 44)
      }
      .padding(.horizontal, 16).padding(.vertical, 11)
      .background(rewardBand(available: isSweeto && card.rewardAvailable, animateArrival: true))
    }
    .background(palette.surface, in: .rect(cornerRadius: palette.actionCorner))
    .clipShape(.rect(cornerRadius: palette.actionCorner))
    .shadow(color: palette.ink.opacity(0.09), radius: 11, x: 0, y: 4)
  }

  @ViewBuilder private var demoAction: some View {
    if demoStage == .redeemed {
      cardEntryButton(title: t("Wróć do karty", "Back to my card", "Вернуться к карте"), systemImage: "arrow.right") {
        demoPresented = false
      }
    } else if card?.rewardAvailable == true {
      cardEntryButton(title: t("Odbierz nagrodę", "Redeem reward", "Получить награду"), systemImage: "gift") { confirmRedeem = true }
    } else {
      cardEntryButton(
        title: demoStage == .scanning ? t("Skanowanie…", "Scanning…", "Сканирование…") : stampConfirmed ? t("Zasymuluj kolejny skan", "Simulate another scan", "Повторить сканирование") : t("Zasymuluj skan", "Simulate a scan", "Имитировать сканирование"),
        systemImage: "viewfinder", action: scanDemo
      ).disabled(demoStage == .scanning)
    }
  }

  @MainActor private func refresh() async {
    guard snapshotOnly == nil else { return }
    guard !creating, !checkingBalance, scenePhase == .active, wallet == nil, !preview else { return }
    if let demo {
      demoLedger = VenueDemoLoyalty.load(namespace: demo.loyaltyNamespace(for: api.venue))
      applyDemoCard()
      failed = false
      ready = true
      return
    }
    if !ready, card == nil, let saved = api.cachedCard() {
      card = saved
      ready = true
    }
    checkingBalance = true
    defer { checkingBalance = false }
    readGeneration += 1
    let generation = readGeneration
    do {
      let found = try await api.card()
      guard !Task.isCancelled, !creating, generation == readGeneration else { return }
      guard scenePhase == .active, wallet == nil, !preview else { return }
      if isSweeto {
        let change = VenueStampObservation.record(found, venue: api.venue)
        if change == .stale {
          failed = true
          balanceConfirmed = false
          ready = true
          return
        }
        if case .earned(let count) = change, let found {
          receivedStamps = count
          rewardArrival = found.rewardAvailable
          showingCheckout = false
          confirmStampMotion()
          let reward = t("Nagroda do odbioru.", "Your reward is ready.", "Награда готова.")
          AccessibilityNotification.Announcement(stampReceipt(count) + (rewardArrival ? " " + reward : "")).post()
        } else if card?.checkout != found?.checkout || card?.stamps != found?.stamps {
          receivedStamps = 0
          rewardArrival = false
        }
      } else if let card, let found, card.code == found.code, found.stamps > card.stamps {
        rewardArrival = found.rewardAvailable && !card.rewardAvailable
        confirmStampMotion()
        announceStamp(rewardAvailable: found.rewardAvailable)
      } else if found?.code != card?.code || found?.rewardAvailable != true {
        rewardArrival = false
      }
      if found != card { card = found }
      balanceConfirmed = found != nil
      failed = false
    } catch is CancellationError {
      return
    } catch {
      if !Task.isCancelled, generation == readGeneration {
        balanceConfirmed = false
        failed = true
      }
    }
    if !Task.isCancelled { ready = true }
  }

  @MainActor private func createCard() async {
    guard !creating else { return }
    readGeneration += 1
    issuanceFailed = false
    if demo != nil {
      withAnimation(reduceMotion ? nil : .spring(response: 0.37, dampingFraction: 0.85)) {
        focusCheckoutOnCreate = true
        demoLedger.create()
        saveDemoCard()
        cardMotion += 1
      }
      return
    }
    creating = true
    defer { creating = false }
    do {
      guard let created = try await api.card(create: true) else { throw URLError(.badServerResponse) }
      if isSweeto { _ = VenueStampObservation.record(created, venue: api.venue) }
      withAnimation(reduceMotion ? nil : .spring(response: 0.37, dampingFraction: 0.85)) {
        focusCheckoutOnCreate = true
        card = created
        balanceConfirmed = true
        cardMotion += 1
        failed = false
      }
    } catch { issuanceFailed = true }
  }

  @MainActor private func scanDemo() {
    guard demo != nil, demoStage != .scanning, demoLedger.created, !demoLedger.rewardAvailable else { return }
    demoStage = .scanning
    let scanID = UUID()
    demoScanTask = Task { @MainActor in
      if !reduceMotion {
        do { try await Task.sleep(for: .milliseconds(680)) } catch { return }
      }
      guard !Task.isCancelled, demoPresented, scenePhase == .active, demoLedger.scan(scanID) else { return }
      rewardArrival = demoLedger.rewardAvailable
      saveDemoCard()
      demoStage = .stamped(demoLedger.stamps)
      confirmStampMotion()
      announceStamp(rewardAvailable: demoLedger.rewardAvailable)
      demoScanTask = nil
    }
  }

  @MainActor private func cancelDemoScan() {
    demoScanTask?.cancel()
    demoScanTask = nil
    if demoStage == .scanning { demoStage = .ready }
  }

  @MainActor private func confirmStampMotion() {
    stampPlayback = isSweeto && !reduceMotion && scenePhase == .active ? SweetoStampPlayback(celebratesReward: rewardArrival) : nil
    stampMotion += 1
  }

  private func stampReceipt(_ count: Int) -> String {
    if count == 1 { return t("Pieczątka dodana.", "Stamp collected.", "Отметка получена.") }
    return t("Nowe pieczątki: \(count).", "\(count) stamps collected.", "Новых отметок: \(count).")
  }

  private func announceStamp(rewardAvailable: Bool) {
    let message = rewardAvailable
      ? t("Pieczątka dodana. Nagroda do odbioru.", "Stamp collected. Your reward is ready.", "Отметка получена. Награда готова.")
      : t("Pieczątka dodana.", "Stamp collected.", "Отметка получена.")
    AccessibilityNotification.Announcement(message).post()
  }

  @MainActor private func redeemDemo() {
    guard demo != nil, demoLedger.redeem() else { return }
    rewardArrival = false
    saveDemoCard()
    demoStage = .redeemed
    cardMotion += 1
    AccessibilityNotification.Announcement(t("Nagroda odebrana.", "Reward redeemed.", "Награда получена.")).post()
  }

  @MainActor private func resetDemo() {
    guard demo != nil else { return }
    cancelDemoScan()
    rewardArrival = false
    demoLedger = VenueDemoLoyalty()
    saveDemoCard()
    demoPresented = false
  }

  @MainActor private func saveDemoCard() {
    guard let demo else { return }
    demoLedger.save(namespace: demo.loyaltyNamespace(for: api.venue))
    applyDemoCard()
    failed = false
    ready = true
  }

  @MainActor private func applyDemoCard() {
    guard let demo else { return }
    card = demoLedger.created ? VenueLoyaltyCard(
      code: demo.cardCode, checkout: demo.checkout, stamps: demoLedger.stamps,
      goal: VenueDemoLoyalty.goal, rewardAvailable: demoLedger.rewardAvailable
    ) : nil
  }

  private func passIsInstalled(_ pass: PKPass) -> Bool {
    PKPassLibrary.isPassLibraryAvailable() && PKPassLibrary().containsPass(pass)
  }

  private func signedPass(for membership: VenueLoyaltyCard) async throws -> PKPass {
    if let demo {
      guard let data = demo.walletPassData(stamps: membership.stamps) else { throw URLError(.fileDoesNotExist) }
      return try PKPass(data: data)
    }
    return try await PKPass(data: api.applePass(language: language))
  }

  @MainActor private func prepareWallet(_ request: WalletRequest) async {
    defer { if walletRequest == request { walletRequest = nil } }
    guard let membership = card, walletLookup != nil else { return }
    do {
      if request == .addGoogle {
        let url = try await api.googlePassURL()
        guard !Task.isCancelled, card?.checkout == membership.checkout, scenePhase == .active else { return }
        openURL(url) { accepted in
          if !accepted && card?.checkout == membership.checkout { walletFailure = request }
        }
        return
      }
      let pass = try await signedPass(for: membership)
      guard !Task.isCancelled, card?.checkout == membership.checkout, scenePhase == .active else { return }
      let alreadyInstalled = passIsInstalled(pass)
      if alreadyInstalled {
        installedPass = pass
        previouslyInstalled = membership.fingerprint(in: api.venue)
        if request == .addApple, let url = pass.passURL {
          openURL(url) { opened in
            if !opened && card?.checkout == membership.checkout { walletFailure = request }
          }
          return
        }
      } else {
        installedPass = nil
        if previouslyInstalled == membership.fingerprint(in: api.venue) { previouslyInstalled = Data() }
      }
      guard let controller = PKAddPassesViewController(pass: pass) else { throw URLError(.cannotDecodeContentData) }
      let review = NativeWalletPass(controller: controller, pass: pass, membership: membership.checkout, wasInstalled: alreadyInstalled)
      pendingWalletCheck = review
      wallet = review
    } catch is CancellationError {
      return
    } catch {
      if !Task.isCancelled && card?.checkout == membership.checkout { walletFailure = request }
    }
  }
}

/// Reveals the earned reward stock with a perforated paper edge, in place.
private struct GuestRewardPaper: Shape {
  var progress: CGFloat
  var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  func path(in rect: CGRect) -> Path {
    let fraction = min(max(0, progress), 1)
    guard fraction > 0 else { return Path() }
    guard fraction < 1 else { return Path(rect) }
    let edge = rect.minX + rect.width * fraction
    let toothDepth = min(3, edge - rect.minX)
    let teeth = max(1, Int((rect.height / 6).rounded(.up)))
    var path = Path()
    path.move(to: CGPoint(x: rect.minX, y: rect.minY))
    for index in 0...teeth {
      path.addLine(to: CGPoint(
        x: edge - (index.isMultiple(of: 2) ? 0 : toothDepth),
        y: rect.minY + rect.height * CGFloat(index) / CGFloat(teeth)
      ))
    }
    path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
    path.closeSubpath()
    return path
  }
}

/// A scalloped, two-colour ink impression for the membership and individual punches.
private struct GuestPrintedSeal: View {
  let palette: VenueGuestPalette
  let fill: Color
  let ink: Color

  var body: some View {
    GeometryReader { geometry in
      let side = min(geometry.size.width, geometry.size.height)
      ZStack {
        Canvas { context, size in
          let center = CGPoint(x: size.width / 2, y: size.height / 2)
          let radius = min(center.x, center.y)
          var rim = Path()
          for step in 0..<192 {
            let angle = CGFloat(step) * .pi / 96
            let tooth = radius * (0.965 + 0.035 * cos(angle * 16))
            let point = CGPoint(x: center.x + tooth * cos(angle), y: center.y + tooth * sin(angle))
            if step == 0 { rim.move(to: point) } else { rim.addLine(to: point) }
          }
          rim.closeSubpath()
          context.fill(rim, with: .color(fill))
        }
        Circle().strokeBorder(ink, lineWidth: max(0.75, side / 80))
          .padding(side * 0.10)
        GuestPapayaMark(palette: palette)
          .frame(width: side * 0.57, height: side * 0.64)
          .rotationEffect(.degrees(11))
      }
      .frame(width: side, height: side)
    }
    .aspectRatio(1, contentMode: .fit)
    .accessibilityHidden(true)
  }
}

private struct GuestCheckoutCode: View {
  let value: String
  let unavailable: String
  var side: CGFloat = 168
  @State private var rendered: (value: String, bitmap: UIImage?)?

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 8).fill(.white)
      if let rendered, rendered.value == value {
        if let bitmap = rendered.bitmap {
          Image(uiImage: bitmap)
            .interpolation(.none).resizable().scaledToFit()
            .padding(4)
            .accessibilityHidden(true)
        } else {
          Text(unavailable).font(.footnote.weight(.medium))
            .multilineTextAlignment(.center).foregroundStyle(.black).padding(8)
        }
      }
    }
    .frame(width: side, height: side)
    .accessibilityElement(children: .ignore)
    .accessibilityValue(rendered?.value == value && rendered?.bitmap == nil ? unavailable : "")
    .task(id: value) { rendered = (value, CheckoutQR.image(value)) }
    .transaction { $0.animation = nil }
  }
}

/// Keeps the printed card proportions at typical sizes and grows for larger type.
private struct PocketCardLayout: Layout {
  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? 340
    let heights = subviews.map { $0.sizeThatFits(.init(width: width, height: nil)).height }
    return CGSize(width: width, height: max(width / 1.586, heights.max() ?? 0))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    for face in subviews {
      face.place(at: bounds.origin, anchor: .topLeading, proposal: ProposedViewSize(bounds.size))
    }
  }
}

private struct PocketCardSide: ViewModifier, Animatable {
  var degrees: Double
  var animatableData: Double {
    get { degrees }
    set { degrees = newValue }
  }

  func body(content: Content) -> some View {
    let tilt = abs(sin(degrees * .pi / 180))
    content
      .overlay {
        RoundedRectangle(cornerRadius: 20)
          .fill(.black.opacity(0.13 * tilt)).allowsHitTesting(false)
      }
      .rotation3DEffect(.degrees(degrees), axis: (x: 0, y: 1, z: 0), perspective: 0.45)
      .opacity(abs(degrees) < 90 ? 1 : 0)
  }
}

private struct GuestScanCorners: View {
  let color: Color

  var body: some View {
    Canvas { context, size in
      let length = 13.0
      let positions = [
        (CGPoint(x: 0, y: 0), 1.0, 1.0),
        (CGPoint(x: size.width, y: 0), -1.0, 1.0),
        (CGPoint(x: 0, y: size.height), 1.0, -1.0),
        (CGPoint(x: size.width, y: size.height), -1.0, -1.0)
      ]
      var path = Path()
      for (point, dx, dy) in positions {
        path.move(to: CGPoint(x: point.x + length * dx, y: point.y))
        path.addLine(to: point)
        path.addLine(to: CGPoint(x: point.x, y: point.y + length * dy))
      }
      context.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: 1.4, lineCap: .round, lineJoin: .round))
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

private struct GuestScanSweep: View {
  let color: Color
  @State private var scanned = false

  var body: some View {
    GeometryReader { layout in
      Rectangle()
        .fill(color)
        .frame(height: 2)
        .shadow(color: color.opacity(0.70), radius: 5)
        .offset(y: scanned ? layout.size.height - 2 : 0)
    }
    .onAppear {
      withAnimation(.easeInOut(duration: 0.62)) { scanned = true }
    }
    .accessibilityHidden(true)
  }
}

private enum CheckoutQR {
  static let context = CIContext()

  static func image(_ checkout: String) -> UIImage? {
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(checkout.utf8)
    filter.correctionLevel = "M"
    guard let pattern = filter.outputImage else { return nil }
    let white = CIImage(color: CIColor.white).cropped(to: pattern.extent.insetBy(dx: -4, dy: -4))
    let output = pattern.composited(over: white).transformed(by: .init(scaleX: 10, y: 10))
    guard let bitmap = context.createCGImage(output, from: output.extent) else { return nil }
    return UIImage(cgImage: bitmap)
  }
}

private struct NativeWalletPass: Identifiable {
  let id = UUID()
  let controller: PKAddPassesViewController
  let pass: PKPass
  let membership: String
  let wasInstalled: Bool
}

private struct WalletAddButton: UIViewRepresentable {
  let enabled: Bool
  let action: () -> Void

  func makeUIView(context: Context) -> PKAddPassButton {
    let button = PKAddPassButton(addPassButtonStyle: .black)
    button.addAction(UIAction { _ in context.coordinator.action() }, for: .touchUpInside)
    return button
  }
  func updateUIView(_ view: PKAddPassButton, context: Context) {
    context.coordinator.action = action
    view.isEnabled = enabled
  }
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: PKAddPassButton, context: Context) -> CGSize? {
    guard let width = proposal.width, let height = proposal.height else { return nil }
    return CGSize(width: width, height: height)
  }
  func makeCoordinator() -> Coordinator { Coordinator(action) }

  final class Coordinator {
    var action: () -> Void
    init(_ action: @escaping () -> Void) { self.action = action }
  }
}

private struct WalletPresentation: UIViewControllerRepresentable {
  let controller: PKAddPassesViewController
  let dismiss: () -> Void

  func makeUIViewController(context: Context) -> PKAddPassesViewController {
    controller.delegate = context.coordinator
    return controller
  }
  func updateUIViewController(_ controller: PKAddPassesViewController, context: Context) {}
  func makeCoordinator() -> Coordinator { Coordinator(dismiss) }

  final class Coordinator: NSObject, PKAddPassesViewControllerDelegate {
    let dismiss: () -> Void
    init(_ dismiss: @escaping () -> Void) { self.dismiss = dismiss }
    func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) { dismiss() }
  }
}

enum VenueWiFiJoinError: Error { case unavailable }

enum VenueWiFiJoin {
  @MainActor static func apply(_ details: VenueGuestWiFi) async throws {
    let config: NEHotspotConfiguration
    switch details.security {
    case .nopass:
      config = NEHotspotConfiguration(ssid: details.ssid)
    case .WPA, .WEP:
      guard let password = details.password else { throw VenueWiFiJoinError.unavailable }
      config = NEHotspotConfiguration(ssid: details.ssid, passphrase: password, isWEP: details.security == .WEP)
    }
    config.hidden = details.hidden
    do {
      try await NEHotspotConfigurationManager.shared.apply(config)
    } catch let error as NSError where error.domain == NEHotspotConfigurationErrorDomain &&
      error.code == NEHotspotConfigurationError.alreadyAssociated.rawValue {
      return
    }
  }
}

struct VenueWiFiHelp: View {
  let details: VenueGuestWiFi?
  let failed: Bool
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  var busy = false
  var isDemo = false
  let connect: () -> Void
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var revealed = false
  @State private var copied = false
  @State private var copyCount = 0

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        let heading = typeSize.isAccessibilitySize
          ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10))
          : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        heading {
          Image(systemName: "wifi")
            .font(.system(size: 24, weight: .semibold))
            .foregroundStyle(palette.forest)
            .frame(width: 50, height: 50)
            .background(palette.peach, in: .rect(cornerRadius: 9))
            .accessibilityHidden(true)
          Text(t("Wi-Fi dla gości", "Guest Wi-Fi", "Гостевой Wi-Fi"))
            .font(palette.display(.largeTitle))
            .foregroundStyle(palette.forest)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
        }
        if let details {
          networkTicket(details)
          if failed {
            Text(t("Wybierz tę sieć w ustawieniach Wi-Fi.", "Choose this network in Wi-Fi settings.", "Выберите эту сеть в настройках Wi-Fi."))
              .font(.subheadline).foregroundStyle(palette.muted)
          }
        } else {
          Text(t("Poproś obsługę o nazwę sieci dla gości i hasło.", "Ask staff for the guest network name and password.", "Узнайте у сотрудников название гостевой сети и пароль."))
            .font(.body)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(palette.surface, in: .rect(cornerRadius: palette.actionCorner))
            .overlay { RoundedRectangle(cornerRadius: palette.actionCorner).strokeBorder(palette.line).allowsHitTesting(false) }
        }
        if failed || details != nil {
          VenueNativeButton(
            title: busy ? t("Łączenie…", "Connecting…", "Подключение…") : t("Połącz z Wi-Fi", "Connect to Wi-Fi", "Подключиться к Wi-Fi"),
            systemImage: "wifi", palette: palette, action: connect
          )
          .disabled(busy)
          Text(t("iPhone poprosi o zgodę na dołączenie do sieci.", "Your iPhone will ask to join the network.", "iPhone запросит разрешение на подключение к сети."))
            .font(.footnote).foregroundStyle(palette.muted)
        }
      }
      .padding(20)
      .frame(maxWidth: 530, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .foregroundStyle(palette.ink)
    .background(palette.paper.ignoresSafeArea())
    .sensoryFeedback(.success, trigger: copyCount)
    .onChange(of: details?.ssid) {
      revealed = false
      copied = false
    }
    .task(id: copyCount) {
      guard copied else { return }
      do { try await Task.sleep(for: .seconds(2)) } catch { return }
      copied = false
    }
  }

  private func networkTicket(_ details: VenueGuestWiFi) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 6) {
        Text(t("Nazwa sieci", "Network name", "Название сети"))
          .font(.system(.caption, design: .monospaced, weight: .semibold))
          .textCase(.uppercase).foregroundStyle(Color.white.opacity(0.80))
        Text(details.ssid).font(palette.display(.title2)).textSelection(.enabled)
          .fixedSize(horizontal: false, vertical: true)
        if details.security == .nopass {
          Text(t("Sieć bez hasła", "No password required", "Пароль не нужен"))
            .font(.footnote)
        }
        if isDemo {
          Text(t("Sieć testowa do demonstracji", "Test network for this demo", "Тестовая сеть для демонстрации"))
            .font(.caption).foregroundStyle(Color.white.opacity(0.84))
        }
      }
      .padding(.horizontal, 17).padding(.vertical, 16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .foregroundStyle(.white).background(palette.forest)
      if let password = details.password, details.security != .nopass {
        GuestPerforation(color: palette.forest.opacity(0.36), cutout: palette.paper)
        passwordSection(password)
      }
    }
    .background(palette.surface, in: .rect(cornerRadius: palette.actionCorner))
    .clipShape(.rect(cornerRadius: palette.actionCorner))
    .shadow(color: palette.ink.opacity(0.09), radius: 11, x: 0, y: 4)
  }

  private func passwordSection(_ password: String) -> some View {
    VStack(alignment: .leading, spacing: 7) {
      Text(t("Hasło", "Password", "Пароль"))
        .font(.system(.caption, design: .monospaced, weight: .semibold))
        .textCase(.uppercase).foregroundStyle(palette.muted)
      Text(revealed ? password : "••••••••••••")
        .font(.body.monospaced()).textSelection(.enabled)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityLabel(revealed ? password : t("Hasło ukryte", "Password hidden", "Пароль скрыт"))
      let actions = typeSize.isAccessibilitySize
        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 0))
        : AnyLayout(HStackLayout(spacing: 21))
      actions {
        Button { revealed.toggle() } label: {
          Label(revealed ? t("Ukryj", "Hide", "Скрыть") : t("Pokaż", "Show", "Показать"), systemImage: revealed ? "eye.slash" : "eye")
            .font(.subheadline.weight(.semibold)).frame(minHeight: 44)
        }
        .accessibilityLabel(revealed ? t("Ukryj hasło", "Hide password", "Скрыть пароль") : t("Pokaż hasło", "Show password", "Показать пароль"))
        Button {
          UIPasteboard.general.setItems([["public.utf8-plain-text": password]], options: [
            .localOnly: true, .expirationDate: Date().addingTimeInterval(60)
          ])
          copied = true
          copyCount += 1
          AccessibilityNotification.Announcement(t("Hasło skopiowane.", "Password copied.", "Пароль скопирован.")).post()
        } label: {
          Label(copied ? t("Skopiowano", "Copied", "Скопировано") : t("Kopiuj", "Copy", "Копировать"), systemImage: copied ? "checkmark" : "doc.on.doc")
            .font(.subheadline.weight(.semibold)).frame(minHeight: 44)
            .contentTransition(reduceMotion ? .identity : .symbolEffect(.replace))
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.18), value: copied)
        }
        .accessibilityLabel(t("Kopiuj hasło", "Copy password", "Скопировать пароль"))
        .accessibilityValue(copied ? t("Skopiowano", "Copied", "Скопировано") : "")
      }
      .buttonStyle(.plain)
      .foregroundStyle(palette.forest)
    }
    .padding(.horizontal, 17).padding(.top, 7).padding(.bottom, 11)
  }
}
