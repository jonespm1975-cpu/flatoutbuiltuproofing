import SwiftUI
import WebKit

@main
struct FlatOutApp: App {
    var body: some Scene {
        WindowGroup {
            RoofingHome().background(.black).preferredColorScheme(.dark)
        }
    }
}

struct RoofingHome: UIViewRepresentable {
    static let home = URL(string: "https://flatoutbuiltuproofing.co.uk/")!

    func makeCoordinator() -> Navigation { Navigation() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.isOpaque = false
        view.backgroundColor = .black
        view.scrollView.backgroundColor = .black
        view.load(URLRequest(url: Self.home))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    final class Navigation: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor action: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if isRoofingSite(url) {
                decisionHandler(.allow)
            } else if action.targetFrame?.isMainFrame != false {
                openExternal(url)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.cancel)
            }
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for action: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = action.request.url {
                if isRoofingSite(url) { webView.load(action.request) }
                else { openExternal(url) }
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled,
                  let controller = webView.window?.rootViewController,
                  controller.presentedViewController == nil else { return }
            let notice = UIAlertController(title: "Couldn’t load the site", message: "Check your connection and try again.", preferredStyle: .alert)
            notice.addAction(UIAlertAction(title: "Retry", style: .default) { _ in
                webView.load(URLRequest(url: RoofingHome.home))
            })
            notice.addAction(UIAlertAction(title: "Close", style: .cancel))
            controller.present(notice, animated: true)
        }

        private func isRoofingSite(_ url: URL) -> Bool {
            url.scheme == "https" && url.host == RoofingHome.home.host
        }

        private func openExternal(_ url: URL) {
            guard let scheme = url.scheme, ["https", "mailto", "tel"].contains(scheme) else { return }
            UIApplication.shared.open(url)
        }
    }
}
