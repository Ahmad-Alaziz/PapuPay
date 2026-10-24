import SwiftUI

struct OnboardingView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dismiss) private var dismiss
  @State private var step = 0
  private var title: String {
    [
      store.text("Usiądź. Zeskanuj.", "Sit down. Scan."),
      store.text("Każdy znajdzie swój smak.", "Every craving gets a seat."),
      store.text("Odbierz. I ciesz się chwilą.", "Pick up. Dig in."),
    ][step]
  }
  private var subtitle: String {
    [
      store.text(
        "Kod QR zna Twój stolik. Jesteś przy numerze \(store.table). Bez konta, bez pobierania aplikacji.",
        "The QR knows your table. You’re at number \(store.table). No account, no app download."),
      store.text(
        "Ramen z KAGO, burger z ATOM, lemoniada z baru. Wszystko w jednym koszyku.",
        "Ramen from KAGO, a burger from ATOM, lemonade from the bar. All in one basket."),
      store.text(
        "Obserwuj postęp zamówienia na ekranie blokady. Gdy kuchnia da znak, mapa pokaże stanowisko odbioru.",
        "Follow your order on your Lock Screen. When the kitchen is ready, the map shows the pickup counter."
      ),
    ][step]
  }
  var body: some View {
    ScrollView {
      VStack(spacing: 20) {
        ZStack {
          RoundedRectangle(cornerRadius: 27).fill(
            RadialGradient(
              colors: [Color(hex: "FFF0CE"), Papu.cream], center: .center, startRadius: 0,
              endRadius: 180))
          PapuAnimation(celebrate: step == 2, scan: step == 0).frame(width: 290, height: 290)
          Image(systemName: ["qrcode", "fork.knife", "checkmark"][step]).font(.system(size: 26))
            .foregroundStyle(Papu.orange).frame(width: 53, height: 53).background(
              Papu.butter, in: RoundedRectangle(cornerRadius: 17)
            ).rotationEffect(.degrees(-12)).offset(x: -112, y: -45)
          Image(
            systemName: ["mappin.and.ellipse", "fork.knife", "takeoutbag.and.cup.and.straw"][step]
          ).font(.system(size: 25)).foregroundStyle(Papu.green).frame(width: 53, height: 53)
            .background(Papu.butter, in: RoundedRectangle(cornerRadius: 17)).rotationEffect(
              .degrees(12)
            ).offset(x: 112, y: 55)
        }.frame(height: 270)
        HStack(spacing: 7) {
          ForEach(0..<3, id: \.self) { index in
            Button {
              withAnimation(.spring) { step = index }
            } label: {
              Capsule().fill(step == index ? Papu.orange : Papu.line).frame(
                width: step == index ? 24 : 8, height: 8
              ).frame(width: 44, height: 44).contentShape(Rectangle())
            }.accessibilityLabel(store.text("Krok \(index+1)", "Step \(index+1)"))
          }
        }
        Eyebrow(text: store.text("MAŁY SKAN. WIELKIE MNIAM.", "LITTLE SCAN. BIG YUM."))
        Text(title).font(Papu.display(37)).multilineTextAlignment(.center).fixedSize(
          horizontal: false, vertical: true)
        Text(subtitle).font(Papu.body(15)).lineSpacing(4).foregroundStyle(Papu.muted)
          .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        PrimaryButton(
          title: step == 2
            ? store.text("Mam apetyt. Zaczynamy!", "I’m hungry. Let’s go!")
            : store.text("Dalej", "Next"), symbol: "arrow.right"
        ) {
          if step < 2 {
            withAnimation(.spring) { step += 1 }
          } else {
            store.selectedTab = 0
            dismiss()
          }
        }
        Button(store.text("Już wiem, pomiń", "I’ve got it, skip")) { dismiss() }.font(Papu.body(13))
          .foregroundStyle(Papu.muted)
      }.padding(24).padding(.top, 20).padding(.bottom, 24)
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      SheetClose()
    }
  }
}
struct TableView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dismiss) private var dismiss
  @State private var number = ""
  @State private var error = false
  var body: some View {
    ScrollView {
      VStack(spacing: 18) {
        Image(systemName: "qrcode").font(.system(size: 38)).frame(width: 76, height: 76).background(
          Papu.sage, in: RoundedRectangle(cornerRadius: 23))
        Eyebrow(text: "HALA KOSZYKI")
        Text(store.text("Dobrze Cię tu widzieć.", "Good to have you here.")).font(Papu.display(34))
          .multilineTextAlignment(.center)
        Text(
          store.text(
            "Numer stolika przychodzi z kodu QR. W demo możesz go zmienić.",
            "Your table number comes from the QR. You can change it in this demo.")
        ).font(Papu.body(15)).foregroundStyle(Papu.muted).multilineTextAlignment(.center)
        TextField(store.text("Stolik", "Table"), text: $number).keyboardType(.numberPad)
          .multilineTextAlignment(.center).font(Papu.display(35)).frame(width: 110, height: 64)
          .background(Color(hex: "FFFDF5"), in: RoundedRectangle(cornerRadius: 16)).overlay(
            RoundedRectangle(cornerRadius: 16).stroke(Papu.line))
        if error {
          Text(store.text("Wybierz numer od 1 do 999.", "Choose a number from 1 to 999.")).font(
            Papu.body(13)
          ).foregroundStyle(.red)
        }
        PrimaryButton(title: store.text("To mój stolik", "That’s my table"), symbol: "checkmark") {
          guard let value = Int(number), (1...999).contains(value) else {
            error = true
            return
          }
          store.table = String(value)
          dismiss()
        }
      }.padding(28).padding(.top, 15)
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      SheetClose()
    }.onAppear { number = store.table }
  }
}
struct AboutView: View {
  @EnvironmentObject var store: PapuStore
  @State private var kitchen = false
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 21) {
        BrandView()
        Text(store.text("Mała próbka dużego pomysłu.", "A little taste of a big idea.")).font(
          Papu.display(35))
        Text(
          store.text(
            "PapuPay to koncepcja zamawiania jedzenia z różnych restauracji w hali. Ta wersja pokazuje pełną podróż od QR do odbioru.",
            "PapuPay brings different food hall restaurants into one ordering experience. This demo covers the journey from QR to pickup."
          ))
        Text(
          store.text(
            "Restauracje i numery lokali pochodzą z oficjalnej strony Hali Koszyki. Przykładowe menu, ceny, alergeny, zdjęcia potraw i czasy nie stanowią oferty restauracji. Projekt nie jest powiązany z Halą Koszyki.",
            "Restaurant names and units come from the official Hala Koszyki site. Sample menus, prices, allergens, food photography and times are illustrative, not restaurant offers. This project is not affiliated with Hala Koszyki."
          ))
        Text(
          store.text(
            "Dane są przechowywane tylko na tym urządzeniu. Żadna płatność ani zamówienie nie trafia do restauracji. Live Activities są prawdziwe; w tym demo aktualizacje wykonuje aplikacja, gdy jest aktywna.",
            "Data is stored only on this device. No payment or order is sent to a restaurant. Live Activities are real; in this demo, updates are driven by the app while it is active."
          ))
        Link(destination: URL(string: "https://koszyki.com/uslugi/restauracje/")!) {
          Label("koszyki.com", systemImage: "arrow.up.right")
        }
        PrimaryButton(title: store.text("Otwórz demo kuchni", "Open kitchen demo"), symbol: "flame")
        { kitchen = true }
        Button(store.text("Wyczyść historię demo", "Clear demo history")) {
          store.resetOrders()
          store.announce(store.text("Historia demo wyczyszczona.", "Demo history cleared."))
        }.font(Papu.body(14))
      }.font(Papu.body(15)).lineSpacing(4).padding(27).padding(.top, 30)
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      SheetClose()
    }.sheet(isPresented: $kitchen) {
      KitchenView().environmentObject(store).presentationDetents([.large])
    }
  }
}
struct KitchenView: View {
  @EnvironmentObject var store: PapuStore
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 22) {
        Eyebrow(text: "PAPUPAY · KITCHEN DEMO")
        Text(store.text("Dobre rzeczy się dzieją.", "Good things are happening.")).font(
          Papu.display(35))
        if store.activeOrders.isEmpty {
          Text(store.text("Brak aktywnych zamówień.", "No active orders.")).font(Papu.body(16))
        }
        ForEach(store.activeOrders) { order in
          VStack(alignment: .leading, spacing: 12) {
            Text(order.restaurant.name + " · #" + order.id).font(Papu.display(23))
            Text(order.name + " · " + store.text("Stolik ", "Table ") + order.table).font(
              Papu.body(14)
            ).foregroundStyle(Papu.muted)
            ForEach(order.lines) { line in
              Text(
                "\(line.quantity) × \(line.item.name)"
                  + (line.note.isEmpty ? "" : " (\(line.note))")
              ).font(Papu.body(15))
            }
            PrimaryButton(
              title: order.stage(at: store.now) >= 2
                ? store.text("Gotowe", "Ready") : store.text("Oznacz gotowe", "Mark ready"),
              symbol: "checkmark"
            ) { store.markReady(order) }.disabled(order.stage(at: store.now) >= 2)
          }.padding(20).papuCard()
        }
      }.padding(25).padding(.top, 30)
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      SheetClose()
    }
  }
}
