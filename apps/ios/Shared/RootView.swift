import SwiftUI

struct RootView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var showTour = false
  @State private var showTable = false
  @State private var showAbout = false
  var body: some View {
    TabView(selection: $store.selectedTab) {
      shell { DiscoverView(showTour: $showTour, showAbout: $showAbout) }.tabItem {
        Label(store.text("Odkrywaj", "Discover"), systemImage: "safari")
      }.tag(0)
      shell { HallMapView() }.tabItem {
        Label(store.text("Mapa hali", "Hall map"), systemImage: "map")
      }.tag(1)
      shell { OrdersView() }.tabItem {
        Label(store.text("Zamówienia", "Orders"), systemImage: "takeoutbag.and.cup.and.straw")
      }.badge(store.activeOrders.count).tag(2)
    }
    .tint(Papu.green).preferredColorScheme(.light)
    .sheet(isPresented: $store.showBasket) {
      BasketView().environmentObject(store).presentationDetents([.large]).presentationCornerRadius(
        30)
    }
    .sheet(isPresented: $showTour) {
      OnboardingView().environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
    .sheet(isPresented: $showTable) {
      TableView().environmentObject(store).presentationDetents([.height(460), .large])
        .presentationCornerRadius(30)
    }
    .sheet(isPresented: $showAbout) {
      AboutView().environmentObject(store).presentationDetents([.large]).presentationCornerRadius(
        30)
    }
    .overlay(alignment: .top) {
      if let toast = store.toast {
        HStack(spacing: 9) {
          Image(systemName: "checkmark.circle.fill").foregroundStyle(Papu.green)
          Text(toast).font(Papu.body(14).weight(.semibold))
        }.padding(14).papuGlass().padding(.top, 70).transition(
          .move(edge: .top).combined(with: .opacity)
        ).allowsHitTesting(false).accessibilityAddTraits(.updatesFrequently)
      }
    }
    .fullScreenCover(isPresented: $store.invocationError) {
      VStack(spacing: 22) {
        Image(systemName: "qrcode").font(.system(size: 46)).foregroundStyle(Papu.green)
        Text(store.text("Sprawdź kod na stoliku", "Check your table’s QR")).font(Papu.display(32))
          .multilineTextAlignment(.center)
        Text(
          store.text(
            "Ten link nie wskazuje obsługiwanej hali i stolika. Zeskanuj kod ponownie albo poproś obsługę o pomoc.",
            "This link doesn’t identify a supported food hall and table. Scan again or ask a member of staff."
          )
        )
        .font(Papu.body(16)).multilineTextAlignment(.center)
        Button(store.text("Otwórz demo: Koszyki, stolik 24", "Open demo: Koszyki, table 24")) {
          store.handle(URL(string: "https://papupay.com/go/koszyki/24")!)
        }.buttonStyle(.borderedProminent).tint(Papu.green)
      }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Papu.cream).foregroundStyle(Papu.ink).interactiveDismissDisabled()
    }
    .environment(\.locale, Locale(identifier: store.english ? "en_GB" : "pl_PL"))
    .environment(\.layoutDirection, .leftToRight)
    .onOpenURL { store.handle($0) }
    .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) {
      if let url = $0.webpageURL { store.handle(url) }
    }
    .onChange(of: scenePhase) { _, phase in
      if phase == .active {
        store.resumePendingActivity()
        store.refreshOrderStages()
      }
    }
  }
  private var brandButton: some View {
    Button { store.selectedTab = 0 } label: {
      BrandView(size: 26).fixedSize().padding(.leading, 4).padding(.vertical, 5)
    }.buttonStyle(.plain).accessibilityLabel("PapuPay")
  }
  private func shell<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    NavigationStack {
      content().background(Papu.cream).foregroundStyle(Papu.ink)
        .safeAreaInset(edge: .bottom, spacing: 0) {
          if store.count > 0 {
            BasketDock { store.showBasket = true }
          }
        }
        .toolbar {
          if #available(iOS 26.0, *) {
            ToolbarItem(placement: .topBarLeading) {
              brandButton
            }.sharedBackgroundVisibility(.hidden)
          } else {
            ToolbarItem(placement: .topBarLeading) { brandButton }
          }
          ToolbarItemGroup(placement: .topBarTrailing) {
            Button {
              store.english.toggle()
            } label: {
              Text(store.english ? "EN" : "PL").font(.system(size: 11, weight: .semibold))
            }.accessibilityLabel(store.text("Switch to English", "Zmień na polski"))
            Button {
              showTable = true
            } label: {
              HStack(spacing: 5) {
                Image(systemName: "qrcode")
                Text(store.table).fontWeight(.bold)
              }.font(.system(size: 13))
            }.accessibilityLabel(store.text("Stolik \(store.table)", "Table \(store.table)"))
          }
        }
        .animation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.85), value: store.count)
    }
  }
}

