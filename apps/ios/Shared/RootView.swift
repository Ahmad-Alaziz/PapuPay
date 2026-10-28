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
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @AccessibilityFocusState private var catalogFocused: Bool
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
          || "\(r.name) \(r.cuisine) \(r.cuisineEn) \(store.catalog.items.filter { $0.restaurantId == r.id }.map { "\($0.name) \($0.nameEn)" }.joined(separator: " "))"
            .localizedCaseInsensitiveContains(search))
    }
  }
  var body: some View {
    GeometryReader { viewport in
      ScrollViewReader { reader in
      ScrollView {
          VStack(spacing: 0) {
            CravingSpotlight(showTour: $showTour) {
              search = ""
              category = "all"
              veggieOnly = false
              withAnimation(reduceMotion ? nil : .smooth(duration: 0.45)) {
                reader.scrollTo("restaurants", anchor: .top)
              }
              catalogFocused = true
            }
            VStack(alignment: .leading, spacing: 20) {
              Text(store.text("Co dziś jesz?", "What’s your craving?"))
                .font(Papu.display(32)).fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader).accessibilityFocused($catalogFocused)
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
                    Image(systemName: "xmark.circle.fill").foregroundStyle(Papu.muted).frame(width: 44, height: 44)
                  }.accessibilityLabel(store.text("Wyczyść", "Clear"))
                }
              }.padding(.horizontal, 14).frame(minHeight: 52).background(Color(hex: "F0F2E7"), in: RoundedRectangle(cornerRadius: 14))
              ScrollView(.horizontal) {
                HStack(spacing: 8) {
                  ForEach(categories, id: \.0) { c in
                    Button {
                      withAnimation(reduceMotion ? nil : .snappy) { category = c.0 }
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
                    + store.text(filtered.count == 1 ? "miejsce na coś pysznego" : (2...4).contains(filtered.count) ? "miejsca na coś pysznego" : "miejsc na coś pysznego", filtered.count == 1 ? "place for something delicious" : "places for something delicious")
                ).font(Papu.body(12))
                Spacer()
                Button {
                  withAnimation(reduceMotion ? nil : .smooth) { veggieOnly.toggle() }
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
            }.padding(20).padding(.top, 12).id("restaurants")
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
          .onChange(of: store.catalogRequestID) { _, _ in
            selectedRestaurant = nil
            selectedDish = nil
            search = ""
            category = "all"
            veggieOnly = false
            withAnimation(reduceMotion ? nil : .smooth(duration: 0.45)) {
              reader.scrollTo("restaurants", anchor: .top)
            }
            catalogFocused = true
          }
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


/// An illustration of one meal from three kitchens. Ordering begins in the catalog below.
private struct CravingSpotlight: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  @Environment(\.scenePhase) private var phase
  @ScaledMetric(relativeTo: .body) private var introFontSize: CGFloat = 14
  @Binding var showTour: Bool
  let browse: () -> Void
  @State private var stage = 0
  @State private var visible = true
  @State private var sceneReady = false
  @State private var paused = false
  @State private var windowPhase = 0
  @State private var tourStep = 0
  @State private var hasStartedTour = false
  private let tour = [3, 6, 0]
  private let vendors = [
    ("ATOM", "combo-burger"), ("KAGO", "carousel-ramen"), ("Semolino", "carousel-pizza"),
    ("The Fry", "combo-fries"), ("Curry Leaves", "carousel-curry"), ("Gringo Bar", "carousel-tacos"),
    ("Na końcu tęczy", "combo-gelato"), ("TUK TUK", "carousel-noodles"),
    ("Bibimbar", "carousel-bowl"), ("Bar Koszyki", "carousel-lemonade")
  ]
  private var animationActive: Bool { visible && phase == .active && store.selectedTab == 0 && !showTour && !paused }
  private var autoplayActive: Bool { animationActive && sceneReady && !reduceMotion && !voiceOver && !paused }
  private var caption: String {
    [store.text("Burger z ATOM", "An ATOM burger"), store.text("+ frytki z The Fry", "+ fries from The Fry"),
      store.text("Trzy kuchnie, jeden posiłek", "Three kitchens, one meal")][stage]
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
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
          "Burger z jednego miejsca, frytki z drugiego, lody na deser. Łącz kuchnie w jednym zamówieniu.",
          "A burger from one kitchen, fries from another, gelato to finish. Bring it all together in one order."))
          .font(.system(size: introFontSize)).foregroundStyle(Papu.muted)
          .fixedSize(horizontal: false, vertical: true)
      }
      GeometryReader { geometry in
        let width = geometry.size.width
        ZStack(alignment: .top) {
          ZStack {
            RadialGradient(colors: [Color(hex: "416A43"), Papu.ink], center: UnitPoint(x: 0.5, y: 0.58), startRadius: 4, endRadius: width * 0.7)
            ForEach(Array(-3...12), id: \.self) { slot in
              vendorWindow(slot: slot, width: width)
            }
            PapuMealScene(stage: stage, active: animationActive) { sceneReady = true }
              .frame(width: width, height: width * 640 / 720).zIndex(20)
          }.accessibilityElement(children: .ignore)
            .accessibilityLabel(store.text(
              "Przykładowy posiłek: burger z ATOM, frytki z The Fry i lody z Na końcu tęczy, razem w jednym koszyku.",
              "An example meal: an ATOM burger, The Fry fries and Na końcu tęczy gelato, together in one basket."))
            .accessibilityAddTraits(.isImage)
          HStack(spacing: 8) {
            Text(store.text("CAŁA HALA · JEDEN KOSZYK", "ONE HALL · ONE BASKET"))
              .font(.system(size: 10, weight: .semibold)).tracking(0.75).lineLimit(1).minimumScaleFactor(0.9)
            Spacer(minLength: 2)
            if !reduceMotion && !voiceOver {
              Button {
                paused.toggle()
              } label: {
                Image(systemName: paused ? "play.fill" : "pause.fill")
                  .font(.system(size: 11, weight: .semibold)).frame(width: 44, height: 44)
              }.buttonStyle(.plain)
                .accessibilityLabel(store.text(paused ? "Kontynuuj animację" : "Wstrzymaj animację",
                  paused ? "Resume illustration" : "Pause illustration"))
            }
          }.foregroundStyle(Papu.butter.opacity(0.9)).padding(.leading, 16).padding(.trailing, 3).padding(.top, 2).zIndex(30)
          Text(caption).font(Papu.body(12).weight(.medium)).foregroundStyle(Papu.butter)
            .id(stage).transition(.opacity).position(x: width / 2, y: width * 615 / 720)
            .zIndex(30).allowsHitTesting(false).accessibilityHidden(true)
        }.frame(width: width, height: geometry.size.height)
      }.aspectRatio(720.0 / 640.0, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .modifier(ComboVisibilityObserver(visible: $visible))
      PrimaryButton(title: store.text("Wybierz coś dla siebie", "Explore the kitchens"), symbol: "arrow.down") {
        paused = true
        browse()
      }
      Text(store.text("Jedna płatność · odbiór przy lokalach", "One checkout · collect at the counters"))
        .font(Papu.body(12)).foregroundStyle(Papu.muted).frame(maxWidth: .infinity)
    }.padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 16)
      .onDisappear { visible = false }
      .task(id: reduceMotion || voiceOver) {
        if reduceMotion || voiceOver {
          stage = 2
          windowPhase = 6
          tourStep = 2
          hasStartedTour = true
        }
      }
      .task(id: autoplayActive) {
        guard autoplayActive else { return }
        while !Task.isCancelled, autoplayActive {
          let hold = !hasStartedTour ? 2400 : windowPhase == 6 ? 5900 : windowPhase == 0 ? 4400 : 3900
          do { try await Task.sleep(for: .milliseconds(hold)) } catch { return }
          guard !Task.isCancelled, autoplayActive else { return }
          let next = tour[tourStep]
          tourStep = (tourStep + 1) % tour.count
          hasStartedTour = true
          withAnimation(.spring(duration: next == 0 ? 2.6 : 2.1, bounce: 0.1)) { windowPhase = next }
        }
      }
      .task(id: "\(windowPhase)-\(animationActive)") {
        let nextStage = windowPhase == 6 ? 2 : windowPhase == 3 ? 1 : 0
        guard animationActive, stage != nextStage, !reduceMotion, !voiceOver else { return }
        // Each curved sweep and food transition tell the same story, including the return to burger.
        do { try await Task.sleep(for: .milliseconds(nextStage == 0 ? 1600 : 1350)) } catch { return }
        stage = nextStage
      }
  }
  private func vendorWindow(slot: Int, width: CGFloat) -> some View {
    let vendor = vendors[(slot % vendors.count + vendors.count) % vendors.count]
    return VStack(spacing: 0) {
      Image(vendor.1).resizable().scaledToFit().padding(.horizontal, 6).frame(height: width * 0.22)
      Text(vendor.0).font(Papu.display(14)).lineLimit(2).minimumScaleFactor(0.8)
        .multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: width * 0.065)
        .padding(.horizontal, 5).padding(.bottom, 8)
    }.frame(width: width * 0.305, height: width * 0.33)
      .foregroundStyle(Papu.ink).background(Papu.butter, in: RoundedRectangle(cornerRadius: 16))
      .shadow(color: .black.opacity(0.18), radius: 10, y: 8)
      .modifier(VendorWindowArc(relative: Double(slot - windowPhase), width: width))
      .zIndex(10 - abs(Double(slot - windowPhase))).allowsHitTesting(false).accessibilityHidden(true)
  }
}

/// Interpolate the track parameter so decorative windows travel along the same curved path.
private struct VendorWindowArc: AnimatableModifier {
  var relative: Double
  let width: CGFloat
  var animatableData: Double {
    get { relative }
    set { relative = newValue }
  }
  func body(content: Content) -> some View {
    let distance = abs(relative)
    let x = 0.5 + 0.389 * relative / (1 + 0.08 * relative * relative)
    let y = 0.31 + 0.12 * pow(min(distance, 3), 1.7)
    return content.scaleEffect(max(0.58, 0.98 - 0.13 * distance))
      .rotationEffect(.degrees(max(-38, min(38, relative * 14))))
      .opacity(min(1, distance * 1.6) * (distance <= 2.3 ? 1 : max(0, 1 - (distance - 2.3) / 0.7)))
      .position(x: width * x, y: width * 640 / 720 * y)
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
