import SwiftUI
import UIKit

import class RiveRuntime.File
import class RiveRuntime.Rive
import struct RiveRuntime.RiveUIViewRepresentable
import class RiveRuntime.Worker

@MainActor private enum VenueMotionSource {
  static let file = Task {
    let worker = try await Worker()
    return try await File(source: .local("sweeto-actions", Bundle.main), worker: worker)
  }
}

@MainActor enum SweetoStampMotionSource {
  fileprivate static let poster = UIImage(named: "sweeto-pass-settled")
  fileprivate static let rewardPoster = UIImage(named: "sweeto-reward-foil")
  fileprivate static let rewardFrames = UIImage(named: "sweeto-reward-foil-strip")
  fileprivate static let file = Task {
    let worker = try await Worker()
    return try await File(source: .local("sweeto-pass", Bundle.main), worker: worker)
  }
  static func prepare() async {
    guard Bundle.main.url(forResource: "sweeto-pass", withExtension: "riv") != nil else { return }
    _ = try? await file.value
  }

  fileprivate static func freshImprint() async throws -> Rive {
    let source = try await file.value
    let artboard = try await source.createArtboard("SweetoPass")
    let machine = try await artboard.createStateMachine("State Machine 1")
    return try await Rive(file: source, artboard: artboard, stateMachine: machine, dataBind: .none)
  }
}

struct PapuLaunchHandoff: View {
  @State private var moving = false

  var body: some View {
    ZStack {
      Color("GuestLaunchPaper")
      Image("PapuPayLaunchLockup")
        .resizable()
        .scaledToFit()
        .frame(width: 180, height: 44)
        .scaleEffect(moving ? 1.07 : 1)
        .offset(y: moving ? -5 : 0)
    }
    .ignoresSafeArea()
    .allowsHitTesting(false)
    .accessibilityHidden(true)
    .onAppear {
      withAnimation(.easeOut(duration: 0.34)) { moving = true }
    }
  }
}

/// The same bundled artwork has independent welcome and loyalty timelines.
/// Preparing this decoration never delays the venue content.
@MainActor @Observable final class PapuGuestArrival {
  private(set) var player: Rive?
  private(set) var docked = false
  @ObservationIgnored private var consumed = false

  func finish() {
    consumed = true
    player = nil
    docked = false
  }

  func play() async {
    guard !consumed else { return }
    consumed = true
    let deadline = ContinuousClock.now.advanced(by: .milliseconds(850))
    do {
      let file = try await SweetoStampMotionSource.file.value
      let artboard = try await file.createArtboard("SweetoPass")
      let machine = try await artboard.createStateMachine("PapuPay Welcome")
      let welcome = try await Rive(file: file, artboard: artboard, stateMachine: machine, dataBind: .none)
      try Task.checkCancellation()
      guard ContinuousClock.now < deadline else { return }
      player = welcome
      try await Task.sleep(for: .milliseconds(720))
      withAnimation(.easeInOut(duration: 0.28)) { docked = true }
      try await Task.sleep(for: .milliseconds(300))
    } catch {}
    finish()
  }
}

struct PapuGuestArrivalMark: View {
  let welcome: PapuGuestArrival
  var body: some View {
    if let player = welcome.player {
      RiveUIViewRepresentable(rive: player)
        .frameRate(.fps(60)).paused(false)
        .frame(width: 20, height: 20)
        .scaleEffect(welcome.docked ? 1 : 2.45)
        .offset(x: welcome.docked ? 0 : -5, y: welcome.docked ? 0 : -27)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
  }
}

/// Owned by the confirmed receipt so a remounted row cannot start the same stamp a second time.
@MainActor @Observable final class SweetoStampPlayback {
  fileprivate enum Phase {
    case waiting
    case playing(Rive, Date)
    case pressing(Date)
    case foiling(Date)
    case settled
  }

  fileprivate private(set) var phase = Phase.waiting
  private let celebratesReward: Bool

  init(celebratesReward: Bool) { self.celebratesReward = celebratesReward }

  func settle() { phase = .settled }

  fileprivate func finishVisibleImprint() {
    switch phase {
    case .playing, .pressing, .foiling: settle()
    case .waiting, .settled: break
    }
  }

  fileprivate func play() async {
    guard case .waiting = phase else { return }
    // Instantiate a fresh timeline for this visible slot. A renderer held
    // offscreen since a previous visit can present its final pose on attach.
    var prepared: Rive?
    let preparation = Task { @MainActor in prepared = try? await SweetoStampMotionSource.freshImprint() }
    defer { preparation.cancel() }
    // The slot can mount well after the server responds on a cold launch.
    // Give its guide a visible beat before choosing the rendering path once.
    do { try await Task.sleep(for: .milliseconds(240)) } catch { return }
    guard !Task.isCancelled, case .waiting = phase else { return }
    let duration: Duration
    if let player = prepared {
      phase = .playing(player, Date())
      duration = .milliseconds(720)
    } else {
      phase = .pressing(Date())
      duration = .milliseconds(560)
    }
    try? await Task.sleep(for: duration)
    if !Task.isCancelled, celebratesReward, SweetoStampMotionSource.rewardFrames != nil {
      if case .settled = phase { return }
      phase = .foiling(Date())
      try? await Task.sleep(for: .milliseconds(650))
    }
    settle()
  }
}

struct SweetoStampImprint<Still: View>: View {
  let playback: SweetoStampPlayback?
  let guideInk: Color
  let isReward: Bool
  @ViewBuilder let still: () -> Still
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase

  private var canAnimate: Bool { !reduceMotion && scenePhase == .active }

