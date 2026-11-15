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

struct VenueActionArt: View {
  enum Kind: String {
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
        try await Task.sleep(for: .milliseconds(kind.duration))
        rive = nil
      } catch {
        if !Task.isCancelled { rive = nil }
      }
    }
  }
}
