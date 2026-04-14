import Capacitor
import ObjectiveC.runtime
import WebKit

final class AppWebViewAssetHandler: WebViewAssetHandler {
    override func mimeTypeForExtension(pathExtension: String) -> String {
        switch pathExtension.lowercased() {
        case "woff":
            return "font/woff"
        case "woff2":
            return "font/woff2"
        default:
            return super.mimeTypeForExtension(pathExtension: pathExtension)
        }
    }

    static func cloneIfNeeded(from handler: (any WKURLSchemeHandler)?) -> (any WKURLSchemeHandler)? {
        guard
            let handler,
            !(handler is AppWebViewAssetHandler),
            let originalHandler = handler as? WebViewAssetHandler,
            let router = mirroredValue(named: "router", from: originalHandler) as? any Router
        else {
            return handler
        }

        let patchedHandler = AppWebViewAssetHandler(router: router)
        patchedHandler.setAssetPath(router.basePath)
        patchedHandler.setServerUrl(unwrappedValue(from: mirroredValue(named: "serverUrl", from: originalHandler)))
        return patchedHandler
    }

    private static func mirroredValue(named name: String, from value: Any) -> Any? {
        Mirror(reflecting: value).children.first(where: { $0.label == name })?.value
    }

    private static func unwrappedValue<T>(from value: Any?) -> T? {
        guard let value else {
            return nil
        }

        let mirror = Mirror(reflecting: value)
        if mirror.displayStyle != .optional {
            return value as? T
        }

        return mirror.children.first?.value as? T
    }
}

extension WKWebViewConfiguration {
    private static let capacitorFontMimePatch: Void = {
        let originalSelector = #selector(setURLSchemeHandler(_:forURLScheme:))
        let patchedSelector = #selector(app_setURLSchemeHandler(_:forURLScheme:))

        guard
            let originalMethod = class_getInstanceMethod(WKWebViewConfiguration.self, originalSelector),
            let patchedMethod = class_getInstanceMethod(WKWebViewConfiguration.self, patchedSelector)
        else {
            return
        }

        method_exchangeImplementations(originalMethod, patchedMethod)
    }()

    static func installCapacitorFontMimePatch() {
        _ = capacitorFontMimePatch
    }

    // Capacitor registers its custom-scheme handler internally, so we swap the
    // handler at registration time to preserve the original routing behavior.
    @objc private func app_setURLSchemeHandler(_ urlSchemeHandler: WKURLSchemeHandler?, forURLScheme urlScheme: String) {
        let handlerToRegister: WKURLSchemeHandler?
        if urlScheme == InstanceDescriptorDefaults.scheme {
            handlerToRegister = AppWebViewAssetHandler.cloneIfNeeded(from: urlSchemeHandler)
        } else {
            handlerToRegister = urlSchemeHandler
        }

        app_setURLSchemeHandler(handlerToRegister, forURLScheme: urlScheme)
    }
}
