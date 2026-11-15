import CoreImage.CIFilterBuiltins
import NetworkExtension
import PassKit
import PDFKit
import SwiftUI
import UIKit

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
        if shownInPolish && language != .pl {
          HStack(spacing: 7) {
            VenueActionArt(kind: .menu, theme: palette.motionTheme, animated: true)
              .frame(width: 27, height: 27)
            Text(language.text("Menu po polsku", "Menu in Polish", "Меню на польском языке"))
              .font(.footnote)
          }
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
      HStack(spacing: 9) {
        Text(title).font(.headline)
        Spacer()
        Image(systemName: systemImage).accessibilityHidden(true)
      }
      .foregroundStyle(.white)
      .padding(15)
      .frame(minHeight: 50)
      .background(palette.primary, in: .rect(cornerRadius: 15))
    }
    .buttonStyle(PressStyle())
  }
}

struct VenueLoyaltyView: View {
  let api: VenueGuestAPI
  let venueName: String
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  let showPreview: Bool
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var card: VenueLoyaltyCard?
  @State private var ready = false
  @State private var creating = false
  @State private var failed = false
  @State private var walletBusy = false
  @State private var walletFailed = false
  @State private var wallet: NativeWalletPass?
  @State private var preview = false
  @State private var walletAvailable = false
  @State private var cardMotion = 0
  @State private var demoLedger = VenueDemoLoyalty()
  @State private var demoPresented = false
  @State private var demoStage: DemoStage = .ready
  @State private var demoScanTask: Task<Void, Never>?
  @State private var confirmRedeem = false
  @State private var confirmReset = false