struct DiscoverView: View {
  @Environment(\.dynamicTypeSize) private var typeSize
  @EnvironmentObject var store: PapuStore
  @Binding var showTour: Bool
  @Binding var showAbout: Bool
  @State private var search = ""
  @State private var category = "all"
  @State private var selectedRestaurant: Restaurant?
  @State private var selectedDish: Dish?
  @State private var veggieOnly = false
  let categories: [(String, String, String, String)] = [
    ("all", "fork.knife", "Wszystko", "Everything"),
    ("burgers", "takeoutbag.and.cup.and.straw", "Burgery", "Burgers"),
    ("asian", "bowl", "Azja", "Asian"),
    ("pizza", "circle.lefthalf.filled", "Pizza i pasta", "Pizza & pasta"),
    ("street", "bolt", "Street food", "Street food"), ("veggie", "leaf", "Vege", "Veggie"),
    ("drinks", "waterbottle", "Napoje", "Drinks"),
    ("desserts", "birthday.cake", "Desery", "Desserts"),
  ]
  var filtered: [Restaurant] {
    store.catalog.restaurants.filter { r in
      (category == "all" || r.category == category)
        && (!veggieOnly
          || store.catalog.items.contains { $0.restaurantId == r.id && $0.vegetarian })
        && (search.isEmpty
          || "\(r.name) \(r.cuisine) \(r.cuisineEn) \(store.catalog.items.filter { $0.restaurantId == r.id }.map(\.name).joined(separator: " "))"
            .localizedCaseInsensitiveContains(search))
    }
  }
  var body: some View {
    GeometryReader { viewport in
      ScrollViewReader { reader in
        ScrollView {
          VStack(spacing: 0) {
            CravingSpotlight(
              showTour: $showTour,
              browse: { withAnimation(.smooth) { reader.scrollTo("restaurants", anchor: .top) } })
            VStack(alignment: .leading, spacing: 20) {
              Text(store.text("Co dziś jesz?", "What’s your craving?"))
                .font(Papu.display(32)).fixedSize(horizontal: false, vertical: true).id(
                  "restaurants")
              HStack(spacing: 10) {
                Image(systemName: "magnifyingglass").foregroundStyle(Papu.muted)
                TextField(
                  store.text(
                    "Restauracja, danie, zachcianka…", "Restaurant, dish, little craving…"),
                  text: $search
                ).font(Papu.body(15)).autocorrectionDisabled()
                if !search.isEmpty {
                  Button {
                    search = ""
                  } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(Papu.muted)
                  }.accessibilityLabel(store.text("Wyczyść", "Clear"))
                }
              }.padding(14).background(Color(hex: "F0F2E7"), in: RoundedRectangle(cornerRadius: 14))
              ScrollView(.horizontal) {
                HStack(spacing: 8) {
                  ForEach(categories, id: \.0) { c in
                    Button {
                      withAnimation(.snappy) { category = c.0 }
                    } label: {
                      Label(store.text(c.2, c.3), systemImage: c.1).font(
                        Papu.body(14).weight(.medium)
                      ).padding(.horizontal, 16).frame(minHeight: 48).foregroundStyle(
                        category == c.0 ? Papu.butter : Papu.ink
                      ).background(
                        category == c.0 ? Papu.ink : Color(hex: "FFFDF5"),
                        in: RoundedRectangle(cornerRadius: 14)
                      ).overlay(
                        RoundedRectangle(cornerRadius: 14).stroke(
                          category == c.0 ? Papu.ink : Papu.line, lineWidth: 1))
                    }.buttonStyle(PressStyle()).accessibilityAddTraits(
                      category == c.0 ? .isSelected : [])
                  }
                }
              }.scrollIndicators(.hidden).contentMargins(.trailing, 2)
              HStack {
                Text(
                  "\(filtered.count) "
                    + store.text("miejsc na coś pysznego", "places for something delicious")
                ).font(Papu.body(12))
                Spacer()
                Button {
                  withAnimation { veggieOnly.toggle() }
                } label: {
                  Image(systemName: "leaf").frame(width: 44, height: 44).foregroundStyle(
                    veggieOnly ? Papu.green : Papu.muted)
                }.accessibilityLabel(store.text("Opcje wege", "Vegetarian options"))

              }.foregroundStyle(Papu.muted)
              if filtered.isEmpty {
                VStack(spacing: 13) {
                  Image(systemName: "magnifyingglass").font(.largeTitle)
                  Text(
                    store.text("Tego smaku jeszcze nie znamy", "We haven’t found that flavour")
                  )
                  .font(Papu.display(28))
                  Button(store.text("Wyczyść filtry", "Clear filters")) {
                    search = ""
                    category = "all"
                    veggieOnly = false
                  }.font(Papu.body(16).bold())
                }.frame(maxWidth: .infinity).padding(.vertical, 40)
              }
              LazyVGrid(
                columns: Array(
                  repeating: GridItem(.flexible(), spacing: 16),
                  count: typeSize.isAccessibilitySize ? 1 : 2),
                spacing: 28
              ) {
                ForEach(filtered) { restaurant in
                  RestaurantCard(restaurant: restaurant) { selectedRestaurant = restaurant }
                }
              }
            }.padding(20).padding(.top, 12)
            gatherBanner.padding(.horizontal, 20).padding(.vertical, 16)
            VStack(alignment: .leading, spacing: 18) {
              Eyebrow(text: store.text("MIŁOŚĆ OD PIERWSZEGO KĘSA", "LOVE AT FIRST BITE"))
              Text(store.text("Małe zachcianki", "Little cravings")).font(Papu.display(34))
              ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 14) {
                  ForEach([
                    store.catalog.items[0], store.catalog.items[2], store.catalog.items[4],
                    store.catalog.items[8],
                  ]) { dish in SmallDishCard(dish: dish) { selectedDish = dish } }
                }
              }.scrollIndicators(.hidden)
            }.padding(20)
            ZStack(alignment: .leading) {
              Image("hall").resizable().scaledToFill().frame(height: 260).clipped()
              LinearGradient(
                colors: [Papu.ink.opacity(0.92), Papu.ink.opacity(0.3)], startPoint: .leading,
                endPoint: .trailing)
              VStack(alignment: .leading, spacing: 15) {
                Text("KOSZYKOWA 63 · WARSZAWA").font(.system(size: 11, weight: .bold)).tracking(1.5)
                Text(
                  store.text("Jedna hala\nCały świat smaków", "One hall\nA world of flavours")
                )
                .font(Papu.display(34))
                Button {
                  store.selectedTab = 1
                } label: {
                  Label(
                    store.text("Rozejrzyj się", "Take a look around"), systemImage: "arrow.up.right"
                  ).font(Papu.body(14).weight(.semibold)).padding(.horizontal, 18).padding(
                    .vertical, 12
                  ).background(Papu.butter, in: Capsule()).foregroundStyle(Papu.ink)
                }
              }.padding(25).foregroundStyle(Papu.butter)
            }.frame(height: 260).clipShape(RoundedRectangle(cornerRadius: 22)).padding(20)
            HStack {
              BrandView(size: 24)
              Spacer()
              Button(store.text("O wersji demo", "About this demo")) { showAbout = true }.font(
                Papu.body(13)
              ).foregroundStyle(Papu.muted)
            }.padding(20).padding(.bottom, 15)
          }.frame(width: viewport.size.width)
        }.scrollDismissesKeyboard(.interactively)
      }
    }
    .onChange(of: store.completedCheckoutID) { _, _ in
      selectedRestaurant = nil
      selectedDish = nil
    }
    .sheet(item: $selectedRestaurant) {
      RestaurantView(restaurant: $0).environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
    .sheet(item: $selectedDish) {
      DishView(dish: $0).environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
  }
  private var gatherBanner: some View {
    ZStack(alignment: .bottomTrailing) {
      Papu.orange.opacity(0.23)
      PapayaMark().frame(width: 90, height: 110).rotationEffect(.degrees(20)).offset(x: 13, y: 18)
        .opacity(0.8)
      VStack(alignment: .leading, spacing: 12) {
        Eyebrow(
          text: store.text("RÓŻNE APETYTY · WSPÓLNY STOLIK", "DIFFERENT CRAVINGS · SAME TABLE"))
        Text(
          store.text(
            "Ty ramen, ja burgera\nRazem? Idealnie", "You get ramen\nI get a burger · Perfect")
        ).font(Papu.display(30))
        Text(
          store.text(
            "Mieszaj kuchnie, jak lubisz.\nJedno zamówienie, więcej przyjemności.",
            "Mix your favourite kitchens.\nOne checkout, more happiness.")
        ).font(Papu.body(14)).foregroundStyle(Papu.muted)
        Button {
          showTour = true
        } label: {
          Image(systemName: "arrow.up.right").padding(11).background(Papu.butter, in: Circle())
        }.tint(Papu.ink)
      }.frame(maxWidth: .infinity, alignment: .leading).padding(24)
    }.clipShape(RoundedRectangle(cornerRadius: 22))
  }
}

