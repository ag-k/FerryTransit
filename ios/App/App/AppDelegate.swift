import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let appStoreStartPathEnvKey = "APPSTORE_START_PATH"
    private let appStoreStartPathArg = "--appstore-path"
    private let appStoreLaunchUrlEnvKey = "APPSTORE_LAUNCH_URL"
    private let appStoreLaunchUrlArg = "--appstore-url"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        navigateToAppStoreStartPathIfNeeded()
        injectLaunchUrlFromArguments(application)
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func injectLaunchUrlFromArguments(_ application: UIApplication) {
        let processInfo = ProcessInfo.processInfo
        let rawUrl = processInfo.environment[appStoreLaunchUrlEnvKey] ?? {
            let arguments = processInfo.arguments
            guard let keyIndex = arguments.firstIndex(of: appStoreLaunchUrlArg) else {
                return nil
            }
            let valueIndex = keyIndex + 1
            guard valueIndex < arguments.count else {
                return nil
            }
            return arguments[valueIndex]
        }()

        guard let launchUrl = rawUrl, !launchUrl.isEmpty, let url = URL(string: launchUrl) else {
            return
        }

        // ブリッジ初期化後に URL イベントを流して JS 側リスナーに確実に届くようにする
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) {
            _ = ApplicationDelegateProxy.shared.application(application, open: url, options: [:])
        }
    }

    private func navigateToAppStoreStartPathIfNeeded() {
        guard let startPath = resolveStartPathFromProcessInfo() else {
            return
        }

        navigateWebView(path: startPath, retries: 10)
    }

    private func resolveStartPathFromProcessInfo() -> String? {
        let processInfo = ProcessInfo.processInfo
        if let envValue = processInfo.environment[appStoreStartPathEnvKey], !envValue.isEmpty {
            return envValue
        }

        let arguments = processInfo.arguments
        guard let keyIndex = arguments.firstIndex(of: appStoreStartPathArg) else {
            return nil
        }
        let valueIndex = keyIndex + 1
        guard valueIndex < arguments.count else {
            return nil
        }

        let value = arguments[valueIndex]
        return value.isEmpty ? nil : value
    }

    private func navigateWebView(path: String, retries: Int) {
        guard retries > 0 else {
            return
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self else {
                return
            }

            guard
                let bridgeViewController = self.resolveBridgeViewController(),
                let bridge = bridgeViewController.bridge,
                let webView = bridgeViewController.webView,
                let targetUrl = self.buildTargetURL(baseUrl: bridge.config.serverURL, path: path)
            else {
                self.navigateWebView(path: path, retries: retries - 1)
                return
            }

            webView.load(URLRequest(url: targetUrl))
        }
    }

    private func buildTargetURL(baseUrl: URL, path: String) -> URL? {
        if path.hasPrefix("/") {
            if let absolute = URL(string: path, relativeTo: baseUrl)?.absoluteURL {
                return absolute
            }
            return nil
        }
        if let absolute = URL(string: "/\(path)", relativeTo: baseUrl)?.absoluteURL {
            return absolute
        }
        return nil
    }

    private func resolveBridgeViewController() -> CAPBridgeViewController? {
        if let root = window?.rootViewController,
           let bridge = findBridgeViewController(from: root) {
            return bridge
        }

        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            for sceneWindow in scene.windows {
                if let root = sceneWindow.rootViewController,
                   let bridge = findBridgeViewController(from: root) {
                    return bridge
                }
            }
        }

        return nil
    }

    private func findBridgeViewController(from root: UIViewController?) -> CAPBridgeViewController? {
        guard let root else {
            return nil
        }

        if let bridge = root as? CAPBridgeViewController {
            return bridge
        }

        if let presented = root.presentedViewController,
           let bridge = findBridgeViewController(from: presented) {
            return bridge
        }

        if let navigationController = root as? UINavigationController,
           let bridge = findBridgeViewController(from: navigationController.visibleViewController) {
            return bridge
        }

        if let tabBarController = root as? UITabBarController,
           let bridge = findBridgeViewController(from: tabBarController.selectedViewController) {
            return bridge
        }

        for child in root.children {
            if let bridge = findBridgeViewController(from: child) {
                return bridge
            }
        }

        return nil
    }

}