  private enum DemoStage: Equatable { case ready, scanning, stamped, redeemed }
  private var demo: VenueGuestDemo? { VenueGuestDemo.configuration(for: api.venue) }
  private var demoNamespace: String { api.venue.origin.absoluteString + "|" + api.venue.slug + "|" + (demo?.cardCode ?? "") }
  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text(t("Twoja karta", "Your loyalty card", "Ваша карта"))
          .font(palette.display(.largeTitle)).accessibilityAddTraits(.isHeader)
        if let card {
          checkout(card)
          walletSection
          if demo != nil { demoEntry }
          if failed {
            Text(t("Nie udało się odświeżyć pieczątek.", "Couldn’t refresh your stamps.", "Не удалось обновить отметки."))
              .font(.footnote)
          }
        } else if ready {
          if failed {
            Text(t("Nie udało się pobrać karty. Spróbuj ponownie.", "Couldn’t load your card. Try again.", "Не удалось загрузить карту. Попробуйте ещё раз."))
            VenueNativeButton(title: t("Spróbuj ponownie", "Try again", "Повторить"), systemImage: "arrow.clockwise", palette: palette) {
              Task { await refresh() }
            }
          } else {
            firstCard
            VenueNativeButton(
              title: creating ? t("Tworzenie karty…", "Creating your card…", "Создаём карту…") : t("Utwórz kartę", "Create my card", "Создать карту"),
              systemImage: "plus", palette: palette
            ) { Task { await createCard() } }
              .disabled(creating)
            if demo != nil { demoNotice }
          }
        } else {
          ProgressView(t("Wczytywanie karty…", "Loading your card…", "Загрузка карты…"))
        }
      }
      .padding(20)
      .frame(maxWidth: 530, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .refreshable { await refresh() }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
    .sensoryFeedback(.success, trigger: cardMotion)
    .task(id: scenePhase) {
      guard scenePhase == .active else { return }
      if demo != nil {
        await refresh()
      } else {
        while !Task.isCancelled {
          await refresh()
          do { try await Task.sleep(for: .seconds(5)) } catch { return }
        }
      }
    }
    .task(id: card?.code) {
      walletAvailable = false
      if let demo {
        walletAvailable = card != nil && demo.walletPassData(stamps: card?.stamps ?? 0) != nil
        return
      }
      guard card != nil, let response = try? await api.wallet(), !Task.isCancelled else { return }
      walletAvailable = response.status == .ready && response.passUrl != nil
    }
    .onChange(of: scenePhase) { _, phase in
      if phase != .active { cancelDemoScan() }
    }
    .onDisappear { cancelDemoScan() }
    .sheet(item: $wallet) { pass in
      WalletPresentation(controller: pass.controller) { wallet = nil }
    }
    .sheet(isPresented: $preview) { cardPreview }
    .sheet(isPresented: $demoPresented, onDismiss: cancelDemoScan) { demoScanner }
    .alert(t("Nie udało się otworzyć Wallet", "Couldn’t open Wallet", "Не удалось открыть Wallet"), isPresented: $walletFailed) {
      Button("OK", role: .cancel) {}
    }
  }

  private var firstCard: some View {
    VStack(alignment: .leading, spacing: 20) {
      HStack(alignment: .top) {
        Text(venueName).font(palette.display(.title2))
        Spacer()
        VenueActionArt(kind: .loyalty, theme: palette.motionTheme, animated: true)
          .frame(width: 68, height: 68)
      }
      Text(t("Małe przyjemności.\nDobre powroty.", "Little treats.\nGood reasons to return.", "Маленькие радости.\nПриятно возвращаться."))
        .font(palette.display(.title2))
      stampRow(count: 0, goal: 6, light: true)
      Text(t("Zbieraj pieczątki przy każdej wizycie.", "Collect stamps when you visit.", "Собирайте отметки при каждом визите."))
        .font(.subheadline)
        .foregroundStyle(.white.opacity(0.84))
    }
    .foregroundStyle(.white)
    .padding(24)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(palette.ink, in: .rect(cornerRadius: 24))
  }

  private func checkout(_ card: VenueLoyaltyCard) -> some View {
    VStack(spacing: 16) {
      VStack(alignment: .leading, spacing: 20) {
        HStack {
          Text(venueName).font(palette.display(.title2))
          Spacer()
          VenueActionArt(kind: .loyalty, theme: palette.motionTheme, animated: cardMotion > 0, replay: cardMotion)
            .frame(width: 48, height: 48)
        }
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          Text("\(card.stamps)/\(card.goal)")
            .font(.system(.largeTitle, design: .rounded, weight: .semibold))
            .contentTransition(.numericText())
          Text(t("pieczątek", "stamps", "отметок")).font(.subheadline)
        }
        stampRow(count: card.stamps, goal: card.goal, light: true)
        Text(card.rewardAvailable
          ? t("Nagroda czeka na Ciebie", "Your reward is ready", "Ваша награда готова")
          : t("Każda pieczątka przybliża do nagrody", "Every stamp brings your reward closer", "Каждая отметка приближает награду"))
          .font(.subheadline.weight(.medium))
          .foregroundStyle(.white.opacity(0.86))
      }
      .foregroundStyle(.white)
      .padding(24)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(palette.ink, in: .rect(cornerRadius: 24))

      VStack(spacing: 12) {
        Text(t("Pokaż przy kasie", "Show at the counter", "Покажите на кассе"))
          .font(.headline)
        if let code = CheckoutQR.image(card.checkout) {
          Image(uiImage: code)
            .interpolation(.none).resizable().scaledToFit()
            .frame(width: 164, height: 164)
            .padding(12)
            .background(.white)
            .accessibilityLabel(t("Kod QR karty", "Card QR code", "QR-код карты"))
        }
        Text(card.code).font(.system(.subheadline, design: .monospaced, weight: .semibold)).textSelection(.enabled)
        if demo != nil { demoNotice }
      }
      .padding(20)
      .frame(maxWidth: .infinity)
      .background(.white, in: .rect(cornerRadius: 20))
      .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(palette.ink.opacity(0.09)))
    }
  }

  private func stampRow(count: Int, goal: Int, light: Bool) -> some View {
    let ink: Color = light ? .white : palette.ink
    return HStack(spacing: 8) {
      ForEach(0..<max(1, min(goal, 12)), id: \.self) { index in
        ZStack {
          Circle().fill(index < count ? ink : ink.opacity(0.08))
          Circle().strokeBorder(ink.opacity(index < count ? 0 : 0.36), style: StrokeStyle(lineWidth: 1, dash: [2, 3]))
          Image(systemName: index < count ? "checkmark" : index == goal - 1 ? "gift" : "plus")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(index < count ? (light ? palette.ink : .white) : ink.opacity(0.78))
            .contentTransition(reduceMotion ? .identity : .symbolEffect(.replace))
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityLabel(t("Pieczątka", "Stamp", "Отметка") + " \(index + 1)")
        .accessibilityValue(index < count ? t("Zebrana", "Collected", "Получена") : t("Do zebrania", "To collect", "Не получена"))
      }
    }
    .animation(reduceMotion ? nil : .smooth(duration: 0.32), value: count)
  }

  private var demoNotice: some View {
    Text(t("Karta demonstracyjna · nagrody testowe", "Demo card · test rewards", "Демокарта · тестовые награды"))
      .font(.caption)
      .foregroundStyle(palette.muted)
      .fixedSize(horizontal: false, vertical: true)
  }

  private var demoEntry: some View {
    Button {
      demoStage = .ready
      demoPresented = true
    } label: {
      HStack(spacing: 12) {
        Image(systemName: "viewfinder").font(.title3)
        VStack(alignment: .leading, spacing: 4) {
          Text(t("Wypróbuj skanowanie", "Try the scanning flow", "Попробовать сканирование"))
            .font(.subheadline.weight(.semibold))
          Text(t("Pieczątka i odbiór nagrody", "Stamp and redeem a reward", "Отметка и получение награды"))
            .font(.caption).foregroundStyle(palette.muted)
        }
        Spacer(minLength: 4)
        Image(systemName: "arrow.right").font(.subheadline)
      }
      .padding(16)
      .frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
      .background(palette.line, in: .rect(cornerRadius: 16))
      .contentShape(.rect(cornerRadius: 16))
    }
    .buttonStyle(PressStyle())
  }

  @ViewBuilder private var walletSection: some View {
    if walletAvailable && PKAddPassesViewController.canAddPasses() {
      VStack(alignment: .leading, spacing: 8) {
        WalletAddButton { Task { await prepareWallet() } }
          .frame(height: 48)
          .disabled(walletBusy)
        if demo != nil {
          Text(t("Po zebraniu pieczątek dodaj kartę ponownie, żeby odświeżyć ją w Wallet.", "After collecting stamps, add the card again to update it in Wallet.", "После получения отметок добавьте карту повторно, чтобы обновить её в Wallet."))
            .font(.caption).foregroundStyle(palette.muted)
        }
        if walletBusy { ProgressView() }
      }
    } else if showPreview || demo != nil {
      VenueNativeButton(
        title: t("Podgląd karty", "Preview card", "Предпросмотр карты"),
        systemImage: "creditcard", palette: palette
      ) { preview = true }
    } else {
      Label(
        t("Dodanie do Apple Wallet jest niedostępne.", "Adding to Apple Wallet is unavailable.", "Добавление в Apple Wallet недоступно."),
        systemImage: "wallet.pass"
      )
      .font(.footnote)
      .foregroundStyle(palette.muted)
    }
  }

  private var cardPreview: some View {
    NavigationStack {
      ScrollView {
        if let card {
          VStack(alignment: .leading, spacing: 16) {
            Text(t("Podgląd projektu karty", "Card design preview", "Предпросмотр карты"))
              .font(palette.display(.title))
            Text(t("Podgląd nie dodaje karty do Apple Wallet.", "This preview does not add a card to Apple Wallet.", "Предпросмотр не добавляет карту в Apple Wallet."))
              .font(.footnote)
            checkout(card)
          }.padding(20)
        }
      }
      .foregroundStyle(palette.ink)
      .background(palette.paper.ignoresSafeArea())
      .toolbar { Button(t("Gotowe", "Done", "Готово")) { preview = false } }
    }
  }

  private var demoScanner: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          HStack(spacing: 8) {
            Image(systemName: "viewfinder")
            Text(t("Symulacja kasy", "Counter simulation", "Симуляция кассы"))
          }.font(.footnote).foregroundStyle(palette.muted)
          Text(demoTitle).font(palette.display(.largeTitle))
          demoScannerArt
          Text(demoDescription).font(.subheadline).foregroundStyle(palette.muted)
            .fixedSize(horizontal: false, vertical: true)
          if let card { stampRow(count: card.stamps, goal: card.goal, light: false) }
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
    case .stamped where card?.rewardAvailable != true: t("Pieczątka dodana", "Stamp collected", "Отметка получена")
    default: card?.rewardAvailable == true
      ? t("Nagroda czeka", "Your reward is ready", "Ваша награда готова")
      : t("Pokaż kod przy kasie", "Show your code at the counter", "Покажите код на кассе")
    }
  }

  private var demoDescription: String {
    switch demoStage {
    case .scanning: t("Chwila na potwierdzenie wizyty", "Confirming your visit", "Подтверждаем ваш визит")
    case .redeemed: t("Nowa runda, ta sama karta. Zbieraj kolejne pieczątki.", "A new round, the same card. Collect your next stamps.", "Новый круг, та же карта. Собирайте следующие отметки.")
    case .stamped where card?.rewardAvailable != true: t("Tak wygląda potwierdzenie po zeskanowaniu karty przez obsługę.", "This is the confirmation after staff scan your card.", "Так выглядит подтверждение после сканирования карты сотрудником.")
    default: card?.rewardAvailable == true
      ? t("Obsługa potwierdza odbiór, a karta zaczyna kolejną rundę.", "Staff confirm redemption, then your card starts a new round.", "Сотрудник подтверждает получение, и карта начинает новый круг.")
      : t("Naciśnij przycisk, żeby zasymulować skan obsługi i dodać jedną pieczątkę.", "Tap below to simulate a staff scan and add one stamp.", "Нажмите кнопку, чтобы имитировать сканирование и добавить одну отметку.")
    }
  }

  private var demoScannerArt: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 24).fill(.white)
      if demoStage == .redeemed || demoStage == .stamped || card?.rewardAvailable == true {
        VStack(spacing: 12) {
          Image(systemName: demoStage == .redeemed ? "checkmark.seal.fill" : card?.rewardAvailable == true ? "gift.fill" : "checkmark.circle.fill")
            .font(.system(size: 60, weight: .medium))
            .foregroundStyle(palette.primary)
          if demoStage != .redeemed, let card {
            Text("\(card.stamps) / \(card.goal)").font(.title2.weight(.semibold)).monospacedDigit()
          }
        }
        .transition(.scale(scale: reduceMotion ? 1 : 0.92).combined(with: .opacity))
      } else if let card, let image = CheckoutQR.image(card.checkout) {
        Image(uiImage: image).interpolation(.none).resizable().scaledToFit()
          .frame(width: 132, height: 132)
          .padding(12)
          .background(.white)
        RoundedRectangle(cornerRadius: 12)
          .strokeBorder(palette.primary.opacity(0.4), lineWidth: 2)
          .frame(width: 172, height: 172)
        if demoStage == .scanning && !reduceMotion {
          Rectangle().fill(palette.primary).frame(width: 156, height: 2)
            .offset(y: 60)
            .transition(.offset(y: -120).combined(with: .opacity))
        }
      }
    }
    .frame(maxWidth: .infinity, minHeight: 224, maxHeight: 224)
    .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(palette.ink.opacity(0.09)))
    .accessibilityHidden(true)
    .animation(reduceMotion ? nil : .easeInOut(duration: 0.36), value: demoStage)
  }

  @ViewBuilder private var demoAction: some View {
    if demoStage == .redeemed {
      VenueNativeButton(title: t("Wróć do karty", "Back to my card", "Вернуться к карте"), systemImage: "arrow.right", palette: palette) {
        demoPresented = false
      }
    } else if card?.rewardAvailable == true {
      VenueNativeButton(title: t("Odbierz nagrodę", "Redeem reward", "Получить награду"), systemImage: "gift", palette: palette) { confirmRedeem = true }
    } else {
      VenueNativeButton(
        title: demoStage == .scanning ? t("Skanowanie…", "Scanning…", "Сканирование…") : demoStage == .stamped ? t("Zasymuluj kolejny skan", "Simulate another scan", "Повторить сканирование") : t("Zasymuluj skan", "Simulate a scan", "Имитировать сканирование"),
        systemImage: "viewfinder", palette: palette, action: scanDemo
      ).disabled(demoStage == .scanning)
    }
  }

  @MainActor private func refresh() async {
    guard !creating else { return }
    if demo != nil {
      demoLedger = VenueDemoLoyalty.load(namespace: demoNamespace)
      applyDemoCard()
      failed = false
      ready = true
      return
    }
    do {
      let found = try await api.card()
      guard !Task.isCancelled, !creating else { return }
      if let card, let found, found.stamps > card.stamps { cardMotion += 1 }
      if found != card { card = found }
      failed = false
    } catch {
      if !Task.isCancelled { failed = true }
    }
    if !Task.isCancelled { ready = true }
  }

  @MainActor private func createCard() async {
    guard !creating else { return }
    if demo != nil {
      demoLedger.create()
      saveDemoCard()
      cardMotion += 1
      return
    }
    creating = true
    defer { creating = false }
    do {
      guard let created = try await api.card(create: true) else { throw URLError(.badServerResponse) }
      card = created
      cardMotion += 1
      failed = false
    } catch { failed = true }
  }

  @MainActor private func scanDemo() {
    guard demo != nil, demoStage != .scanning, demoLedger.created, !demoLedger.rewardAvailable else { return }
    demoStage = .scanning
    let scanID = UUID()
    demoScanTask = Task { @MainActor in
      do { try await Task.sleep(for: .milliseconds(680)) } catch { return }
      guard !Task.isCancelled, demoPresented, scenePhase == .active, demoLedger.scan(scanID) else { return }
      withAnimation(reduceMotion ? nil : .easeOut(duration: 0.32)) {
        saveDemoCard()
        demoStage = .stamped
        cardMotion += 1
      }
      demoScanTask = nil
    }
  }

  @MainActor private func cancelDemoScan() {
    demoScanTask?.cancel()
    demoScanTask = nil
    if demoStage == .scanning { demoStage = .ready }
  }

  @MainActor private func redeemDemo() {
    guard demo != nil, demoLedger.redeem() else { return }
    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.32)) {
      saveDemoCard()
      demoStage = .redeemed
      cardMotion += 1
    }
  }

  @MainActor private func resetDemo() {
    guard demo != nil else { return }
    cancelDemoScan()
    demoLedger = VenueDemoLoyalty()
    saveDemoCard()
    demoPresented = false
  }

  @MainActor private func saveDemoCard() {
    demoLedger.save(namespace: demoNamespace)
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

  @MainActor private func prepareWallet() async {
    guard !walletBusy else { return }
    walletBusy = true
    defer { walletBusy = false }
    do {
      let data: Data
      if let demo {
        guard let demoPass = demo.walletPassData(stamps: card?.stamps ?? 0) else { throw URLError(.fileDoesNotExist) }
        data = demoPass
      } else {
        data = try await api.applePass(language: language)
      }
      let pass = try PKPass(data: data)
      guard let controller = PKAddPassesViewController(pass: pass) else { throw URLError(.cannotDecodeContentData) }
      wallet = NativeWalletPass(controller: controller)
    } catch { walletFailed = true }
  }
}