struct RestaurantCard: View {
  @EnvironmentObject var store: PapuStore
  let restaurant: Restaurant
  var action: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      ZStack(alignment: .topTrailing) {
        Button(action: action) {
          GeometryReader { g in
            FoodPhoto(name: restaurant.image).frame(width: g.size.width, height: g.size.height)
              .clipped()
          }.frame(height: 151).overlay(alignment: .bottomLeading) {
            Text(store.text(restaurant.tag, restaurant.tagEn)).font(Papu.body(11).weight(.medium))
              .lineLimit(1).padding(.horizontal, 9).padding(.vertical, 6).background(
                Papu.butter.opacity(0.94), in: Capsule()
              ).padding(9)
          }.clipShape(RoundedRectangle(cornerRadius: 18))
        }.buttonStyle(PressStyle())

      }
      Button(action: action) {
        VStack(alignment: .leading, spacing: 5) {
          Text(restaurant.name).font(Papu.display(21)).tracking(-0.5).fixedSize(
            horizontal: false, vertical: true)
          Text(store.text(restaurant.cuisine, restaurant.cuisineEn)).font(Papu.body(12))
            .foregroundStyle(Papu.muted)
          HStack(spacing: 3) {
            Image(systemName: "clock")
            Text(store.text("Demo · 12 s", "Demo · 12 sec"))
            Spacer(minLength: 0)
            Text(store.text("Lokal ", "Unit ") + String(format: "%02d", restaurant.unit))
          }.font(.system(size: 11)).foregroundStyle(Papu.muted).padding(.top, 2)
        }.frame(maxWidth: .infinity, alignment: .leading)
      }.buttonStyle(.plain)
    }.accessibilityElement(children: .contain)
  }
}
struct SmallDishCard: View {
  @EnvironmentObject var store: PapuStore
  let dish: Dish
  var action: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 9) {
      Button(action: action) {
        FoodPhoto(name: dish.image).frame(width: 170, height: 145).clipped().clipShape(
          RoundedRectangle(cornerRadius: 13))
      }
      Eyebrow(text: store.catalog.restaurants.first { $0.id == dish.restaurantId }!.name)
      Button(action: action) {
        Text(store.text(dish.name, dish.nameEn)).font(Papu.display(22))
          .lineLimit(2, reservesSpace: true).multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      HStack {
        Text(money(dish.price, english: store.english)).font(Papu.body(14).bold())
        Spacer()
        QuickAddButton(dish: dish)
      }
    }.frame(width: 170).padding(12).papuCard()
  }
}


