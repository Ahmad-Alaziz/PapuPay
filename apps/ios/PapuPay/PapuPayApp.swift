import SwiftUI

@main struct PapuPayApp: App {
  @StateObject private var store = PapuStore()
  var body: some Scene { WindowGroup { RootView().environmentObject(store) } }
}