private enum CheckoutQR {
  static let context = CIContext()

  static func image(_ checkout: String) -> UIImage? {
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(checkout.utf8)
    filter.correctionLevel = "M"
    guard let output = filter.outputImage?.transformed(by: .init(scaleX: 12, y: 12)),
      let bitmap = context.createCGImage(output, from: output.extent)
    else { return nil }
    return UIImage(cgImage: bitmap)
  }
}

private struct NativeWalletPass: Identifiable {
  let id = UUID()
  let controller: PKAddPassesViewController
}

private struct WalletAddButton: UIViewRepresentable {
  let action: () -> Void

  func makeUIView(context: Context) -> PKAddPassButton {
    let button = PKAddPassButton(addPassButtonStyle: .black)
    button.addAction(UIAction { _ in context.coordinator.action() }, for: .touchUpInside)
    return button
  }
  func updateUIView(_ view: PKAddPassButton, context: Context) { context.coordinator.action = action }
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
  @State private var revealed = false
  @State private var copied = false
  @State private var copyCount = 0

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack(spacing: 12) {
          VenueActionArt(kind: .wifi, theme: palette.motionTheme, animated: true)
            .frame(width: 48, height: 48)
          Text(t("Wi-Fi dla gości", "Guest Wi-Fi", "Гостевой Wi-Fi"))
            .font(palette.display(.largeTitle))
            .accessibilityAddTraits(.isHeader)
        }
        if let details {
          VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
              Text(t("Sieć", "Network", "Сеть")).font(.caption).foregroundStyle(palette.muted)
              Text(details.ssid).font(.headline).textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
              if isDemo {
                Text(t("Sieć testowa do demonstracji", "Test network for this demo", "Тестовая сеть для демонстрации"))
                  .font(.caption).foregroundStyle(palette.muted)
              }
            }
            if let password = details.password {
              Rectangle().fill(palette.ink.opacity(0.09)).frame(height: 1)
              VStack(alignment: .leading, spacing: 8) {
                Text(t("Hasło", "Password", "Пароль")).font(.caption).foregroundStyle(palette.muted)
                Text(revealed ? password : "••••••••••••")
                  .font(.body.monospaced()).textSelection(.enabled)
                  .fixedSize(horizontal: false, vertical: true)
                  .accessibilityLabel(revealed ? password : t("Hasło ukryte", "Password hidden", "Пароль скрыт"))
                HStack(spacing: 16) {
                  Button { revealed.toggle() } label: {
                    Label(revealed ? t("Ukryj", "Hide", "Скрыть") : t("Pokaż", "Show", "Показать"), systemImage: revealed ? "eye.slash" : "eye")
                      .font(.subheadline.weight(.medium)).frame(minHeight: 44)
                  }
                  Button {
                    UIPasteboard.general.setItems([["public.utf8-plain-text": password]], options: [
                      .localOnly: true, .expirationDate: Date().addingTimeInterval(60)
                    ])
                    copied = true
                    copyCount += 1
                  } label: {
                    Label(copied ? t("Skopiowano", "Copied", "Скопировано") : t("Kopiuj", "Copy", "Копировать"), systemImage: copied ? "checkmark" : "doc.on.doc")
                      .font(.subheadline.weight(.medium)).frame(minHeight: 44)
                  }
                  .accessibilityLabel(t("Kopiuj hasło", "Copy password", "Скопировать пароль"))
                }
                .buttonStyle(.plain)
              }
            }
          }
          .padding(20)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(.white, in: .rect(cornerRadius: 20))
          .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(palette.ink.opacity(0.09)))
          if failed {
            Text(t("Wybierz tę sieć w ustawieniach Wi-Fi.", "Choose this network in Wi-Fi settings.", "Выберите эту сеть в настройках Wi-Fi."))
              .font(.subheadline).foregroundStyle(palette.muted)
          }
        } else {
          Text(t("Zapytaj obsługę o dostęp do sieci.", "Ask staff for the Wi-Fi details.", "Уточните данные Wi-Fi у сотрудников."))
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
    .task(id: copyCount) {
      guard copied else { return }
      do { try await Task.sleep(for: .seconds(2)) } catch { return }
      copied = false
    }
  }
}