/// Three real Koszyki kitchens combine into one meal, without changing the cart.
private struct CravingSpotlight: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.scenePhase) private var phase
  @ScaledMetric(relativeTo: .body) private var introFontSize: CGFloat = 14
  @Binding var showTour: Bool
  var browse: () -> Void
  @State private var stage = 0
  @State private var visible = true
  @State private var autoplayFinished = false
  @State private var showCombo = false
  @State private var openBasketAfterReview = false
  private var animationActive: Bool {
    visible && phase == .active && store.selectedTab == 0 && !showCombo && !showTour
  }
  private var autoplayActive: Bool { animationActive && !reduceMotion && !autoplayFinished }
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 8) {
        Eyebrow(text: "HALA KOSZYKI")
        Spacer(minLength: 8)
        Label(store.text("Stolik ", "Table ") + store.table, systemImage: "checkmark.circle.fill")
          .font(Papu.body(12).weight(.semibold)).foregroundStyle(Papu.green)
      }
      VStack(alignment: .leading, spacing: 8) {
        VStack(alignment: .leading, spacing: 0) {
          Text(store.text("CAŁA HALA", "ONE FOOD HALL"))
          Text(store.text("JEDEN KOSZYK", "ONE BASKET")).foregroundStyle(Papu.accentText)
        }.font(Papu.poster(store.english ? 36 : 40))
          .lineLimit(typeSize.isAccessibilitySize ? nil : 1).minimumScaleFactor(0.75)
          .fixedSize(horizontal: false, vertical: true)
        Text(store.text(
          "Burger z ATOM, frytki z The Fry, lody z Na końcu tęczy. Trzy kuchnie, jedna płatność.",
          "An ATOM burger, The Fry fries, Na końcu tęczy gelato. Three kitchens, one checkout."))
          .font(.system(size: introFontSize)).foregroundStyle(Papu.muted)
          .fixedSize(horizontal: false, vertical: true)
      }
      GeometryReader { geometry in
        let width = geometry.size.width
        ZStack(alignment: .top) {
          PapuComboScene(stage: stage, active: animationActive)
            .frame(width: width, height: width * 560 / 720)
            .offset(y: width * 80 / 720)
          ForEach(0..<3, id: \.self) { index in
            vendorCard(index, width: width)
          }
        }.frame(width: width, height: geometry.size.height)
          .contentShape(Rectangle())
          .simultaneousGesture(DragGesture(minimumDistance: 24).onEnded { value in
            guard abs(value.translation.width) > abs(value.translation.height) else { return }
            choose(max(0, min(2, stage + (value.translation.width < 0 ? 1 : -1))))
          })
      }.aspectRatio(720.0 / 650.0, contentMode: .fit)
        .background(Papu.ink, in: RoundedRectangle(cornerRadius: 22))
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .modifier(ComboVisibilityObserver(visible: $visible))
      HStack(spacing: 10) {
        Button {
          autoplayFinished = true
          showCombo = true
        } label: {
          HStack(spacing: 7) {
            Text(store.text("Zobacz ten zestaw", "Explore this combo"))
            Image(systemName: "arrow.up.right")
          }.font(Papu.body(14).weight(.semibold)).lineLimit(1).minimumScaleFactor(0.85)
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(Papu.butter).background(Papu.ink, in: Capsule())
        }.buttonStyle(PressStyle())
        Button(action: browse) {
          Image(systemName: "arrow.down").font(.system(size: 17, weight: .semibold))
            .frame(width: 50, height: 50).background(Papu.butter, in: Circle())
        }.buttonStyle(PressStyle())
          .accessibilityLabel(store.text("Wszystkie kuchnie", "All kitchens"))
      }
      HStack(spacing: 7) {
        Text(store.text("Przykładowy zestaw · odbiór w lokalach", "Demo combo · collect at each kitchen"))
          .font(Papu.body(11)).foregroundStyle(Papu.muted)
        Spacer(minLength: 0)
        Button { showTour = true } label: {
          Image(systemName: "questionmark.circle").frame(width: 44, height: 44)
        }.buttonStyle(.plain).accessibilityLabel(store.text("Jak to działa?", "How it works"))
      }.padding(.top, -7)
    }.padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
      .onDisappear { visible = false }
      .task(id: reduceMotion) {
        if reduceMotion { stage = 2; autoplayFinished = true }
      }
      .task(id: autoplayActive) {
        guard autoplayActive, stage < 2 else { return }
        for nextStage in (stage + 1)...2 {
          do { try await Task.sleep(for: .milliseconds(nextStage == 1 ? 1600 : 1800)) } catch { return }
          guard !Task.isCancelled, autoplayActive else { return }
          stage = nextStage
        }
        autoplayFinished = true
      }
      .sheet(isPresented: $showCombo, onDismiss: {
        if openBasketAfterReview {
          openBasketAfterReview = false
          store.showBasket = true
        }
      }) {
        ComboReviewView {
          openBasketAfterReview = true
          showCombo = false
        }.environmentObject(store).presentationDetents([.large]).presentationCornerRadius(30)
      }
  }
  private func choose(_ value: Int) {
    autoplayFinished = true
    guard stage != value else { return }
    stage = value
    UISelectionFeedbackGenerator().selectionChanged()
  }
  private func vendorCard(_ index: Int, width: CGFloat) -> some View {
    let relative = (index - stage + 4) % 3 - 1
    let active = relative == 0
    let name = ["ATOM", "The Fry", "Na końcu tęczy"][index]
    let subtitle = ["Smash Burger", store.text("+ frytki", "+ fries"), store.text("+ lody", "+ gelato")][index]
    return Button { choose(index) } label: {
      VStack(spacing: 4) {
        Text(name).font(Papu.display(active ? 17 : 14)).lineLimit(2)
          .minimumScaleFactor(0.85).multilineTextAlignment(.center)
        Text(subtitle).font(Papu.body(11).weight(.medium)).lineLimit(1).minimumScaleFactor(0.8)
      }.padding(.horizontal, 7).padding(.bottom, active ? 8 : 0)
        .frame(width: width * (active ? 0.35 : 0.28), height: active ? 72 : 63)
        .foregroundStyle(Papu.ink)
        .background(active ? Papu.butter : Color(hex: "DFE6D2"), in: RoundedRectangle(cornerRadius: 15))
        .overlay(alignment: .bottom) {
          if active { Capsule().fill(Papu.orange).frame(width: 22, height: 3).offset(y: -6) }
        }.shadow(color: .black.opacity(active ? 0.15 : 0.08), radius: active ? 12 : 5, y: 6)
    }.buttonStyle(PressStyle())
      .rotationEffect(.degrees(Double(relative) * 10))
      .position(x: width * (0.5 + CGFloat(relative) * 0.32), y: active ? 51 : 42)
      .zIndex(active ? 2 : 1)
      .animation(reduceMotion ? nil : .spring(response: 0.7, dampingFraction: 0.85), value: stage)
      .accessibilityLabel(["ATOM Smash Burger", "The Fry", "Na końcu tęczy"][index] + ", " + subtitle)
      .accessibilityAddTraits(active ? .isSelected : [])
  }

}
private struct ComboVisibilityObserver: ViewModifier {
  @Binding var visible: Bool
  @ViewBuilder func body(content: Content) -> some View {
    if #available(iOS 18.0, *) {
      content.onScrollVisibilityChange(threshold: 0.2) { visible = $0 }
    } else {
      content.background {
        GeometryReader { geometry in
          let frame = geometry.frame(in: .global)
          Color.clear.preference(key: ComboVisibilityKey.self,
            value: frame.maxY > 100 && frame.minY < UIScreen.main.bounds.height - 100)
        }
      }.onPreferenceChange(ComboVisibilityKey.self) { visible = $0 }
    }
  }
}
private struct ComboVisibilityKey: PreferenceKey {
  static var defaultValue = false
  static func reduce(value: inout Bool, nextValue: () -> Bool) { value = value || nextValue() }
}