  var body: some View {
    ZStack {
      if canAnimate, let playback {
        switch playback.phase {
        case .waiting: guide
        case .playing(let player, let start):
          TimelineView(.animation(minimumInterval: 1 / 60)) { tick in
            let contact = min(1, max(0, tick.date.timeIntervalSince(start) / 0.22))
            ZStack {
              guide.opacity(1 - contact)
              RiveUIViewRepresentable(rive: player).frameRate(.fps(60)).paused(false)
                .offset(y: -4 * (1 - contact))
                .opacity(contact)
            }
          }
        case .pressing(let start):
          guide
          TimelineView(.animation(minimumInterval: 1 / 60)) { tick in
            let elapsed = max(0, tick.date.timeIntervalSince(start))
            let descent = min(1, elapsed / 0.21)
            let release = min(1, max(0, elapsed - 0.21) / 0.32)
            let ease = 1 - pow(1 - release, 3)
            seal
              .scaleEffect(x: 1 + 0.12 * (1 - ease), y: 1.12 - 0.24 * descent + 0.12 * ease)
              .rotationEffect(.degrees(-8 * (1 - descent)))
              .offset(y: -8 * (1 - descent * descent))
              .opacity(min(1, descent * 1.25))
          }
        case .foiling(let start):
          seal
          if let frames = SweetoStampMotionSource.rewardFrames {
            TimelineView(.animation(minimumInterval: 0.039)) { tick in
              let progress = min(1, max(0, tick.date.timeIntervalSince(start) / 0.65))
              let index = min(16, Int(progress * 17))
              GeometryReader { proxy in
                Image(uiImage: frames).resizable().interpolation(.high)
                  .frame(width: proxy.size.width * 17, height: proxy.size.height)
                  .offset(x: -CGFloat(index) * proxy.size.width)
              }
              .clipped().scaleEffect(1.15)
            }
          }
        case .settled: finishedSeal
        }
      } else {
        finishedSeal
      }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
    .task(id: playback.map(ObjectIdentifier.init)) {
      guard let playback else { return }
      if canAnimate { await playback.play() } else { playback.settle() }
    }
    .onChange(of: canAnimate) { _, enabled in
      if !enabled { playback?.settle() }
    }
    .onDisappear { playback?.finishVisibleImprint() }
  }

  private var guide: some View {
    Circle().strokeBorder(guideInk.opacity(0.64), style: StrokeStyle(lineWidth: 1, dash: [2, 3]))
  }

  @ViewBuilder private var seal: some View {
    if let poster = SweetoStampMotionSource.poster {
      Image(uiImage: poster).resizable().interpolation(.high).scaledToFit()
    } else { still() }
  }

  private var finishedSeal: some View {
    ZStack {
      seal
      if isReward {
        if let poster = SweetoStampMotionSource.rewardPoster {
          Image(uiImage: poster).resizable().interpolation(.high).scaledToFit().scaleEffect(1.15)
        } else {
          Circle().strokeBorder(guideInk.opacity(0.76), lineWidth: 1).scaleEffect(1.07)
        }
      }
    }
  }
}

struct VenueActionArt: View {
  enum Kind: String, Hashable {
    case menu, loyalty, review, wifi

    var artboard: String { "Sweeto" + rawValue.capitalized }
    var symbol: String {
      switch self {
      case .menu: "fork.knife"
      case .loyalty: "creditcard"
      case .review: "star"
      case .wifi: "wifi"
      }
    }
    var duration: Int {
      switch self {
      case .menu, .wifi: 717
      case .loyalty: 834
      case .review: 784
      }
    }
  }

  let kind: Kind
  let theme: String
  var animated = false
  var replay = 0
  var onPlaybackFinished: (() -> Void)?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var scenePhase
  @State private var rive: Rive?

  private var instanceName: String { ["berry", "forest"].contains(theme) ? theme : "sweeto" }
  private var poster: UIImage? {
    let prefix = instanceName == "sweeto" ? "motion" : "motion-\(instanceName)"
    guard let path = Bundle.main.path(forResource: "\(prefix)-\(kind.rawValue)", ofType: "webp") else { return nil }
    return UIImage(contentsOfFile: path)
  }
  private var shouldPlay: Bool { animated && !reduceMotion && scenePhase == .active }

  @MainActor static func prepare() async {
    _ = try? await VenueMotionSource.file.value
  }

  var body: some View {
    Group {
      if let rive, shouldPlay {
        RiveUIViewRepresentable(rive: rive).frameRate(.fps(60)).paused(false)
      } else if let poster {
        Image(uiImage: poster).resizable().scaledToFit()
      } else {
        Image(systemName: kind.symbol).font(.title2)
      }
    }
    .accessibilityHidden(true)
    .allowsHitTesting(false)
    .task(id: "\(shouldPlay)-\(instanceName)-\(kind.rawValue)-\(replay)") {
      rive = nil
      guard shouldPlay else { return }
      do {
        let file = try await VenueMotionSource.file.value
        let artboard = try await file.createArtboard(kind.artboard)
        let machine = try await artboard.createStateMachine("Gesture")
        let model = try await file.createViewModelInstance(.name(instanceName, from: .name("VenuePalette")))
        let player = try await Rive(file: file, artboard: artboard, stateMachine: machine, dataBind: .instance(model))
        guard !Task.isCancelled else { return }
        rive = player
        // Count the one-shot only after its player is ready, not while the
        // shared Rive file is still loading on the first mobile visit.
        try await Task.sleep(for: .milliseconds(kind.duration + 100))
        guard !Task.isCancelled else { return }
        rive = nil
        onPlaybackFinished?()
      } catch {
        if !Task.isCancelled {
          rive = nil
          onPlaybackFinished?()
        }
      }
    }
  }
}
