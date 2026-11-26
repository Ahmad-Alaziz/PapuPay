import SwiftUI

import class RiveRuntime.File
import struct RiveRuntime.NumberProperty
import class RiveRuntime.Rive
import struct RiveRuntime.RiveUIViewRepresentable
import class RiveRuntime.Worker

struct SweetoTastingChoice: Identifiable {
  let id: String
  let title: String
  let description: String

  func flavour(in language: SweetoLanguage) -> String {
    switch id {
    case "menu-matylda": language.text("Czekoladowe", "Chocolatey", "Шоколад")
    case "menu-san-sebastian": language.text("Kremowe", "Creamy", "Сливки")
    case "menu-crunch-bowl": language.text("Chrupiące", "Crunchy", "Хруст")
    case "menu-forest-cloud": language.text("Owocowe", "Fruity", "Ягоды")
    default: title
    }
  }
}

@MainActor private enum TastingArtwork {
  static let file = Task {
    let worker = try await Worker()
    return try await File(source: .local("sweeto-tasting-dial", Bundle.main), worker: worker)
  }
  static let turn = NumberProperty(path: "Turn")
  static let press = NumberProperty(path: "Press")
}

struct SweetoTastingDial: View {
  let language: SweetoLanguage
  let palette: VenueGuestPalette
  let choices: [SweetoTastingChoice]
  let add: (String) -> Bool