/// Editing a suggested meal is local until the person confirms the basket action.
private struct ComboReviewView: View {
  @EnvironmentObject var store: PapuStore
  let confirm: () -> Void
  @State private var quantities = ["atom-classic": 1, "fry-fries": 1, "tecza-gelato": 1]
  @State private var notes: [String: String] = [:]
  @State private var expanded: String?
  private let itemIDs = ["atom-classic", "fry-fries", "tecza-gelato"]
  private var dishes: [Dish] {
    itemIDs.compactMap { id in store.catalog.items.first { $0.id == id } }
  }
  private var total: Int { dishes.reduce(0) { $0 + $1.price * (quantities[$1.id] ?? 0) } }
  private var count: Int { dishes.reduce(0) { $0 + (quantities[$1.id] ?? 0) } }
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          Text(store.text("Twój idealny zestaw", "Your perfect combo"))
            .font(Papu.display(31)).fixedSize(horizontal: false, vertical: true)
          Text(store.text(
            "Połącz trzy kuchnie tak, jak lubisz. Zmień ilości lub pomiń wybrane danie.",
            "Make three kitchens your own. Adjust quantities or leave a dish out."))
            .font(Papu.body(15)).foregroundStyle(Papu.muted).fixedSize(horizontal: false, vertical: true)
          ForEach(dishes) { dish in comboRow(dish) }
          Text(store.text(
            "To przykładowy zestaw. Dania, zdjęcia, ceny i alergeny są demonstracyjne. Odbiór osobno w każdej kuchni.",
            "This is a sample combo. Dishes, photos, prices and allergens are illustrative. Collect from each kitchen separately."))
            .font(Papu.body(12)).foregroundStyle(Papu.muted).lineSpacing(3)
        }.padding(20)
      }.background(Papu.cream).foregroundStyle(Papu.ink)
        .navigationTitle(store.text("Zestaw z Koszyków", "The Koszyki combo"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { SheetClose().padding(-17) } }
        .safeAreaInset(edge: .bottom, spacing: 0) {
          Button {
            for dish in dishes where (quantities[dish.id] ?? 0) > 0 {
              store.add(dish, quantity: quantities[dish.id] ?? 1, note: notes[dish.id] ?? "")
            }
            confirm()
          } label: {
            HStack(spacing: 12) {
              Image(systemName: "basket")
              Text(store.text("Dodaj do koszyka", "Add to basket"))
              Spacer(minLength: 0)
              Text(money(total, english: store.english)).monospacedDigit()
            }.font(Papu.body(14).weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
              .padding(.horizontal, 18).frame(minHeight: 54)
              .foregroundStyle(Papu.butter).background(count > 0 ? Papu.ink : Papu.muted, in: Capsule())
          }.buttonStyle(PressStyle()).disabled(count == 0).padding(20).background(.regularMaterial)
        }
    }
  }
  private func comboRow(_ dish: Dish) -> some View {
    let quantity = quantities[dish.id] ?? 0
    let restaurant = store.catalog.restaurants.first { $0.id == dish.restaurantId }
    return VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top, spacing: 12) {
        Image(["atom-classic": "combo-burger", "fry-fries": "combo-fries", "tecza-gelato": "combo-gelato"][dish.id] ?? (dish.image as NSString).deletingPathExtension).resizable().scaledToFit().frame(width: 72, height: 78).clipped().accessibilityHidden(true)
          .clipShape(RoundedRectangle(cornerRadius: 14))
        VStack(alignment: .leading, spacing: 5) {
          Text(restaurant?.name ?? "").font(Papu.body(11).weight(.semibold)).foregroundStyle(Papu.green)
            .fixedSize(horizontal: false, vertical: true)
          Text(store.text(dish.name, dish.nameEn)).font(Papu.display(21))
            .fixedSize(horizontal: false, vertical: true)
          Text(money(dish.price, english: store.english)).font(Papu.body(13).weight(.semibold))
        }.frame(maxWidth: .infinity, alignment: .leading)
      }
      HStack(spacing: 10) {
        Button { expanded = expanded == dish.id ? nil : dish.id } label: {
          Label(store.text("Szczegóły", "Details"), systemImage: expanded == dish.id ? "chevron.up" : "chevron.down")
            .font(Papu.body(12).weight(.semibold)).frame(minHeight: 44)
        }.buttonStyle(.plain)
        Spacer(minLength: 0)
        HStack(spacing: 0) {
          Button { quantities[dish.id] = max(0, quantity - 1) } label: {
            Image(systemName: quantity == 1 ? "trash" : "minus").font(.system(size: 13)).frame(width: 44, height: 44)
          }.disabled(quantity == 0).accessibilityLabel(store.text("Zmniejsz ilość: ", "Decrease quantity: ") + store.text(dish.name, dish.nameEn))
          Text(String(quantity)).font(Papu.body(15).weight(.semibold)).monospacedDigit().frame(minWidth: 18)
            .accessibilityLabel(store.text("Ilość: ", "Quantity: ") + String(quantity))
          Button { quantities[dish.id] = min(20, quantity + 1) } label: {
            Image(systemName: "plus").font(.system(size: 13)).frame(width: 44, height: 44)
          }.disabled(quantity == 20).accessibilityLabel(store.text("Zwiększ ilość: ", "Increase quantity: ") + store.text(dish.name, dish.nameEn))
        }.buttonStyle(PressStyle()).background(Papu.sage, in: Capsule())
      }
      if expanded == dish.id {
        Text(store.text(dish.description, dish.descriptionEn)).font(Papu.body(14)).foregroundStyle(Papu.muted)
        FlowTags(tags: (dish.vegetarian ? ["Vege"] : []) + dish.allergens)
        TextField(store.text("Uwaga dla kuchni (opcjonalnie)", "Kitchen note (optional)"), text: Binding(
          get: { notes[dish.id] ?? "" }, set: { notes[dish.id] = String($0.prefix(180)) }), axis: .vertical)
          .lineLimit(2...4).font(Papu.body(14)).padding(13)
          .background(Papu.sage.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
      }
    }.padding(16).papuCard()
  }
}
