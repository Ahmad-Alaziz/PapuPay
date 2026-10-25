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
              browse: { withAnimation(.smooth) { reader.scrollTo("restaurants", anchor: .top) } },
              openMenu: { selectedRestaurant = $0 })
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


/// The first screen is a small, useful food story: the whole scene follows the craving.
private struct CravingSpotlight: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  @Binding var showTour: Bool
  var browse: () -> Void
  var openMenu: (Restaurant) -> Void
  @State private var selected = 0
  @State private var entered = false
  private let restaurantIDs = ["atom", "kago", "semolino"]
  private var restaurant: Restaurant { store.catalog.restaurants.first { $0.id == restaurantIDs[selected] }! }
  private var title: String {
    [store.text("SOCZYSTY\nKĘS", "BIG BURGER\nENERGY"),
     store.text("MISKA\nSZCZĘŚCIA", "A BOWL OF\nHAPPINESS"),
     store.text("CIAO,\nPIZZO", "CIAO,\nPIZZA")][selected]
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      HStack(spacing: 8) {
        Eyebrow(text: "HALA KOSZYKI")
        Spacer(minLength: 8)
        Label(store.text("Stolik ", "Table ") + store.table, systemImage: "checkmark.circle.fill")
          .font(Papu.body(12).weight(.semibold)).foregroundStyle(Papu.green)
      }
      ZStack(alignment: .bottomLeading) {
        GeometryReader { geometry in
          FoodPhoto(name: restaurant.image)
            .frame(width: geometry.size.width, height: geometry.size.height)
            .scaleEffect(reduceMotion || entered ? 1 : 1.055)
            .clipped()
        }
        LinearGradient(colors: [.black.opacity(0.02), Papu.ink.opacity(0.2), Papu.ink.opacity(0.95)],
          startPoint: .top, endPoint: .bottom)
        VStack(alignment: .leading, spacing: 14) {
          HStack {
            Text(restaurant.name.uppercased()).font(Papu.body(11).weight(.bold)).tracking(1.2)
            Spacer()
            Text("0\(selected + 1) / 03").font(Papu.body(11).weight(.semibold)).monospacedDigit()
          }.foregroundStyle(Papu.butter.opacity(0.9))
          Text(title).font(Papu.poster(typeSize.isAccessibilitySize ? 48 : 52)).lineSpacing(-2)
            .fixedSize(horizontal: false, vertical: true).shadow(color: Papu.ink.opacity(0.3), radius: 8)
          Button { openMenu(restaurant) } label: {
            HStack {
              Text(store.text("Mam na to ochotę", "That’s my craving"))
              Spacer(minLength: 8)
              Image(systemName: "arrow.up.right")
            }.font(Papu.body(15).weight(.semibold)).padding(.horizontal, 18).frame(minHeight: 48)
              .foregroundStyle(Papu.ink).background(Papu.butter, in: Capsule())
          }.buttonStyle(PressStyle())
        }.padding(22).foregroundStyle(Papu.butter)
      }.frame(height: typeSize.isAccessibilitySize ? 420 : 350)
        .clipShape(RoundedRectangle(cornerRadius: 27)).id(selected)
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.985)))
        .onAppear {
          entered = false
          withAnimation(reduceMotion ? nil : .easeOut(duration: 1.2)) { entered = true }
        }
        .gesture(DragGesture(minimumDistance: 30).onEnded { value in
          guard abs(value.translation.width) > abs(value.translation.height) else { return }
          choose((selected + (value.translation.width < 0 ? 1 : 2)) % 3)
        })
      HStack(spacing: 8) {
        ForEach(0..<3, id: \.self) { index in
          Button { choose(index) } label: {
            HStack(spacing: 6) {
              if selected == index { Circle().fill(Papu.orange).frame(width: 6, height: 6) }
              Text([store.text("Burger", "Burger"), "Ramen", "Pizza"][index])
            }.font(Papu.body(13).weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44)
              .foregroundStyle(selected == index ? Papu.butter : Papu.ink)
              .background(selected == index ? Papu.ink : Papu.sage, in: Capsule())
          }.buttonStyle(PressStyle()).accessibilityAddTraits(selected == index ? .isSelected : [])
        }
      }
      HStack(alignment: .center, spacing: 12) {
        Button(action: browse) {
          Label(store.text("Wszystkie kuchnie", "All kitchens"), systemImage: "arrow.down")
            .font(Papu.body(14).weight(.semibold)).frame(minHeight: 44)
        }.buttonStyle(.plain)
        Spacer(minLength: 0)
        Button { showTour = true } label: {
          Label(store.text("Jak to działa?", "How it works"), systemImage: "play.circle")
            .font(Papu.body(13)).frame(minHeight: 44)
        }.buttonStyle(.plain).foregroundStyle(Papu.muted)
      }
    }.padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)

  }
  private func choose(_ index: Int) {
    UISelectionFeedbackGenerator().selectionChanged()
    withAnimation(reduceMotion ? .easeOut(duration: 0.15) : .spring(response: 0.48, dampingFraction: 0.88)) {
      selected = index
    }
  }
}