  @Environment(\.dismiss) private var dismiss
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.scenePhase) private var scenePhase
  @State private var selected = 0
  @State private var angle = 0.0
  @State private var anchor: Double?
  @State private var dragTravel = 0.0
  @State private var dragPoint = 0.0
  @State private var player: Rive?
  @State private var settling: Task<Void, Never>?
  @State private var isAdding = false
  @State private var showPortionLimit = false

  private var choice: SweetoTastingChoice { choices[selected] }
  private var step: Double { 360 / Double(choices.count) }
  private var canMove: Bool { !reduceMotion && scenePhase == .active }

  var body: some View {
    ScrollViewReader { scroll in
      ScrollView {
        VStack(spacing: 17) {
          heading
          if typeSize.isAccessibilitySize {
            recommendationTitle.id("recommendation")
            tasteOptions
            recommendationDescription
          } else {
            turntable
            tasteOptions
            recommendation
          }
        }
        .padding(.horizontal, 22)
        .padding(.top, typeSize.isAccessibilitySize ? 4 : 22)
        .padding(.bottom, 18)
        .frame(maxWidth: 480)
        .frame(maxWidth: .infinity)
      }
      .scrollBounceBehavior(.basedOnSize)
      .onChange(of: selected) { _, _ in
        if typeSize.isAccessibilitySize { scroll.scrollTo("recommendation", anchor: .top) }
      }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      Button(action: addRecommendation) {
        Label(typeSize.isAccessibilitySize && !isAdding
                ? t("Do listy", "Add to list", "В список") : addLabel,
              systemImage: isAdding ? "checkmark" : "plus")
          .font(.body.weight(.bold))
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: 436, minHeight: 52)
          .padding(.vertical, 3)
          .foregroundStyle(isAdding ? palette.frosting : palette.ink)
          .background(isAdding ? palette.forest : palette.primary, in: .rect(cornerRadius: 13))
          .overlay(alignment: .trailing) {
            if isAdding && !typeSize.isAccessibilitySize {
              GuestPerforation(color: palette.frosting.opacity(0.52), vertical: true,
                               cutout: palette.paper, notchRadius: 2.5)
                .padding(.trailing, 22)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }
          }
          .contentShape(.rect(cornerRadius: 13))
      }
      .buttonStyle(.plain)
      .accessibilityLabel(addLabel)
      .accessibilityValue(choice.title)
      .disabled(isAdding)
      .padding(.horizontal, 22)
      .padding(.vertical, 10)
      .frame(maxWidth: .infinity)
      .background(palette.paper)
    }
    .safeAreaInset(edge: .top, spacing: 0) {
      if typeSize.isAccessibilitySize {
        closeButton
          .frame(maxWidth: .infinity, alignment: .trailing)
          .padding(.horizontal, 22)
          .padding(.top, 12)
          .background(palette.paper)
      }
    }
    .background(palette.paper.ignoresSafeArea())
    .foregroundStyle(palette.ink)
    .presentationBackground(palette.paper)
    .presentationDetents(typeSize >= .xxLarge ? [.large] : [.height(647), .large])
    .presentationDragIndicator(.visible)
    .accessibilityAction(.escape) { dismiss() }
    .alert(t("Limit porcji", "Portion limit reached", "Достигнут лимит порций"), isPresented: $showPortionLimit) {
      Button("OK", role: .cancel) {}
    } message: {
      let limit = SweetoCounterDraft.quantityLimit
      Text(t("Do listy możesz dodać do \(limit) porcji jednego deseru.", "You can add up to \(limit) portions of each dessert.", "В список можно добавить до \(limit) порций каждого десерта."))
    }
    .sensoryFeedback(.selection, trigger: selected)
    .sensoryFeedback(.success, trigger: isAdding)
    .task(id: canMove && !typeSize.isAccessibilitySize) {
      guard canMove, !typeSize.isAccessibilitySize else { player = nil; return }
      if let file = try? await TastingArtwork.file.value,
         let artboard = try? await file.createArtboard("Sweeto Tasting Dial"),
         let prepared = try? await Rive(file: file, artboard: artboard),
         let values = prepared.viewModelInstance, !Task.isCancelled {
        values.setValue(of: TastingArtwork.turn, to: Float(angle))
        values.setValue(of: TastingArtwork.press, to: 100)
        player = prepared
      }
    }
    .onDisappear { settling?.cancel() }
  }

  @ViewBuilder private var heading: some View {
    if typeSize.isAccessibilitySize {
      headingCopy
    } else {
      HStack(alignment: .top, spacing: 12) {
        headingCopy
        closeButton
      }
    }
  }

  private var headingCopy: some View {
    VStack(alignment: .leading, spacing: 5) {
      Text(t("Dobierz deser", "Find your dessert", "Выберите десерт"))
        .font(palette.display(.title))
        .accessibilityAddTraits(.isHeader)
      Text(typeSize.isAccessibilitySize || reduceMotion
           ? t("Wybierz smak.", "Pick a flavour.", "Выберите вкус.")
           : t("Przekręć talerzyk lub wybierz smak.", "Turn the plate or pick a flavour.", "Поверните тарелку или выберите вкус."))
        .font(.subheadline)
        .foregroundStyle(palette.muted)
    }
    .fixedSize(horizontal: false, vertical: true)
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var closeButton: some View {
    Button { dismiss() } label: {
      Image(systemName: "xmark")
        .font(.system(size: 15, weight: .semibold))
        .frame(width: 44, height: 44)
        .background(palette.surface, in: .circle)
        .overlay { Circle().strokeBorder(palette.line) }
    }
    .buttonStyle(.plain)
    .accessibilityLabel(t("Zamknij", "Close", "Закрыть"))
  }

  private var turntable: some View {
    GeometryReader { proxy in
      let size = proxy.size.width
      ZStack {
        if let player, canMove {
          RiveUIViewRepresentable(rive: player)
            .frameRate(.fps(60))
            .paused(false)
        } else {
          TastingPlate()
            .rotationEffect(.degrees(canMove ? angle : 0))
        }

        ForEach(choices.indices, id: \.self) { index in
          Image(choices[index].id)
            .resizable()
            .scaledToFill()
            .frame(width: size * 0.718, height: size * 0.718)
            .clipShape(Circle())
            .opacity(selected == index ? 1 : 0)
        }
        Circle()
          .strokeBorder(.white.opacity(0.65), lineWidth: 1.5)
          .frame(width: size * 0.718, height: size * 0.718)
        Image(systemName: "triangle.fill")
          .font(.system(size: 11, weight: .bold))
          .rotationEffect(.degrees(180))
          .foregroundStyle(palette.ink)
          .offset(y: -size * 0.477)
      }
      .shadow(color: palette.ink.opacity(0.13), radius: 11, y: 7)
      .contentShape(.circle)
      .gesture(
        DragGesture(minimumDistance: 7)
          .onChanged { drag in
            let centre = size / 2
            if anchor == nil {
              let x = drag.startLocation.x - centre, y = drag.startLocation.y - centre
              guard hypot(x, y) >= size * 0.23 else { return }
              settling?.cancel()
              anchor = angle
              dragTravel = 0
              dragPoint = atan2(y, x) * 180 / .pi
            }
            let position = atan2(drag.location.y - centre, drag.location.x - centre) * 180 / .pi
            dragTravel += shortTurn(position - dragPoint)
            dragPoint = position
            setAngle((anchor ?? angle) + dragTravel, press: 97)
            showTaste(index(at: angle))
          }
          .onEnded { _ in
            guard anchor != nil else { return }
            anchor = nil
            focus(index(at: angle))
          },
        including: canMove && !isAdding ? .all : .none
      )
    }
    .frame(width: 232, height: 232)
    .padding(.vertical, 3)
    .accessibilityHidden(true)
  }

  private var tasteOptions: some View {
    let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: typeSize.isAccessibilitySize ? 1 : 2)
    return LazyVGrid(columns: columns, spacing: 8) {
      ForEach(choices.indices, id: \.self) { index in
        Button { focus(index) } label: {
          HStack(spacing: 7) {
            Image(systemName: selected == index ? "checkmark.circle.fill" : "circle")
              .font(.system(size: 16, weight: .medium))
              .accessibilityHidden(true)
            Text(choices[index].flavour(in: language))
              .font(.subheadline.weight(.semibold))
              .multilineTextAlignment(.leading)
              .fixedSize(horizontal: false, vertical: true)
          }
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
          .background(selected == index ? palette.peach : palette.surface, in: .rect(cornerRadius: 10))
          .overlay {
            RoundedRectangle(cornerRadius: 10)
              .strokeBorder(selected == index ? palette.ink.opacity(0.42) : palette.line)
          }
          .contentShape(.rect(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected == index ? .isSelected : [])
        .accessibilityHint(choices[index].title)
      }
    }
  }

  private var recommendation: some View {
    VStack(alignment: .leading, spacing: 5) {
      recommendationTitle
      recommendationDescription
    }
  }

  private var recommendationTitle: some View {
    Text(choice.title)
      .font(typeSize.isAccessibilitySize ? .subheadline.weight(.bold) : palette.display(.title2))
      .accessibilityAddTraits(.isHeader)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var recommendationDescription: some View {
    Text(choice.description)
      .font(.subheadline)
      .foregroundStyle(palette.muted)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var addLabel: String {
    isAdding ? t("Dodano do listy", "Added to my list", "Добавлено в список")
      : t("Dodaj do listy", "Add to my list", "Добавить в список")
  }

  private func addRecommendation() {
    guard !isAdding else { return }
    guard add(choice.id) else {
      showPortionLimit = true
      return
    }
    withAnimation(canMove ? .easeOut(duration: 0.12) : nil) { isAdding = true }
    guard canMove && !typeSize.isAccessibilitySize else { dismiss(); return }
    settling?.cancel()
    setAngle(angle, press: 91)
    settling = Task { @MainActor in
      do {
        try await Task.sleep(for: .milliseconds(95))
        setAngle(angle, press: 100)
        try await Task.sleep(for: .milliseconds(185))
        dismiss()
      } catch {}
    }
  }

  private func index(at angle: Double) -> Int {
    let count = choices.count
    return (Int((-angle / step).rounded()) % count + count) % count
  }

  private func shortTurn(_ degrees: Double) -> Double {
    let normal = degrees.truncatingRemainder(dividingBy: 360)
    if normal > 180 { return normal - 360 }
    if normal < -180 { return normal + 360 }
    return normal
  }

  private func showTaste(_ index: Int) {
    guard index != selected else { return }
    withAnimation(canMove ? .easeOut(duration: 0.18) : nil) { selected = index }
  }

  private func focus(_ index: Int) {
    guard !isAdding else { return }
    settling?.cancel()
    showTaste(index)
    let start = angle
    let travel = shortTurn(-Double(index) * step - start)
    guard canMove else { setAngle(start + travel); return }
    settling = Task { @MainActor in
      let clock = ContinuousClock()
      let began = clock.now
      while !Task.isCancelled {
        let elapsed = began.duration(to: clock.now).components
        let progress = min(1, (Double(elapsed.seconds) + Double(elapsed.attoseconds) / 1e18) / 0.30)
        let eased = 1 - pow(1 - progress, 3)
        setAngle(start + travel * eased, press: 100 - 3 * sin(progress * .pi))
        if progress == 1 { return }
        try? await Task.sleep(for: .milliseconds(16))
      }
    }
  }

  private func setAngle(_ value: Double, press: Double = 100) {
    angle = value
    player?.viewModelInstance?.setValue(of: TastingArtwork.turn, to: Float(value))
    player?.viewModelInstance?.setValue(of: TastingArtwork.press, to: Float(press))
  }

  private func t(_ pl: String, _ en: String, _ ru: String) -> String { language.text(pl, en, ru) }
}

struct SweetoTastingThumbnail: View {
  var body: some View {
    GeometryReader { proxy in
      ZStack {
        TastingPlate()
        Image("menu-matylda")
          .resizable()
          .scaledToFill()
          .frame(width: proxy.size.width * 0.72, height: proxy.size.height * 0.72)
          .clipShape(Circle())
      }
    }
  }
}

/// A static plate for reduced motion or while the small Rive file prepares.
private struct TastingPlate: View {
  var body: some View {
    Canvas { context, size in
      let centre = CGPoint(x: size.width / 2, y: size.height / 2)
      func point(_ radius: Double, _ angle: Double) -> CGPoint {
        CGPoint(x: centre.x + cos(angle) * radius * size.width / 280,
                y: centre.y + sin(angle) * radius * size.height / 280)
      }
      func scallops(_ radius: Double, depth: Double) -> Path {
        Path { path in
          let step = Double.pi * 2 / 36
          path.move(to: point(radius - depth, -.pi / 2))
          for index in 0..<36 {
            let angle = Double(index) * step - .pi / 2
            path.addCurve(to: point(radius - depth, angle + step),
                          control1: point(radius + depth * 0.68, angle + step * 0.28),
                          control2: point(radius + depth * 0.68, angle + step * 0.72))
          }
          path.closeSubpath()
        }
      }
      let edge = scallops(134, depth: 3.8)
      let paper = scallops(126, depth: 2.1)
      context.fill(edge, with: .color(Color(hex: "E3C395")))
      context.stroke(edge, with: .color(Color(hex: "74492E")), lineWidth: 1)
      context.fill(paper, with: .color(Color(hex: "FFF3D6")))
      context.stroke(paper, with: .color(Color(hex: "A16F47")), lineWidth: 1)
      let ticks = Path { path in
        for index in 0..<48 {
          let angle = Double(index) * .pi / 24 - .pi / 2
          path.move(to: point(index.isMultiple(of: 6) ? 102 : 107, angle))
          path.addLine(to: point(113, angle))
        }
      }
      context.stroke(ticks, with: .color(Color(hex: "AB7A55")), lineWidth: 1.25)
    }
  }
}
